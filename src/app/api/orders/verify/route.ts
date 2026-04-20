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

  // Generate GST invoice PDF from the encrypted checkout payload. Stored on
  // local disk as a fallback cache — Salesforce Files becomes the authoritative
  // copy once the T28 SF worker drains pending_sf_sync and uploads the bytes.
  // `invoicePdfPath` will be overwritten with the SF ContentDocument ID
  // (sf:069…) by the worker. Best-effort: don't fail the verify if this errors.
  try {
    await generateAndStoreInvoice(order.id, order.productSlug);
  } catch (err) {
    console.error("[verify] invoice generation failed:", err);
  }

  // Salesforce sync is already enqueued in pending_sf_sync (from POST /api/orders).
  // The SF worker (T30) will: upsert Person Account + Order, upload the PDF
  // as ContentVersion, and trigger the SF Flow that emails the customer.

  return NextResponse.json({
    ok: true,
    orderId,
    status: newStatus,
    orderNumber: order.orderNumber,
  });
}

async function generateAndStoreInvoice(
  orderId: string,
  productSlug: string
): Promise<void> {
  const { decryptJSON } = await import("@/lib/crypto");
  const { getProductBySlug, SHIPPING_PAISE } = await import("@/data/products");
  const { generateInvoicePdf } = await import("@/lib/invoice-pdf");

  const [pending] = await db
    .select()
    .from(schema.pendingSfSync)
    .where(eq(schema.pendingSfSync.orderRefId, orderId))
    .limit(1);
  if (!pending) return; // shouldn't happen; safety

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, orderId))
    .limit(1);
  if (!order) return;

  const payload = decryptJSON<{
    fullName: string;
    email: string;
    mobile: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    pincode: string;
    city: string;
    state: string;
  }>({
    ciphertext: Buffer.from(pending.payloadCiphertext as unknown as Buffer),
    iv: pending.payloadIv,
    tag: pending.payloadTag,
  });

  const product = getProductBySlug(productSlug);
  if (!product) return;

  const formattedAddress = [
    payload.addressLine1,
    payload.addressLine2,
    payload.landmark,
    payload.city,
    payload.state,
    payload.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const pdfPath = await generateInvoicePdf({
    invoiceNumber: order.invoiceNumber,
    invoiceDate: new Date(),
    orderNumber: order.orderNumber,
    customer: {
      name: payload.fullName,
      email: payload.email,
      mobile: `+91${payload.mobile}`,
      address: formattedAddress,
    },
    shipState: payload.state,
    product: {
      title: product.title,
      hsn: product.hsnCode,
      gstRate: product.gstRatePercent,
      itemPricePaise: product.itemPricePaise,
    },
    shippingPaise: SHIPPING_PAISE,
    paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
    advancePaid: order.advancePaise,
    balanceDue: order.balanceDuePaise,
    totalPaise: order.totalPaise,
  });

  await db
    .update(schema.ordersRef)
    .set({ invoicePdfPath: pdfPath })
    .where(eq(schema.ordersRef.id, orderId));
}
