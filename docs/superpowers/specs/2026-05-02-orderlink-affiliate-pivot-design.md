# OrderLink Affiliate Pivot — Design Spec

**Date:** 2026-05-02
**Status:** Drafted, awaiting user approval
**Working branch:** `phase-2b-affiliate` (to be cut from `main`)
**Backup branch:** `phase-2a-store` (preserved verbatim, no further commits)

---

## 1. Goal

Pivot OrderLink.in from a self-fulfilling dropshipping store to a **curated affiliate marketplace**. The site lists hand-picked products across 8 sub-brands, shows rich product detail pages with multi-merchant price comparison, and redirects shoppers to the merchant (Amazon, Myntra, Nykaa) via affiliate links to earn commission. No carts, no checkouts, no payments handled in-house.

The dropshipping implementation (`phase-2a-store` branch) is preserved as a **backup** in case we want to revive it. It is not deleted, archived inside this branch, or referenced in the new code.

## 2. Why

The dropshipping path requires: payment integration (Razorpay), GST invoicing, OTP verification, pincode/courier logistics, Salesforce CRM sync, returns/refunds, customer support, and inventory liability. The affiliate model removes all of those — the site becomes a content/curation product, the merchant handles fulfilment, and revenue is commission on traffic we send. Lower operational risk, faster to market, much smaller surface area to maintain.

## 3. Scope

### In scope (this phase)

- Public-facing affiliate site at orderlink.in (home, category list, product detail, redirect interstitial, footer policy pages)
- Static catalog of ~12 seed products across 8 sub-brands (matches design)
- Multi-merchant price comparison UI (Amazon, Myntra, Nykaa) with per-merchant price/ETA/stock
- Click-to-merchant flow with branded interstitial showing confirmed price + ETA
- Responsive: desktop ≥881px and mobile ≤880px (matches design breakpoints)
- Fonts: Fraunces (display) + Plus Jakarta Sans (sans), via Google Fonts
- Design palette: `#0E1430` deep navy, `#FF5A3C` accent coral, `#FFFDFA` cream bg, `#1A1F36` ink, `#6B7280` muted, 18px radius
- Footer with newsletter capture (UI only — no backend wiring this phase), policy links, sub-brand list
- 7 policy pages — visual layout pattern reused from `phase-2a-store`'s `PolicyPage` component, copy rewritten from scratch for affiliate context: `/about` (rewrite), `/contact` (rewrite), `/privacy` (rewrite), `/terms` (rewrite), `/affiliate-disclosure` (new), `/editorial-policy` (new), `/how-we-curate` (new)
- Sentry error tracking (existing config retained)
- Sitemap + robots + llms.txt + structured data (Product, Organization, BreadcrumbList) — equivalent to current SEO posture

### Out of scope (later phases / explicitly deferred)

- Real affiliate-link generation (Amazon Associates tags, Myntra Partner deeplinks, Nykaa Affiliates) — placeholder URLs for now, user supplies real ones later
- Click-tracking analytics / outbound-click attribution (will add later via plausible or GA4)
- Search backend (current search filters in-memory client-side over the static catalog, same as design)
- Server-side wishlist persistence (heart icon present, localStorage-backed only — no account, no sync)
- Newsletter capture wiring (UI present, form does not POST anywhere yet)
- Admin / CMS to edit products at runtime (catalog is a `.ts` file, edit-and-redeploy)
- Razorpay / OTP / Salesforce / GST invoice / pincode validation / order tracking — all stripped from the affiliate build
- Server-rendered review submission (reviews are seed data in catalog, not user-generated)

## 4. Architecture

### Branch + repo layout

```
main
  └── phase-2b-affiliate   ← new branch, cut from main, becomes new mainline
phase-2a-store              ← frozen backup, no further commits
```

Cutting from `main` (not from `phase-2a-store`) means we inherit only the SEO/Meesho-rebrand commits and skip all dropshipping infrastructure. Anything we want to keep from `phase-2a-store` (specific components, policy-page layout) gets cherry-picked or rewritten, not merged wholesale.

