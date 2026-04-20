import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { trackByIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  // Accepts either the order number (OL-YYYY-NNNN, 4+ digits) or the invoice
  // number (OL-INV-YYYY-NNNNNN, 6+ digits). Extra-lenient: if the user types
  // the invoice digits but drops "INV-", buildLookupCandidates normalizes it.
  orderNumber: z
    .string()
    .trim()
    .regex(/^OL-(INV-)?\d{4}-\d{4,}$/i, "Use order # (OL-YYYY-NNNN) or invoice # (OL-INV-YYYY-NNNNNN)"),
  trackKey: z.string().regex(/^\d{4}$/),
});

/**
 * Given whatever the customer typed in the "order number" field, return the
 * plausible set of matching identifiers to query against.
 *
 * Common patterns we see:
 *   OL-2026-0003           → order number (canonical)
 *   OL-INV-2026-000011     → invoice number (canonical)
 *   OL-2026-000011         → invoice number with INV dropped (common mistake)
 */
function buildLookupCandidates(raw: string): {
  orderNumbers: string[];
  invoiceNumbers: string[];
} {
  const input = raw.trim().toUpperCase();
  const orderNumbers: string[] = [];
  const invoiceNumbers: string[] = [];

  if (/^OL-INV-\d{4}-\d{4,}$/.test(input)) {
    invoiceNumbers.push(input);
  } else if (/^OL-\d{4}-\d{5,}$/.test(input)) {
    // 5+ digits after year → probably invoice digits typed without INV
    invoiceNumbers.push(input.replace(/^OL-/, "OL-INV-"));
    orderNumbers.push(input); // also try as-is in case ordering overflows 4 digits someday
  } else {
    orderNumbers.push(input);
  }

  return { orderNumbers, invoiceNumbers };
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = trackByIp.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 }
    );
  }

  const { orderNumber, trackKey } = parsed.data;
  const { orderNumbers, invoiceNumbers } = buildLookupCandidates(orderNumber);

  const matchClauses = [
    ...orderNumbers.map(() => true),
    ...invoiceNumbers.map(() => true),
  ];
  if (matchClauses.length === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const [row] = await db
    .select()
    .from(schema.ordersRef)
    .where(
      and(
        or(
          orderNumbers.length > 0
            ? inArray(schema.ordersRef.orderNumber, orderNumbers)
            : undefined,
          invoiceNumbers.length > 0
            ? inArray(schema.ordersRef.invoiceNumber, invoiceNumbers)
            : undefined
        ),
        eq(schema.ordersRef.trackKey, trackKey)
      )
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Narrow projection — we only expose what the customer needs. No PII.
  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: row.orderNumber,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      paymentMethod: row.paymentMethod,
      totalPaise: row.totalPaise,
      advancePaise: row.advancePaise,
      balanceDuePaise: row.balanceDuePaise,
      productSlug: row.productSlug,
      shipPincode: row.shipPincode,
      createdAt: row.createdAt,
    },
  });
}
