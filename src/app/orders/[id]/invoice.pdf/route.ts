import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Serve the generated GST invoice PDF for an order.
 *
 * Source of the file resolves by `orders_ref.invoicePdfPath`:
 *   - `sf:<ContentDocumentId>`  → Salesforce Files (T28+)
 *   - `/app/data/invoices/...`  → local disk (T24 default)
 *   - missing/empty column       → 404
 *
 * If the local file disappears (volume pruned, container restarted without a
 * bind-mount, etc.), we regenerate it on demand from the encrypted payload
 * still sitting in pending_sf_sync. Zero user-visible impact.
 *
 * Auth model: UUID-only. The order UUID isn't guessable and ships to the
 * customer via their SF-delivered invoice email. If you want tighter access
 * later (e.g. require `?code=<last4-mobile>`), bolt it on here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, id))
    .limit(1);
  if (!order) {
    return new NextResponse("Not found", { status: 404 });
  }

  const path = order.invoicePdfPath;

  let buf: Buffer | null = null;

  // Source 1 — Salesforce Files (sf:<ContentDocumentId>). Canonical for
  // orders that have been synced. Cached in-memory for 5 minutes to avoid
  // hammering SF on repeat downloads.
  if (path?.startsWith("sf:")) {
    const contentDocumentId = path.slice(3);
    buf = cacheGet(contentDocumentId);
    if (!buf) {
      try {
        const { sfDownloadLatestContentVersion } = await import(
          "@/lib/salesforce/client"
        );
        const result = await sfDownloadLatestContentVersion(contentDocumentId);
        buf = result.bytes;
        cacheSet(contentDocumentId, buf);
      } catch (err) {
        console.error("[invoice.pdf] SF fetch failed:", err);
        // Fall through to regenerate — customer shouldn't see a 503 just
        // because SF is temporarily unreachable.
        buf = null;
      }
    }
  } else if (path) {
    // Source 2 — local disk cache (pre-SF-sync or fallback)
    try {
      buf = await fs.readFile(path);
    } catch {
      buf = null;
    }
  }

  // Source 3 — regenerate on demand from the encrypted payload. Catches:
  //   - File missing on disk (volume pruned, container restart)
  //   - SF Files fetch failed above
  //   - Order created before T24 (no PDF ever generated)
  if (!buf) {
    try {
      buf = await regenerateInvoice(order);
    } catch (err) {
      console.error("[invoice.pdf] regenerate failed:", err);
      return new NextResponse("Invoice unavailable. Contact support.", {
        status: 404,
      });
    }
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Tiny in-memory cache of SF-fetched invoice bytes. Keyed by ContentDocumentId,
// 5-minute TTL. Module-level — survives across requests within the same Node
// process. Small footprint: ~15 KB per invoice × 200 cache slots = 3 MB worst case.
type CacheEntry = { bytes: Buffer; expiresAt: number };
const INVOICE_CACHE = new Map<string, CacheEntry>();
const INVOICE_CACHE_TTL_MS = 5 * 60 * 1000;
const INVOICE_CACHE_MAX = 200;

function cacheGet(key: string): Buffer | null {
  const entry = INVOICE_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    INVOICE_CACHE.delete(key);
    return null;
  }
  return entry.bytes;
}

function cacheSet(key: string, bytes: Buffer): void {
  if (INVOICE_CACHE.size >= INVOICE_CACHE_MAX) {
    // Drop the oldest entry — Map preserves insertion order, so .keys().next()
    // gives the least-recently-inserted key.
    const firstKey = INVOICE_CACHE.keys().next().value;
    if (firstKey) INVOICE_CACHE.delete(firstKey);
  }
  INVOICE_CACHE.set(key, {
    bytes,
    expiresAt: Date.now() + INVOICE_CACHE_TTL_MS,
  });
}

async function regenerateInvoice(
  order: typeof schema.ordersRef.$inferSelect
): Promise<Buffer> {
  const { decryptJSON } = await import("@/lib/crypto");
  const { getProductBySlug, SHIPPING_PAISE } = await import("@/data/products");
  const { renderInvoiceBuffer } = await import("@/lib/invoice-pdf");

  const [pending] = await db
    .select()
    .from(schema.pendingSfSync)
    .where(eq(schema.pendingSfSync.orderRefId, order.id))
    .limit(1);
  if (!pending) throw new Error("no pending_sf_sync row — customer PII is gone");

  const payload = decryptJSON<{
    fullName: string;
    email: string;
    mobile: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    pincode: string;
    city: string;
    state: string;
  }>({
    ciphertext: Buffer.from(pending.payloadCiphertext as unknown as Buffer),
    iv: pending.payloadIv,
    tag: pending.payloadTag,
  });

  const product = getProductBySlug(order.productSlug);
  if (!product) throw new Error(`product ${order.productSlug} not in catalog`);

  const address = [
    payload.addressLine1,
    payload.addressLine2,
    payload.landmark,
    payload.city,
    payload.state,
    payload.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return renderInvoiceBuffer({
    invoiceNumber: order.invoiceNumber,
    invoiceDate: order.createdAt,
    orderNumber: order.orderNumber,
    customer: {
      name: payload.fullName,
      email: payload.email,
      mobile: `+91${payload.mobile}`,
      address,
    },
    shipState: payload.state,
    product: {
      title: product.title,
      hsn: product.hsnCode,
      gstRate: product.gstRatePercent,
      itemPricePaise: product.itemPricePaise,
    },
    shippingPaise: SHIPPING_PAISE,
    paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
    advancePaid: order.advancePaise,
    balanceDue: order.balanceDuePaise,
    totalPaise: order.totalPaise,
  });
}