### Stack (kept from existing)

- Next.js 15.5 (App Router) + React 19
- Tailwind v4 (theme tokens in `src/app/globals.css`)
- TypeScript, Vitest, Playwright (e2e)
- Sentry (already configured)

### Stack (removed)

These dependencies and their setup come out of `package.json` for the affiliate build:

- `@react-pdf/renderer` (invoice PDFs)
- `drizzle-orm`, `drizzle-kit`, `postgres` (DB layer — not needed)
- `jsforce` (Salesforce SDK)
- `razorpay`
- All custom code in `src/lib/{pricing,invoice-number,razorpay,attribution,otp,...}.ts`
- All API routes under `src/app/api/` except `/api/healthz` (kept for ops)

### Folder structure

```
src/
├── app/
│   ├── page.tsx                        # home: hero + category strip + featured grid
│   ├── shop/page.tsx                   # all-finds list ("Everything we love")
│   ├── shop/[category]/page.tsx        # category-filtered list (e.g. /shop/glossy)
│   ├── p/[slug]/page.tsx               # product detail
│   ├── go/[productId]/[merchantId]/page.tsx   # redirect interstitial → external URL
│   ├── about/, contact/, privacy/, terms/, affiliate-disclosure/, editorial-policy/, how-we-curate/
│   │                                   # 7 policy pages, each a page.tsx
│   ├── not-found.tsx                   # global 404
│   ├── layout.tsx                      # root layout: fonts, header, footer, Sentry
│   ├── globals.css                     # Tailwind v4 @theme tokens for design palette
│   ├── icon.png, apple-icon.png, opengraph-image.tsx
│   ├── robots.ts, sitemap.ts, llms.txt
│   └── api/healthz/route.ts            # only API route kept (Docker/Traefik healthcheck)
├── components/
│   ├── Header.tsx                      # rewritten to design (logo, nav, search, heart icon)
│   ├── Footer.tsx                      # rewritten: newsletter UI + 4-col link grid
│   ├── Hero.tsx                        # rewritten: navy hero w/ floating product preview
│   ├── CategoryStrip.tsx               # 8 sub-brand glyph cards
│   ├── FeaturedGrid.tsx                # 12-col editorial mixed-size grid
│   ├── FeaturedHero.tsx                # large dark card inside FeaturedGrid
│   ├── ProductCard.tsx                 # 3 variants: default / tall / wide
│   ├── ProductGallery.tsx              # thumbs + main image + arrows
│   ├── MerchantList.tsx                # "Best prices today" panel w/ per-merchant CTA
│   ├── MerchantLogo.tsx                # inline branded badge for amazon/myntra/nykaa
│   ├── ReviewSection.tsx               # tabs + rating histogram + review cards
│   ├── RelatedGrid.tsx                 # "more from {category}" carousel
│   ├── RedirectInterstitial.tsx        # full-screen modal w/ countdown
│   ├── CategoryGlyph.tsx               # 8 SVG glyphs (tech/cloth/glossy/...)
│   ├── Stars.tsx, Price.tsx, Pill.tsx, Icon.tsx   # atoms
│   ├── TrustStrip.tsx                  # "Hand-tested · Price-checked · Curated weekly"
│   ├── CommissionNote.tsx              # disclosure pill on PDP
│   └── SearchBar.tsx                   # client-side filter (header + mobile)
├── data/
│   ├── affiliate-products.ts           # catalog: 12 products, schema below
│   └── categories.ts                   # 8 sub-brands with hue/glyph
├── lib/
│   ├── format.ts                       # ₹ formatter, % off, etc.
│   └── search.ts                       # client-side filter/sort helpers
└── (NO db/, drizzle/, salesforce/, razorpay/, otp/ — deleted)
```

### Data model

