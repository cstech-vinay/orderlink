CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_code" text NOT NULL,
	"order_ref_id" uuid NOT NULL,
	"customer_email_hash" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"max_uses" integer,
	"redemptions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"product_slug" text PRIMARY KEY NOT NULL,
	"remaining" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders_ref" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"total_paise" integer NOT NULL,
	"advance_paise" integer NOT NULL,
	"balance_due_paise" integer NOT NULL,
	"product_slug" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"customer_first_initial" text NOT NULL,
	"customer_mobile_last4" text NOT NULL,
	"ship_pincode" text NOT NULL,
	"ship_state" text NOT NULL,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"invoice_pdf_path" text,
	"sf_synced" boolean DEFAULT false NOT NULL,
	"sf_account_id" text,
	"sf_order_id" text,
	"sf_last_sync_at" timestamp with time zone,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"track_key" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_ref_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_ref_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "pending_sf_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_ref_id" uuid NOT NULL,
	"payload_ciphertext" "bytea" NOT NULL,
	"payload_iv" text NOT NULL,
	"payload_tag" text NOT NULL,
	"job_kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sf_account_id" text,
	"sf_order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restock_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_slug" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razorpay_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_razorpay_event_id_unique" UNIQUE("razorpay_event_id")
);
--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_code_coupons_code_fk" FOREIGN KEY ("coupon_code") REFERENCES "public"."coupons"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_ref_id_orders_ref_id_fk" FOREIGN KEY ("order_ref_id") REFERENCES "public"."orders_ref"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_sf_sync" ADD CONSTRAINT "pending_sf_sync_order_ref_id_orders_ref_id_fk" FOREIGN KEY ("order_ref_id") REFERENCES "public"."orders_ref"("id") ON DELETE cascade ON UPDATE no action;