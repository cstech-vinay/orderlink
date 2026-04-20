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

**Salesforce's job in this architecture:** be the **system of record for customer profiles, orders, invoices, and all outbound customer-facing email.** The storefront only owns operational state (inventory reservations, webhook idempotency, coupon redemptions).

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

---

## 3. What Salesforce needs from you — deliverables checklist

Treat this as your Definition of Done:

- [ ] SF org provisioned (Developer Edition is fine for build; production sandbox for UAT)
- [ ] Person Account enabled on the org
- [ ] Record types created:
  - `OrderLink_Customer` on Account (Person Account-type)
  - `OrderLink_Order` on Order
  - `OrderLink_Product` on Product2 (optional — 25 catalog entries)
  - `OrderLink_Abandoned_Cart` on Lead
- [ ] All custom fields below created (see §5), with correct types + lengths
- [ ] Connected App with JWT Bearer flow, scopes: `api refresh_token offline_access`, certificate uploaded
- [ ] Integration User license allocated, profile scoped to the Record Types above + ContentVersion CRUD
- [ ] Organization-Wide Email Address `hello@orderlink.in` verified (SPF + DKIM DNS records given to CodeSierra to add to orderlink.in DNS)
- [ ] Five Flows built + activated (see §7)
- [ ] Email templates for the five Flows, using the merge fields listed in §7
- [ ] End-to-end smoke test executed using the dummy payloads in §8
- [ ] A `handoff.md` written for the storefront team containing:
  - Connected App consumer key
  - Integration user username
  - Three Record Type IDs (`012...`)
  - Any custom field API names that differ from this spec's defaults
  - The verified Org-Wide Email ID
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

## 7. Flows — five workflows that produce the customer's experience

Build these as **Record-Triggered Flows** unless noted. Each Flow sends an email via the SF Organization-Wide Email Address `hello@orderlink.in`. Email templates use merge fields; copy is below each Flow.

Runtime: all Flows should run **after save** to ensure all fields are populated.

### 7.1 Flow: "Send order confirmation email"

**Trigger:** Order record, criteria: `OrderLink_Status__c` changes to `paid` OR `advance_paid` **AND** at least one ContentDocumentLink exists for this record (to ensure invoice is attached).

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

**Trigger:** Order record, `OrderLink_Status__c` changes to `shipped` AND `OrderLink_Meesho_Tracking_URL__c` is not null.

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

**Trigger:** Order record, `OrderLink_Status__c` changes to `delivered`.

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

**Trigger:** Order record created (regardless of status).

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

**Trigger:** Lead record created where `LeadSource = 'OrderLink Abandoned Cart'`.

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

---

## 8. Data contract: what the storefront posts, what it expects back

### 8.1 Job payload shape (encrypted in storefront Postgres, decrypted inside T30 worker)

The storefront's `pending_sf_sync` table queues jobs. Each row has a `job_kind` (`full_sync` or `lead_sync`) and an AES-256-GCM-encrypted JSON payload. After decrypt, the payload looks like:

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

1. **Upsert Account** via `PATCH /sobjects/Account/OrderLink_External_Id__c/{externalId}` with PA fields.
2. **Upsert Order** via `PATCH /sobjects/Order/OrderLink_Order_Number__c/{orderNumber}`. Body includes `AccountId` from step 1's response header `Location`.
3. **Read Order.Id** from the Location header of step 2.
4. **Create ContentVersion** via `POST /sobjects/ContentVersion` (multipart/form-data with PDF bytes + JSON metadata). Set `FirstPublishLocationId` to the Order.Id.
5. **Query back** `SELECT ContentDocumentId FROM ContentVersion WHERE Id = :versionId` to get the `069...` id.
6. **Mark the `pending_sf_sync` row as `status = 'synced'`** and store `sf_order_id` + `sf_account_id` on the corresponding `orders_ref` row. `invoicePdfPath` becomes `sf:{ContentDocumentId}`.
7. `ON CONFLICT` (order upsert returns 204 No Content on update, 201 Created on insert). Both are success.

### 8.4 The sync sequence (lead_sync)

1. **Upsert Lead** via `PATCH /sobjects/Lead/OrderLink_External_Id__c/orderlink:lead:{orderRefUuid}` with Lead fields. Include `LeadSource = 'OrderLink Abandoned Cart'`.
2. Mark the `pending_sf_sync` row as `status = 'synced'`.

No invoice upload for leads (they didn't pay).

### 8.5 Error handling / retry semantics

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
