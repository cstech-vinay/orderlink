import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const ordersRef = pgTable("orders_ref", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method").notNull(),
  totalPaise: integer("total_paise").notNull(),
  advancePaise: integer("advance_paise").notNull(),
  balanceDuePaise: integer("balance_due_paise").notNull(),
  productSlug: text("product_slug").notNull(),
  quantity: integer("quantity").notNull().default(1),
  customerFirstInitial: text("customer_first_initial").notNull(),
  customerMobileLast4: text("customer_mobile_last4").notNull(),
  shipPincode: text("ship_pincode").notNull(),
  shipState: text("ship_state").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  invoicePdfPath: text("invoice_pdf_path"),
  sfSynced: boolean("sf_synced").notNull().default(false),
  sfAccountId: text("sf_account_id"),
  sfOrderId: text("sf_order_id"),
  sfLastSyncAt: timestamp("sf_last_sync_at", { withTimezone: true }),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  trackKey: text("track_key").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pendingSfSync = pgTable("pending_sf_sync", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderRefId: uuid("order_ref_id")
    .notNull()
    .references(() => ordersRef.id, { onDelete: "cascade" }),
  payloadCiphertext: bytea("payload_ciphertext").notNull(),
  payloadIv: text("payload_iv").notNull(),
  payloadTag: text("payload_tag").notNull(),
  jobKind: text("job_kind").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  sfAccountId: text("sf_account_id"),
  sfOrderId: text("sf_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventory = pgTable("inventory", {
  productSlug: text("product_slug").primaryKey(),
  remaining: integer("remaining").notNull(),
  reserved: integer("reserved").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  kind: text("kind").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxUses: integer("max_uses"),
  redemptions: integer("redemptions").notNull().default(0),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponCode: text("coupon_code").notNull().references(() => coupons.code),
  orderRefId: uuid("order_ref_id").notNull().references(() => ordersRef.id),
  customerEmailHash: text("customer_email_hash").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  razorpayEventId: text("razorpay_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const restockNotifications = pgTable("restock_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  productSlug: text("product_slug").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});
