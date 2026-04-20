import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";

describe("verifyPaymentSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_1234";
  });

  it("returns true for a valid signature", () => {
    const orderId = "order_ABC";
    const paymentId = "pay_XYZ";
    const signature = createHmac("sha256", "test_secret_1234")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    expect(
      verifyPaymentSignature({
        orderId: "order_ABC",
        paymentId: "pay_XYZ",
        signature: "0".repeat(64),
      })
    ).toBe(false);
  });

  it("returns false when RAZORPAY_KEY_SECRET is missing", () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(
      verifyPaymentSignature({
        orderId: "order_ABC",
        paymentId: "pay_XYZ",
        signature: "0".repeat(64),
      })
    ).toBe(false);
  });

  it("returns false for a length-mismatched signature", () => {
    expect(
      verifyPaymentSignature({
        orderId: "order_ABC",
        paymentId: "pay_XYZ",
        signature: "abc",
      })
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "wh_secret_5678";
  });

  it("verifies against the webhook secret (not the key secret)", () => {
    const body = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", "wh_secret_5678")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("returns false for a signature produced with a different secret", () => {
    const body = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", "different_secret")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(false);
  });

  it("returns false when WEBHOOK_SECRET is missing", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = '{"event":"payment.captured"}';
    const signature = createHmac("sha256", "wh_secret_5678")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(false);
  });
});