```ts
// src/data/categories.ts
export type Category = {
  id: 'techland' | 'clothlink' | 'glossy' | 'homely' | 'kidzy' | 'studify' | 'sufraan' | 'giftzone';
  name: string;
  tagline: string;
  hue: number;        // OKLCH hue, drives card tint
  icon: 'tech' | 'cloth' | 'glossy' | 'home' | 'kid' | 'study' | 'kitchen' | 'gift';
};

// src/data/affiliate-products.ts
export type Merchant = {
  id: 'amazon' | 'myntra' | 'nykaa';
  label: string;
  price: number;            // ₹, no paise — affiliate pricing is informational only
  eta: string;              // "Tomorrow" | "2 days" | etc.
  stock: 'In stock' | 'Few left' | 'Out of stock';
  affiliateUrl: string;     // PLACEHOLDER until user supplies real deeplinks
};

export type Review = {
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;             // human-readable, "12 days ago"
  title: string;
  body: string;
};

export type AffiliateProduct = {
  id: string;               // 'p1' | 'p2' | ...
  slug: string;             // URL slug — kebab-case of title
  title: string;
  subtitle: string;
  category: Category['id'];
  price: number;            // best price, ₹
  mrp: number;              // struck-through anchor, ₹
  rating: number;           // 0–5
  reviewCount: number;
  badge?: string;           // "Editor's pick" | "Bestseller" | etc.
  images: string[];         // hosted in /public/products/{slug}/ — NOT Unsplash CDN
  summary: string;
  highlights: string[];
  specs: [string, string][];
  colors?: string[];        // hex, optional swatches
  merchants: Merchant[];    // 1–3 per product
  reviews: Review[];        // 1–4 seed reviews per product
};
```

**Image hosting:** the design uses Unsplash CDN URLs. We will NOT ship Unsplash URLs to production — they are unreliable as long-term hotlinks and not licensed for commercial use without verification. Migration plan: a one-time `scripts/download-seed-images.ts` (run manually, committed output) fetches the 12 seed images and writes them to `/public/products/{slug}/{n}.webp`. The catalog references local paths thereafter. If user wants different real product photos, they swap the files; catalog references stay stable.

### Routing model

- `/` — home (hero + categories + featured grid)
- `/shop` — all products list
- `/shop/[category]` — category-filtered list (8 categories)
- `/p/[slug]` — product detail page
- `/go/[productId]/[merchantId]` — server-side redirect:
  - looks up product + merchant
  - shows interstitial client component for ~3s with confirmed price + ETA
  - redirects browser to `merchant.affiliateUrl`
  - records click via analytics later (this phase: no-op)
- 7 policy pages

The interstitial is a real route, not a modal, so:
1. The merchant link is bookmarkable / shareable as `orderlink.in/go/...`
2. We can swap interstitial → instant redirect later via env flag without changing call sites
3. SEO: `<meta name="robots" content="noindex,nofollow">` on `/go/*` so Google doesn't index commission redirects

### Design system tokens

Defined in `src/app/globals.css` via Tailwind v4 `@theme`:

```css
@theme {
  --color-ol-accent: #FF5A3C;
  --color-ol-deep: #0E1430;
  --color-ol-ink: #1A1F36;
  --color-ol-muted: #6B7280;
  --color-ol-bg: #FFFDFA;
  --color-ol-soft: #F4F1EC;       /* card-shaded surfaces */
  --radius-ol: 18px;
  --font-display: 'Fraunces', 'Times New Roman', serif;
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
}
```

Components consume these via Tailwind utilities (`bg-ol-deep`, `text-ol-accent`, `font-display`, `rounded-ol`) — NOT inline CSS variables, NOT inline `style={{}}` like the prototype. The prototype's inline-style pattern is a Babel-CDN constraint; in Next we use Tailwind for everything.

### State + interactivity

- All pages render Server Components by default (Next 15 App Router)
- Client Components (marked `'use client'`) only where needed:
  - `Header` (search input state)
  - `ListPage` filter UI (sort, category chips, price slider)
  - `ProductGallery` (active image index)
  - `ProductTabs` (overview/specs/reviews active tab)
  - `RedirectInterstitial` (countdown timer)
  - `WishlistHeart` (localStorage-backed, no server)
