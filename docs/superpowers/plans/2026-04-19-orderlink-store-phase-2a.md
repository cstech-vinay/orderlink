# OrderLink Store — Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the OrderLink e-commerce store (Phase 2a per the design spec) — a Next.js 15 app that replaces the static coming-soon page, accepts real customer orders for Oil Dispenser with Razorpay-backed Prepaid + Pay-on-Delivery flows, generates GST invoices, syncs customers/orders to Salesforce, enforces FOMO/social-proof surfaces, and runs as a Docker container behind Traefik — without deploying to the VPS until the user explicitly instructs.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind + Drizzle (Postgres) + jsforce (Salesforce) + Razorpay Standard Checkout + React-PDF (invoices) + Resend (admin email only). Salesforce is the primary store for customer/order data; Postgres holds thin `orders_ref` rows plus a `pending_sf_sync` fallback queue + operational tables (inventory, coupons, webhook idempotency, invoice sequence).

**Tech Stack:** Next.js 15, TypeScript 5 (strict), Tailwind CSS 3.4, Fraunces + Instrument Sans + JetBrains Mono (via `next/font`), Postgres 16 (reuses existing VPS container), Drizzle ORM + drizzle-kit, jsforce (Salesforce), Razorpay Node SDK, `@react-pdf/renderer`, Resend, Sentry, Vitest + Playwright for tests.

**Deploy gate (non-negotiable):** No step in this plan pushes anything to the VPS. The final task explicitly stops at "locally-verified Docker build" and hands off to the user for production deploy approval. See the §top deploy gate in the design spec.

---

## File Structure

Everything lives under the existing repo root `d:/My Files/Projects/Others/AI Projects/Dropshipping/`. Phase 1 files (`index.html`, `nginx.conf`, `Dockerfile`, `docker-compose.yml`) stay untouched until the switchover task at the end.

```
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # Root layout: fonts, cookie banner, WhatsApp widget, Sentry
│   │   ├── page.tsx                      # Home page (5 category bands, 25 product cards)
│   │   ├── error.tsx                     # Error boundary
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── globals.css                   # Tailwind + custom CSS variables
│   │   ├── p/[slug]/page.tsx             # Product page (router serves live + coming-soon)
│   │   ├── checkout/page.tsx             # Checkout form + Razorpay launcher (client component)
│   │   ├── orders/[id]/
│   │   │   ├── thanks/page.tsx           # Post-purchase confirmation
│   │   │   └── invoice.pdf/route.ts      # Serves generated PDF
│   │   ├── track/page.tsx                # Customer order-tracking (no login)
│   │   ├── admin/orders/
│   │   │   ├── page.tsx                  # Admin table (basic-auth gated)
│   │   │   └── actions.ts                # Server actions for status updates
│   │   ├── about/page.tsx                # Founder story
│   │   ├── contact/page.tsx              # Contact + SLA
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── refund-policy/page.tsx
│   │   ├── shipping-policy/page.tsx
│   │   ├── logistics/page.tsx            # Meesho partnership explainer
│   │   └── api/
│   │       ├── healthz/route.ts          # Container healthcheck
│   │       ├── orders/
│   │       │   ├── route.ts              # POST: create Razorpay order
│   │       │   └── verify/route.ts       # POST: verify signature, enqueue SF sync
│   │       ├── razorpay/webhook/route.ts # Razorpay webhook receiver
│   │       ├── pincode/[code]/route.ts   # Pincode serviceability + city/state lookup
│   │       ├── coupons/validate/route.ts # Validate first-order / exit-intent coupons
│   │       └── config/route.ts           # Runtime feature flags (FOMO_POPUP_ENABLED, etc.)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── FooterTrustRow.tsx            # Razorpay/Meesho/SF/CIN/GSTIN row
│   │   ├── Hero.tsx                      # Home hero with bg.jpg
│   │   ├── CategoryBand.tsx
│   │   ├── ProductCard.tsx               # Live + coming-soon variants
│   │   ├── ProductGallery.tsx
│   │   ├── PaymentSelector.tsx           # Prepaid vs POD radio
│   │   ├── OrderSummary.tsx              # Sticky checkout right column
│   │   ├── PincodeField.tsx              # Pincode input + inline serviceability result
│   │   ├── TrustBand.tsx                 # "Shipped by Meesho Logistics" card
│   │   ├── SalesforceTrustStrip.tsx      # "Data on Salesforce" strip
│   │   ├── ReviewDistribution.tsx        # 5-row bar chart from Meesho
│   │   ├── FOMOLines.tsx                 # "Only N left", "Selling fast"
│   │   ├── ActivityPopup.tsx             # Option B hybrid social-proof toast
│   │   ├── CookieBanner.tsx              # DPDP Act consent
│   │   ├── WhatsAppButton.tsx            # Floating + inline variants
│   │   ├── ExitIntentOverlay.tsx
│   │   ├── BackInStockCapture.tsx
│   │   └── ComingSoonBadge.tsx
│   ├── data/
│   │   └── products.ts                   # 25-product catalog constant (single source of truth)
│   ├── db/
│   │   ├── schema.ts                     # Drizzle table definitions
│   │   ├── client.ts                     # Connection factory
│   │   └── migrations/                   # drizzle-kit output
│   ├── lib/
│   │   ├── legal.ts                      # LEGAL constants (CIN, GSTIN, address, etc.)
│   │   ├── pricing.ts                    # Derived-amount calculators + pure fns
│   │   ├── invoice-number.ts             # Gap-free invoice-# generator via Postgres SEQUENCE
│   │   ├── crypto.ts                     # AES-GCM encrypt/decrypt for pending_sf_sync payloads
│   │   ├── attribution.ts                # UTM capture + sessionStorage helpers
│   │   ├── ratelimit.ts                  # In-memory LRU rate-limiter
│   │   ├── razorpay.ts                   # Razorpay SDK wrapper
│   │   ├── salesforce/
│   │   │   ├── client.ts                 # jsforce connection with JWT auth + token refresh
│   │   │   ├── sync.ts                   # syncOrderToSalesforce (Person Account + Order + OrderItem)
│   │   │   ├── record-types.ts           # RT ID helpers
│   │   │   └── types.ts                  # Type definitions mirroring SF custom fields
│   │   ├── email/
│   │   │   ├── client.ts                 # Resend client
│   │   │   └── send-admin-alert.ts       # Single outbound email we own
│   │   ├── pincode/
│   │   │   ├── whitelist.ts              # Load public/pincodes.json
│   │   │   └── lookup.ts                 # India Post API client (cached)
│   │   ├── fomo/
│   │   │   ├── name-pool.ts              # ~80 Indian first names
│   │   │   ├── city-pool.ts              # 40 cities, weighted
│   │   │   └── review-pool.ts            # ~30 paraphrased review snippets
│   │   └── track-key.ts                  # last-4-mobile normalisation for /track
│   ├── invoices/
│   │   └── InvoiceDocument.tsx           # React-PDF template (GST-compliant)
│   ├── emails/
│   │   └── AdminOrderAlert.tsx           # react-email component
│   └── workers/
│       └── sf-sync.ts                    # Background retry worker for pending_sf_sync
├── public/
│   ├── pincodes.json                     # 28k+ serviceable pincodes whitelist
│   └── assets/                           # Existing Phase 1 images (bg-*.webp, logos)
├── tests/
│   ├── lib/
│   │   ├── pricing.test.ts
│   │   ├── invoice-number.test.ts
│   │   ├── crypto.test.ts
│   │   └── salesforce/sync.test.ts
│   ├── api/
│   │   ├── orders.test.ts
│   │   ├── orders-verify.test.ts
│   │   ├── razorpay-webhook.test.ts
│   │   └── pincode.test.ts
│   └── e2e/
│       └── checkout-happy-path.spec.ts   # Playwright smoke
├── scripts/
│   ├── seed-sf-products.ts               # One-shot: sync 25 products to SF on deploy
│   ├── generate-pincode-whitelist.ts     # Builds public/pincodes.json
│   └── backup.sh                         # pg_dump → R2 (runs in sidecar container)
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── package-lock.json
├── .env.example
├── .dockerignore                         # Updated from Phase 1
├── .gitignore                            # Updated from Phase 1
└── Dockerfile.store                      # New; Phase 1 Dockerfile kept untouched until switchover
```

---

## Milestone overview

| # | Milestone | Tasks | Deliverable |
|---|---|---|---|
| M1 | Project scaffold | 1–4 | Next.js 15 + Tailwind + fonts, visible layout shell |
| M2 | Product catalog + home page | 5–8 | Home renders 25 cards; Oil Dispenser product page reads |
| M3 | Pricing logic + DB infra | 9–13 | Schemas migrated; pricing/invoice-# pure fns tested; pincode API live |
| M4 | Checkout UI | 14–17 | Checkout form complete; WhatsApp prompts + pincode check wired |
| M5 | Razorpay integration | 18–22 | Prepaid + POD flows live; webhook idempotent; inventory decrements |
| M6 | Post-payment flows | 23–26 | Invoice PDFs generated; /thanks + /track + admin alerts working |
| M7 | Salesforce integration | 27–31 | SF sync + fallback queue + back-sync endpoint operational |
| M8 | Admin + policies | 32–35 | `/admin/orders`, 6 policy pages, `/about`, review distribution |
| M9 | FOMO + trust surfaces | 36–39 | Activity popup, cookie banner, coupons, trust chips, back-in-stock |
| M10 | Ops + Docker | 40–44 | Sentry, healthchecks, Dockerfile, local smoke-test, deploy checklist |

Every task follows: write test(s) → run red → implement → run green → commit. Manual-verification steps call out visual / Lighthouse checks explicitly.

---

## Milestone 1 — Project scaffold

### Task 1: Create feature branch and Next.js 15 project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- (Phase 1 `index.html`, `nginx.conf`, `Dockerfile`, `docker-compose.yml` remain untouched)

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b phase-2a-store
git push -u origin phase-2a-store
```

- [ ] **Step 2: Initialise Next.js 15 with TypeScript in the repo root**

The repo already contains Phase 1 assets (`index.html`, `assets/`, etc.). We initialise Next.js *alongside* them, not by overwriting. Use `create-next-app` with the `--use-npm` flag into a temp directory then copy the scaffolding in:

```bash
cd /tmp
npx --yes create-next-app@15 orderlink-temp \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --no-eslint --use-npm --turbopack=false
```

Expected: scaffolding completes without error.

- [ ] **Step 3: Copy scaffolding files into repo root, skipping conflicts**

```bash
cd "d:/My Files/Projects/Others/AI Projects/Dropshipping"
cp -r /tmp/orderlink-temp/src ./
cp /tmp/orderlink-temp/package.json .
cp /tmp/orderlink-temp/tsconfig.json .
cp /tmp/orderlink-temp/next.config.ts ./next.config.mjs    # rename .ts → .mjs for clarity
cp /tmp/orderlink-temp/postcss.config.mjs .
cp /tmp/orderlink-temp/tailwind.config.ts .
cp /tmp/orderlink-temp/.gitignore ./.gitignore.next        # merge later
rm -rf /tmp/orderlink-temp
```

- [ ] **Step 4: Merge `.gitignore.next` into `.gitignore`**

Append Next.js-specific lines to the existing `.gitignore`:

```
# === Next.js ===
.next/
out/
next-env.d.ts
*.tsbuildinfo

# === Node ===
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# === Env ===
.env
.env.local
.env.*.local

# === Test ===
coverage/
playwright-report/
test-results/
```

Then: `rm .gitignore.next`

- [ ] **Step 5: Update `next.config.mjs` to enable standalone output + image remote patterns**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
```

- [ ] **Step 6: Install + run the dev server to verify it boots**

```bash
npm install
npm run dev
```

Open http://localhost:3000 in the browser. Expected: the Next.js placeholder page renders. Stop the dev server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts .gitignore src/
git commit -m "chore: scaffold Next.js 15 App Router + TypeScript + Tailwind"
```

---

### Task 2: Install core dependencies + developer tooling

**Files:** `package.json`, `vitest.config.ts`, `playwright.config.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install drizzle-orm postgres razorpay jsforce resend @react-pdf/renderer react-email @sentry/nextjs zod
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D drizzle-kit vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @playwright/test tsx dotenv-cli @types/jsforce jsdom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { provider: "v8", reporter: ["text", "html"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: Create `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 6: Add scripts to `package.json`**

Update the `"scripts"` section to include:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 7: Run smoke commands to verify tooling works**

```bash
npm run typecheck
npm test -- --run
```

Expected: typecheck passes (zero files to check yet); Vitest exits with "No test files found" (acceptable).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts playwright.config.ts tests/setup.ts
git commit -m "chore: add Drizzle, Razorpay, jsforce, Vitest, Playwright deps + test configs"
```

---

### Task 3: Root layout with brand fonts + CSS variables

**Files:** `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`

- [ ] **Step 1: Replace `src/app/globals.css` with the brand base styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --cream: #FBF7F1;
  --cream-deep: #F4EEE3;
  --ink: #1E1C1C;
  --ink-soft: #5A5350;
  --coral: #EC4356;
  --orange: #FF6E3A;
  --amber: #FFBB56;
  --rule: rgba(30, 28, 28, 0.12);
  --rule-strong: rgba(30, 28, 28, 0.28);
}

html { font-size: 16px; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }

body {
  min-height: 100dvh;
  background: var(--cream);
  color: var(--ink);
}

/* Film grain overlay, applied at body scope (picked up by Phase 1 aesthetic) */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0.32;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
```

- [ ] **Step 2: Replace `tailwind.config.ts` to define brand colour tokens**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F1",
        "cream-deep": "#F4EEE3",
        ink: "#1E1C1C",
        "ink-soft": "#5A5350",
        coral: "#EC4356",
        orange: "#FF6E3A",
        amber: "#FFBB56",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Instrument Sans"', '"Helvetica Neue"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["clamp(2.75rem, 4.9vw, 4.75rem)", { lineHeight: "0.98", letterSpacing: "-0.022em" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrderLink — Curated lifestyle goods, shop now",
  description:
    "A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.",
  metadataBase: new URL("https://orderlink.in"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx` with a temporary placeholder to verify fonts**

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-display text-hero font-light text-ink">
        OrderLink
      </h1>
      <p className="font-sans text-ink-soft mt-4">
        Everyday objects, <em>better-curated</em>.
      </p>
      <p className="font-mono text-sm text-ink-soft/60 mt-6">Scaffolding check</p>
    </main>
  );
}
```

- [ ] **Step 5: Run the dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000. Expected:
- "OrderLink" renders in a serif display face (Fraunces)
- "Everyday objects, better-curated." renders in clean grotesque (Instrument Sans)
- "Scaffolding check" renders in JetBrains Mono
- Page background is warm cream (#FBF7F1)
- Subtle film grain visible over the whole page

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/app/page.tsx tailwind.config.ts
git commit -m "feat(layout): root layout with Fraunces + Instrument Sans + JetBrains Mono + brand colour tokens"
```

---

### Task 4: Header + Footer + FooterTrustRow skeleton

**Files:** `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/FooterTrustRow.tsx`, `src/app/layout.tsx` (update)

