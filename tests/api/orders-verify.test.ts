import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { createHmac } from "node:crypto";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

const RAZORPAY_TEST_SECRET = "test_secret_for_verify_roundtrip";

function validSignature(orderId: string, paymentId: string): string {
  return createHmac("sha256", RAZORPAY_TEST_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function buildRequest(body: object): Request {
  return new Request("http://localhost/api/orders/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasDb)("POST /api/orders/verify", () => {
  let POST: typeof import("@/app/api/orders/verify/route").POST;
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;
  let eq: typeof import("drizzle-orm").eq;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/orders/verify/route"));
    ({ db, schema } = await import("@/db/client"));
    ({ sql, eq } = await import("drizzle-orm"));
  });

  let orderId: string;

  beforeEach(async () => {
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_TEST_SECRET;
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({
      productSlug: "oil-dispenser",
      remaining: 5,
      reserved: 1,
    });
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
    const [row] = await db
      .insert(schema.ordersRef)
      .values({
        orderNumber: "OL-2026-0001",
        invoiceNumber: "OL-INV-2026-000001",
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
        razorpayOrderId: "order_test_123",
        trackKey: "3210",
      })
      .returning();
    orderId = row.id;
  });

  it("marks prepaid order paid on valid signature + commits inventory", async () => {
    const sig = validSignature("order_test_123", "pay_test_456");
    const res = await POST(
      buildRequest({
        orderId,
        razorpayOrderId: "order_test_123",
        razorpayPaymentId: "pay_test_456",
        razorpaySignature: sig,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("paid");
    expect(body.orderNumber).toBe("OL-2026-0001");

    const [row] = await db.select().from(schema.ordersRef).where(eq(schema.ordersRef.id, orderId));
    expect(row.status).toBe("paid");
    expect(row.razorpayPaymentId).toBe("pay_test_456");

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(4);
    expect(inv.reserved).toBe(0);
  });

  it("marks POD order advance_paid on valid signature", async () => {
    await db
      .update(schema.ordersRef)
      .set({
        paymentMethod: "pay_on_delivery",
        status: "pending_advance",
        advancePaise: 4900,
        balanceDuePaise: 15000,
        totalPaise: 19900,
      })
      .where(eq(schema.ordersRef.id, orderId));

    const sig = validSignature("order_test_123", "pay_test_pod");
    const res = await POST(
      buildRequest({
        orderId,
        razorpayOrderId: "order_test_123",
        razorpayPaymentId: "pay_test_pod",
        razorpaySignature: sig,
      })
    );
    const body = await res.json();
    expect(body.status).toBe("advance_paid");
  });

  it("rejects tampered signature + releases reserved inventory", async () => {
    const res = await POST(
      buildRequest({
        orderId,
        razorpayOrderId: "order_test_123",
        razorpayPaymentId: "pay_test_456",
        razorpaySignature: "0".repeat(64),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("signature_invalid");

    // Inventory reservation should be released so stock isn't stuck
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.reserved).toBe(0);
  });

  it("rejects order_mismatch when razorpayOrderId does not match stored", async () => {
    const sig = validSignature("order_test_WRONG", "pay_test_456");
    const res = await POST(
      buildRequest({
        orderId,
        razorpayOrderId: "order_test_WRONG",
        razorpayPaymentId: "pay_test_456",
        razorpaySignature: sig,
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("order_mismatch");
  });

  it("returns 404 for unknown orderId", async () => {
    const sig = validSignature("order_test_123", "pay_test_456");
    const res = await POST(
      buildRequest({
        orderId: "00000000-0000-0000-0000-000000000000",
        razorpayOrderId: "order_test_123",
        razorpayPaymentId: "pay_test_456",
        razorpaySignature: sig,
      })
    );
    expect(res.status).toBe(404);
  });

  it("is idempotent — second call with the same valid signature short-circuits", async () => {
    const sig = validSignature("order_test_123", "pay_test_456");
    const body = {
      orderId,
      razorpayOrderId: "order_test_123",
      razorpayPaymentId: "pay_test_456",
      razorpaySignature: sig,
    };

    const firstRes = await POST(buildRequest(body));
    expect(firstRes.status).toBe(200);

    const secondRes = await POST(buildRequest(body));
    expect(secondRes.status).toBe(200);
    const second = await secondRes.json();
    expect(second.alreadyVerified).toBe(true);
    expect(second.status).toBe("paid");

    // Inventory should NOT be double-committed
    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.remaining).toBe(4);
    expect(inv.reserved).toBe(0);
  });

  it("rejects invalid body shape (400)", async () => {
    const res = await POST(
      buildRequest({
        orderId, // missing other fields
      })
    );
    expect(res.status).toBe(400);
  });
});
