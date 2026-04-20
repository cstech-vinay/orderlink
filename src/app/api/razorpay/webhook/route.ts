import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { commitInventory, releaseInventory } from "@/lib/inventory";

/**
 * Razorpay → OrderLink webhook reconciler.
 *
 * Handles the async payment outcome path that the sync /api/orders/verify
 * doesn't cover — user's network drops mid-payment, Razorpay still fires this
 * webhook, and we update order state so the user's DB row reconciles.
 *
 * Events we care about:
 *   - payment.captured  → mark paid, commit inventory
 *   - payment.failed    → release inventory reservation, mark failed
 *   - refund.processed  → future (T28+ SF sync handles refund emails)
 *
 * Idempotency: the webhook_events.razorpay_event_id column has UNIQUE. Inserts
 * that collide short-circuit with `duplicate: true` — safe to replay.
 */

type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  status: string;
};

type RazorpayEvent = {
  event: string;
  id?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: { id: string; payment_id: string } };
  };
};

export async function POST(request: Request) {
  // Razorpay signs the raw request body, so we must read as text first (before JSON.parse).
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Razorpay's webhook envelope always ships an event id in the `x-razorpay-event-id`
  // header. Body-level id (when present) is the payment/order/refund id, not the event.
  const eventId = request.headers.get("x-razorpay-event-id") ?? event.id ?? null;
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "missing_event_id" }, { status: 400 });
  }

  // Idempotency guard — unique constraint on razorpay_event_id short-circuits replays.
  try {
    await db.insert(schema.webhookEvents).values({
      razorpayEventId: eventId,
      eventType: event.event,
      payload: event as unknown as Record<string, unknown>,
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  switch (event.event) {
    case "payment.captured":
      await handlePaymentCaptured(event);
      break;
    case "payment.failed":
      await handlePaymentFailed(event);
      break;
    // refund.processed is future scope — SF email Flow handles customer comms post-T28
  }

  return NextResponse.json({ ok: true, event: event.event });
}

async function handlePaymentCaptured(event: RazorpayEvent): Promise<void> {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.razorpayOrderId, payment.order_id))
    .limit(1);
  if (!order) return;

  // Already reconciled by /api/orders/verify — don't double-commit inventory.
  if (order.status === "paid" || order.status === "advance_paid") return;

  const newStatus = order.paymentMethod === "prepaid" ? "paid" : "advance_paid";
  await db
    .update(schema.ordersRef)
    .set({
      status: newStatus,
      razorpayPaymentId: payment.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.ordersRef.id, order.id));
  await commitInventory(order.productSlug, 1);
}

async function handlePaymentFailed(event: RazorpayEvent): Promise<void> {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.razorpayOrderId, payment.order_id))
    .limit(1);
  if (!order) return;

  // If already succeeded (unlikely race), don't clobber.
  if (order.status === "paid" || order.status === "advance_paid") return;

  await db
    .update(schema.ordersRef)
    .set({
      status: "cancelled",
      razorpayPaymentId: payment.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.ordersRef.id, order.id));
  await releaseInventory(order.productSlug, 1);
}
