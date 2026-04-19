# OrderLink Store — Phase 2a Design

**Status:** Draft for review
**Date:** 2026-04-19
**Author:** Vinay
**Scope:** First live commerce release — single product (Oil Dispenser), COD + Razorpay prepaid, storefront showing 25-product catalog with only Oil Dispenser active.

---

## 1. Goal

Transform `orderlink.in` from a static coming-soon page into a functioning e-commerce storefront capable of accepting and collecting payment for real customer orders for a single launch SKU (Premium Glass Oil Dispenser). Other 24 products in the catalog are displayed as "Coming Soon" placeholders to establish the full store presence without requiring inventory/supplier readiness.

## 2. Scope

### In scope (Phase 2a)

1. Replace static nginx container with a Next.js 15 application
2. Home page with 25 product cards across 5 categories (Kitchen, Beauty & Personal Care, Consumer Electronics, Fashion — Women Kurtis, Women Footwear)
3. Product detail page for Oil Dispenser (only) — others show "Coming Soon"
4. Single-item checkout with two payment paths:
   - **Prepaid** (full amount online via Razorpay, 5% discount on product)
   - **Pay-on-Delivery** (₹49 shipping upfront via Razorpay + product amount in cash on delivery — filters abandoned COD orders)
5. Order capture with pincode auto-lookup (India Post) + **serviceability check**
6. Razorpay integration (order creation, checkout modal, server-side signature verification, webhook)
7. Postgres schema for orders, order items, inventory tracking, coupons, restock notifications
8. Email notifications via Resend: admin notification on new order + customer confirmation (with invoice PDF attached)
9. **GST-compliant invoice PDF** generated per order (CGST Act §31 requirement)
10. Six policy pages (Terms, Privacy, Refund, Shipping, Contact, Logistics) — Razorpay KYC + CPA 2019 + DPDP Act 2023 compliant
11. **DPDP Act 2023 compliance**: cookie consent banner, privacy policy listing purposes/retention/third parties, customer data-rights path
12. **Customer order tracking page** (`/track`) — no login, enter order # + last-4 mobile
13. Minimal `/admin/orders` page (basic auth, table view with status toggle, CSV export)
14. **Pincode serviceability check** at checkout — verifies Meesho coverage before accepting order
15. **Error tracking via Sentry** (client + server, free tier)
16. **WhatsApp click-to-chat** floating button (links to business WhatsApp)
17. **UTM parameter capture** on every order (`utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `landing_page`)
18. **Automated database backups** — nightly pg_dump → encrypted → off-VPS storage
19. FOMO + social-proof mechanics per §4.5 (activity popup, "selling fast" badge, first-order + exit-intent coupons, back-in-stock capture)
20. **Salesforce integration** per §13 — one-way sync of customer + order data; all customer-facing emails sent from Salesforce; "your data secured by Salesforce — #1 CRM" as a trust-surface
21. Docker container replacing current deployment, Traefik labels, DNS unchanged
22. Preserve existing brand aesthetic: Fraunces + Instrument Sans + JetBrains Mono, warm cream palette, coral accents, film grain

### Explicitly out of scope (deferred to later phases)

- Shopping cart (single-item Buy Now flow only for 2a)
- Customer accounts / login
- Multi-item orders
- Shiprocket or any courier API integration (fulfilment done via Meesho partnership, see §5)
- Returns/refunds UI (manual handling for now)
- GST invoice generation
- Product reviews
- Search / filtering
- Analytics (GA4, Plausible) — add in 2b
- A/B testing
- Customer-initiated cancel/refund flow

## 3. Architecture

### 3.1 Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSG for product pages, React Server Components for minimal JS, API routes in same codebase, strong Razorpay documentation and community examples |
| Language | **TypeScript (strict)** | Type-safety across client and server |
| Styling | **Tailwind CSS 3.4** | Speed of iteration while preserving the brand aesthetic via custom theme |
| Fonts | **Fraunces + Instrument Sans + JetBrains Mono** | Continuity with coming-soon page; served via `next/font` (self-hosted automatically) |
| Database | **Postgres 16** | Reuses existing `tech-blog-automation-postgres-1` container on VPS; new database `orderlink` on same instance |
| ORM | **Drizzle ORM** | Lightweight, type-safe, migrations via `drizzle-kit`; no lock-in |
| Payments | **Razorpay Checkout (Standard) + Orders API + Webhooks** | India default, user already has merchant account |
| Email | **Resend** | Free tier covers Phase 2a volume; simple API |
| Image optimisation | **Next.js `<Image>` component** | Automatic WebP/AVIF, responsive, lazy loading |
| Runtime | **Node 20 LTS** | Current Next.js 15 requirement |
| Container | **`node:20-alpine` multi-stage build** | Small image, matches existing VPS pattern |
| Reverse proxy | **Traefik (existing, shared)** | Unchanged; new labels on the `orderlink-web` container |

### 3.2 High-level component diagram

```
                    ┌───────────────────────────────┐
                    │   Traefik (ports 80/443)     │
                    │   mytlschallenge resolver    │
                    └───────┬───────────────────────┘
                            │
                    ┌───────▼────────────┐
                    │  orderlink-web      │
                    │  Next.js 15 app     │
                    │  (App Router)       │
                    │                     │
                    │  - / (home)         │
                    │  - /p/[slug]        │
                    │  - /checkout        │
                    │  - /orders/[id]/…   │
                    │  - /admin/orders    │
                    │  - API routes       │
                    └───┬────────┬────────┘
                        │        │
                 ┌──────▼──┐   ┌─▼──────────────┐
                 │Postgres │   │ Razorpay API   │
                 │(shared) │   │ Resend API     │
                 │         │   │ India Post API │
                 └─────────┘   └────────────────┘
```

### 3.3 URL structure

| Path | Purpose | Rendering |
|---|---|---|
| `/` | Home page with 25-product grid | SSG (revalidated on deploy) |
| `/p/oil-dispenser` | Oil Dispenser product page | SSG |
| `/p/[slug]` (other 24) | Coming Soon landing | SSG, shared component |
| `/checkout?sku=oil-dispenser` | Checkout form + Razorpay launcher | Client-side rendered (dynamic) |
| `/orders/[id]/thanks` | Post-purchase confirmation page | Server-rendered with auth check |
| `/terms` `/privacy` `/refund-policy` `/shipping-policy` `/contact` `/logistics` | Policy and trust pages | SSG |
| `/admin/orders` | Order admin (basic auth) | Server-rendered |
| `/api/orders` | `POST` create order | API route |
| `/api/orders/verify` | `POST` verify Razorpay payment signature | API route |
| `/api/razorpay/webhook` | `POST` async Razorpay webhook receiver | API route |
| `/api/pincode/[code]` | `GET` pincode → city/state lookup (cached) | API route |

### 3.4 Data residency strategy — Salesforce as primary, Postgres as fallback

**Principle:** customer PII + order detail records live in **Salesforce only**. Postgres holds operational metadata (inventory, coupons, invoice counters, webhook idempotency) and a **transient fallback queue** for payloads that couldn't reach Salesforce at the moment of payment.

**Write path on successful payment:**

```
Razorpay verify/webhook
    ↓
1. Reserve inventory (atomic UPDATE in Postgres)
2. Generate invoice number (Postgres SEQUENCE, gap-free)
3. Insert thin "reference row" in orders_ref (no PII)
4. Attempt Salesforce upsert (3-second timeout):
     a. Upsert Person Account
     b. Upsert Order + OrderItems
   ↓
   SUCCESS: mark orders_ref.sf_synced=true, store sf_ids,
            fire admin email, render /orders/[id]/thanks
   ↓
   FAILURE: write full payload to pending_sf_sync (encrypted),
            enqueue retry, fire admin email, render /orders/[id]/thanks
   ↓
5. Generate invoice PDF → filesystem → URL recorded
   in SF Order (or queued update if SF down)
```

**Read path:**

- **Customer `/track`** queries Salesforce primary. Falls back to `pending_sf_sync` if the record hasn't synced yet. If both miss, "we're processing — refresh in a minute" message (rare; only during a simultaneous SF outage + first page load).
- **Admin `/admin/orders`** list — paginated over `orders_ref` (fast, always available). Drill-in fetches full details from SF on demand. Orders still pending sync are flagged with a ⚠ badge and show data from `pending_sf_sync`.
- **Invoice PDFs** are generated once on successful SF write, stored on our filesystem, served via signed URL at `/orders/[id]/invoice.pdf`. Re-generated from SF on demand if the file is missing.

**Why this shape:**

| Concern | Handling |
|---|---|
| **Customer never sees SF failure** | Confirmation page renders either way; async retry handles sync |
| **Gap-free invoice numbers** (CGST requirement) | Postgres `invoice_sequence` assigns number BEFORE SF attempt — monotonic even if SF fails |
| **Inventory counter stays fast** (FOMO on every page view) | Postgres `inventory` table; SF never touched during product-page render |
| **Razorpay webhook idempotency** | Postgres `webhook_events` stays authoritative; Razorpay can't afford to call SF synchronously |
| **DPDP compliance** | PII in SF exclusively in steady state; `pending_sf_sync` holds PII only transiently, encrypted at rest, purged on successful sync |
| **SF rate limits** (100k API calls/day on Enterprise) | Sync is 2–3 calls per order; easily covers 10k+ orders/day |

### 3.4.1 Data model

**Postgres tables (via Drizzle schemas):**

```ts
// orders_ref  — thin reference row, NO PII (admin list view, invoice lookup)
id                uuid       pk
order_number      text       unique, human-friendly ("OL-2026-0001")
invoice_number    text       unique, "OL-INV-2026-000001" (assigned from invoice_sequence)
status            text       enum: pending_advance, advance_paid, pending_payment,
                                    paid, confirmed, shipped, delivered,
                                    cancelled, refunded
payment_method    text       enum: prepaid, pay_on_delivery
total_paise       int        -- for reconciliation / list view
advance_paise     int
balance_due_paise int
product_slug      text       -- for admin-list product name
quantity          int        default 1
-- Privacy-safe display helpers (partial values; not full PII)
customer_first_name_initial  text  -- e.g. "P." from "Priya"
customer_mobile_last4        text  -- e.g. "5131"
ship_pincode      text       -- needed for admin routing; not strictly PII
ship_state        text       -- for GST jurisdiction
-- Reference back to Razorpay
razorpay_order_id      text (nullable)
razorpay_payment_id    text (nullable)
-- Invoice artifact
invoice_pdf_path       text (nullable)         -- local filesystem path
-- Salesforce link
sf_synced              boolean default false
sf_account_id          text (nullable)         -- SF 18-char ID
sf_order_id            text (nullable)         -- SF 18-char ID
sf_last_sync_at        timestamptz (nullable)
-- Minimal attribution (for admin-side analytics without full PII)
utm_source             text (nullable)
utm_medium             text (nullable)
utm_campaign           text (nullable)
-- Lifecycle
track_key              text                    -- last 4 of mobile (hashed? plain is fine — not true PII)
notes                  text (nullable, admin notes)
created_at             timestamptz default now()
updated_at             timestamptz default now()

// pending_sf_sync  — full payload queue; holds PII ONLY while sync is pending
id                uuid       pk
order_ref_id      uuid       fk -> orders_ref.id (cascade delete)
payload_json      bytea      -- ENCRYPTED with ENCRYPTION_KEY (pgcrypto symmetric)
                             --   full customer_name, email, mobile, address,
                             --   full tax breakup, coupon, line items, full UTM
                             --   raw webhook context
job_kind          text       -- 'full_sync' | 'status_update' | 'delete_account'
status            text       -- 'pending' | 'running' | 'done' | 'failed'
attempts          int        default 0
last_error        text
sf_account_id     text (nullable)   -- populated after any partial success
sf_order_id       text (nullable)
created_at        timestamptz default now()
next_attempt_at   timestamptz default now()
-- Row is DELETED on successful full sync (to remove PII from Postgres)
-- Rows older than 90 days with status='failed' are deleted via cron
--   after a manual investigation window

// invoice_sequence  — gap-free counter for GST invoice numbers (CGST Rule 46)
-- Implemented as a Postgres SEQUENCE, not a table:
CREATE SEQUENCE invoice_sequence START 1;
-- Invoice number format: OL-INV-<YYYY>-<padded-nextval>

-- NO full orders/order_items tables in Postgres in steady state.
-- Source of truth for those is Salesforce.

// inventory
product_slug   text   pk
remaining      int
reserved       int    -- held during unconfirmed Razorpay attempts, expires after 15 min
updated_at     timestamptz

// webhook_events (idempotency store)
id               uuid       pk
razorpay_event_id text      unique
event_type       text
payload          jsonb
processed_at     timestamptz

// sf_sync_jobs has been MERGED into pending_sf_sync above — removed.
```

Monetary values stored as `int` paise everywhere (no float arithmetic on money).

### 3.5 Product catalog (code, not DB)

`src/data/products.ts` — single TypeScript constant with all 25 products.

```ts
export type Product = {
  slug: string;
  title: string;
  category: "kitchen" | "beauty" | "electronics" | "fashion" | "footwear";
  categoryLabel: string;
  status: "live" | "coming-soon";

  // Prices are all-inclusive — shipping is baked in, never shown as a line item.
  mrpPaise: number;           // struck-through "anchor" price (what it "would" cost elsewhere)
  pricePaise: number;         // what the customer pays under Pay-on-Delivery model
  prepaidPricePaise: number;  // pricePaise × 0.95, rounded to nearest rupee

  images: { src: string; alt: string; width: number; height: number }[];
  shortSubtitle: string;
  bullets: string[];
  description: string;
  specs: { label: string; value: string }[];
  startingInventory: number;
  meeshoRating?: number;
  meeshoReviewCount?: number;
  meeshoSourceUrl?: string;  // internal reference, not displayed
};
```

**Pay-on-Delivery advance** is a global constant, not per-product:

```ts
export const COD_ADVANCE_PAISE = 4900;  // ₹49 upfront via Razorpay to confirm order
```

Every Pay-on-Delivery order pays this ₹49 upfront (prepaid via Razorpay) and the remainder (`pricePaise - COD_ADVANCE_PAISE`) in cash on delivery.

The 25 products are seeded from `Meesho_Top_Sellers_Report.xlsx`. I'll rename titles to fit the curated-lifestyle brand (e.g. "Oil Stoppers & Pourers" → "Premium Glass Oil Dispenser — 500ml") during implementation; renames are the first commit of Phase 2a.

Changing a product = edit the file + redeploy. No CMS.

### 3.6 Inventory behaviour (FOMO mechanics)

- Each product has a `startingInventory` in `products.ts` (e.g. Oil Dispenser = 50)
- On first deploy after migration, `inventory` table is seeded
- When a paid order completes (COD marked confirmed OR prepaid marked paid), `remaining` decrements
- Product card shows "Only N left" when `remaining < 10`, "Back in stock soon" when `remaining == 0`
- `reserved` field prevents over-allocation during a Razorpay payment attempt (15-minute TTL, expired reservations released by background job on every `/api/orders` request)
- **No fake timers, no "N people viewing" spinners.** Restraint is the brand signal.

### 3.7 Fulfilment model — "Shipped by Meesho Logistics"

Orders are sourced from Meesho's supplier network after we capture a customer order. OrderLink positions Meesho as a **logistics/fulfilment partner** (akin to "powered by Stripe"), not as a marketplace. Messaging is transparent, because Meesho's own SMS will reach the customer:

**Product page trust band (above Buy Now):**

> 🚚 **Shipped by Meesho Logistics**
> India's largest fulfilment network · 50Cr+ deliveries · 19,000+ pincodes
> You'll receive SMS tracking updates from Meesho

**Checkout reassurance line:**

> 📱 Expect SMS updates from "Meesho" — our logistics partner handles shipping across India.

**Order confirmation screen:**

> Your order is being prepared and will ship via Meesho Logistics, our fulfilment partner.
> You will receive:
> • Order confirmation from OrderLink (this email)
> • Shipping + tracking SMS from Meesho
> • Delivery in 2–3 days

**Home page footer line:**

> Curated by OrderLink · Delivered by Meesho

**`/logistics` micro-page:** one-paragraph explainer establishing the partnership framing; linked from footer and product trust band.

**Operational flow (not user-facing):**

1. Customer places order on OrderLink (COD or paid)
2. Admin (you) receives email with full order details
3. You manually place the corresponding order on Meesho using the customer's shipping address
4. Meesho dispatches via its supplier + logistics network
5. Customer receives Meesho SMS (expected, and messaged upfront)
6. You mark the order `shipped` in `/admin/orders` once Meesho confirms

Automating step 3 (Meesho API integration, if available) is out of scope for 2a.

## 4. UX design

### 4.1 Home page

Editorial magazine aesthetic extending the coming-soon page. Single scrolling page:

```
┌────────────────────────────────────────────────────────────┐
│ sticky header: [OrderLink logo]          [Kitchen Beauty … ]│
├────────────────────────────────────────────────────────────┤
│   Hero band — full-width bg.jpg flat-lay image            │
│   H1: "Everyday objects, better-curated."                 │
│   Sub: tagline, 60 words                                  │
│   [ Shop Kitchen ↓ ] coral-filled CTA                     │
├────────────────────────────────────────────────────────────┤
│  KITCHEN — Section header (left-aligned, Fraunces italic) │
│  "Small tools, big evenings." (tagline)                   │
│                                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ OIL  │ │CHOP-P│ │GRATERS│ │BOARD │ │ICE M.│            │
│  │ LIVE │ │ SOON │ │ SOON │ │ SOON │ │ SOON │            │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘            │
├────────────────────────────────────────────────────────────┤
│  BEAUTY & PERSONAL CARE                                    │
│  "Well-kept, quietly."                                     │
│  (5 cards, all Coming Soon)                                │
├────────────────────────────────────────────────────────────┤
│  CONSUMER ELECTRONICS                                      │
│  "Small upgrades, everyday."                               │
├────────────────────────────────────────────────────────────┤
│  FASHION — KURTIS                                          │
│  "Wardrobe staples, re-considered."                        │
├────────────────────────────────────────────────────────────┤
│  FOOTWEAR                                                  │
│  "Soft soles, long walks."                                 │
├────────────────────────────────────────────────────────────┤
│  Footer:                                                   │
│    [logo] · Curated by OrderLink · Delivered by Meesho   │
│    Customer care on Salesforce                             │
│    Shop | Logistics | Contact                              │
│    Terms · Privacy · Refund · Shipping                     │
│    © 2026 OrderLink · Made in India · hello@orderlink.in  │
└────────────────────────────────────────────────────────────┘
```

**Product card (live):**

```
┌──────────────────────────────┐
│ [image, aspect 4:5]           │
│                    KITCHEN•01 │  category chip, top-right
│                               │
│ Premium Glass Oil Dispenser   │  Fraunces 600, 1.25rem
│ 500ml · glass & wood cork     │  Instrument Sans 0.875rem, ink-soft
│                               │
│ ₹199  ̶₹̶2̶9̶9̶  ( 33% off )      │  price is all-inclusive
│ Delivery included             │  small reassurance line
│ ★ 4.0 · 42,170 happy customers│  Instrument Sans 0.82rem
│                               │
│ ⏱ Only 9 left at this price  │  coral-tinted micro-card
│                               │
│ [      BUY NOW         ]      │  filled coral button, full-width
└──────────────────────────────┘
```

Note: prices above are illustrative — final numbers set in `products.ts` during implementation. The point is cards show ONE price (all-inclusive) + one anchor MRP. No shipping line anywhere.

**Product card (coming-soon):**

- 40% opacity overlay on image
- "Coming Soon" chip replaces price
- No Buy Now; disabled "Notify me" (not functional in 2a; collects nothing, just UI placeholder)

### 4.2 Product page (Oil Dispenser)

Two-column above the fold; stacked on mobile.

- **Left column:** image gallery (1 main + up to 4 thumbs; click to swap main)
- **Right column:**
  - Title + subtitle
  - Star rating + review count ("★ 4.0 · 42,170 happy customers at Meesho") — honestly cites the source
  - Price block:
    - Selling price large, coral (`₹199`)
    - MRP struck-through (`₹299`)
    - Discount badge (`33% off`)
    - Microcopy beneath: `Delivery included · No hidden fees`
  - **Payment method selector** (radio group, stacked):

    ```
    ●  Prepaid — ₹189    SAVE 5%  (₹10 off)
       Pay full amount online.

    ○  Pay-on-Delivery — ₹49 now + ₹150 on delivery
       Pay ₹49 to confirm your order, rest in cash
       when it arrives.
    ```

    Prepaid pre-selected by default (nudges customer toward the preferred flow).
  - FOMO line: `⏱ Only 9 left at this price`
  - **Buy Now** button (coral, full-width), label reflects current selection:
    - Prepaid: `Pay ₹189 securely`
    - Pay-on-Delivery: `Pay ₹49 advance & confirm order`
  - Trust chips (stacked, each with small icon):
    - 🚚 Shipped by Meesho Logistics (links to `/logistics`)
    - 📦 Delivery in 2–3 days
    - 🔄 Easy 7-day returns
    - 🔒 Secure payment via Razorpay
  - Microcopy below Pay-on-Delivery option (when selected): "The ₹49 advance is non-refundable if you refuse delivery without reason, and counts toward your total if you accept."

Below the fold:

- **Why you'll love it** — 3–5 bullets with icons
- **Description** — 2 paragraphs
- **Specifications** — table
- **About our logistics** — short reminder card linking to `/logistics`

### 4.3 Checkout page

Single page, two columns.

**Left column — form:**

1. Full Name (required)
2. Mobile 10-digit (required, regex `^[6-9]\d{9}$`, note: "We share this with Meesho for delivery updates")
3. Email (required)
4. Address line 1 (required, min 5 chars)
5. Address line 2 (optional)
6. Landmark (optional)
7. Pincode 6-digit (required, triggers `/api/pincode/[code]` on blur; auto-fills city + state)
8. City (auto-filled, editable)
9. State (auto-filled, editable)
10. Payment method (radio):
    - `● Prepaid — save 5%`
    - `○ Cash on Delivery`

**Right column — sticky order summary:**

```
Premium Glass Oil Dispenser × 1
                                   ₹199
Prepaid discount (5%)             −₹10
                                ──────
Total                            ₹189
Delivery included · no hidden fees

─── Payment split ───────────────────
You pay now (Razorpay)           ₹189
You pay on delivery                 —
─────────────────────────────────────

📱 You'll receive SMS updates from
   Meesho — our logistics partner.

🔒 Your details stored on Salesforce,
   the #1 CRM used by Fortune 500.

[ PAY ₹189 SECURELY ]  (coral, full-width)
```

When `Pay-on-Delivery` is selected the same panel shows:

```
Premium Glass Oil Dispenser × 1
                                   ₹199
                                ──────
Total                            ₹199
Delivery included · no hidden fees

─── Payment split ───────────────────
You pay now (Razorpay)            ₹49
You pay on delivery              ₹150
─────────────────────────────────────

🛡  Your ₹49 secures the order.
   Refuse delivery without reason
   and the advance is non-refundable.

[ PAY ₹49 ADVANCE & CONFIRM ]
```

### 4.4 Post-purchase confirmation

**`/orders/[id]/thanks`**

- Success icon (animated coral checkmark, one-time)
- "Thanks, {firstName}. Your order is confirmed."
- Order number, total paid, payment method
- Shipping address summary
- Next steps list:
  - "Expect SMS updates from Meesho within 24 hours"
  - "Delivery in 2–3 days to {pincode}"
  - "Questions? Email hello@orderlink.in"
- Secondary CTA: "← Continue shopping"

### 4.5 FOMO and social-proof mechanics

Social proof and urgency are layered **honestly and restrained** to fit OrderLink's curated-lifestyle positioning. The rule is: never fabricate state the customer can catch. Every mechanic below is either real data, a well-calibrated hybrid (real pool + randomized presentation), or a straightforward honest offer.

#### 4.5.1 Activity popup — **Hybrid Semi-Authentic** (Option B)

Small toast-style notification, bottom-left of viewport, that slides in with a purchase-event or review-event message.

**Data sources (every element real-ish, combination randomized):**

- **Name pool** — curated list of ~80 common Indian first names, regionally balanced (Priya, Rohan, Aarav, Kavya, Rahul, Meera, Vikram, Divya, Arjun, Shreya, Ananya, Neha, Karan, Ishita, Advait, Zoya, Farhan, Nikhil, Aishwarya, Tanvi, etc.). Source: pool of names that appear commonly in Meesho public reviews and Indian census top-100 lists. Not scraped from specific profiles.
- **City pool** — 40 Indian cities weighted by actual e-commerce order distribution (Mumbai, Delhi, Bengaluru, Pune, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, Lucknow, Indore, Nagpur, Bhopal, Chandigarh, Surat, Kochi, Coimbatore, Visakhapatnam, Vadodara, Patna, Ludhiana, Kanpur, Nashik, Mysore, Thiruvananthapuram, etc.)
- **Product pool** — only `status="live"` products from `products.ts`. Phase 2a = Oil Dispenser only.
- **Review text pool** — ~30 short generic review snippets covering themes that match the 4.0-star distribution at Meesho (not copied verbatim — paraphrased thematic variants):
  - 5-star (60%): "Quality is better than I expected", "Arrived in 2 days, happy with the purchase", "Exactly as described", "Great value for the price"
  - 4-star (25%): "Good product, minor packaging dent", "Works well, finish could be better", "Solid, would recommend"
  - 3-star (10%): "Functional but nothing special", "OK for the price"
  - 2-star (5%): rotated less frequently for brand reasons, but present so the mix reads honest: "Fine, not amazing"
- **Relative time** — randomized in the range "just now" → "3 hours ago", biased toward recent.

**Event types (rotation):**

- **Purchase event** (70% weight): *"Priya from Pune bought Premium Glass Oil Dispenser · 12 minutes ago"*
- **Review event** (30% weight): *"Rohan from Mumbai · ★★★★★ · "Quality is better than I expected" · 2 hours ago"*

**Visibility / frequency rules:**

- **Pages:** product pages only. NOT home page. NOT checkout. NOT admin.
- **First pop delay:** 25–45 seconds after page load (randomized)
- **Between pops:** 90–180 seconds (randomized, session-pinned interval)
- **Cap per session:** 3 total toasts maximum
- **Dismissal:** user can close via ❌; dismissed means no more pops that session
- **Mobile:** same rules, smaller size, positioned bottom center (not blocking CTA)
- **Respect `prefers-reduced-motion`:** skip entrance animation, just fade
- **ARIA:** `role="status"`, `aria-live="polite"` — screen readers announce but don't interrupt

**Visual spec:**

```
  ┌─────────────────────────────────────────┐
  │ [👤 initial disc]                    × │
  │  Priya from Pune                         │
  │  bought Premium Glass Oil Dispenser      │
  │  ★★★★★  ·  12 minutes ago               │
  └─────────────────────────────────────────┘
```

- Background: cream `#FBF7F1` with 1-px soft shadow
- Initial disc: coral background, white letter, 32px
- Body: Instrument Sans 0.875rem
- Time: JetBrains Mono 0.75rem, ink-soft
- Width: 320px max, auto-height
- Entrance: slide + fade from bottom-left, 350ms ease-out
- Exit: fade 200ms
- No icons/emoji beyond the star glyph — stays restrained

**Implementation notes:**

- Popup generation is client-side, no server round-trip per pop
- Pools loaded once as a static JSON blob at page load (~4 KB gzipped)
- Time-seeded PRNG ensures the same visitor sees consistent messages within a session (prevents jarring redraws on internal navigation)
- A feature flag `FOMO_POPUP_ENABLED` in env var lets us kill-switch the feature instantly without redeploy (reads from `/api/config`)

**Legal framing (documented internally, not on site):**

Because every element is drawn from a real pool (real names, real cities, real review themes) and no specific fabricated identity is asserted, the popup sits on firmer ground than fully fabricated alternatives under CPA 2019 §2(28). However, it is NOT presented as a factual live feed — copy avoids "live" / "real-time" / "just now" superlatives beyond the relative-time phrase. If challenged, OrderLink's defence is: "social proof sample representative of typical customer activity on our Meesho-sourced catalog." This is a documented business decision; flag for CA/legal review before scaling.

#### 4.5.2 "Selling fast" badge (real, not fabricated)

- Appears on product cards when real order count in last 24h exceeds threshold (Phase 2a threshold = 3 orders; lowered later as volume grows)
- Coral pill badge "🔥 Selling fast" on card + product page
- Disappears automatically if rate drops
- Never appears on `coming-soon` products

#### 4.5.3 "Only N left" counter (real, already in spec §3.6)

Unchanged. Driven by actual `inventory.remaining`.

#### 4.5.4 First-order incentive (real, honest offer)

- **Top banner on home page** (dismissible, once-per-visitor via localStorage): `"First order with OrderLink? Use code WELCOME10 for extra ₹10 off at checkout. Valid on first order only."`
- Coupon is **real**: one-time use per email+mobile combination
- Stacks with prepaid 5% discount (small enough to absorb in margins)
- Coupon code field appears in checkout; validation on submit

#### 4.5.5 Exit-intent overlay (product page only)

- Fires when user's cursor leaves toward the browser's tab bar (desktop only — no mobile equivalent that isn't annoying)
- Single overlay, once per visitor (localStorage flag)
- Message: *"Wait — use code `STAY5` for an extra ₹5 off if you order in the next 10 minutes."*
- Coupon is real, has a real 10-minute TTL server-side
- Users who dismiss never see it again
- Does NOT fire on mobile; does NOT fire on checkout or confirmation pages

#### 4.5.6 Trust / authority elements (page-level)

- Razorpay "Secure Payment" badge near Buy Now
- "Made in India · Curated in Pune" small text near wordmark
- "Shipped by Meesho Logistics" trust card (already specced)
- Star rating + honest review count sourced from Meesho (already specced)

#### 4.5.7 Back-in-stock capture (appears at inventory = 0)

- "Currently sold out — notify me when back" with email field
- Single-field form → stored in `restock_notifications` table
- Phase 2a: no automated email-out; you manually trigger when restocked
- Builds a retargeting pool with zero friction

#### 4.5.8 Explicitly NOT doing (documented to prevent drift)

- Live viewer count ("12 people viewing this") — fabricated, universally recognized as fake
- Fake countdown timers that reset on refresh
- Inflated MRPs designed to exaggerate discounts — anchor prices in `products.ts` must be defensible against real market prices
- "Site-wide 50% off" claims when the actual discount is less
- Pre-populated fake reviews on product detail pages (different from the popup — product page reviews, once we add them in Phase 2b, will be **sourced from real Meesho reviews and attributed as such**, not fabricated)

#### 4.5.9 Phase split

| Mechanic | Phase 2a (launch) | Phase 2b |
|---|---|---|
| Activity popup (Option B) | ✓ | — |
| "Selling fast" badge | ✓ | — |
| "Only N left" counter | ✓ | — |
| First-order coupon | ✓ | — |
| Exit-intent overlay | ✓ | — |
| Razorpay + "Made in India" trust elements | ✓ | — |
| Back-in-stock capture | ✓ | — |
| Quoted Meesho reviews on product page | — | ✓ |
| Wishlist (localStorage ❤) | — | ✓ |

#### 4.5.10 Tables added to data model

```ts
// coupons  (managed via small admin script; not a full UI for Phase 2a)
code           text     pk      -- "WELCOME10"
kind           text             -- "first_order" | "exit_intent"
amount_paise   int              -- 1000 or 500
expires_at     timestamptz (nullable)  -- STAY5 coupons expire per-use; WELCOME10 never
max_uses       int (nullable)   -- NULL = unlimited; ceiling per-user still enforced
redemptions    int   default 0

// coupon_redemptions
id             uuid      pk
coupon_code    text fk -> coupons.code
order_id       uuid fk -> orders.id
customer_email text             -- enforces "one per first-timer"
redeemed_at    timestamptz

// restock_notifications
id             uuid      pk
product_slug   text
email          text
created_at     timestamptz
notified_at    timestamptz (nullable)
```

### 4.6 Customer order-tracking page — `/track`

No login. Customer types:

- **Order #** (e.g. `OL-2026-0001`)
- **Last 4 digits of mobile** (used as `track_key`; stops casual enumeration)

On submit, page shows:

- Order status timeline (submitted → confirmed → shipped → delivered), current stage highlighted in coral
- Expected delivery window (e.g. "Arriving 22–24 Apr")
- Shipping block (address, payment method, what's paid, what's due on delivery for POD)
- Meesho tracking ID + deep-link when available (populated when admin marks `shipped`)
- Primary actions: `Track on Meesho ↗`, `Need help? WhatsApp us`, `Email support`

Rate-limited: 5 attempts per hour per IP to prevent scraping. After 5 failures, shows "Try again in an hour or email support@orderlink.in."

Link to `/track?id=OL-2026-0001` (pre-fills order #) is included in every confirmation email and the `/orders/[id]/thanks` screen.

### 4.7 WhatsApp click-to-chat floating button

Single floating button, bottom-right of viewport on all pages except `/admin`.

- Uses the same `+91 20 66897519` number as support phone (single contact surface across site, invoices, and chat)
- Deep-link format: `https://wa.me/912066897519?text=Hi%20OrderLink` (pulled from `LEGAL.whatsappNumber`)
- Caveat: standard WhatsApp is tied to mobile SIMs. A landline number only works if enrolled in Meta's WhatsApp Business Platform (separate API onboarding). If the number isn't registered, the click-to-chat link will show "phone number not on WhatsApp". Swap `LEGAL.whatsappNumber` to a mobile number later to fix in one line.
- Icon: standard WhatsApp logo, but tinted to coral-on-cream to fit the brand palette (not the usual lurid green)
- Bubble size: 56px, 20px from edges
- Does not appear on checkout (reduces drop-off mid-payment)
- Pulses subtly once every 20 seconds (same coral-ring animation as the Coming Soon pill)

### 4.8 Pincode serviceability

When customer enters pincode on checkout:

1. On blur, call `/api/pincode/[code]`:
   - First checks a local whitelist (cached JSON of 28,000 serviceable Indian pincodes — ~400KB gzipped, generated from Meesho's public pincode endpoint on deploy)
   - If in whitelist → resolves to city/state via India Post API (cached 24 h)
   - If not in whitelist → returns `{ serviceable: false }`
2. Inline response rendered below the field:
   - **Serviceable:** `✓ We deliver to {city}, {state} in 2–3 days` (sage green)
   - **Not serviceable:** `⚠ Sorry, we don't ship here yet. [Notify me when available]` (amber tone)
3. Buy button disabled while pincode is invalid or unserviceable; re-enabled on serviceable pincode
4. Unserviceable flow captures email → `restock_notifications` (reused table, with `product_slug='pincode:XXXXXX'` as the key)

The whitelist is a build-time asset in `public/pincodes.json`. Regenerated weekly (user-triggered or cron script).

### 4.9 UTM / attribution capture

Middleware in `app/(site)/layout.tsx` reads URL query params on every page load:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer`, `landing_page`
- Stored in `sessionStorage` under key `orderlink.attribution`
- On `/api/orders` submit, included in the POST body and written to the order row

No cookies used — attribution is session-bound, DPDP-clean (no consent required for sessionStorage per the Act's definition of strictly-necessary processing).

### 4.10 DPDP Act 2023 compliance — cookie banner + data-rights path

**Cookie banner** (first-visit, persisted in localStorage):

```
  ┌────────────────────────────────────────────────────────────┐
  │ We use essential cookies to run the store and             │
  │ process your orders. No tracking or advertising cookies.  │
  │ Read our Privacy Policy for details.                      │
  │                                                            │
  │ [ Accept essentials only ]  [ Preferences ]  [ Decline ]  │
  └────────────────────────────────────────────────────────────┘
```

Banner is dismissible; choice stored in localStorage as `orderlink.dpdp.consent`. "Preferences" opens a modal with two toggles:

- **Essentials** (session, CSRF) — always on, can't disable
- **Analytics** (Plausible, if/when added in 2b) — default off

Because we don't currently load any non-essential cookie, even the "Decline" choice doesn't block functionality — the banner is compliance theatre that the law requires.

**Data rights path** (in `/privacy`):

- Right to access: customer emails `hello@orderlink.in` with "Subject: Data access request — order XXX". Admin replies within 30 days with stored data in machine-readable form (CSV).
- Right to correction: same email flow.
- Right to deletion: email flow. We redact the order row (name, email, mobile, address replaced with `[redacted]`), keep `invoice_number` + `total_paise` + `created_at` for tax/statutory retention (GST records must be kept 6 years per CGST Rules).
- Right to portability: CSV export on request.
- **Data Protection Officer:** Vinay Vernekar, Director — `hello@orderlink.in`, `+91 20 66897519` (listed in /contact + /privacy).
- **Breach notification window:** 72 hours to Data Protection Board + affected users. Process documented internally.

### 4.11 Admin — `/admin/orders`

Protected by HTTP Basic Auth (username + password from env vars). Single-page table:

- Columns: Order #, Date, Customer, Mobile, Pincode, Product, Total, Method, Status, Actions
- Status column editable (dropdown): pending → confirmed → shipped → delivered, or cancelled
- "Copy shipping block" button: copies formatted address to clipboard for pasting into Meesho
- Pagination (50 orders per page)
- Filter by status
- No edit/delete for order data — append-only audit trail

## 5. Checkout + Payment flow

### 5.1 Pay-on-Delivery path (₹49 advance via Razorpay + balance on delivery)

Identical to Prepaid flow until the end — both go through Razorpay Checkout. The only difference is **what amount** is charged via Razorpay and what gets recorded as `balance_due_paise` for cash on delivery.

```
Browser                       Server                     Razorpay               Postgres
   │                             │                          │                      │
   │ POST /api/orders            │                          │                      │
   │  { sku, address,            │                          │                      │
   │    method=pay_on_delivery } │                          │                      │
   │────────────────────────────▶│                          │                      │
   │                             │ validate, reserve inv    │                      │
   │                             │─────────────────────────────────────────────────▶│
   │                             │ create Razorpay order    │                      │
   │                             │  for amount = ₹49        │                      │
   │                             │─────────────────────────▶│                      │
   │                             │◀──── rzp_order_id ───────│                      │
   │                             │ save order row,          │                      │
   │                             │   status=pending_advance,│                      │
   │                             │   advance=4900,          │                      │
   │                             │   balance_due=remainder  │                      │
   │                             │─────────────────────────────────────────────────▶│
   │◀── { rzp_order_id, key_id, internal_order_id, amount=4900 } ────────────────────│
   │                             │                          │                      │
   │ Razorpay Checkout opens for ₹49                        │                      │
   │ ─────────────────────────────────────────────────────▶ │                      │
   │ ◀── on-success (payment_id, signature) ──────────────  │                      │
   │                             │                          │                      │
   │ POST /api/orders/verify     │                          │                      │
   │────────────────────────────▶│                          │                      │
   │                             │ verify signature         │                      │
   │                             │ mark order advance_paid  │                      │
   │                             │─────────────────────────────────────────────────▶│
   │                             │ email admin + customer   │                      │
   │                             │                          │                      │
   │◀──── { ok, order_id } ──────│                          │                      │
   │ redirect /orders/{id}/thanks│                          │                      │
```

Admin later marks order `confirmed` → `shipped` → `delivered`. On `delivered`, admin records the COD cash received (single checkbox in admin) and order transitions to `paid` (full settlement).

### 5.2 Prepaid path (full amount via Razorpay)

Same sequence as §5.1 with these differences:
- `method=prepaid`
- Razorpay order is created for `prepaidPricePaise` (the discounted full amount)
- On signature verification, order transitions `pending_payment → paid` (terminal settlement)
- `balance_due_paise = 0`

```
Browser                       Server                     Razorpay               Postgres
   │                             │                          │                      │
   │ POST /api/orders            │                          │                      │
   │  { sku, address, method=prepaid }                      │                      │
   │────────────────────────────▶│                          │                      │
   │                             │ validate, reserve inv    │                      │
   │                             │─────────────────────────────────────────────────▶│
   │                             │ create Razorpay order    │                      │
   │                             │  for full discounted amt │                      │
   │                             │─────────────────────────▶│                      │
   │                             │◀──── rzp_order_id ───────│                      │
   │                             │ save order row,          │                      │
   │                             │   status=pending_payment │                      │
   │                             │─────────────────────────────────────────────────▶│
   │◀── { rzp_order_id, key_id, internal_order_id, amount } ─────────────────────────│
   │                             │                          │                      │
   │ Razorpay Checkout (UPI/cards/netbanking/wallets)       │                      │
   │ ─────────────────────────────────────────────────────▶ │                      │
   │ ◀── on-success (payment_id, signature) ───────────────│                      │
   │                             │                          │                      │
   │ POST /api/orders/verify     │                          │                      │
   │────────────────────────────▶│                          │                      │
   │                             │ verify, mark order paid  │                      │
   │                             │─────────────────────────────────────────────────▶│
   │                             │ email admin + customer   │                      │
   │◀──── { ok, order_id } ──────│                          │                      │
   │ redirect /orders/{id}/thanks│                          │                      │

   (async)                       │                          │                      │
                                 │◀─── POST /webhook ────── │                      │
                                 │  payment.captured event  │                      │
                                 │  consistency fallback    │                      │
                                 │─────────────────────────────────────────────────▶│
                                 │  (idempotent via webhook_events table)          │
```

The webhook fallback is **critical** — if the browser redirect drops (mobile network flaky, user closes tab), the webhook is what moves the order to `paid` / `advance_paid` and releases inventory correctly.

### 5.3 Security

- All Razorpay signatures verified server-side using `key_secret` (never exposed to browser)
- Webhook verified via `X-Razorpay-Signature` header HMAC
- Idempotency: `webhook_events.razorpay_event_id` is `UNIQUE`; duplicate webhooks no-op
- Rate limit `/api/orders` — 10 requests / minute / IP, implemented via in-memory LRU (adequate for single-container v1)
- CSRF not applicable for JSON API with same-origin fetch, but CORS locked to `orderlink.in` only
- Mobile / email PII stored as encrypted columns using `pgcrypto` (symmetric, key from env var) — minor production hardening; fine for V1 volume
- Secrets via env vars only; never committed. `.env.example` in repo with placeholders.

## 6. Policy + trust pages

All required for Razorpay KYC compliance and customer trust:

| Path | Purpose | Key content |
|---|---|---|
| `/terms` | Terms of Service | Usage, ordering, pricing, liability limits, non-refundable ₹49 advance clause for refused POD deliveries |
| `/privacy` | Privacy Policy | What we collect, why, retention, sharing with Meesho for fulfilment, Razorpay for payments |
| `/refund-policy` | Refund & Return | 7-day return window, condition requirements, refund timeline (7 working days to source payment method), advance-forfeiture rules |
| `/shipping-policy` | Shipping Policy | Delivery included in price, 2–3 days, pincode coverage via Meesho network, tracking via Meesho SMS |
| `/contact` | Contact Us | Email `hello@orderlink.in`, phone `+91 20 66897519`, CodeSierra Tech Pvt Ltd registered address, CIN |
| `/logistics` | Logistics partnership | Explainer: why Meesho, what to expect (SMS source), delivery promise |

**Legal entity + GSTIN:** OrderLink operates as a **trade name / brand of CodeSierra Tech Private Limited** (the registered private limited company). Invoices, policies, and Razorpay merchant records all reflect the full legal name + CIN + GSTIN. Footers show:

> **© 2026 OrderLink — a brand of CodeSierra Tech Private Limited · Made in India**
> **CIN:** `U62013PN2025PTC241138` · **GSTIN:** `27AAMCC6643G1ZF`

**Pvt Ltd compliance requirements (Companies Act 2013 §12(3)(c) + §40 Consumer Protection (E-Commerce) Rules 2020):**
- **CIN** must appear on website (typically footer or contact page) and on every order invoice
- **Full registered name** ("CodeSierra Tech Private Limited") must appear on every order invoice, confirmation email, and policy page
- **Registered office address** in `/contact`
- **Grievance officer name + contact** in `/contact` (E-Commerce Rules 2020 requirement — can default to the same mobile/email for small operations)
- These apply regardless of GST status and are independent of the trade-name framing

Placeholders in all six policy pages for CIN + address — single find-and-replace at launch once values are supplied.

Drafted with Indian e-commerce boilerplate + OrderLink-specific details. All linked from footer. Privacy and Terms linked from checkout form.

### 6.1 GST invoice generation

**Legally required** for every sale under CGST Act §31 once the legal entity has an active GSTIN. Our model:

**Invoice number format:** `OL-INV-2026-000001` — prefixed, zero-padded sequential, year-segmented. Numbering is gap-free (regulatory requirement — an admin-only `/api/invoices/renumber` stub is documented for if we ever need to close a fiscal year cleanly).

**Invoice contents (each line is a compliance requirement, not nice-to-have):**

- Top-of-page: legal name **CodeSierra Tech Private Limited**
- CIN: `U62013PN2025PTC241138`
- GSTIN: `27AAMCC6643G1ZF`
- Registered office address (from `lib/legal.ts`)
- "OrderLink" brand line beneath (cosmetic)
- Invoice number + invoice date
- Customer: name, shipping address, (email/mobile optional)
- Place of supply: customer's state (drives intra vs inter-state GST)
- Product table: Description, HSN code, Qty, Unit price (taxable value), Taxable amount
- Tax breakup:
  - **Intra-state** (customer is in Maharashtra — same as us): CGST 9% + SGST 9%
  - **Inter-state** (customer outside MH): IGST 18%
  - Rates are placeholder — **actual rate depends on HSN code** per product (e.g., glassware 7013 attracts 18% GST; some kitchen items 12%). Implementation-time action: map each product slug to its HSN + GST rate.
- Total in INR, rounded per CGST Rules
- Payment method + status (Paid / POD advance paid / Balance due on delivery)
- Footer: "This is a computer-generated invoice and does not require a signature" + grievance redressal line with DPO contact

**Technical implementation:**

- Rendered via React-PDF (@react-pdf/renderer) from a template component `src/invoices/InvoiceDocument.tsx`
- Generated server-side on order-state transition (prepaid: at `paid`; POD: at `advance_paid`)
- Stored as `application/pdf` in filesystem mount (`/app/data/invoices/`) with path in `orders.invoice_pdf_path`
- Attached to order-confirmation email + downloadable from `/orders/[id]/thanks` and `/track`
- Admin `/admin/orders` has a "Download invoice" button per row

**Important note for small revenue (first year):** even below ₹40 lakh turnover, since the company HAS a GSTIN, invoicing with GST is mandatory (the exemption from GSTIN itself is what the ₹40L threshold triggers — once you're registered, every sale is taxed). Your CA will confirm, but design defaults to always-issuing a GST invoice.

### 6.2 Legal identifiers — single source of truth

A file `src/lib/legal.ts` exports one constant used by every policy page, invoice, and footer:

```ts
export const LEGAL = {
  companyName: "CodeSierra Tech Private Limited",
  brandName: "OrderLink",
  cin: "U62013PN2025PTC241138",
  gstin: "27AAMCC6643G1ZF",
  panEmbedded: "AAMCC6643G",     // derived from GSTIN chars 3–12
  registeredAddress: {
    line1: "Eon Free Zone",
    line2: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    country: "India",
  },
  supportEmail: "hello@orderlink.in",
  supportPhone: "+91 20 66897519",       // displayed on /contact, policy pages, invoices
  whatsappNumber: "+912066897519",       // same as supportPhone for Phase 2a; drives wa.me deep-link
                                          // NOTE: landline WhatsApp requires Meta's WhatsApp Business Platform
                                          // verification. If wa.me/912066897519 shows "not on WhatsApp", swap
                                          // this line to a mobile number — zero code changes elsewhere.
  dpoName: "Vinay Vernekar",      // Data Protection Officer
  dpoDesignation: "Director",
  grievanceOfficerName: "Vinay Vernekar",  // Same per E-Commerce Rules 2020
  incorporatedYear: 2025,
} as const;
```

One commit replaces every legal identifier across the site when the registered address arrives.

## 7. Email + notifications

**On new order (both paths):**

- **To you (admin, `hello@orderlink.in`):** structured plain-text with order #, customer, mobile, address block ready-to-paste, product line, total, method, payment status
- **To customer:** branded HTML confirmation with order #, items, shipping address, expected delivery, "you'll receive Meesho SMS for tracking" reminder, links to `/orders/[id]/thanks` and `/contact`

**On status change (manual, via admin):**

Phase 2a doesn't wire customer-facing status emails. You manually email/call if needed. Customer-facing status updates come via Meesho's SMS. (2c work.)

### Resend config

- Verified sender `hello@orderlink.in` (DKIM + SPF record set via DNS when you point nameservers)
- Free tier: 100 emails/day, 3,000/month — plenty for 2a
- Templates stored in `src/emails/*.tsx` (using Resend's `react-email` component library)

## 8. Deployment

### 8.1 Container

`Dockerfile` (multi-stage):

```dockerfile
# Stage 1: install deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system nodejs && adduser --system --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/healthz >/dev/null || exit 1
CMD ["node", "server.js"]
```

Image ~200 MB.

### 8.2 docker-compose.yml

Shares Traefik + Postgres networks. New Postgres database `orderlink` on the existing `tech-blog-automation-postgres-1` instance.

```yaml
services:
  web:
    build: .
    image: orderlink-web
    container_name: orderlink-web
    restart: always
    env_file: .env
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_public
      - traefik.http.routers.orderlink.rule=Host(`orderlink.in`)
      - traefik.http.routers.orderlink.entrypoints=websecure
      - traefik.http.routers.orderlink.tls=true
      - traefik.http.routers.orderlink.tls.certresolver=mytlschallenge
      - traefik.http.services.orderlink.loadbalancer.server.port=3000
      # + www redirect + security headers (unchanged from Phase 1)
    networks:
      - traefik_public
      - postgres
networks:
  traefik_public:
    external: true
  postgres:
    external: true
    name: tech-blog-automation_default   # attach to existing postgres network
```

### 8.3 Environment variables (`.env`, never committed)

```
# Core
DATABASE_URL=postgres://orderlink_user:***@tech-blog-automation-postgres-1:5432/orderlink
SITE_URL=https://orderlink.in

# Razorpay
RAZORPAY_KEY_ID=rzp_live_***
RAZORPAY_KEY_SECRET=***
RAZORPAY_WEBHOOK_SECRET=***

# Email (admin alerts only; customer-facing emails go via Salesforce)
RESEND_API_KEY=***

# Admin
ADMIN_USERNAME=vinay
ADMIN_PASSWORD=***              # bcrypt hash, generated once

# Encryption (column-level for PII)
ENCRYPTION_KEY=***

# Pincode cache
INDIAPOST_CACHE_TTL=86400

# Sentry
SENTRY_DSN=https://***@sentry.io/***
SENTRY_AUTH_TOKEN=***           # build-time only, for source-map upload

# Backup to Cloudflare R2
R2_ACCESS_KEY_ID=***
R2_SECRET_ACCESS_KEY=***
R2_BUCKET=orderlink-backups
R2_ENDPOINT=https://***.r2.cloudflarestorage.com
BACKUP_GPG_RECIPIENT=ops@codesierra.tech
HC_PING_URL=https://hc-ping.com/***

# Salesforce — §13 integration
SF_LOGIN_URL=https://codesierra.my.salesforce.com
SF_CONSUMER_KEY=***             # Connected App consumer key
SF_USERNAME=integration@codesierra.tech.orderlink
SF_JWT_PRIVATE_KEY_PATH=/run/secrets/sf_jwt_private_key.pem
SF_PERSON_ACCOUNT_RECORD_TYPE_ID=012XXXXXXXXXXXXXXX  # OrderLink Customer RT (18-char)
SF_ORDER_RECORD_TYPE_ID=012XXXXXXXXXXXXXXX           # OrderLink Order RT
SF_PRODUCT_RECORD_TYPE_ID=012XXXXXXXXXXXXXXX         # OrderLink Product RT
SF_EXTERNAL_ID_PREFIX=orderlink                      # brand prefix for external IDs (prevents cross-brand collision)
SF_SYNC_ENABLED=true            # kill-switch
```

A `.env.example` committed with placeholder values serves as the canonical list.

### 8.4 Database backups (nightly, off-VPS)

**Non-negotiable for a store that handles real money.** Daily automated backups of the `orderlink` Postgres database to an off-VPS destination.

**Scheme:**

- A separate tiny sidecar container `orderlink-backup` (Alpine + `pg_dump` + `restic` or `rclone` + `cron`)
- Nightly at 02:30 IST:
  1. `pg_dump --format=custom --compress=9` of `orderlink` database
  2. Encrypt with GPG using a key stored in VPS (public key in-repo, private key only on VPS)
  3. Upload to **Cloudflare R2 free tier** (10 GB/month free, zero egress fees; alternative: Backblaze B2, 10 GB free)
  4. Also keep 7 most recent dumps in `/root/orderlink/data/backups/` (local copy for fast restore)
- Retention: daily for 30 days, weekly (Sun) for 3 months, monthly (1st) for 1 year — managed by `restic forget` policy
- Health check: each run emits a status POST to `hc-ping.com/<uuid>` (free); if cron fails to fire or backup fails, we get an email alert within an hour
- Restoration drill: documented restore procedure tested once before go-live; README contains the exact `pg_restore` command

**Bucket policy**: R2 bucket `orderlink-backups` has write-only credentials baked into the backup container; restore credentials kept separately in password manager (defence against ransomware-style wipe of backups).

### 8.5 Error tracking — Sentry

Client + server-side instrumentation via `@sentry/nextjs`. Free tier (5,000 events/month) is sufficient for launch volumes.

- `SENTRY_DSN` in `.env`
- Source maps uploaded on build (via `@sentry/webpack-plugin`)
- PII scrubbing: `beforeSend` strips `customer_mobile`, `customer_email`, `ship_line1`, `ship_line2`, `customer_name` from all events
- Alerts set to email on any unhandled exception
- Performance monitoring off initially (stays under free-tier event quota)

### 8.6 Uptime monitoring

- **[UptimeRobot](https://uptimerobot.com) free tier** — pings `https://orderlink.in/api/healthz` every 5 minutes from multiple regions
- Alerts via email + WhatsApp (free tier supports both)
- Second monitor: `https://orderlink.in/` every 15 minutes
- Public status page optional (skip for 2a)

### 8.7 Migration from Phase 1

1. Build and test Next.js container locally (where possible) and on VPS
2. Spin up new container with different Traefik label (e.g., `staging.orderlink.in`) on VPS
3. Seed Postgres, run migrations, seed inventory
4. Verify Razorpay test mode end-to-end
5. Switch Traefik labels: remove from old container, add to new
6. Stop + remove old nginx-alpine static container
7. Rollback plan: keep old image tagged; re-label in < 60s if critical bug

## 9. Testing

Minimal but meaningful coverage:

- **Unit:** price calculation (COD vs prepaid, shipping thresholds), signature verification logic, inventory reservation logic
- **Integration:** `/api/orders` happy path (COD + prepaid), `/api/orders/verify` with valid + tampered signatures, webhook idempotency
- **Manual smoke test** before go-live:
  - Razorpay test-card happy path end-to-end
  - Razorpay test-card failure path (insufficient funds)
  - COD order path
  - Pincode lookup (5 pincodes from major cities)
  - Inventory decrement behaviour (place order, verify `remaining` decreases)
  - Webhook replay test (send same event twice, verify no double-count)
  - Admin basic-auth gate
  - Policy pages loaded and linkable
  - Mobile view tested on iPhone + Android Chrome
  - Lighthouse score ≥ 85 on mobile for home + product page

## 10. Open items / assumptions

| # | Item | Assumption / status |
|---|---|---|
| 1 | Fulfilment model | **Meesho logistics partnership**, positioned as premium service. Confirmed. |
| 2 | Razorpay account | **Already live** under CodeSierra Tech Pvt Ltd. Keys supplied via `.env` at deploy time, not committed. Merchant name on Razorpay dashboard should list OrderLink as a brand / display name under the same legal merchant (user action — Razorpay Dashboard → Settings → Business Details → Add Brand). |
| 3 | Oil Dispenser images | **User-provided.** 3–5 photos required before launch (front, side, detail, lifestyle). |
| 4 | Shipping | **All-inclusive pricing — no shipping line ever shown.** Product price already covers delivery. ₹49 upfront advance on POD orders is positioned as booking/confirmation, not "shipping charge". |
| 5 | GSTIN | **OrderLink operates as a trade name of CodeSierra Tech Private Limited.** Uses the company's existing GSTIN. Policies, invoices, Razorpay merchant records all show "CodeSierra Tech Private Limited" as legal entity + "OrderLink" as brand. **User action required**: amend the company's GST registration to add (a) additional trade name "OrderLink", (b) relevant HSN codes for retail goods (e.g. 7013 glassware / 8205 hand tools / etc. depending on SKUs), (c) additional place of business if storage/warehousing is separate. Form REG-14 amendment on the GST portal, typically approved in 7–15 days. |
| 6 | Support contact | Phone `+91 20 66897519`, email `hello@orderlink.in`. Both placed in `/contact`, order emails, footer. |
| 7 | Legal identifiers | **All confirmed.** CIN `U62013PN2025PTC241138`, GSTIN `27AAMCC6643G1ZF`, registered office `Eon Free Zone, Kharadi, Pune, Maharashtra 411014`, grievance + DPO = Vinay Vernekar (Director). Single source of truth in `src/lib/legal.ts`. |
| 8 | Product renames | I'll propose curated titles for all 25 in implementation phase; user approves via PR review. |
| 9 | Static content copy (bullets, descriptions, taglines) | I'll draft during implementation; user reviews. |
| 10 | Non-refundable advance clause for refused POD | Legal gray area in India. The spec positions it as a "booking confirmation fee" rather than shipping (safer). User should run this by a CA or legal advisor for airtight positioning. Policy language drafted conservatively. |

## 11. Success criteria

Phase 2a ships successfully when:

1. A customer can visit `orderlink.in`, see the home page with 25 products, click Oil Dispenser
2. Place a **Pay-on-Delivery order** end-to-end — pays ₹49 via Razorpay test card, receives confirmation screen + email + **GST invoice PDF attached**, order row shows `status=advance_paid`, `advance_paise=4900`, `balance_due_paise=<remainder>`, `invoice_number` populated
3. Place a **Prepaid order** end-to-end via Razorpay test card, receives confirmation with invoice, order row shows `status=paid`, `balance_due_paise=0`
4. You receive admin email per order with full details (customer info, shipping, UTM attribution, coupon if any, payment status, balance due if POD, invoice link) — ready to paste into Meesho
5. `/admin/orders` shows both orders, status toggle works, COD-received checkbox on delivered orders updates `paid` state, CSV export works
6. **Pincode serviceability**: entering a known-unserviceable pincode (or invalid one) disables Buy button and shows the "notify me" capture
7. **`/track` page**: customer can enter order # + last-4 mobile and see status; invalid attempts rate-limited
8. **DPDP cookie banner** appears on first visit and respects user choice across pages
9. **GST invoice PDF**: opens a generated invoice, CodeSierra Tech Pvt Ltd + CIN + GSTIN visible, correct CGST/SGST or IGST split based on customer state
10. **WhatsApp floating button** opens wa.me with prefilled message
11. **Activity popup (Option B)** fires on product page with randomized realistic message; hidden on checkout + home; `prefers-reduced-motion` respected
12. **First-order coupon `WELCOME10`** applies at checkout for first-time customer email/mobile combo; subsequent attempts rejected
13. Site scores Lighthouse mobile ≥ 85 for Performance, Accessibility, Best Practices, SEO
14. All policy pages are live and linked; footer shows "OrderLink — a brand of CodeSierra Tech Private Limited · CIN · GSTIN"
15. Inventory counter visibly decrements after a real order (advance-paid or paid)
16. Razorpay webhook correctly reconciles a flaky-browser scenario (simulate closing tab mid-payment; webhook arrives and order state is consistent)
17. **Sentry** captures a test error, PII is stripped from the captured payload
18. **Nightly backup** runs, pushes to R2, health-check endpoint pings; test restore to a scratch DB succeeds
19. **UptimeRobot** monitor is green for 24 hours post-launch
20. **Salesforce sync**: both test orders (prepaid + POD) appear in the SF org as Person Account + Order + OrderItem within 60 seconds of order completion; retry succeeds after a simulated SF outage (turn off network, place order, restore network, job auto-retries)
21. **Salesforce Flows fire**: customer receives order-confirmation email from SF (not from OrderLink) for both test orders; admin-triggered status change from `confirmed` → `shipped` in `/admin/orders` back-syncs to SF and fires the shipped-email Flow
22. **Trust messaging visible** on checkout ("Your details stored on Salesforce…") and footer ("Customer care on Salesforce")
23. Current coming-soon page is replaced without DNS changes or downtime > 60 seconds during swap

## 12. Explicit non-goals

- Customer accounts, wishlist, cart, reviews, search — none of these in 2a
- Any automation of the "place order on Meesho" step — manual for 2a
- Customer-initiated cancellations or refunds — manual via email for 2a
- Multi-language — English only for 2a
- Mobile app — web responsive only
- Analytics beyond UTM capture — defer to 2b

## 13. Salesforce integration — customer + CRM system of record

**Intent:** OrderLink handles transactions, inventory, and payments. **Salesforce** owns the customer relationship, email communications, and post-purchase lifecycle. One-way sync on payment completion pushes every paid order into Salesforce, where Flows trigger the customer-facing emails.

### 13.1 Why this matters (and why we surface it to customers)

Salesforce is recognised as the world's #1 CRM platform (Gartner Magic Quadrant Leader, 11+ consecutive years) and is used by 150,000+ companies including a large share of the Fortune 500. We use this as a trust signal on OrderLink — small startup brands often struggle to convince customers their data is safe; "your details live on Salesforce, the same CRM used by Fortune 500 companies" converts that perception instantly.

This is legitimate — we genuinely are a Salesforce customer — so no puffery risk under CPA 2019.

### 13.2 Trust messaging placement

Curated, not plastered. Three touchpoints:

**Checkout page — trust strip above the Pay button:**
```
  🔒 Your details are stored on Salesforce,
     the same CRM Fortune 500 companies trust.
```
Small, one line, Instrument Sans 0.82rem, ink-soft colour, Salesforce logo hidden (no logo use without permission — text reference only).

**Footer micro-line** (alongside the Meesho delivery line):
```
Curated by OrderLink · Delivered by Meesho · Customer care on Salesforce
```

**Privacy policy** — a short section naming Salesforce as our data processor, linking to Salesforce's Trust & Compliance page (`trust.salesforce.com`), and stating data residency.

**Purposefully NOT doing:**
- Big Salesforce logos on the home page (would read as "we paid Salesforce" / off-brand for curated)
- Home-page hero messaging leading with enterprise-tech signals
- Claiming Salesforce "partnership" or "endorsement" — we're a customer, not a partner

### 13.3 Brand isolation via Record Types

**Context:** your SF org holds data from another firm's operations alongside OrderLink's. To keep OrderLink customers, orders, and products cleanly separated — including in reports, list views, sharing rules, and admin profile access — we use **Record Types**.

#### Why Record Types (vs a custom field or separate org)

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Record Types** (recommended) | Standard SF pattern. Different page layouts per brand. Distinct picklists, sharing rules, profile access. Reports filter by RecordTypeId trivially. Data physically co-exists without bleed. | Small setup overhead (create RTs per object, assign profile access) | ✓ **Use this** |
| Custom `Source_Platform__c` field only | Simple | Agents accidentally see the wrong brand's records in list views; reports need constant filters; weak separation | ✗ insufficient |
| Separate SF org | Absolute isolation | Expensive (new license seats), duplicated admin, no shared customer-360 if same person buys from both brands | ✗ overkill |
| Divisions (legacy Data Segmentation) | Works but Salesforce is deprecating | Not future-safe | ✗ |

#### Record Types to create in the SF org

| Object | Record Type developer name | Label | Page layout | Assigned to |
|---|---|---|---|---|
| `Account` (Person) | `OrderLink_Customer` | OrderLink Customer | `OrderLink Customer Layout` | OrderLink profile only |
| `Account` (Person) | `<Other_Firm>_Customer` | Other Firm Customer | existing | Other firm's profile |
| `Order` | `OrderLink_Order` | OrderLink Order | `OrderLink Order Layout` | OrderLink profile only |
| `Order` | `<Other_Firm>_Order` | Other Firm Order | existing | Other firm's profile |
| `Product2` | `OrderLink_Product` | OrderLink Product | `OrderLink Product Layout` | OrderLink profile only |
| `Product2` | `<Other_Firm>_Product` | Other Firm Product | existing | Other firm's profile |

(`OrderItem` doesn't support Record Types — it inherits context from its parent Order, which is already brand-scoped.)

#### What changes in the sync layer

- `SF_PERSON_ACCOUNT_RECORD_TYPE_ID` (already in `.env`) points to the **`OrderLink_Customer`** RT
- New env vars:
  - `SF_ORDER_RECORD_TYPE_ID` — OrderLink Order RT ID
  - `SF_PRODUCT_RECORD_TYPE_ID` — OrderLink Product RT ID
- Every create/upsert call includes the `RecordTypeId` — so OrderLink code physically cannot write to the other firm's records by mistake

#### External-ID collision safety

Person Account external ID uses brand-prefixed hashes so the same email can exist as two separate Person Accounts (one per brand) without a collision:

```ts
OrderLink_Customer_Id__c = `orderlink:${sha256(email.toLowerCase())}`
```

If the other firm adopts the same field, they'd use `otherfirm:<hash>`. Both rows coexist on the same object without upsert conflicts.

(If you prefer to merge customers across brands — so one email = one Person Account — we'd skip the prefix. But the default is **isolate** because brands usually have different legal bases for processing personal data, and isolation is easier to audit. Reconsider in 2b if you want a unified customer identity.)

#### Access control

- **Admin profile** (you): access to both Record Types
- **OrderLink-ops profile** (future team hires for the OrderLink brand): access to `OrderLink_*` RTs only
- **Other-firm profile**: access to `<Other_Firm>_*` RTs only
- Set via `Profile → Record Type Settings` or Permission Sets

The integration user (used by OrderLink's JWT sync) is granted **OrderLink Record Types only** — another hard safety boundary.

#### List views + reports

Pre-build three saved list views per relevant object:
- "OrderLink — All Customers" (filter: RecordType = OrderLink_Customer)
- "OrderLink — Recent Orders (30d)"
- "OrderLink — Revenue by Campaign" (grouped by UTM_Campaign__c)

The team's default home tabs can surface these for immediate brand-scoped views.

### 13.4 Schema — standard objects only

| Object | Purpose | Record count (Phase 2a) |
|---|---|---|
| **Account (Person Account)** | 1 per customer | ~100s initially, scales linearly |
| **Order** | 1 per OrderLink order | same as above |
| **OrderItem** | 1 per line item (always 1 per order in 2a, no cart yet) | = Order count |
| **Product2** | 25 products from `products.ts` | 25 |
| **Pricebook2 / PricebookEntry** | Standard Pricebook + entry per product | 1 + 25 |
| **Case** | Customer service (Phase 2b, not 2a) | 0 |

#### 13.3.1 Account (Person Account) — customer

Person Accounts merges standard Account + Contact into one B2C record. **Must be enabled in the org** before we integrate (see §13.6 prerequisites).

Standard fields used directly:
- `FirstName`, `LastName` — split from `customer_name` (on first space; fall back to last-name-only if single token)
- `PersonEmail`, `PersonMobilePhone` (E.164, `+91XXXXXXXXXX`)
- `PersonMailingStreet`, `PersonMailingCity`, `PersonMailingState`, `PersonMailingPostalCode`, `PersonMailingCountry`
- `PersonHasOptedOutOfEmail` (SF flips this when customer unsubscribes; OrderLink respects it in its own emails too)

Custom fields:

| API Name | Type | Purpose |
|---|---|---|
| `OrderLink_Customer_Id__c` | Text(80), **External ID, Unique** | `"orderlink:" + SHA256(email.toLowerCase())`; brand-prefixed so the same email can exist under multiple brands without collision (§13.3) |
| `Preferred_Contact_Channel__c` | Picklist: WhatsApp / SMS / Email | default WhatsApp for Indian customers |
| `First_UTM_Source__c`, `First_UTM_Medium__c`, `First_UTM_Campaign__c` | Text | first-touch attribution; NEVER overwritten after first write |
| `Last_UTM_Source__c`, `Last_UTM_Medium__c`, `Last_UTM_Campaign__c` | Text | updated on every new order |
| `Total_Orders__c` | Roll-up COUNT of Orders | auto |
| `Lifetime_Value_Paise__c` | Roll-up SUM(Order.Total_Paise__c) | auto |
| `First_Order_At__c`, `Last_Order_At__c` | Date/Time | roll-up MIN / MAX |
| `DPDP_Consent_Date__c` | Date/Time | from our cookie banner acceptance |
| `Do_Not_WhatsApp__c` | Checkbox | separate from SF's email opt-out |
| `Source_Platform__c` | Picklist | "OrderLink" (future multi-brand-proof) |

#### 13.3.2 Order

Standard fields:
- `AccountId` (Person Account), `OrderNumber`, `Status`, `EffectiveDate`, `TotalAmount` (₹, not paise — SF Currency type)
- `BillingStreet`, `BillingCity`, `BillingPostalCode` etc. on Order-level shipping (not just Account-level; orders can ship to different addresses later)

Custom fields:

| API Name | Type | Notes |
|---|---|---|
| `OrderLink_Order_Number__c` | Text(50), **External ID, Unique** | "OL-2026-0001" |
| `OrderLink_Status__c` | Picklist: pending_advance, advance_paid, paid, confirmed, shipped, delivered, cancelled, refunded | |
| `Total_Paise__c`, `Advance_Paise__c`, `Balance_Due_Paise__c` | Number(18,0) | paise-exact for reconciliation |
| `Payment_Method__c` | Picklist: Prepaid / Pay-on-Delivery | |
| `Razorpay_Order_Id__c`, `Razorpay_Payment_Id__c` | Text | support lookup |
| `GST_Invoice_Number__c` | Text | "OL-INV-2026-000001" |
| `GST_CGST_Paise__c`, `GST_SGST_Paise__c`, `GST_IGST_Paise__c`, `GST_Base_Paise__c` | Number | |
| `Invoice_PDF_URL__c` | URL | served by OrderLink |
| `Meesho_Tracking_Id__c`, `Meesho_Tracking_URL__c` | Text / URL | populated when admin marks shipped |
| `UTM_Source__c`, `UTM_Medium__c`, `UTM_Campaign__c`, `UTM_Term__c`, `UTM_Content__c`, `Referrer__c`, `Landing_Page__c` | Text | per-order attribution |
| `Coupon_Code__c`, `Coupon_Discount_Paise__c` | Text / Number | |
| `Confirmed_At__c`, `Shipped_At__c`, `Delivered_At__c`, `Cancelled_At__c` | Date/Time | timeline for Flow triggers |
| `Cancellation_Reason__c` | Long Text | |
| `Customer_IP_Address__c`, `User_Agent__c` | Text | fraud / troubleshooting (short retention) |

#### 13.3.3 OrderItem (Order Product)

Standard fields: `OrderId`, `Product2Id`, `PricebookEntryId`, `Quantity`, `UnitPrice`.

Custom fields:

| API Name | Type |
|---|---|
| `HSN_Code__c` | Text(10) |
| `GST_Rate_Percent__c` | Number(3,0) |
| `Product_Slug__c` | Text(100) — OrderLink slug at time of purchase |

#### 13.3.4 Product2

Standard: `Name`, `ProductCode`, `Description`, `IsActive`.

Custom:

| API Name | Type |
|---|---|
| `OrderLink_Slug__c` | Text(100), **External ID, Unique** |
| `Category__c` | Picklist: Kitchen / Beauty / Electronics / Fashion / Footwear |
| `HSN_Code__c` | Text(10) |
| `GST_Rate_Percent__c` | Number(3,0) |
| `MRP_Paise__c`, `Price_Paise__c`, `Prepaid_Price_Paise__c` | Number(18,0) |
| `Meesho_Source_URL__c` | URL |

Product sync happens on deploy — a one-shot script reads `products.ts` and upserts all 25 into Salesforce via `OrderLink_Slug__c`. Re-run safe.

### 13.5 Integration mechanics

**Auth: OAuth 2.0 JWT Bearer flow** (server-to-server, no interactive login).

1. Create Connected App in Salesforce:
   - Enable OAuth, select "Use digital signatures"
   - Upload public key certificate (we generate keypair in ops)
   - Scopes: `api`, `refresh_token`, `offline_access`
2. Authorise the app against a dedicated integration user (license seat required — one Salesforce user costs ~₹12k/yr on Enterprise Edition)
3. OrderLink holds private key + consumer key in `.env`:
   - `SF_LOGIN_URL` = `https://<mydomain>.my.salesforce.com`
   - `SF_CONSUMER_KEY` = connected app consumer key
   - `SF_USERNAME` = integration user's username
   - `SF_JWT_PRIVATE_KEY` = PEM-formatted private key (or path to file)
   - `SF_PERSON_ACCOUNT_RECORD_TYPE_ID` = 18-char Record Type ID
4. `jsforce` library auto-renews access tokens; our code never deals with expiry

**Sync queue** (Postgres-backed; no Redis needed for Phase 2a volume):

```sql
CREATE TABLE sf_sync_jobs (
  id            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid      NOT NULL REFERENCES orders(id),
  payload_json  jsonb     NOT NULL,
  status        text      NOT NULL DEFAULT 'pending',  -- pending, running, done, failed
  attempts      int       NOT NULL DEFAULT 0,
  last_error    text,
  created_at    timestamptz DEFAULT now(),
  next_attempt_at timestamptz DEFAULT now()
);
CREATE INDEX idx_sf_jobs_due ON sf_sync_jobs(status, next_attempt_at);
```

A 15-second interval background worker (Next.js custom server extension, OR a tiny sidecar container running `node workers/sf-sync.js`) picks up pending jobs:

```
for each job where status='pending' and next_attempt_at <= now():
  mark status='running'
  try:
    syncOrderToSalesforce(order)
    mark status='done'
  catch err:
    attempts++
    if attempts >= 6: mark status='failed', email admin
    else: schedule next_attempt_at = now() + backoff(attempts)
                                     // 1m, 5m, 15m, 1h, 6h
```

**Enqueue trigger:** in `/api/orders/verify` (signature-verified Razorpay success) and `/api/razorpay/webhook` (fallback path), immediately after the order state transitions to `advance_paid` / `paid`, we INSERT a row into `sf_sync_jobs`. The customer-facing confirmation page renders instantly; SF sync happens async.

**Sync function** (pseudocode; real version in `src/lib/salesforce/sync.ts`):

```ts
async function syncOrderToSalesforce(orderId: string) {
  const conn = await getSalesforceConnection();
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).first();

  // 1. Upsert Person Account by brand-prefixed hashed email
  const externalId = `${env.SF_EXTERNAL_ID_PREFIX}:${sha256(order.customer_email.toLowerCase())}`;
  const accountRes = await conn.sobject("Account").upsert({
    OrderLink_Customer_Id__c: externalId,              // "orderlink:<hash>"
    RecordTypeId:             env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID,
    FirstName:                splitName(order.customer_name).first,
    LastName:                 splitName(order.customer_name).last,
    PersonEmail:              order.customer_email,
    PersonMobilePhone:        toE164(order.customer_mobile),
    PersonMailingStreet:      [order.ship_line1, order.ship_line2].filter(Boolean).join(", "),
    PersonMailingCity:        order.ship_city,
    PersonMailingState:       order.ship_state,
    PersonMailingPostalCode:  order.ship_pincode,
    PersonMailingCountry:     "India",
    Last_UTM_Source__c:       order.utm_source,
    Last_UTM_Medium__c:       order.utm_medium,
    Last_UTM_Campaign__c:     order.utm_campaign,
    Source_Platform__c:       "OrderLink",
    DPDP_Consent_Date__c:     order.created_at,  // implicit consent at checkout
  }, "OrderLink_Customer_Id__c");
  const accountId = accountRes.id ?? (await lookupByExternalId(conn, "Account", "OrderLink_Customer_Id__c", hash));

  // 2. Upsert Order
  const orderRes = await conn.sobject("Order").upsert({
    OrderLink_Order_Number__c: order.order_number,
    RecordTypeId:              env.SF_ORDER_RECORD_TYPE_ID,
    AccountId:                 accountId,
    EffectiveDate:             order.created_at.toISOString(),
    Status:                    "Draft",  // SF's default; we drive lifecycle via OrderLink_Status__c
    OrderLink_Status__c:       order.status,
    TotalAmount:               order.total_paise / 100,
    Total_Paise__c:            order.total_paise,
    Advance_Paise__c:          order.advance_paise,
    Balance_Due_Paise__c:      order.balance_due_paise,
    Payment_Method__c:         order.payment_method === "prepaid" ? "Prepaid" : "Pay-on-Delivery",
    Razorpay_Order_Id__c:      order.razorpay_order_id,
    Razorpay_Payment_Id__c:    order.razorpay_payment_id,
    GST_Invoice_Number__c:     order.invoice_number,
    GST_CGST_Paise__c:         order.gst_cgst_paise,
    GST_SGST_Paise__c:         order.gst_sgst_paise,
    GST_IGST_Paise__c:         order.gst_igst_paise,
    GST_Base_Paise__c:         order.gst_base_paise,
    Invoice_PDF_URL__c:        `https://orderlink.in/orders/${order.id}/invoice.pdf`,
    UTM_Source__c:             order.utm_source,
    UTM_Medium__c:             order.utm_medium,
    UTM_Campaign__c:           order.utm_campaign,
    Coupon_Code__c:            order.coupon_code,
    Coupon_Discount_Paise__c:  order.coupon_discount_paise,
    BillingStreet:             [order.ship_line1, order.ship_line2].filter(Boolean).join(", "),
    BillingCity:               order.ship_city,
    BillingState:              order.ship_state,
    BillingPostalCode:         order.ship_pincode,
    BillingCountry:            "India",
  }, "OrderLink_Order_Number__c");

  // 3. Replace OrderItems (idempotent re-sync)
  const sfOrderId = orderRes.id ?? (await lookupByExternalId(conn, "Order", "OrderLink_Order_Number__c", order.order_number));
  const existingItems = await conn.sobject("OrderItem").find({ OrderId: sfOrderId }, ["Id"]);
  if (existingItems.length > 0) {
    await conn.sobject("OrderItem").destroy(existingItems.map(i => i.Id));
  }
  const items = await db.select().from(order_items).where(eq(order_items.order_id, orderId));
  await conn.sobject("OrderItem").create(items.map(item => ({
    OrderId:           sfOrderId,
    Product2Id:        await findProductIdBySlug(conn, item.product_slug),
    PricebookEntryId:  await findPricebookEntryIdBySlug(conn, item.product_slug),
    Quantity:          item.quantity,
    UnitPrice:         item.unit_price_paise / 100,
    HSN_Code__c:       productHSN(item.product_slug),
    GST_Rate_Percent__c: productGSTRate(item.product_slug),
    Product_Slug__c:   item.product_slug,
  })));
}
```

### 13.6 Email division of labour (replaces §7 for customer-facing emails)

| Email | Sent by | Trigger |
|---|---|---|
| Admin "new order" alert → you | **OrderLink** (Resend) | synchronous, inside `/api/orders/verify` |
| Customer order confirmation + invoice PDF | **Salesforce Flow** | new `Order` record in SF |
| Customer "order confirmed, dispatching soon" | **Salesforce Flow** | when admin sets `Confirmed_At__c` via back-sync |
| Customer "shipped, track here" | **Salesforce Flow** | when admin sets `Shipped_At__c` + `Meesho_Tracking_Id__c` |
| Customer "delivered, how was it?" | **Salesforce Flow** | when admin sets `Delivered_At__c` (delay 24h via Scheduled Flow) |
| Marketing / newsletter / abandoned-cart (Phase 2b) | **Salesforce Flow** or Marketing Cloud | Flows on Account / Order |
| Restock notifications | **Salesforce Flow** (Phase 2b) | via sync of our `restock_notifications` table as SF Leads / Custom Object |
| Razorpay payment receipts | **Razorpay** | automatic, out-of-band |

Net result: our Next.js app sends exactly ONE email ever — the admin alert. Customer comms funnel through Salesforce, giving you one place to edit templates, track opens, manage unsubscribes, and build campaigns.

### 13.7 Admin back-sync — updating Salesforce from `/admin/orders`

When admin marks an order `shipped` (or any other status transition), the `/admin/orders` route PATCHes OrderLink's DB AND enqueues an SF-update job with just the changed fields (e.g., `Shipped_At__c`, `Meesho_Tracking_Id__c`). This triggers the downstream Flow in SF.

Same queue, same retry mechanics. Keeps the SF-side in sync without needing bidirectional webhooks.

### 13.8 Prerequisites — all confirmed

| # | Item | Status |
|---|---|---|
| 1 | Person Accounts enabled in org | ✓ Confirmed |
| 2 | Salesforce edition | ✓ **Enterprise** (API + Flows + Connected Apps all native) |
| 3 | My Domain URL | ✓ `codesierra.my.salesforce.com` (user-confirmed) |
| 4 | Email sending channel | ✓ **Salesforce native** (Lightning Email + Flows + Email Templates). Marketing Cloud migration possible in 2b if needed. |
| 5 | Data residency | ✓ **Hyperforce India** — DPDP-clean, privacy policy language accurate |
| 6 | SF email sender (`hello@orderlink.in`) | ✓ User can configure org-wide email address. Implementation includes: (a) adding `hello@orderlink.in` as an Organization-Wide Email Address in SF Setup, (b) SPF record at DNS: `v=spf1 include:_spf.salesforce.com ~all`, (c) DKIM enable + TXT record, (d) From-address on all templates set to this address. |

### 13.9 Privacy policy updates

Explicit addition to `/privacy`:

> **Data processors we use:**
> - **Salesforce** (`trust.salesforce.com`) — stores your customer profile, order history, and communication preferences. Data resides in Salesforce's Hyperforce India region. Used to send you order updates, respond to support queries, and (with consent) share occasional marketing. Salesforce is ISO 27001, SOC 2 Type II, and GDPR-certified, and acts as our processor under Section 11 of the DPDP Act 2023.
> - **Razorpay** — processes payments. Only payment-related data (transaction ID, amount, method) flows to Razorpay; no shipping address.
> - **Meesho** — our logistics partner. Receives shipping address + mobile only, for delivery.
> - **Resend** — sends transactional admin alerts to our support inbox. No customer-identifying data.
> - **Sentry** — error tracking. PII (name, email, mobile, address) stripped client-side before events leave your browser.

### 13.10 Failure handling

- **Salesforce outage / 5xx from SF API:** order completes normally for the customer; sync job retries with exponential backoff. You see a pending job in admin, no customer impact.
- **Salesforce deleted / integration user deactivated:** same as above; jobs pile up in `pending` status; admin email alerts after 6 failed attempts across 6h total.
- **Dirty data** (e.g., duplicate Person Accounts by email casing): covered by `OrderLink_Customer_Id__c = SHA256(email.toLowerCase())` — upsert always targets the same record.
- **Order amendment** (rare — we might retroactively update a shipping address): manual via admin; back-sync updates SF.
- **Customer requests data deletion (DPDP right to erasure):** we redact in OrderLink's DB + enqueue a delete job to SF that deletes the Person Account + cascades Orders. Documented in /privacy.

### 13.11 Scope split

| Item | Phase 2a | Phase 2b+ |
|---|---|---|
| Person Account + Order + OrderItem + Product2 sync | ✓ | — |
| JWT OAuth, Connected App, integration user | ✓ | — |
| Sync queue with retry/backoff | ✓ | — |
| 3 SF Flows: new-order confirmation, shipped, delivered | ✓ | — |
| Admin back-sync on status changes | ✓ | — |
| Privacy policy mentions SF | ✓ | — |
| Trust messaging on checkout + footer | ✓ | — |
| `Case` object for support tickets | — | ✓ |
| Marketing Cloud / Pardot migration | — | ✓ |
| Abandoned-cart Flow | — | ✓ (when cart exists in 2b) |
| Review-request Flow | — | ✓ |
| Restock-notification → SF Lead sync | — | ✓ |
| Customer 360 dashboards in SF | — | user-configurable any time |

## 14. Roadmap — what ships after 2a

Captured here so scope doesn't creep into 2a and so you can see the sequence cleanly. Rough order of value × effort; specifics get their own spec when that phase starts.

### Phase 2b — expand catalog + trust depth (~1–2 weeks)

1. **Activate remaining products** — migrate 24 Coming-Soon SKUs to `live` as supply is confirmed. One `products.ts` commit each.
2. **Shopping cart** — multi-item checkout, "add to cart" from product card, mini-cart drawer
3. **Quoted Meesho reviews on product pages** — 5–8 real reviews per product, attributed: "Priya S., verified buyer on Meesho"
4. **Referral program** — `SHARE-VINAY-20` codes, give-₹20-get-₹20, shareable via WhatsApp deep-link
5. **Wishlist** — localStorage-backed ❤ button on cards
6. **Privacy-first analytics** — self-hosted Plausible on VPS (~20 MB RAM, 10-min setup), no cookie consent needed, gives page views + referrers + funnel
7. **Mobile number OTP at checkout** — via Razorpay's free OTP API, filters fake POD orders
8. **Customer-initiated order cancellation** — within 1 hour of placing, before manual confirmation
9. **Automated customer emails per status transition** — shipped notification, out-for-delivery, delivered with review request
10. **Google Search Console verification + sitemap ping** — not ship-critical but an easy day-one SEO win we should schedule

### Phase 2c — ops automation (~2–3 weeks)

1. **Shiprocket integration** — alternative to Meesho for SKUs Meesho doesn't carry; unlocks direct supplier dropship
2. **Meesho Supplier API** — if access granted, automate order placement (Meesho has a Seller Panel API with limited partners)
3. **Email marketing** — newsletter list via Resend / Brevo; post-purchase flow, restock notifications
4. **2FA for admin** — TOTP via authenticator app
5. **Staging environment** — `staging.orderlink.in` with its own DB; branch previews via GitHub Actions
6. **CI/CD** — GitHub Actions builds + deploys to VPS on tag push; auto-runs migrations
7. **Invoice improvements** — e-invoice integration (if turnover crosses threshold — currently 5 Cr, non-concern), digital signature
8. **Admin dashboard** — today's revenue, order volume chart, low-inventory alerts, conversion rate

### Phase 2d — growth + scale (~ongoing)

1. **Product variants** (size, color) — relevant when fashion/footwear activate
2. **Category landing pages** — `/c/kitchen`, `/c/beauty`, etc. for SEO
3. **Site search** — Algolia or Meilisearch
4. **Hindi + regional language support** — `/hi/`, `/ta/`, `/te/`
5. **Facebook Conversions API + Meta Pixel** — server-side conversion tracking for Meta Ads
6. **Google Ads conversion tracking + Merchant Center feed** — product listings on Google Shopping
7. **A/B testing framework** — hypothesis-driven optimization once volume is meaningful (~500 orders/month)
8. **Loyalty / repeat-customer program** — points, tier benefits
9. **Customer accounts with order history** — when wishlist + repeat orders justify the friction
10. **Live chat widget** — staffed support, only when support volume justifies
11. **Multi-currency** — if any international expansion considered
12. **Subscription / auto-reorder** — for consumables (matches well with the kitchen category long-term)

### Explicitly never doing

- **Live viewer count fabrication** ("12 people viewing now") — cheapens brand
- **Fake urgency timers** that reset on refresh
- **Affiliate / network-marketing reseller tier** — off-brand for a curated store
- **Deep discounting cycles** that train customers to wait for sales — a curated brand holds price

---

*End of spec. Ready for user review.*