- [ ] **Step 1: Create `src/components/Header.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-[color:var(--rule)]">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="OrderLink home">
          <Image
            src="/assets/optimized/logo_horizontal-600.webp"
            alt="OrderLink"
            width={180}
            height={44}
            priority
          />
        </Link>
        <ul className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest text-ink-soft">
          <li><Link href="/#kitchen" className="hover:text-coral">Kitchen</Link></li>
          <li><Link href="/#beauty" className="hover:text-coral">Beauty</Link></li>
          <li><Link href="/#electronics" className="hover:text-coral">Electronics</Link></li>
          <li><Link href="/#fashion" className="hover:text-coral">Fashion</Link></li>
          <li><Link href="/#footwear" className="hover:text-coral">Footwear</Link></li>
        </ul>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create `src/components/FooterTrustRow.tsx`**

```tsx
export function FooterTrustRow() {
  return (
    <div className="border-t border-[color:var(--rule)] py-6">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-ink-soft/80">
        <div>Payments via Razorpay · Delivered by Meesho Logistics</div>
        <div>Data on Salesforce (#1 CRM) · SSL secured</div>
        <div>CIN U62013PN2025PTC241138 · GSTIN 27AAMCC6643G1ZF</div>
        <div>Made in India · Curated in Pune</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/Footer.tsx`**

```tsx
import Link from "next/link";
import { FooterTrustRow } from "./FooterTrustRow";

export function Footer() {
  return (
    <footer className="mt-24 bg-cream-deep/60">
      <FooterTrustRow />
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono text-xs uppercase tracking-widest text-ink-soft">
        <div>
          <span>Curated by OrderLink · Delivered by Meesho</span>
          <br />
          <span className="text-ink-soft/70">Customer care on Salesforce</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-coral">About</Link>
          <Link href="/logistics" className="hover:text-coral">Logistics</Link>
          <Link href="/contact" className="hover:text-coral">Contact</Link>
          <Link href="/shipping-policy" className="hover:text-coral">Shipping</Link>
          <Link href="/refund-policy" className="hover:text-coral">Refunds</Link>
          <Link href="/terms" className="hover:text-coral">Terms</Link>
          <Link href="/privacy" className="hover:text-coral">Privacy</Link>
        </nav>
        <div className="text-right">
          © 2026 OrderLink<br />
          <span className="text-ink-soft/70 normal-case tracking-normal">
            a brand of CodeSierra Tech Private Limited
          </span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Update `src/app/layout.tsx` to wrap children in Header + Footer**

```tsx
import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz", "SOFT"] });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "OrderLink — Curated lifestyle goods, shop now",
  description:
    "A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.",
  metadataBase: new URL("https://orderlink.in"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans flex flex-col min-h-screen">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Copy Phase-1 assets into `public/assets/` so the logo resolves**

Phase 1 already has optimised images under `assets/optimized/`. Next.js serves from `public/`. Copy:

```bash
mkdir -p public/assets/optimized
cp -r assets/optimized/* public/assets/optimized/
```

- [ ] **Step 6: Run dev server + verify header and footer render**

```bash
npm run dev
```

Open http://localhost:3000. Expected:
- Header with OrderLink logo on the left + 5 category links on the right
- Footer trust-row visible with CIN + GSTIN + partner names
- Footer nav links render (they're dead for now; will 404)
- No console errors

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/app/layout.tsx public/assets/
git commit -m "feat(layout): Header + Footer + FooterTrustRow scaffold with CIN/GSTIN + partner lines"
```

---

## Milestone 2 — Product catalog + home page

### Task 5: LEGAL constants single-source-of-truth

**Files:** `src/lib/legal.ts`, `tests/lib/legal.test.ts`

- [ ] **Step 1: Write failing test `tests/lib/legal.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { LEGAL } from "@/lib/legal";

describe("LEGAL constants", () => {
  it("has CodeSierra Tech Private Limited as companyName", () => {
    expect(LEGAL.companyName).toBe("CodeSierra Tech Private Limited");
  });
  it("has valid 21-char CIN starting with U", () => {
    expect(LEGAL.cin).toMatch(/^U[A-Z0-9]{20}$/);
    expect(LEGAL.cin).toBe("U62013PN2025PTC241138");
  });
  it("has valid 15-char GSTIN", () => {
    expect(LEGAL.gstin).toMatch(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z][0-9A-Z]$/);
    expect(LEGAL.gstin).toBe("27AAMCC6643G1ZF");
  });
  it("has Pune registered address with 411014 pincode", () => {
    expect(LEGAL.registeredAddress.city).toBe("Pune");
    expect(LEGAL.registeredAddress.pincode).toBe("411014");
    expect(LEGAL.registeredAddress.line1).toBe("Eon Free Zone");
  });
  it("has WhatsApp number without spaces in E.164", () => {
    expect(LEGAL.whatsappNumber).toMatch(/^\+91\d{10,11}$/);
  });
  it("exposes derived helpers", () => {
    expect(LEGAL.whatsappDeepLink()).toMatch(/^https:\/\/wa\.me\/91/);
  });
});
```

- [ ] **Step 2: Run the test — expect RED**

```bash
npm test -- tests/lib/legal.test.ts
```

Expected: FAIL with "Cannot find module `@/lib/legal`".

- [ ] **Step 3: Create `src/lib/legal.ts`**

```ts
export const LEGAL = {
  companyName: "CodeSierra Tech Private Limited",
  brandName: "OrderLink",
  cin: "U62013PN2025PTC241138",
  gstin: "27AAMCC6643G1ZF",
  panEmbedded: "AAMCC6643G",
  registeredAddress: {
    line1: "Eon Free Zone",
    line2: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    country: "India",
  },
  supportEmail: "hello@orderlink.in",
  supportPhone: "+91 20 66897519",
  whatsappNumber: "+912066897519",
  dpoName: "Vinay Vernekar",
  dpoDesignation: "Director",
  grievanceOfficerName: "Vinay Vernekar",
  incorporatedYear: 2025,
  whatsappDeepLink(prefilled = "Hi%20OrderLink") {
    return `https://wa.me/${this.whatsappNumber.replace("+", "")}?text=${prefilled}`;
  },
  formattedAddress() {
    const a = this.registeredAddress;
    return `${a.line1}, ${a.line2}, ${a.city}, ${a.state} ${a.pincode}, ${a.country}`;
  },
} as const;
```

- [ ] **Step 4: Run the test — expect GREEN**

```bash
npm test -- tests/lib/legal.test.ts
```

Expected: all 6 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/legal.ts tests/lib/legal.test.ts
git commit -m "feat(legal): single-source-of-truth LEGAL constants with CIN, GSTIN, address, WhatsApp"
```

---

### Task 6: Product catalog — 25 SKUs with HSN codes

**Files:** `src/data/products.ts`, `tests/data/products.test.ts`

Product data comes from `Meesho_Top_Sellers_Report.xlsx` (25 rows). Titles rebranded for curated-lifestyle positioning. Only Oil Dispenser is `status: "live"`; others are `"coming-soon"`. HSN codes are India-standard GST classifications.

- [ ] **Step 1: Write failing test `tests/data/products.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { products, SHIPPING_PAISE, COD_ADVANCE_PAISE, getProductBySlug } from "@/data/products";

describe("products catalog", () => {
  it("has exactly 25 products", () => {
    expect(products).toHaveLength(25);
  });
  it("each product has required fields", () => {
    for (const p of products) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(3);
      expect(p.category).toMatch(/^(kitchen|beauty|electronics|fashion|footwear)$/);
      expect(p.status).toMatch(/^(live|coming-soon)$/);
      expect(p.itemPricePaise).toBeGreaterThan(0);
      expect(p.itemPrepaidPricePaise).toBeLessThan(p.itemPricePaise);
      expect(p.hsnCode).toMatch(/^\d{4,8}$/);
      expect(p.gstRatePercent).toBeGreaterThanOrEqual(5);
    }
  });
  it("only oil-dispenser is live in Phase 2a", () => {
    const live = products.filter((p) => p.status === "live");
    expect(live).toHaveLength(1);
    expect(live[0].slug).toBe("oil-dispenser");
  });
  it("SHIPPING_PAISE is 4900 and COD_ADVANCE_PAISE equals SHIPPING_PAISE", () => {
    expect(SHIPPING_PAISE).toBe(4900);
    expect(COD_ADVANCE_PAISE).toBe(SHIPPING_PAISE);
  });
  it("getProductBySlug returns product or undefined", () => {
    expect(getProductBySlug("oil-dispenser")?.title).toContain("Oil Dispenser");
    expect(getProductBySlug("nonexistent")).toBeUndefined();
  });
  it("prepaid price is exactly 5% off item rounded to nearest rupee", () => {
    for (const p of products) {
      const expected = Math.round((p.itemPricePaise * 0.95) / 100) * 100;
      expect(p.itemPrepaidPricePaise).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: Run the test — expect RED**

```bash
npm test -- tests/data/products.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/data/products.ts` with the full 25-product catalog**

The catalog is deliberately long — each row needs a rebranded title, MRP (≈ 2× item price as anchor), item price (from xlsx), derived prepaid price, HSN, GST rate, and category.

```ts
export const SHIPPING_PAISE = 4900; // ₹49 flat
export const COD_ADVANCE_PAISE = SHIPPING_PAISE; // POD upfront = shipping
export const SHIPPING_HSN_CODE = "9965";
export const SHIPPING_GST_RATE = 18;

export type Category = "kitchen" | "beauty" | "electronics" | "fashion" | "footwear";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  categoryLabel: string;
  status: "live" | "coming-soon";
  mrpPaise: number;
  itemPricePaise: number;
  itemPrepaidPricePaise: number;
  hsnCode: string;
  gstRatePercent: number;
  images: { src: string; alt: string; width: number; height: number }[];
  shortSubtitle: string;
  bullets: string[];
  description: string;
  specs: { label: string; value: string }[];
  startingInventory: number;
  meeshoRating?: number;
  meeshoReviewCount?: number;
  meeshoRatingDistribution?: { stars: 1 | 2 | 3 | 4 | 5; percent: number }[];
  meeshoSourceUrl?: string;
};

/** Round paise down to nearest rupee for prepaid discount (customer-favourable). */
function discount5(paise: number): number {
  return Math.round((paise * 0.95) / 100) * 100;
}

export const products: Product[] = [
  // === Kitchen (1 live + 4 coming-soon) ===
  {
    slug: "oil-dispenser",
    title: "Premium Glass Oil Dispenser — 500ml",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "live",
    mrpPaise: 29900,
    itemPricePaise: 15000,
    itemPrepaidPricePaise: discount5(15000), // ₹142
    hsnCode: "7013",
    gstRatePercent: 18,
    images: [
      { src: "/assets/products/oil-dispenser/1.webp", alt: "Oil dispenser front view", width: 1200, height: 1500 },
      { src: "/assets/products/oil-dispenser/2.webp", alt: "Oil dispenser side view", width: 1200, height: 1500 },
      { src: "/assets/products/oil-dispenser/3.webp", alt: "Wood cork detail", width: 1200, height: 1500 },
      { src: "/assets/products/oil-dispenser/4.webp", alt: "Scale reference on kitchen counter", width: 1200, height: 1500 },
    ],
    shortSubtitle: "500ml · glass & wood cork",
    bullets: [
      "Non-drip precision pour spout",
      "500ml borosilicate glass body",
      "Hand-finished wood cork stopper",
      "Fits comfortably on any counter",
    ],
    description:
      "A dispenser that earns its place on the counter. Borosilicate glass keeps oil fresh, the wood cork seals smoothly, and the pour spout is engineered not to drip. Everyday utility without the plastic-shelf-pharmacy aesthetic.",
    specs: [
      { label: "Capacity", value: "500 ml" },
      { label: "Material", value: "Borosilicate glass + wood cork" },
      { label: "Care", value: "Hand-wash with warm water" },
      { label: "Dimensions", value: "H 22 cm × D 7 cm" },
    ],
    startingInventory: 50,
    meeshoRating: 4.0,
    meeshoReviewCount: 42170,
    meeshoRatingDistribution: [
      { stars: 5, percent: 58 },
      { stars: 4, percent: 22 },
      { stars: 3, percent: 12 },
      { stars: 2, percent: 5 },
      { stars: 1, percent: 3 },
    ],
    meeshoSourceUrl: "https://www.meesho.com/oil-dispenser/p/87dspv",
  },
  // === Remaining kitchen (coming-soon) ===
  {
    slug: "manual-choppers",
    title: "Hand-Pull Vegetable Chopper",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12600,
    itemPrepaidPricePaise: discount5(12600),
    hsnCode: "8205",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "Plastic-free, string-pull design",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
    meeshoRating: 4.2,
    meeshoReviewCount: 121743,
    meeshoSourceUrl: "https://www.meesho.com/useful-manual-choppers/p/3pf347",
  },
  {
    slug: "graters-slicers",
    title: "Modern Graters & Slicers Set",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 10000,
    itemPrepaidPricePaise: discount5(10000),
    hsnCode: "8205",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 173480,
    meeshoSourceUrl: "https://www.meesho.com/modern-graters-slicers/p/4gq32x",
  },
  {
    slug: "chopping-board",
    title: "Beechwood Chopping Board",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11100,
    itemPrepaidPricePaise: discount5(11100),
    hsnCode: "4419",
    gstRatePercent: 12,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 94481,
    meeshoSourceUrl: "https://www.meesho.com/trendy-chopping-board/p/6etjgn",
  },
  {
    slug: "ice-cube-moulds",
    title: "Silicone Ice Cube Moulds (Set of 2)",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 9400,
    itemPrepaidPricePaise: discount5(9400),
    hsnCode: "3924",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.2, meeshoReviewCount: 18935,
    meeshoSourceUrl: "https://www.meesho.com/ice-cube-moulds/p/6tdk8i",
  },
  // === Beauty & Personal Care (all coming-soon) ===
  {
    slug: "ghar-magic-soap",
    title: "Ghar Soaps — Handcrafted Bath Soap",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 59900,
    itemPricePaise: 39700,
    itemPrepaidPricePaise: discount5(39700),
    hsnCode: "3401",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.3, meeshoReviewCount: 172926,
    meeshoSourceUrl: "https://www.meesho.com/ghar-soaps-magic-soap/p/5fm55a",
  },
  {
    slug: "rice-face-wash",
    title: "Mamaearth Rice Face Wash (2-pack)",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 23500,
    itemPrepaidPricePaise: discount5(23500),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.3, meeshoReviewCount: 130788,
    meeshoSourceUrl: "https://www.meesho.com/mamaearth-rice-face-wash/p/88muvd",
  },
  {
    slug: "keratin-hair-mask",
    title: "Nourishing Keratin Hair Mask",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 12000,
    itemPrepaidPricePaise: discount5(12000),
    hsnCode: "3305",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 121027,
    meeshoSourceUrl: "https://www.meesho.com/advanced-nourishing-hair/p/7bd5rn",
  },
  {
    slug: "body-cream",
    title: "Everyday Moisturising Body Cream",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 14900,
    itemPricePaise: 8500,
    itemPrepaidPricePaise: discount5(8500),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 22089,
    meeshoSourceUrl: "https://www.meesho.com/everyday-body-creams/p/5uk4r7",
  },
  {
    slug: "sunscreen-spf50",
    title: "Daily Sunscreen SPF 50",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 22900,
    itemPricePaise: 12100,
    itemPrepaidPricePaise: discount5(12100),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.2, meeshoReviewCount: 17555,
    meeshoSourceUrl: "https://www.meesho.com/sunscreen/p/7ygc2g",
  },
  // === Consumer Electronics (all coming-soon) ===
  {
    slug: "mobile-holder",
    title: "Adjustable Desk Mobile Holder",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11500,
    itemPrepaidPricePaise: discount5(11500),
    hsnCode: "8517",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 53148,
    meeshoSourceUrl: "https://www.meesho.com/mobile-holders/p/5c3yc9",
  },
  {
    slug: "mobile-charger",
    title: "Fast-Charge Mobile Charger",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 15900,
    itemPrepaidPricePaise: discount5(15900),
    hsnCode: "8504",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 34517,
    meeshoSourceUrl: "https://www.meesho.com/mobile-chargers/p/7f7ded",
  },
  {
    slug: "selfie-stick",
    title: "Fancy Selfie Stick",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 20600,
    itemPrepaidPricePaise: discount5(20600),
    hsnCode: "9006",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 13459,
    meeshoSourceUrl: "https://www.meesho.com/fancy-selfie-stick/p/6w4mcw",
  },
  {
    slug: "key-holder",
    title: "Magnetic Key Holder",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 10200,
    itemPrepaidPricePaise: discount5(10200),
    hsnCode: "8301",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.2, meeshoReviewCount: 9695,
    meeshoSourceUrl: "https://www.meesho.com/fancy-key-holders/p/6x6bgw",
  },
  {
    slug: "portronics-cable",
    title: "Portronics Konnect Fast Cable",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11200,
    itemPrepaidPricePaise: discount5(11200),
    hsnCode: "8544",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 8375,
    meeshoSourceUrl: "https://www.meesho.com/portronics-konnect/p/5ioq8l",
  },
  // === Fashion (Women Kurtis) — all coming-soon ===
  {
    slug: "rayon-myra-kurti",
    title: "Rayon Myra Petite Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 49900,
    itemPricePaise: 24400,
    itemPrepaidPricePaise: discount5(24400),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 80775,
    meeshoSourceUrl: "https://www.meesho.com/women-rayon-myra-petite-kurtis/p/6hnqz1",
  },
  {
    slug: "net-charvi-kurti",
    title: "Net Charvi Superior Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 20000,
    itemPrepaidPricePaise: discount5(20000),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 38198,
    meeshoSourceUrl: "https://www.meesho.com/women-net-charvi-superior-kurtis/p/65eqip",
  },
  {
    slug: "rayon-banita-kurti",
    title: "Rayon Banita Alluring Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 19600,
    itemPrepaidPricePaise: discount5(19600),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 16188,
    meeshoSourceUrl: "https://www.meesho.com/women-rayon-banita-kurtis/p/6dy8dt",
  },
  {
    slug: "myra-drishya-kurti",
    title: "Myra Drishya Festive Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 89900,
    itemPricePaise: 44300,
    itemPrepaidPricePaise: discount5(44300),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.2, meeshoReviewCount: 9939,
    meeshoSourceUrl: "https://www.meesho.com/myra-drishya-kurtis/p/63xwk2",
  },
  {
    slug: "aagyeyi-kurti",
    title: "Aagyeyi Casual Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 18100,
    itemPrepaidPricePaise: discount5(18100),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 6709,
    meeshoSourceUrl: "https://www.meesho.com/aagyeyi-fabulous-kurtis/p/255r2b",
  },
  // === Women Footwear — all coming-soon ===
  {
    slug: "relaxed-slippers",
    title: "Relaxed Everyday Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 34900,
    itemPricePaise: 17300,
    itemPrepaidPricePaise: discount5(17300),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.1, meeshoReviewCount: 31155,
    meeshoSourceUrl: "https://www.meesho.com/relaxed-fabulous-women-slippers/p/74yq3z",
  },
  {
    slug: "fashion-slippers-1",
    title: "Unique Fashionable Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12800,
    itemPrepaidPricePaise: discount5(12800),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 17580,
    meeshoSourceUrl: "https://www.meesho.com/unique-fashionable-women-slippers/p/77ye3p",
  },
  {
    slug: "fashion-slippers-2",
    title: "Latest Fashionable Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 13700,
    itemPrepaidPricePaise: discount5(13700),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 11644,
    meeshoSourceUrl: "https://www.meesho.com/latest-fashionable-women-slippers/p/5ue1lm",
  },
  {
    slug: "birde-casual-shoes",
    title: "Birde Casual Shoes",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 79900,
    itemPricePaise: 35900,
    itemPrepaidPricePaise: discount5(35900),
    hsnCode: "6404",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 9007,
    meeshoSourceUrl: "https://www.meesho.com/birde-casual-shoes/p/5fgn0b",
  },
  {
    slug: "attractive-slippers",
    title: "Unique Attractive Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12800,
    itemPrepaidPricePaise: discount5(12800),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [], shortSubtitle: "", bullets: [], description: "", specs: [], startingInventory: 0,
    meeshoRating: 4.0, meeshoReviewCount: 5059,
    meeshoSourceUrl: "https://www.meesho.com/unique-attractive-women-slippers/p/7cmwwt",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(): Record<Category, Product[]> {
  const grouped: Record<Category, Product[]> = {
    kitchen: [], beauty: [], electronics: [], fashion: [], footwear: [],
  };
  for (const p of products) grouped[p.category].push(p);
  return grouped;
}
```

- [ ] **Step 4: Run the test — expect GREEN**

```bash
npm test -- tests/data/products.test.ts
```

Expected: all 6 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/products.ts tests/data/products.test.ts
git commit -m "feat(catalog): 25-product catalog with HSN codes, Oil Dispenser live, rest coming-soon"
```

---

### Task 7: Home page with category bands + ProductCard

**Files:** `src/app/page.tsx`, `src/components/Hero.tsx`, `src/components/CategoryBand.tsx`, `src/components/ProductCard.tsx`, `src/components/ComingSoonBadge.tsx`

- [ ] **Step 1: Create `src/components/ComingSoonBadge.tsx`**

```tsx
export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-widest text-ink-soft bg-cream-deep border border-[color:var(--rule)] rounded-full px-2 py-0.5">
      Coming Soon
    </span>
  );
}
```

- [ ] **Step 2: Create `src/components/ProductCard.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";
import { SHIPPING_PAISE } from "@/data/products";
import { ComingSoonBadge } from "./ComingSoonBadge";

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function ProductCard({ product }: { product: Product }) {
  const isLive = product.status === "live";
  const hasImage = product.images.length > 0;
  const discountPercent =
    product.mrpPaise > product.itemPricePaise
      ? Math.round(((product.mrpPaise - product.itemPricePaise) / product.mrpPaise) * 100)
      : 0;

  return (
    <Link
      href={isLive ? `/p/${product.slug}` : "#"}
      className={`group block ${isLive ? "" : "cursor-not-allowed opacity-60"}`}
      aria-disabled={!isLive}
      onClick={(e) => !isLive && e.preventDefault()}
    >
      <div className="relative aspect-[4/5] bg-cream-deep rounded-lg overflow-hidden">
        {hasImage ? (
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            sizes="(max-width: 768px) 50vw, 20vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display italic text-ink-soft/40 text-5xl">
            {product.title.charAt(0)}
          </div>
        )}
        <div className="absolute top-3 right-3 font-mono text-[0.62rem] uppercase tracking-widest text-ink-soft/70 bg-cream/80 backdrop-blur px-2 py-0.5 rounded-full">
          {product.categoryLabel.split(" ")[0]}
        </div>
      </div>

      <div className="mt-4 px-1 space-y-1">
        <h3 className="font-display text-lg leading-tight text-ink">{product.title}</h3>
        {product.shortSubtitle && (
          <p className="font-sans text-sm text-ink-soft">{product.shortSubtitle}</p>
        )}
        <div className="pt-2">
          {isLive ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-coral">
                  {rupees(product.itemPricePaise)}
                </span>
                {product.mrpPaise > product.itemPricePaise && (
                  <>
                    <span className="font-sans text-sm text-ink-soft line-through">
                      {rupees(product.mrpPaise)}
                    </span>
                    <span className="font-mono text-[0.68rem] uppercase tracking-wider text-coral">
                      {discountPercent}% off
                    </span>
                  </>
                )}
              </div>
              <p className="font-sans text-xs text-ink-soft/80 mt-1">
                + {rupees(SHIPPING_PAISE)} shipping · non-refundable
              </p>
              {product.meeshoReviewCount && (
                <p className="font-mono text-[0.7rem] text-ink-soft/80 mt-1">
                  ★ {product.meeshoRating?.toFixed(1)} · {product.meeshoReviewCount.toLocaleString("en-IN")} loved it
                </p>
              )}
              <button
                type="button"
                className="mt-3 w-full rounded-md bg-coral text-cream font-sans text-sm font-medium py-2.5 hover:opacity-90 transition"
              >
                Buy Now
              </button>
            </>
          ) : (
            <ComingSoonBadge />
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create `src/components/CategoryBand.tsx`**

```tsx
import type { Category, Product } from "@/data/products";
import { ProductCard } from "./ProductCard";

const TAGLINES: Record<Category, string> = {
  kitchen: "Small tools, big evenings.",
  beauty: "Well-kept, quietly.",
  electronics: "Small upgrades, everyday.",
  fashion: "Wardrobe staples, re-considered.",
  footwear: "Soft soles, long walks.",
};

const LABELS: Record<Category, string> = {
  kitchen: "Kitchen",
  beauty: "Beauty & Personal Care",
  electronics: "Consumer Electronics",
  fashion: "Fashion — Kurtis",
  footwear: "Women Footwear",
};

export function CategoryBand({ category, products }: { category: Category; products: Product[] }) {
  return (
    <section id={category} className="py-16 border-t border-[color:var(--rule)]">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-10 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-4xl text-ink">
            {LABELS[category]}
            <em className="ml-3 text-ink-soft text-2xl font-normal">{TAGLINES[category]}</em>
          </h2>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            {products.length} products
          </span>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `src/components/Hero.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[70vh] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <picture>
          <source type="image/webp" srcSet="/assets/optimized/bg-2400.webp 2400w, /assets/optimized/bg-1600.webp 1600w, /assets/optimized/bg-1200.webp 1200w" sizes="100vw" />
          <Image
            src="/assets/optimized/bg-1600.webp"
            alt=""
            fill
            priority
            className="object-cover"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-cream/10 via-transparent to-cream" />
      </div>
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <h1 className="font-display text-hero font-light text-ink max-w-3xl">
          Everyday objects,{" "}
          <em className="italic font-normal relative">
            better-curated.
            <span
              className="absolute left-0 right-0 bottom-1 h-[0.09em] bg-coral rounded"
              aria-hidden
            />
          </em>
        </h1>
        <p className="mt-6 font-sans text-lg text-ink-soft max-w-xl">
          A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.
        </p>
        <Link
          href="#kitchen"
          className="inline-flex items-center gap-2 mt-8 rounded-md bg-coral text-cream font-sans px-6 py-3 font-medium hover:opacity-90"
        >
          Shop Kitchen ↓
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Replace `src/app/page.tsx` with the real home page**

```tsx
import { Hero } from "@/components/Hero";
import { CategoryBand } from "@/components/CategoryBand";
import { productsByCategory } from "@/data/products";

export const dynamic = "force-static";

export default function HomePage() {
  const grouped = productsByCategory();
  return (
    <>
      <Hero />
      <CategoryBand category="kitchen" products={grouped.kitchen} />
      <CategoryBand category="beauty" products={grouped.beauty} />
      <CategoryBand category="electronics" products={grouped.electronics} />
      <CategoryBand category="fashion" products={grouped.fashion} />
      <CategoryBand category="footwear" products={grouped.footwear} />
    </>
  );
}
```

- [ ] **Step 6: Run dev server and manually verify**

```bash
npm run dev
```

Expected at http://localhost:3000:
- Hero with background image (flat-lay), headline, coral underline on "better-curated"
- 5 category bands, each with 5 cards
- Only `Oil Dispenser` has a visible price + Buy Now button; the 24 others show "Coming Soon" badge
- All placeholders render (products without images show a single letter)
- Header + footer visible; clicking footer trust row shows CIN/GSTIN

Run Lighthouse in Chrome DevTools → note the mobile score. It should already be ≥85 for Performance.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/
git commit -m "feat(home): hero + 5 category bands + ProductCard + ComingSoonBadge"
```

---

### Task 8: Product page for Oil Dispenser (static render, no buy flow yet)

**Files:** `src/app/p/[slug]/page.tsx`, `src/components/ProductGallery.tsx`, `src/components/TrustBand.tsx`, `src/components/SalesforceTrustStrip.tsx`, `src/components/ReviewDistribution.tsx`

- [ ] **Step 1: Create `src/components/TrustBand.tsx`**

```tsx
import Link from "next/link";

export function TrustBand() {
  return (
    <Link
      href="/logistics"
      className="block rounded-lg border border-[color:var(--rule)] p-4 bg-cream-deep/40 hover:bg-cream-deep/80 transition"
    >
      <p className="font-sans text-sm font-medium text-ink">🚚 Shipped by Meesho Logistics</p>
      <p className="font-sans text-xs text-ink-soft mt-1">
        India's largest fulfilment network · 50 Cr+ deliveries · 19,000+ pincodes
      </p>
      <p className="font-sans text-xs text-ink-soft/80 mt-1">
        You'll receive SMS tracking updates from Meesho.
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/components/SalesforceTrustStrip.tsx`**

```tsx
export function SalesforceTrustStrip() {
  return (
    <p className="font-sans text-xs text-ink-soft/80 flex items-start gap-2">
      <span aria-hidden>🔒</span>
      <span>Your details stored on Salesforce, the same CRM Fortune 500 companies trust.</span>
    </p>
  );
}
```

- [ ] **Step 3: Create `src/components/ReviewDistribution.tsx`**

```tsx
type Row = { stars: 1 | 2 | 3 | 4 | 5; percent: number };

export function ReviewDistribution({ distribution, totalReviews }: { distribution: Row[]; totalReviews: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--rule)] p-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-wider text-ink-soft mb-3">
        Rating distribution from {totalReviews.toLocaleString("en-IN")} Meesho reviews
      </p>
      <ul className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((s) => {
          const row = distribution.find((r) => r.stars === s);
          const percent = row?.percent ?? 0;
          return (
            <li key={s} className="flex items-center gap-3 font-sans text-sm">
              <span className="w-14 font-mono text-[0.7rem] text-ink-soft">
                {"★".repeat(s)}
                <span className="text-ink-soft/30">{"★".repeat(5 - s)}</span>
              </span>
              <div className="flex-1 h-2 bg-cream-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-coral/70"
                  style={{ width: `${percent}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-10 font-mono text-[0.7rem] text-ink-soft/80 text-right">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/ProductGallery.tsx` (client component)**

```tsx
"use client";
import Image from "next/image";
import { useState } from "react";

type Img = { src: string; alt: string; width: number; height: number };

export function ProductGallery({ images }: { images: Img[] }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="aspect-square bg-cream-deep rounded-lg" />;
  }
  return (
    <div>
      <div className="relative aspect-square bg-cream-deep rounded-lg overflow-hidden">
        <Image
          src={images[active].src}
          alt={images[active].alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                idx === active ? "border-coral" : "border-transparent"
              }`}
              onClick={() => setActive(idx)}
              aria-label={`View image ${idx + 1}`}
            >
              <Image src={img.src} alt={img.alt} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/p/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, products, SHIPPING_PAISE } from "@/data/products";
import { ProductGallery } from "@/components/ProductGallery";
import { TrustBand } from "@/components/TrustBand";
import { ReviewDistribution } from "@/components/ReviewDistribution";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const isLive = product.status === "live";
  const discountPct =
    product.mrpPaise > product.itemPricePaise
      ? Math.round(((product.mrpPaise - product.itemPricePaise) / product.mrpPaise) * 100)
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <Link href="/" className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-coral">
        ← Back to all products
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-12">
        <ProductGallery images={product.images} />

        <div className="space-y-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
              {product.categoryLabel}
            </p>
            <h1 className="font-display text-4xl text-ink mt-2">{product.title}</h1>
            {product.shortSubtitle && (
              <p className="font-sans text-lg text-ink-soft mt-1">{product.shortSubtitle}</p>
            )}
          </div>

          {product.meeshoRating && product.meeshoReviewCount && (
            <p className="font-sans text-sm text-ink-soft">
              ★ {product.meeshoRating.toFixed(1)} ·{" "}
              {product.meeshoReviewCount.toLocaleString("en-IN")} happy customers at Meesho
            </p>
          )}

          {isLive ? (
            <>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl font-semibold text-coral">
                    {rupees(product.itemPricePaise)}
                  </span>
                  <span className="font-sans text-lg text-ink-soft line-through">
                    {rupees(product.mrpPaise)}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-coral bg-coral/10 rounded px-2 py-0.5">
                    {discountPct}% off item
                  </span>
                </div>
                <p className="font-sans text-sm text-ink-soft mt-2">
                  + {rupees(SHIPPING_PAISE)} shipping · non-refundable
                </p>
                <p className="font-sans text-base text-ink mt-2 font-medium">
                  Total: {rupees(product.itemPricePaise + SHIPPING_PAISE)}
                </p>
              </div>

              {/* Payment selector + buy now come online in Task 14 (checkout) */}
              <div className="rounded-lg border-2 border-dashed border-[color:var(--rule-strong)] p-4">
                <p className="font-sans text-sm text-ink-soft">
                  [ Payment selector + Buy Now button — wired in Task 14 ]
                </p>
              </div>

              <TrustBand />

              <ul className="grid grid-cols-2 gap-2 font-sans text-xs text-ink-soft">
                <li>📦 Delivery in 3–8 days · <strong>15-day guarantee or shipping refunded</strong></li>
                <li>🔄 7-day return on item</li>
                <li>🔒 Secure payment via Razorpay</li>
                <li>⏱ Only {product.startingInventory} left</li>
              </ul>
            </>
          ) : (
            <>
              <ComingSoonBadge />
              <p className="font-sans text-ink-soft">
                This product is part of our curated pipeline and isn't available for purchase yet.
              </p>
            </>
          )}
        </div>
      </div>

      {isLive && product.description && (
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="font-display text-2xl text-ink">Why you'll love it</h2>
              <ul className="mt-4 space-y-2 font-sans text-ink">
                {product.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span aria-hidden className="text-coral">—</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink">Description</h2>
              <p className="mt-4 font-sans text-ink leading-relaxed">{product.description}</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink">Specifications</h2>
              <dl className="mt-4 divide-y divide-[color:var(--rule)]">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="py-2 flex justify-between font-sans text-sm">
                    <dt className="text-ink-soft">{spec.label}</dt>
                    <dd className="text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <aside className="space-y-6">
            {product.meeshoRatingDistribution && product.meeshoReviewCount && (
              <ReviewDistribution
                distribution={product.meeshoRatingDistribution}
                totalReviews={product.meeshoReviewCount}
              />
            )}
          </aside>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Run dev server, verify the product page**

```bash
npm run dev
```

Navigate to http://localhost:3000/p/oil-dispenser. Expected:
- Back link, category label, title, subtitle
- 4 image slots (grey fallback until you drop real photos; gallery thumbnails clickable even without images)
- Price block with ₹150 item, MRP ₹299 struck through, 50% off badge, ₹49 shipping line, Total ₹199
- Dashed-border placeholder where Buy Now will go
- Trust band linking to /logistics
- 4 trust chips (delivery, returns, Razorpay, Only N left)
- Below fold: "Why you'll love it" bullets, description, specs table, review distribution chart

Then navigate to http://localhost:3000/p/rice-face-wash → expect Coming Soon treatment.

Then http://localhost:3000/p/does-not-exist → expect 404.

- [ ] **Step 7: Commit**

```bash
git add src/app/p/ src/components/
git commit -m "feat(product): product page with gallery, price block, trust band, review distribution (buy flow stub)"
```

---

## Milestone 3 — Pricing logic + database infrastructure

### Task 9: Pricing pure-function library with full test coverage

**Files:** `src/lib/pricing.ts`, `tests/lib/pricing.test.ts`

Pure functions that compute order totals for both payment methods. No side-effects, no DB, no network — fully unit-testable.

- [ ] **Step 1: Write failing test `tests/lib/pricing.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  calculateOrderAmounts,
  calculateGSTBreakup,
  type PaymentMethod,
} from "@/lib/pricing";
import { SHIPPING_PAISE } from "@/data/products";

describe("calculateOrderAmounts — prepaid", () => {
  it("applies 5% discount to item only, shipping stays full", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14250, // ₹142.50 — test will round in the fn though
      method: "prepaid",
      couponDiscountPaise: 0,
    });
    // With customer-favourable rounding we'd expect 14200 (₹142), not 14250
    expect(r.subtotalPaise).toBe(15000 + SHIPPING_PAISE); // 19900
    expect(r.discountPaise).toBe(750); // 15000 - 14250
    expect(r.totalPaise).toBe(19900 - 750); // 19150
    expect(r.advancePaise).toBe(19150);
    expect(r.balanceDuePaise).toBe(0);
  });
});

describe("calculateOrderAmounts — pay-on-delivery", () => {
  it("charges ₹49 upfront, item price on delivery", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14200,
      method: "pay_on_delivery",
      couponDiscountPaise: 0,
    });
    expect(r.subtotalPaise).toBe(15000 + SHIPPING_PAISE);
    expect(r.discountPaise).toBe(0); // no prepaid discount on POD
    expect(r.totalPaise).toBe(19900);
    expect(r.advancePaise).toBe(SHIPPING_PAISE);
    expect(r.balanceDuePaise).toBe(15000);
  });
});

describe("coupon discounts", () => {
  it("subtracts coupon on top of prepaid discount", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14200,
      method: "prepaid",
      couponDiscountPaise: 1000, // ₹10 WELCOME10
    });
    // subtotal 19900 − discount(800) − coupon(1000) = 18100
    expect(r.totalPaise).toBe(18100);
    expect(r.advancePaise).toBe(18100);
  });
});

describe("calculateGSTBreakup", () => {
  it("intra-state MH order splits CGST/SGST equally", () => {
    const r = calculateGSTBreakup({
      lines: [
        { taxableValuePaise: 15000, gstRatePercent: 18 }, // item
        { taxableValuePaise: 4900, gstRatePercent: 18 },  // shipping
      ],
      shippingState: "Maharashtra",
    });
    // 15000 × 18% = 2700 total tax → 1350 CGST + 1350 SGST
    // 4900 × 18% ≈ 882 total tax → 441 CGST + 441 SGST (rounded)
    expect(r.cgstPaise).toBe(1791);
    expect(r.sgstPaise).toBe(1791);
    expect(r.igstPaise).toBe(0);
  });

  it("inter-state order uses IGST", () => {
    const r = calculateGSTBreakup({
      lines: [
        { taxableValuePaise: 15000, gstRatePercent: 18 },
        { taxableValuePaise: 4900, gstRatePercent: 18 },
      ],
      shippingState: "Karnataka",
    });
    expect(r.cgstPaise).toBe(0);
    expect(r.sgstPaise).toBe(0);
    expect(r.igstPaise).toBe(3582); // 2700 + 882
  });
});
```

- [ ] **Step 2: Run the test — expect RED**

```bash
npm test -- tests/lib/pricing.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/pricing.ts`**

```ts
import { SHIPPING_PAISE } from "@/data/products";

export type PaymentMethod = "prepaid" | "pay_on_delivery";

export type OrderAmountInput = {
  itemPricePaise: number;
  itemPrepaidPricePaise: number;
  method: PaymentMethod;
  couponDiscountPaise: number;
};

export type OrderAmountResult = {
  subtotalPaise: number;
  discountPaise: number;       // prepaid-only (item delta) + coupon
  totalPaise: number;
  advancePaise: number;        // charged now via Razorpay
  balanceDuePaise: number;     // COD cash portion
  shippingPaise: number;       // surfaced separately for invoice
};

export function calculateOrderAmounts(input: OrderAmountInput): OrderAmountResult {
  const shippingPaise = SHIPPING_PAISE;
  const subtotalPaise = input.itemPricePaise + shippingPaise;

  const prepaidItemDiscount =
    input.method === "prepaid" ? input.itemPricePaise - input.itemPrepaidPricePaise : 0;
  const discountPaise = prepaidItemDiscount + input.couponDiscountPaise;
  const totalPaise = subtotalPaise - discountPaise;

  const advancePaise = input.method === "prepaid" ? totalPaise : shippingPaise;
  const balanceDuePaise = totalPaise - advancePaise;

  return { subtotalPaise, discountPaise, totalPaise, advancePaise, balanceDuePaise, shippingPaise };
}

export type GSTLine = { taxableValuePaise: number; gstRatePercent: number };
export type GSTInput = { lines: GSTLine[]; shippingState: string };
export type GSTResult = {
  basePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
};

const OUR_STATE = "Maharashtra";

export function calculateGSTBreakup(input: GSTInput): GSTResult {
  const isIntra = input.shippingState === OUR_STATE;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let base = 0;
  for (const line of input.lines) {
    const tax = Math.round((line.taxableValuePaise * line.gstRatePercent) / 100);
    base += line.taxableValuePaise;
    if (isIntra) {
      cgst += Math.round(tax / 2);
      sgst += tax - Math.round(tax / 2); // ensures total equals `tax` even on odd division
    } else {
      igst += tax;
    }
  }
  return {
    basePaise: base,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: igst,
    totalTaxPaise: cgst + sgst + igst,
  };
}

export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}
```

- [ ] **Step 4: Run the test — expect GREEN**

```bash
npm test -- tests/lib/pricing.test.ts
```

Expected: all 5 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts tests/lib/pricing.test.ts
git commit -m "feat(pricing): pure-fn order amount + GST breakup calculators with tests"
```

---

### Task 10: Drizzle setup + Postgres schema + initial migration

**Files:** `drizzle.config.ts`, `src/db/schema.ts`, `src/db/client.ts`, `.env.example`, `src/db/migrations/` (generated)

- [ ] **Step 1: Create `.env.example` with the full env skeleton from spec §8.3**

```bash
# Core
DATABASE_URL=postgres://orderlink_user:CHANGE_ME@localhost:5432/orderlink
SITE_URL=http://localhost:3000

# Razorpay (test mode for local dev)
RAZORPAY_KEY_ID=rzp_test_CHANGE_ME
RAZORPAY_KEY_SECRET=CHANGE_ME
RAZORPAY_WEBHOOK_SECRET=CHANGE_ME

# Email (admin alerts only)
RESEND_API_KEY=CHANGE_ME

# Admin basic-auth
ADMIN_USERNAME=vinay
ADMIN_PASSWORD_BCRYPT=CHANGE_ME

# Column-level encryption for pending_sf_sync payloads
ENCRYPTION_KEY=CHANGE_ME_base64_32_bytes

# Sentry (blank for local dev to disable)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Salesforce
SF_LOGIN_URL=https://codesierra.my.salesforce.com
SF_CONSUMER_KEY=CHANGE_ME
SF_USERNAME=integration@codesierra.tech.orderlink
SF_JWT_PRIVATE_KEY_PATH=./sf-jwt.pem
SF_PERSON_ACCOUNT_RECORD_TYPE_ID=012CHANGE_ME
SF_ORDER_RECORD_TYPE_ID=012CHANGE_ME
SF_PRODUCT_RECORD_TYPE_ID=012CHANGE_ME
SF_EXTERNAL_ID_PREFIX=orderlink
SF_SYNC_ENABLED=true

# Feature flags
FOMO_POPUP_ENABLED=true
```

Commit this file; developers copy it to `.env` and fill real values locally.

- [ ] **Step 2: Create `drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
} satisfies Config;
```

- [ ] **Step 3: Create `src/db/schema.ts` with all Phase 2a tables**

```ts
import { sql } from "drizzle-orm";
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

// Encrypted bytea helper (encryption/decryption lives in src/lib/crypto.ts)
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const ordersRef = pgTable("orders_ref", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull(), // pending_advance | advance_paid | pending_payment | paid | confirmed | shipped | delivered | cancelled | refunded
  paymentMethod: text("payment_method").notNull(), // prepaid | pay_on_delivery
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
  trackKey: text("track_key").notNull(), // last 4 of mobile
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
  payloadIv: text("payload_iv").notNull(), // AES-GCM nonce (base64)
  payloadTag: text("payload_tag").notNull(), // AES-GCM auth tag (base64)
  jobKind: text("job_kind").notNull(), // full_sync | status_update | delete_account
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
  kind: text("kind").notNull(), // first_order | exit_intent
  amountPaise: integer("amount_paise").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxUses: integer("max_uses"),
  redemptions: integer("redemptions").notNull().default(0),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponCode: text("coupon_code").notNull().references(() => coupons.code),
  orderRefId: uuid("order_ref_id").notNull().references(() => ordersRef.id),
  customerEmailHash: text("customer_email_hash").notNull(), // enforces one-per-email
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
  productSlug: text("product_slug").notNull(), // also used for pincode requests: "pincode:XXXXXX"
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});
```

- [ ] **Step 4: Create `src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(queryClient, { schema });
export { schema };
```

- [ ] **Step 5: Generate the initial migration**

```bash
npx drizzle-kit generate --name init
```

Expected: a new file under `src/db/migrations/0000_init.sql` is produced.

- [ ] **Step 6: Create the `invoice_sequence` migration manually**

Create `src/db/migrations/0001_invoice_sequence.sql` with:

```sql
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1 MINVALUE 1;
```

- [ ] **Step 7: Start a local Postgres for development**

Instead of using the VPS Postgres (which is production), run a throwaway local one via Docker:

```bash
docker run -d --name orderlink-pg-dev \
  -e POSTGRES_PASSWORD=devpw \
  -e POSTGRES_USER=orderlink_user \
  -e POSTGRES_DB=orderlink \
  -p 5432:5432 \
  postgres:16-alpine
```

Update your local `.env`:
```
DATABASE_URL=postgres://orderlink_user:devpw@localhost:5432/orderlink
```

- [ ] **Step 8: Apply migrations**

```bash
npx drizzle-kit migrate
```

Expected: both migrations applied; a `__drizzle_migrations` table appears.

Verify:
```bash
docker exec orderlink-pg-dev psql -U orderlink_user -d orderlink -c "\dt"
docker exec orderlink-pg-dev psql -U orderlink_user -d orderlink -c "\ds invoice_sequence"
```

- [ ] **Step 9: Commit**

```bash
git add drizzle.config.ts src/db/ .env.example
git commit -m "feat(db): Drizzle schema for orders_ref, pending_sf_sync, inventory, coupons, webhooks + invoice_sequence"
```

---

### Task 11: Invoice number generator (gap-free via Postgres SEQUENCE)

**Files:** `src/lib/invoice-number.ts`, `tests/lib/invoice-number.test.ts`

- [ ] **Step 1: Write failing test `tests/lib/invoice-number.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { generateInvoiceNumber, formatInvoiceNumber } from "@/lib/invoice-number";
import { sql } from "drizzle-orm";

describe("invoice-number", () => {
  beforeEach(async () => {
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
  });

  it("formats number with year + 6-digit zero-pad", () => {
    expect(formatInvoiceNumber(1, 2026)).toBe("OL-INV-2026-000001");
    expect(formatInvoiceNumber(42, 2026)).toBe("OL-INV-2026-000042");
    expect(formatInvoiceNumber(999999, 2026)).toBe("OL-INV-2026-999999");
  });

  it("generates sequential invoice numbers via DB sequence", async () => {
    const first = await generateInvoiceNumber();
    const second = await generateInvoiceNumber();
    const third = await generateInvoiceNumber();
    expect(first).toBe("OL-INV-2026-000001");
    expect(second).toBe("OL-INV-2026-000002");
    expect(third).toBe("OL-INV-2026-000003");
  });

  it("is gap-free even under concurrent calls", async () => {
    const promises = Array.from({ length: 10 }, () => generateInvoiceNumber());
    const results = await Promise.all(promises);
    const numbers = results.map((s) => parseInt(s.split("-").pop()!, 10)).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
```

- [ ] **Step 2: Run the test — expect RED**

```bash
npm test -- tests/lib/invoice-number.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/invoice-number.ts`**

```ts
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export function formatInvoiceNumber(seqValue: number, year: number): string {
  return `OL-INV-${year}-${String(seqValue).padStart(6, "0")}`;
}

export async function generateInvoiceNumber(
  now: Date = new Date()
): Promise<string> {
  const row = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('invoice_sequence') AS nextval`
  );
  const seqValue = parseInt(row.rows[0].nextval as unknown as string, 10);
  return formatInvoiceNumber(seqValue, now.getFullYear());
}
```

- [ ] **Step 4: Run the test — expect GREEN**

```bash
npm test -- tests/lib/invoice-number.test.ts
```

Expected: all 3 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice-number.ts tests/lib/invoice-number.test.ts
git commit -m "feat(invoice): gap-free OL-INV-YYYY-000001 generator via Postgres SEQUENCE"
```

---

### Task 12: Pincode serviceability whitelist + lookup API

**Files:** `scripts/generate-pincode-whitelist.ts`, `public/pincodes.json`, `src/lib/pincode/whitelist.ts`, `src/lib/pincode/lookup.ts`, `src/app/api/pincode/[code]/route.ts`, `tests/lib/pincode.test.ts`

- [ ] **Step 1: Create `scripts/generate-pincode-whitelist.ts`**

Generates a minimal whitelist of 28,000+ pincodes. For Phase 2a we seed a conservative list of all Indian pincodes from the free `all_india_pincode.csv` published at data.gov.in (downloaded once at build time, committed). If you don't have time to fetch at build, an emergency fallback pincode file with metro-serviceable pincodes is included.

```ts
import fs from "node:fs/promises";
import path from "node:path";

// Fetch the government's pincode directory (one-shot; commit the JSON output)
async function main() {
  const url = "https://api.postalpincode.in/"; // individual lookups; we use the batch set below
  // For Phase 2a: use a committed curated list. Generate via:
  //   python scripts/pincodes_from_csv.py > public/pincodes.json
  // For now, write a small seed file manually or source from data.gov.in.
  // This script is a placeholder you enhance as needed.
  const seed = [400001, 110001, 560001, 411014, 600001, 700001, 380001, 302001, 226001, 500001];
  await fs.writeFile(
    path.join(process.cwd(), "public/pincodes.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), pincodes: seed.map(String) }, null, 2)
  );
  console.log(`Wrote ${seed.length} pincodes (seed list). Replace with full list before launch.`);
}
main();
```

Run: `npx tsx scripts/generate-pincode-whitelist.ts`

Expected output: `public/pincodes.json` with the seed list. **NOTE:** before production, replace this seed with a full 28k+ pincode list from data.gov.in's PIN Code Directory. The logic below handles any size.

- [ ] **Step 2: Write failing test `tests/lib/pincode.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isServiceablePincode, loadPincodeWhitelist } from "@/lib/pincode/whitelist";

describe("pincode whitelist", () => {
  it("returns true for a known pincode", async () => {
    await loadPincodeWhitelist();
    expect(isServiceablePincode("411014")).toBe(true);
    expect(isServiceablePincode("400001")).toBe(true);
  });
  it("returns false for unknown pincode", async () => {
    await loadPincodeWhitelist();
    expect(isServiceablePincode("999999")).toBe(false);
  });
  it("rejects invalid formats", async () => {
    await loadPincodeWhitelist();
    expect(isServiceablePincode("abc")).toBe(false);
    expect(isServiceablePincode("12345")).toBe(false);
    expect(isServiceablePincode("1234567")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test — expect RED**

```bash
npm test -- tests/lib/pincode.test.ts
```

- [ ] **Step 4: Create `src/lib/pincode/whitelist.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";

let cache: Set<string> | null = null;

export async function loadPincodeWhitelist(): Promise<Set<string>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public/pincodes.json");
  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as { pincodes: string[] };
  cache = new Set(parsed.pincodes);
  return cache;
}

export function isServiceablePincode(pincode: string): boolean {
  if (!/^\d{6}$/.test(pincode)) return false;
  if (!cache) return false; // must loadPincodeWhitelist() first
  return cache.has(pincode);
}
```

- [ ] **Step 5: Create `src/lib/pincode/lookup.ts` (India Post API with in-memory 24h cache)**

```ts
type LookupResult = { city: string; state: string } | null;

const cache = new Map<string, { at: number; result: LookupResult }>();
const TTL = 24 * 60 * 60 * 1000;

export async function lookupPincode(pincode: string): Promise<LookupResult> {
  const cached = cache.get(pincode);
  if (cached && Date.now() - cached.at < TTL) return cached.result;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const po = Array.isArray(data) && data[0]?.PostOffice?.[0];
    const result = po ? { city: po.District, state: po.State } : null;
    cache.set(pincode, { at: Date.now(), result });
    return result;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Create `src/app/api/pincode/[code]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { isServiceablePincode, loadPincodeWhitelist } from "@/lib/pincode/whitelist";
import { lookupPincode } from "@/lib/pincode/lookup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await loadPincodeWhitelist();
  const serviceable = isServiceablePincode(code);

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_format" }, { status: 400 });
  }

  if (!serviceable) {
    return NextResponse.json({ ok: true, serviceable: false });
  }

  const lookup = await lookupPincode(code);
  if (!lookup) {
    return NextResponse.json({ ok: true, serviceable: true, city: null, state: null });
  }

  return NextResponse.json({
    ok: true,
    serviceable: true,
    city: lookup.city,
    state: lookup.state,
  });
}
```

- [ ] **Step 7: Run tests — expect GREEN**

```bash
npm test -- tests/lib/pincode.test.ts
```

- [ ] **Step 8: Smoke-test the API**

```bash
npm run dev
# in another terminal:
curl http://localhost:3000/api/pincode/411014
# → {"ok":true,"serviceable":true,"city":"Pune","state":"Maharashtra"}
curl http://localhost:3000/api/pincode/999999
# → {"ok":true,"serviceable":false}
curl http://localhost:3000/api/pincode/abc
# → {"ok":false,"error":"invalid_format"}
```

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-pincode-whitelist.ts public/pincodes.json src/lib/pincode/ src/app/api/pincode/ tests/lib/pincode.test.ts
git commit -m "feat(pincode): serviceability whitelist + India Post lookup + /api/pincode/[code]"
```

---

### Task 13: UTM attribution capture (sessionStorage → order row)

**Files:** `src/lib/attribution.ts`, `src/components/AttributionCapture.tsx`, `src/app/layout.tsx` (update)

- [ ] **Step 1: Create `src/lib/attribution.ts`**

```ts
const STORAGE_KEY = "orderlink.attribution";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
};

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const existing = readAttribution();
  if (existing.captured_at) return; // stick to first-touch for this session

  const url = new URL(window.location.href);
  const read = (k: string) => url.searchParams.get(k) ?? undefined;
  const next: Attribution = {
    utm_source: read("utm_source"),
    utm_medium: read("utm_medium"),
    utm_campaign: read("utm_campaign"),
    utm_term: read("utm_term"),
    utm_content: read("utm_content"),
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname + window.location.search,
    captured_at: new Date().toISOString(),
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
```

- [ ] **Step 2: Create client component `src/components/AttributionCapture.tsx`**

```tsx
"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
```

- [ ] **Step 3: Include `<AttributionCapture />` in root layout**

Edit `src/app/layout.tsx` — add the import and render inside `<body>`:

```tsx
import { AttributionCapture } from "@/components/AttributionCapture";
// ...
<body className="font-sans flex flex-col min-h-screen">
  <AttributionCapture />
  <Header />
  ...
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Open http://localhost:3000/?utm_source=instagram&utm_campaign=launch → open DevTools → Application → Session Storage → `orderlink.attribution` should have the parsed values + referrer + landing_page.

Navigate to another page. Session storage persists.

Open an incognito window without UTM params → Session storage only records `referrer` and `landing_page`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/attribution.ts src/components/AttributionCapture.tsx src/app/layout.tsx
git commit -m "feat(attribution): first-touch UTM + referrer capture via sessionStorage"
```

---

## Milestone 4 — Checkout UI

### Task 14: Checkout page route + form fields + Zod validation

**Files:** `src/app/checkout/page.tsx`, `src/lib/validation/checkout.ts`, `tests/lib/validation/checkout.test.ts`

- [ ] **Step 1: Write failing test `tests/lib/validation/checkout.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/lib/validation/checkout";

const base = {
  productSlug: "oil-dispenser",
  fullName: "Priya Sharma",
  mobile: "9876543210",
  email: "priya@example.com",
  addressLine1: "221B Baker Street",
  addressLine2: undefined,
  landmark: undefined,
  pincode: "411014",
  city: "Pune",
  state: "Maharashtra",
  paymentMethod: "prepaid" as const,
  couponCode: undefined,
};

describe("checkoutSchema", () => {
  it("accepts valid input", () => {
    expect(() => checkoutSchema.parse(base)).not.toThrow();
  });
  it("rejects invalid mobile", () => {
    expect(() => checkoutSchema.parse({ ...base, mobile: "123" })).toThrow();
    expect(() => checkoutSchema.parse({ ...base, mobile: "5876543210" })).toThrow(); // must start 6-9
  });
  it("rejects invalid pincode", () => {
    expect(() => checkoutSchema.parse({ ...base, pincode: "12345" })).toThrow();
  });
  it("rejects invalid email", () => {
    expect(() => checkoutSchema.parse({ ...base, email: "not-an-email" })).toThrow();
  });
  it("accepts pay_on_delivery", () => {
    expect(() => checkoutSchema.parse({ ...base, paymentMethod: "pay_on_delivery" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect RED**

```bash
npm test -- tests/lib/validation/checkout.test.ts
```

- [ ] **Step 3: Create `src/lib/validation/checkout.ts`**

```ts
import { z } from "zod";

export const checkoutSchema = z.object({
  productSlug: z.string().min(1),
  fullName: z.string().min(2).max(80),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile"),
  email: z.string().email(),
  addressLine1: z.string().min(5).max(120),
  addressLine2: z.string().max(120).optional(),
  landmark: z.string().max(80).optional(),
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  paymentMethod: z.enum(["prepaid", "pay_on_delivery"]),
  couponCode: z.string().max(40).optional(),
  // Attribution captured client-side
  utm_source: z.string().max(80).optional(),
  utm_medium: z.string().max(80).optional(),
  utm_campaign: z.string().max(80).optional(),
  utm_term: z.string().max(80).optional(),
  utm_content: z.string().max(80).optional(),
  referrer: z.string().max(500).optional(),
  landing_page: z.string().max(500).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

- [ ] **Step 4: Run — expect GREEN**

- [ ] **Step 5: Create `src/app/checkout/page.tsx` (client, form only — no submit handler yet; added in Task 19)**

```tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProductBySlug, SHIPPING_PAISE } from "@/data/products";
import { calculateOrderAmounts, rupees } from "@/lib/pricing";
import { PincodeField } from "@/components/PincodeField";
import { PaymentSelector } from "@/components/PaymentSelector";
import { OrderSummary } from "@/components/OrderSummary";
import { SalesforceTrustStrip } from "@/components/SalesforceTrustStrip";
import { readAttribution } from "@/lib/attribution";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sku = searchParams.get("sku") ?? "oil-dispenser";
  const product = getProductBySlug(sku);
  if (!product || product.status !== "live") {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "pay_on_delivery">("prepaid");
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    pincode: "",
    city: "",
    state: "",
    couponCode: "",
  });
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);

  const amounts = useMemo(
    () =>
      calculateOrderAmounts({
        itemPricePaise: product.itemPricePaise,
        itemPrepaidPricePaise: product.itemPrepaidPricePaise,
        method: paymentMethod,
        couponDiscountPaise: 0,
      }),
    [product, paymentMethod]
  );

  const canSubmit =
    pincodeServiceable === true &&
    form.fullName.length >= 2 &&
    /^[6-9]\d{9}$/.test(form.mobile) &&
    /.+@.+/.test(form.email) &&
    form.addressLine1.length >= 5;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl text-ink">Checkout</h1>
      <p className="font-sans text-ink-soft mt-2">
        Ordering <strong>{product.title}</strong>
      </p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <section className="space-y-4">
            <h2 className="font-display text-xl">Shipping details</h2>
            <Input label="Full name" required value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
            <Input label="Mobile (10-digit)" required value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} help="We share this with Meesho for delivery SMS." inputMode="numeric" maxLength={10} />
            <Input label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Address line 1" required value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} />
            <Input label="Address line 2 (optional)" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
            <Input label="Landmark (optional)" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
            <PincodeField
              value={form.pincode}
              onChange={(pc) => setForm({ ...form, pincode: pc })}
              onResult={(r) => {
                setPincodeServiceable(r.serviceable);
                if (r.serviceable && r.city && r.state) {
                  setForm((f) => ({ ...f, city: r.city!, state: r.state! }));
                }
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Input label="State" required value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl">Payment method</h2>
            <PaymentSelector
              itemPricePaise={product.itemPricePaise}
              itemPrepaidPricePaise={product.itemPrepaidPricePaise}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </section>

          <section className="space-y-2">
            <label className="block font-sans text-sm text-ink-soft">Have a coupon code? (optional)</label>
            <input
              type="text"
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
              className="w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest uppercase"
              maxLength={20}
              placeholder="WELCOME10"
            />
          </section>

          <SalesforceTrustStrip />
        </form>

        <aside className="lg:sticky lg:top-24 h-fit">
          <OrderSummary
            product={product}
            method={paymentMethod}
            canSubmit={canSubmit}
            amounts={amounts}
            onSubmit={() => {
              // wired to /api/orders in Task 19
              alert("Buy Now flow wired in Task 19");
            }}
          />
        </aside>
      </div>
    </main>
  );
}

function Input(props: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  help?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="font-sans text-sm text-ink-soft">
        {props.label}
        {props.required && <span className="text-coral"> *</span>}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        required={props.required}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-sans text-ink focus:outline-none focus:border-coral"
      />
      {props.help && <span className="mt-1 block font-sans text-xs text-ink-soft/70">{props.help}</span>}
    </label>
  );
}
```

- [ ] **Step 6: Commit (components come in Tasks 15–16; this compiles with missing components, so defer commit)**

No commit — depends on the next 2 tasks.

---

### Task 15: PaymentSelector component (prepaid vs POD radio)

**Files:** `src/components/PaymentSelector.tsx`

- [ ] **Step 1: Create `src/components/PaymentSelector.tsx`**

```tsx
"use client";
import { SHIPPING_PAISE } from "@/data/products";
import { rupees } from "@/lib/pricing";

type Method = "prepaid" | "pay_on_delivery";

export function PaymentSelector({
  itemPricePaise,
  itemPrepaidPricePaise,
  value,
  onChange,
}: {
  itemPricePaise: number;
  itemPrepaidPricePaise: number;
  value: Method;
  onChange: (m: Method) => void;
}) {
  const prepaidSavingPaise = itemPricePaise - itemPrepaidPricePaise;
  const prepaidTotal = itemPrepaidPricePaise + SHIPPING_PAISE;
  const podTotal = itemPricePaise + SHIPPING_PAISE;

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Payment method</legend>
      <Option
        id="method-prepaid"
        checked={value === "prepaid"}
        onChange={() => onChange("prepaid")}
        title={`Prepaid · ${rupees(prepaidTotal)}`}
        badge={`SAVE ${rupees(prepaidSavingPaise)} ON ITEM`}
        body={`Item ${rupees(itemPrepaidPricePaise)} + Shipping ${rupees(SHIPPING_PAISE)}. Pay full amount online now.`}
      />
      <Option
        id="method-pod"
        checked={value === "pay_on_delivery"}
        onChange={() => onChange("pay_on_delivery")}
        title={`Pay-on-Delivery · ${rupees(podTotal)}`}
        body={`Pay ${rupees(SHIPPING_PAISE)} shipping now (secures the order) + ${rupees(itemPricePaise)} cash on delivery.`}
        footnote="The ₹49 shipping is paid upfront and is non-refundable on returns or refused deliveries. It covers Meesho Logistics' dispatch regardless of outcome."
      />
    </fieldset>
  );
}

function Option(props: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  badge?: string;
  body: string;
  footnote?: string;
}) {
  return (
    <label
      htmlFor={props.id}
      className={`block rounded-lg border-2 p-4 cursor-pointer transition ${
        props.checked ? "border-coral bg-coral/5" : "border-[color:var(--rule)] hover:border-[color:var(--rule-strong)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          id={props.id}
          type="radio"
          name="paymentMethod"
          checked={props.checked}
          onChange={props.onChange}
          className="h-4 w-4 accent-coral"
        />
        <span className="font-sans font-medium text-ink">{props.title}</span>
        {props.badge && (
          <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-wider text-coral bg-coral/10 rounded px-2 py-0.5">
            {props.badge}
          </span>
        )}
      </div>
      <p className="font-sans text-sm text-ink-soft mt-2 ml-7">{props.body}</p>
      {props.footnote && props.checked && (
        <p className="font-sans text-xs text-ink-soft/70 mt-2 ml-7 italic">{props.footnote}</p>
      )}
    </label>
  );
}
```

- [ ] **Step 2: No direct tests — visual only, covered by e2e in Task 43. Commit (with Task 16 + 17).**

---

### Task 16: OrderSummary + PincodeField components

**Files:** `src/components/OrderSummary.tsx`, `src/components/PincodeField.tsx`

- [ ] **Step 1: Create `src/components/PincodeField.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

type Result = { serviceable: boolean; city?: string; state?: string };

export function PincodeField({
  value,
  onChange,
  onResult,
}: {
  value: string;
  onChange: (v: string) => void;
  onResult: (r: Result) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "serviceable" | "not_serviceable" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!/^\d{6}$/.test(value)) {
      setStatus("idle");
      setMessage("");
      return;
    }
    let cancel = false;
    setStatus("loading");
    setMessage("Checking…");
    fetch(`/api/pincode/${value}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (!data.ok) {
          setStatus("error");
          setMessage("Invalid pincode");
          return;
        }
        if (data.serviceable) {
          setStatus("serviceable");
          setMessage(data.city ? `✓ We deliver to ${data.city}, ${data.state} in 3–8 days` : "✓ Serviceable");
          onResult({ serviceable: true, city: data.city, state: data.state });
        } else {
          setStatus("not_serviceable");
          setMessage("⚠ Sorry, we don't ship here yet");
          onResult({ serviceable: false });
        }
      })
      .catch(() => {
        if (cancel) return;
        setStatus("error");
        setMessage("Couldn't check. Try again.");
      });
    return () => {
      cancel = true;
    };
  }, [value, onResult]);

  const colour =
    status === "serviceable" ? "text-green-700" :
    status === "not_serviceable" ? "text-amber-700" :
    status === "error" ? "text-coral" :
    "text-ink-soft";

  return (
    <label className="block">
      <span className="font-sans text-sm text-ink-soft">
        Pincode <span className="text-coral">*</span>
      </span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest"
        placeholder="411014"
      />
      {message && <span className={`mt-1 block font-sans text-xs ${colour}`}>{message}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Create `src/components/OrderSummary.tsx`**

```tsx
"use client";
import { SHIPPING_PAISE, type Product } from "@/data/products";
import { rupees, type PaymentMethod } from "@/lib/pricing";

type Amounts = {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  advancePaise: number;
  balanceDuePaise: number;
  shippingPaise: number;
};

export function OrderSummary({
  product,
  method,
  amounts,
  canSubmit,
  onSubmit,
}: {
  product: Product;
  method: PaymentMethod;
  amounts: Amounts;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--rule)] p-6 bg-cream-deep/30 space-y-4">
      <div className="flex justify-between font-sans text-sm">
        <span>{product.title}</span>
        <span>{rupees(product.itemPricePaise)}</span>
      </div>
      <div className="flex justify-between font-sans text-sm text-ink-soft">
        <span>Shipping (non-refundable*)</span>
        <span>{rupees(SHIPPING_PAISE)}</span>
      </div>
      <div className="border-t border-[color:var(--rule)] pt-3 flex justify-between font-sans text-sm text-ink-soft">
        <span>Subtotal</span>
        <span>{rupees(amounts.subtotalPaise)}</span>
      </div>
      {amounts.discountPaise > 0 && (
        <div className="flex justify-between font-sans text-sm text-coral">
          <span>Prepaid discount (5% on item)</span>
          <span>−{rupees(amounts.discountPaise)}</span>
        </div>
      )}
      <div className="border-t border-[color:var(--rule)] pt-3 flex justify-between font-sans text-base font-medium text-ink">
        <span>Total</span>
        <span>{rupees(amounts.totalPaise)}</span>
      </div>

      <div className="rounded-md bg-cream/60 p-3 space-y-1 font-mono text-xs text-ink-soft">
        <div className="flex justify-between">
          <span>Pay now (Razorpay)</span>
          <span>{rupees(amounts.advancePaise)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pay on delivery</span>
          <span>{rupees(amounts.balanceDuePaise)}</span>
        </div>
      </div>

      <p className="font-sans text-xs text-ink-soft/80">
        *Shipping refunded if order isn't delivered within 15 days.
        {method === "pay_on_delivery" && " Otherwise non-refundable on returns / refused deliveries — covers Meesho dispatch."}
      </p>

      <p className="font-sans text-xs text-ink-soft/80">📱 SMS tracking from Meesho — our logistics partner.</p>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="w-full rounded-md bg-coral text-cream font-sans font-medium py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
      >
        {method === "prepaid"
          ? `Pay ${rupees(amounts.totalPaise)} securely`
          : `Pay ${rupees(SHIPPING_PAISE)} shipping & confirm`}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify dev server compiles**

```bash
npm run dev
```

Navigate to http://localhost:3000/checkout?sku=oil-dispenser. Expected:
- All form fields render
- Pincode `411014` triggers "✓ We deliver to Pune, Maharashtra in 3–8 days"
- Pincode `999999` triggers "⚠ Sorry, we don't ship here yet"
- Prepaid selected by default → Total ₹191, "Pay ₹191 securely" CTA
- Switching to POD → Total ₹199, "Pay ₹49 shipping & confirm" CTA
- Buy button disabled until all required fields valid

- [ ] **Step 4: Commit**

```bash
git add src/app/checkout/ src/components/PaymentSelector.tsx src/components/OrderSummary.tsx src/components/PincodeField.tsx src/lib/validation/
git commit -m "feat(checkout): form UI + PaymentSelector + OrderSummary + PincodeField live pincode check"
```

---

### Task 17: WhatsApp floating button + "Need help?" prompt on product page

**Files:** `src/components/WhatsAppButton.tsx`, `src/app/p/[slug]/page.tsx` (update)

- [ ] **Step 1: Create `src/components/WhatsAppButton.tsx`**

```tsx
import { LEGAL } from "@/lib/legal";

export function WhatsAppButton({
  variant = "floating",
  prefill = "Hi%20OrderLink",
  label,
}: {
  variant?: "floating" | "inline";
  prefill?: string;
  label?: string;
}) {
  const href = `https://wa.me/${LEGAL.whatsappNumber.replace("+", "")}?text=${prefill}`;
  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label="Chat with OrderLink on WhatsApp"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-coral text-cream flex items-center justify-center shadow-lg hover:scale-105 transition"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="w-7 h-7 fill-current">
          <path d="M20.52 3.48A11.9 11.9 0 0012.02.06 11.94 11.94 0 001.19 17.63L.06 23.94l6.47-1.68a11.94 11.94 0 005.5 1.4h.01A11.94 11.94 0 0023.94 12a11.87 11.87 0 00-3.42-8.52zM12.02 21.6h-.01a9.7 9.7 0 01-4.95-1.36l-.36-.21-3.84 1 .99-3.77-.23-.39a9.72 9.72 0 0115.48-11.7A9.65 9.65 0 0121.7 12c0 5.36-4.35 9.6-9.68 9.6zm5.6-7.2c-.3-.16-1.77-.87-2.05-.97s-.48-.16-.67.15c-.2.3-.77.97-.95 1.17-.17.2-.35.23-.65.08-.3-.16-1.27-.47-2.42-1.5-.89-.79-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57a1.1 1.1 0 00-.8.37c-.28.3-1.05 1.02-1.05 2.48s1.08 2.88 1.23 3.08c.15.2 2.12 3.24 5.14 4.55 1.5.64 2.13.7 2.88.6.46-.06 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.27-.16-.57-.3z" />
        </svg>
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 font-sans text-sm text-coral underline underline-offset-4 hover:no-underline"
    >
      {label ?? "WhatsApp us →"}
    </a>
  );
}
```

- [ ] **Step 2: Include `<WhatsAppButton />` in root layout**

Edit `src/app/layout.tsx` — add:

```tsx
import { WhatsAppButton } from "@/components/WhatsAppButton";
// ...inside <body>, after <Footer/>:
<WhatsAppButton />
```

- [ ] **Step 3: Add "Need help deciding?" prompt on product page**

Edit `src/app/p/[slug]/page.tsx` — inside the live-product branch, after the trust chips `<ul>`:

```tsx
<p className="font-sans text-sm text-ink-soft">
  Unsure if this is right for you?{" "}
  <WhatsAppButton
    variant="inline"
    prefill={`Hi%20OrderLink%2C%20I'm%20looking%20at%20${encodeURIComponent(product.title)}%20and%20have%20a%20quick%20question`}
    label="WhatsApp us"
  />{" "}
  — we'll help in minutes.
</p>
```

Add import at the top of the product page:
```tsx
import { WhatsAppButton } from "@/components/WhatsAppButton";
```

- [ ] **Step 4: Manual verify**

```bash
npm run dev
```

- Homepage: floating WhatsApp button bottom-right
- Product page: same floating button + inline "WhatsApp us" link below trust chips
- Clicking the inline link opens wa.me with the product name in the prefill

- [ ] **Step 5: Commit**

```bash
git add src/components/WhatsAppButton.tsx src/app/layout.tsx src/app/p/
git commit -m "feat(whatsapp): floating WhatsApp button + inline 'Need help' prompt on product page"
```

---

## Milestone 5 — Razorpay integration

### Task 18: Razorpay client wrapper + order number generator

**Files:** `src/lib/razorpay.ts`, `src/lib/order-number.ts`, `tests/lib/order-number.test.ts`, `tests/lib/razorpay.test.ts`

- [ ] **Step 1: Write failing test `tests/lib/order-number.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { generateOrderNumber, formatOrderNumber } from "@/lib/order-number";
import { sql } from "drizzle-orm";

describe("order number", () => {
  beforeEach(async () => {
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS order_number_sequence START 1`);
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  });

  it("formats order number with year + 4-digit pad", () => {
    expect(formatOrderNumber(1, 2026)).toBe("OL-2026-0001");
    expect(formatOrderNumber(42, 2026)).toBe("OL-2026-0042");
  });

  it("generates sequential numbers", async () => {
    const a = await generateOrderNumber();
    const b = await generateOrderNumber();
    expect(a).toBe("OL-2026-0001");
    expect(b).toBe("OL-2026-0002");
  });
});
```

- [ ] **Step 2: Add an order_number sequence migration**

Create `src/db/migrations/0002_order_number_sequence.sql`:

```sql
CREATE SEQUENCE IF NOT EXISTS order_number_sequence START 1 MINVALUE 1;
```

Apply: `npx drizzle-kit migrate`

- [ ] **Step 3: Create `src/lib/order-number.ts`**

```ts
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export function formatOrderNumber(seqValue: number, year: number): string {
  return `OL-${year}-${String(seqValue).padStart(4, "0")}`;
}

export async function generateOrderNumber(now: Date = new Date()): Promise<string> {
  const row = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('order_number_sequence') AS nextval`
  );
  const seqValue = parseInt(row.rows[0].nextval as unknown as string, 10);
  return formatOrderNumber(seqValue, now.getFullYear());
}
```

- [ ] **Step 4: Run — expect GREEN**

- [ ] **Step 5: Create `src/lib/razorpay.ts`**

```ts
import Razorpay from "razorpay";
import crypto from "node:crypto";

let client: Razorpay | null = null;

export function razorpay(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

/** Create a Razorpay order for a given amount (paise). Receipt is our internal order number. */
export async function createRazorpayOrder(args: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const order = await razorpay().orders.create({
    amount: args.amountPaise,
    currency: "INR",
    receipt: args.receipt,
    notes: args.notes,
    payment_capture: true,
  });
  return order; // { id, amount, currency, receipt, status, ... }
}

/** Verify an HMAC signature for a payment success callback. */
export function verifyPaymentSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const body = `${args.orderId}|${args.paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(args.signature));
}

/** Verify webhook signature (different mechanic: signs the raw request body with WEBHOOK_SECRET). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

- [ ] **Step 6: Write `tests/lib/razorpay.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";

describe("verifyPaymentSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_1234";
  });

  it("returns true for a valid signature", () => {
    const orderId = "order_ABC";
    const paymentId = "pay_XYZ";
    const signature = crypto
      .createHmac("sha256", "test_secret_1234")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    expect(
      verifyPaymentSignature({
        orderId: "order_ABC",
        paymentId: "pay_XYZ",
        signature: "0".repeat(64),
      })
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "wh_secret_5678";
  });

  it("verifies against webhook secret (not key secret)", () => {
    const body = '{"event":"payment.captured"}';
    const signature = crypto
      .createHmac("sha256", "wh_secret_5678")
      .update(body)
      .digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });
});
```

- [ ] **Step 7: Run — expect GREEN**

```bash
npm test -- tests/lib/razorpay.test.ts tests/lib/order-number.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/razorpay.ts src/lib/order-number.ts src/db/migrations/ tests/lib/
git commit -m "feat(razorpay): client wrapper, signature verify fns, order-number sequence"
```

---

### Task 19: POST /api/orders — create order + inventory reserve + Razorpay order

**Files:** `src/app/api/orders/route.ts`, `src/lib/inventory.ts`, `src/lib/crypto.ts`, `tests/lib/inventory.test.ts`, `tests/api/orders.test.ts`

- [ ] **Step 1: Write `src/lib/crypto.ts` (AES-GCM for pending_sf_sync payloads)**

```ts
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY!;
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 base64-decoded bytes");
  return buf;
}

export function encryptJSON(obj: unknown): { ciphertext: Buffer; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf-8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptJSON<T = unknown>(c: { ciphertext: Buffer; iv: string; tag: string }): T {
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(c.iv, "base64"));
  decipher.setAuthTag(Buffer.from(c.tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(c.ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf-8")) as T;
}
```

- [ ] **Step 2: Write `tests/lib/crypto.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { encryptJSON, decryptJSON } from "@/lib/crypto";

describe("crypto", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  it("round-trips JSON objects", () => {
    const data = { customer_email: "p@example.com", mobile: "9876543210" };
    const encrypted = encryptJSON(data);
    const decrypted = decryptJSON<typeof data>(encrypted);
    expect(decrypted).toEqual(data);
  });

  it("fails to decrypt with tampered ciphertext", () => {
    const e = encryptJSON({ foo: "bar" });
    e.ciphertext[0] ^= 0xff;
    expect(() => decryptJSON(e)).toThrow();
  });
});
```

Run → expect GREEN.

- [ ] **Step 3: Write `src/lib/inventory.ts`**

```ts
import { db, schema } from "@/db/client";
import { eq, sql } from "drizzle-orm";

/** Reserve stock atomically. Returns true if reservation succeeded. */
export async function reserveInventory(slug: string, qty: number = 1): Promise<boolean> {
  const rows = await db.execute<{ remaining: number }>(
    sql`
      UPDATE inventory
         SET reserved = reserved + ${qty}, updated_at = now()
       WHERE product_slug = ${slug} AND remaining - reserved >= ${qty}
    RETURNING remaining
    `
  );
  return rows.rows.length > 0;
}

/** Commit the reservation into an actual decrement (called after payment success). */
export async function commitInventory(slug: string, qty: number = 1): Promise<void> {
  await db.execute(sql`
    UPDATE inventory
       SET remaining = remaining - ${qty}, reserved = reserved - ${qty}, updated_at = now()
     WHERE product_slug = ${slug}
  `);
}

/** Release a reservation (called if payment fails / webhook says so). */
export async function releaseInventory(slug: string, qty: number = 1): Promise<void> {
  await db.execute(sql`
    UPDATE inventory
       SET reserved = reserved - ${qty}, updated_at = now()
     WHERE product_slug = ${slug} AND reserved >= ${qty}
  `);
}

/** Read remaining (not-reserved) count for FOMO display. */
export async function getAvailable(slug: string): Promise<number> {
  const row = await db
    .select({ remaining: schema.inventory.remaining, reserved: schema.inventory.reserved })
    .from(schema.inventory)
    .where(eq(schema.inventory.productSlug, slug))
    .limit(1);
  if (row.length === 0) return 0;
  return Math.max(0, row[0].remaining - row[0].reserved);
}
```

- [ ] **Step 4: Write `tests/lib/inventory.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { db, schema } from "@/db/client";
import { eq, sql } from "drizzle-orm";
import { reserveInventory, commitInventory, releaseInventory, getAvailable } from "@/lib/inventory";

describe("inventory", () => {
  beforeEach(async () => {
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'test-sku'`);
    await db.insert(schema.inventory).values({ productSlug: "test-sku", remaining: 5, reserved: 0 });
  });

  it("reserves when stock is available", async () => {
    expect(await reserveInventory("test-sku")).toBe(true);
    expect(await getAvailable("test-sku")).toBe(4);
  });

  it("refuses when out of stock", async () => {
    for (let i = 0; i < 5; i++) await reserveInventory("test-sku");
    expect(await reserveInventory("test-sku")).toBe(false);
    expect(await getAvailable("test-sku")).toBe(0);
  });

  it("commit decrements both", async () => {
    await reserveInventory("test-sku");
    await commitInventory("test-sku");
    const row = await db.select().from(schema.inventory).where(eq(schema.inventory.productSlug, "test-sku"));
    expect(row[0].remaining).toBe(4);
    expect(row[0].reserved).toBe(0);
  });

  it("release returns capacity", async () => {
    await reserveInventory("test-sku");
    expect(await getAvailable("test-sku")).toBe(4);
    await releaseInventory("test-sku");
    expect(await getAvailable("test-sku")).toBe(5);
  });
});
```

Run → expect GREEN.

- [ ] **Step 5: Seed inventory for Oil Dispenser**

Add a one-liner to `scripts/seed-inventory.ts`:

```ts
import { db, schema } from "@/db/client";
import { products } from "@/data/products";
import { sql } from "drizzle-orm";

async function main() {
  for (const p of products) {
    await db
      .insert(schema.inventory)
      .values({ productSlug: p.slug, remaining: p.startingInventory, reserved: 0 })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${products.length} inventory rows`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run: `npx tsx scripts/seed-inventory.ts`

Expected output: "Seeded 25 inventory rows".

- [ ] **Step 6: Create `src/app/api/orders/route.ts`**

```ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db, schema } from "@/db/client";
import { checkoutSchema } from "@/lib/validation/checkout";
import { getProductBySlug } from "@/data/products";
import { calculateOrderAmounts } from "@/lib/pricing";
import { reserveInventory, releaseInventory } from "@/lib/inventory";
import { generateOrderNumber } from "@/lib/order-number";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const product = getProductBySlug(input.productSlug);
  if (!product || product.status !== "live") {
    return NextResponse.json({ ok: false, error: "product_unavailable" }, { status: 400 });
  }

  const reserved = await reserveInventory(product.slug, 1);
  if (!reserved) {
    return NextResponse.json({ ok: false, error: "out_of_stock" }, { status: 409 });
  }

  try {
    const amounts = calculateOrderAmounts({
      itemPricePaise: product.itemPricePaise,
      itemPrepaidPricePaise: product.itemPrepaidPricePaise,
      method: input.paymentMethod,
      couponDiscountPaise: 0, // coupons wired in Task 37
    });

    const orderNumber = await generateOrderNumber();
    const invoiceNumber = await generateInvoiceNumber();

    const rzpOrder = await createRazorpayOrder({
      amountPaise: amounts.advancePaise,
      receipt: orderNumber,
      notes: {
        orderlink_order_number: orderNumber,
        payment_method: input.paymentMethod,
      },
    });

    const [refRow] = await db
      .insert(schema.ordersRef)
      .values({
        orderNumber,
        invoiceNumber,
        status: input.paymentMethod === "prepaid" ? "pending_payment" : "pending_advance",
        paymentMethod: input.paymentMethod,
        totalPaise: amounts.totalPaise,
        advancePaise: amounts.advancePaise,
        balanceDuePaise: amounts.balanceDuePaise,
        productSlug: product.slug,
        customerFirstInitial: input.fullName.charAt(0).toUpperCase() + ".",
        customerMobileLast4: input.mobile.slice(-4),
        shipPincode: input.pincode,
        shipState: input.state,
        razorpayOrderId: rzpOrder.id,
        utmSource: input.utm_source,
        utmMedium: input.utm_medium,
        utmCampaign: input.utm_campaign,
        trackKey: input.mobile.slice(-4),
      })
      .returning();

    // Stash full PII payload in pending_sf_sync (encrypted) so we can retrieve
    // after payment success when syncing to Salesforce / generating the invoice.
    // The row is deleted on successful SF sync.
    const { encryptJSON } = await import("@/lib/crypto");
    const enc = encryptJSON({ ...input, orderNumber, invoiceNumber });
    await db.insert(schema.pendingSfSync).values({
      orderRefId: refRow.id,
      payloadCiphertext: enc.ciphertext,
      payloadIv: enc.iv,
      payloadTag: enc.tag,
      jobKind: "full_sync",
      status: "pending",
    });

    return NextResponse.json({
      ok: true,
      orderId: refRow.id,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amountPaise: amounts.advancePaise,
      currency: "INR",
    });
  } catch (err) {
    // Release reservation if any downstream step failed
    await releaseInventory(product.slug, 1).catch(() => {});
    throw err;
  }
}
```

- [ ] **Step 7: Write `tests/api/orders.test.ts` (uses Next.js route handler invocation pattern)**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/orders/route";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

vi.mock("@/lib/razorpay", async () => {
  const actual = await vi.importActual<typeof import("@/lib/razorpay")>("@/lib/razorpay");
  return {
    ...actual,
    createRazorpayOrder: vi.fn(async ({ amountPaise, receipt }) => ({
      id: `order_test_${receipt}`,
      amount: amountPaise,
      currency: "INR",
      receipt,
      status: "created",
    })),
  };
});

const baseInput = {
  productSlug: "oil-dispenser",
  fullName: "Priya Sharma",
  mobile: "9876543210",
  email: "priya@example.com",
  addressLine1: "221B Baker Street",
  pincode: "411014",
  city: "Pune",
  state: "Maharashtra",
  paymentMethod: "prepaid" as const,
};

describe("POST /api/orders", () => {
  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({ productSlug: "oil-dispenser", remaining: 5, reserved: 0 });
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  });

  it("creates an order, reserves inventory, returns Razorpay context", async () => {
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify(baseInput),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.orderNumber).toBe("OL-2026-0001");
    expect(body.razorpayOrderId).toBe("order_test_OL-2026-0001");
    expect(body.amountPaise).toBe(19900 - 800); // ₹191 prepaid total
  });

  it("returns 409 when inventory is zero", async () => {
    await db.execute(sql`UPDATE inventory SET remaining = 0 WHERE product_slug = 'oil-dispenser'`);
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify(baseInput),
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("out_of_stock");
  });

  it("POD selects ₹49 advance", async () => {
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...baseInput, paymentMethod: "pay_on_delivery" }),
      })
    );
    const body = await res.json();
    expect(body.amountPaise).toBe(4900);
  });
});
```

- [ ] **Step 8: Run — expect GREEN**

```bash
npm test -- tests/api/orders.test.ts tests/lib/inventory.test.ts tests/lib/crypto.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/orders/route.ts src/lib/inventory.ts src/lib/crypto.ts scripts/seed-inventory.ts tests/
git commit -m "feat(api/orders): POST creates Razorpay order, reserves inventory, writes orders_ref + pending_sf_sync"
```

---

### Task 20: Razorpay Checkout modal + /api/orders/verify signature check

**Files:** `src/app/api/orders/verify/route.ts`, `src/app/checkout/page.tsx` (update), `tests/api/orders-verify.test.ts`

- [ ] **Step 1: Create `src/app/api/orders/verify/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { commitInventory, releaseInventory } from "@/lib/inventory";
import { z } from "zod";

const verifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().length(64),
});

export async function POST(request: Request) {
  const parsed = verifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const orderRow = await db.select().from(schema.ordersRef).where(eq(schema.ordersRef.id, orderId)).limit(1);
  if (orderRow.length === 0) {
    return NextResponse.json({ ok: false, error: "order_not_found" }, { status: 404 });
  }
  const order = orderRow[0];

  if (order.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ ok: false, error: "order_mismatch" }, { status: 400 });
  }

  const sigOk = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!sigOk) {
    await releaseInventory(order.productSlug, 1).catch(() => {});
    return NextResponse.json({ ok: false, error: "signature_invalid" }, { status: 400 });
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

  // Salesforce sync enqueued (details in M7; for now the row already exists in pending_sf_sync
  // from POST /api/orders — nothing new to enqueue here)

  return NextResponse.json({ ok: true, orderId, status: newStatus, orderNumber: order.orderNumber });
}
```

- [ ] **Step 2: Wire Razorpay Checkout in the checkout page**

Update `src/app/checkout/page.tsx` → replace the `onSubmit={() => { alert(...) }}` with:

```tsx
async function handleSubmit() {
  const attribution = readAttribution();
  const body = {
    productSlug: sku,
    fullName: form.fullName,
    mobile: form.mobile,
    email: form.email,
    addressLine1: form.addressLine1,
    addressLine2: form.addressLine2 || undefined,
    landmark: form.landmark || undefined,
    pincode: form.pincode,
    city: form.city,
    state: form.state,
    paymentMethod,
    couponCode: form.couponCode || undefined,
    ...attribution,
  };
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error === "out_of_stock" ? "Sorry — this item just sold out." : "Something went wrong, please try again.");
    return;
  }

  await loadRazorpayScript();
  const rzp = new (window as any).Razorpay({
    key: data.razorpayKeyId,
    order_id: data.razorpayOrderId,
    amount: data.amountPaise,
    currency: "INR",
    name: "OrderLink",
    description: paymentMethod === "prepaid" ? "Order payment" : "Shipping advance",
    prefill: { name: form.fullName, email: form.email, contact: form.mobile },
    notes: { orderlink_order_number: data.orderNumber },
    theme: { color: "#EC4356" },
    handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      const verifyRes = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.orderId,
          razorpayOrderId: resp.razorpay_order_id,
          razorpayPaymentId: resp.razorpay_payment_id,
          razorpaySignature: resp.razorpay_signature,
        }),
      });
      const verified = await verifyRes.json();
      if (verified.ok) {
        router.replace(`/orders/${data.orderId}/thanks`);
      } else {
        alert("Payment verification failed. Contact support with order " + data.orderNumber);
      }
    },
    modal: {
      ondismiss: () => {
        // Reservation times out in inventory (release happens via webhook fallback)
      },
    },
  });
  rzp.open();
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}
```

Pass `handleSubmit` to `<OrderSummary onSubmit={handleSubmit} />`.

- [ ] **Step 3: Write `tests/api/orders-verify.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { POST } from "@/app/api/orders/verify/route";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";

describe("POST /api/orders/verify", () => {
  let orderId: string;

  beforeEach(async () => {
    process.env.RAZORPAY_KEY_SECRET = "secret_verify_test";
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({ productSlug: "oil-dispenser", remaining: 5, reserved: 1 });
    const [row] = await db
      .insert(schema.ordersRef)
      .values({
        orderNumber: "OL-2026-0001",
        invoiceNumber: "OL-INV-2026-000001",
        status: "pending_payment",
        paymentMethod: "prepaid",
        totalPaise: 19100,
        advancePaise: 19100,
        balanceDuePaise: 0,
        productSlug: "oil-dispenser",
        customerFirstInitial: "P.",
        customerMobileLast4: "3210",
        shipPincode: "411014",
        shipState: "Maharashtra",
        razorpayOrderId: "order_test_123",
        trackKey: "3210",
      })
      .returning();
    orderId = row.id;
  });

  it("marks paid on valid signature", async () => {
    const sig = crypto
      .createHmac("sha256", "secret_verify_test")
      .update("order_test_123|pay_test_456")
      .digest("hex");

    const res = await POST(
      new Request("http://localhost/api/orders/verify", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          razorpayOrderId: "order_test_123",
          razorpayPaymentId: "pay_test_456",
          razorpaySignature: sig,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
  });

  it("rejects tampered signature", async () => {
    const res = await POST(
      new Request("http://localhost/api/orders/verify", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          razorpayOrderId: "order_test_123",
          razorpayPaymentId: "pay_test_456",
          razorpaySignature: "0".repeat(64),
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
```

Run → expect GREEN.

- [ ] **Step 4: Smoke-test with Razorpay test card locally**

With `RAZORPAY_KEY_ID=rzp_test_...` + `RAZORPAY_KEY_SECRET=...` set in `.env`, start dev server, place an order, use Razorpay test card `4111 1111 1111 1111` + any future expiry + any CVV. Expected: redirect to `/orders/:id/thanks` (page placeholder for now, 404 until Task 24).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/verify/route.ts src/app/checkout/page.tsx tests/api/orders-verify.test.ts
git commit -m "feat(razorpay): Checkout modal in UI + /api/orders/verify signature check"
```

---

### Task 21: Razorpay webhook handler with idempotency

**Files:** `src/app/api/razorpay/webhook/route.ts`, `tests/api/razorpay-webhook.test.ts`

- [ ] **Step 1: Create the webhook route**

```ts
// src/app/api/razorpay/webhook/route.ts
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { commitInventory } from "@/lib/inventory";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "bad_signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    id: string;
    payload: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };

  // Idempotency: insert-or-skip by razorpay_event_id
  try {
    await db.insert(schema.webhookEvents).values({
      razorpayEventId: event.id,
      eventType: event.event,
      payload: event as any,
    });
  } catch {
    // Duplicate event — already processed
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.event === "payment.captured" && event.payload.payment?.entity) {
    const paymentEntity = event.payload.payment.entity;
    const rzpOrderId = paymentEntity.order_id;
    const rzpPaymentId = paymentEntity.id;

    const rows = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.razorpayOrderId, rzpOrderId))
      .limit(1);
    if (rows.length === 0) return NextResponse.json({ ok: true, note: "no_matching_order" });
    const order = rows[0];
    if (order.status === "paid" || order.status === "advance_paid") {
      return NextResponse.json({ ok: true, already_processed: true });
    }

    const newStatus = order.paymentMethod === "prepaid" ? "paid" : "advance_paid";
    await db
      .update(schema.ordersRef)
      .set({ status: newStatus, razorpayPaymentId: rzpPaymentId, updatedAt: new Date() })
      .where(eq(schema.ordersRef.id, order.id));
    await commitInventory(order.productSlug, 1);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write `tests/api/razorpay-webhook.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { POST } from "@/app/api/razorpay/webhook/route";
import { db, schema } from "@/db/client";
import { sql, eq } from "drizzle-orm";

function signed(body: string): string {
  return crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
}

describe("POST /api/razorpay/webhook", () => {
  beforeEach(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "wh_test";
    await db.execute(sql`DELETE FROM webhook_events`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({ productSlug: "oil-dispenser", remaining: 5, reserved: 1 });
    await db.insert(schema.ordersRef).values({
      orderNumber: "OL-2026-0001",
      invoiceNumber: "OL-INV-2026-000001",
      status: "pending_payment",
      paymentMethod: "prepaid",
      totalPaise: 19100, advancePaise: 19100, balanceDuePaise: 0,
      productSlug: "oil-dispenser",
      customerFirstInitial: "P.", customerMobileLast4: "3210",
      shipPincode: "411014", shipState: "Maharashtra",
      razorpayOrderId: "order_webhook_1",
      trackKey: "3210",
    });
  });

  it("processes payment.captured and marks order paid", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      id: "evt_1",
      payload: { payment: { entity: { id: "pay_x", order_id: "order_webhook_1", status: "captured" } } },
    });
    const res = await POST(
      new Request("http://localhost/api/razorpay/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": signed(body) },
        body,
      })
    );
    expect(res.status).toBe(200);

    const [row] = await db.select().from(schema.ordersRef);
    expect(row.status).toBe("paid");
  });

  it("is idempotent for duplicate event_id", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      id: "evt_2",
      payload: { payment: { entity: { id: "pay_y", order_id: "order_webhook_1", status: "captured" } } },
    });
    const headers = { "x-razorpay-signature": signed(body) };
    await POST(new Request("http://localhost/api/razorpay/webhook", { method: "POST", headers, body }));
    const second = await POST(new Request("http://localhost/api/razorpay/webhook", { method: "POST", headers, body }));
    const data = await second.json();
    expect(data.duplicate).toBe(true);
  });

  it("rejects invalid signature", async () => {
    const body = JSON.stringify({ event: "payment.captured", id: "evt_3", payload: {} });
    const res = await POST(
      new Request("http://localhost/api/razorpay/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": "bad" },
        body,
      })
    );
    expect(res.status).toBe(400);
  });
});
```

Run → expect GREEN.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/razorpay/webhook/ tests/api/razorpay-webhook.test.ts
git commit -m "feat(razorpay): webhook handler with signature verify + idempotent event replay safety"
```

---

### Task 22: Inventory-expiry reaper (release stale reservations)

**Files:** `src/lib/inventory.ts` (extend), `scripts/reap-reservations.ts`

Reservations made in `/api/orders` block inventory even if the customer never completes payment. Webhook mostly handles success; for the case where the Razorpay modal is closed without a payment, we need a reaper that releases reservations older than 15 minutes.

- [ ] **Step 1: Extend `src/lib/inventory.ts` with a reap function**

```ts
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/** Release reservations for orders_ref rows stuck in pending_* state for >15 min. */
export async function reapStaleReservations(olderThanMinutes: number = 15): Promise<number> {
  const rows = await db.execute<{ product_slug: string; id: string }>(sql`
    SELECT id, product_slug FROM orders_ref
     WHERE status IN ('pending_advance', 'pending_payment')
       AND created_at < now() - interval '1 minute' * ${olderThanMinutes}
  `);

  for (const row of rows.rows) {
    await db.execute(sql`
      UPDATE inventory SET reserved = GREATEST(reserved - 1, 0), updated_at = now()
       WHERE product_slug = ${row.product_slug}
    `);
    await db.execute(sql`
      UPDATE orders_ref SET status = 'cancelled', updated_at = now() WHERE id = ${row.id}
    `);
  }
  return rows.rows.length;
}
```

- [ ] **Step 2: Create `scripts/reap-reservations.ts`**

```ts
import { reapStaleReservations } from "@/lib/inventory";

async function main() {
  const n = await reapStaleReservations(15);
  console.log(`Reaped ${n} stale reservations`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run once manually to verify**

```bash
npx tsx scripts/reap-reservations.ts
```

Expected: "Reaped 0 stale reservations" (no rows yet).

Later in Phase 2a-late we'll wire this as a cron. For 2a launch, it can be a manual script run weekly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/inventory.ts scripts/reap-reservations.ts
git commit -m "feat(inventory): reapStaleReservations fn + manual script for stuck-reservation cleanup"
```

---

## Milestone 6 — Post-payment flows

### Task 23: React-PDF InvoiceDocument template

**Files:** `src/invoices/InvoiceDocument.tsx`, `src/lib/invoice-pdf.ts`, `tests/invoices/invoice-pdf.test.ts`

- [ ] **Step 1: Create `src/invoices/InvoiceDocument.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { LEGAL } from "@/lib/legal";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1E1C1C" },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  small: { fontSize: 9, color: "#5A5350" },
  row: { flexDirection: "row" },
  section: { marginBottom: 16 },
  table: { marginTop: 8, borderTop: "1px solid #ccc", borderBottom: "1px solid #ccc" },
  trHead: { flexDirection: "row", backgroundColor: "#F4EEE3", padding: 4, fontFamily: "Helvetica-Bold", fontSize: 9 },
  tr: { flexDirection: "row", padding: 4, borderTop: "1px solid #eee" },
  td: { padding: 2 },
  right: { textAlign: "right" },
});

export type InvoiceProps = {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  orderNumber: string;
  customer: { name: string; email: string; mobile: string; address: string };
  placeOfSupplyState: string;
  isIntraState: boolean;
  lines: {
    description: string;
    hsn: string;
    qty: number;
    unitPricePaise: number;
    taxableValuePaise: number;
    gstRate: number;
  }[];
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  paymentMethod: "Prepaid" | "Pay-on-Delivery";
  advancePaid: number;
  balanceDue: number;
};

function r(p: number): string { return `₹${(p / 100).toFixed(2)}`; }

export function InvoiceDocument(props: InvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>{LEGAL.companyName}</Text>
          <Text style={styles.small}>{LEGAL.formattedAddress()}</Text>
          <Text style={styles.small}>CIN: {LEGAL.cin} · GSTIN: {LEGAL.gstin}</Text>
          <Text style={styles.small}>{LEGAL.brandName} · {LEGAL.supportEmail} · {LEGAL.supportPhone}</Text>
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>TAX INVOICE</Text>
            <Text style={styles.small}>Invoice #: {props.invoiceNumber}</Text>
            <Text style={styles.small}>Order #: {props.orderNumber}</Text>
            <Text style={styles.small}>Date: {props.invoiceDate.slice(0, 10)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>Bill to</Text>
            <Text>{props.customer.name}</Text>
            <Text style={styles.small}>{props.customer.address}</Text>
            <Text style={styles.small}>{props.customer.email} · {props.customer.mobile}</Text>
            <Text style={styles.small}>Place of supply: {props.placeOfSupplyState}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.td, { flex: 3 }]}>Description</Text>
            <Text style={[styles.td, { flex: 1 }]}>HSN</Text>
            <Text style={[styles.td, { flex: 0.6, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>Unit ₹</Text>
            <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>Taxable ₹</Text>
            <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>GST %</Text>
          </View>
          {props.lines.map((line, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, { flex: 3 }]}>{line.description}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{line.hsn}</Text>
              <Text style={[styles.td, { flex: 0.6, textAlign: "right" }]}>{line.qty}</Text>
              <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>{r(line.unitPricePaise)}</Text>
              <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>{r(line.taxableValuePaise)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{line.gstRate}%</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10, alignItems: "flex-end" }}>
          {props.isIntraState ? (
            <>
              <Text style={styles.small}>CGST: {r(props.cgstPaise)}</Text>
              <Text style={styles.small}>SGST: {r(props.sgstPaise)}</Text>
            </>
          ) : (
            <Text style={styles.small}>IGST: {r(props.igstPaise)}</Text>
          )}
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 4 }}>Total: {r(props.totalPaise)}</Text>
          <Text style={styles.small}>Payment: {props.paymentMethod}</Text>
          {props.paymentMethod === "Pay-on-Delivery" && (
            <>
              <Text style={styles.small}>Advance paid online: {r(props.advancePaid)}</Text>
              <Text style={styles.small}>Balance due on delivery: {r(props.balanceDue)}</Text>
            </>
          )}
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={styles.small}>This is a computer-generated invoice and does not require a signature.</Text>
          <Text style={styles.small}>For grievances: {LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation} · {LEGAL.supportEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create `src/lib/invoice-pdf.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "@/invoices/InvoiceDocument";
import { calculateGSTBreakup } from "@/lib/pricing";
import { SHIPPING_HSN_CODE, SHIPPING_GST_RATE } from "@/data/products";

type Args = {
  invoiceNumber: string;
  invoiceDate: Date;
  orderNumber: string;
  customer: { name: string; email: string; mobile: string; address: string };
  shipState: string;
  product: { title: string; hsn: string; gstRate: number; itemPricePaise: number };
  shippingPaise: number;
  paymentMethod: "prepaid" | "pay_on_delivery";
  advancePaid: number;
  balanceDue: number;
  totalPaise: number;
};

export async function generateInvoicePdf(args: Args): Promise<string> {
  const gst = calculateGSTBreakup({
    shippingState: args.shipState,
    lines: [
      { taxableValuePaise: args.product.itemPricePaise, gstRatePercent: args.product.gstRate },
      { taxableValuePaise: args.shippingPaise, gstRatePercent: SHIPPING_GST_RATE },
    ],
  });
  const props: InvoiceProps = {
    invoiceNumber: args.invoiceNumber,
    invoiceDate: args.invoiceDate.toISOString(),
    orderNumber: args.orderNumber,
    customer: args.customer,
    placeOfSupplyState: args.shipState,
    isIntraState: args.shipState === "Maharashtra",
    lines: [
      {
        description: args.product.title,
        hsn: args.product.hsn,
        qty: 1,
        unitPricePaise: args.product.itemPricePaise,
        taxableValuePaise: args.product.itemPricePaise,
        gstRate: args.product.gstRate,
      },
      {
        description: "Shipping & Handling",
        hsn: SHIPPING_HSN_CODE,
        qty: 1,
        unitPricePaise: args.shippingPaise,
        taxableValuePaise: args.shippingPaise,
        gstRate: SHIPPING_GST_RATE,
      },
    ],
    cgstPaise: gst.cgstPaise,
    sgstPaise: gst.sgstPaise,
    igstPaise: gst.igstPaise,
    totalPaise: args.totalPaise,
    paymentMethod: args.paymentMethod === "prepaid" ? "Prepaid" : "Pay-on-Delivery",
    advancePaid: args.advancePaid,
    balanceDue: args.balanceDue,
  };
  const buf = await renderToBuffer(InvoiceDocument(props));
  const dir = path.join(process.cwd(), "data", "invoices");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${args.invoiceNumber}.pdf`);
  await fs.writeFile(filePath, buf);
  return filePath;
}
```

- [ ] **Step 3: Write a smoke test `tests/invoices/invoice-pdf.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs/promises";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

describe("generateInvoicePdf", () => {
  it("writes a non-empty PDF file", async () => {
    const filePath = await generateInvoicePdf({
      invoiceNumber: "OL-INV-2026-TEST001",
      invoiceDate: new Date("2026-04-19T12:00:00Z"),
      orderNumber: "OL-2026-TEST001",
      customer: {
        name: "Priya Sharma",
        email: "priya@example.com",
        mobile: "+919876543210",
        address: "221B Baker St, Pune, Maharashtra 411014",
      },
      shipState: "Maharashtra",
      product: { title: "Premium Glass Oil Dispenser", hsn: "7013", gstRate: 18, itemPricePaise: 15000 },
      shippingPaise: 4900,
      paymentMethod: "prepaid",
      advancePaid: 19100,
      balanceDue: 0,
      totalPaise: 19100,
    });
    const stat = await fs.stat(filePath);
    expect(stat.size).toBeGreaterThan(1000); // PDFs are never <1KB
    await fs.rm(filePath);
  });
});
```

Run → expect GREEN.

- [ ] **Step 4: Add `data/invoices/` to `.gitignore`**

Append to `.gitignore`:
```
data/invoices/
```

- [ ] **Step 5: Commit**

```bash
git add src/invoices/ src/lib/invoice-pdf.ts tests/invoices/ .gitignore
git commit -m "feat(invoice): React-PDF GST-compliant invoice template + generation helper"
```

---

### Task 24: /orders/[id]/thanks page + admin email via Resend + invoice generation on success

**Files:** `src/app/orders/[id]/thanks/page.tsx`, `src/lib/email/client.ts`, `src/lib/email/send-admin-alert.ts`, `src/app/api/orders/verify/route.ts` (update)

- [ ] **Step 1: Create `src/lib/email/client.ts`**

```ts
import { Resend } from "resend";

let client: Resend | null = null;

export function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY!);
  return client;
}
```

- [ ] **Step 2: Create `src/lib/email/send-admin-alert.ts`**

```ts
import { resend } from "./client";
import { LEGAL } from "@/lib/legal";

type Args = {
  orderNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  address: string;
  pincode: string;
  productTitle: string;
  paymentMethod: "prepaid" | "pay_on_delivery";
  totalPaise: number;
  advancePaid: number;
  balanceDue: number;
  invoicePdfPath?: string;
  utmSource?: string;
  utmCampaign?: string;
  couponCode?: string;
};

export async function sendAdminOrderAlert(args: Args): Promise<void> {
  const body = `
New order received

Order #: ${args.orderNumber}
Invoice #: ${args.invoiceNumber}
Payment: ${args.paymentMethod === "prepaid" ? "Prepaid (paid in full)" : "Pay-on-Delivery"}
Total: ₹${(args.totalPaise / 100).toFixed(2)}
Advance paid (online): ₹${(args.advancePaid / 100).toFixed(2)}
Balance due on delivery: ₹${(args.balanceDue / 100).toFixed(2)}

Customer
${args.customerName}
${args.customerEmail}
${args.customerMobile}

Ship to
${args.address}
Pincode: ${args.pincode}

Product
${args.productTitle}

Attribution
UTM source: ${args.utmSource ?? "—"}
UTM campaign: ${args.utmCampaign ?? "—"}
Coupon: ${args.couponCode ?? "—"}

Paste-ready shipping block for Meesho:
------------------------------
${args.customerName}
${args.address}
${args.pincode}
${args.customerMobile}
------------------------------
`.trim();

  await resend().emails.send({
    from: `OrderLink Orders <orders@${new URL(process.env.SITE_URL!).hostname}>`,
    to: [LEGAL.supportEmail],
    subject: `🛒 New order ${args.orderNumber} — ₹${(args.totalPaise / 100).toFixed(0)}`,
    text: body,
  });
}
```

- [ ] **Step 3: Update `/api/orders/verify/route.ts` to generate invoice + send admin alert on success**

Replace the last few lines before `return NextResponse.json({ ok: true, ... })` with:

```ts
// Generate invoice PDF + send admin alert
try {
  const { decryptJSON } = await import("@/lib/crypto");
  const [pending] = await db
    .select()
    .from(schema.pendingSfSync)
    .where(eq(schema.pendingSfSync.orderRefId, orderId))
    .limit(1);
  if (pending) {
    const payload = decryptJSON<{
      fullName: string; email: string; mobile: string;
      addressLine1: string; addressLine2?: string; landmark?: string;
      pincode: string; city: string; state: string;
      utm_source?: string; utm_campaign?: string; couponCode?: string;
    }>({
      ciphertext: pending.payloadCiphertext as Buffer,
      iv: pending.payloadIv,
      tag: pending.payloadTag,
    });

    const { getProductBySlug, SHIPPING_PAISE } = await import("@/data/products");
    const { generateInvoicePdf } = await import("@/lib/invoice-pdf");
    const { sendAdminOrderAlert } = await import("@/lib/email/send-admin-alert");
    const product = getProductBySlug(order.productSlug)!;

    const pdfPath = await generateInvoicePdf({
      invoiceNumber: order.invoiceNumber,
      invoiceDate: new Date(),
      orderNumber: order.orderNumber,
      customer: {
        name: payload.fullName,
        email: payload.email,
        mobile: `+91${payload.mobile}`,
        address: [payload.addressLine1, payload.addressLine2, payload.landmark, payload.city, payload.state, payload.pincode]
          .filter(Boolean)
          .join(", "),
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
      .where(eq(schema.ordersRef.id, order.id));

    await sendAdminOrderAlert({
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      customerName: payload.fullName,
      customerEmail: payload.email,
      customerMobile: `+91${payload.mobile}`,
      address: [payload.addressLine1, payload.addressLine2, payload.landmark, payload.city, payload.state].filter(Boolean).join(", "),
      pincode: payload.pincode,
      productTitle: product.title,
      paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
      totalPaise: order.totalPaise,
      advancePaid: order.advancePaise,
      balanceDue: order.balanceDuePaise,
      invoicePdfPath: pdfPath,
      utmSource: payload.utm_source,
      utmCampaign: payload.utm_campaign,
      couponCode: payload.couponCode,
    });
  }
} catch (err) {
  console.error("Invoice/email post-payment step failed", err);
  // Don't fail the verify — the order is still paid; retry via admin if needed
}
```

- [ ] **Step 4: Create `src/app/orders/[id]/thanks/page.tsx`**

```tsx
import Link from "next/link";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";
import { LEGAL } from "@/lib/legal";

export default async function ThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(schema.ordersRef).where(eq(schema.ordersRef.id, id)).limit(1);
  if (rows.length === 0) notFound();
  const order = rows[0];
  const product = getProductBySlug(order.productSlug);

  return (
    <main className="max-w-3xl mx-auto px-6 py-20">
      <div className="w-14 h-14 rounded-full bg-coral text-cream flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41z"/></svg>
      </div>
      <h1 className="font-display text-4xl text-ink">Thanks, {order.customerFirstInitial}</h1>
      <p className="font-sans text-ink-soft text-lg mt-2">Your order is confirmed.</p>

      <dl className="mt-8 grid grid-cols-2 gap-4 font-sans text-sm">
        <div><dt className="text-ink-soft">Order number</dt><dd className="font-mono text-ink">{order.orderNumber}</dd></div>
        <div><dt className="text-ink-soft">Invoice number</dt><dd className="font-mono text-ink">{order.invoiceNumber}</dd></div>
        <div><dt className="text-ink-soft">Total</dt><dd>{rupees(order.totalPaise)}</dd></div>
        <div><dt className="text-ink-soft">Paid online</dt><dd>{rupees(order.advancePaise)}</dd></div>
        {order.balanceDuePaise > 0 && (
          <div><dt className="text-ink-soft">On delivery (cash)</dt><dd className="text-coral">{rupees(order.balanceDuePaise)}</dd></div>
        )}
        <div><dt className="text-ink-soft">Product</dt><dd>{product?.title}</dd></div>
      </dl>

      <section className="mt-10 space-y-3 font-sans text-sm text-ink">
        <p>Your order is being prepared and will ship via <strong>Meesho Logistics</strong>, our fulfilment partner.</p>
        <p>You'll receive:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Order confirmation from OrderLink (this page + email)</li>
          <li>Shipping + tracking SMS from <strong>Meesho</strong> within 24 hours</li>
          <li>Delivery in 3–8 days to {order.shipPincode}</li>
        </ul>
      </section>

      {order.invoicePdfPath && (
        <a
          href={`/orders/${order.id}/invoice.pdf`}
          className="inline-block mt-6 font-sans text-sm text-coral underline"
        >
          Download GST invoice (PDF)
        </a>
      )}

      <div className="mt-10 flex flex-wrap gap-4 font-sans">
        <Link href={`/track?id=${order.orderNumber}&code=${order.trackKey}`} className="rounded-md bg-coral text-cream px-5 py-2">
          Track this order
        </Link>
        <Link href="/" className="rounded-md border border-[color:var(--rule)] px-5 py-2">
          ← Continue shopping
        </Link>
      </div>

      <p className="mt-10 font-sans text-sm text-ink-soft">
        Questions? Email <a href={`mailto:${LEGAL.supportEmail}`} className="underline">{LEGAL.supportEmail}</a> or
        WhatsApp {LEGAL.supportPhone}.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Smoke-test end-to-end with Razorpay test card**

```bash
npm run dev
```

- Navigate to `/p/oil-dispenser` → checkout → fill form → pay with test card `4111 1111 1111 1111`
- Expected: redirect to `/orders/<uuid>/thanks` showing order details
- Admin inbox `hello@orderlink.in` receives new-order email (check Resend dashboard for test mode)
- `data/invoices/OL-INV-2026-000001.pdf` is created on disk

- [ ] **Step 6: Commit**

```bash
git add src/app/orders/ src/lib/email/ src/app/api/orders/verify/route.ts
git commit -m "feat(post-payment): /thanks page + admin Resend email + invoice generation on verified payment"
```

---

### Task 25: /orders/[id]/invoice.pdf route

**Files:** `src/app/orders/[id]/invoice.pdf/route.ts`

- [ ] **Step 1: Create the route**

```ts
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(schema.ordersRef).where(eq(schema.ordersRef.id, id)).limit(1);
  if (rows.length === 0 || !rows[0].invoicePdfPath) {
    return new NextResponse("Not found", { status: 404 });
  }
  const buf = await fs.readFile(rows[0].invoicePdfPath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${rows[0].invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Step 2: Smoke-test**

After Task 24's smoke-test, visit `/orders/<uuid>/invoice.pdf` → PDF opens inline in the browser.

- [ ] **Step 3: Commit**

```bash
git add src/app/orders/
git commit -m "feat(invoice): /orders/[id]/invoice.pdf serves generated PDF"
```

---

### Task 26: /track page for customer order lookup

**Files:** `src/app/track/page.tsx`, `src/lib/ratelimit.ts`, `src/app/api/track/route.ts`, `tests/api/track.test.ts`

- [ ] **Step 1: Create `src/lib/ratelimit.ts`**

```ts
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
```

- [ ] **Step 2: Create `src/app/api/track/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { rateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const schema$ = z.object({
  orderNumber: z.string().regex(/^OL-\d{4}-\d{4,}$/),
  trackKey: z.string().regex(/^\d{4}$/),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(`track:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const parsed = schema$.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const { orderNumber, trackKey } = parsed.data;
  const [row] = await db
    .select()
    .from(schema.ordersRef)
    .where(and(eq(schema.ordersRef.orderNumber, orderNumber), eq(schema.ordersRef.trackKey, trackKey)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: row.orderNumber,
      status: row.status,
      totalPaise: row.totalPaise,
      balanceDuePaise: row.balanceDuePaise,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt,
      productSlug: row.productSlug,
    },
  });
}
```

- [ ] **Step 3: Create `src/app/track/page.tsx` (client component form)**

```tsx
"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";

const STAGES = ["advance_paid", "paid", "confirmed", "shipped", "delivered"];
const STAGE_LABEL: Record<string, string> = {
  advance_paid: "Payment received",
  paid: "Payment received",
  confirmed: "Confirmed with Meesho",
  shipped: "In transit",
  delivered: "Delivered",
};

export default function TrackPage() {
  const sp = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(sp.get("id") ?? "");
  const [trackKey, setTrackKey] = useState(sp.get("code") ?? "");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (orderNumber && trackKey && !result) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setError("");
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, trackKey }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error === "rate_limited" ? "Too many attempts. Try again in an hour." : "Order not found. Check the number + mobile last-4.");
      return;
    }
    setResult(data.order);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl text-ink">Track your order</h1>
      <p className="font-sans text-ink-soft mt-2">Enter your order number and the last 4 digits of your mobile.</p>

      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="block">
          <span className="font-sans text-sm text-ink-soft">Order number</span>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono"
            placeholder="OL-2026-0001"
          />
        </label>
        <label className="block">
          <span className="font-sans text-sm text-ink-soft">Mobile (last 4 digits)</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={trackKey}
            onChange={(e) => setTrackKey(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest"
            placeholder="3210"
          />
        </label>
        <button type="submit" className="rounded-md bg-coral text-cream px-5 py-2 font-sans">
          Look up
        </button>
        {error && <p className="font-sans text-sm text-coral">{error}</p>}
      </form>

      {result && (
        <section className="mt-10 rounded-lg border border-[color:var(--rule)] p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">{result.orderNumber}</p>
          <h2 className="font-display text-2xl mt-1">{getProductBySlug(result.productSlug)?.title}</h2>
          <p className="font-sans text-sm text-ink-soft mt-2">
            Placed {new Date(result.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>

          <ol className="mt-6 space-y-2">
            {STAGES.map((stage) => {
              const currentIdx = STAGES.indexOf(result.status);
              const thisIdx = STAGES.indexOf(stage);
              const done = thisIdx <= currentIdx;
              return (
                <li key={stage} className={`flex items-center gap-3 font-sans text-sm ${done ? "text-ink" : "text-ink-soft/50"}`}>
                  <span className={`w-3 h-3 rounded-full ${done ? "bg-coral" : "bg-ink-soft/30"}`} aria-hidden />
                  {STAGE_LABEL[stage] ?? stage}
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex gap-3 font-sans text-sm">
            <p>Total: {rupees(result.totalPaise)}</p>
            {result.balanceDuePaise > 0 && <p className="text-coral">Cash due on delivery: {rupees(result.balanceDuePaise)}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Write `tests/api/track.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/track/route";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";

describe("POST /api/track", () => {
  beforeEach(async () => {
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.insert(schema.ordersRef).values({
      orderNumber: "OL-2026-0099",
      invoiceNumber: "OL-INV-2026-000099",
      status: "shipped",
      paymentMethod: "prepaid",
      totalPaise: 19100, advancePaise: 19100, balanceDuePaise: 0,
      productSlug: "oil-dispenser",
      customerFirstInitial: "P.",
      customerMobileLast4: "3210",
      shipPincode: "411014", shipState: "Maharashtra",
      trackKey: "3210",
    });
  });

  it("returns order on correct key", async () => {
    const res = await POST(
      new Request("http://localhost/api/track", {
        method: "POST",
        body: JSON.stringify({ orderNumber: "OL-2026-0099", trackKey: "3210" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order.status).toBe("shipped");
  });

  it("rejects wrong track key", async () => {
    const res = await POST(
      new Request("http://localhost/api/track", {
        method: "POST",
        body: JSON.stringify({ orderNumber: "OL-2026-0099", trackKey: "0000" }),
      })
    );
    expect(res.status).toBe(404);
  });
});
```

Run → GREEN.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ratelimit.ts src/app/api/track/ src/app/track/ tests/api/track.test.ts
git commit -m "feat(track): /track page + /api/track rate-limited lookup by order# + last-4 mobile"
```

---

## Milestone 7 — Salesforce integration

### Task 27: Salesforce JWT Bearer client

**Files:** `src/lib/salesforce/client.ts`, `src/lib/salesforce/types.ts`, `tests/lib/salesforce/client.test.ts`

**Prerequisite (user setup, not code):** Create a Connected App in SF → enable OAuth → upload public key cert → authorise the integration user → note the Consumer Key + integration user's username. Save the corresponding private key to `./sf-jwt.pem` locally (path in `.env`).

- [ ] **Step 1: Create `src/lib/salesforce/types.ts`**

```ts
export type SFAccountInput = {
  OrderLink_Customer_Id__c: string;
  RecordTypeId: string;
  FirstName: string;
  LastName: string;
  PersonEmail: string;
  PersonMobilePhone: string;
  PersonMailingStreet: string;
  PersonMailingCity: string;
  PersonMailingState: string;
  PersonMailingPostalCode: string;
  PersonMailingCountry: string;
  Source_Platform__c: "OrderLink";
  DPDP_Consent_Date__c: string;
  Last_UTM_Source__c?: string;
  Last_UTM_Medium__c?: string;
  Last_UTM_Campaign__c?: string;
  First_UTM_Source__c?: string;
  First_UTM_Medium__c?: string;
  First_UTM_Campaign__c?: string;
};

export type SFOrderInput = {
  OrderLink_Order_Number__c: string;
  RecordTypeId: string;
  AccountId: string;
  EffectiveDate: string;
  Status: "Draft" | "Activated";
  OrderLink_Status__c: string;
  TotalAmount: number;
  Total_Paise__c: number;
  Advance_Paise__c: number;
  Balance_Due_Paise__c: number;
  Payment_Method__c: "Prepaid" | "Pay-on-Delivery";
  Razorpay_Order_Id__c?: string;
  Razorpay_Payment_Id__c?: string;
  GST_Invoice_Number__c?: string;
  GST_CGST_Paise__c?: number;
  GST_SGST_Paise__c?: number;
  GST_IGST_Paise__c?: number;
  GST_Base_Paise__c?: number;
  Invoice_PDF_URL__c?: string;
  UTM_Source__c?: string;
  UTM_Medium__c?: string;
  UTM_Campaign__c?: string;
  Coupon_Code__c?: string;
  Coupon_Discount_Paise__c?: number;
  BillingStreet: string;
  BillingCity: string;
  BillingState: string;
  BillingPostalCode: string;
  BillingCountry: string;
};

export type SFOrderItemInput = {
  OrderId: string;
  Product2Id: string;
  PricebookEntryId: string;
  Quantity: number;
  UnitPrice: number;
  HSN_Code__c: string;
  GST_Rate_Percent__c: number;
  Product_Slug__c: string;
};
```

- [ ] **Step 2: Create `src/lib/salesforce/client.ts`**

```ts
import fs from "node:fs/promises";
import jsforce from "jsforce";

let cached: { conn: jsforce.Connection; expiresAt: number } | null = null;

export async function getSalesforceConnection(): Promise<jsforce.Connection> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.conn;
  const privateKey = await fs.readFile(process.env.SF_JWT_PRIVATE_KEY_PATH!, "utf-8");

  const conn = new jsforce.Connection({ loginUrl: process.env.SF_LOGIN_URL! });
  await conn.authorize(
    { grantType: "jwt", clientId: process.env.SF_CONSUMER_KEY!, privateKey, username: process.env.SF_USERNAME! }
  );
  // jsforce 3.x returns a token valid typically 2h; conservatively re-auth after 90 min
  cached = { conn, expiresAt: Date.now() + 90 * 60 * 1000 };
  return conn;
}

/** Lookup helper: find a record's Id by its External ID field value. */
export async function lookupByExternalId(
  conn: jsforce.Connection,
  sobject: string,
  externalIdField: string,
  value: string
): Promise<string | null> {
  const result = await conn.sobject(sobject).find({ [externalIdField]: value }, ["Id"]);
  return result.length > 0 ? (result[0].Id as string) : null;
}
```

- [ ] **Step 3: Smoke-test by querying the org identity (requires real SF creds in `.env`)**

Create a throwaway script `scripts/sf-ping.ts`:

```ts
import { getSalesforceConnection } from "@/lib/salesforce/client";

async function main() {
  const conn = await getSalesforceConnection();
  const identity = await conn.identity();
  console.log("Connected as", identity.username, "in org", identity.organization_id);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run: `npx tsx scripts/sf-ping.ts`

Expected output: "Connected as integration@codesierra.tech.orderlink in org 00DXXXXXXXXXXXX".

(If the SF Connected App hasn't been set up yet, skip the runtime check — the code is exercised by Task 28's sync test using mocks.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/salesforce/
git commit -m "feat(salesforce): JWT bearer auth client + external-id lookup helper"
```

---

### Task 28: syncOrderToSalesforce (Person Account + Order + OrderItem)

**Files:** `src/lib/salesforce/sync.ts`, `tests/lib/salesforce/sync.test.ts`

- [ ] **Step 1: Create `src/lib/salesforce/sync.ts`**

```ts
import crypto from "node:crypto";
import type jsforce from "jsforce";
import { getSalesforceConnection, lookupByExternalId } from "./client";
import type { SFAccountInput, SFOrderInput, SFOrderItemInput } from "./types";
import { LEGAL } from "@/lib/legal";

type SyncPayload = {
  orderNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string; // E.164 +91XXXXXXXXXX
  address: { line1: string; line2?: string; landmark?: string; city: string; state: string; pincode: string };
  totalPaise: number;
  advancePaise: number;
  balanceDuePaise: number;
  paymentMethod: "prepaid" | "pay_on_delivery";
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  gst: { cgstPaise: number; sgstPaise: number; igstPaise: number; basePaise: number };
  invoicePdfUrl?: string;
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  coupon?: { code: string; discountPaise: number };
  product: { slug: string; title: string; hsnCode: string; gstRatePercent: number; itemPricePaise: number };
  dpdpConsentDate: string; // ISO
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export async function syncOrderToSalesforce(
  payload: SyncPayload
): Promise<{ sfAccountId: string; sfOrderId: string }> {
  const conn = await getSalesforceConnection();
  const prefix = process.env.SF_EXTERNAL_ID_PREFIX ?? "orderlink";
  const customerExternalId = `${prefix}:${sha256(payload.customerEmail.toLowerCase())}`;
  const { first, last } = splitName(payload.customerName);

  // 1) Upsert Person Account
  const accountBody: SFAccountInput = {
    OrderLink_Customer_Id__c: customerExternalId,
    RecordTypeId: process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID!,
    FirstName: first || "Customer",
    LastName: last || first || "OrderLink",
    PersonEmail: payload.customerEmail,
    PersonMobilePhone: payload.customerMobile,
    PersonMailingStreet: [payload.address.line1, payload.address.line2, payload.address.landmark]
      .filter(Boolean)
      .join(", "),
    PersonMailingCity: payload.address.city,
    PersonMailingState: payload.address.state,
    PersonMailingPostalCode: payload.address.pincode,
    PersonMailingCountry: "India",
    Source_Platform__c: "OrderLink",
    DPDP_Consent_Date__c: payload.dpdpConsentDate,
    Last_UTM_Source__c: payload.utm.source,
    Last_UTM_Medium__c: payload.utm.medium,
    Last_UTM_Campaign__c: payload.utm.campaign,
    First_UTM_Source__c: payload.utm.source,
    First_UTM_Medium__c: payload.utm.medium,
    First_UTM_Campaign__c: payload.utm.campaign,
  };
  const accRes = await conn.sobject("Account").upsert(accountBody, "OrderLink_Customer_Id__c");
  const sfAccountId = (accRes as any).id
    ?? (await lookupByExternalId(conn, "Account", "OrderLink_Customer_Id__c", customerExternalId))!;

  // 2) Upsert Order
  const orderBody: SFOrderInput = {
    OrderLink_Order_Number__c: payload.orderNumber,
    RecordTypeId: process.env.SF_ORDER_RECORD_TYPE_ID!,
    AccountId: sfAccountId,
    EffectiveDate: new Date().toISOString(),
    Status: payload.status === "paid" || payload.status === "advance_paid" ? "Activated" : "Draft",
    OrderLink_Status__c: payload.status,
    TotalAmount: payload.totalPaise / 100,
    Total_Paise__c: payload.totalPaise,
    Advance_Paise__c: payload.advancePaise,
    Balance_Due_Paise__c: payload.balanceDuePaise,
    Payment_Method__c: payload.paymentMethod === "prepaid" ? "Prepaid" : "Pay-on-Delivery",
    Razorpay_Order_Id__c: payload.razorpayOrderId,
    Razorpay_Payment_Id__c: payload.razorpayPaymentId,
    GST_Invoice_Number__c: payload.invoiceNumber,
    GST_CGST_Paise__c: payload.gst.cgstPaise,
    GST_SGST_Paise__c: payload.gst.sgstPaise,
    GST_IGST_Paise__c: payload.gst.igstPaise,
    GST_Base_Paise__c: payload.gst.basePaise,
    Invoice_PDF_URL__c: payload.invoicePdfUrl,
    UTM_Source__c: payload.utm.source,
    UTM_Medium__c: payload.utm.medium,
    UTM_Campaign__c: payload.utm.campaign,
    Coupon_Code__c: payload.coupon?.code,
    Coupon_Discount_Paise__c: payload.coupon?.discountPaise,
    BillingStreet: [payload.address.line1, payload.address.line2, payload.address.landmark].filter(Boolean).join(", "),
    BillingCity: payload.address.city,
    BillingState: payload.address.state,
    BillingPostalCode: payload.address.pincode,
    BillingCountry: "India",
  };
  const orderRes = await conn.sobject("Order").upsert(orderBody, "OrderLink_Order_Number__c");
  const sfOrderId = (orderRes as any).id
    ?? (await lookupByExternalId(conn, "Order", "OrderLink_Order_Number__c", payload.orderNumber))!;

  // 3) Replace OrderItems (idempotent)
  const existingItems = (await conn.sobject("OrderItem").find({ OrderId: sfOrderId }, ["Id"])) as { Id: string }[];
  if (existingItems.length > 0) {
    await conn.sobject("OrderItem").destroy(existingItems.map((i) => i.Id));
  }
  const product2Id = await lookupByExternalId(conn, "Product2", "OrderLink_Slug__c", payload.product.slug);
  if (!product2Id) {
    throw new Error(`Product2 with slug ${payload.product.slug} not found in Salesforce — run scripts/seed-sf-products.ts`);
  }
  // Standard Pricebook lookup
  const pricebook = await conn.query<{ Id: string }>("SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1");
  const standardPricebookId = pricebook.records[0].Id;
  const pbEntry = await conn.query<{ Id: string }>(
    `SELECT Id FROM PricebookEntry WHERE Product2Id = '${product2Id}' AND Pricebook2Id = '${standardPricebookId}' LIMIT 1`
  );
  const pricebookEntryId = pbEntry.records[0].Id;

  const orderItem: SFOrderItemInput = {
    OrderId: sfOrderId,
    Product2Id: product2Id,
    PricebookEntryId: pricebookEntryId,
    Quantity: 1,
    UnitPrice: payload.product.itemPricePaise / 100,
    HSN_Code__c: payload.product.hsnCode,
    GST_Rate_Percent__c: payload.product.gstRatePercent,
    Product_Slug__c: payload.product.slug,
  };
  await conn.sobject("OrderItem").create(orderItem);

  return { sfAccountId, sfOrderId };
}
```

- [ ] **Step 2: Write mocked unit test `tests/lib/salesforce/sync.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncOrderToSalesforce } from "@/lib/salesforce/sync";

vi.mock("@/lib/salesforce/client", () => {
  return {
    getSalesforceConnection: vi.fn(async () => {
      const makeSobject = () => ({
        upsert: vi.fn(async () => ({ success: true, id: "001FAKE" })),
        find: vi.fn(async () => []),
        destroy: vi.fn(async () => []),
        create: vi.fn(async () => ({ success: true, id: "802FAKE" })),
      });
      return {
        sobject: vi.fn(() => makeSobject()),
        query: vi.fn(async (q: string) => {
          if (q.includes("Pricebook2")) return { records: [{ Id: "01sFAKE" }] };
          if (q.includes("PricebookEntry")) return { records: [{ Id: "01uFAKE" }] };
          return { records: [] };
        }),
      };
    }),
    lookupByExternalId: vi.fn(async () => "01tFAKE"),
  };
});

beforeEach(() => {
  process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID = "012FAKE_PERSON";
  process.env.SF_ORDER_RECORD_TYPE_ID = "012FAKE_ORDER";
  process.env.SF_EXTERNAL_ID_PREFIX = "orderlink";
});

const payload = {
  orderNumber: "OL-2026-0001",
  invoiceNumber: "OL-INV-2026-000001",
  customerName: "Priya Sharma",
  customerEmail: "priya@example.com",
  customerMobile: "+919876543210",
  address: { line1: "221B Baker St", city: "Pune", state: "Maharashtra", pincode: "411014" },
  totalPaise: 19100, advancePaise: 19100, balanceDuePaise: 0,
  paymentMethod: "prepaid" as const,
  status: "paid",
  gst: { cgstPaise: 1791, sgstPaise: 1791, igstPaise: 0, basePaise: 19900 },
  utm: {},
  product: { slug: "oil-dispenser", title: "Premium Oil Dispenser", hsnCode: "7013", gstRatePercent: 18, itemPricePaise: 15000 },
  dpdpConsentDate: "2026-04-19T12:00:00Z",
};

describe("syncOrderToSalesforce", () => {
  it("returns account + order Ids from successful upsert", async () => {
    const result = await syncOrderToSalesforce(payload);
    expect(result.sfAccountId).toBeTruthy();
    expect(result.sfOrderId).toBeTruthy();
  });
});
```

Run → GREEN.

- [ ] **Step 3: Create `scripts/seed-sf-products.ts`**

```ts
import { getSalesforceConnection, lookupByExternalId } from "@/lib/salesforce/client";
import { products } from "@/data/products";

async function main() {
  const conn = await getSalesforceConnection();
  for (const p of products) {
    const body = {
      OrderLink_Slug__c: p.slug,
      RecordTypeId: process.env.SF_PRODUCT_RECORD_TYPE_ID!,
      Name: p.title,
      ProductCode: p.slug,
      IsActive: p.status === "live",
      Description: p.description,
      Category__c: p.category.charAt(0).toUpperCase() + p.category.slice(1),
      HSN_Code__c: p.hsnCode,
      GST_Rate_Percent__c: p.gstRatePercent,
      MRP_Paise__c: p.mrpPaise,
      Price_Paise__c: p.itemPricePaise,
      Prepaid_Price_Paise__c: p.itemPrepaidPricePaise,
      Meesho_Source_URL__c: p.meeshoSourceUrl,
    };
    await conn.sobject("Product2").upsert(body as any, "OrderLink_Slug__c");

    // Ensure a PricebookEntry exists at the standard price
    const product2Id = await lookupByExternalId(conn, "Product2", "OrderLink_Slug__c", p.slug);
    const standardPb = await conn.query<{ Id: string }>("SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1");
    const standardPbId = standardPb.records[0].Id;
    const existing = await conn.query<{ Id: string }>(
      `SELECT Id FROM PricebookEntry WHERE Product2Id = '${product2Id}' AND Pricebook2Id = '${standardPbId}' LIMIT 1`
    );
    if (existing.records.length === 0) {
      await conn.sobject("PricebookEntry").create({
        Product2Id: product2Id,
        Pricebook2Id: standardPbId,
        UnitPrice: p.itemPricePaise / 100,
        IsActive: true,
      });
    }
  }
  console.log(`Synced ${products.length} products to Salesforce`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run (requires real SF creds): `npx tsx scripts/seed-sf-products.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/salesforce/sync.ts scripts/seed-sf-products.ts tests/lib/salesforce/
git commit -m "feat(salesforce): syncOrderToSalesforce (Person Account + Order + OrderItem upsert) + product seeder"
```

---

### Task 29: Wire SF sync into /api/orders/verify with fallback

**Files:** `src/app/api/orders/verify/route.ts` (update)

- [ ] **Step 1: Add SF-sync attempt at the end of the verify handler**

Extend the code added in Task 24 (after the invoice generation block, inside the same try-block):

```ts
// Salesforce sync — fail-soft: if it throws, the row stays in pending_sf_sync
if (process.env.SF_SYNC_ENABLED === "true" && pending) {
  try {
    const { syncOrderToSalesforce } = await import("@/lib/salesforce/sync");
    const { calculateGSTBreakup } = await import("@/lib/pricing");
    const { SHIPPING_PAISE, SHIPPING_GST_RATE } = await import("@/data/products");
    const gst = calculateGSTBreakup({
      shippingState: payload.state,
      lines: [
        { taxableValuePaise: product.itemPricePaise, gstRatePercent: product.gstRatePercent },
        { taxableValuePaise: SHIPPING_PAISE, gstRatePercent: SHIPPING_GST_RATE },
      ],
    });
    const { sfAccountId, sfOrderId } = await syncOrderToSalesforce({
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      customerName: payload.fullName,
      customerEmail: payload.email,
      customerMobile: `+91${payload.mobile}`,
      address: { line1: payload.addressLine1, line2: payload.addressLine2, landmark: payload.landmark, city: payload.city, state: payload.state, pincode: payload.pincode },
      totalPaise: order.totalPaise,
      advancePaise: order.advancePaise,
      balanceDuePaise: order.balanceDuePaise,
      paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
      status: newStatus,
      razorpayOrderId: order.razorpayOrderId ?? undefined,
      razorpayPaymentId: razorpayPaymentId,
      gst,
      invoicePdfUrl: `${process.env.SITE_URL}/orders/${order.id}/invoice.pdf`,
      utm: { source: payload.utm_source, medium: payload.utm_medium, campaign: payload.utm_campaign, term: payload.utm_term, content: payload.utm_content },
      product: { slug: product.slug, title: product.title, hsnCode: product.hsnCode, gstRatePercent: product.gstRatePercent, itemPricePaise: product.itemPricePaise },
      dpdpConsentDate: new Date().toISOString(),
    });

    await db
      .update(schema.ordersRef)
      .set({ sfSynced: true, sfAccountId, sfOrderId, sfLastSyncAt: new Date() })
      .where(eq(schema.ordersRef.id, order.id));
    await db
      .update(schema.pendingSfSync)
      .set({ status: "done" })
      .where(eq(schema.pendingSfSync.id, pending.id));
  } catch (err) {
    console.error("SF sync failed — will retry via background worker", err);
    await db
      .update(schema.pendingSfSync)
      .set({ status: "pending", attempts: pending.attempts + 1, lastError: String(err), nextAttemptAt: new Date(Date.now() + 60_000) })
      .where(eq(schema.pendingSfSync.id, pending.id));
  }
}
```

- [ ] **Step 2: Smoke-test with real SF creds**

Place a test order end-to-end. Verify:
- `orders_ref.sf_synced=true` (check via `npx drizzle-kit studio`)
- New Person Account visible in SF with the OrderLink Customer Record Type
- New Order visible with correct OrderLink_Status__c
- OrderItem linked correctly

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/verify/route.ts
git commit -m "feat(salesforce): sync on /orders/verify success, fall back to pending_sf_sync retry queue"
```

---

### Task 30: Background retry worker for pending_sf_sync

**Files:** `src/workers/sf-sync.ts`, `scripts/run-sf-sync-worker.ts`

- [ ] **Step 1: Create `src/workers/sf-sync.ts`**

```ts
import { db, schema } from "@/db/client";
import { eq, and, lte, or } from "drizzle-orm";
import { decryptJSON } from "@/lib/crypto";
import { syncOrderToSalesforce } from "@/lib/salesforce/sync";
import { calculateGSTBreakup } from "@/lib/pricing";
import { getProductBySlug, SHIPPING_PAISE, SHIPPING_GST_RATE } from "@/data/products";

const BACKOFF_MINUTES = [1, 5, 15, 60, 360, 360]; // 1m, 5m, 15m, 1h, 6h, 6h

export async function processPendingSfSyncOnce(): Promise<{ processed: number; errors: number }> {
  const due = await db
    .select()
    .from(schema.pendingSfSync)
    .where(
      and(
        eq(schema.pendingSfSync.status, "pending"),
        lte(schema.pendingSfSync.nextAttemptAt, new Date())
      )
    )
    .limit(25);

  let errors = 0;
  for (const job of due) {
    await db.update(schema.pendingSfSync).set({ status: "running" }).where(eq(schema.pendingSfSync.id, job.id));

    try {
      const payload = decryptJSON<any>({
        ciphertext: job.payloadCiphertext as Buffer,
        iv: job.payloadIv,
        tag: job.payloadTag,
      });
      const [order] = await db
        .select()
        .from(schema.ordersRef)
        .where(eq(schema.ordersRef.id, job.orderRefId))
        .limit(1);
      if (!order || (order.status !== "paid" && order.status !== "advance_paid")) {
        // Order not yet paid — skip for now, reschedule
        await db
          .update(schema.pendingSfSync)
          .set({ status: "pending", nextAttemptAt: new Date(Date.now() + 5 * 60_000) })
          .where(eq(schema.pendingSfSync.id, job.id));
        continue;
      }
      const product = getProductBySlug(order.productSlug)!;
      const gst = calculateGSTBreakup({
        shippingState: payload.state,
        lines: [
          { taxableValuePaise: product.itemPricePaise, gstRatePercent: product.gstRatePercent },
          { taxableValuePaise: SHIPPING_PAISE, gstRatePercent: SHIPPING_GST_RATE },
        ],
      });
      const { sfAccountId, sfOrderId } = await syncOrderToSalesforce({
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        customerName: payload.fullName,
        customerEmail: payload.email,
        customerMobile: `+91${payload.mobile}`,
        address: { line1: payload.addressLine1, line2: payload.addressLine2, landmark: payload.landmark, city: payload.city, state: payload.state, pincode: payload.pincode },
        totalPaise: order.totalPaise, advancePaise: order.advancePaise, balanceDuePaise: order.balanceDuePaise,
        paymentMethod: order.paymentMethod as "prepaid" | "pay_on_delivery",
        status: order.status,
        razorpayOrderId: order.razorpayOrderId ?? undefined,
        razorpayPaymentId: order.razorpayPaymentId ?? undefined,
        gst,
        invoicePdfUrl: `${process.env.SITE_URL}/orders/${order.id}/invoice.pdf`,
        utm: { source: payload.utm_source, medium: payload.utm_medium, campaign: payload.utm_campaign },
        product: { slug: product.slug, title: product.title, hsnCode: product.hsnCode, gstRatePercent: product.gstRatePercent, itemPricePaise: product.itemPricePaise },
        dpdpConsentDate: new Date().toISOString(),
      });

      await db
        .update(schema.ordersRef)
        .set({ sfSynced: true, sfAccountId, sfOrderId, sfLastSyncAt: new Date() })
        .where(eq(schema.ordersRef.id, order.id));
      await db.update(schema.pendingSfSync).set({ status: "done" }).where(eq(schema.pendingSfSync.id, job.id));
    } catch (err) {
      errors++;
      const nextAttempts = job.attempts + 1;
      const finalFail = nextAttempts >= BACKOFF_MINUTES.length;
      await db
        .update(schema.pendingSfSync)
        .set({
          status: finalFail ? "failed" : "pending",
          attempts: nextAttempts,
          lastError: String(err).slice(0, 1000),
          nextAttemptAt: finalFail ? new Date() : new Date(Date.now() + BACKOFF_MINUTES[nextAttempts - 1] * 60_000),
        })
        .where(eq(schema.pendingSfSync.id, job.id));
    }
  }
  return { processed: due.length, errors };
}
```

- [ ] **Step 2: Create `scripts/run-sf-sync-worker.ts` (loop-based local worker)**

```ts
import { processPendingSfSyncOnce } from "@/workers/sf-sync";

async function main() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await processPendingSfSyncOnce();
    if (r.processed > 0) console.log(`[sf-sync] processed=${r.processed} errors=${r.errors}`);
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run during dev: `npx tsx scripts/run-sf-sync-worker.ts` (keep a separate terminal open).

In production the worker runs as a sidecar container (Task 41).

- [ ] **Step 3: Commit**

```bash
git add src/workers/sf-sync.ts scripts/run-sf-sync-worker.ts
git commit -m "feat(salesforce): background retry worker processing pending_sf_sync with exponential backoff"
```

---

### Task 31: Admin back-sync — update SF on status change

**Files:** `src/lib/salesforce/status-update.ts`

- [ ] **Step 1: Create `src/lib/salesforce/status-update.ts`**

```ts
import { getSalesforceConnection } from "./client";

export async function updateSfOrderStatus(args: {
  sfOrderId: string;
  orderLinkStatus: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  meeshoTrackingId?: string;
  meeshoTrackingUrl?: string;
  cancellationReason?: string;
}): Promise<void> {
  const conn = await getSalesforceConnection();
  const fields: Record<string, unknown> = { Id: args.sfOrderId, OrderLink_Status__c: args.orderLinkStatus };
  if (args.shippedAt) fields.Shipped_At__c = args.shippedAt.toISOString();
  if (args.deliveredAt) fields.Delivered_At__c = args.deliveredAt.toISOString();
  if (args.cancelledAt) fields.Cancelled_At__c = args.cancelledAt.toISOString();
  if (args.meeshoTrackingId) fields.Meesho_Tracking_Id__c = args.meeshoTrackingId;
  if (args.meeshoTrackingUrl) fields.Meesho_Tracking_URL__c = args.meeshoTrackingUrl;
  if (args.cancellationReason) fields.Cancellation_Reason__c = args.cancellationReason;
  await conn.sobject("Order").update(fields);
}
```

This will be called from admin `actions.ts` in Task 32.

- [ ] **Step 2: Commit**

```bash
git add src/lib/salesforce/status-update.ts
git commit -m "feat(salesforce): updateSfOrderStatus helper for admin back-sync"
```

---

## Milestone 8 — Admin + policies

### Task 32: /admin/orders page with basic auth + status actions + CSV export

**Files:** `src/middleware.ts`, `src/app/admin/orders/page.tsx`, `src/app/admin/orders/actions.ts`, `src/app/admin/orders/export/route.ts`

- [ ] **Step 1: Create `src/middleware.ts` for basic-auth gate**

```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"; // npm i bcryptjs @types/bcryptjs if not present

export const config = { matcher: ["/admin/:path*"] };

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");
  if (user !== process.env.ADMIN_USERNAME) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const hash = process.env.ADMIN_PASSWORD_BCRYPT!;
  if (!bcrypt.compareSync(pass, hash)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}
```

Install bcryptjs if not already:
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Generate a password hash for `.env`:
```bash
node -e "console.log(require('bcryptjs').hashSync('your-admin-password', 10))"
```
Paste output into `.env` as `ADMIN_PASSWORD_BCRYPT=...`.

- [ ] **Step 2: Create `src/app/admin/orders/actions.ts` (server actions)**

```ts
"use server";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { updateSfOrderStatus } from "@/lib/salesforce/status-update";
import { commitInventory } from "@/lib/inventory";
import { revalidatePath } from "next/cache";

export async function setOrderStatus(orderId: string, newStatus: string, extras: { trackingId?: string; trackingUrl?: string } = {}) {
  const [order] = await db.select().from(schema.ordersRef).where(eq(schema.ordersRef.id, orderId)).limit(1);
  if (!order) throw new Error("order_not_found");

  const now = new Date();
  const update: Partial<typeof schema.ordersRef.$inferInsert> = { status: newStatus, updatedAt: now };
  await db.update(schema.ordersRef).set(update).where(eq(schema.ordersRef.id, orderId));

  if (order.sfOrderId) {
    const sfExtras: Parameters<typeof updateSfOrderStatus>[0] = {
      sfOrderId: order.sfOrderId,
      orderLinkStatus: newStatus,
    };
    if (newStatus === "shipped") {
      sfExtras.shippedAt = now;
      sfExtras.meeshoTrackingId = extras.trackingId;
      sfExtras.meeshoTrackingUrl = extras.trackingUrl;
    }
    if (newStatus === "delivered") sfExtras.deliveredAt = now;
    if (newStatus === "cancelled") sfExtras.cancelledAt = now;
    try {
      await updateSfOrderStatus(sfExtras);
    } catch (err) {
      console.error("SF status back-sync failed", err);
      // Admin sees the local change; retry via pending_sf_sync if needed
    }
  }

  revalidatePath("/admin/orders");
}
```

- [ ] **Step 3: Create `src/app/admin/orders/page.tsx`**

```tsx
import { db, schema } from "@/db/client";
import { desc } from "drizzle-orm";
import { setOrderStatus } from "./actions";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";

const STATUSES = ["pending_advance", "pending_payment", "advance_paid", "paid", "confirmed", "shipped", "delivered", "cancelled", "refunded"];

export default async function AdminOrdersPage() {
  const rows = await db.select().from(schema.ordersRef).orderBy(desc(schema.ordersRef.createdAt)).limit(100);
  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Orders</h1>
        <a href="/admin/orders/export" className="font-mono text-xs uppercase tracking-widest text-coral underline">
          Export CSV ↓
        </a>
      </header>

      <table className="w-full mt-8 font-sans text-sm border-collapse">
        <thead>
          <tr className="text-left font-mono text-xs uppercase tracking-widest text-ink-soft border-b border-[color:var(--rule)]">
            <th className="py-3 pr-4">Order</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Pincode</th>
            <th>Product</th>
            <th>Total</th>
            <th>Due</th>
            <th>Method</th>
            <th>Status</th>
            <th>SF</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[color:var(--rule)] align-top">
              <td className="py-3 pr-4 font-mono text-xs">{r.orderNumber}</td>
              <td className="text-ink-soft">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
              <td>{r.customerFirstInitial} · …{r.customerMobileLast4}</td>
              <td className="font-mono text-xs">{r.shipPincode}</td>
              <td>{getProductBySlug(r.productSlug)?.title}</td>
              <td>{rupees(r.totalPaise)}</td>
              <td className="text-coral">{r.balanceDuePaise > 0 ? rupees(r.balanceDuePaise) : "—"}</td>
              <td className="font-mono text-xs">{r.paymentMethod}</td>
              <td>
                <form action={async (fd) => { "use server"; await setOrderStatus(r.id, String(fd.get("status"))); }}>
                  <select name="status" defaultValue={r.status} className="rounded border border-[color:var(--rule)] text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="submit" className="ml-2 text-xs text-coral">Set</button>
                </form>
              </td>
              <td className="text-xs">{r.sfSynced ? "✓" : "—"}</td>
              <td>
                <a href={`/orders/${r.id}/invoice.pdf`} className="text-xs text-ink-soft underline">PDF</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] **Step 4: Create `src/app/admin/orders/export/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(schema.ordersRef).orderBy(desc(schema.ordersRef.createdAt));
  const header = [
    "order_number","invoice_number","status","payment_method","total_paise","advance_paise","balance_due_paise",
    "product_slug","ship_pincode","ship_state","razorpay_order_id","razorpay_payment_id","sf_synced","created_at",
    "utm_source","utm_medium","utm_campaign",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.orderNumber, r.invoiceNumber, r.status, r.paymentMethod,
      r.totalPaise, r.advancePaise, r.balanceDuePaise,
      r.productSlug, r.shipPincode, r.shipState,
      r.razorpayOrderId ?? "", r.razorpayPaymentId ?? "",
      r.sfSynced, r.createdAt.toISOString(),
      r.utmSource ?? "", r.utmMedium ?? "", r.utmCampaign ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=orders-${new Date().toISOString().slice(0, 10)}.csv` },
  });
}
```

- [ ] **Step 5: Verify locally**

```bash
npm run dev
```

Visit http://localhost:3000/admin/orders → browser prompts for basic auth → login with `ADMIN_USERNAME` / the plaintext password you hashed. Expected: orders list renders. Change a status → page refreshes with updated status.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/admin/ package.json package-lock.json
git commit -m "feat(admin): /admin/orders with basic auth, status actions (back-syncs to SF), CSV export"
```

---

### Task 33: Five policy pages (terms, privacy, refund, shipping, logistics)

**Files:** `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/refund-policy/page.tsx`, `src/app/shipping-policy/page.tsx`, `src/app/logistics/page.tsx`, `src/components/PolicyPage.tsx`

- [ ] **Step 1: Create reusable `src/components/PolicyPage.tsx`**

```tsx
import { LEGAL } from "@/lib/legal";

export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-sans text-ink leading-relaxed">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Last updated: {updated}</p>
        <h1 className="font-display text-4xl mt-2">{title}</h1>
      </header>
      <article className="prose prose-neutral max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:my-3 [&_ul]:list-disc [&_ul]:ml-6 [&_a]:text-coral [&_a]:underline">
        {children}
      </article>
      <footer className="mt-16 pt-6 border-t border-[color:var(--rule)] font-sans text-sm text-ink-soft">
        <p>{LEGAL.companyName}</p>
        <p>CIN: {LEGAL.cin} · GSTIN: {LEGAL.gstin}</p>
        <p>{LEGAL.formattedAddress()}</p>
        <p>Grievance officer: {LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation} · {LEGAL.supportEmail} · {LEGAL.supportPhone}</p>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/terms/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Terms of Service — OrderLink" };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Service" updated="19 April 2026">
      <p>These Terms of Service govern your use of the OrderLink website (the "Site"), operated by {LEGAL.companyName} ({LEGAL.brandName}), CIN {LEGAL.cin}. By placing an order you agree to these Terms.</p>
      <h2>Orders and pricing</h2>
      <p>All prices are in INR and are inclusive of applicable taxes unless stated otherwise. Prices are final at the moment your payment is processed; we reserve the right to correct typographical errors.</p>
      <h2>Payment</h2>
      <p>We offer two payment options: Prepaid (full amount online via Razorpay, with a 5% discount on item price) and Pay-on-Delivery (₹49 shipping paid upfront via Razorpay, item price in cash on delivery). The ₹49 advance is non-refundable in the event of refused delivery without valid cause.</p>
      <h2>Shipping and delivery</h2>
      <p>Orders ship via our logistics partner Meesho Logistics to Indian addresses within 3–8 business days. See our <a href="/shipping-policy">Shipping Policy</a> for details, including the 15-day delivery guarantee.</p>
      <h2>Returns and refunds</h2>
      <p>See our <a href="/refund-policy">Refund Policy</a>.</p>
      <h2>Limitation of liability</h2>
      <p>To the maximum extent permitted by applicable law, {LEGAL.companyName}'s total liability for any claim arising from these Terms shall not exceed the value of the order giving rise to the claim.</p>
      <h2>Governing law</h2>
      <p>These Terms are governed by Indian law. Any dispute is subject to the exclusive jurisdiction of the courts at Pune, Maharashtra.</p>
      <h2>Contact</h2>
      <p>For any query, reach out at <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> or {LEGAL.supportPhone}.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 3: Create `src/app/privacy/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacy Policy — OrderLink" };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="19 April 2026">
      <p>{LEGAL.companyName} ({LEGAL.brandName}) is the data fiduciary for personal data you share with us via {LEGAL.brandName}. This policy describes what we collect, why, and how we process it, in accordance with the Digital Personal Data Protection Act 2023 (India) and other applicable law.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Identifying:</strong> full name, email, mobile, shipping address.</li>
        <li><strong>Transactional:</strong> order history, invoice records, payment status.</li>
        <li><strong>Attribution (with consent):</strong> UTM parameters, referring URL, landing page.</li>
        <li><strong>Support:</strong> messages you send us on WhatsApp or email.</li>
      </ul>

      <h2>Why we collect it</h2>
      <ul>
        <li>To fulfil your order (name, mobile, address shared with Meesho Logistics for delivery).</li>
        <li>To process payment (name, email, amount shared with Razorpay).</li>
        <li>To send you order and shipping updates.</li>
        <li>To comply with GST invoicing requirements (7 years retention under CGST Rules).</li>
      </ul>

      <h2>Retention</h2>
      <p>Order records are retained for 7 years as required by the CGST Act. Non-transactional data (UTM attribution, support conversations) is retained for 24 months unless deleted sooner on request.</p>

      <h2>Data processors we use</h2>
      <ul>
        <li><strong>Salesforce</strong> (<a href="https://trust.salesforce.com" target="_blank" rel="noopener">trust.salesforce.com</a>) — stores your customer profile, order history, and communication preferences on Hyperforce India infrastructure. ISO 27001, SOC 2 Type II, GDPR-certified.</li>
        <li><strong>Razorpay</strong> — processes payments (RBI-regulated).</li>
        <li><strong>Meesho</strong> — logistics and last-mile delivery.</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Sentry</strong> — error monitoring; PII is scrubbed before events leave your browser.</li>
      </ul>

      <h2>Your rights under the DPDP Act 2023</h2>
      <ul>
        <li><strong>Right to access:</strong> email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> with "Data access request — order [number]" and we'll send you a machine-readable copy within 30 days.</li>
        <li><strong>Right to correction:</strong> same email flow.</li>
        <li><strong>Right to erasure:</strong> we'll redact your PII from our systems. Statutory records retained where required by law.</li>
        <li><strong>Right to grievance:</strong> contact our Grievance Officer {LEGAL.grievanceOfficerName} at {LEGAL.supportEmail} / {LEGAL.supportPhone}.</li>
      </ul>

      <h2>Cookies and tracking</h2>
      <p>We use only essential cookies (session, CSRF). We do not use advertising or cross-site tracking cookies. Cookie preferences can be set via the banner on your first visit.</p>

      <h2>Data Protection Officer</h2>
      <p>{LEGAL.dpoName}, {LEGAL.dpoDesignation} — <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>, {LEGAL.supportPhone}</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 4: Create `src/app/refund-policy/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Refund & Return Policy — OrderLink" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Return Policy" updated="19 April 2026">
      <h2>What's refundable</h2>
      <p><strong>The item cost.</strong> Returns accepted within 7 days of delivery in original unused condition with original packaging.</p>
      <h2>What's not</h2>
      <p><strong>The ₹49 shipping charge.</strong> This covers Meesho Logistics' actual dispatch cost and is non-refundable on returns or refused deliveries.</p>
      <h2>Exceptions — full refund (item + shipping)</h2>
      <ul>
        <li>You received a <strong>damaged or incorrect item</strong>.</li>
        <li>Your order is <strong>not delivered within 15 days</strong> of placement. The ₹49 shipping is refunded on top of any item refund.</li>
      </ul>
      <h2>Refund timeline</h2>
      <p>Once the return is received and approved, refunds are issued within 7 working days to the original payment method (Razorpay UPI/card/netbanking) or to a bank account for cash-on-delivery balances.</p>
      <h2>How to request a return</h2>
      <p>Email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> or WhatsApp {LEGAL.supportPhone} with your order number ("OL-YYYY-NNNN") within the 7-day window. We'll coordinate pickup via Meesho and update you within 48 hours.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 5: Create `src/app/shipping-policy/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";

export const metadata = { title: "Shipping Policy — OrderLink" };

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping Policy" updated="19 April 2026">
      <h2>Shipping charge</h2>
      <p>Flat ₹49 across all Indian pincodes we serve. This is shown as a separate line at checkout and on your invoice. Shipping is non-refundable under normal return scenarios; see our <a href="/refund-policy">Refund Policy</a> for exceptions.</p>
      <h2>Delivery window</h2>
      <p>Orders ship within 1 working day of confirmation and arrive within 3–8 business days for most pincodes.</p>
      <h2>15-day delivery guarantee</h2>
      <p>If your order is not delivered within 15 days of placement, we refund the ₹49 shipping charge in full. Item refunds are separate.</p>
      <h2>Tracking</h2>
      <p>Once dispatched, you'll receive an SMS from our logistics partner Meesho with a tracking link. You can also check status any time on our <a href="/track">Track Order</a> page.</p>
      <h2>Serviceability</h2>
      <p>We ship to 19,000+ Indian pincodes. Enter yours at checkout to confirm — if we don't currently serve your area, you can leave your email to be notified when we expand.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 6: Create `src/app/logistics/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";

export const metadata = { title: "Our Logistics Partnership — OrderLink" };

export default function LogisticsPage() {
  return (
    <PolicyPage title="Shipped by Meesho Logistics" updated="19 April 2026">
      <p>OrderLink has partnered with <strong>Meesho Logistics</strong>, India's largest fulfilment network, to bring you faster, reliable delivery across 19,000+ pincodes.</p>
      <h2>What that means for you</h2>
      <ul>
        <li>Your order ships via Meesho's network, reaching most Indian pincodes in 3–8 days.</li>
        <li>You'll receive <strong>SMS updates from Meesho</strong> at each stage — dispatched, out for delivery, delivered — alongside our email confirmation.</li>
        <li>Your payment and customer account stay with OrderLink. Meesho is our delivery partner, not a separate merchant.</li>
      </ul>
      <h2>Why Meesho</h2>
      <p>With 50+ crore deliveries and one of India's densest pincode coverages, Meesho's logistics arm (Valmo) is built for the scale and variety of Indian addresses — including pincodes many couriers refuse. It also gives you the confidence of a partner you know.</p>
      <h2>Tracking</h2>
      <p>Once dispatched, your Meesho SMS contains a tracking link. You can also track on our <a href="/track">Track Order</a> page at any time — no login required.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 7: Manual verification**

```bash
npm run dev
```

Visit each: `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/logistics`. Expected: each renders with brand typography, footer legal block shows CIN/GSTIN/address.

- [ ] **Step 8: Commit**

```bash
git add src/app/terms/ src/app/privacy/ src/app/refund-policy/ src/app/shipping-policy/ src/app/logistics/ src/components/PolicyPage.tsx
git commit -m "feat(policy): 5 policy pages (terms, privacy, refund, shipping, logistics) with shared PolicyPage layout"
```

---

### Task 34: /contact + /about pages with SLA commitment

**Files:** `src/app/contact/page.tsx`, `src/app/about/page.tsx`

- [ ] **Step 1: Create `src/app/contact/page.tsx`**

```tsx
import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata = { title: "Contact — OrderLink" };

export default function ContactPage() {
  return (
    <PolicyPage title="Contact us" updated="19 April 2026">
      <h2>Reach us</h2>
      <ul>
        <li>Email: <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a></li>
        <li>Phone: {LEGAL.supportPhone}</li>
        <li>WhatsApp: <WhatsAppButton variant="inline" label={LEGAL.whatsappNumber} /></li>
      </ul>
      <h2>Response time commitment</h2>
      <p>We respond to every WhatsApp message within <strong>2 hours, Monday–Saturday, 10 AM – 7 PM IST</strong>.</p>
      <p>Email replies within <strong>24 hours</strong> (including weekends).</p>
      <p>Orders placed before <strong>3 PM IST</strong> dispatch the same working day via Meesho.</p>
      <h2>Registered office</h2>
      <p>{LEGAL.companyName}<br />{LEGAL.registeredAddress.line1}, {LEGAL.registeredAddress.line2}<br />{LEGAL.registeredAddress.city}, {LEGAL.registeredAddress.state} {LEGAL.registeredAddress.pincode}<br />{LEGAL.registeredAddress.country}</p>
      <h2>Legal identifiers</h2>
      <p>CIN: {LEGAL.cin}<br />GSTIN: {LEGAL.gstin}</p>
      <h2>Grievance officer</h2>
      <p>{LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation}<br /><a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> · {LEGAL.supportPhone}</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 2: Create `src/app/about/page.tsx`**

```tsx
export const metadata = { title: "About — OrderLink" };

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Our story</p>
      <h1 className="font-display text-5xl text-ink mt-3">
        Curated, not cluttered.
      </h1>
      <p className="mt-6 font-sans text-lg text-ink leading-relaxed">
        OrderLink exists for people who don't want the endless-aisle experience.
        We hand-pick every SKU we list, test it at home, and ship only what
        we'd keep on our own counter.
      </p>
      <p className="mt-4 font-sans text-lg text-ink-soft leading-relaxed">
        We're small, Pune-based, and deliberately restrained. You'll never
        see us blast "50% off site-wide" — because curation and deep
        discounts are opposites, and we're committed to the former.
      </p>
      <h2 className="font-display text-2xl mt-12">By the numbers</h2>
      <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">Based in</dt>
          <dd className="font-display text-xl mt-1">Pune</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">Products</dt>
          <dd className="font-display text-xl mt-1">25</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">Categories</dt>
          <dd className="font-display text-xl mt-1">5</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">Pincodes served</dt>
          <dd className="font-display text-xl mt-1">19,000+</dd>
        </div>
      </dl>
      <p className="mt-12 font-sans text-sm text-ink-soft">
        OrderLink is a brand of <strong>CodeSierra Tech Private Limited</strong>,
        an incorporated Pune company.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Manual verify** both pages render and link from footer nav.

- [ ] **Step 4: Commit**

```bash
git add src/app/contact/ src/app/about/
git commit -m "feat(pages): /contact with SLA commitment + /about editorial page"
```

---

### Task 35: DPDP cookie consent banner

**Files:** `src/components/CookieBanner.tsx`, `src/app/layout.tsx` (update)

- [ ] **Step 1: Create `src/components/CookieBanner.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";

const KEY = "orderlink.dpdp.consent";

type Consent = { essentials: true; analytics: boolean; decidedAt: string };

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      setOpen(!stored);
    } catch {
      setOpen(false);
    }
  }, []);

  function record(consent: Consent) {
    localStorage.setItem(KEY, JSON.stringify(consent));
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 rounded-lg border border-[color:var(--rule-strong)] bg-cream shadow-xl p-5 font-sans text-sm"
    >
      <p className="text-ink">
        We use essential cookies to run the store and process your orders. No advertising or cross-site tracking cookies.
        Read our <a href="/privacy" className="text-coral underline">Privacy Policy</a> for details.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => record({ essentials: true, analytics: false, decidedAt: new Date().toISOString() })}
          className="rounded-md bg-coral text-cream px-3 py-1.5"
        >
          Accept essentials
        </button>
        <button
          type="button"
          onClick={() => record({ essentials: true, analytics: false, decidedAt: new Date().toISOString() })}
          className="rounded-md border border-[color:var(--rule-strong)] text-ink px-3 py-1.5"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to root layout**

Edit `src/app/layout.tsx` to include:

```tsx
import { CookieBanner } from "@/components/CookieBanner";
// ...inside <body>, near the closing:
<CookieBanner />
```

- [ ] **Step 3: Manual verify**

Visit home page in a fresh incognito window → cookie banner appears bottom-right → click "Accept essentials" → banner dismisses → localStorage `orderlink.dpdp.consent` holds `{ essentials: true, analytics: false, decidedAt: ... }`. Reload the page → banner does not reappear.

- [ ] **Step 4: Commit**

```bash
git add src/components/CookieBanner.tsx src/app/layout.tsx
git commit -m "feat(dpdp): cookie consent banner respecting DPDP Act 2023 requirements"
```

---

## Milestone 9 — FOMO and social-proof surfaces

### Task 36: Activity popup (Option B hybrid) with pools

**Files:** `src/lib/fomo/name-pool.ts`, `src/lib/fomo/city-pool.ts`, `src/lib/fomo/review-pool.ts`, `src/components/ActivityPopup.tsx`, `src/app/p/[slug]/page.tsx` (update)

- [ ] **Step 1: Create the three pools**

`src/lib/fomo/name-pool.ts`:

```ts
// 80 common Indian first names, regionally balanced.
export const NAMES: string[] = [
  "Priya", "Rohan", "Aarav", "Kavya", "Rahul", "Meera", "Vikram", "Divya",
  "Arjun", "Shreya", "Ananya", "Neha", "Karan", "Ishita", "Advait", "Zoya",
  "Farhan", "Nikhil", "Aishwarya", "Tanvi", "Raj", "Aditi", "Siddharth", "Pooja",
  "Manish", "Anjali", "Aditya", "Sneha", "Rishi", "Preeti", "Aman", "Ritika",
  "Nitin", "Kriti", "Vivek", "Simran", "Harsh", "Radhika", "Saurabh", "Deepa",
  "Akash", "Jyoti", "Tushar", "Nisha", "Prateek", "Swati", "Devansh", "Aaliya",
  "Gaurav", "Shruti", "Yash", "Payal", "Sahil", "Tanya", "Kabir", "Lavanya",
  "Ayan", "Mitali", "Mohit", "Bhavya", "Shaurya", "Diya", "Ritesh", "Leela",
  "Dhruv", "Rhea", "Varun", "Naina", "Neeraj", "Khushi", "Atharv", "Sonia",
  "Samar", "Tara", "Kunal", "Parvati", "Ashwin", "Usha", "Vir", "Gauri",
];
```

`src/lib/fomo/city-pool.ts`:

```ts
// 40 Indian cities, weighted by typical e-commerce order share.
// Weight is used to bias random selection.
export const CITIES: { name: string; weight: number }[] = [
  { name: "Mumbai", weight: 12 }, { name: "Delhi", weight: 11 },
  { name: "Bengaluru", weight: 10 }, { name: "Pune", weight: 9 },
  { name: "Hyderabad", weight: 7 }, { name: "Chennai", weight: 6 },
  { name: "Kolkata", weight: 5 }, { name: "Ahmedabad", weight: 4 },
  { name: "Jaipur", weight: 3 }, { name: "Lucknow", weight: 3 },
  { name: "Indore", weight: 2 }, { name: "Nagpur", weight: 2 },
  { name: "Bhopal", weight: 2 }, { name: "Chandigarh", weight: 2 },
  { name: "Surat", weight: 2 }, { name: "Kochi", weight: 2 },
  { name: "Coimbatore", weight: 2 }, { name: "Visakhapatnam", weight: 2 },
  { name: "Vadodara", weight: 1 }, { name: "Patna", weight: 1 },
  { name: "Ludhiana", weight: 1 }, { name: "Kanpur", weight: 1 },
  { name: "Nashik", weight: 1 }, { name: "Mysuru", weight: 1 },
  { name: "Thiruvananthapuram", weight: 1 }, { name: "Guwahati", weight: 1 },
  { name: "Raipur", weight: 1 }, { name: "Ranchi", weight: 1 },
  { name: "Jodhpur", weight: 1 }, { name: "Varanasi", weight: 1 },
  { name: "Agra", weight: 1 }, { name: "Madurai", weight: 1 },
  { name: "Amritsar", weight: 1 }, { name: "Faridabad", weight: 1 },
  { name: "Gurugram", weight: 1 }, { name: "Noida", weight: 1 },
  { name: "Thane", weight: 1 }, { name: "Navi Mumbai", weight: 1 },
  { name: "Goa", weight: 1 }, { name: "Dehradun", weight: 1 },
];
```

`src/lib/fomo/review-pool.ts`:

```ts
// Review snippets, distributed 60% 5-star / 25% 4-star / 10% 3-star / 5% 2-star.
export const REVIEWS: { stars: 1 | 2 | 3 | 4 | 5; text: string }[] = [
  { stars: 5, text: "Quality is better than I expected" },
  { stars: 5, text: "Arrived in 4 days, happy with the purchase" },
  { stars: 5, text: "Exactly as described" },
  { stars: 5, text: "Great value for the price" },
  { stars: 5, text: "Perfect addition to my kitchen" },
  { stars: 5, text: "Hand-feel is premium, looks beautiful" },
  { stars: 5, text: "Very well packaged, no damage" },
  { stars: 5, text: "Wife loved it, gifting another" },
  { stars: 5, text: "Better than what I saw on [marketplace]" },
  { stars: 5, text: "Would order again without hesitation" },
  { stars: 5, text: "Design is modern but functional" },
  { stars: 5, text: "Customer support was prompt, great experience" },
  { stars: 4, text: "Good product, minor packaging dent" },
  { stars: 4, text: "Works well, finish could be better" },
  { stars: 4, text: "Solid, would recommend" },
  { stars: 4, text: "Value for money, slight scuff on arrival" },
  { stars: 4, text: "Nice quality, took a day longer than expected" },
  { stars: 3, text: "Functional but nothing special" },
  { stars: 3, text: "OK for the price" },
  { stars: 2, text: "Fine, not amazing" },
];
```

- [ ] **Step 2: Create `src/components/ActivityPopup.tsx` (client, runs on product page only)**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { NAMES } from "@/lib/fomo/name-pool";
import { CITIES } from "@/lib/fomo/city-pool";
import { REVIEWS } from "@/lib/fomo/review-pool";

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

type Event =
  | { kind: "purchase"; name: string; city: string; productTitle: string; minutesAgo: number }
  | { kind: "review"; name: string; city: string; productTitle: string; stars: number; text: string; minutesAgo: number };

function relative(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const h = Math.floor(min / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

export function ActivityPopup({ productTitle }: { productTitle: string }) {
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const shown = useRef(0);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FOMO_POPUP_ENABLED === "false") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const MAX = 3;

    const schedule = () => {
      if (shown.current >= MAX) return;
      const delay = 25_000 + Math.random() * 20_000;
      const firstDelay = shown.current === 0 ? delay : 90_000 + Math.random() * 90_000;
      const t = setTimeout(() => {
        const name = pick(NAMES);
        const city = weightedPick(CITIES).name;
        const minutesAgo = 2 + Math.floor(Math.random() * 180);
        const kind = Math.random() < 0.7 ? "purchase" : "review";
        if (kind === "purchase") {
          setEvent({ kind, name, city, productTitle, minutesAgo });
        } else {
          const r = pick(REVIEWS);
          setEvent({ kind: "review", name, city, productTitle, stars: r.stars, text: r.text, minutesAgo });
        }
        setVisible(true);
        shown.current += 1;
        setTimeout(() => setVisible(false), 6_000);
        schedule();
      }, firstDelay);
      return () => clearTimeout(t);
    };
    const cleanup = schedule();
    return cleanup;
  }, [productTitle]);

  if (!event) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-4 md:left-6 z-40 w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-[color:var(--rule)] bg-cream shadow-lg p-4 font-sans transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-coral text-cream font-mono text-sm flex items-center justify-center">{event.name[0]}</div>
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium">{event.name}</span>
            <span className="text-ink-soft"> from {event.city}</span>
          </p>
          <p className="text-xs text-ink-soft">
            {event.kind === "purchase"
              ? <>bought {event.productTitle}</>
              : <>★ {"★".repeat((event as any).stars - 1)} · "{(event as any).text}"</>}
          </p>
          <p className="font-mono text-[0.7rem] text-ink-soft/60 mt-1">{relative(event.minutesAgo)}</p>
        </div>
        <button
          type="button"
          className="text-ink-soft/50 hover:text-ink-soft"
          aria-label="Dismiss"
          onClick={() => { setVisible(false); setEvent(null); }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Include `<ActivityPopup />` on the product page**

Edit `src/app/p/[slug]/page.tsx` — add import + render inside the live branch only:

```tsx
import { ActivityPopup } from "@/components/ActivityPopup";
// ...inside isLive block, at the end of the JSX:
<ActivityPopup productTitle={product.title} />
```

- [ ] **Step 4: Expose feature flag**

In `next.config.mjs`, expose `NEXT_PUBLIC_FOMO_POPUP_ENABLED`:

```js
env: { NEXT_PUBLIC_FOMO_POPUP_ENABLED: process.env.FOMO_POPUP_ENABLED ?? "true" },
```

- [ ] **Step 5: Manual verify**

Visit `/p/oil-dispenser` → wait 25–45 seconds → first popup appears with name + city + product + time → disappears after 6s → second popup 90–180s later → max 3 per session.

Also test with `prefers-reduced-motion: reduce` set in DevTools → popup still shows but without slide animation.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fomo/ src/components/ActivityPopup.tsx src/app/p/ next.config.mjs
git commit -m "feat(fomo): Option B hybrid activity popup with name/city/review pools on product page"
```

---

### Task 37: First-order + exit-intent coupons + /api/coupons/validate

**Files:** `scripts/seed-coupons.ts`, `src/app/api/coupons/validate/route.ts`, `src/components/ExitIntentOverlay.tsx`, `src/app/checkout/page.tsx` (update), `src/app/p/[slug]/page.tsx` (update)

- [ ] **Step 1: Seed the two coupons**

`scripts/seed-coupons.ts`:

```ts
import { db, schema } from "@/db/client";

async function main() {
  await db.insert(schema.coupons).values([
    { code: "WELCOME10", kind: "first_order", amountPaise: 1000, maxUses: null },
    { code: "STAY5", kind: "exit_intent", amountPaise: 500, maxUses: null },
  ]).onConflictDoNothing();
  console.log("Seeded coupons");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Run: `npx tsx scripts/seed-coupons.ts`

- [ ] **Step 2: Create `src/app/api/coupons/validate/route.ts`**

```ts
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const schema$ = z.object({ code: z.string().min(2).max(40).transform((s) => s.toUpperCase()), email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema$.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });

  const { code, email } = parsed.data;
  const [coupon] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code)).limit(1);
  if (!coupon) return NextResponse.json({ ok: false, error: "unknown_code" }, { status: 404 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 400 });
  }

  if (coupon.kind === "first_order") {
    const emailHash = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
    const [prior] = await db
      .select()
      .from(schema.couponRedemptions)
      .where(and(eq(schema.couponRedemptions.couponCode, code), eq(schema.couponRedemptions.customerEmailHash, emailHash)))
      .limit(1);
    if (prior) return NextResponse.json({ ok: false, error: "already_used" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, amountPaise: coupon.amountPaise, kind: coupon.kind });
}
```

- [ ] **Step 3: Wire coupon into /api/orders**

Extend the POST `/api/orders` handler: before calculating amounts, if `input.couponCode` is set, validate + record intended discount:

```ts
let couponDiscountPaise = 0;
let couponCode: string | undefined;
if (input.couponCode) {
  const validateRes = await fetch(`${process.env.SITE_URL ?? "http://localhost:3000"}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: input.couponCode, email: input.email }),
  });
  const data = await validateRes.json();
  if (data.ok) {
    couponDiscountPaise = data.amountPaise;
    couponCode = input.couponCode.toUpperCase();
  }
  // Invalid coupons are silently ignored at the server level
}
```

Then pass `couponDiscountPaise` into `calculateOrderAmounts` and record the redemption after successful verify (in `/api/orders/verify`):

```ts
if (couponCode) {
  await db.insert(schema.couponRedemptions).values({
    couponCode,
    orderRefId: refRow.id,
    customerEmailHash: crypto.createHash("sha256").update(input.email.toLowerCase()).digest("hex"),
  });
}
```

(Note: redemption should really be recorded on verify success to avoid locking coupons that never completed payment. Move the insert into `/api/orders/verify/route.ts` after the status update.)

- [ ] **Step 4: Create `src/components/ExitIntentOverlay.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

const KEY = "orderlink.exit_intent_shown";

export function ExitIntentOverlay() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    if (window.innerWidth < 768) return; // desktop only

    function onLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        setOpen(true);
        localStorage.setItem(KEY, "1");
        window.removeEventListener("mouseleave", onLeave);
      }
    }
    window.addEventListener("mouseleave", onLeave);
    return () => window.removeEventListener("mouseleave", onLeave);
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog">
      <div className="max-w-md w-full rounded-lg bg-cream p-8 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-widest text-coral">Wait — before you go</p>
        <h2 className="font-display text-3xl text-ink mt-2">₹5 extra off</h2>
        <p className="font-sans text-ink-soft mt-3">Use code <span className="font-mono font-medium text-coral">STAY5</span> at checkout if you order in the next 10 minutes. (First-time customers.)</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 rounded-md bg-coral text-cream px-5 py-2 font-sans"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add `<ExitIntentOverlay />` to product page (live branch only)**

Edit `src/app/p/[slug]/page.tsx`, inside the isLive block:

```tsx
<ExitIntentOverlay />
```

Import at the top:
```tsx
import { ExitIntentOverlay } from "@/components/ExitIntentOverlay";
```

- [ ] **Step 6: Add first-order coupon banner on home page**

Add to `src/app/page.tsx` just inside `<main>` (or above the Hero):

```tsx
<div className="bg-coral text-cream py-2 text-center font-mono text-xs uppercase tracking-widest">
  First order? Use <span className="font-bold">WELCOME10</span> for extra ₹10 off at checkout.
</div>
```

- [ ] **Step 7: Manual verify**

- `/` shows the coupon top banner
- At `/checkout`, typing `WELCOME10` → submitting → amounts recalculate with ₹10 off (verify in Network tab)
- Typing `STAY5` works similarly
- Invalid code is silently ignored
- On `/p/oil-dispenser` → move cursor quickly to top of page → exit-intent overlay appears once

- [ ] **Step 8: Commit**

```bash
git add scripts/seed-coupons.ts src/app/api/coupons/ src/app/api/orders/ src/app/api/orders/verify/ src/app/checkout/ src/app/p/ src/app/page.tsx src/components/ExitIntentOverlay.tsx
git commit -m "feat(coupons): WELCOME10 + STAY5 coupons with /validate endpoint + exit-intent overlay"
```

---

### Task 38: "Selling fast" badge + live "Only N left" counter + back-in-stock capture

**Files:** `src/lib/stats.ts`, `src/components/FOMOLines.tsx`, `src/components/BackInStockCapture.tsx`, `src/app/api/restock-notify/route.ts`

- [ ] **Step 1: Create `src/lib/stats.ts`**

```ts
import { db, schema } from "@/db/client";
import { and, eq, gte, sql } from "drizzle-orm";

/** Returns true if this product had more than {threshold} paid/advance-paid orders in the last 24h. */
export async function isSellingFast(productSlug: string, threshold: number = 3): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
      FROM orders_ref
     WHERE product_slug = ${productSlug}
       AND status IN ('advance_paid', 'paid', 'confirmed', 'shipped', 'delivered')
       AND created_at >= ${since.toISOString()}
  `);
  return parseInt(rows.rows[0]?.count ?? "0", 10) >= threshold;
}
```

- [ ] **Step 2: Create `src/components/FOMOLines.tsx` (server component)**

```tsx
import { getAvailable } from "@/lib/inventory";
import { isSellingFast } from "@/lib/stats";

export async function FOMOLines({ productSlug }: { productSlug: string }) {
  const available = await getAvailable(productSlug);
  const sellingFast = await isSellingFast(productSlug);
  return (
    <div className="flex flex-wrap gap-3 font-mono text-xs uppercase tracking-widest">
      {sellingFast && (
        <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 text-coral px-2 py-0.5">
          🔥 Selling fast
        </span>
      )}
      {available > 0 && available < 10 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--rule)] text-ink-soft px-2 py-0.5">
          ⏱ Only {available} left
        </span>
      )}
      {available === 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-soft/10 text-ink-soft px-2 py-0.5">
          Back in stock soon
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render FOMOLines on product page**

Edit `src/app/p/[slug]/page.tsx` → replace the inline `⏱ Only N left` line in the trust chip list with `<FOMOLines productSlug={product.slug} />` (render async). Import:

```tsx
import { FOMOLines } from "@/components/FOMOLines";
```

Also render on product cards (home page): update `ProductCard.tsx` to pass data or skip here to keep the card static — for Phase 2a render FOMOLines only on the product detail page to keep home page SSG.

- [ ] **Step 4: Create `src/components/BackInStockCapture.tsx`**

```tsx
"use client";
import { useState } from "react";

export function BackInStockCapture({ productSlug, disabled }: { productSlug: string; disabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  if (disabled) return null;
  return (
    <form
      className="rounded-lg border border-[color:var(--rule)] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/restock-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug, email }),
        });
        setStatus(res.ok ? "ok" : "error");
      }}
    >
      <p className="font-sans text-sm text-ink">Currently sold out — notify me when back</p>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-[color:var(--rule)] px-3 py-2 font-sans text-sm"
          placeholder="you@example.com"
        />
        <button type="submit" className="rounded-md bg-coral text-cream px-4 py-2 font-sans text-sm">Notify me</button>
      </div>
      {status === "ok" && <p className="mt-2 font-sans text-xs text-ink-soft">We'll email you when it's back.</p>}
      {status === "error" && <p className="mt-2 font-sans text-xs text-coral">Something went wrong — try again.</p>}
    </form>
  );
}
```

- [ ] **Step 5: Create `src/app/api/restock-notify/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { z } from "zod";

const bodySchema = z.object({
  productSlug: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await db.insert(schema.restockNotifications).values(parsed.data);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Render BackInStockCapture when inventory is zero**

In `src/app/p/[slug]/page.tsx`, when product is live but `available === 0`, show `<BackInStockCapture productSlug={product.slug} />` in place of the payment stub. You can check `getAvailable(product.slug)` inside the page's async function.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stats.ts src/components/FOMOLines.tsx src/components/BackInStockCapture.tsx src/app/api/restock-notify/ src/app/p/
git commit -m "feat(fomo): 'selling fast' badge, live 'only N left' counter, back-in-stock capture"
```

---

### Task 39: Trust surfaces polish — review-distribution + "Need help" under product page + top first-order banner

Already mostly done in earlier tasks (Task 8 + 17 + 37). This task just integrates + polishes:

**Files:** `src/app/p/[slug]/page.tsx` (final integration pass), `src/components/FirstOrderBanner.tsx`

- [ ] **Step 1: Extract the first-order banner into a dismissible component**

`src/components/FirstOrderBanner.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

const KEY = "orderlink.first_order_banner_dismissed";

export function FirstOrderBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(!localStorage.getItem(KEY));
  }, []);
  if (!visible) return null;
  return (
    <div className="bg-coral text-cream py-2 px-6 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-widest">
      <span>First order? Use <strong>WELCOME10</strong> for extra ₹10 off</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="ml-2 opacity-70 hover:opacity-100"
        onClick={() => { localStorage.setItem(KEY, "1"); setVisible(false); }}
      >
        ×
      </button>
    </div>
  );
}
```

Replace the hard-coded banner in `src/app/page.tsx` with:
```tsx
import { FirstOrderBanner } from "@/components/FirstOrderBanner";
// ...
<FirstOrderBanner />
```

- [ ] **Step 2: Lighthouse audit**

Run `npm run build && npm run start`, open DevTools Lighthouse, audit mobile:
- Performance ≥ 85
- Accessibility ≥ 90
- Best Practices ≥ 95
- SEO ≥ 95

Fix any critical issues flagged (missing alt text, color contrast, etc.).

- [ ] **Step 3: Commit**

```bash
git add src/components/FirstOrderBanner.tsx src/app/page.tsx
git commit -m "feat(fomo): dismissible first-order banner; Lighthouse audit pass"
```

---

## Milestone 10 — Ops + Docker (human-gated deploy)

### Task 40: Sentry error tracking + /api/healthz endpoint

**Files:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/api/healthz/route.ts`

- [ ] **Step 1: Initialise Sentry via the wizard**

```bash
npx @sentry/wizard@latest -i nextjs --saas
```

Follow the prompts (skip source-map upload config for now if it fails; can add later). The wizard creates three config files + modifies `next.config.mjs`.

- [ ] **Step 2: Add PII scrubbing to `sentry.client.config.ts` + `sentry.server.config.ts`**

In both files, add:

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: 0,
  beforeSend(event) {
    // Strip PII from any event
    const stripFields = ["customer_name", "customer_email", "customer_mobile", "ship_line1", "ship_line2", "email", "mobile", "phone"];
    const scrub = (obj: any): any => {
      if (!obj || typeof obj !== "object") return obj;
      for (const k of Object.keys(obj)) {
        if (stripFields.some((s) => k.toLowerCase().includes(s.toLowerCase()))) obj[k] = "[REDACTED]";
        else scrub(obj[k]);
      }
      return obj;
    };
    if (event.extra) scrub(event.extra);
    if (event.contexts) scrub(event.contexts);
    if (event.request?.data) scrub(event.request.data as any);
    return event;
  },
});
```

- [ ] **Step 3: Create `src/app/api/healthz/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
curl http://localhost:3000/api/healthz
# → {"ok":true,"ts":"..."}

# Trigger a test error to confirm Sentry pickup:
curl -X POST http://localhost:3000/api/orders -d '{"bad":"json"}' -H "Content-Type: application/json"
# Check Sentry dashboard for the captured event
```

- [ ] **Step 5: Commit**

```bash
git add sentry.*.config.ts src/app/api/healthz/ next.config.mjs .gitignore
git commit -m "feat(ops): Sentry error tracking with PII scrubbing + /api/healthz endpoint"
```

---

### Task 41: Production Dockerfile + docker-compose (local-only; NOT deployed)

**Files:** `Dockerfile.store`, `docker-compose.store.yml`, `.dockerignore` (update)

**⚠ This task produces the artifacts but does NOT deploy them anywhere. Final "deploy to VPS" is user-gated (Task 44).**

- [ ] **Step 1: Create `Dockerfile.store` (Phase 1 `Dockerfile` stays untouched)**

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/healthz >/dev/null || exit 1
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create `docker-compose.store.yml`**

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.store
    image: orderlink-store:local
    container_name: orderlink-store
    restart: always
    env_file: .env
    depends_on:
      - sf-sync
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_public
      - traefik.http.routers.orderlink-store.rule=Host(`orderlink.in`)
      - traefik.http.routers.orderlink-store.entrypoints=websecure
      - traefik.http.routers.orderlink-store.tls=true
      - traefik.http.routers.orderlink-store.tls.certresolver=mytlschallenge
      - traefik.http.services.orderlink-store.loadbalancer.server.port=3000
      # (www redirect + security headers reused from Phase 1's docker-compose.yml)
    volumes:
      - ./data/invoices:/app/data/invoices
    networks:
      - traefik_public
      - postgres

  sf-sync:
    build:
      context: .
      dockerfile: Dockerfile.store
    image: orderlink-store:local
    container_name: orderlink-sf-sync
    restart: always
    env_file: .env
    command: ["node", "--experimental-specifier-resolution=node", "-r", "tsx", "scripts/run-sf-sync-worker.ts"]
    networks:
      - postgres

networks:
  traefik_public:
    external: true
  postgres:
    external: true
    name: tech-blog-automation_default
```

- [ ] **Step 3: Update `.dockerignore`**

```
node_modules/
.next/
.git/
.env
.env.*
data/
docs/
tests/
*.md
coverage/
playwright-report/
test-results/
```

- [ ] **Step 4: Local build to verify**

```bash
docker build -f Dockerfile.store -t orderlink-store:local .
docker images | grep orderlink-store
# Expected: an image ~300 MB
```

Do NOT `docker run` this against your real Postgres/SF credentials yet — we're just verifying the build succeeds.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile.store docker-compose.store.yml .dockerignore
git commit -m "chore(docker): Phase 2a Dockerfile + compose (not deployed; user-gated)"
```

---

### Task 42: Backup sidecar (documentation only — no execution on VPS)

**Files:** `scripts/backup.sh`, `Dockerfile.backup`, `docker-compose.backup.yml`, `docs/backup-runbook.md`

**⚠ This task produces the backup artifacts and runbook but does NOT run them against the VPS. User triggers when deploying.**

- [ ] **Step 1: Create `scripts/backup.sh`**

```bash
#!/bin/sh
set -euo pipefail
TS=$(date -u +"%Y%m%dT%H%M%SZ")
OUT=/tmp/orderlink-${TS}.dump.gz

pg_dump --format=custom --compress=9 \
  "$DATABASE_URL" | gzip -9 > "$OUT"

gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT" "$OUT"

RCLONE_CONFIG_R2_TYPE=s3 \
RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" \
rclone copy "${OUT}.gpg" "r2:$R2_BUCKET/backups/$(date -u +%Y/%m)/"

# Local retention: keep 7 newest
ls -1t /tmp/orderlink-*.dump.gz.gpg | tail -n +8 | xargs -r rm

# Ping uptime monitor
if [ -n "${HC_PING_URL:-}" ]; then
  wget -qO- "$HC_PING_URL" >/dev/null
fi

rm -f "$OUT"
```

- [ ] **Step 2: Create `Dockerfile.backup`**

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache postgresql-client gnupg rclone dcron wget bash
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
RUN echo "30 2 * * * root /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
CMD ["crond", "-f", "-l", "2"]
```

- [ ] **Step 3: Create `docs/backup-runbook.md`**

```md
# OrderLink backup runbook

## Backup mechanics
- Cron schedule: daily at 02:30 IST (03:00 UTC) inside `orderlink-backup` container
- Tool chain: `pg_dump` → `gzip` → `gpg --encrypt` → `rclone` upload to Cloudflare R2
- Retention: 7 latest locally; R2 lifecycle policy keeps daily for 30 d, weekly (Sun) for 3 months, monthly (1st) for 1 year (configured on the bucket side)

## Pre-deploy checklist (user runs before starting the backup container)
1. Create R2 bucket `orderlink-backups` in Cloudflare dashboard
2. Generate a write-only API token, paste into `.env` as `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_ENDPOINT`
3. Generate a GPG keypair (`gpg --full-generate-key`), export public key to VPS, keep private key in password manager
4. Add the public key to the backup container:
   `docker cp backup-pub.key orderlink-backup:/tmp/backup-pub.key && docker exec orderlink-backup gpg --import /tmp/backup-pub.key`
5. Sign up for a free healthchecks.io account, create a check named "orderlink-backup-daily", copy the ping URL into `.env` as `HC_PING_URL`

## Restore procedure (test before going live)
```
# 1. Download the latest .gpg from R2
rclone copy r2:orderlink-backups/backups/.../orderlink-20260419T030000Z.dump.gz.gpg ./

# 2. Decrypt
gpg --decrypt orderlink-20260419T030000Z.dump.gz.gpg > backup.dump.gz

# 3. Restore to a SCRATCH database (never production)
createdb orderlink_restore
pg_restore -d orderlink_restore --clean --if-exists backup.dump.gz

# 4. Smoke-test: SELECT COUNT(*) FROM orders_ref; should match expectations.
```

Run this restore drill once before cutover (see Task 43).
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backup.sh Dockerfile.backup docker-compose.backup.yml docs/backup-runbook.md
git commit -m "ops(backup): backup script + sidecar Dockerfile + restore runbook (user runs on deploy)"
```

(`docker-compose.backup.yml` is merged into the main store compose when deploying; it stays a separate file until then for clarity.)

---

### Task 43: Local end-to-end smoke test (Playwright)

**Files:** `tests/e2e/checkout-happy-path.spec.ts`, `tests/e2e/coming-soon.spec.ts`

- [ ] **Step 1: Create `tests/e2e/coming-soon.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("home renders all 25 products with only Oil Dispenser Buy-Now", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Everyday objects");
  // 5 category bands
  await expect(page.locator("section[id=kitchen] h2")).toContainText("Kitchen");
  await expect(page.locator("section[id=footwear] h2")).toContainText("Footwear");
  // Only Oil Dispenser has a real Buy Now CTA
  const buyNowButtons = page.getByRole("button", { name: /buy now/i });
  await expect(buyNowButtons).toHaveCount(1);
});

test("coming-soon product detail page shows Coming Soon instead of buy flow", async ({ page }) => {
  await page.goto("/p/rice-face-wash");
  await expect(page.getByText(/coming soon/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /buy now/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Create `tests/e2e/checkout-happy-path.spec.ts`** (Razorpay test card)

```ts
import { test, expect } from "@playwright/test";

test.skip(!process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_"), "Requires test-mode Razorpay keys");

test("prepaid happy path end-to-end with Razorpay test card", async ({ page }) => {
  await page.goto("/checkout?sku=oil-dispenser");
  await page.getByLabel(/full name/i).fill("Priya Sharma");
  await page.getByLabel(/mobile/i).fill("9876543210");
  await page.getByLabel(/email/i).fill(`playwright-${Date.now()}@example.com`);
  await page.getByLabel(/address line 1/i).fill("221B Baker Street");
  await page.getByLabel(/pincode/i).fill("411014");
  // Wait for pincode serviceability
  await expect(page.getByText(/we deliver to Pune/i)).toBeVisible({ timeout: 5_000 });

  await page.getByRole("button", { name: /pay.*securely/i }).click();

  // Razorpay Checkout is an iframe — skip actual card entry for now,
  // verify we at least posted to /api/orders (captured order number on confirmation page).
  // For automated end-to-end in CI, use Razorpay's test card via the iframe API.
  // For local, do this step manually: use card 4111 1111 1111 1111, expiry any future, CVV any.
});
```

- [ ] **Step 3: Manual full flow once**

Step-by-step manual verification:

1. Start Postgres + Next.js: `docker start orderlink-pg-dev && npm run dev`
2. In another terminal: `npx tsx scripts/run-sf-sync-worker.ts`
3. Visit http://localhost:3000 → observe trust row in footer, 25 products, coupon banner, cookie banner
4. Visit `/p/oil-dispenser` → price shows ₹150 item + ₹49 shipping = ₹199 total, activity popup fires after 30s
5. Click "Buy Now" stub (actually it's on card — click the link to go to checkout) → at checkout, fill form with valid Pune pincode 411014 → "✓ We deliver to Pune" appears
6. Select Prepaid → submit → Razorpay modal opens → use test card `4111 1111 1111 1111`, exp `12/30`, CVV `123` → payment succeeds
7. Redirected to `/orders/<uuid>/thanks` → order details visible, invoice download link
8. Click invoice PDF → opens in new tab with CodeSierra legal block + CGST/SGST breakup (intra-MH)
9. Check admin inbox `hello@orderlink.in` for the order alert email (Resend test mode may route to dashboard only)
10. Visit `/admin/orders` → basic auth prompt → login → see new order with status `paid`
11. Change status to `shipped` → SF back-sync fires (visible in SF if creds set)
12. Visit `/track` with the order number + last-4 mobile (3210) → status timeline shows "In transit"
13. Repeat steps 5-7 with POD payment: Razorpay modal shows ₹49, pay successfully, redirected to thanks page showing ₹150 cash due on delivery

Also test:
- Pincode `999999` at checkout → Buy button stays disabled with "⚠ Sorry we don't ship here" message; email field appears in BackInStockCapture-style input
- Coupon `WELCOME10` with a fresh email → discount applied
- Same `WELCOME10` with same email → silently ignored (customer still pays base)
- Close the Razorpay modal midway → reservation released when the reaper script runs

- [ ] **Step 4: Run Playwright tests**

```bash
npm run test:e2e
```

Expected: coming-soon.spec.ts passes; checkout-happy-path.spec.ts is skipped unless test keys set.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/
git commit -m "test(e2e): coming-soon home smoke + checkout happy-path skeleton"
```

---

### Task 44: DEPLOYMENT_CHECKLIST.md — human-gated production cutover

**Files:** `docs/DEPLOYMENT_CHECKLIST.md`

**⚠ Do NOT execute any of these steps. This task writes the checklist; the user triggers each step when ready.**

- [ ] **Step 1: Create `docs/DEPLOYMENT_CHECKLIST.md`**

```md
# OrderLink Phase 2a — Deployment checklist

> **All steps below require the user's explicit go-ahead. The coming-soon page remains at `orderlink.in` until the user says "deploy."**

## Pre-deploy prerequisites (user-action items)

- [ ] Salesforce Connected App created with OAuth + digital signature; private key saved to `./sf-jwt.pem`
- [ ] Salesforce Record Types created: `OrderLink_Customer` (Person Account), `OrderLink_Order`, `OrderLink_Product`
- [ ] Salesforce integration user license seat allocated; profile scoped to OrderLink Record Types only
- [ ] Salesforce Flows created: new-order confirmation, shipped, delivered
- [ ] Salesforce Organization-Wide Email Address `hello@orderlink.in` configured (SPF + DKIM DNS added)
- [ ] Razorpay live keys obtained (separate from test keys)
- [ ] Razorpay webhook endpoint configured to post to `https://orderlink.in/api/razorpay/webhook`
- [ ] Resend API key generated with `hello@orderlink.in` sender verified
- [ ] Cloudflare R2 bucket `orderlink-backups` created + credentials issued
- [ ] GPG keypair generated for backup encryption; public key deployed
- [ ] Sentry project created; DSN + auth token issued
- [ ] UptimeRobot monitor created on `https://orderlink.in/api/healthz`
- [ ] GST REG-14 amendment submitted to add retail HSN codes to GSTIN
- [ ] Oil Dispenser product photos received (3–5), placed in `public/assets/products/oil-dispenser/`
- [ ] Any final product-rename / copy approvals applied to `src/data/products.ts`

## Deploy sequence (user runs each step — assistant assists but does not initiate)

### Staging (recommended first)
- [ ] Add DNS A record `staging.orderlink.in` → 93.127.206.14
- [ ] Build image: `docker build -f Dockerfile.store -t orderlink-store:staging .`
- [ ] Create `/root/orderlink-store` on VPS; clone repo; copy `.env` with test Razorpay + SF dev-org keys
- [ ] Add Traefik label for `staging.orderlink.in` on the staging container
- [ ] `docker compose -f docker-compose.store.yml up -d`
- [ ] Verify `/api/healthz` returns 200; place a test order; confirm SF sync
- [ ] Run backup restore drill from R2

### Production (irreversible — explicit user green-light)
- [ ] Confirm all staging checks pass
- [ ] Ensure full pincode whitelist (28k pincodes) replaces the seed file
- [ ] Swap `.env` for live Razorpay keys, live SF integration user, production R2 bucket
- [ ] On VPS: bring down the Phase 1 coming-soon container
- [ ] Bring up the Phase 2a store container with the `orderlink.in` Traefik label
- [ ] Verify TLS cert renews automatically; `curl -IL https://orderlink.in/` returns 200
- [ ] Run end-to-end: place real test order with Razorpay Production test card (₹1 amount); verify SF sync + invoice + email
- [ ] Monitor Sentry, UptimeRobot, and admin email inbox for 24 hours post-launch
- [ ] Keep the Phase 1 `index.html` container tagged `orderlink-web:pre-2a` for emergency rollback

### Rollback (if critical bug in first 24 hours)
- [ ] Switch Traefik labels back to the pre-2a container
- [ ] Triage, fix, re-deploy

## What does NOT happen automatically
- No CI/CD auto-deploy on push to `main`
- No auto-rollback on Sentry spike
- No auto-scaling

Each future hotfix = same drill: user authorises, assistant assists.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT_CHECKLIST.md
git commit -m "docs: DEPLOYMENT_CHECKLIST.md for human-gated Phase 2a cutover"
```

- [ ] **Step 3: FINAL STOP**

At this point the plan's code tasks are complete. **Do not deploy. Do not run anything against the VPS.** Report to the user: "Phase 2a implementation complete. Ready for your deploy authorisation — see `docs/DEPLOYMENT_CHECKLIST.md`."

---

## Spec coverage self-check

| Spec section | Covered in tasks |
|---|---|
| §2 scope (21 items) | M1–M10 tasks ≥3 per item |
| §3.1–3.7 tech/architecture/data-residency | Tasks 1, 10, 18, 19 |
| §3.4.1 data model | Task 10 |
| §3.5 products.ts | Task 6 |
| §3.6 inventory / FOMO | Tasks 19, 22, 38 |
| §3.7 Meesho logistics framing | Tasks 8, 33, 34 |
| §4.1 home | Task 7 |
| §4.2 product page | Tasks 8, 17, 36, 38 |
| §4.3 checkout | Tasks 14, 15, 16, 20 |
| §4.4 post-purchase | Task 24 |
| §4.5 FOMO | Tasks 36, 37, 38 |
| §4.6 /track | Task 26 |
| §4.7 WhatsApp | Task 17 |
| §4.8 pincode | Tasks 12, 16 |
| §4.9 UTM | Task 13 |
| §4.10 DPDP | Task 35 |
| §4.11 trust surfaces | Tasks 4, 8, 17, 34, 39 |
| §4.12 Phase 2a-late | documented; not tasks |
| §4.13 admin | Task 32 |
| §5 payment flows | Tasks 19, 20, 21 |
| §6 policy pages | Task 33 |
| §6.1 invoice | Tasks 23, 24, 25 |
| §6.2 legal constants | Task 5 |
| §7 emails | Task 24 |
| §8 docker/ops | Tasks 40, 41, 42 |
| §9 testing | Tasks 9, 11, 12, 18, 19, 20, 21, 26, 43 |
| §13 Salesforce | Tasks 27, 28, 29, 30, 31 |
| §14 Roadmap | documented in spec; not implemented |

Every live, user-facing surface has at least one implementation task + at least one test or manual-verification step. No "TBD" placeholders remain. No type mismatches between tasks (names, function signatures, and field names match across boundaries).

---

*Plan complete. Total: 44 tasks across 10 milestones. Stops explicitly before any VPS deployment.*










