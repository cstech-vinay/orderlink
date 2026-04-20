import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { decryptJSON } from "@/lib/crypto";
import { getProductBySlug, SHIPPING_PAISE } from "@/data/products";
import { renderInvoiceBuffer } from "@/lib/invoice-pdf";
import { isSalesforceEnabled } from "./config";
import {
  upsertAccount,
  upsertOrder,
  upsertLead,
  uploadInvoicePdf,
  upsertCouponRedemption,
  upsertRestockSignup,
  type AccountInput,
  type OrderInput,
  type LeadInput,
} from "./sobjects";

/**
 * Dispatcher called by the T30 worker for each pending_sf_sync row. Returns
 * structured success/failure info so the worker can decide to mark synced vs
 * back off. Throws on fatal errors (misconfigured, missing data); the worker
 * catches and marks the row for retry.
 */

export type SyncOutcome =
  | { ok: true; jobKind: string; sfAccountId?: string; sfOrderId?: string; sfDocumentId?: string }
  | { ok: false; jobKind: string; error: string; retryable: boolean };

type CheckoutPayload = {
  fullName: string;
  email: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  couponCode?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  orderNumber: string;
  invoiceNumber: string;
};

function decryptPayload(
  row: typeof schema.pendingSfSync.$inferSelect
): CheckoutPayload | null {
  try {
    return decryptJSON<CheckoutPayload>({
      ciphertext: Buffer.from(row.payloadCiphertext as unknown as Buffer),
      iv: row.payloadIv,
      tag: row.payloadTag,
    });
  } catch {
    return null;
  }
}

export async function syncPendingRow(
  row: typeof schema.pendingSfSync.$inferSelect
): Promise<SyncOutcome> {
  if (!isSalesforceEnabled()) {
    return { ok: false, jobKind: row.jobKind, error: "sync_disabled", retryable: false };
  }

  switch (row.jobKind) {
    case "full_sync":
      return syncFullOrder(row);
    case "lead_sync":
      return syncAbandonedLead(row);
    case "coupon_redemption_sync":
      return syncCouponRedemptionStandalone(row);
    case "restock_signup_sync":
      return syncRestockSignup(row);
    default:
      return {
        ok: false,
        jobKind: row.jobKind,
        error: `unknown_job_kind:${row.jobKind}`,
        retryable: false,
      };
  }
}

// ============ full_sync: paid order → Person Account + Order + Invoice PDF + optional Redemption ============

