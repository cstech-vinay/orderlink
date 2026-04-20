import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { createHmac } from "node:crypto";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";
const WEBHOOK_SECRET = "wh_test_secret_xyz";

function signed(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

function buildRequest(body: string, sig: string, eventId?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-razorpay-signature": sig,
  };
  if (eventId) headers["x-razorpay-event-id"] = eventId;
  return new Request("http://localhost/api/razorpay/webhook", {
    method: "POST",
    headers,
    body,
  });
}

describe.skipIf(!hasDb)("POST /api/razorpay/webhook", () => {
  let POST: typeof import("@/app/api/razorpay/webhook/route").POST;
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/razorpay/webhook/route"));
    ({ db, schema } = await import("@/db/client"));
    ({ sql, eq } = await import("drizzle-orm"));
  });

  beforeEach(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    await db.execute(sql`DELETE FROM webhook_events`);
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({
      productSlug: "oil-dispenser",
      remaining: 5,
      reserved: 1,
    });
    await db.insert(schema.ordersRef).values({
      orderNumber: "OL-2026-WH01",
      invoiceNumber: "OL-INV-2026-WH0001",
      status: "pending_payment",
      paymentMethod: "prepaid",
      totalPaise: 19200,
      advancePaise: 19200,
      balanceDuePaise: 0,
      productSlug: "oil-dispenser",
      customerFirstInitial: "P.",
      customerMobileLast4: "3210",
      shipPincode: "411014",
      shipState: "Maharashtra",
      razorpayOrderId: "order_webhook_1",
      trackKey: "3210",
    });
  });

  it("payment.captured → marks paid + commits inventory", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_captured_1",
            order_id: "order_webhook_1",
            status: "captured",
          },
        },
      },
    });

    const res = await POST(buildRequest(body, signed(body), "evt_wh_1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.event).toBe("payment.captured");

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.razorpayOrderId, "order_webhook_1"));
    expect(order.status).toBe("paid");
    expect(order.razorpayPaymentId).toBe("pay_captured_1");

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(4);
    expect(inv.reserved).toBe(0);
  });

  it("payment.failed → marks cancelled + releases reservation", async () => {
    const body = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_1",
            order_id: "order_webhook_1",
            status: "failed",
          },
        },
      },
    });

    const res = await POST(buildRequest(body, signed(body), "evt_wh_fail"));
    expect(res.status).toBe(200);

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.razorpayOrderId, "order_webhook_1"));
    expect(order.status).toBe("cancelled");

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(5); // original stock restored
    expect(inv.reserved).toBe(0);
  });

  it("duplicate event_id short-circuits (idempotent replay)", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_dup", order_id: "order_webhook_1", status: "captured" },
        },
      },
    });

    const first = await POST(buildRequest(body, signed(body), "evt_dup"));
    expect(first.status).toBe(200);
    const firstData = await first.json();
    expect(firstData.duplicate).toBeUndefined();

    const second = await POST(buildRequest(body, signed(body), "evt_dup"));
    expect(second.status).toBe(200);
    const secondData = await second.json();
    expect(secondData.duplicate).toBe(true);

    // Inventory should NOT have been double-committed
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(4);
  });

  it("webhook arriving after /api/orders/verify already ran → no double commit", async () => {
    // Simulate the "sync handler already paid" state
    await db
      .update(schema.ordersRef)
      .set({ status: "paid", razorpayPaymentId: "pay_via_sync" })
      .where(eq(schema.ordersRef.razorpayOrderId, "order_webhook_1"));
    await db
      .update(schema.inventory)
      .set({ remaining: 4, reserved: 0 })
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_race", order_id: "order_webhook_1", status: "captured" },
        },
      },
    });

    const res = await POST(buildRequest(body, signed(body), "evt_race"));
    expect(res.status).toBe(200);

    // razorpayPaymentId must NOT be overwritten by the later webhook
    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.razorpayOrderId, "order_webhook_1"));
    expect(order.status).toBe("paid");
    expect(order.razorpayPaymentId).toBe("pay_via_sync");

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(4); // no double-decrement
  });

  it("rejects invalid signature", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const res = await POST(buildRequest(body, "0".repeat(64), "evt_bad"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("bad_signature");
  });

  it("rejects webhook without an event id", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_no_id", order_id: "order_webhook_1", status: "captured" },
        },
      },
    });
    // Pass no event-id header and no id in body
    const res = await POST(buildRequest(body, signed(body)));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("missing_event_id");
  });

  it("accepts body-level id as event_id fallback", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      id: "evt_body_id_fallback",
      payload: {
        payment: {
          entity: { id: "pay_bif", order_id: "order_webhook_1", status: "captured" },
        },
      },
    });
    const res = await POST(buildRequest(body, signed(body))); // no x-razorpay-event-id
    expect(res.status).toBe(200);
  });

  it("no matching order → still 200 (we accept the webhook, just no-op)", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_orphan", order_id: "order_does_not_exist", status: "captured" },
        },
      },
    });
    const res = await POST(buildRequest(body, signed(body), "evt_orphan"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
