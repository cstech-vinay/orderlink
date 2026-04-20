import { describe, it, expect, beforeEach, beforeAll } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

let ipCounter = 1;
function nextIp(): string {
  // Unique IP per test so the module-level rate limiter doesn't leak state.
  return `198.51.100.${ipCounter++}`;
}

function buildRequest(body: object, ip = nextIp()): Request {
  return new Request("http://localhost/api/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!hasDb)("POST /api/track", () => {
  let POST: typeof import("@/app/api/track/route").POST;
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/track/route"));
    ({ db, schema } = await import("@/db/client"));
    ({ sql } = await import("drizzle-orm"));
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.insert(schema.ordersRef).values({
      orderNumber: "OL-2026-0099",
      invoiceNumber: "OL-INV-2026-000099",
      status: "shipped",
      paymentMethod: "prepaid",
      totalPaise: 19200,
      advancePaise: 19200,
      balanceDuePaise: 0,
      productSlug: "oil-dispenser",
      customerFirstInitial: "P.",
      customerMobileLast4: "3210",
      shipPincode: "411014",
      shipState: "Maharashtra",
      trackKey: "3210",
    });
  });

  it("returns order on correct orderNumber + trackKey", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "OL-2026-0099", trackKey: "3210" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.orderNumber).toBe("OL-2026-0099");
    expect(body.order.status).toBe("shipped");
    expect(body.order.productSlug).toBe("oil-dispenser");
    expect(body.order.shipPincode).toBe("411014");
  });

  it("never leaks PII fields", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "OL-2026-0099", trackKey: "3210" })
    );
    const body = await res.json();
    // Projection should NOT include customerFirstInitial, customerMobileLast4, shipState, razorpay ids
    expect(body.order.customerFirstInitial).toBeUndefined();
    expect(body.order.customerMobileLast4).toBeUndefined();
    expect(body.order.razorpayOrderId).toBeUndefined();
  });

  it("returns 404 on wrong trackKey (doesn't leak order existence)", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "OL-2026-0099", trackKey: "0000" })
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_found");
  });

  it("returns 404 for unknown order number", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "OL-2026-9999", trackKey: "3210" })
    );
    expect(res.status).toBe(404);
  });

  it("rejects malformed order number with 400", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "ORDER_123", trackKey: "3210" })
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-4-digit trackKey with 400", async () => {
    const res = await POST(
      buildRequest({ orderNumber: "OL-2026-0099", trackKey: "abc" })
    );
    expect(res.status).toBe(400);
  });

  it("rate-limits the 6th call from same IP within the window", async () => {
    const ip = "198.51.100.99"; // unique IP so we don't share state with other tests
    const body = { orderNumber: "OL-2026-0099", trackKey: "3210" };
    for (let i = 0; i < 5; i++) {
      const res = await POST(buildRequest(body, ip));
      expect(res.status).toBe(200);
    }
    const sixth = await POST(buildRequest(body, ip));
    expect(sixth.status).toBe(429);
    const data = await sixth.json();
    expect(data.error).toBe("rate_limited");
    expect(data.retryAfterSeconds).toBeGreaterThan(0);
  });
});
