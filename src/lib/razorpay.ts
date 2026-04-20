import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!client) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing");
    }
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

/** Create a Razorpay order for a given amount (paise). Receipt is our internal order number. */
export async function createRazorpayOrder(args: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  return razorpay().orders.create({
    amount: args.amountPaise,
    currency: "INR",
    receipt: args.receipt,
    notes: args.notes,
    payment_capture: true,
  });
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verify the signature Razorpay passes to the success callback. */
export function verifyPaymentSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, args.signature);
}

/** Verify webhook signature. Webhook body is signed with WEBHOOK_SECRET, not KEY_SECRET. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
