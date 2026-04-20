# OrderLink ↔ Salesforce Integration Spec

**Audience:** a Claude instance (or engineer) building the Salesforce side of this integration in a separate repo/org.

**Status:** Storefront side is built through Milestone 6 (checkout + payment + post-payment UX). The Salesforce side is greenfield — nothing exists yet.

**Goal of this document:** give you everything you need to build the Salesforce org, Flows, and Apex (if any) so that the storefront's Phase 2b sync code (T27–T31 on our side) can talk to it. You should be able to work independently — if anything in this doc isn't enough, surface the gap and the storefront team will fill it.

---

## 1. Who we are and what we're building

**OrderLink** (orderlink.in) is a direct-to-consumer curated lifestyle e-commerce site operated by **CodeSierra Tech Private Limited** (a Pune-based Indian company, CIN `U62013PN2025PTC241138`, GSTIN `27AAMCC6643G1ZF`). We sell a small hand-picked catalog — kitchen, beauty, electronics, fashion, footwear. Launch catalog is 25 SKUs; only the Oil Dispenser is "live" at initial cutover, the rest show as coming-soon.

- **Storefront stack:** Next.js 15 (App Router) + Postgres 16 (Drizzle ORM) + Razorpay + MSG91 WhatsApp OTP (flag-gated, off at launch) + Sentry. Deployed as a Docker container on a Hetzner VPS behind Traefik.
- **Payments:** Razorpay (Indian payments aggregator) for prepaid + POD advance. Test keys are `rzp_test_...`.
- **Logistics:** Meesho Logistics for shipping. Meesho sends its own SMS tracking to customers.

**Salesforce's job in this architecture:** be the **system of record for every piece of business data** — customer profiles, orders, invoices, coupons, coupon redemptions, restock waitlist signups, abandoned-cart leads, attribution, and all outbound customer-facing email. The storefront keeps only **narrow operational state** in Postgres: inventory reservation counters, Razorpay webhook idempotency receipts, OTP session tokens, and a short-lived (90-day) transient `orders_ref` pointer table for fast payment reconciliation during the live webhook window. After 90 days SF is the only copy.

See §2.6 (record-type scoping) for the hard rule that every automation must be OrderLink-only, and §2.7 (hybrid architecture rationale) for why the storefront keeps Postgres at all rather than hitting SF during checkout.

---

## 2. Architectural decisions already made — don't change these without coordinating

These are explicit choices by the OrderLink founder. Your job is to implement against these, not revisit them.

### 2.1 All customer + admin email originates from Salesforce Flow

- The Node backend sends **zero transactional email**. Resend was uninstalled from the project on 2026-04-20.
- Salesforce Flows trigger emails when Order record status changes. This keeps customer comms in one system of record (SF) with built-in deliverability + audit.
- Risk accepted: if SF has an outage, no customer email goes out during that window. The storefront still shows the `/orders/[id]/thanks` page immediately after payment as a fallback confirmation channel.

### 2.2 Invoice PDF is generated in Node, stored in Salesforce Files

