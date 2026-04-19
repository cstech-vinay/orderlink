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
5. Order capture with pincode auto-lookup (India Post)
6. Razorpay integration (order creation, checkout modal, server-side signature verification, webhook)
7. Postgres schema for orders, order items, inventory tracking
8. Email notifications via Resend: admin notification on new order + customer confirmation
9. Five policy pages (Terms, Privacy, Refund, Shipping, Contact) — Razorpay KYC requirement
10. Minimal `/admin/orders` page (basic auth, table view with status toggle)
11. Docker container replacing current deployment, Traefik labels, DNS unchanged
12. Preserve existing brand aesthetic: Fraunces + Instrument Sans + JetBrains Mono, warm cream palette, coral accents, film grain

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

### 3.4 Data model

**Postgres tables (via Drizzle schemas):**

```ts
// orders
id            uuid        pk
order_number  text        unique, human-friendly ("OL-2026-0001")
status        text        enum: pending_advance, advance_paid, pending_payment,
                                paid, confirmed, shipped, delivered,
                                cancelled, refunded
customer_name   text
customer_email  text
customer_mobile text
ship_line1    text
ship_line2    text (nullable)
ship_landmark text (nullable)
ship_pincode  text
ship_city     text
ship_state    text
payment_method    text  enum: prepaid, pay_on_delivery
-- All monetary values in paise. Prices are all-inclusive (shipping baked in).
list_price_paise    int    -- pricePaise at time of purchase
discount_paise      int    -- prepaid 5% discount (0 for pay_on_delivery)
total_paise         int    -- what customer owes in total
advance_paise       int    -- portion paid online upfront
                           --   = total_paise           (for prepaid)
                           --   = COD_ADVANCE_PAISE     (for pay_on_delivery = 4900)
balance_due_paise   int    -- remainder payable on delivery in cash
                           --   = 0                     (for prepaid)
                           --   = total - advance       (for pay_on_delivery)
razorpay_order_id   text (nullable)
razorpay_payment_id text (nullable)
razorpay_signature  text (nullable)
notes               text (nullable, admin notes)
created_at    timestamptz  default now()
updated_at    timestamptz  default now()

// order_items
id          uuid      pk
order_id    uuid      fk -> orders.id, cascade
product_slug  text
product_title text
quantity    int       default 1
unit_price_paise   int
created_at  timestamptz

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

### 4.5 Admin — `/admin/orders`

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
DATABASE_URL=postgres://orderlink_user:***@tech-blog-automation-postgres-1:5432/orderlink
RAZORPAY_KEY_ID=rzp_live_***
RAZORPAY_KEY_SECRET=***
RAZORPAY_WEBHOOK_SECRET=***
RESEND_API_KEY=***
ADMIN_USERNAME=vinay
ADMIN_PASSWORD=***         # bcrypt hash, generated once
ENCRYPTION_KEY=***         # for pgcrypto column encryption
INDIAPOST_CACHE_TTL=86400
SITE_URL=https://orderlink.in
```

A `.env.example` committed with placeholder values serves as the canonical list.

### 8.4 Migration from Phase 1

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
| 7 | Legal identifiers | CIN `U62013PN2025PTC241138`, GSTIN `27AAMCC6643G1ZF` — confirmed. **Still pending:** registered office address (Pune, per CIN) + grievance-officer designation (can default to user's name + `hello@orderlink.in` + `+91 20 66897519`). Will use a single-file `lib/legal.ts` constants module so final values land in one commit. |
| 8 | Product renames | I'll propose curated titles for all 25 in implementation phase; user approves via PR review. |
| 9 | Static content copy (bullets, descriptions, taglines) | I'll draft during implementation; user reviews. |
| 10 | Non-refundable advance clause for refused POD | Legal gray area in India. The spec positions it as a "booking confirmation fee" rather than shipping (safer). User should run this by a CA or legal advisor for airtight positioning. Policy language drafted conservatively. |

## 11. Success criteria

Phase 2a ships successfully when:

1. A customer can visit `orderlink.in`, see the home page with 25 products, click Oil Dispenser
2. Place a **Pay-on-Delivery order** end-to-end — pays ₹49 via Razorpay test card, receives confirmation screen + email, order row shows `status=advance_paid`, `advance_paise=4900`, `balance_due_paise=<remainder>`
3. Place a **Prepaid order** end-to-end via Razorpay test card, receives confirmation, order row shows `status=paid`, `balance_due_paise=0`
4. You receive admin email per order with full details (customer info, shipping address, payment status, balance due if POD) — ready to paste into Meesho
5. `/admin/orders` shows both orders, status toggle works, COD-received checkbox on delivered orders updates `paid` state
6. Site scores Lighthouse mobile ≥ 85 for Performance, Accessibility, Best Practices, SEO
7. All policy pages are live and linked; footer shows "OrderLink — a brand of CodeSierra"
8. Inventory counter visibly decrements after a real order (advance-paid or paid)
9. Razorpay webhook correctly reconciles a flaky-browser scenario (simulate closing tab mid-payment; webhook arrives and order state is consistent)
10. Current coming-soon page is replaced without DNS changes or downtime > 60 seconds during swap

## 12. Explicit non-goals

- Customer accounts, wishlist, cart, reviews, search — none of these in 2a
- Any automation of the "place order on Meesho" step — manual for 2a
- Customer-initiated cancellations or refunds — manual via email for 2a
- Multi-language — English only for 2a
- Mobile app — web responsive only
- Analytics — defer to 2b

---

*End of spec. Ready for user review.*
