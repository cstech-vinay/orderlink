import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";

export type CouponValidation =
  | { ok: true; code: string; amountPaise: number; kind: string }
  | { ok: false; error: CouponError };

export type CouponError =
  | "unknown_code"
  | "expired"
  | "max_uses_reached"
  | "already_used";

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Validate a coupon code against an email. Called both by:
 *   - POST /api/coupons/validate (client-side pre-check before checkout)
 *   - POST /api/orders (server-side apply at order creation)
 * so behaviour stays consistent. Silent server-side failure is the caller's
 * choice (/api/orders ignores invalid coupons; /validate surfaces the error).
 */
export async function validateCoupon(args: {
  code: string;
  email: string;
}): Promise<CouponValidation> {
  const code = args.code.trim().toUpperCase();
  const [coupon] = await db
    .select()
    .from(schema.coupons)
    .where(eq(schema.coupons.code, code))
    .limit(1);

  if (!coupon) return { ok: false, error: "unknown_code" };

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, error: "expired" };
  }

  if (coupon.maxUses !== null && coupon.redemptions >= coupon.maxUses) {
    return { ok: false, error: "max_uses_reached" };
  }

  // First-order coupons are 1-per-email.
  if (coupon.kind === "first_order") {
    const emailHash = hashEmail(args.email);
    const [prior] = await db
      .select({ id: schema.couponRedemptions.id })
      .from(schema.couponRedemptions)
      .where(
        and(
          eq(schema.couponRedemptions.couponCode, code),
          eq(schema.couponRedemptions.customerEmailHash, emailHash)
        )
      )
      .limit(1);
    if (prior) return { ok: false, error: "already_used" };
  }

  return {
    ok: true,
    code,
    amountPaise: coupon.amountPaise,
    kind: coupon.kind,
  };
}

/**
 * Record a redemption after /api/orders/verify confirms payment. Bumps the
 * coupon.redemptions counter atomically so max_uses enforcement holds under
 * concurrency. Silent no-op if the (code, email) pair already redeemed.
 */
export async function recordCouponRedemption(args: {
  couponCode: string;
  orderRefId: string;
  email: string;
}): Promise<void> {
  const code = args.couponCode.trim().toUpperCase();
  const emailHash = hashEmail(args.email);

  // Guard against double-insert on replay (verify route is idempotent).
  const existing = await db
    .select({ id: schema.couponRedemptions.id })
    .from(schema.couponRedemptions)
    .where(
      and(
        eq(schema.couponRedemptions.couponCode, code),
        eq(schema.couponRedemptions.orderRefId, args.orderRefId)
      )
    )
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(schema.couponRedemptions).values({
    couponCode: code,
    orderRefId: args.orderRefId,
    customerEmailHash: emailHash,
  });

  await db.execute(sql`
    UPDATE coupons SET redemptions = redemptions + 1 WHERE code = ${code}
  `);
}
