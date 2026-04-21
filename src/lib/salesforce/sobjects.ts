import { sfRest, sfUploadContentVersion, sfQuery } from "./client";
import { getSalesforceConfig } from "./config";
import {
  accountExternalId,
  leadExternalId,
  couponRedemptionExternalId,
  restockExternalId,
  emailHash,
} from "./external-ids";

/**
 * Typed sObject writers. Each function maps a storefront-side DTO onto the SF
 * custom-field API names from the integration spec and performs an upsert.
 * Every call is idempotent — retries from the worker with the same arguments
 * produce the same outcome.
 *
 * Record-type IDs come from env (loaded via getSalesforceConfig()). Each
 * record we create on a standard object (Account, Order, Lead) carries the
 * OrderLink record type so SF Flows that filter on record type fire correctly.
 */

// ---------- Account (Person Account with OrderLink_Customer record type) ----------

export type AccountInput = {
  email: string;
  fullName: string;
  mobile: string; // 10-digit without country code — we prepend +91
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export type AccountUpsertResult = {
  id: string; // SF 18-char Id
  created: boolean;
  externalId: string;
};

function splitName(full: string): { first: string; last: string } {
  const cleaned = full.trim();
  if (!cleaned) return { first: "", last: "." };
  const idx = cleaned.indexOf(" ");
  if (idx < 0) return { first: cleaned, last: "." }; // PA requires LastName
  return {
    first: cleaned.slice(0, idx),
    last: cleaned.slice(idx + 1).trim() || ".",
  };
}

export async function upsertAccount(input: AccountInput): Promise<AccountUpsertResult> {
  const config = getSalesforceConfig();
  if (!config) throw new Error("salesforce_not_configured");

  const externalId = accountExternalId(input.email);
  const { first, last } = splitName(input.fullName);
  const street = [input.addressLine1, input.addressLine2].filter(Boolean).join(", ");

  const body = {
    RecordTypeId: config.recordTypeIds.personAccount,
    FirstName: first,
    LastName: last,
    PersonEmail: input.email.trim().toLowerCase(),
    PersonMobilePhone: `+91${input.mobile}`,
    PersonMailingStreet: street,
    OrderLink_Landmark__c: input.landmark ?? null,
    PersonMailingCity: input.city,
    PersonMailingState: input.state,
    PersonMailingPostalCode: input.pincode,
    PersonMailingCountry: "India",
    OrderLink_UTM_Source__c: input.utmSource ?? null,
    OrderLink_UTM_Medium__c: input.utmMedium ?? null,
    OrderLink_UTM_Campaign__c: input.utmCampaign ?? null,
  };

  const result = await sfRest<{ id: string; created: boolean }>({
    method: "PATCH",
    path: `/sobjects/Account/OrderLink_External_Id__c/${encodeURIComponent(externalId)}`,
    body,
  });

  // 204 No Content on pure update — fetch the Id back via query
  if (!result) {
    const rows = await sfQuery<{ Id: string }>(
      `SELECT Id FROM Account WHERE OrderLink_External_Id__c = '${externalId}' LIMIT 1`
    );
    if (rows.length === 0) throw new Error("account_upsert_succeeded_but_id_not_found");
    return { id: rows[0].Id, created: false, externalId };
  }
  return { id: result.id, created: result.created, externalId };
}

// ---------- Order (record type: OrderLink_Order) ----------

export type OrderInput = {
  orderNumber: string;
  invoiceNumber: string;
  accountId: string; // SF Account Id from upsertAccount
  statusSlug: string; // our OrderLink_Status__c enum: paid, advance_paid, etc.
  paymentMethod: "prepaid" | "pay_on_delivery";
  totalPaise: number;
  advancePaisePaid: number;
  balanceDuePaise: number;
  shippingPaise: number;
  productSlug: string;
  productTitle: string;
  shipPincode: string;
  shipState: string;
  trackKey: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  couponCode?: string | null;
  couponDiscountPaise?: number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

export type OrderUpsertResult = {
  id: string;
  created: boolean;
};

export async function upsertOrder(input: OrderInput): Promise<OrderUpsertResult> {
  const config = getSalesforceConfig();
  if (!config) throw new Error("salesforce_not_configured");

  const body = {
    AccountId: input.accountId,
    RecordTypeId: config.recordTypeIds.order,
    EffectiveDate: new Date().toISOString().slice(0, 10),
    // SF's standard Status picklist is immutable once Activated. We don't use it
    // for lifecycle (OrderLink_Status__c does that). Always stay Draft so the
    // record remains editable for admin backsyncs and retries.
    Status: "Draft",
    // NOTE: OrderLink_Order_Number__c is intentionally omitted — SF rejects
    // an upsert body that repeats the External Id it's keyed on in the URL.
    OrderLink_Invoice_Number__c: input.invoiceNumber,
    OrderLink_Status__c: input.statusSlug,
    OrderLink_Payment_Method__c: input.paymentMethod,
    OrderLink_Total_Paise__c: input.totalPaise,
    OrderLink_Advance_Paid_Paise__c: input.advancePaisePaid,
    OrderLink_Balance_Due_Paise__c: input.balanceDuePaise,
    OrderLink_Shipping_Paise__c: input.shippingPaise,
    OrderLink_Razorpay_Order_Id__c: input.razorpayOrderId ?? null,
    OrderLink_Razorpay_Payment_Id__c: input.razorpayPaymentId ?? null,
    OrderLink_Ship_Pincode__c: input.shipPincode,
    OrderLink_Ship_State__c: input.shipState,
    OrderLink_Track_Key__c: input.trackKey,
    OrderLink_Product_Slug__c: input.productSlug,
    OrderLink_Product_Title__c: input.productTitle,
    OrderLink_Quantity__c: 1,
    OrderLink_Coupon_Code__c: input.couponCode ?? null,
    OrderLink_Coupon_Discount_Paise__c: input.couponDiscountPaise ?? null,
    OrderLink_UTM_Source__c: input.utmSource ?? null,
    OrderLink_UTM_Medium__c: input.utmMedium ?? null,
    OrderLink_UTM_Campaign__c: input.utmCampaign ?? null,
  };

  const result = await sfRest<{ id: string; created: boolean }>({
    method: "PATCH",
    path: `/sobjects/Order/OrderLink_Order_Number__c/${encodeURIComponent(input.orderNumber)}`,
    body,
  });

  if (!result) {
    const rows = await sfQuery<{ Id: string }>(
      `SELECT Id FROM Order WHERE OrderLink_Order_Number__c = '${input.orderNumber}' LIMIT 1`
    );
    if (rows.length === 0) throw new Error("order_upsert_succeeded_but_id_not_found");
    return { id: rows[0].Id, created: false };
  }
  return { id: result.id, created: result.created };
}

/** Update only the status + timestamps (used by T31 admin back-sync). */
export async function updateOrderStatus(args: {
  orderNumber: string;
  newStatusSlug: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  meeshoTrackingId?: string;
  meeshoTrackingUrl?: string;
}): Promise<void> {
  const patch: Record<string, unknown> = {
    OrderLink_Status__c: args.newStatusSlug,
  };
  if (args.shippedAt) patch.OrderLink_Shipped_At__c = args.shippedAt.toISOString();
  if (args.deliveredAt) patch.OrderLink_Delivered_At__c = args.deliveredAt.toISOString();
  if (args.cancelledAt) patch.OrderLink_Cancelled_At__c = args.cancelledAt.toISOString();
  if (args.meeshoTrackingId) patch.OrderLink_Meesho_Tracking_Id__c = args.meeshoTrackingId;
  if (args.meeshoTrackingUrl) patch.OrderLink_Meesho_Tracking_URL__c = args.meeshoTrackingUrl;

  await sfRest({
    method: "PATCH",
    path: `/sobjects/Order/OrderLink_Order_Number__c/${encodeURIComponent(args.orderNumber)}`,
    body: patch,
  });
}

// ---------- Lead (record type: OrderLink_Abandoned_Cart) ----------

export type LeadInput = {
  orderRefUuid: string;
  fullName: string;
  email: string;
  mobile: string;
  city?: string;
  state?: string;
  pincode?: string;
  intendedOrderNumber: string;
  productSlug: string;
  productTitle: string;
  abandonedAt: Date;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export async function upsertLead(input: LeadInput): Promise<{ id: string; created: boolean }> {
  const config = getSalesforceConfig();
  if (!config) throw new Error("salesforce_not_configured");

  const externalId = leadExternalId(input.orderRefUuid);
  const { first, last } = splitName(input.fullName);

  const body = {
    RecordTypeId: config.recordTypeIds.lead,
    FirstName: first,
    LastName: last,
    Email: input.email.trim().toLowerCase(),
    MobilePhone: `+91${input.mobile}`,
    City: input.city ?? null,
    State: input.state ?? null,
    PostalCode: input.pincode ?? null,
    Country: "India",
    Company: "Retail Consumer",
    LeadSource: "OrderLink Abandoned Cart",
    OrderLink_Order_Number__c: input.intendedOrderNumber,
    OrderLink_Product_Slug__c: input.productSlug,
    OrderLink_Product_Title__c: input.productTitle,
    OrderLink_Abandoned_At__c: input.abandonedAt.toISOString(),
    OrderLink_UTM_Source__c: input.utmSource ?? null,
    OrderLink_UTM_Medium__c: input.utmMedium ?? null,
    OrderLink_UTM_Campaign__c: input.utmCampaign ?? null,
  };

  const result = await sfRest<{ id: string; created: boolean }>({
    method: "PATCH",
    path: `/sobjects/Lead/OrderLink_External_Id__c/${encodeURIComponent(externalId)}`,
    body,
  });

  if (!result) {
    const rows = await sfQuery<{ Id: string }>(
      `SELECT Id FROM Lead WHERE OrderLink_External_Id__c = '${externalId}' LIMIT 1`
    );
    if (rows.length === 0) throw new Error("lead_upsert_succeeded_but_id_not_found");
    return { id: rows[0].Id, created: false };
  }
  return { id: result.id, created: result.created };
}

// ---------- ContentVersion (invoice PDF) ----------

export type InvoiceUploadInput = {
  orderSfId: string; // SF Order Id (gets set as FirstPublishLocationId)
  invoiceNumber: string;
  pdfBytes: Buffer;
};

export type InvoiceUploadResult = {
  contentVersionId: string;
  contentDocumentId: string;
};

export async function uploadInvoicePdf(input: InvoiceUploadInput): Promise<InvoiceUploadResult> {
  const uploaded = await sfUploadContentVersion({
    metadata: {
      Title: input.invoiceNumber,
      PathOnClient: `${input.invoiceNumber}.pdf`,
      FirstPublishLocationId: input.orderSfId,
    },
    filename: `${input.invoiceNumber}.pdf`,
    bytes: input.pdfBytes,
  });

  // Resolve the ContentDocumentId we'll store as sf:<id> in orders_ref
  const rows = await sfQuery<{ ContentDocumentId: string }>(
    `SELECT ContentDocumentId FROM ContentVersion WHERE Id = '${uploaded.id}' LIMIT 1`
  );
  if (rows.length === 0) throw new Error("content_version_created_but_document_id_missing");

  return {
    contentVersionId: uploaded.id,
    contentDocumentId: rows[0].ContentDocumentId,
  };
}

// ---------- CouponRedemption (custom object, master-detail to Coupon) ----------

export type CouponRedemptionInput = {
  orderRefUuid: string;
  orderSfId: string;
  couponCode: string; // will be matched to OrderLink_Coupon__c by Name
  email: string;
  amountAppliedPaise: number;
};

export async function upsertCouponRedemption(
  input: CouponRedemptionInput
): Promise<{ id: string; created: boolean }> {
  const externalId = couponRedemptionExternalId(input.orderRefUuid);

  // Use external ID reference syntax so SF resolves the master Coupon by Name
  // without requiring us to query for its Id first.
  const body = {
    Coupon__r: { Name: input.couponCode },
    Order__c: input.orderSfId,
    Customer_Email_Hash__c: emailHash(input.email),
    Amount_Applied_Paise__c: input.amountAppliedPaise,
    Redeemed_At__c: new Date().toISOString(),
  };

  const result = await sfRest<{ id: string; created: boolean }>({
    method: "PATCH",
    path: `/sobjects/OrderLink_Coupon_Redemption__c/OrderLink_External_Id__c/${encodeURIComponent(externalId)}`,
    body,
  });

  if (!result) {
    const rows = await sfQuery<{ Id: string }>(
      `SELECT Id FROM OrderLink_Coupon_Redemption__c WHERE OrderLink_External_Id__c = '${externalId}' LIMIT 1`
    );
    if (rows.length === 0) throw new Error("coupon_redemption_upsert_id_not_found");
    return { id: rows[0].Id, created: false };
  }
  return { id: result.id, created: result.created };
}

// ---------- RestockWaitlist (custom object) ----------

export type RestockSignupInput = {
  productSlug: string;
  productTitle: string;
  email: string;
};

export async function upsertRestockSignup(
  input: RestockSignupInput
): Promise<{ id: string; created: boolean }> {
  const externalId = restockExternalId(input.productSlug, input.email);

  const body = {
    Product_Slug__c: input.productSlug,
    Product_Title__c: input.productTitle,
    Email__c: input.email.trim().toLowerCase(),
    Signed_Up_At__c: new Date().toISOString(),
  };

  const result = await sfRest<{ id: string; created: boolean }>({
    method: "PATCH",
    path: `/sobjects/OrderLink_Restock_Waitlist__c/OrderLink_External_Id__c/${encodeURIComponent(externalId)}`,
    body,
  });

  if (!result) {
    const rows = await sfQuery<{ Id: string }>(
      `SELECT Id FROM OrderLink_Restock_Waitlist__c WHERE OrderLink_External_Id__c = '${externalId}' LIMIT 1`
    );
    if (rows.length === 0) throw new Error("restock_upsert_id_not_found");
    return { id: rows[0].Id, created: false };
  }
  return { id: result.id, created: result.created };
}