- No global store — state is local to each client island
- No data-fetching hooks — catalog is a `.ts` import, statically inlined at build

## 5. Components — design fidelity notes

The prototype is the visual source of truth. When converting prototype JSX → real React components, preserve:

- Exact spacing values (px, rem, clamp())
- Exact `oklch()` hue arithmetic for category color tints
- All 12 SVG icons as a single `<Icon name=...>` component
- All 8 SVG category glyphs in `<CategoryGlyph kind=...>`
- Hover transitions (`translateY(-3px)`, scale, opacity) — these matter to the feel
- The floating product card on the hero (rotated 4°)
- The mixed-grid 12-col featured layout (span 6 + span 3 + span 3 + 4×span 4)
- The radial-gradient accent on the hero and dark featured cards
- The gradient italic text in the hero h1 (`color-mix` + `WebkitBackgroundClip:text`)
- Mobile breakpoint at 880px (single-column gallery, footer becomes 2-col then 1-col)

Things we **change** from the prototype:

- Replace inline `style={{}}` with Tailwind utility classes (DX, dead-code elimination, theming)
- Replace `<button onClick={() => go({...})}>` with Next `<Link href=...>` for SEO + prefetch
- Replace `window.OL_DATA` global with proper TypeScript imports
- Drop the tweaks panel entirely — it's a Claude-Design dev tool, not a customer feature
- Replace Unsplash hot-links with self-hosted webp in `/public/products/`
- Heart icon: localStorage backing, not in-memory state lost on navigation

## 6. Error handling

- 404: `not-found.tsx` files at root and inside `/shop`, `/p/[slug]`, `/go/[productId]/[merchantId]`
  - Root: friendly "this page got lost" + nav back home
  - Product 404: suggest related categories
  - `/go/*` 404 (bad product/merchant id): redirect to home, no error screen, since these are usually scraper bots
- Sentry: existing config retained, capture client + server errors
- Bad affiliate URL (e.g. placeholder still set): interstitial shows "Link not yet available" + back-to-product CTA

## 7. Testing

- Unit (Vitest):
  - `lib/format.ts` ₹ formatting and % discount math
  - `lib/search.ts` filter + sort logic
  - Catalog data integrity: every product has ≥1 merchant, every merchant has a non-empty affiliateUrl (placeholder ok), every category id used exists in `categories.ts`, every `slug` is unique and kebab-case
- Component (Vitest + Testing Library):
  - `ProductCard` renders all 3 variants
  - `RedirectInterstitial` countdown ticks down and fires redirect on completion
  - `Stars` renders correct filled/unfilled count for fractional ratings
- E2E (Playwright):
  - Home → click category → click product → click merchant → land on interstitial
  - Mobile viewport (375px): same flow, gallery becomes column-reverse, footer collapses
  - Search filters list as user types
  - Direct URL hit on `/go/[bad-id]/[bad-id]` 404s gracefully

Target: ≥20 tests total (unit + component + e2e). Visual diff is out of scope — manual side-by-side vs prototype is the acceptance check.

## 8. SEO

- `<title>` + meta description per page (template: home, category, product, policy)
- OpenGraph + Twitter card images: existing dynamic `opengraph-image.tsx` adapted to new palette + product hero
- Structured data on PDP: `Product` schema with `offers` array (one Offer per merchant), `aggregateRating`, `review` array
- Structured data on home: `Organization` + `WebSite` with internal search
- `BreadcrumbList` on category and product pages
- `robots.txt`: allow all crawlers on public pages, `Disallow: /go/` (no commission-redirect indexing), `Disallow: /api/`
- `sitemap.ts`: home + 8 category pages + 12 product pages + 7 policy pages (all static, weekly changefreq)
- `llms.txt`: keep existing posture; reword for affiliate context
- `noindex` on `/go/[productId]/[merchantId]` (defence in depth alongside robots disallow)

## 9. Performance

