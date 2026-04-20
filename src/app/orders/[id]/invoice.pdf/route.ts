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

  // T28 path — SF Files is authoritative once the worker uploads. Until the
  // SF fetcher lands, refuse politely instead of leaking a stale local copy.
  if (path?.startsWith("sf:")) {
    return new NextResponse("Invoice is being synced. Retry in a moment.", {
      status: 503,
      headers: { "Retry-After": "30" },
    });
  }

  // Try the on-disk copy first.
  let buf: Buffer | null = null;
  if (path) {
    try {
      buf = await fs.readFile(path);
    } catch {
      buf = null; // fall through to regenerate
    }
  }

  // File missing (or never generated — order hit verify before T24 shipped,
  // container restart, etc.) — regenerate on demand from the encrypted payload.
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