We call this "Option C hybrid":
- Node renders the GST-compliant invoice via React-PDF (already built, produces a ~15 KB A4 PDF per order)
- Node uploads the bytes to Salesforce as a `ContentVersion`, linked to the Order record via `ContentDocumentLink`
- Salesforce is the authoritative store (7-year CGST retention handled by SF's existing backup + archival)
- Storefront DB keeps a local disk copy as a fallback cache only. The `orders_ref.invoicePdfPath` column stores either a local filesystem path (pre-upload) or a `sf:069XXXXXXX` pointer (post-upload)

### 2.3 Abandoned carts become Salesforce Leads

- When a customer reaches payment but doesn't complete it, the storefront's reaper (already shipped, T22) marks the order `abandoned` after 15 minutes
- **Before** releasing inventory, it flips the queued sync job from `full_sync` to `lead_sync`. The encrypted PII payload is already there.
- The Salesforce worker (T30, storefront side) will then create a **Lead** instead of a Person Account+Order for these rows — high-intent prospects for retargeting
- Lead source / campaign conventions (below) let Marketing Flows pick them up for abandoned-cart emails

### 2.4 JWT Bearer OAuth for machine auth

- Connected App with certificate-based signature
- No username/password, no refresh token loop
- Storefront holds the private key (file on VPS); SF has the public cert

### 2.5 Storefront never writes through a public Salesforce API

All traffic from the storefront is **outbound**: `Node → Salesforce` only. Salesforce never POSTs back to the storefront. Status updates done by admins in SF will eventually flow back via a separate back-sync (T31), but that too is a Node-initiated poll. No inbound Salesforce → storefront webhook.

### 2.6 Record-Type scoping — every automation is OrderLink-only

**This is a hard rule.** The Salesforce org may eventually host data for other brands or projects. Nothing built for OrderLink should ever touch a record that isn't OrderLink-flagged.

**How we enforce this:**

1. **Every standard-object record OrderLink writes must carry an OrderLink record type:**
   - `Account` records → `OrderLink_Customer` record type
   - `Order` records → `OrderLink_Order` record type
   - `Lead` records → `OrderLink_Abandoned_Cart` record type
   - `Product2` records (if seeded) → `OrderLink_Product` record type

2. **Every Flow trigger condition must include a record type filter.** For example, the order confirmation Flow in §7.1 fires only when `$Record.RecordType.DeveloperName = 'OrderLink_Order'`. Without that filter, an unrelated Order in the same org would trigger an OrderLink-branded email. Treat this as a spec violation if any Flow is missing the filter.

3. **Custom objects** (`OrderLink_Coupon__c`, `OrderLink_Coupon_Redemption__c`, `OrderLink_Restock_Waitlist__c`) don't need record types — they are OrderLink-only by name. But their Flows shouldn't depend on fields from other unrelated objects.

4. **Integration user profile restriction**: the profile should grant CRUD only on the four OrderLink record types (not "All" on Account/Order/Lead/Product2). This is belt-and-suspenders: even if a Flow forgot a filter, the API call would fail auth before doing damage.

5. **Queries from the storefront side** also filter by record type. For example, when the back-sync worker (T31) reads recent SF Orders to detect status changes, the SOQL is `WHERE RecordType.DeveloperName = 'OrderLink_Order'`.

**Test for this**: at smoke-test time (§9), create a non-OrderLink Account/Order/Lead manually in SF and confirm **none** of the OrderLink Flows fire against it. Ship this verification in your handoff doc.

### 2.7 Hybrid architecture: SF canonical, Postgres narrow-operational

**Decision date:** 2026-04-20. Documented as ADR-001 in the storefront repo.

**What lives where:**

| Domain | System of record | Postgres role |
|---|---|---|
| Customer profile (name, email, mobile, address, UTM history, lifetime metrics) | Salesforce Person Account | None — never stored in PG plaintext except transiently during checkout |
| Order record (amounts, status, Razorpay ids, line items) | Salesforce Order | Thin pointer row in `orders_ref` for 90 days to reconcile incoming Razorpay webhooks → SF Order Id. Deleted by retention job thereafter. |
| Invoice PDF | Salesforce Files (ContentVersion) | Local disk fallback during the post-verify sync window only |
| Coupon catalog (codes, amounts, expiry) | Salesforce Coupon (`OrderLink_Coupon__c`) — **marketing team manages here** | 10-minute read-through cache in PG `coupons` table for hot-path `/api/coupons/validate` performance |
| Coupon redemption log | Salesforce (`OrderLink_Coupon_Redemption__c`) linked to Order | PG mirror row for one-per-email enforcement at checkout latency; nightly reconciliation |
| Restock waitlist | Salesforce (`OrderLink_Restock_Waitlist__c`) — **marketing runs campaigns from here** | PG mirror for dedup; deleted on sync |
| Abandoned cart (filled checkout, didn't pay) | Salesforce Lead (`OrderLink_Abandoned_Cart` RT) | `pending_sf_sync` row with `job_kind=lead_sync` until drained |
| Inventory counts + reservations | **Postgres only** (Salesforce is not designed for high-concurrency row-level locking) | `inventory` table, conditional atomic UPDATE |
| Razorpay webhook idempotency | Postgres only | `webhook_events` with UNIQUE on `razorpay_event_id` |
| OTP session tokens + rate limits | Postgres + in-memory | ephemeral |

**Why not pure-Salesforce:**

- **Latency**: ~500ms per SF API call from the Indian VPS; checkout needs ~6 calls → 3s of blocking time before Razorpay modal. Postgres: 20ms total. Losing ~20% mobile conversion is not negotiable.
- **Governor limits**: SF enforces 100 SOQL per Apex transaction, 150 DML statements, 15k API calls/day on Developer Edition. OrderLink at 500 orders/day + retries = ~10k/day of orders alone. No headroom for flash sales.
- **Inventory concurrency**: SF has no row-level locking equivalent. Two parallel "buy last unit" attempts in Apex both succeed → oversell. Postgres does this in one statement.
- **Uptime coupling**: SF ~99.95% SLA = ~4.3h/yr outage. Pure-SF means the store is closed during those hours. Hybrid means orders still accept, queue backs up, drains on recovery.

**Why not pure-Postgres:**

- Founder wants marketing/ops to live in SF so the CS team can query orders by customer, segment for campaigns, and send emails without touching the storefront repo.
- SF's 7-year backup/archive handles CGST retention "for free."
- SF Email Flows give deliverability + audit that would otherwise need SendGrid/Resend plumbing.

**Retention policy (storefront side):**

- `pending_sf_sync` rows: deleted by T30 worker on successful drain (never >1 week old in practice).
- `orders_ref` rows: deleted 90 days after `sf_synced = true`. Short enough to stay lean; long enough to cover Razorpay's 180-day refund window via a fresh SF-direct query if needed.
- `webhook_events`: 30-day retention (drops reconciliation window past that).
- `coupon_redemptions` mirror: deleted when the SF Coupon Redemption record is confirmed synced (nightly).
- `restock_notifications` mirror: deleted on successful SF sync.
- Storefront NEVER stores customer full name, email, mobile, or address after SF sync completes. The only exception is `pending_sf_sync`'s encrypted payload, which exists precisely to get PII to SF and is deleted on successful drain.

---

## 3. What Salesforce needs from you — deliverables checklist

Treat this as your Definition of Done:

- [ ] SF org provisioned (Developer Edition is fine for build; production sandbox for UAT)
- [ ] Person Account enabled on the org
- [ ] **Standard object record types** created:
  - `OrderLink_Customer` on Account (Person Account-type)
  - `OrderLink_Order` on Order
  - `OrderLink_Product` on Product2 (optional — 25 catalog entries)
  - `OrderLink_Abandoned_Cart` on Lead
- [ ] **Custom objects** created — these are the domains that fully move to SF in the hybrid architecture (§2.7):
  - `OrderLink_Coupon__c` — coupon catalog (marketing team CRUD via SF UI)
  - `OrderLink_Coupon_Redemption__c` — redemption log, one per order that used a coupon
  - `OrderLink_Restock_Waitlist__c` — back-in-stock email signups for sold-out products
- [ ] All custom fields created on every object (see §5), with correct types + lengths
- [ ] Connected App with JWT Bearer flow, scopes: `api refresh_token offline_access`, certificate uploaded
- [ ] Integration User license allocated, profile scoped to all Record Types + custom objects above + ContentVersion CRUD + Lead CRUD
- [ ] Organization-Wide Email Address `hello@orderlink.in` verified (SPF + DKIM DNS records given to CodeSierra to add to orderlink.in DNS)
- [ ] **Eight Flows** built + activated (see §7) — the original five order/lead Flows plus three new Marketing Flows for coupons, restock, and back-in-stock campaigns
- [ ] Email templates for all Flows, using the merge fields listed in §7
- [ ] **Seed data loaded**: two initial coupons `WELCOME10` (₹10 off first order) and `STAY5` (₹5 off exit-intent), so the storefront's coupon cache refresh has something to read from day one
- [ ] **Expose active coupons** — see §6.5: either a public Flow-backed REST endpoint OR the integration user can query `OrderLink_Coupon__c WHERE IsActive__c = true` via the standard REST API
- [ ] **Record-type scoping verified** (see §2.6): every Flow filters on the OrderLink record type in its trigger condition, integration user profile restricts CRUD to OrderLink record types only. Smoke-tested by creating a non-OrderLink Account/Order/Lead manually and confirming no OrderLink Flow fired.
- [ ] End-to-end smoke test executed using the dummy payloads in §8
- [ ] A `handoff.md` written for the storefront team containing:
  - Connected App consumer key
  - Integration user username
  - **Four** Record Type IDs (Account, Order, Lead, Product)
  - **Three** custom object API names (if they differ from this spec's defaults)
  - Any custom field API names that differ from this spec's defaults
  - The verified Org-Wide Email ID
  - The coupon-list REST endpoint URL (§6.5)
  - Any gotchas you hit during setup

---

## 4. Org-level setup

### 4.1 Enable Person Accounts

Setup → Company Settings → Person Accounts → Enable. This is irreversible; do it on a dev org first if you're unsure. Rationale: OrderLink customers are individuals, not businesses. Standard Account + Contact would be wrong.

### 4.2 Developer Edition vs production

For Phase 2b build: Developer Edition is enough. It includes Person Accounts + Flow + Files. Storefront can point at either via `SF_LOGIN_URL` env var.

For production cutover: either a sandbox of the eventual prod org (recommended) or a fresh prod org. Keep them separate — the prod Connected App will have a different consumer key.

### 4.3 Integration user

- License: Salesforce (not Community, not Chatter Only)
- Profile: clone "Standard User", rename to "OrderLink Integration"
- Restrict to:
  - CRUD on Account (Person Account record type only), Contact, Order, Product2, Lead (OrderLink record types only)
  - Read/Create on ContentVersion, ContentDocument, ContentDocumentLink
  - Read on OrderItem if we ever use it (Phase 2a is single-line-item so we don't for now)
  - IP restrictions: relax to allow VPS IP — easier to start without restriction, tighten later
- Multi-factor auth: **disabled** for this user. JWT flow is its own security layer.
- Email for this user: `integration@codesierra.tech.orderlink` (just for SF's internal notifications; nobody reads it)

### 4.4 Organization-wide email address

- From name: `OrderLink`
- Email: `hello@orderlink.in`
- Verification: send to that inbox, click the link
- SPF + DKIM: SF will provide DNS records. Send those to the storefront team to add to the `orderlink.in` zone at the registrar. Without DKIM, Gmail will flag OrderLink emails as spam.

---

## 5. Data model — every field the storefront will write

Use API names exactly as listed unless you tell us otherwise in your handoff doc. Storefront code (T28) hardcodes these names.

### 5.1 Account (record type: `OrderLink_Customer`, Person Account)

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| First Name | `FirstName` | standard | — | from checkout `fullName` (everything before first space) |
| Last Name | `LastName` | standard (required on PA) | — | remainder of `fullName`, or `.` if single-word |
| Email | `PersonEmail` | standard | — | customer email, lowercased |
| Mobile | `PersonMobilePhone` | standard | — | `+91XXXXXXXXXX` format |
| Mailing Street | `PersonMailingStreet` | standard | — | `addressLine1` + ", " + `addressLine2` if present |
| Mailing Landmark | `OrderLink_Landmark__c` | Text(80) | 80 | custom; may be empty |
| Mailing City | `PersonMailingCity` | standard | — | |
| Mailing State | `PersonMailingState` | standard | — | `Maharashtra`, `Karnataka`, etc. (Indian state names, not codes) |
| Mailing Postal Code | `PersonMailingPostalCode` | standard | — | 6-digit Indian pincode |
| Mailing Country | `PersonMailingCountry` | standard | — | always `India` |
| UTM Source | `OrderLink_UTM_Source__c` | Text(80) | 80 | optional |
| UTM Medium | `OrderLink_UTM_Medium__c` | Text(80) | 80 | optional |
| UTM Campaign | `OrderLink_UTM_Campaign__c` | Text(80) | 80 | optional |
| Customer External Id | `OrderLink_External_Id__c` | Text(40), Unique, External ID | 40 | **primary upsert key**: `orderlink:{sha256(lowercased email)}` — 40 hex chars of the hash, prefixed. See §8 for derivation. |
| First Order Date | `OrderLink_First_Order_At__c` | DateTime | — | Set on first successful order only (SF Flow maintains this on Order after-insert) |
| Lifetime Order Count | `OrderLink_Lifetime_Orders__c` | Number(6,0) | — | Roll-up summary, OR maintained by Flow |
| Lifetime Revenue (Paise) | `OrderLink_Lifetime_Revenue_Paise__c` | Number(12,0) | — | Storefront sends paise (1/100 of rupee). SF can have a formula field that shows it in rupees if desired for admin UX. |

**Upsert strategy**: storefront uses `PATCH /services/data/v63.0/sobjects/Account/OrderLink_External_Id__c/orderlink:{emailHash}` — creates or updates in one call. Don't add a separate dedupe rule; the External Id + unique constraint handles it.

### 5.2 Order (record type: `OrderLink_Order`)

Standard Salesforce Order object. A few notes first:
- `AccountId` — the Person Account created above
- `Pricebook2Id` — use the standard pricebook (SF requires one even if we only have one SKU listed)
- `EffectiveDate` — order creation date
- `Status` — Salesforce's `Status` field has its own picklist (`Draft`, `Activated`). We track OrderLink-specific state on a **custom** field (below) and leave `Status = Activated` once payment confirms.

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| Order Number (SF) | `OrderNumber` | standard auto | — | SF-generated, we ignore |
| OrderLink Order # | `OrderLink_Order_Number__c` | Text(16), Unique, External ID | 16 | `OL-2026-0003` format. Primary upsert key for Order from storefront. |
| Invoice Number | `OrderLink_Invoice_Number__c` | Text(24), Unique | 24 | `OL-INV-2026-000011` format |
| OrderLink Status | `OrderLink_Status__c` | Picklist, Restricted | — | Values: `pending_advance`, `pending_payment`, `advance_paid`, `paid`, `confirmed`, `shipped`, `delivered`, `cancelled`, `refunded`, `abandoned`. Default: `pending_payment`. |
| Payment Method | `OrderLink_Payment_Method__c` | Picklist, Restricted | — | `prepaid`, `pay_on_delivery` |
| Total (Paise) | `OrderLink_Total_Paise__c` | Number(10,0) | — | All amounts in paise to avoid float issues |
| Advance Paid (Paise) | `OrderLink_Advance_Paid_Paise__c` | Number(10,0) | — | |
| Balance Due on Delivery (Paise) | `OrderLink_Balance_Due_Paise__c` | Number(10,0) | — | 0 for prepaid |
| Shipping (Paise) | `OrderLink_Shipping_Paise__c` | Number(8,0) | — | Usually 4900 (₹49) |
| Coupon Code | `OrderLink_Coupon_Code__c` | Text(40) | 40 | `WELCOME10` etc., null if none |
| Coupon Discount (Paise) | `OrderLink_Coupon_Discount_Paise__c` | Number(8,0) | — | null if no coupon |
| Razorpay Order ID | `OrderLink_Razorpay_Order_Id__c` | Text(40) | 40 | `order_AbCdEf12345` |
| Razorpay Payment ID | `OrderLink_Razorpay_Payment_Id__c` | Text(40) | 40 | `pay_AbCdEf12345`, nullable until payment captured |
| Ship Pincode | `OrderLink_Ship_Pincode__c` | Text(6) | 6 | |
| Ship State | `OrderLink_Ship_State__c` | Text(40) | 40 | |
| Track Key | `OrderLink_Track_Key__c` | Text(4) | 4 | Last 4 of mobile. Used for customer self-lookup on /track. Not secret, not PII per se. |
| Product Slug | `OrderLink_Product_Slug__c` | Text(60) | 60 | `oil-dispenser`. Matches catalog in storefront. |
| Product Title (snapshot) | `OrderLink_Product_Title__c` | Text(120) | 120 | Snapshotted at order time so renaming a product doesn't change old orders' records. |
| Quantity | `OrderLink_Quantity__c` | Number(3,0) | — | Always 1 in Phase 2a |
| Meesho Tracking ID | `OrderLink_Meesho_Tracking_Id__c` | Text(40) | 40 | Set by admin when order ships |
| Meesho Tracking URL | `OrderLink_Meesho_Tracking_URL__c` | URL | — | Full tracking link admin pastes in |
| Shipped At | `OrderLink_Shipped_At__c` | DateTime | — | Set by admin on status change |
| Delivered At | `OrderLink_Delivered_At__c` | DateTime | — | Set by admin on status change |
| Cancelled At | `OrderLink_Cancelled_At__c` | DateTime | — | |
| UTM Source | `OrderLink_UTM_Source__c` | Text(80) | 80 | |
| UTM Medium | `OrderLink_UTM_Medium__c` | Text(80) | 80 | |
| UTM Campaign | `OrderLink_UTM_Campaign__c` | Text(80) | 80 | |

**Upsert strategy**: `PATCH /services/data/v63.0/sobjects/Order/OrderLink_Order_Number__c/OL-2026-0003`

### 5.3 Lead (record type: `OrderLink_Abandoned_Cart`)

Written only for abandoned checkouts (customer filled the form but didn't pay):

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| First Name | `FirstName` | standard | — | |
| Last Name | `LastName` | standard | — | |
| Email | `Email` | standard | — | |
| Phone | `MobilePhone` | standard | — | `+91...` |
| City | `City` | standard | — | |
| State | `State` | standard | — | |
| Postal Code | `PostalCode` | standard | — | |
| Country | `Country` | standard | — | always `India` |
| Company | `Company` | standard (required) | — | Put `Retail Consumer` since these are B2C. |
| Lead Source | `LeadSource` | standard picklist | — | `OrderLink Abandoned Cart` (add to picklist values) |
| OrderLink Order # (intended) | `OrderLink_Order_Number__c` | Text(16) | 16 | The order number the customer would have gotten. Helps the CS team reference the specific checkout. |
| Product Slug | `OrderLink_Product_Slug__c` | Text(60) | 60 | What they were trying to buy |
| Product Title | `OrderLink_Product_Title__c` | Text(120) | 120 | |
| Abandoned At | `OrderLink_Abandoned_At__c` | DateTime | — | When the reaper fired |
| External Id | `OrderLink_External_Id__c` | Text(40), Unique, External ID | 40 | `orderlink:lead:{orderRefUuid}` — one Lead per abandoned checkout; re-runs of the same reaper row are no-ops |
| UTM Source / Medium / Campaign | same as Account | | | |

**Upsert strategy**: `PATCH .../Lead/OrderLink_External_Id__c/orderlink:lead:{uuid}`

### 5.4 ContentVersion (invoice PDF)

One per Order. Created after Order upsert:
- `Title`: the invoice number (e.g. `OL-INV-2026-000011`)
- `PathOnClient`: `{invoiceNumber}.pdf`
- `VersionData`: base64 of the PDF bytes
- `FirstPublishLocationId`: the Order Id (so the file is attached to the Order record automatically)
- Body is small (<50 KB) — no need for ContentVersion chunking

After insert, the ContentDocumentId can be queried back via:
```sql
SELECT ContentDocumentId FROM ContentVersion WHERE Id = :versionId
```

Storefront stores that `069...` id as `sf:{ContentDocumentId}` in its local `orders_ref.invoicePdfPath` column.

### 5.5 Coupon catalog — `OrderLink_Coupon__c` (custom object)

Marketing team creates + edits coupons here. The storefront refreshes its local `coupons` cache from SF every 10 minutes (§6.5 describes the read endpoint). SF is the only place `amount_paise`, `expires_at`, or `is_active` change.

**Object**: `OrderLink_Coupon__c`, label "OrderLink Coupon"
- Name field: `Name` = the coupon code (e.g. `WELCOME10`) — **used as the External Id**, Unique
- Default record type: none needed (single-type object)

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| Name (=Code) | `Name` | Text(40), Unique | 40 | `WELCOME10`, `STAY5`, etc. Uppercase by convention; SF Validation Rule should enforce. |
| Kind | `Kind__c` | Picklist, Restricted | — | Values: `first_order`, `exit_intent`, `manual`, `promo` |
| Amount (Paise) | `Amount_Paise__c` | Number(8,0), Required | — | Integer paise. ₹10 off = 1000. |
| Active | `Is_Active__c` | Checkbox, default `true` | — | Marketing toggles off to retire a code without deleting it (preserves redemption history references) |
| Starts At | `Starts_At__c` | DateTime | — | Optional — null means "active since forever" |
| Expires At | `Expires_At__c` | DateTime | — | Optional — null means "no expiry" |
| Max Uses | `Max_Uses__c` | Number(6,0) | — | Optional — null means unlimited. Enforced on storefront-side via redemption count |
| Redemption Count | `Redemption_Count__c` | Roll-up Summary COUNT on `OrderLink_Coupon_Redemption__c` (Master-Detail) | — | SF maintains automatically — NOT maintained by storefront |
| Description | `Description__c` | Long Text Area(500) | 500 | Marketing notes: "Launch week WELCOME", etc. Not surfaced to customers. |

**Upsert strategy**: storefront rarely writes here — only at first-time seed (scripts/seed-coupons — §9). Day-to-day marketing manages via SF UI.

**Read strategy for storefront cache**: `GET /services/data/v63.0/query/?q=SELECT+Name,Kind__c,Amount_Paise__c,Is_Active__c,Starts_At__c,Expires_At__c,Max_Uses__c+FROM+OrderLink_Coupon__c+WHERE+Is_Active__c=true` — see §6.5 for the lease policy.

### 5.6 Coupon Redemption — `OrderLink_Coupon_Redemption__c` (custom object)

Logged by storefront after payment verify succeeds AND a coupon was used. One-per-order; enforced via Unique constraint on `Order__c`.

**Object**: `OrderLink_Coupon_Redemption__c`, label "OrderLink Coupon Redemption"
- Master-Detail to `OrderLink_Coupon__c` on the `Coupon__c` field (drives the roll-up in §5.5)
- Lookup to standard `Order` on `Order__c`

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| Name | `Name` | Auto Number | — | `CR-{0000}` format is fine |
| Coupon | `Coupon__c` | Master-Detail to `OrderLink_Coupon__c`, Required | — | |
| Order | `Order__c` | Lookup to Order, Required, Unique | — | One redemption record per Order. UNIQUE constraint prevents duplicate logging on retries. |
| Customer Email Hash | `Customer_Email_Hash__c` | Text(64) | 64 | SHA-256 hex of lowercased email. Storefront sends this so one-per-email enforcement works without PII in this table. |
| Amount Applied (Paise) | `Amount_Applied_Paise__c` | Number(8,0) | — | Snapshot of `Coupon.Amount_Paise__c` at redemption time. If marketing later changes the coupon amount, historical records still show what the customer actually got. |
| Redeemed At | `Redeemed_At__c` | DateTime, default `NOW()` | — | |
| External Id | `OrderLink_External_Id__c` | Text(60), Unique, External ID | 60 | `orderlink:redemption:{orderRefUuid}` — upsert key so retries are idempotent |

**Upsert strategy**: storefront calls `PATCH /sobjects/OrderLink_Coupon_Redemption__c/OrderLink_External_Id__c/orderlink:redemption:{orderRefUuid}` with Coupon__c + Order__c set via foreign key references on the payload.

### 5.7 Restock Waitlist — `OrderLink_Restock_Waitlist__c` (custom object)

Customers clicking "Notify me when back" on a sold-out product page land here. Marketing sends the recovery email when inventory replenishes (via a Flow they trigger manually or via a product-availability Flow).

**Object**: `OrderLink_Restock_Waitlist__c`, label "OrderLink Restock Waitlist"

| Field | API name | Type | Length | Notes |
|---|---|---|---|---|
| Name | `Name` | Auto Number | — | `RW-{0000}` |
| Product Slug | `Product_Slug__c` | Text(60), Indexed | 60 | `oil-dispenser` |
| Product Title | `Product_Title__c` | Text(120) | 120 | Snapshotted for campaign emails |
| Email | `Email__c` | Email, Required | — | Stored plaintext (marketing needs it to send). Lowercased by storefront before write. |
| Signed Up At | `Signed_Up_At__c` | DateTime, default `NOW()` | — | |
| Notified At | `Notified_At__c` | DateTime | — | Set by the SF restock-notified Flow when the recovery email fires. NULL means still waiting. |
| Campaign | `Campaign__c` | Lookup to Campaign | — | Optional — link to a SF Campaign if the team wants funnel-tracking |
| External Id | `OrderLink_External_Id__c` | Text(120), Unique, External ID | 120 | `orderlink:restock:{productSlug}:{emailHashShort}` — prevents duplicate signups for the same (product, email) pair |

**Upsert strategy**: `PATCH /sobjects/OrderLink_Restock_Waitlist__c/OrderLink_External_Id__c/orderlink:restock:{slug}:{hash}` — idempotent.

---

## 6. Connected App / JWT Bearer setup

### 6.1 The flow

Storefront signs a JWT with its private key → POSTs it to `{SF_LOGIN_URL}/services/oauth2/token` → receives an access token (valid ~1h) → uses token for all subsequent API calls. See the SF docs: [OAuth 2.0 JWT Bearer Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm).

### 6.2 What you need to create

In your SF org:

1. Setup → App Manager → New Connected App
2. Name: `OrderLink Storefront Integration`
3. API Name: `OrderLink_Storefront_Integration` (auto)
4. Contact Email: the internal contact at CodeSierra
5. Enable OAuth Settings: **yes**
6. Callback URL: `https://orderlink.in/oauth/callback` (required to have a value, never actually used)
7. **Use digital signatures**: yes. Upload the public certificate (`.crt` file) from the keypair the storefront team generates. Instructions below.
8. Selected OAuth Scopes:
   - `api` (Manage user data via APIs)
   - `refresh_token` + `offline_access` (even though JWT doesn't use refresh tokens, SF requires them to be checked for JWT flow to work)
9. Require Secret for Web Server Flow: leave default
10. Save. Wait 2–10 minutes for the app to propagate.
11. Manage → Edit Policies → **Permitted Users**: `Admin approved users are pre-authorized`
12. Save.
13. Manage → Add profile/permission set → add the OrderLink Integration user's profile.

### 6.3 Keypair generation (storefront team does this, shares public cert with you)

```bash
openssl genrsa -out sf-jwt.key 2048
openssl req -new -key sf-jwt.key -out sf-jwt.csr \
  -subj "/C=IN/ST=Maharashtra/L=Pune/O=CodeSierra Tech/CN=orderlink-sf-jwt"
openssl x509 -req -in sf-jwt.csr -signkey sf-jwt.key -out sf-jwt.crt -days 3650
```

Storefront keeps `sf-jwt.key` private (never committed, lives on the VPS at `./sf-jwt.pem`). Storefront team sends you `sf-jwt.crt` to upload on the Connected App.

### 6.4 What you hand back to the storefront team

From the Connected App, once created:
- **Consumer Key** (a long string ending in `...cNjA` or similar) → storefront's `SF_CONSUMER_KEY` env var
- **Login URL** → `https://login.salesforce.com` for Developer Edition, `https://test.salesforce.com` for sandbox, `https://codesierra.my.salesforce.com` (or whatever your My Domain is) for production → storefront's `SF_LOGIN_URL`

Also:
- Integration user username (like `integration@codesierra.tech.orderlink`) → `SF_USERNAME`
- The three Record Type IDs (`012...` — get these via Setup → Object Manager → Record Types, or via a SOQL query on `RecordType`) → `SF_PERSON_ACCOUNT_RECORD_TYPE_ID`, `SF_ORDER_RECORD_TYPE_ID`, `SF_LEAD_RECORD_TYPE_ID`

---

### 6.5 Exposing the active-coupon list to the storefront cache

The storefront refreshes its local `coupons` PG cache every 10 minutes. It needs a read endpoint that returns active coupons with their kind + amount + expiry.

**Option A (recommended, simplest):** let the storefront hit the standard SOQL REST endpoint:

```
GET /services/data/v63.0/query/?q=SELECT+Name,Kind__c,Amount_Paise__c,Is_Active__c,Starts_At__c,Expires_At__c,Max_Uses__c+FROM+OrderLink_Coupon__c+WHERE+Is_Active__c=true
```

Auth via the standard Integration user JWT token. No SF-side code required.

**Option B (if you want a more stable public contract):** expose an Apex REST endpoint `/apexrest/OrderLinkCoupons/v1`:

```apex
@RestResource(urlMapping='/OrderLinkCoupons/v1')
global class OrderLinkCouponsEndpoint {
    @HttpGet
    global static List<Coupon> listActive() {
        List<Coupon> out = new List<Coupon>();
        for (OrderLink_Coupon__c c : [
            SELECT Name, Kind__c, Amount_Paise__c, Starts_At__c, Expires_At__c, Max_Uses__c, Redemption_Count__c
            FROM OrderLink_Coupon__c
            WHERE Is_Active__c = true
        ]) {
            out.add(new Coupon(c));
        }
        return out;
    }
    global class Coupon {
        public String code;
        public String kind;
        public Integer amountPaise;
        public Datetime startsAt;
        public Datetime expiresAt;
        public Integer maxUses;
        public Integer redemptions;
        Coupon(OrderLink_Coupon__c c) {
            this.code = c.Name;
            this.kind = c.Kind__c;
            this.amountPaise = c.Amount_Paise__c == null ? 0 : Integer.valueOf(c.Amount_Paise__c);
            this.startsAt = c.Starts_At__c;
            this.expiresAt = c.Expires_At__c;
            this.maxUses = c.Max_Uses__c == null ? null : Integer.valueOf(c.Max_Uses__c);
            this.redemptions = c.Redemption_Count__c == null ? 0 : Integer.valueOf(c.Redemption_Count__c);
        }
    }
}
```

Pros of B: stable API surface (storefront doesn't know about SF object names). Cons: more Apex to maintain.

**Your call.** For Phase 2b launch, Option A is fine — the query is simple, the storefront's SF client already has OAuth. The storefront team will just put the SOQL in their `refreshCouponCache()` function.

---

## 7. Flows — eight workflows that produce the customer's experience

Build these as **Record-Triggered Flows** unless noted. Each Flow sends an email via the SF Organization-Wide Email Address `hello@orderlink.in`. Email templates use merge fields; copy is below each Flow.

Runtime: all Flows should run **after save** to ensure all fields are populated.

### 7.1 Flow: "Send order confirmation email"

**Trigger:** Order record, criteria: `RecordType.DeveloperName = 'OrderLink_Order'` **AND** `OrderLink_Status__c` changes to `paid` OR `advance_paid` **AND** at least one ContentDocumentLink exists for this record (to ensure invoice is attached).

**Record-type guard:** this Flow must not fire for non-OrderLink Orders. Verify this during smoke test by creating a standard Order with a different record type — no email should go out.

**Action:** Send Email (single)
- Recipient: `Account.PersonEmail`
- Subject: `Your OrderLink order {!$Record.OrderLink_Order_Number__c} is confirmed`
- Body: see email template §7.1.T below
- Attach: the ContentVersion whose `ContentDocumentId` matches the link

**Body (HTML):**
```
Hi {!$Record.Account.FirstName},

Your order {!$Record.OrderLink_Order_Number__c} is confirmed and on its way.

— Order details —
Product: {!$Record.OrderLink_Product_Title__c}
Total: ₹{!TEXT($Record.OrderLink_Total_Paise__c / 100)}
Paid now: ₹{!TEXT($Record.OrderLink_Advance_Paid_Paise__c / 100)}
{!IF($Record.OrderLink_Balance_Due_Paise__c > 0, "Balance due on delivery (cash): ₹" & TEXT($Record.OrderLink_Balance_Due_Paise__c / 100), "")}

— What happens next —
We're handing your parcel to Meesho Logistics within 1 working day. You'll
receive SMS tracking updates from Meesho at each stage — dispatched, out for
delivery, delivered. Delivery takes 3–8 business days to {!$Record.OrderLink_Ship_Pincode__c}.

Your GST invoice is attached. Keep it for your records.

Track any time: https://orderlink.in/track?order={!$Record.OrderLink_Order_Number__c}&code={!$Record.OrderLink_Track_Key__c}

Questions? Reply to this email or WhatsApp +91 20 66897519.

— OrderLink
A brand of CodeSierra Tech Private Limited
Eon Free Zone, Kharadi, Pune 411014
CIN U62013PN2025PTC241138 · GSTIN 27AAMCC6643G1ZF
```

### 7.2 Flow: "Send shipped notification"

**Trigger:** Order record, `RecordType.DeveloperName = 'OrderLink_Order'` AND `OrderLink_Status__c` changes to `shipped` AND `OrderLink_Meesho_Tracking_URL__c` is not null.

**Body:**
```
Hi {!$Record.Account.FirstName},

Good news — your OrderLink order {!$Record.OrderLink_Order_Number__c} is on the way.

Track live: {!$Record.OrderLink_Meesho_Tracking_URL__c}
Meesho tracking ID: {!$Record.OrderLink_Meesho_Tracking_Id__c}

Estimated delivery: 3–8 business days from now.

You'll also get SMS updates from Meesho as the parcel moves.

— OrderLink
```

### 7.3 Flow: "Send delivered thank-you"

**Trigger:** Order record, `RecordType.DeveloperName = 'OrderLink_Order'` AND `OrderLink_Status__c` changes to `delivered`.

**Body:**
```
Hi {!$Record.Account.FirstName},

Your OrderLink order {!$Record.OrderLink_Order_Number__c} was delivered.

We'd love to know how it's going — reply to this email with a one-liner, or
share a photo on WhatsApp (+91 20 66897519) if you're feeling generous.

If something arrived damaged or isn't right, reply within 7 days and we'll
sort it out.

Thanks for supporting a small Pune-based team.

— The OrderLink team
```

### 7.4 Flow: "Admin new-order alert"

**Trigger:** Order record created WHERE `RecordType.DeveloperName = 'OrderLink_Order'` (regardless of status).

**Action:** Send Email (single) to `hello@orderlink.in` (internal ops inbox):

**Body:**
```
New order: {!$Record.OrderLink_Order_Number__c}
Status: {!$Record.OrderLink_Status__c}
Customer: {!$Record.Account.FirstName} {!$Record.Account.LastName} ({!$Record.Account.PersonEmail})
Phone: {!$Record.Account.PersonMobilePhone}
Product: {!$Record.OrderLink_Product_Title__c}
Total: ₹{!TEXT($Record.OrderLink_Total_Paise__c / 100)}
Payment: {!$Record.OrderLink_Payment_Method__c}
Ship to: {!$Record.Account.PersonMailingStreet}, {!$Record.Account.PersonMailingCity} {!$Record.OrderLink_Ship_Pincode__c}

Open in SF: {!$Record.Link}

Paste-ready Meesho shipping block:
{!$Record.Account.FirstName} {!$Record.Account.LastName}
{!$Record.Account.PersonMailingStreet}
{!$Record.Account.PersonMailingCity} {!$Record.OrderLink_Ship_Pincode__c}
{!$Record.Account.PersonMobilePhone}
```

### 7.5 Flow: "Abandoned cart recovery email"

**Trigger:** Lead record created WHERE `RecordType.DeveloperName = 'OrderLink_Abandoned_Cart'` AND `LeadSource = 'OrderLink Abandoned Cart'`. Both filters — belt and suspenders.

**Action:** Wait 1 hour (SF Flow Pause + resume on schedule). Then send email to `Lead.Email`.

**Body:**
```
Hi {!$Record.FirstName},

You were this close to ordering {!$Record.OrderLink_Product_Title__c} on OrderLink
a little while ago — payment didn't go through. No judgement!

If you'd like to finish the order, use code WELCOME10 for ₹10 off your first
order:

https://orderlink.in/p/{!$Record.OrderLink_Product_Slug__c}

If the price or shipping was a concern, hit reply — we're a small team and we
genuinely read every email.

— OrderLink
```

### 7.6 Flow: "Restock-available notification" (Marketing-triggered)

**Trigger:** manual (marketing clicks a button on an `OrderLink_Restock_Waitlist__c` record, OR a scheduled Flow fires when a product becomes available again and emails all waitlist rows with `Notified_At__c = NULL`).

**Action:** Send Email to `Email__c`, then set `Notified_At__c = NOW()`.

**Body:**
```
Hi —

{!$Record.Product_Title__c} is back in stock.

You asked to be notified, so we're keeping our word. It usually doesn't last
long when it returns — if you'd like one:

https://orderlink.in/p/{!$Record.Product_Slug__c}

Not interested anymore? Just ignore this — we won't email you again about
this product.

— OrderLink
```

### 7.7 Flow: "Coupon redeemed — Marketing notification" (optional)

**Trigger:** `OrderLink_Coupon_Redemption__c` record created.

**Action:** Chatter post to the Marketing team group, OR email a daily digest, OR just rely on the roll-up count on `OrderLink_Coupon__c` for reporting. Simplest: do nothing special, let the roll-up tell marketing which codes are working.

Skip if your org doesn't have a Marketing group. Listed for completeness.

### 7.8 Flow: "First order Person Account rollup" (post-order-insert)

**Trigger:** Order record created WHERE `RecordType.DeveloperName = 'OrderLink_Order'` AND (`OrderLink_Status__c = paid` OR `advance_paid`).

**Action:** Update the linked Person Account (which by construction has `RecordType = OrderLink_Customer`):
- If `Account.OrderLink_First_Order_At__c` is null → set it to `$Record.CreatedDate`
- Increment `Account.OrderLink_Lifetime_Orders__c` by 1
- Add `$Record.OrderLink_Total_Paise__c` to `Account.OrderLink_Lifetime_Revenue_Paise__c`

**Why:** gives marketing the "customer came back for their Nth order" signal without needing any storefront-side state. Pure SF-native rollups.

**Alternative:** replace the numeric fields with real SF Roll-up Summary fields (Account → Order master-detail). Requires reparenting Order from Lookup to Master-Detail → more invasive — prefer the Flow approach unless you already have a master-detail relationship in place.

---

## 8. Data contract: what the storefront posts, what it expects back

### 8.1 Job payload shape (encrypted in storefront Postgres, decrypted inside T30 worker)

The storefront's `pending_sf_sync` table queues jobs. Each row has a `job_kind` and an AES-256-GCM-encrypted JSON payload. Supported kinds:

| `job_kind` | When enqueued | Target SF object(s) | Payload shape |
|---|---|---|---|
| `full_sync` | Order creation (POST /api/orders) | Person Account + Order + ContentVersion (PDF) + CouponRedemption if applicable | Full checkout payload (below) |
| `lead_sync` | Reaper detects abandoned cart, promotes from `full_sync` (see §2.3) | Lead | Same checkout payload, but most fields used to populate Lead |
| `coupon_redemption_sync` | Payment verify success, if order used a coupon | CouponRedemption (standalone retry path) | `{orderRefUuid, couponCode, email, orderNumber, amountAppliedPaise}` |
| `restock_signup_sync` | POST /api/restock-notify | RestockWaitlist | `{productSlug, productTitle, email}` |

For `full_sync` the payload shape is:

```json
{
  "orderNumber": "OL-2026-0003",
  "invoiceNumber": "OL-INV-2026-000011",
  "productSlug": "oil-dispenser",
  "fullName": "Priya Sharma",
  "mobile": "9876543210",
  "email": "priya@example.com",
  "addressLine1": "221B Baker Street",
  "addressLine2": "Apt 5",
  "landmark": "Near the chai stall",
  "pincode": "411014",
  "city": "Pune",
  "state": "Maharashtra",
  "paymentMethod": "prepaid",
  "couponCode": "WELCOME10",
  "utm_source": "instagram",
  "utm_medium": "cpc",
  "utm_campaign": "launch-week"
}
```

The storefront worker joins this with the plaintext `orders_ref` row (has `razorpayOrderId`, `razorpayPaymentId`, status, amounts) to build the full SF write.

### 8.2 The email hash derivation (for `Account.OrderLink_External_Id__c`)

```ts
const crypto = require("node:crypto");
const hash = crypto.createHash("sha256")
  .update(email.trim().toLowerCase(), "utf8")
  .digest("hex");
const externalId = "orderlink:" + hash.slice(0, 30);
// e.g. "orderlink:f3a8e91b2c4d7e5a98f6c1b3d4e5f6a7b"
```

30 chars of hex + the `orderlink:` prefix fits the 40-char Text field. Collisions at 30 hex chars are astronomically unlikely at OrderLink's scale.

### 8.3 The sync sequence (full_sync)

1. **Upsert Account** via `PATCH /sobjects/Account/OrderLink_External_Id__c/{externalId}` with PA fields. Body MUST include `RecordTypeId = $SF_PERSON_ACCOUNT_RECORD_TYPE_ID`.
2. **Upsert Order** via `PATCH /sobjects/Order/OrderLink_Order_Number__c/{orderNumber}`. Body includes `AccountId` from step 1's response header `Location` AND `RecordTypeId = $SF_ORDER_RECORD_TYPE_ID`.
3. **Read Order.Id** from the Location header of step 2.
4. **Create ContentVersion** via `POST /sobjects/ContentVersion` (multipart/form-data with PDF bytes + JSON metadata). Set `FirstPublishLocationId` to the Order.Id.
5. **Query back** `SELECT ContentDocumentId FROM ContentVersion WHERE Id = :versionId` to get the `069...` id.
6. **If the order used a coupon**: upsert CouponRedemption via `PATCH /sobjects/OrderLink_Coupon_Redemption__c/OrderLink_External_Id__c/orderlink:redemption:{orderRefUuid}` with `Coupon__c`, `Order__c`, `Customer_Email_Hash__c`, `Amount_Applied_Paise__c`. Idempotent.
7. **Mark the `pending_sf_sync` row as `status = 'synced'`** and store `sf_order_id` + `sf_account_id` on the corresponding `orders_ref` row. `invoicePdfPath` becomes `sf:{ContentDocumentId}`.
8. `ON CONFLICT` — Account/Order upsert returns 204 No Content on update, 201 Created on insert. Both are success.

### 8.4 The sync sequence (lead_sync)

1. **Upsert Lead** via `PATCH /sobjects/Lead/OrderLink_External_Id__c/orderlink:lead:{orderRefUuid}` with Lead fields. Include `RecordTypeId = $SF_LEAD_RECORD_TYPE_ID` AND `LeadSource = 'OrderLink Abandoned Cart'`.
2. Mark the `pending_sf_sync` row as `status = 'synced'`.

No invoice upload or CouponRedemption for leads (they didn't pay).

### 8.5 The sync sequence (coupon_redemption_sync)

This path exists as a retry-only fallback — `full_sync` already handles redemption in step 6 of §8.3. The standalone path exists only if the main `full_sync` partially succeeds (account+order+invoice landed, redemption call threw).

1. Upsert CouponRedemption via `PATCH /sobjects/OrderLink_Coupon_Redemption__c/OrderLink_External_Id__c/orderlink:redemption:{orderRefUuid}`. Body: `{Coupon__c: {attributes:{type:'OrderLink_Coupon__c', referenceId:...}, Name: 'WELCOME10'}, Order__c: '<sfOrderId>', Customer_Email_Hash__c: '<hash>', Amount_Applied_Paise__c: 1000}`.
2. Mark the `pending_sf_sync` row as `status = 'synced'`.

Payload shape after decrypt:
```json
{
  "orderRefUuid": "uuid-of-orders_ref-row",
  "sfOrderId": "801...",
  "couponCode": "WELCOME10",
  "customerEmailHash": "sha256-hex-64-char",
  "amountAppliedPaise": 1000
}
```

### 8.6 The sync sequence (restock_signup_sync)

1. Upsert RestockWaitlist via `PATCH /sobjects/OrderLink_Restock_Waitlist__c/OrderLink_External_Id__c/orderlink:restock:{productSlug}:{emailHashShort}`. Body: `{Product_Slug__c, Product_Title__c, Email__c, Signed_Up_At__c}`.
2. Mark the `pending_sf_sync` row as `status = 'synced'`.
3. Storefront-side: delete the `restock_notifications` PG mirror row — SF is canonical from here on. Marketing triggers the §7.6 "Restock-available notification" Flow when they decide to send.

Payload shape after decrypt:
```json
{
  "productSlug": "oil-dispenser",
  "productTitle": "Premium Glass Oil Dispenser — 500ml",
  "email": "customer@example.com"
}
```

### 8.7 Error handling / retry semantics

The storefront worker reads `pending_sf_sync` rows WHERE `status = 'pending'` AND `next_attempt_at <= now()`. On failure it:
- Increments `attempts`
- Sets `next_attempt_at = now() + exp(attempts) minutes` (exponential backoff, capped at 1h)
- Stores `last_error` with the SF response body

If SF returns `INVALID_SESSION_ID`, worker refreshes the JWT and retries immediately.

If SF returns `DUPLICATE_VALUE` on Account upsert despite using an External Id key, something is wrong with your dedupe rules — do NOT add custom duplicate rules on top of the External Id uniqueness.

---

## 9. Testing handoff

Before handing back to the storefront team, smoke-test your side against dummy payloads.

### 9.1 Smoke test 1 — full_sync happy path

Using the Salesforce Workbench, Postman, or curl:

```bash
# 1. Get a session token via your Connected App's JWT flow (do this manually once)
# 2. Create the Account
curl -X PATCH "$SF_INSTANCE_URL/services/data/v63.0/sobjects/Account/OrderLink_External_Id__c/orderlink:f3a8e91b2c4d7e5a98f6c1b3d4e" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "RecordTypeId": "'"$PERSON_ACCOUNT_RT"'",
    "FirstName": "Priya",
    "LastName": "Sharma",
    "PersonEmail": "priya+test@example.com",
    "PersonMobilePhone": "+919876543210",
    "PersonMailingStreet": "221B Baker Street, Apt 5",
    "OrderLink_Landmark__c": "Near the chai stall",
    "PersonMailingCity": "Pune",
    "PersonMailingState": "Maharashtra",
    "PersonMailingPostalCode": "411014",
    "PersonMailingCountry": "India",
    "OrderLink_UTM_Source__c": "instagram"
  }'
```

Response should be 204 (updated) or 201 (created). Account now visible in SF UI.

### 9.2 Smoke test 2 — Order + ContentVersion

```bash
# 3. Create the Order
curl -X PATCH "$SF_INSTANCE_URL/services/data/v63.0/sobjects/Order/OrderLink_Order_Number__c/OL-2026-TEST-001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AccountId": "'"$ACCOUNT_ID"'",
    "RecordTypeId": "'"$ORDER_RT"'",
    "EffectiveDate": "2026-04-20",
    "Status": "Activated",
    "OrderLink_Order_Number__c": "OL-2026-TEST-001",
    "OrderLink_Invoice_Number__c": "OL-INV-2026-TEST-001",
    "OrderLink_Status__c": "paid",
    "OrderLink_Payment_Method__c": "prepaid",
    "OrderLink_Total_Paise__c": 47700,
    "OrderLink_Advance_Paid_Paise__c": 47700,
    "OrderLink_Balance_Due_Paise__c": 0,
    "OrderLink_Razorpay_Payment_Id__c": "pay_TestPayment",
    "OrderLink_Ship_Pincode__c": "411014",
    "OrderLink_Ship_State__c": "Maharashtra",
    "OrderLink_Track_Key__c": "3210",
    "OrderLink_Product_Slug__c": "oil-dispenser",
    "OrderLink_Product_Title__c": "Premium Glass Oil Dispenser — 500ml"
  }'

# 4. Upload invoice PDF as ContentVersion
# (use Workbench UI or a proper multipart client — this is harder with bare curl)
```

**Expected:** both records land in SF. The "Send order confirmation email" Flow should fire. Check the Flow's execution log + the customer inbox (use your own email in the smoke test).

### 9.3 Smoke test 3 — lead_sync

```bash
curl -X PATCH "$SF_INSTANCE_URL/services/data/v63.0/sobjects/Lead/OrderLink_External_Id__c/orderlink:lead:abandoned-test-001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "RecordTypeId": "'"$LEAD_RT"'",
    "FirstName": "Priya",
    "LastName": "Sharma",
    "Email": "priya+abandoned@example.com",
    "MobilePhone": "+919876543210",
    "City": "Pune",
    "State": "Maharashtra",
    "PostalCode": "411014",
    "Country": "India",
    "Company": "Retail Consumer",
    "LeadSource": "OrderLink Abandoned Cart",
    "OrderLink_Order_Number__c": "OL-2026-TEST-ABAND",
    "OrderLink_Product_Slug__c": "oil-dispenser",
    "OrderLink_Product_Title__c": "Premium Glass Oil Dispenser — 500ml",
    "OrderLink_Abandoned_At__c": "2026-04-20T11:00:00Z"
  }'
```

**Expected:** Lead created. The "Abandoned cart recovery email" Flow should fire 1 hour later with the WELCOME10 pitch.

### 9.4 Smoke test 4 — coupon redemption record

After smoke test 2 creates an Order, upsert a coupon redemption for it:

```bash
curl -X PATCH "$SF_INSTANCE_URL/services/data/v63.0/sobjects/OrderLink_Coupon_Redemption__c/OrderLink_External_Id__c/orderlink:redemption:test-smoke-001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Coupon__r": { "Name": "WELCOME10" },
    "Order__c": "'"$ORDER_ID"'",
    "Customer_Email_Hash__c": "f3a8e91b2c4d7e5a98f6c1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
    "Amount_Applied_Paise__c": 1000
  }'
```

**Expected:** record created AND the Coupon's `Redemption_Count__c` roll-up bumps to 1 (or N+1) without any Flow work.

### 9.5 Smoke test 5 — restock waitlist signup

```bash
curl -X PATCH "$SF_INSTANCE_URL/services/data/v63.0/sobjects/OrderLink_Restock_Waitlist__c/OrderLink_External_Id__c/orderlink:restock:oil-dispenser:f3a8e91b2c4d" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Product_Slug__c": "oil-dispenser",
    "Product_Title__c": "Premium Glass Oil Dispenser — 500ml",
    "Email__c": "waitlist+test@example.com"
  }'
```

**Expected:** record created. Flow §7.6 doesn't fire automatically — it's manually triggered by Marketing.

### 9.6 Smoke test 6 — **record-type isolation (CRITICAL)**

This verifies §2.6's hard rule. Do this before handoff.

1. In SF UI, manually create a **non-OrderLink** Account record (e.g. a Business Account with no record type specified, or a different record type).
2. Manually create a non-OrderLink Order linked to it.
3. Change that Order's status to whatever OrderLink's Flow would normally react to (if it's a custom field, skip; if it's a shared field, trigger it).
4. Wait 2 minutes.
5. Verify:
   - No email was sent from `hello@orderlink.in`
   - No OrderLink-branded notification fired
   - The OrderLink Flows' execution log (Setup → Flow → View Log) does NOT show runs against this record

If any Flow fired, the record-type filter is missing in its trigger. Fix before handing back.

---

## 10. Open questions / things the storefront team should still confirm with you

1. **Org type for launch** — Developer Edition is fine for build but won't have custom domain, API limits, or email deliverability at scale. Confirm whether launch goes on a sandbox of an existing Salesforce prod org, or needs a fresh org.
2. **Meesho tracking capture** — admins paste `OrderLink_Meesho_Tracking_Id__c` + `...URL__c` by hand on the Order record when shipping. OK? Or build an inbound integration with Meesho's API eventually? (Phase 2c scope.)
3. **Refund flow** — when a refund happens, storefront sets status = `refunded` but no money movement is in scope. Do we need a separate refund email Flow? Phase 2a says no, confirm.
4. **Data retention** — CGST mandates 7 years for invoice + order records. Is that automatically handled by SF's standard archive, or do we need a scheduled job to purge unrelated PII (addresses, phone) after 7 years?
5. **Storefront env vars** — you'll hand back the consumer key / username / record type IDs. Confirm naming convention you'd like (e.g. if you prefer `SF_PERSON_ACCOUNT_RT_ID` over the storefront's default `SF_PERSON_ACCOUNT_RECORD_TYPE_ID`).

---

## 11. Reference: storefront repo touchpoints

Not required for your side, but useful context:

- Storefront repo: github.com/cstech-vinay/orderlink (branch `phase-2a-store`)
- Storefront's SF env vars are declared in `.env.example`:
  - `SF_LOGIN_URL`, `SF_CONSUMER_KEY`, `SF_USERNAME`, `SF_JWT_PRIVATE_KEY_PATH`
  - `SF_PERSON_ACCOUNT_RECORD_TYPE_ID`, `SF_ORDER_RECORD_TYPE_ID`, `SF_PRODUCT_RECORD_TYPE_ID`
  - `SF_EXTERNAL_ID_PREFIX=orderlink`, `SF_SYNC_ENABLED=true`
- Storefront plan file for SF work: `docs/superpowers/plans/2026-04-19-orderlink-store-phase-2a.md` (tasks T27–T31)
- Legal constants single-source-of-truth: `src/lib/legal.ts`

If you want to see the exact storefront code that will write to SF before we build it, refer to tasks T27 (`src/lib/salesforce/client.ts`), T28 (`src/lib/salesforce/sync-order.ts`), T30 (`scripts/run-sf-sync-worker.ts`) in that plan file. They are not yet implemented but the plan has drafts.

---

*Last updated: 2026-04-20. Questions for CodeSierra storefront team: contact Vinay Vernekar at hello@orderlink.in.*

---

## Changelog

**2026-04-20 (v2)** — Updated for hybrid Postgres+SF architecture (§2.6 record-type scoping + §2.7 hybrid rationale). Added three custom objects: `OrderLink_Coupon__c` (§5.5), `OrderLink_Coupon_Redemption__c` (§5.6), `OrderLink_Restock_Waitlist__c` (§5.7). Added §6.5 coupon-list read endpoint. Added three new Marketing Flows: §7.6 (restock notification), §7.7 (redemption notification, optional), §7.8 (first-order rollup). Added §8.5/8.6 sync sequences for `coupon_redemption_sync` and `restock_signup_sync` job kinds. Added §9.4/9.5/9.6 smoke tests (coupon redemption, restock signup, **record-type isolation CRITICAL test**). All Flow triggers now require `RecordType.DeveloperName = 'OrderLink_*'` filters. Deliverables checklist expanded accordingly.

**2026-04-20 (v1)** — Initial spec with five Flows + Account/Order/Lead/ContentVersion data model.