- Images: self-hosted webp, lazy loading except first-screen hero, `priority` on home hero + first 4 cards
- Fonts: `display: swap`, preconnect already in design
- All catalog pages are statically prerendered at build (no DB, no SSR fetches)
- Lighthouse target: ≥95 perf, ≥95 a11y, ≥95 SEO on home and PDP

## 10. Migration path from `phase-2a-store` (what we keep, what we discard)

**Cherry-pick or copy from `phase-2a-store`:**

- `PolicyPage` shared layout (rewrite as new component matching affiliate design tone)
- Sentry config files (`sentry.{client,edge,server}.config.ts`) — works as-is
- `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` — keep
- `src/app/icon.png`, `apple-icon.png` — same brand mark
- `src/app/opengraph-image.tsx` — adapt palette
- `robots.ts`, `sitemap.ts`, `llms.txt` — adapt URL list
- `package.json` test scripts and lint config

**Discard / do not port:**

- `src/data/products.ts` (different schema, different categories)
- `src/data/reviews.ts`
- `src/db/`, `drizzle.config.ts`, `src/lib/{razorpay,invoice-number,pricing,attribution,otp}.ts`, `src/lib/pincode/`
- `src/components/{ActivityPopup,BackInStockCapture,CategoryBand,CookieBanner,ExitIntentOverlay,FOMOLines,FirstOrderBanner,Footer,Header,Hero,HowItWorksRibbon,InYourKitchen,MobileVerifier,OrderSummary,PaymentSelector,PincodeField,PolicyPage,ProductCard,ProductGallery,ReviewDistribution,SalesforceTrustStrip,TrustBand,WhatsAppButton,CustomerReviews,FooterTrustRow,ComingSoonBadge}.tsx` — all rewritten for design
- `src/app/{checkout,orders,track}/`
- `src/app/api/*` except `healthz`
- `src/invoices/`
- All e2e tests under `tests/` — rewritten for new flows

The clean way: cut new branch from `main`, then **copy in** only the keeper files explicitly. Avoids any chance of dropshipping behaviour leaking into the affiliate build via a forgotten import.

## 11. Deployment

**No VPS deploy as part of this spec.** Per memory `deploy-gate-orderlink.md`, OrderLink Phase 2+ never deploys to VPS without explicit user instruction. We will:

- Push `phase-2b-affiliate` branch to GitHub freely
- Run a local production build (`npm run build && npm run start`) to verify everything works
- Wait for explicit user authorisation before any VPS action

When the user does authorise deploy, the path is documented in memory `vps-deploy-pattern.md` (Traefik + Docker, swap container at `/root/orderlink`).

## 12. Done criteria

- [ ] Branch `phase-2b-affiliate` exists, cut from `main`, pushed to GitHub
- [ ] Home, /shop, /shop/[cat], /p/[slug], /go/[productId]/[merchantId], 7 policy pages all render
- [ ] All 12 seed products visible on home + searchable + clickable through to interstitial
- [ ] Mobile flow works at 375px width
- [ ] `npm run typecheck` clean
- [ ] `npm test -- --run` green (unit + component, ≥16 tests)
- [ ] `npm run test:e2e` green (≥4 Playwright specs)
- [ ] `npm run build` produces ≥27 prerendered pages with no errors
- [ ] Lighthouse ≥95 on home + PDP (perf, a11y, SEO)
- [ ] Visual parity with prototype on home, list, PDP, interstitial — manual check
- [ ] Affiliate-disclosure page exists and is linked from footer + commission note on every PDP

## 13. Non-goals (explicit, to prevent scope creep)

- No real merchant deeplinks. Placeholder URLs throughout.
- No click attribution / outbound tracking.
- No backend search or recommendations.
- No user auth, accounts, or persisted wishlist beyond localStorage.
- No CMS / admin / runtime catalog editing.
- No newsletter backend.
- No payment, shipping, GST, or invoicing logic anywhere.
- No port of the dropshipping store features even if "they're already written" — we are deleting that surface area, not preserving it inside this branch.
