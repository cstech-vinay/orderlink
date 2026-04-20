import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { checkoutSchema } from "@/lib/validation/checkout";
import { getProductBySlug } from "@/data/products";
import { calculateOrderAmounts } from "@/lib/pricing";
import { reserveInventory, releaseInventory } from "@/lib/inventory";
import { generateOrderNumber } from "@/lib/order-number";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { createRazorpayOrder } from "@/lib/razorpay";
import { encryptJSON } from "@/lib/crypto";
import {
  verifyOtpToken,
  otpSecret,
  OTP_COOKIE_NAME,
} from "@/lib/otp-token";

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function POST(request: Request) {
  // 1. Validate input against the Zod schema (checkout form)
  const json = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 2. Gate on OTP-verified cookie (T14.5) — only when flag is on.
  //    Phase 2a launches with the gate off: POD requires ₹49 advance via Razorpay
  //    and prepaid requires full payment, so fake-order abuse still costs the
  //    fraudster money. Flip NEXT_PUBLIC_OTP_GATE_ENABLED=true to re-enable.
  if (process.env.NEXT_PUBLIC_OTP_GATE_ENABLED === "true") {
    const secret = otpSecret();
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 }
      );
    }
    const otpCookie = readCookie(request, OTP_COOKIE_NAME);
    if (!otpCookie) {
      return NextResponse.json(
        { ok: false, error: "mobile_not_verified" },
        { status: 401 }
      );
    }
    const otpCheck = verifyOtpToken({
      token: otpCookie,
      mobile: input.mobile,
      secret,
      now: Date.now(),
    });
    if (!otpCheck.ok) {
      return NextResponse.json(
        { ok: false, error: "otp_invalid", reason: otpCheck.reason },
        { status: 401 }
      );
    }
  }

  // 3. Product must exist and be live for purchase
  const product = getProductBySlug(input.productSlug);
  if (!product || product.status !== "live") {
    return NextResponse.json(
      { ok: false, error: "product_unavailable" },
      { status: 400 }
    );
  }

  // 4. Atomic inventory reserve (returns false if stock is zero)
  const reserved = await reserveInventory(product.slug, 1);
  if (!reserved) {
    return NextResponse.json(
      { ok: false, error: "out_of_stock" },
      { status: 409 }
    );
  }

  try {
    // 5. Validate + apply coupon if one was supplied. Invalid/expired/used codes
    //    are silently ignored at this layer — the client already validated via
    //    /api/coupons/validate pre-submit, so reaching here with a bad code is
    //    edge-case (stale UI, expired between tabs). Better to let the order
    //    through at list price than fail the checkout.
    let couponDiscountPaise = 0;
    let appliedCouponCode: string | null = null;
    if (input.couponCode) {
      const { validateCoupon } = await import("@/lib/coupons");
      const v = await validateCoupon({ code: input.couponCode, email: input.email });
      if (v.ok) {
        couponDiscountPaise = v.amountPaise;
        appliedCouponCode = v.code;
      }
    }

    // 6. Compute totals (T9 pure pricing lib)
    const amounts = calculateOrderAmounts({
      itemPricePaise: product.itemPricePaise,
      itemPrepaidPricePaise: product.itemPrepaidPricePaise,
      method: input.paymentMethod,
      couponDiscountPaise,
    });

    // 6. Gap-free order + invoice numbers via Postgres sequences
    const orderNumber = await generateOrderNumber();
    const invoiceNumber = await generateInvoiceNumber();

    // 7. Create the Razorpay order for the ADVANCE amount only
    //    (prepaid = full total; POD = ₹49 shipping upfront, balance on delivery)
    const rzpOrder = await createRazorpayOrder({
      amountPaise: amounts.advancePaise,
      receipt: orderNumber,
      notes: {
        orderlink_order_number: orderNumber,
        payment_method: input.paymentMethod,
      },
    });

    // 8. Persist orders_ref (minimal non-PII projection we keep in our DB;
    //    full PII lives encrypted in pending_sf_sync until SF sync drains it).
    const [refRow] = await db
      .insert(schema.ordersRef)
      .values({
        orderNumber,
        invoiceNumber,
        status: input.paymentMethod === "prepaid" ? "pending_payment" : "pending_advance",
        paymentMethod: input.paymentMethod,
        totalPaise: amounts.totalPaise,
        advancePaise: amounts.advancePaise,
        balanceDuePaise: amounts.balanceDuePaise,
        productSlug: product.slug,
        customerFirstInitial: `${input.fullName.charAt(0).toUpperCase()}.`,
        customerMobileLast4: input.mobile.slice(-4),
        shipPincode: input.pincode,
        shipState: input.state,
        razorpayOrderId: rzpOrder.id,
        utmSource: input.utm_source,
        utmMedium: input.utm_medium,
        utmCampaign: input.utm_campaign,
        trackKey: input.mobile.slice(-4),
      })
      .returning();

    // 9. Stash the full PII payload encrypted. T28 reads + drains this row
    //    when syncing to Salesforce (Person Account + Order + ContentVersion invoice).
    //    Overwrite couponCode with the validated value (or null if invalid)
    //    so verify route records redemptions only for valid coupons.
    const enc = encryptJSON({
      ...input,
      couponCode: appliedCouponCode ?? undefined,
      orderNumber,
      invoiceNumber,
    });
    await db.insert(schema.pendingSfSync).values({
      orderRefId: refRow.id,
      payloadCiphertext: enc.ciphertext,
      payloadIv: enc.iv,
      payloadTag: enc.tag,
      jobKind: "full_sync",
      status: "pending",
    });

    return NextResponse.json({
      ok: true,
      orderId: refRow.id,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amountPaise: amounts.advancePaise,
      currency: "INR",
    });
  } catch (err) {
    // Release reservation on any downstream failure so stock isn't stuck
    await releaseInventory(product.slug, 1).catch(() => {});
    console.error("[/api/orders] failed:", err);
    return NextResponse.json(
      { ok: false, error: "order_creation_failed" },
      { status: 500 }
    );
  }
}