async function syncFullOrder(
  row: typeof schema.pendingSfSync.$inferSelect
): Promise<SyncOutcome> {
  if (!row.orderRefId) {
    return {
      ok: false,
      jobKind: "full_sync",
      error: "full_sync_row_without_orderRefId",
      retryable: false,
    };
  }
  const orderRefId = row.orderRefId;
  const payload = decryptPayload(row);
  if (!payload) {
    return { ok: false, jobKind: "full_sync", error: "decrypt_failed", retryable: false };
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, orderRefId))
    .limit(1);
  if (!order) {
    return { ok: false, jobKind: "full_sync", error: "order_ref_missing", retryable: false };
  }

  const product = getProductBySlug(order.productSlug);
  if (!product) {
    return { ok: false, jobKind: "full_sync", error: "product_missing", retryable: false };
  }

  // 1. Upsert the Person Account
  const accountInput: AccountInput = {
    email: payload.email,
    fullName: payload.fullName,
    mobile: payload.mobile,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    landmark: payload.landmark,
    pincode: payload.pincode,
    city: payload.city,
    state: payload.state,
    utmSource: payload.utm_source,
    utmMedium: payload.utm_medium,
    utmCampaign: payload.utm_campaign,
  };
  const account = await upsertAccount(accountInput);

  // 2. Upsert the Order
  const orderInput: OrderInput = {
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    accountId: account.id,
    statusSlug: order.status,
    paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
    totalPaise: order.totalPaise,
    advancePaisePaid: order.advancePaise,
    balanceDuePaise: order.balanceDuePaise,
    shippingPaise: SHIPPING_PAISE,
    productSlug: order.productSlug,
    productTitle: product.title,
    shipPincode: order.shipPincode,
    shipState: order.shipState,
    trackKey: order.trackKey,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    couponCode: payload.couponCode ?? null,
    utmSource: order.utmSource,
    utmMedium: order.utmMedium,
    utmCampaign: order.utmCampaign,
  };
  const sfOrder = await upsertOrder(orderInput);

  // 3. Upload invoice PDF — fall back to local-disk copy if it exists, regenerate otherwise
  let pdfBytes: Buffer;
  const localPath = order.invoicePdfPath;
  if (localPath && !localPath.startsWith("sf:")) {
    try {
      pdfBytes = await readFile(localPath);
    } catch {
      pdfBytes = await regenerateInvoice(order, payload, product);
    }
  } else {
    pdfBytes = await regenerateInvoice(order, payload, product);
  }

  const uploaded = await uploadInvoicePdf({
    orderSfId: sfOrder.id,
    invoiceNumber: order.invoiceNumber,
    pdfBytes,
  });

  // 4. If coupon was used, upsert redemption
  if (payload.couponCode) {
    await upsertCouponRedemption({
      orderRefUuid: order.id,
      orderSfId: sfOrder.id,
      couponCode: payload.couponCode,
      email: payload.email,
      amountAppliedPaise: estimateCouponDiscount(order),
    });
  }

  // 5. Stamp orders_ref with SF identifiers + switch invoicePdfPath to sf:…
  await db
    .update(schema.ordersRef)
    .set({
      sfSynced: true,
      sfAccountId: account.id,
      sfOrderId: sfOrder.id,
      sfLastSyncAt: new Date(),
      invoicePdfPath: `sf:${uploaded.contentDocumentId}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.ordersRef.id, order.id));

  return {
    ok: true,
    jobKind: "full_sync",
    sfAccountId: account.id,
    sfOrderId: sfOrder.id,
    sfDocumentId: uploaded.contentDocumentId,
  };
}

async function regenerateInvoice(
  order: typeof schema.ordersRef.$inferSelect,
  payload: CheckoutPayload,
  product: NonNullable<ReturnType<typeof getProductBySlug>>
): Promise<Buffer> {
  const address = [
    payload.addressLine1,
    payload.addressLine2,
    payload.landmark,
    payload.city,
    payload.state,
    payload.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  return renderInvoiceBuffer({
    invoiceNumber: order.invoiceNumber,
    invoiceDate: order.createdAt,
    orderNumber: order.orderNumber,
    customer: {
      name: payload.fullName,
      email: payload.email,
      mobile: `+91${payload.mobile}`,
      address,
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
}

function estimateCouponDiscount(order: typeof schema.ordersRef.$inferSelect): number {
  // Couponed orders decrease totalPaise by (product + shipping) − total. The
  // raw couponDiscountPaise isn't stored on orders_ref (by design — keep PG
  // narrow). Derive it from the saved amounts: subtotal − total = discount.
  // Caveat: prepaid orders also get the inherent 5% prepaid discount baked in.
  // For Phase 2a that's fine — marketing's interest is "did the coupon apply,"
  // not the precise ₹ amount. If finance needs exact, read from
  // pending_sf_sync payload.couponDiscountPaise (not yet stored — future work).
  return 0; // zero means "coupon used but amount unknown"; SF-side reporting
  // can query OrderLink_Coupon__c.Amount_Paise__c for the list value
}

// ============ lead_sync: abandoned cart → SF Lead ============

async function syncAbandonedLead(
  row: typeof schema.pendingSfSync.$inferSelect
): Promise<SyncOutcome> {
  if (!row.orderRefId) {
    return {
      ok: false,
      jobKind: "lead_sync",
      error: "lead_sync_row_without_orderRefId",
      retryable: false,
    };
  }
  const orderRefId = row.orderRefId;
  const payload = decryptPayload(row);
  if (!payload) {
    return { ok: false, jobKind: "lead_sync", error: "decrypt_failed", retryable: false };
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, orderRefId))
    .limit(1);
  if (!order) {
    return { ok: false, jobKind: "lead_sync", error: "order_ref_missing", retryable: false };
  }

  const product = getProductBySlug(order.productSlug);

  const leadInput: LeadInput = {
    orderRefUuid: order.id,
    fullName: payload.fullName,
    email: payload.email,
    mobile: payload.mobile,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    intendedOrderNumber: order.orderNumber,
    productSlug: order.productSlug,
    productTitle: product?.title ?? order.productSlug,
    abandonedAt: order.updatedAt,
    utmSource: payload.utm_source,
    utmMedium: payload.utm_medium,
    utmCampaign: payload.utm_campaign,
  };

  const lead = await upsertLead(leadInput);

  await db
    .update(schema.ordersRef)
    .set({
      sfSynced: true,
      sfAccountId: null, // Lead, not Account
      sfOrderId: lead.id, // reuse this col to store Lead id
      sfLastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.ordersRef.id, order.id));

  return { ok: true, jobKind: "lead_sync", sfOrderId: lead.id };
}

// ============ coupon_redemption_sync: standalone retry path ============

type CouponRedemptionPayload = {
  orderRefUuid: string;
  sfOrderId: string;
  couponCode: string;
  email: string;
  amountAppliedPaise: number;
};

async function syncCouponRedemptionStandalone(
  row: typeof schema.pendingSfSync.$inferSelect
): Promise<SyncOutcome> {
  try {
    const payload = decryptJSON<CouponRedemptionPayload>({
      ciphertext: Buffer.from(row.payloadCiphertext as unknown as Buffer),
      iv: row.payloadIv,
      tag: row.payloadTag,
    });

    await upsertCouponRedemption({
      orderRefUuid: payload.orderRefUuid,
      orderSfId: payload.sfOrderId,
      couponCode: payload.couponCode,
      email: payload.email,
      amountAppliedPaise: payload.amountAppliedPaise,
    });

    return { ok: true, jobKind: "coupon_redemption_sync" };
  } catch (err) {
    return {
      ok: false,
      jobKind: "coupon_redemption_sync",
      error: err instanceof Error ? err.message : "unknown",
      retryable: true,
    };
  }
}

// ============ restock_signup_sync: restock waitlist signup → SF ============

type RestockSignupPayload = {
  productSlug: string;
  productTitle: string;
  email: string;
};

async function syncRestockSignup(
  row: typeof schema.pendingSfSync.$inferSelect
): Promise<SyncOutcome> {
  try {
    const payload = decryptJSON<RestockSignupPayload>({
      ciphertext: Buffer.from(row.payloadCiphertext as unknown as Buffer),
      iv: row.payloadIv,
      tag: row.payloadTag,
    });

    await upsertRestockSignup(payload);

    // Drop the PG mirror row (SF is canonical for the waitlist).
    // Identify the mirror row via (productSlug, email) since restock_notifications
    // has no FK to pending_sf_sync.
    await db
      .delete(schema.restockNotifications)
      .where(
        eq(schema.restockNotifications.email, payload.email.trim().toLowerCase())
      );

    return { ok: true, jobKind: "restock_signup_sync" };
  } catch (err) {
    return {
      ok: false,
      jobKind: "restock_signup_sync",
      error: err instanceof Error ? err.message : "unknown",
      retryable: true,
    };
  }
}
