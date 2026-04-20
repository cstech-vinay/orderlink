import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { commitInventory, releaseInventory } from "@/lib/inventory";

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().length(64),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, orderId))
    .limit(1);
  if (!order) {
    return NextResponse.json({ ok: false, error: "order_not_found" }, { status: 404 });
  }

  // Guard against a malicious client swapping order IDs: the razorpayOrderId
  // on the request must match what we stored when we created the Razorpay order.
  if (order.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ ok: false, error: "order_mismatch" }, { status: 400 });
  }

  // Idempotency: if we already marked it paid, short-circuit. Razorpay's handler
  // can fire again on page refreshes or network retries.
  if (order.status === "paid" || order.status === "advance_paid") {
    return NextResponse.json({
      ok: true,
      orderId,
      status: order.status,
      orderNumber: order.orderNumber,
      alreadyVerified: true,
    });
  }

  const sigOk = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!sigOk) {
    await releaseInventory(order.productSlug, 1).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "signature_invalid" },
      { status: 400 }
    );
  }

  const newStatus = order.paymentMethod === "prepaid" ? "paid" : "advance_paid";
  await db
    .update(schema.ordersRef)
    .set({
      status: newStatus,
      razorpayPaymentId,
      updatedAt: new Date(),
    })
    .where(eq(schema.ordersRef.id, orderId));

  await commitInventory(order.productSlug, 1);

  // Salesforce sync is already enqueued in pending_sf_sync (from POST /api/orders).
  // The SF worker (T30) will pick it up and push: Person Account → Order → invoice PDF → email.

  return NextResponse.json({
    ok: true,
    orderId,
    status: newStatus,
    orderNumber: order.orderNumber,
  });
}
