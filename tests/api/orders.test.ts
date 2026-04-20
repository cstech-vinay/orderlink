import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { signOtpToken, otpSecret, OTP_COOKIE_NAME } from "@/lib/otp-token";
import { getProductBySlug, SHIPPING_PAISE } from "@/data/products";
import { calculateOrderAmounts } from "@/lib/pricing";

// Tests compute expected totals from the live catalog so they're price-independent —
// editing src/data/products.ts doesn't invalidate assertions.
const OIL = getProductBySlug("oil-dispenser")!;
const PREPAID_AMOUNT = calculateOrderAmounts({
  itemPricePaise: OIL.itemPricePaise,
  itemPrepaidPricePaise: OIL.itemPrepaidPricePaise,
  method: "prepaid",
  couponDiscountPaise: 0,
}).advancePaise;
const POD_ADVANCE = SHIPPING_PAISE;
const POD_BALANCE = OIL.itemPricePaise;

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

// Mock Razorpay so tests don't hit the real API.
vi.mock("@/lib/razorpay", async () => {
  const actual = await vi.importActual<typeof import("@/lib/razorpay")>("@/lib/razorpay");
  return {
    ...actual,
    createRazorpayOrder: vi.fn(async ({ amountPaise, receipt }: { amountPaise: number; receipt: string }) => ({
      id: `order_test_${receipt}`,
      amount: amountPaise,
      currency: "INR",
      receipt,
      status: "created",
    })),
  };
});

// next/headers' cookies() reads from the incoming Request's Cookie header
// in route handlers, so we build requests with the cookie pre-set.
function buildRequest(body: object, cookieHeader?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validOtpCookie(mobile: string): string {
  const secret = otpSecret();
  if (!secret) throw new Error("otpSecret() returned null in tests");
  const token = signOtpToken({ mobile, secret, ttlSeconds: 900 });
  return `${OTP_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

const baseInput = {
  productSlug: "oil-dispenser",
  fullName: "Priya Sharma",
  mobile: "9876543210",
  email: "priya@example.com",
  addressLine1: "221B Baker Street",
  pincode: "411014",
  city: "Pune",
  state: "Maharashtra",
  paymentMethod: "prepaid" as const,
};

describe.skipIf(!hasDb)("POST /api/orders — OTP gate ON", () => {
  let POST: typeof import("@/app/api/orders/route").POST;
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/orders/route"));
    ({ db, schema } = await import("@/db/client"));
    ({ sql } = await import("drizzle-orm"));
  });

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_OTP_GATE_ENABLED = "true";
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({
      productSlug: "oil-dispenser",
      remaining: 5,
      reserved: 0,
    });
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  });

  it("creates a prepaid order, reserves inventory, returns Razorpay context", async () => {
    const res = await POST(buildRequest(baseInput, validOtpCookie(baseInput.mobile)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.orderNumber).toBe("OL-2026-0001");
    expect(body.razorpayOrderId).toBe("order_test_OL-2026-0001");
    expect(body.amountPaise).toBe(PREPAID_AMOUNT);

    // orders_ref row written, pending_sf_sync row written
    const refs = await db.select().from(schema.ordersRef);
    expect(refs).toHaveLength(1);
    expect(refs[0].status).toBe("pending_payment");
    expect(refs[0].customerMobileLast4).toBe("3210");
    expect(refs[0].customerFirstInitial).toBe("P.");

    const pending = await db.select().from(schema.pendingSfSync);
    expect(pending).toHaveLength(1);
    expect(pending[0].jobKind).toBe("full_sync");
  });

  it("selects ₹49 advance for pay-on-delivery", async () => {
    const res = await POST(
      buildRequest(
        { ...baseInput, paymentMethod: "pay_on_delivery" },
        validOtpCookie(baseInput.mobile)
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amountPaise).toBe(POD_ADVANCE);

    const refs = await db.select().from(schema.ordersRef);
    expect(refs[0].status).toBe("pending_advance");
    expect(refs[0].balanceDuePaise).toBe(POD_BALANCE);
  });

  it("returns 409 out_of_stock when inventory is exhausted", async () => {
    await db.execute(sql`UPDATE inventory SET remaining = 0 WHERE product_slug = 'oil-dispenser'`);
    const res = await POST(buildRequest(baseInput, validOtpCookie(baseInput.mobile)));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("out_of_stock");

    const refs = await db.select().from(schema.ordersRef);
    expect(refs).toHaveLength(0);
  });

  it("returns 401 when OTP cookie is missing", async () => {
    const res = await POST(buildRequest(baseInput)); // no cookie
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("mobile_not_verified");
  });

  it("returns 401 when OTP cookie is for a different mobile", async () => {
    const res = await POST(
      buildRequest(baseInput, validOtpCookie("9000000000")) // cookie for different number
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("otp_invalid");
    expect(body.reason).toBe("mobile_mismatch");
  });

  it("returns 400 for invalid input (bad pincode)", async () => {
    const res = await POST(
      buildRequest({ ...baseInput, pincode: "bad" }, validOtpCookie(baseInput.mobile))
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("rejects coming-soon products", async () => {
    const res = await POST(
      buildRequest(
        { ...baseInput, productSlug: "rice-face-wash" },
        validOtpCookie(baseInput.mobile)
      )
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("product_unavailable");
  });
});

describe.skipIf(!hasDb)("POST /api/orders — OTP gate OFF (Phase 2a default)", () => {
  let POST: typeof import("@/app/api/orders/route").POST;
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/orders/route"));
    ({ db, schema } = await import("@/db/client"));
    ({ sql } = await import("drizzle-orm"));
  });

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_OTP_GATE_ENABLED = "false";
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({
      productSlug: "oil-dispenser",
      remaining: 5,
      reserved: 0,
    });
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  });

  it("creates order WITHOUT any OTP cookie", async () => {
    const res = await POST(buildRequest(baseInput)); // no Cookie header
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.orderNumber).toBe("OL-2026-0001");
  });

  it("creates order even if the cookie is for a different mobile", async () => {
    // With gate off, server must not care about the cookie at all.
    const res = await POST(buildRequest(baseInput, validOtpCookie("9000000000")));
    expect(res.status).toBe(200);
  });

  it("still validates checkout input (pincode) + 409s out_of_stock", async () => {
    await db.execute(sql`UPDATE inventory SET remaining = 0 WHERE product_slug = 'oil-dispenser'`);
    const res = await POST(buildRequest(baseInput));
    expect(res.status).toBe(409);
  });
});
