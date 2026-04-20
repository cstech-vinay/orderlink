import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { trackByIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  // OL-YYYY-NNNN (or more — the order_number_sequence padding is 4, but we
  // accept 4+ in case it ever overflows).
  orderNumber: z.string().regex(/^OL-\d{4}-\d{4,}$/),
  trackKey: z.string().regex(/^\d{4}$/),
});

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

  const [row] = await db
    .select()
    .from(schema.ordersRef)
    .where(
      and(
        eq(schema.ordersRef.orderNumber, orderNumber),
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
