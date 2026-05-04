# OrderLink Affiliate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the OrderLink affiliate marketplace from scratch on `phase-2b-affiliate` (cut from `main`, fresh slate) per the design at [`.design-bundle/orderlink/project/`](.design-bundle/orderlink/project/) and the spec at [`docs/superpowers/specs/2026-05-02-orderlink-affiliate-pivot-design.md`](docs/superpowers/specs/2026-05-02-orderlink-affiliate-pivot-design.md).

**Architecture:** Next.js 15 App Router + React 19 + Tailwind v4. All catalog data is static TS imports (no DB). All pages prerender at build. Click-to-merchant goes through a dedicated `/go/[productId]/[merchantId]` route that shows a 4s interstitial then redirects to the merchant's affiliate URL. The `phase-2a-store` branch is preserved verbatim as the dropshipping backup.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5, Tailwind CSS v4, Vitest, @testing-library/react, Playwright, Sentry. Dropped from Phase 2a: drizzle-orm, postgres, jsforce, razorpay, @react-pdf/renderer.

**Branch state at plan start:** Currently on `phase-2b-affiliate`, cut from `main` at commit `9157709`. Repo root has only Phase 1 coming-soon static site (`index.html`, `nginx.conf`, `Dockerfile`, `docker-compose.yml`), the spec docs, and untracked `.design-bundle/`. There is no `src/`, no `package.json` for Next.js — this branch starts as a fresh tree.

**Reference files:**
- Design prototype: [`.design-bundle/orderlink/project/{OrderLink.html,app.jsx,pages.jsx,data.js}`](.design-bundle/orderlink/project/) (untracked, gitignored — do not commit)
- Phase 2a (backup branch) — view via `git show phase-2a-store:<path>`. Useful keepers: `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts`, `src/app/{icon.png,apple-icon.png,opengraph-image.tsx}`, `sentry.{client,edge,server}.config.ts`

**Deploy gate:** No VPS deploy as part of this plan. Push to GitHub freely; wait for explicit user authorisation before any VPS action. Done criteria for this plan stop at "production build passes locally".

**Conventions used in every task:**
- Each task ends in a single commit. Conventional Commits (`feat:`, `chore:`, `test:`, `docs:`, `refactor:`).
- Run `npm run typecheck` before each commit (≥M2 onward, once TS exists). If it fails, fix before committing.
- Reference design code by file + line range, e.g. `pages.jsx:329-503`. Open the prototype, port the visuals, **rewrite using Tailwind classes** — do not paste inline `style={{}}` blobs.
- All ₹ values are stored as plain JS `number` (rupees, not paise). Affiliate site is informational, not transactional — no GST math.

---

## Milestone overview

- **M1 — Scaffold (T1–T7):** archive Phase 1 coming-soon, init Next.js, port configs, set up theme tokens, fonts, and Sentry.
- **M2 — Data + lib (T8–T13):** categories, product schema, 12 seed products, format / search helpers, integrity tests.
- **M3 — Atoms (T14–T20):** Icon, CategoryGlyph, MerchantLogo, Stars, Price, Pill, Badge.
- **M4 — Layout chrome (T21–T25):** Header, WishlistHeart, Footer, root layout wiring, SearchBar.
- **M5 — Home page (T26–T31):** Hero, SectionHead, CategoryStrip, ProductCard, FeaturedHero, FeaturedGrid, `/` page.
- **M6 — Listing pages (T32–T35):** ListPage controls, `/shop`, `/shop/[category]`.
- **M7 — Product detail (T36–T44):** TrustStrip, CommissionNote, ProductGallery + ReelSlide, MerchantList, ProductTabs, ReviewSection, RelatedGrid, `/p/[slug]` page.
- **M8 — Redirect flow (T45–T47):** `/go/[productId]/[merchantId]` route, RedirectInterstitial, 404 + bad-URL handling.
- **M9 — Policy pages (T48–T49):** new PolicyPage layout, 7 policy pages.
- **M10 — SEO + assets (T50–T55):** opengraph-image, robots, sitemap, llms.txt, JSON-LD, image + reel migration scripts.
- **M11 — Verification (T56–T58):** typecheck/test/build/Lighthouse, push branch.

---

## M1 — Scaffold

### Task 1: Archive Phase 1 coming-soon and seed `.gitignore`

**Files:**
- Move: `index.html` → `legacy/coming-soon/index.html`
- Move: `nginx.conf` → `legacy/coming-soon/nginx.conf`
- Move: `Dockerfile` → `legacy/coming-soon/Dockerfile`
- Move: `docker-compose.yml` → `legacy/coming-soon/docker-compose.yml`
- Move: `robots.txt` → `legacy/coming-soon/robots.txt`
- Move: `sitemap.xml` → `legacy/coming-soon/sitemap.xml`
- Create: `.gitignore`
- Create: `legacy/coming-soon/README.md`

- [ ] **Step 1: Move Phase 1 static files to `legacy/coming-soon/`**

```bash
mkdir -p legacy/coming-soon
git mv index.html legacy/coming-soon/index.html
git mv nginx.conf legacy/coming-soon/nginx.conf
git mv Dockerfile legacy/coming-soon/Dockerfile
git mv docker-compose.yml legacy/coming-soon/docker-compose.yml
git mv robots.txt legacy/coming-soon/robots.txt
git mv sitemap.xml legacy/coming-soon/sitemap.xml
```

- [ ] **Step 2: Create `legacy/coming-soon/README.md`**

```markdown
# Phase 1 coming-soon (archived)

This is the static site that was deployed to orderlink.in on 2026-04-19 while the
real product was being built. It now lives here as historical reference.

The Phase 2 affiliate site (Next.js, lives in repo root from 2026-05-02 onward)
will replace it on the VPS when the user authorises that deploy.
```

- [ ] **Step 3: Create root `.gitignore`**

```gitignore
# deps
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/releases

# next
/.next/
/out/

# build
/build
/dist

# env
.env
.env.local
.env.development.local
.env.test
.env.production.local

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# editor
.vscode/
.idea/
*.swp

# os
.DS_Store
Thumbs.db

# tests
/coverage
/playwright-report
/test-results

# typescript
*.tsbuildinfo
next-env.d.ts

# untracked design bundle (don't commit large binary handoffs)
/.design-bundle/

# locks
.~lock.*

# sentry
.sentryclirc
```

- [ ] **Step 4: Commit**

```bash
git add legacy/ .gitignore
git rm -f Meesho_Top_Sellers_Report.xlsx 2>/dev/null || true   # don't commit large binaries
git commit -m "chore(affiliate): archive Phase 1 coming-soon to legacy/, seed .gitignore"
```

---

### Task 2: Initialise Next.js + TypeScript + Tailwind v4

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `next-env.d.ts` (auto-generated, gitignored)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "orderlink",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@sentry/nextjs": "^10.49.0",
    "next": "15.5.15",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.1",
    "@vitest/coverage-v8": "^4.1.4",
    "jsdom": "^29.0.2",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.4"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
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
      {
        source: "/go/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};
export default nextConfig;
```

- [ ] **Step 4: Write `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: clean install, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs
git commit -m "chore(affiliate): scaffold Next.js 15 + React 19 + Tailwind v4 + TS"
```

---

### Task 3: Vitest + Playwright config + tests/setup.ts

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { provider: "v8", reporter: ["text", "html"] },
    passWithNoTests: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Write `playwright.config.ts`**

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
```

- [ ] **Step 3: Write `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run vitest sanity check**

```bash
npm test -- --run
```

Expected: PASS — `passWithNoTests: true` means an empty suite is green.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests/setup.ts
git commit -m "chore(affiliate): vitest + playwright config"
```

---

### Task 4: Tailwind v4 theme tokens + globals.css

**Files:**
- Create: `src/app/globals.css`

- [ ] **Step 1: Write `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ol-accent: #FF5A3C;
  --color-ol-deep: #0E1430;
  --color-ol-ink: #1A1F36;
  --color-ol-muted: #6B7280;
  --color-ol-bg: #FFFDFA;
  --color-ol-soft: #F4F1EC;
  --color-ol-success: #0E7C3A;
  --color-ol-warn: #B45309;
  --radius-ol: 18px;
  --font-display: "Fraunces", "Times New Roman", serif;
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background: var(--color-ol-bg);
  color: var(--color-ol-ink);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11";
}

/* selection */
::selection { background: var(--color-ol-accent); color: #fff; }

/* range slider — used in /shop price filter */
input[type=range] {
  -webkit-appearance: none;
  height: 4px;
  background: rgba(14, 20, 48, 0.12);
  border-radius: 999px;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-ol-accent);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* fade-in keyframe used by interstitial */
@keyframes ol-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-ol-fade { animation: ol-fade 0.25s ease; }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(affiliate): Tailwind v4 @theme tokens — design palette + fonts"
```

---

### Task 5: Root layout with Fraunces + Plus Jakarta Sans

**Files:**
- Create: `src/app/layout.tsx`
- Copy from `phase-2a-store`: `src/app/icon.png`, `src/app/apple-icon.png`

- [ ] **Step 1: Copy brand mark icons from phase-2a-store**

```bash
git checkout phase-2a-store -- src/app/icon.png src/app/apple-icon.png
```

- [ ] **Step 2: Write `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display-loaded",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-loaded",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://orderlink.in"),
  title: {
    default: "OrderLink — Curated finds, straight to the best price",
    template: "%s · OrderLink",
  },
  description:
    "Hand-tested picks across tech, beauty, home, fashion, kitchen, kids, gifts and study. We test, we sort, we send you to the best price.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "OrderLink",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#FFFDFA",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-ol-bg text-ol-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify it builds**

```bash
npm run build
```

Expected: build succeeds. There will be no pages yet — that lands in T26+. The build should at least produce a 404 page and the layout chunk.

If the build complains about a missing `page.tsx`, create a temporary `src/app/page.tsx`:

```tsx
export default function Home() {
  return <main className="p-8">OrderLink — coming together.</main>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/icon.png src/app/apple-icon.png src/app/page.tsx 2>/dev/null
git commit -m "feat(affiliate): root layout with Fraunces + Plus Jakarta Sans"
```

---

### Task 6: Sentry config

**Files:**
- Copy from `phase-2a-store`: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Modify: `next.config.mjs`

- [ ] **Step 1: Bring Sentry config files over**

```bash
git checkout phase-2a-store -- sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts
```

- [ ] **Step 2: Wrap `next.config.mjs` with Sentry**

Append to existing `next.config.mjs`, replacing the final `export default nextConfig;` line:

```js
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds. Sentry init no-ops without `NEXT_PUBLIC_SENTRY_DSN`.

- [ ] **Step 4: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts next.config.mjs
git commit -m "feat(affiliate): Sentry config (env-gated, no-ops without DSN)"
```

---

### Task 7: `/api/healthz` route

**Files:**
- Create: `src/app/api/healthz/route.ts`

- [ ] **Step 1: Write the healthz route**

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "orderlink-affiliate",
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Verify locally**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/api/healthz | grep '"status":"ok"'
kill %1 2>/dev/null
```

Expected: matches.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/healthz/route.ts
git commit -m "feat(affiliate): /api/healthz for Docker/Traefik healthcheck"
```

---

## M2 — Data + lib

### Task 8: `src/data/categories.ts`

**Files:**
- Create: `src/data/categories.ts`
- Test: `tests/data/categories.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/data/categories.test.ts
import { describe, it, expect } from "vitest";
import { categories, type CategoryId } from "@/data/categories";

describe("categories", () => {
  it("has exactly 8 sub-brands", () => {
    expect(categories).toHaveLength(8);
  });

  it("ids match the design (techland, clothlink, glossy, homely, kidzy, studify, sufraan, giftzone)", () => {
    const ids: CategoryId[] = [
      "techland", "clothlink", "glossy", "homely",
      "kidzy", "studify", "sufraan", "giftzone",
    ];
    expect(categories.map(c => c.id).sort()).toEqual(ids.sort());
  });

  it("every category has a non-empty name, tagline, hue (0-360), icon", () => {
    for (const c of categories) {
      expect(c.name).toBeTruthy();
      expect(c.tagline).toBeTruthy();
      expect(c.hue).toBeGreaterThanOrEqual(0);
      expect(c.hue).toBeLessThanOrEqual(360);
      expect(c.icon).toBeTruthy();
    }
  });
});
```

Run: `npm test -- --run tests/data/categories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Write `src/data/categories.ts`**

```ts
export type CategoryId =
  | "techland"
  | "clothlink"
  | "glossy"
  | "homely"
  | "kidzy"
  | "studify"
  | "sufraan"
  | "giftzone";

export type CategoryIcon =
  | "tech" | "cloth" | "glossy" | "home"
  | "kid" | "study" | "kitchen" | "gift";

export type Category = {
  id: CategoryId;
  name: string;
  tagline: string;
  hue: number;        // OKLCH hue 0-360, drives card tint
  icon: CategoryIcon;
};

export const categories: Category[] = [
  { id: "techland",  name: "TechLand",  tagline: "Gadgets & gear",  hue: 220, icon: "tech" },
  { id: "clothlink", name: "ClothLink", tagline: "Fashion finds",   hue: 340, icon: "cloth" },
  { id: "glossy",    name: "Glossy",    tagline: "Beauty & care",   hue:  16, icon: "glossy" },
  { id: "homely",    name: "Homely",    tagline: "For the home",    hue:  28, icon: "home" },
  { id: "kidzy",     name: "Kidzy",     tagline: "Kids & toys",     hue:  50, icon: "kid" },
  { id: "studify",   name: "Studify",   tagline: "Study & office",  hue: 260, icon: "study" },
  { id: "sufraan",   name: "Sufraan",   tagline: "Kitchen",         hue: 145, icon: "kitchen" },
  { id: "giftzone",  name: "GiftZone",  tagline: "Gifts & decor",   hue: 300, icon: "gift" },
];

export function findCategory(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}
```

- [ ] **Step 3: Run test, verify pass**

Run: `npm test -- --run tests/data/categories.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/data/categories.ts tests/data/categories.test.ts
git commit -m "feat(affiliate): categories — 8 sub-brands with hue/glyph mapping"
```

---

### Task 9: `src/data/affiliate-products.ts` — schema + 12 seed products

**Files:**
- Create: `src/data/affiliate-products.ts`
- Test: `tests/data/affiliate-products.test.ts`

- [ ] **Step 1: Write failing integrity tests**

```ts
// tests/data/affiliate-products.test.ts
import { describe, it, expect } from "vitest";
import { products, findProduct, productsByCategory } from "@/data/affiliate-products";
import { categories } from "@/data/categories";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("affiliate-products", () => {
  it("has at least 12 products", () => {
    expect(products.length).toBeGreaterThanOrEqual(12);
  });

  it("every product has a unique id and unique slug", () => {
    const ids = new Set(products.map(p => p.id));
    const slugs = new Set(products.map(p => p.slug));
    expect(ids.size).toBe(products.length);
    expect(slugs.size).toBe(products.length);
  });

  it("every slug is kebab-case", () => {
    for (const p of products) expect(p.slug).toMatch(KEBAB);
  });

  it("every product references an existing category id", () => {
    const valid = new Set(categories.map(c => c.id));
    for (const p of products) expect(valid.has(p.category)).toBe(true);
  });

  it("every product has 1-3 merchants, each with non-empty affiliateUrl", () => {
    for (const p of products) {
      expect(p.merchants.length).toBeGreaterThanOrEqual(1);
      expect(p.merchants.length).toBeLessThanOrEqual(3);
      for (const m of p.merchants) expect(m.affiliateUrl).toBeTruthy();
    }
  });

  it("every product has at least one image and one review", () => {
    for (const p of products) {
      expect(p.images.length).toBeGreaterThanOrEqual(1);
      expect(p.reviews.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("price <= mrp for every product", () => {
    for (const p of products) expect(p.price).toBeLessThanOrEqual(p.mrp);
  });

  it("rating is between 0 and 5", () => {
    for (const p of products) {
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
    }
  });

  it("findProduct returns by slug", () => {
    expect(findProduct(products[0].slug)?.id).toBe(products[0].id);
    expect(findProduct("does-not-exist")).toBeUndefined();
  });

  it("productsByCategory filters correctly", () => {
    for (const c of categories) {
      const list = productsByCategory(c.id);
      for (const p of list) expect(p.category).toBe(c.id);
    }
  });
});
```

Run: `npm test -- --run tests/data/affiliate-products.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Write the catalog file**

Reference the design's seed catalog at [`.design-bundle/orderlink/project/data.js`](/.design-bundle/orderlink/project/data.js) — port the 12 products, but adjust:

1. Add `slug` field (kebab-case from title).
2. Replace Unsplash URLs with `/products/<slug>/<n>.webp` paths (files arrive in T54).
3. Add `affiliateUrl: "https://www.amazon.in/?tag=PLACEHOLDER"` on each merchant — real URLs come later.
4. Add `reel` field on the first 4 products (one per distinct video in the design's `reelMap`): `{ src: "/products/<slug>/reel.mp4", caption: "Hands-on with the …" }`.

Skeleton with all helper functions + the first product (port the remaining 11 from `data.js`):

```ts
import type { CategoryId } from "./categories";

export type MerchantId = "amazon" | "myntra" | "nykaa";

export type Merchant = {
  id: MerchantId;
  label: string;
  price: number;        // ₹
  eta: string;          // "Tomorrow" | "2 days"
  stock: "In stock" | "Few left" | "Out of stock";
  affiliateUrl: string; // PLACEHOLDER until user supplies real deeplinks
};

export type Review = {
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  title: string;
  body: string;
};

export type Reel = {
  src: string;
  poster?: string;
  caption?: string;
  audioLabel?: string;
  durationSec?: number;
  likes?: string;
  comments?: string;
};

export type AffiliateProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  images: string[];
  reel?: Reel;
  summary: string;
  highlights: string[];
  specs: [string, string][];
  colors?: string[];
  merchants: Merchant[];
  reviews: Review[];
};

const PLACEHOLDER_URL = (m: MerchantId) =>
  ({ amazon: "https://www.amazon.in/?tag=PLACEHOLDER",
     myntra: "https://www.myntra.com/?utm_source=PLACEHOLDER",
     nykaa:  "https://www.nykaa.com/?ref=PLACEHOLDER" }[m]);

export const products: AffiliateProduct[] = [
  {
    id: "p1",
    slug: "ai-translation-earbuds",
    title: "135-Language AI Translation Earbuds",
    subtitle: "Bluetooth 5.3 · HiFi Stereo · IPX5",
    category: "techland",
    price: 1299, mrp: 2999, rating: 4.6, reviewCount: 1284,
    badge: "Editor's pick",
    images: [
      "/products/ai-translation-earbuds/1.webp",
      "/products/ai-translation-earbuds/2.webp",
      "/products/ai-translation-earbuds/3.webp",
      "/products/ai-translation-earbuds/4.webp",
    ],
    reel: {
      src: "/products/ai-translation-earbuds/reel.mp4",
      caption: "Hands-on with the AI translation earbuds ✨",
      audioLabel: "Original audio · 1:24",
      likes: "12.4K", comments: "482",
    },
    summary:
      "Real-time translation in 135 languages, paired with HiFi stereo audio for travel, meetings, and study. All-day standby with smart noise filtering.",
    highlights: [
      "135 languages, 0.5s latency",
      "IPX5 sweat & rain resistant",
      "24h battery with charging case",
      "Bluetooth 5.3 stable pairing",
    ],
    specs: [
      ["Driver", "13mm dynamic"],
      ["Bluetooth", "5.3"],
      ["Battery (buds)", "6 hours"],
      ["Battery (case)", "24 hours"],
      ["Water rating", "IPX5"],
      ["Weight", "4.2g per bud"],
    ],
    colors: ["#0F172A", "#FFFFFF", "#94A3B8"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 1299, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
      { id: "myntra", label: "Myntra", price: 1349, eta: "2 days",   stock: "In stock", affiliateUrl: PLACEHOLDER_URL("myntra") },
    ],
    reviews: [
      { name: "Aarav S.", rating: 5, date: "12 days ago", title: "Incredible for travel",
        body: "Used these on a trip to Tokyo. The translation is fast enough for real conversations and the sound quality is way better than I expected at this price." },
      { name: "Mira P.",  rating: 4, date: "3 weeks ago", title: "Great value",
        body: "Battery life is everything they claim. Translation between Hindi and English is near-perfect; it stumbles a bit on regional accents." },
    ],
  },
  // ... port p2..p12 from .design-bundle/orderlink/project/data.js the same way.
  // Mapping (keep these slugs):
  //   p2  → mini-sleep-earbuds              (techland)
  //   p3  → mens-grooming-kit               (techland)
  //   p4  → crystal-velvet-prayer-mat       (homely) — add reel
  //   p5  → granite-cookware-set-7pc        (sufraan) — add reel
  //   p6  → rechargeable-spray-bottle       (homely)
  //   p7  → glow-serum-vitamin-c-20         (glossy) — add reel
  //   p8  → hydrating-lip-oil-trio          (glossy)
  //   p9  → linen-blend-oversized-shirt     (clothlink) — add reel
  //   p10 → pleated-midi-skirt              (clothlink)
  //   p11 → wooden-montessori-cube          (kidzy)
  //   p12 → refillable-notebook-system      (studify)
];

export function findProduct(slug: string): AffiliateProduct | undefined {
  return products.find(p => p.slug === slug);
}

export function productsByCategory(id: CategoryId): AffiliateProduct[] {
  return products.filter(p => p.category === id);
}

export function relatedProducts(p: AffiliateProduct, limit = 4): AffiliateProduct[] {
  return products.filter(x => x.category === p.category && x.id !== p.id).slice(0, limit);
}
```

Port p2-p12 from `.design-bundle/orderlink/project/data.js` lines 56-287, applying the slug mapping above and the same image-path / merchant-URL substitutions.

- [ ] **Step 3: Run all tests**

```bash
npm test -- --run
```

Expected: all 13 tests pass (3 from T8 + 10 from T9).

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/data/affiliate-products.ts tests/data/affiliate-products.test.ts
git commit -m "feat(affiliate): catalog — 12 seed products across 8 sub-brands"
```

---

### Task 10: `src/lib/format.ts` — ₹ formatting + % discount

**Files:**
- Create: `src/lib/format.ts`
- Test: `tests/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/format.test.ts
import { describe, it, expect } from "vitest";
import { formatRupees, percentOff } from "@/lib/format";

describe("formatRupees", () => {
  it("formats with Indian grouping", () => {
    expect(formatRupees(1299)).toBe("₹1,299");
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("percentOff", () => {
  it("returns rounded integer", () => {
    expect(percentOff(1299, 2999)).toBe(57);
    expect(percentOff(749, 1499)).toBe(50);
  });
  it("returns 0 when mrp is missing or invalid", () => {
    expect(percentOff(100, 0)).toBe(0);
    expect(percentOff(100, 100)).toBe(0);
    expect(percentOff(100, 50)).toBe(0);
  });
});
```

Run: `npm test -- --run tests/lib/format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Write `src/lib/format.ts`**

```ts
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function percentOff(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/lib/format.test.ts
git add src/lib/format.ts tests/lib/format.test.ts
git commit -m "feat(affiliate): lib/format — ₹ formatter + % discount"
```

---

### Task 11: `src/lib/search.ts` — filter + sort helpers

**Files:**
- Create: `src/lib/search.ts`
- Test: `tests/lib/search.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { filterProducts, sortProducts, type SortKey } from "@/lib/search";
import type { AffiliateProduct } from "@/data/affiliate-products";

const fixtures: AffiliateProduct[] = [
  { id:"a", slug:"a", title:"Bluetooth Earbuds", subtitle:"", category:"techland",
    price:1000, mrp:2000, rating:4.5, reviewCount:10, images:["/x.webp"], summary:"audio gear",
    highlights:[], specs:[], merchants:[{id:"amazon",label:"Amazon",price:1000,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
  { id:"b", slug:"b", title:"Lip Oil Trio", subtitle:"", category:"glossy",
    price:500, mrp:1000, rating:4.7, reviewCount:5, images:["/x.webp"], summary:"beauty",
    highlights:[], specs:[], merchants:[{id:"nykaa",label:"Nykaa",price:500,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
  { id:"c", slug:"c", title:"Cookware Set", subtitle:"", category:"sufraan",
    price:3000, mrp:5000, rating:4.2, reviewCount:50, images:["/x.webp"], summary:"kitchen",
    highlights:[], specs:[], merchants:[{id:"amazon",label:"Amazon",price:3000,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
];

describe("filterProducts", () => {
  it("filters by category", () => {
    expect(filterProducts(fixtures, { category: "glossy" })).toHaveLength(1);
  });
  it("filters by case-insensitive query against title + summary", () => {
    expect(filterProducts(fixtures, { query: "lip" })).toHaveLength(1);
    expect(filterProducts(fixtures, { query: "AUDIO" })).toHaveLength(1);
  });
  it("filters by max price", () => {
    expect(filterProducts(fixtures, { maxPrice: 1000 })).toHaveLength(2);
  });
  it("combines filters AND-style", () => {
    expect(filterProducts(fixtures, { category: "techland", maxPrice: 500 })).toHaveLength(0);
  });
});

describe("sortProducts", () => {
  const test = (key: SortKey, expectedFirst: string) => {
    const sorted = sortProducts(fixtures, key);
    expect(sorted[0].id).toBe(expectedFirst);
  };
  it("price-asc", () => test("price-asc", "b"));
  it("price-desc", () => test("price-desc", "c"));
  it("rating", () => test("rating", "b"));
  it("curated keeps original order", () => test("curated", "a"));
});
```

Run: `npm test -- --run tests/lib/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Write `src/lib/search.ts`**

```ts
import type { AffiliateProduct } from "@/data/affiliate-products";
import type { CategoryId } from "@/data/categories";

export type FilterOptions = {
  category?: CategoryId | "all";
  query?: string;
  maxPrice?: number;
};

export type SortKey = "curated" | "price-asc" | "price-desc" | "rating";

export function filterProducts(
  list: AffiliateProduct[],
  opts: FilterOptions = {}
): AffiliateProduct[] {
  const { category, query, maxPrice } = opts;
  const q = query?.toLowerCase().trim();
  return list.filter(p => {
    if (category && category !== "all" && p.category !== category) return false;
    if (q && !(p.title + " " + p.summary).toLowerCase().includes(q)) return false;
    if (typeof maxPrice === "number" && p.price > maxPrice) return false;
    return true;
  });
}

export function sortProducts(
  list: AffiliateProduct[],
  key: SortKey
): AffiliateProduct[] {
  const out = [...list];
  if (key === "price-asc") out.sort((a, b) => a.price - b.price);
  else if (key === "price-desc") out.sort((a, b) => b.price - a.price);
  else if (key === "rating") out.sort((a, b) => b.rating - a.rating);
  // "curated" — preserve input order (typically the catalog's editorial order)
  return out;
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/lib/search.test.ts
git add src/lib/search.ts tests/lib/search.test.ts
git commit -m "feat(affiliate): lib/search — filter + sort helpers"
```

---

### Task 12: `src/lib/wishlist.ts` — localStorage-backed wishlist

**Files:**
- Create: `src/lib/wishlist.ts`
- Test: `tests/lib/wishlist.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/lib/wishlist.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getWishlist, isWishlisted, toggleWishlist, WISHLIST_KEY } from "@/lib/wishlist";

describe("wishlist (localStorage)", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(getWishlist()).toEqual([]);
    expect(isWishlisted("p1")).toBe(false);
  });

  it("toggle adds then removes", () => {
    toggleWishlist("p1");
    expect(isWishlisted("p1")).toBe(true);
    expect(getWishlist()).toEqual(["p1"]);
    toggleWishlist("p1");
    expect(isWishlisted("p1")).toBe(false);
  });

  it("survives a stored value being malformed", () => {
    localStorage.setItem(WISHLIST_KEY, "not json");
    expect(getWishlist()).toEqual([]);
  });
});
```

- [ ] **Step 2: Write `src/lib/wishlist.ts`**

```ts
export const WISHLIST_KEY = "ol-wishlist-v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("ol-wishlist-change"));
}

export function getWishlist(): string[] { return read(); }
export function isWishlisted(id: string): boolean { return read().includes(id); }
export function toggleWishlist(id: string): void {
  const list = read();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1); else list.push(id);
  write(list);
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/lib/wishlist.test.ts
git add src/lib/wishlist.ts tests/lib/wishlist.test.ts
git commit -m "feat(affiliate): lib/wishlist — localStorage-backed wishlist"
```

---

### Task 13: M2 typecheck + full test sweep

- [ ] **Step 1: Run all tests**

```bash
npm test -- --run
```

Expected: ≥18 tests pass (8 categories + 10 products + 3 format + 8 search + 3 wishlist).

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

No commit — verification only.

---

## M3 — Atom components

These components are tiny and visual. Tailwind classes are derived from the prototype's inline styles ([`.design-bundle/orderlink/project/app.jsx`](.design-bundle/orderlink/project/app.jsx) lines 14-112). Open the prototype side-by-side while implementing.

### Task 14: `Icon` — single SVG component for 12 icons

**Files:**
- Create: `src/components/Icon.tsx`

- [ ] **Step 1: Write `src/components/Icon.tsx`**

Port from [`app.jsx:15-35`](.design-bundle/orderlink/project/app.jsx). Convert to a typed React component, no `'use client'` needed (pure render).

```tsx
type IconName =
  | "search" | "menu" | "heart" | "arrow-right" | "arrow-left"
  | "star" | "check" | "truck" | "shield" | "external"
  | "sparkle" | "filter" | "close" | "chevron-right" | "tag"
  | "play";

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
};

export function Icon({ name, size = 20, stroke = 1.6, className }: IconProps) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "search":        return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "menu":          return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "heart":         return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "arrow-right":   return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-left":    return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "star":          return <svg {...props} fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case "check":         return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
    case "truck":         return <svg {...props}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case "shield":        return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "external":      return <svg {...props}><path d="M15 3h6v6M10 14 21 3M21 14v7H3V3h7"/></svg>;
    case "sparkle":       return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case "filter":        return <svg {...props}><path d="M3 4h18M6 12h12M10 20h4"/></svg>;
    case "close":         return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chevron-right": return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "tag":           return <svg {...props}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>;
    case "play":          return <svg {...props} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat(affiliate): Icon — 16 SVG icons in one typed component"
```

---

### Task 15: `CategoryGlyph` — 8 SVG sub-brand glyphs

**Files:**
- Create: `src/components/CategoryGlyph.tsx`

- [ ] **Step 1: Write `src/components/CategoryGlyph.tsx`**

Port from [`app.jsx:37-51`](.design-bundle/orderlink/project/app.jsx).

```tsx
import type { CategoryIcon } from "@/data/categories";

export function CategoryGlyph({ kind, size = 28 }: { kind: CategoryIcon; size?: number }) {
  const c = "currentColor";
  const s = { width: size, height: size };
  switch (kind) {
    case "tech":    return <svg {...s} viewBox="0 0 32 32" fill="none"><rect x="5" y="7" width="22" height="14" rx="2" stroke={c} strokeWidth="1.7"/><path d="M3 24h26M11 21v3M21 21v3" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "cloth":   return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M10 5l-5 4 3 4 2-1v14h12V12l2 1 3-4-5-4-3 2c-1 1-3 1-4 0l-3-2z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
    case "glossy":  return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M14 4h4v5h-4z" stroke={c} strokeWidth="1.7"/><rect x="10" y="9" width="12" height="19" rx="2" stroke={c} strokeWidth="1.7"/><path d="M13 14h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "home":    return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M4 14 16 4l12 10v13a1 1 0 0 1-1 1h-7v-9h-8v9H5a1 1 0 0 1-1-1V14z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
    case "kid":     return <svg {...s} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="14" r="9" stroke={c} strokeWidth="1.7"/><circle cx="13" cy="13" r="1" fill={c}/><circle cx="19" cy="13" r="1" fill={c}/><path d="M12 17c1.5 1.5 6.5 1.5 8 0" stroke={c} strokeWidth="1.7" strokeLinecap="round"/><path d="M16 23v5M12 27h8" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "study":   return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M6 6h16a3 3 0 0 1 3 3v17H9a3 3 0 0 1-3-3V6z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/><path d="M6 23a3 3 0 0 1 3-3h16" stroke={c} strokeWidth="1.7"/><path d="M11 11h9M11 15h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "kitchen": return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M4 14h22v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/><path d="M26 16h4v5h-4M9 14V8a3 3 0 0 1 3-3M16 14V8M23 14V8" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "gift":    return <svg {...s} viewBox="0 0 32 32" fill="none"><rect x="4" y="12" width="24" height="16" rx="2" stroke={c} strokeWidth="1.7"/><path d="M2 8h28v4H2zM16 8v20M16 8s-4-6-7-3 2 5 7 3zM16 8s4-6 7-3-2 5-7 3z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CategoryGlyph.tsx
git commit -m "feat(affiliate): CategoryGlyph — 8 sub-brand SVG glyphs"
```

---

### Task 16: `MerchantLogo` — branded badge for amazon/myntra/nykaa

**Files:**
- Create: `src/components/MerchantLogo.tsx`

- [ ] **Step 1: Write `src/components/MerchantLogo.tsx`**

```tsx
import type { MerchantId } from "@/data/affiliate-products";

const MERCHANTS: Record<MerchantId, { txt: string; bg: string }> = {
  amazon: { txt: "amazon", bg: "#FF9900" },
  myntra: { txt: "myntra", bg: "#FF3F6C" },
  nykaa:  { txt: "nykaa",  bg: "#FC2779" },
};

export function MerchantLogo({ id, height = 18 }: { id: MerchantId; height?: number }) {
  const m = MERCHANTS[id];
  return (
    <span
      className="inline-flex items-center font-display font-extrabold tracking-tight text-white rounded-md"
      style={{
        height,
        padding: "0 8px",
        background: m.bg,
        fontSize: height * 0.6,
      }}
    >
      {m.txt}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MerchantLogo.tsx
git commit -m "feat(affiliate): MerchantLogo — branded inline badges"
```

---

### Task 17: `Stars` — fractional star rating

**Files:**
- Create: `src/components/Stars.tsx`
- Test: `tests/components/Stars.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/Stars.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Stars } from "@/components/Stars";

describe("Stars", () => {
  it("renders 5 stars total", () => {
    const { container } = render(<Stars value={4.6} />);
    expect(container.querySelectorAll("[data-testid='star']")).toHaveLength(5);
  });

  it("rounds 4.6 to 5 filled stars", () => {
    const { container } = render(<Stars value={4.6} />);
    const filled = container.querySelectorAll("[data-testid='star'][data-filled='true']");
    expect(filled).toHaveLength(5);
  });

  it("rounds 4.4 to 4 filled stars", () => {
    const { container } = render(<Stars value={4.4} />);
    const filled = container.querySelectorAll("[data-testid='star'][data-filled='true']");
    expect(filled).toHaveLength(4);
  });

  it("clamps 0 to no filled, 5 to all filled", () => {
    const empty  = render(<Stars value={0} />).container;
    const full   = render(<Stars value={5} />).container;
    expect(empty.querySelectorAll("[data-filled='true']")).toHaveLength(0);
    expect(full.querySelectorAll("[data-filled='true']")).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Write `src/components/Stars.tsx`**

```tsx
import { Icon } from "./Icon";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex gap-[2px] text-amber-500">
      {[1, 2, 3, 4, 5].map(i => {
        const isFilled = i <= filled;
        return (
          <span
            key={i}
            data-testid="star"
            data-filled={isFilled}
            className={isFilled ? "opacity-100" : "opacity-25"}
          >
            <Icon name="star" size={size} />
          </span>
        );
      })}
    </span>
  );
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/components/Stars.test.tsx
git add src/components/Stars.tsx tests/components/Stars.test.tsx
git commit -m "feat(affiliate): Stars — fractional 0-5 rating"
```

---

### Task 18: `Price` — primary + MRP + % off

**Files:**
- Create: `src/components/Price.tsx`
- Test: `tests/components/Price.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/Price.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Price } from "@/components/Price";

describe("Price", () => {
  it("renders price, mrp strikethrough, and % off", () => {
    const { container } = render(<Price value={1299} mrp={2999} />);
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).toContain("₹2,999");
    expect(container.textContent).toContain("57% off");
  });

  it("hides mrp + % when no mrp passed", () => {
    const { container } = render(<Price value={1299} />);
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).not.toContain("off");
  });
});
```

- [ ] **Step 2: Write `src/components/Price.tsx`**

```tsx
import { formatRupees, percentOff } from "@/lib/format";

const SIZES = {
  sm: { main: "text-[15px]", strike: "text-[12px]" },
  md: { main: "text-[20px]", strike: "text-[13px]" },
  lg: { main: "text-[28px]", strike: "text-[15px]" },
  xl: { main: "text-[36px]", strike: "text-[18px]" },
} as const;

export type PriceSize = keyof typeof SIZES;

export function Price({
  value, mrp, size = "md",
}: { value: number; mrp?: number; size?: PriceSize }) {
  const off = mrp ? percentOff(value, mrp) : 0;
  const cls = SIZES[size];
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-bold tracking-tight text-ol-ink ${cls.main}`}>
        {formatRupees(value)}
      </span>
      {mrp && (
        <span className={`text-ol-muted line-through ${cls.strike}`}>
          {formatRupees(mrp)}
        </span>
      )}
      {off > 0 && (
        <span className={`font-bold text-ol-success ${cls.strike}`}>{off}% off</span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/components/Price.test.tsx
git add src/components/Price.tsx tests/components/Price.test.tsx
git commit -m "feat(affiliate): Price — value + MRP strikethrough + % off"
```

---

### Task 19: `Pill` — 4 tonal pill variants

**Files:**
- Create: `src/components/Pill.tsx`

- [ ] **Step 1: Write `src/components/Pill.tsx`**

```tsx
import { Icon } from "./Icon";
import type { ComponentProps } from "react";

type Tone = "default" | "accent" | "dark" | "success";

const TONES: Record<Tone, string> = {
  default: "bg-ol-soft text-ol-ink",
  accent:  "bg-ol-accent/15 text-ol-accent",
  dark:    "bg-ol-deep text-white",
  success: "bg-emerald-50 text-ol-success",
};

export function Pill({
  children, tone = "default", icon,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: ComponentProps<typeof Icon>["name"];
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold tracking-wide rounded-full ${TONES[tone]}`}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Pill.tsx
git commit -m "feat(affiliate): Pill — 4 tonal pill variants with optional icon"
```

---

### Task 20: `IconButton` — circular and rectangular icon buttons

**Files:**
- Create: `src/components/IconButton.tsx`

- [ ] **Step 1: Write `src/components/IconButton.tsx`**

These wrap the icon-button styles from the prototype's `.ol-icon-btn` (rounded-md card-shaded) and `.ol-icon-btn-sm` (round backdrop-blur, used in card hover overlays).

```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "card" | "overlay";

const VARIANTS: Record<Variant, string> = {
  card:
    "w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10 text-ol-ink transition-colors",
  overlay:
    "w-[32px] h-[32px] rounded-full bg-white/90 hover:bg-white hover:scale-110 backdrop-blur-sm border border-ol-deep/5 text-ol-ink transition-all",
};

export function IconButton({
  variant = "card", className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center cursor-pointer ${VARIANTS[variant]} ${className}`}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/IconButton.tsx
git commit -m "feat(affiliate): IconButton — card + overlay variants"
```

---

## M4 — Layout chrome

### Task 21: `WishlistHeart` — client-only heart toggle

**Files:**
- Create: `src/components/WishlistHeart.tsx`

- [ ] **Step 1: Write `src/components/WishlistHeart.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { isWishlisted, toggleWishlist } from "@/lib/wishlist";

export function WishlistHeart({ productId, className = "" }: { productId: string; className?: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isWishlisted(productId));
    const onChange = () => setActive(isWishlisted(productId));
    window.addEventListener("ol-wishlist-change", onChange);
    return () => window.removeEventListener("ol-wishlist-change", onChange);
  }, [productId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(productId);
        }
      }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 hover:bg-white hover:scale-110 backdrop-blur-sm border border-ol-deep/5 cursor-pointer transition-all ${active ? "text-ol-accent" : "text-ol-ink"} ${className}`}
    >
      <Icon name="heart" size={14} />
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WishlistHeart.tsx
git commit -m "feat(affiliate): WishlistHeart — localStorage-backed heart toggle"
```

---

### Task 22: `Header` — sticky with logo, nav, search, heart

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: Write `src/components/Header.tsx`**

Port from [`app.jsx:115-167`](.design-bundle/orderlink/project/app.jsx). Replace `go({...})` with Next `<Link>`. Search input is a controlled stub that navigates to `/shop?q=...` on Enter.

```tsx
"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "./Icon";

export function Header() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <header className="sticky top-0 z-50 bg-ol-bg/90 backdrop-saturate-150 backdrop-blur-md border-b border-ol-deep/10">
      <div className="max-w-[1280px] mx-auto px-6 flex items-center gap-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-ol-deep flex items-center justify-center text-ol-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M3 12h7M14 12h7"/><circle cx="12" cy="12" r="3.5"/>
            </svg>
          </span>
          <span className="font-display font-extrabold text-[22px] tracking-tight text-ol-ink">
            OrderLink<span className="text-ol-accent">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex gap-6 ml-3">
          {[
            { label: "Curated",       href: "/shop" },
            { label: "Categories",    href: "/shop" },
            { label: "How it works",  href: "/how-we-curate" },
            { label: "About",         href: "/about" },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="text-[14px] text-ol-ink font-medium opacity-80 hover:opacity-100">
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch}
          className="hidden md:flex flex-1 max-w-[460px] ml-auto items-center gap-2.5 bg-ol-soft border border-ol-deep/5 px-3.5 py-2.5 rounded-xl">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search 1,200+ curated finds…"
            className="bg-transparent border-0 outline-none text-[14px] flex-1 text-ol-ink"
            aria-label="Search products"
          />
          <kbd className="text-[11px] text-ol-muted border border-ol-deep/15 px-1.5 rounded">⌘K</kbd>
        </form>

        <div className="flex gap-2 ml-auto md:ml-0">
          <Link href="/shop" aria-label="Browse" className="md:hidden inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10">
            <Icon name="search" size={18}/>
          </Link>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(affiliate): Header — sticky with logo, nav, search, mobile actions"
```

---

### Task 23: `Footer` — newsletter UI + 4-col link grid

**Files:**
- Create: `src/components/Footer.tsx`

- [ ] **Step 1: Write `src/components/Footer.tsx`**

Port from [`pages.jsx:448-481`](.design-bundle/orderlink/project/pages.jsx). Newsletter form stub: `onSubmit` does `e.preventDefault()` and shows nothing (UI-only this phase per spec §3 out-of-scope).

```tsx
import Link from "next/link";
import { categories } from "@/data/categories";

export function Footer() {
  return (
    <footer className="bg-ol-deep text-white rounded-ol px-10 pt-14 pb-8 my-12 mx-6">
      <div className="grid gap-8 mb-10" style={{ gridTemplateColumns: "minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))" }}>
        <div>
          <div className="font-display font-extrabold text-[26px] tracking-tight mb-3">
            OrderLink<span className="text-ol-accent">.</span>
          </div>
          <p className="text-[14px] leading-relaxed opacity-70 max-w-[320px] mb-4">
            A curated catalog. We test, we sort, we send you to the best price. That's it.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); }}
            className="flex gap-2"
            aria-label="Friday edit newsletter signup"
          >
            <input
              type="email" required placeholder="Your email"
              className="flex-1 bg-white/10 border border-white/15 text-white placeholder:text-white/50 px-3.5 py-2.5 rounded-[10px] text-[13px]"
            />
            <button type="submit"
              className="bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px] px-3.5 py-2.5 rounded-full">
              Friday edit
            </button>
          </form>
        </div>
        <FooterCol title="Shop" items={categories.slice(0, 5).map(c => ({ label: c.name, href: `/shop/${c.id}` }))} />
        <FooterCol title="Company" items={[
          { label: "About",          href: "/about" },
          { label: "How we curate",  href: "/how-we-curate" },
          { label: "Editorial",      href: "/editorial-policy" },
          { label: "Contact",        href: "/contact" },
        ]} />
        <FooterCol title="Fine print" items={[
          { label: "Affiliate disclosure", href: "/affiliate-disclosure" },
          { label: "Privacy",              href: "/privacy" },
          { label: "Terms",                href: "/terms" },
        ]} />
      </div>
      <div className="pt-6 border-t border-white/10 flex justify-between flex-wrap gap-3 text-[12px] opacity-55">
        <span>© {new Date().getFullYear()} OrderLink. Curated with care.</span>
        <span>Made in India · Powered by good taste</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[12px] font-bold tracking-[0.14em] uppercase opacity-60 mb-3.5">{title}</div>
      <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
        {items.map(i => (
          <li key={i.label}>
            <Link href={i.href} className="text-[14px] text-white opacity-80 hover:opacity-100 no-underline">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add mobile responsive override in globals.css**

The grid above defaults to 4 columns. At <880px and <540px it must collapse. Append to `src/app/globals.css`:

```css
@media (max-width: 880px) {
  footer .grid[style*="1.4fr"] { grid-template-columns: 1fr 1fr !important; }
}
@media (max-width: 540px) {
  footer .grid[style*="1.4fr"] { grid-template-columns: 1fr !important; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx src/app/globals.css
git commit -m "feat(affiliate): Footer — newsletter UI stub + 4-col link grid"
```

---

### Task 24: Wire Header + Footer into root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

Replace the existing `<body>` block with:

```tsx
<body className="bg-ol-bg text-ol-ink font-sans antialiased">
  <Header />
  <div className="max-w-[1280px] mx-auto px-6">
    {children}
  </div>
  <Footer />
</body>
```

Add imports at top:

```tsx
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
```

- [ ] **Step 2: Verify dev runs**

```bash
npm run dev &
sleep 4
curl -s http://localhost:3000 | grep -i "OrderLink"
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(affiliate): wire Header + Footer into root layout"
```

---

### Task 25: M4 typecheck + test sweep

- [ ] **Step 1: typecheck + tests**

```bash
npm run typecheck && npm test -- --run
```

Expected: clean typecheck, ≥21 tests pass. No commit.

---

## M5 — Home page

### Task 26: `SectionHead` — eyebrow + h2 + link

**Files:**
- Create: `src/components/SectionHead.tsx`

- [ ] **Step 1: Write `src/components/SectionHead.tsx`**

Port from [`app.jsx:260-268`](.design-bundle/orderlink/project/app.jsx).

```tsx
import Link from "next/link";
import { Icon } from "./Icon";

export function SectionHead({
  eyebrow, title, link,
}: { eyebrow: string; title: string; link?: { label: string; href: string } }) {
  return (
    <div className="flex justify-between items-end mb-6 gap-4 flex-wrap">
      <div>
        <div className="text-[12px] font-bold tracking-[0.14em] text-ol-accent uppercase mb-1.5">
          {eyebrow}
        </div>
        <h2 className="font-display font-bold tracking-tight m-0 text-[clamp(28px,3.5vw,42px)]"
            style={{ textWrap: "balance" }}>
          {title}
        </h2>
      </div>
      {link && (
        <Link href={link.href}
          className="text-[14px] font-semibold text-ol-ink inline-flex items-center gap-1.5">
          {link.label} <Icon name="arrow-right" size={14}/>
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SectionHead.tsx
git commit -m "feat(affiliate): SectionHead — eyebrow + h2 + optional link"
```

---

### Task 27: `Hero` — navy hero with floating product card

**Files:**
- Create: `src/components/Hero.tsx`

- [ ] **Step 1: Write `src/components/Hero.tsx`**

Port from [`app.jsx:170-221`](.design-bundle/orderlink/project/app.jsx). The "floating product card" pulls a real product (`p7` — Glow Serum) from the catalog.

```tsx
import Link from "next/link";
import Image from "next/image";
import { Pill } from "./Pill";
import { Icon } from "./Icon";
import { Stars } from "./Stars";
import { findProduct } from "@/data/affiliate-products";

export function Hero() {
  const featured = findProduct("glow-serum-vitamin-c-20");

  return (
    <section className="relative overflow-hidden text-white rounded-ol my-6 px-[clamp(40px,5vw,72px)] py-[clamp(40px,5vw,72px)] bg-ol-deep">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 88% 20%, color-mix(in oklch, var(--color-ol-accent) 60%, transparent) 0%, transparent 45%), radial-gradient(circle at 10% 100%, #2B3870 0%, transparent 50%)",
        }}
      />
      <div className="relative max-w-[720px]">
        <Pill tone="accent" icon="sparkle">Hand-picked weekly · 47 new finds</Pill>
        <h1
          className="font-display font-extrabold text-[clamp(40px,6vw,72px)] tracking-tight my-4"
          style={{ lineHeight: 1.02, textWrap: "balance" }}
        >
          Things worth<br />
          <span
            className="italic font-medium"
            style={{
              background: "linear-gradient(90deg, var(--color-ol-accent), #FFB199)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            actually clicking on.
          </span>
        </h1>
        <p className="text-[18px] leading-relaxed opacity-80 max-w-[560px] mb-7">
          We test, sort, and curate the best of the internet's marketplaces — then send you straight to the best price. No carts, no checkouts, no fluff.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/shop"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px]">
            Browse this week's edit <Icon name="arrow-right" size={16}/>
          </Link>
          <Link href="/how-we-curate"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-[14px]">
            How OrderLink works
          </Link>
        </div>
      </div>

      {featured && (
        <Link href={`/p/${featured.slug}`}
          className="hidden md:block absolute right-[5%] -bottom-10 w-[280px] bg-white text-ol-ink rounded-[18px] p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] rotate-[4deg]">
          <div className="relative w-full h-[160px] rounded-xl overflow-hidden bg-ol-soft">
            <Image src={featured.images[0]} alt="" fill sizes="280px" className="object-cover"/>
          </div>
          <div className="mt-2.5 flex justify-between items-center text-[12px]">
            <span className="font-semibold">Trending in Glossy</span>
            <Stars value={5} size={10}/>
          </div>
          <div className="font-bold text-[14px] mt-1">{featured.title.split(" ").slice(0, 4).join(" ")} — ₹{featured.price}</div>
        </Link>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Hero.tsx
git commit -m "feat(affiliate): Hero — navy hero with gradient italic h1 + floating preview card"
```

---

### Task 28: `CategoryStrip` — 8 hue-tinted glyph cards

**Files:**
- Create: `src/components/CategoryStrip.tsx`

- [ ] **Step 1: Write `src/components/CategoryStrip.tsx`**

Port from [`app.jsx:223-258`](.design-bundle/orderlink/project/app.jsx).

```tsx
import Link from "next/link";
import { categories } from "@/data/categories";
import { CategoryGlyph } from "./CategoryGlyph";
import { SectionHead } from "./SectionHead";
import { Icon } from "./Icon";

export function CategoryStrip() {
  return (
    <section className="my-12">
      <SectionHead eyebrow="Sub-brands" title="Eight little worlds of stuff" link={{ label: "See all", href: "/shop" }}/>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {categories.map(c => (
          <Link key={c.id} href={`/shop/${c.id}`}
            className="bg-white border border-ol-deep/[0.07] hover:border-ol-accent rounded-[14px] p-[18px] relative overflow-hidden transition-all hover:-translate-y-[3px]">
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-3.5"
              style={{
                background: `oklch(0.94 0.05 ${c.hue})`,
                color: `oklch(0.42 0.15 ${c.hue})`,
              }}
            >
              <CategoryGlyph kind={c.icon}/>
            </div>
            <div className="font-display font-bold text-[17px] tracking-tight">{c.name}</div>
            <div className="text-[12px] text-ol-muted mt-0.5">{c.tagline}</div>
            <div className="absolute top-3.5 right-3.5 text-ol-muted opacity-50">
              <Icon name="arrow-right" size={14}/>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CategoryStrip.tsx
git commit -m "feat(affiliate): CategoryStrip — 8 hue-tinted sub-brand cards"
```

---

### Task 29: `ProductCard` — default / tall / wide variants

**Files:**
- Create: `src/components/ProductCard.tsx`
- Test: `tests/components/ProductCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/ProductCard.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/affiliate-products";

const p = products[0];

describe("ProductCard", () => {
  it("renders default variant with title, price, and link to detail", () => {
    const { container } = render(<ProductCard p={p}/>);
    expect(container.textContent).toContain(p.title);
    expect(container.textContent).toContain("₹");
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(`/p/${p.slug}`);
  });

  it("renders tall variant", () => {
    const { container } = render(<ProductCard p={p} variant="tall"/>);
    expect(container.textContent).toContain(p.title);
  });

  it("renders wide variant with summary", () => {
    const { container } = render(<ProductCard p={p} variant="wide"/>);
    expect(container.textContent).toContain(p.title);
    expect(container.textContent).toContain(p.summary.slice(0, 30));
  });
});
```

- [ ] **Step 2: Write `src/components/ProductCard.tsx`**

Port from [`app.jsx:271-330`](.design-bundle/orderlink/project/app.jsx).

```tsx
import Link from "next/link";
import Image from "next/image";
import { Price } from "./Price";
import { Icon } from "./Icon";
import { MerchantLogo } from "./MerchantLogo";
import { WishlistHeart } from "./WishlistHeart";
import { findCategory } from "@/data/categories";
import type { AffiliateProduct } from "@/data/affiliate-products";

type Variant = "default" | "tall" | "wide";

export function ProductCard({ p, variant = "default" }: { p: AffiliateProduct; variant?: Variant }) {
  const cat = findCategory(p.category);
  const isWide = variant === "wide";
  const isTall = variant === "tall";
  const aspect = isWide ? "aspect-square" : isTall ? "aspect-[3/4]" : "aspect-[4/5]";

  return (
    <Link href={`/p/${p.slug}`}
      className={`group flex bg-white border border-ol-deep/[0.07] rounded-ol overflow-hidden text-left text-inherit no-underline transition-all hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(14,20,48,0.18)] ${isWide ? "flex-row" : "flex-col"}`}>
      <div className={`relative ${aspect} ${isWide ? "w-[200px]" : "w-full"} bg-ol-soft overflow-hidden flex-shrink-0`}>
        <Image
          src={p.images[0]}
          alt=""
          fill
          sizes={isWide ? "200px" : "(max-width: 880px) 100vw, 33vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {p.badge && (
          <span className="absolute top-3 left-3 bg-ol-deep text-white text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full">
            {p.badge}
          </span>
        )}
        <WishlistHeart productId={p.id} className="absolute top-2.5 right-2.5"/>
      </div>
      <div className={`flex-1 flex flex-col gap-1.5 ${isWide ? "py-4 px-[18px]" : "p-4"}`}>
        <div className="flex items-center justify-between text-[11px] text-ol-muted uppercase tracking-[0.08em] font-semibold">
          <span>{cat?.name}</span>
          <span className="inline-flex items-center gap-1 text-ol-ink normal-case tracking-normal">
            <Icon name="star" size={11}/> {p.rating}
          </span>
        </div>
        <h3 className={`m-0 font-display font-semibold leading-tight tracking-tight text-ol-ink ${isWide ? "text-[18px]" : "text-[16px]"}`}>
          {p.title}
        </h3>
        {isWide && (
          <p className="my-0.5 text-[13px] text-ol-muted leading-snug">
            {p.summary.slice(0, 120)}…
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <Price value={p.price} mrp={p.mrp} size="sm"/>
          <div className="flex gap-1">
            {p.merchants.slice(0, 3).map(m => (
              <MerchantLogo key={m.id} id={m.id} height={14}/>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/components/ProductCard.test.tsx
git add src/components/ProductCard.tsx tests/components/ProductCard.test.tsx
git commit -m "feat(affiliate): ProductCard — default / tall / wide variants"
```

---

### Task 30: `FeaturedHero` + `FeaturedGrid` — editorial 12-col home grid

**Files:**
- Create: `src/components/FeaturedHero.tsx`
- Create: `src/components/FeaturedGrid.tsx`

- [ ] **Step 1: Write `src/components/FeaturedHero.tsx`**

Port from [`app.jsx:354-384`](.design-bundle/orderlink/project/app.jsx).

```tsx
import Link from "next/link";
import Image from "next/image";
import { Pill } from "./Pill";
import { Icon } from "./Icon";
import { findCategory } from "@/data/categories";
import { formatRupees } from "@/lib/format";
import type { AffiliateProduct } from "@/data/affiliate-products";

export function FeaturedHero({ p }: { p: AffiliateProduct }) {
  const cat = findCategory(p.category);
  return (
    <Link href={`/p/${p.slug}`}
      className="group block relative overflow-hidden rounded-ol bg-ol-deep text-white w-full h-full min-h-[260px]">
      <Image src={p.images[0]} alt="" fill sizes="50vw" className="object-cover opacity-55 transition-transform duration-500 group-hover:scale-[1.03]"/>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(14,20,48,0.85) 100%)" }}/>
      <div className="relative p-7 h-full flex flex-col justify-between">
        <div className="flex justify-between">
          <Pill tone="accent" icon="sparkle">{p.badge ?? "Featured"}</Pill>
          <span className="text-[12px] opacity-80 font-semibold">{cat?.name}</span>
        </div>
        <div>
          <h3 className="font-display font-bold text-[clamp(24px,2.4vw,34px)] tracking-tight m-0 leading-tight"
              style={{ textWrap: "balance" }}>{p.title}</h3>
          <div className="flex items-center justify-between mt-3.5 gap-3 flex-wrap">
            <span className="font-display font-bold text-[26px] tracking-tight">{formatRupees(p.price)}</span>
            <span className="inline-flex items-center gap-2 bg-ol-accent text-white px-4 py-2.5 rounded-full font-semibold text-[14px]">
              See it <Icon name="arrow-right" size={14}/>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Write `src/components/FeaturedGrid.tsx`**

Port from [`app.jsx:333-352`](.design-bundle/orderlink/project/app.jsx).

```tsx
import { products } from "@/data/affiliate-products";
import { ProductCard } from "./ProductCard";
import { FeaturedHero } from "./FeaturedHero";
import { SectionHead } from "./SectionHead";

export function FeaturedGrid() {
  const featured = products.slice(0, 6);
  return (
    <section className="my-14">
      <SectionHead
        eyebrow="This week's edit"
        title="What we're loving right now"
        link={{ label: `See all ${products.length}`, href: "/shop" }}
      />
      <div className="ol-featured-grid grid gap-4" style={{ gridTemplateColumns: "repeat(12, 1fr)", gridAutoRows: "minmax(260px, auto)" }}>
        <div className="col-span-12 md:col-span-6"><FeaturedHero p={featured[0]} /></div>
        <div className="col-span-12 md:col-span-3"><ProductCard p={featured[1]} variant="tall"/></div>
        <div className="col-span-12 md:col-span-3"><ProductCard p={featured[2]} variant="tall"/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[3]}/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[4]}/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[5]}/></div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/FeaturedHero.tsx src/components/FeaturedGrid.tsx
git commit -m "feat(affiliate): FeaturedHero + FeaturedGrid — editorial 12-col home grid"
```

---

### Task 31: Wire home page (`/`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { Hero } from "@/components/Hero";
import { CategoryStrip } from "@/components/CategoryStrip";
import { FeaturedGrid } from "@/components/FeaturedGrid";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <FeaturedGrid />
    </>
  );
}
```

- [ ] **Step 2: Configure `next.config.mjs` for image domains**

Self-hosted images live under `/public/products/...` so no remote domains needed. But before T54 lands the real images, products reference `/products/<slug>/<n>.webp` paths that won't exist. Add a placeholder image so Next/Image doesn't error during dev.

Create `public/placeholder.webp` (any small webp will do — a 600x600 cream square). Quick generation in Node:

```bash
mkdir -p public
node -e "const c=Buffer.from('UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoBAAEAAUAmJZACdLoB+AAAUgAAAAA=','base64');require('fs').writeFileSync('public/placeholder.webp',c);"
```

- [ ] **Step 3: Add fallback handling in ProductCard, FeaturedHero, Hero**

Modify image src lines to fall back to `/placeholder.webp` when the file doesn't exist. Simplest: trust the path, but document that T54 must fill in the files before final build.

For now, in `next.config.mjs`, allow loading images even if the path is missing (dev only):

No code change required if files exist. Add a small note to README later.

- [ ] **Step 4: Verify**

```bash
npm run dev &
sleep 4
curl -s http://localhost:3000 | head -50
kill %1 2>/dev/null
```

Expected: page renders. Images may 404 until T54 — visible as broken-image icons; that's acceptable mid-build.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx public/placeholder.webp
git commit -m "feat(affiliate): home page — Hero + CategoryStrip + FeaturedGrid"
```

---

## M6 — Listing pages

### Task 32: `ListPage` controls — chips, sort, price slider

**Files:**
- Create: `src/components/ListPage.tsx`

- [ ] **Step 1: Write `src/components/ListPage.tsx`**

Port from [`pages.jsx:5-109`](.design-bundle/orderlink/project/pages.jsx). Convert routing from `go({...})` to Next `<Link>`s. The component takes the active category as a prop; it's a Client Component for filter state.

```tsx
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, findCategory } from "@/data/categories";
import { products } from "@/data/affiliate-products";
import { filterProducts, sortProducts, type SortKey } from "@/lib/search";
import { CategoryGlyph } from "./CategoryGlyph";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";
import { formatRupees } from "@/lib/format";

export function ListPage({
  activeCategory = "all",
  initialQuery = "",
}: {
  activeCategory?: string;
  initialQuery?: string;
}) {
  const [sort, setSort] = useState<SortKey>("curated");
  const [priceCap, setPriceCap] = useState(5000);
  const [query, setQuery] = useState(initialQuery);

  const cat = activeCategory !== "all" ? findCategory(activeCategory) : undefined;

  const filtered = useMemo(() => {
    const f = filterProducts(products, {
      category: cat?.id,
      query,
      maxPrice: priceCap,
    });
    return sortProducts(f, sort);
  }, [cat?.id, query, priceCap, sort]);

  return (
    <>
      <section
        className="rounded-ol px-8 py-9 my-6 flex items-center justify-between gap-6 flex-wrap"
        style={{ background: cat ? `oklch(0.96 0.04 ${cat.hue})` : "var(--color-ol-soft)" }}
      >
        <div>
          <div className="flex items-center gap-2 text-[13px] text-ol-muted mb-2">
            <Link href="/">Home</Link>
            <Icon name="chevron-right" size={12}/>
            <span>{cat ? cat.name : "All curated finds"}</span>
          </div>
          <h1 className="font-display font-bold tracking-tight m-0 text-[clamp(34px,4.5vw,56px)]" style={{ lineHeight: 1.05 }}>
            {cat ? cat.name : "Everything we love."}
          </h1>
          <p className="mt-2.5 text-[16px] text-ol-muted max-w-[540px]">
            {cat
              ? `${cat.tagline}. Curated picks tested by the OrderLink team.`
              : "Twelve weeks of weekly edits, all in one place. Updated every Friday."}
          </p>
        </div>
        {cat && (
          <div
            className="w-[120px] h-[120px] rounded-3xl flex items-center justify-center"
            style={{ background: `oklch(0.88 0.08 ${cat.hue})`, color: `oklch(0.32 0.15 ${cat.hue})` }}
          >
            <CategoryGlyph kind={cat.icon} size={56}/>
          </div>
        )}
      </section>

      <div className="flex gap-2 overflow-x-auto py-3 mb-2">
        {[{ id: "all", name: "All", icon: undefined } as const, ...categories].map(c => {
          const isActive = (c.id === "all" && !cat) || (cat && c.id === cat.id);
          const href = c.id === "all" ? "/shop" : `/shop/${c.id}`;
          return (
            <Link key={c.id} href={href}
              className={`inline-flex items-center gap-2 flex-shrink-0 px-3.5 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap border ${isActive ? "bg-ol-deep text-white border-ol-deep" : "bg-white text-ol-ink border-ol-deep/10"}`}>
              {c.icon && <CategoryGlyph kind={c.icon} size={16}/>}
              {c.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap py-4 border-t border-b border-ol-deep/10 mb-6">
        <div className="text-[14px] text-ol-muted">
          <strong className="text-ol-ink">{filtered.length}</strong> finds
          {query && <> matching “{query}”</>}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2.5 text-[13px] text-ol-muted">
            Search
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Filter by name…"
              className="bg-white border border-ol-deep/10 rounded-md px-3 py-1.5 text-[13px] text-ol-ink"
            />
          </label>
          <label className="flex items-center gap-2.5 text-[13px] text-ol-muted">
            Under <span className="text-ol-ink font-bold">{formatRupees(priceCap)}</span>
            <input
              type="range" min={500} max={5000} step={100}
              value={priceCap} onChange={e => setPriceCap(+e.target.value)}
              className="w-[140px] accent-ol-accent"
            />
          </label>
          <select
            value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="bg-white border border-ol-deep/10 px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-ol-ink cursor-pointer"
          >
            <option value="curated">Editor's pick</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>

      <div className="grid gap-[18px] mb-14" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {filtered.map(p => <ProductCard key={p.id} p={p}/>)}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-ol-muted py-12">
            No matches. Try widening the price filter or clearing the search.
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListPage.tsx
git commit -m "feat(affiliate): ListPage controls — chips, sort, price slider, search"
```

---

### Task 33: `/shop` page

**Files:**
- Create: `src/app/shop/page.tsx`

- [ ] **Step 1: Write `src/app/shop/page.tsx`**

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { ListPage } from "@/components/ListPage";

export const metadata: Metadata = {
  title: "Shop — every curated find",
  description: "Browse all 12 of OrderLink's curated finds across 8 sub-brands.",
};

function ShopInner({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  return <ListPage activeCategory="all" initialQuery={q}/>;
}

export default async function ShopPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const sp = await searchParams;
  return (
    <Suspense>
      <ShopInner searchParams={sp}/>
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify dev**

```bash
npm run dev &
sleep 4
curl -s "http://localhost:3000/shop?q=earbuds" | grep -i "earbuds" | head -1
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add src/app/shop/page.tsx
git commit -m "feat(affiliate): /shop — all-products list page"
```

---

### Task 34: `/shop/[category]` page

**Files:**
- Create: `src/app/shop/[category]/page.tsx`

- [ ] **Step 1: Write `src/app/shop/[category]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListPage } from "@/components/ListPage";
import { categories, findCategory } from "@/data/categories";

export function generateStaticParams() {
  return categories.map(c => ({ category: c.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {
  const { category } = await params;
  const cat = findCategory(category);
  if (!cat) return {};
  return {
    title: `${cat.name} — ${cat.tagline}`,
    description: `OrderLink's ${cat.name} edit: ${cat.tagline}, hand-tested and price-checked.`,
  };
}

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  if (!findCategory(category)) notFound();
  return <ListPage activeCategory={category}/>;
}
```

- [ ] **Step 2: Verify**

```bash
npm run build
```

Expected: build succeeds, includes 8 prerendered category pages + 1 `/shop` page.

- [ ] **Step 3: Commit**

```bash
git add src/app/shop/[category]/page.tsx
git commit -m "feat(affiliate): /shop/[category] — 8 prerendered category pages"
```

---

### Task 35: M6 sweep

```bash
npm run typecheck && npm test -- --run && npm run build
```

Expected: clean. No commit.

---

## M7 — Product detail (PDP)

### Task 36: `TrustItem` + `TrustStrip`

**Files:**
- Create: `src/components/TrustStrip.tsx`

- [ ] **Step 1: Write `src/components/TrustStrip.tsx`**

Port from [`pages.jsx:350-360`](.design-bundle/orderlink/project/pages.jsx).

```tsx
import { Icon } from "./Icon";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Icon>["name"];

function TrustItem({ icon, label, sub }: { icon: IconName; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-9 h-9 rounded-[10px] bg-ol-soft inline-flex items-center justify-center text-ol-deep">
        <Icon name={icon} size={16}/>
      </span>
      <div>
        <div className="font-bold text-[13px]">{label}</div>
        <div className="text-[12px] text-ol-muted">{sub}</div>
      </div>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="flex gap-[18px] pt-[18px] border-t border-ol-deep/10 flex-wrap">
      <TrustItem icon="shield"  label="Hand-tested"   sub="By our editors"/>
      <TrustItem icon="tag"     label="Price-checked" sub="Across 3 sites"/>
      <TrustItem icon="sparkle" label="Curated weekly" sub="47 new this week"/>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TrustStrip.tsx
git commit -m "feat(affiliate): TrustStrip — three trust badges on PDP"
```

---

### Task 37: `CommissionNote`

**Files:**
- Create: `src/components/CommissionNote.tsx`

- [ ] **Step 1: Write `src/components/CommissionNote.tsx`**

Port from [`pages.jsx:518-527`](.design-bundle/orderlink/project/pages.jsx).

```tsx
import { Icon } from "./Icon";

export function CommissionNote() {
  return (
    <div className="bg-orange-50 border border-dashed border-ol-accent/30 rounded-xl px-3.5 py-3 text-[12px] text-[#5A3B2C] flex gap-2.5 items-start mb-4 leading-snug">
      <Icon name="shield" size={14}/>
      <span>
        OrderLink may earn a small commission when you buy via our links — at no extra cost to you. It helps us keep curating.
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CommissionNote.tsx
git commit -m "feat(affiliate): CommissionNote — disclosure pill above merchants"
```

---

### Task 38: `ReelSlide` — IG-style video panel

**Files:**
- Create: `src/components/ReelSlide.tsx`

- [ ] **Step 1: Write `src/components/ReelSlide.tsx`**

Port the inner reel rendering from [`pages.jsx:409-477`](.design-bundle/orderlink/project/pages.jsx). The component is a Client Component (manages video element state). It exposes `togglePlay` and `playing` state via a ref-based forwardRef so the parent gallery can pause it on slide change.

```tsx
"use client";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Reel } from "@/data/affiliate-products";

export type ReelHandle = {
  pause: () => void;
};

type Props = {
  reel: Reel;
  poster?: string;
  productTitle: string;
  /** Caption to render under the handle. Falls back to "Hands-on with the {title} ✨". */
};

export const ReelSlide = forwardRef<ReelHandle, Props>(function ReelSlide(
  { reel, poster, productTitle }, ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useImperativeHandle(ref, () => ({
    pause: () => {
      const v = videoRef.current;
      if (v && !v.paused) v.pause();
      setPlaying(false);
    },
  }), []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const caption = reel.caption ?? `Hands-on with the ${productTitle.split(" ").slice(0, 5).join(" ")} ✨`;
  const audioLabel = reel.audioLabel ?? "Original audio · 1:24";
  const likes = reel.likes ?? "12.4K";
  const comments = reel.comments ?? "482";

  return (
    <div onClick={togglePlay} className="relative w-full h-full cursor-pointer">
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster ?? poster}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover block"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 55%, rgba(0,0,0,0.75) 100%)" }}
      />

      {/* IG header */}
      <div className="absolute top-3.5 left-3.5 right-14 flex items-center gap-2.5 text-white pointer-events-none">
        <span className="w-[30px] h-[30px] rounded-full inline-flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FEDA77,#F58529,#DD2A7B,#8134AF,#515BD4)" }}>
          <span className="w-[26px] h-[26px] rounded-full bg-black inline-flex items-center justify-center text-[11px] font-bold">OL</span>
        </span>
        <div className="min-w-0" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <div className="text-[13px] font-bold">orderlink</div>
          <div className="text-[10px] opacity-85">{audioLabel}</div>
        </div>
      </div>

      {/* Caption */}
      <div className="absolute left-3.5 right-14 bottom-4 text-white pointer-events-none" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
        <div className="text-[12px] leading-snug opacity-95">{caption}</div>
      </div>

      {/* Side actions */}
      <div className="absolute right-2.5 bottom-4 flex flex-col gap-3.5 text-white">
        {[
          { icon: "heart" as const,  label: likes },
          { icon: "comment" as const, label: comments },
          { icon: "share" as const,   label: "Share" },
        ].map(a => (
          <div key={a.label} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md inline-flex items-center justify-center">
              {a.icon === "heart"   && <Icon name="heart" size={15}/>}
              {a.icon === "comment" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              )}
              {a.icon === "share" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              )}
            </span>
            <span>{a.label}</span>
          </div>
        ))}
      </div>

      {/* Mute */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full bg-black/55 text-white backdrop-blur-md inline-flex items-center justify-center"
      >
        {muted ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        )}
      </button>

      {/* Big play */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-[68px] h-[68px] rounded-full bg-white/95 inline-flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-ol-deep)" stroke="none">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </span>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ReelSlide.tsx
git commit -m "feat(affiliate): ReelSlide — IG-style video panel with imperative pause handle"
```

---

### Task 39: `ProductGallery` — thumbs + main + reel-as-last-slide

**Files:**
- Create: `src/components/ProductGallery.tsx`
- Test: `tests/components/ProductGallery.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/ProductGallery.test.tsx
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ProductGallery } from "@/components/ProductGallery";
import type { AffiliateProduct } from "@/data/affiliate-products";

beforeAll(() => {
  // jsdom doesn't implement HTMLMediaElement methods — stub them
  Object.defineProperty(HTMLMediaElement.prototype, "play",  { value: vi.fn(), writable: true });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { value: vi.fn(), writable: true });
});

const baseProduct: AffiliateProduct = {
  id: "px", slug: "px", title: "Test Product", subtitle: "",
  category: "techland", price: 100, mrp: 200, rating: 4.5, reviewCount: 1,
  images: ["/a.webp", "/b.webp"],
  reel: { src: "/reel.mp4", caption: "test caption" },
  summary: "x", highlights: [], specs: [],
  merchants: [{ id: "amazon", label: "Amazon", price: 100, eta: "x", stock: "In stock", affiliateUrl: "x" }],
  reviews: [{ name: "x", rating: 5, date: "x", title: "x", body: "x" }],
};

const productNoReel: AffiliateProduct = { ...baseProduct, reel: undefined };

describe("ProductGallery", () => {
  it("renders one thumb per image plus reel thumb when product has reel", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    expect(container.querySelectorAll("[data-testid='thumb']")).toHaveLength(3);
    expect(container.querySelector("[data-testid='reel-thumb']")).not.toBeNull();
  });

  it("omits reel thumb when product has no reel", () => {
    const { container } = render(<ProductGallery product={productNoReel}/>);
    expect(container.querySelectorAll("[data-testid='thumb']")).toHaveLength(2);
    expect(container.querySelector("[data-testid='reel-thumb']")).toBeNull();
  });

  it("clicking a thumb makes it the active slide", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const thumbs = container.querySelectorAll("[data-testid='thumb']");
    fireEvent.click(thumbs[1]);
    expect(thumbs[1].getAttribute("data-active")).toBe("true");
  });

  it("clicking the reel thumb activates the reel slide", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const reelThumb = container.querySelector("[data-testid='reel-thumb']") as HTMLElement;
    fireEvent.click(reelThumb);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("navigating away from reel pauses the video", () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause");
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const reelThumb = container.querySelector("[data-testid='reel-thumb']") as HTMLElement;
    fireEvent.click(reelThumb);
    const firstThumb = container.querySelector("[data-testid='thumb']") as HTMLElement;
    fireEvent.click(firstThumb);
    expect(pauseSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Write `src/components/ProductGallery.tsx`**

Port the gallery container from [`pages.jsx:328-503`](.design-bundle/orderlink/project/pages.jsx). The video is a child component (`ReelSlide`); the gallery owns the active-slide state and pause-on-leave effect.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { ReelSlide, type ReelHandle } from "./ReelSlide";
import type { AffiliateProduct } from "@/data/affiliate-products";

type Slide = { type: "img"; src: string } | { type: "reel" };

export function ProductGallery({ product }: { product: AffiliateProduct }) {
  const slides: Slide[] = [
    ...product.images.map(src => ({ type: "img" as const, src })),
    ...(product.reel ? [{ type: "reel" as const }] : []),
  ];
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const reelRef = useRef<ReelHandle | null>(null);
  const current = slides[idx] ?? slides[0];
  const isReel = current.type === "reel";

  // Auto-pause when navigating away from reel
  useEffect(() => {
    if (!isReel) reelRef.current?.pause();
  }, [isReel]);

  return (
    <div className="ol-gallery flex gap-3.5 max-md:flex-col-reverse">
      {/* Thumbs */}
      <div className="ol-thumbs flex flex-col gap-2.5 flex-shrink-0 max-md:flex-row max-md:overflow-x-auto">
        {slides.map((s, i) => {
          const isActive = i === idx;
          if (s.type === "img") {
            return (
              <button
                key={`img-${i}`}
                type="button"
                data-testid="thumb"
                data-active={isActive}
                onClick={() => setIdx(i)}
                className={`w-[70px] h-[70px] rounded-[10px] overflow-hidden p-0 border-2 cursor-pointer bg-ol-soft flex-shrink-0 ${isActive ? "border-ol-accent" : "border-transparent"}`}
              >
                <Image src={s.src} alt="" width={70} height={70} className="w-full h-full object-cover"/>
              </button>
            );
          }
          // reel thumb
          return (
            <button
              key="reel-thumb"
              type="button"
              data-testid="reel-thumb"
              data-active={isActive}
              onClick={() => setIdx(i)}
              className={`relative w-[70px] h-[70px] rounded-[10px] overflow-hidden p-0 border-2 cursor-pointer bg-black flex-shrink-0 ${isActive ? "border-ol-accent" : "border-transparent"}`}
              aria-label="Play reel"
            >
              <Image src={product.images[0]} alt="" width={70} height={70} className="w-full h-full object-cover opacity-70"/>
              <span className="absolute inset-0 flex items-center justify-center text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </span>
              <span className="absolute top-1 left-1 text-[8px] font-extrabold tracking-wider text-white px-1.5 py-0.5 rounded uppercase"
                    style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B, #515BD4)" }}>
                Reel
              </span>
            </button>
          );
        })}
      </div>

      {/* Main pane */}
      <div
        className={`flex-1 relative rounded-ol overflow-hidden ${isReel ? "bg-black" : "bg-ol-soft"}`}
        style={{ aspectRatio: isReel ? "9 / 14" : "4 / 5", transition: "aspect-ratio 0.3s" }}
      >
        {!isReel ? (
          <Image src={(current as { type: "img"; src: string }).src} alt="" fill sizes="(max-width: 880px) 100vw, 50vw" className="object-cover"/>
        ) : (
          product.reel && (
            <ReelSlide
              ref={reelRef}
              reel={product.reel}
              poster={product.images[0]}
              productTitle={product.title}
            />
          )
        )}

        {product.badge && !isReel && (
          <span className="absolute top-4 left-4 bg-ol-deep text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
            {product.badge}
          </span>
        )}

        <IconButton
          aria-label="Previous slide"
          onClick={() => setIdx((idx + total - 1) % total)}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10"
        >
          <Icon name="arrow-left" size={16}/>
        </IconButton>
        <IconButton
          aria-label="Next slide"
          onClick={() => setIdx((idx + 1) % total)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10"
        >
          <Icon name="arrow-right" size={16}/>
        </IconButton>

        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
             style={{ bottom: isReel ? 76 : 14 }}>
          {slides.map((_, i) => (
            <span key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 18 : 6,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.5)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run test, verify pass**

```bash
npm test -- --run tests/components/ProductGallery.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProductGallery.tsx tests/components/ProductGallery.test.tsx
git commit -m "feat(affiliate): ProductGallery — thumbs + main + reel-as-last-slide"
```

---

### Task 40: `MerchantList` — Best prices today panel

**Files:**
- Create: `src/components/MerchantList.tsx`

- [ ] **Step 1: Write `src/components/MerchantList.tsx`**

Port from [`pages.jsx:181-208`](.design-bundle/orderlink/project/pages.jsx). The "Go to merchant" button becomes a `<Link>` to `/go/[productId]/[merchantId]`.

```tsx
import Link from "next/link";
import { MerchantLogo } from "./MerchantLogo";
import { Icon } from "./Icon";
import { formatRupees } from "@/lib/format";
import type { AffiliateProduct } from "@/data/affiliate-products";

export function MerchantList({ product }: { product: AffiliateProduct }) {
  return (
    <div className="bg-white border border-ol-deep/10 rounded-ol overflow-hidden mb-4">
      <div className="px-4 py-3.5 bg-ol-soft flex justify-between items-center">
        <strong className="text-[14px]">Best prices today</strong>
        <span className="text-[12px] text-ol-muted">Updated 2 hrs ago</span>
      </div>
      {product.merchants.map((m, i) => (
        <div key={m.id}
          className={`p-[18px] flex items-center justify-between gap-4 flex-wrap ${i ? "border-t border-ol-deep/[0.07]" : ""}`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <MerchantLogo id={m.id} height={26}/>
            <div>
              <div className="font-bold text-[18px] font-display tracking-tight">{formatRupees(m.price)}</div>
              <div className="text-[12px] text-ol-muted flex gap-2.5">
                <span className="inline-flex items-center gap-1"><Icon name="truck" size={11}/> {m.eta}</span>
                <span className={`inline-flex items-center gap-1 ${m.stock === "Few left" ? "text-ol-warn" : "text-ol-success"}`}>
                  <Icon name="check" size={11}/> {m.stock}
                </span>
              </div>
            </div>
          </div>
          <Link href={`/go/${product.id}/${m.id}`}
            className="inline-flex items-center gap-2 bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px] px-4 py-2.5 rounded-full">
            Go to {m.label} <Icon name="external" size={14}/>
          </Link>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MerchantList.tsx
git commit -m "feat(affiliate): MerchantList — best-prices panel with /go links"
```

---

### Task 41: `ProductTabs` (overview / specs / reviews)

**Files:**
- Create: `src/components/ProductTabs.tsx`

- [ ] **Step 1: Write `src/components/ProductTabs.tsx`**

Port from [`pages.jsx:222-333`](.design-bundle/orderlink/project/pages.jsx). The tab body subviews (overview, specs, reviews) live in this single component.

```tsx
"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { Stars } from "./Stars";
import type { AffiliateProduct } from "@/data/affiliate-products";

type Tab = "overview" | "specs" | "reviews";

export function ProductTabs({ product }: { product: AffiliateProduct }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [
    ["overview", "Why we love it"],
    ["specs",    "Specs"],
    ["reviews",  `Reviews (${product.reviewCount.toLocaleString("en-IN")})`],
  ];

  return (
    <div className="border-t border-ol-deep/10 mb-8">
      <div className="flex gap-1 py-2 overflow-x-auto" role="tablist">
        {tabs.map(([k, label]) => {
          const active = tab === k;
          return (
            <button key={k} role="tab" aria-selected={active}
              onClick={() => setTab(k)}
              className={`px-4 py-3 rounded-xl font-semibold text-[14px] whitespace-nowrap border ${active ? "bg-white border-ol-deep/15 text-ol-ink" : "bg-transparent border-transparent text-ol-muted"}`}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewBody p={product}/>}
      {tab === "specs"    && <SpecsBody    p={product}/>}
      {tab === "reviews"  && <ReviewsBody  p={product}/>}
    </div>
  );
}

function OverviewBody({ p }: { p: AffiliateProduct }) {
  return (
    <div className="grid gap-10 mb-14 ol-detail-grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
      <div>
        <h3 className="font-display text-[24px] tracking-tight mt-0 mb-3.5">Why we love it</h3>
        <p className="text-[17px] leading-relaxed text-[#3A3D52] m-0 mb-5 max-w-[680px]" style={{ textWrap: "pretty" }}>
          {p.summary} Our editors spent two weeks with this one before adding it to the edit — durability tested, price tracked, and compared against four similar finds.
        </p>
        <div className="border-l-[3px] border-ol-accent pl-4 my-6 max-w-[600px]">
          <p className="font-display italic text-[18px] leading-snug text-ol-ink m-0">
            "The kind of buy where you wonder how you lived without it. Not flashy, just genuinely good."
          </p>
          <div className="mt-2.5 text-[13px] text-ol-muted">— Asha N., OrderLink curator</div>
        </div>
      </div>
      <div className="bg-white border border-ol-deep/10 rounded-ol p-6">
        <h4 className="font-display text-[18px] m-0 mb-4 tracking-tight">Highlights</h4>
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {p.highlights.map(h => (
            <li key={h} className="flex gap-3 text-[14px] leading-snug">
              <span className="flex-shrink-0 text-ol-accent mt-px"><Icon name="check" size={16} stroke={2.4}/></span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        {p.colors && p.colors.length > 0 && (
          <>
            <div className="h-px bg-ol-deep/10 my-5"/>
            <div className="text-[13px] font-semibold mb-2.5">Available in</div>
            <div className="flex gap-2">
              {p.colors.map((c, i) => (
                <span key={i} title={c} className="w-7 h-7 rounded-full border border-ol-deep/15" style={{ background: c }}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SpecsBody({ p }: { p: AffiliateProduct }) {
  return (
    <div className="mb-14 max-w-[720px]">
      <h3 className="font-display text-[24px] tracking-tight mt-0 mb-4.5">Specs</h3>
      <div className="bg-white border border-ol-deep/10 rounded-ol overflow-hidden">
        {p.specs.map(([k, v], i) => (
          <div key={k} className={`flex justify-between px-5 py-3.5 text-[14px] ${i ? "border-t border-ol-deep/[0.06]" : ""}`}>
            <span className="text-ol-muted">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsBody({ p }: { p: AffiliateProduct }) {
  // 5-bucket histogram: deterministic distribution mock weighted toward top
  const dist = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 } as const;
  return (
    <div className="grid gap-10 mb-14 ol-detail-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}>
      <div className="bg-white border border-ol-deep/10 rounded-ol p-7 self-start">
        <div className="font-display font-bold text-[56px] tracking-tight leading-none">{p.rating}</div>
        <Stars value={p.rating} size={18}/>
        <div className="text-[14px] text-ol-muted mt-2">Based on {p.reviewCount.toLocaleString("en-IN")} verified reviews</div>
        <div className="mt-5 flex flex-col gap-2">
          {[5, 4, 3, 2, 1].map(s => {
            const pct = dist[s as keyof typeof dist];
            return (
              <div key={s} className="flex items-center gap-2.5 text-[12px]">
                <span className="w-3">{s}</span>
                <Icon name="star" size={11}/>
                <div className="flex-1 h-1.5 bg-ol-soft rounded-full overflow-hidden">
                  <div className="h-full bg-ol-accent" style={{ width: `${pct}%` }}/>
                </div>
                <span className="w-8 text-right text-ol-muted">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {p.reviews.map((r, i) => (
          <div key={i} className="bg-white border border-ol-deep/10 rounded-ol p-5">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-ol-deep text-white inline-flex items-center justify-center font-bold text-[14px]">{r.name[0]}</span>
                <div>
                  <div className="font-semibold text-[14px]">{r.name}</div>
                  <div className="text-[12px] text-ol-muted">{r.date}</div>
                </div>
              </div>
              <Stars value={r.rating} size={14}/>
            </div>
            <h4 className="m-0 mt-2 mb-1.5 font-display text-[16px] tracking-tight">{r.title}</h4>
            <p className="m-0 text-[14px] leading-relaxed text-[#3A3D52]">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductTabs.tsx
git commit -m "feat(affiliate): ProductTabs — overview / specs / reviews + rating histogram"
```

---

### Task 42: `RelatedGrid`

**Files:**
- Create: `src/components/RelatedGrid.tsx`

- [ ] **Step 1: Write `src/components/RelatedGrid.tsx`**

Port from [`pages.jsx:336-343`](.design-bundle/orderlink/project/pages.jsx).

```tsx
import { ProductCard } from "./ProductCard";
import { SectionHead } from "./SectionHead";
import { relatedProducts } from "@/data/affiliate-products";
import { findCategory } from "@/data/categories";
import type { AffiliateProduct } from "@/data/affiliate-products";

export function RelatedGrid({ product }: { product: AffiliateProduct }) {
  const list = relatedProducts(product);
  if (list.length === 0) return null;
  const cat = findCategory(product.category);
  return (
    <section className="mb-14">
      <SectionHead eyebrow={`More from ${cat?.name ?? ""}`} title="You'll probably like these too"/>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {list.map(rp => <ProductCard key={rp.id} p={rp}/>)}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RelatedGrid.tsx
git commit -m "feat(affiliate): RelatedGrid — more from same category"
```

---

### Task 43: PDP page `/p/[slug]` + Product JSON-LD

**Files:**
- Create: `src/app/p/[slug]/page.tsx`
- Create: `src/lib/jsonld.ts`

- [ ] **Step 1: Write `src/lib/jsonld.ts`**

```ts
import type { AffiliateProduct } from "@/data/affiliate-products";

export function productJsonLd(p: AffiliateProduct, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary,
    image: p.images.map(i => baseUrl + i),
    sku: p.id,
    brand: { "@type": "Brand", name: "OrderLink" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviewCount,
    },
    offers: p.merchants.map(m => ({
      "@type": "Offer",
      url: `${baseUrl}/go/${p.id}/${m.id}`,
      priceCurrency: "INR",
      price: m.price,
      availability: m.stock === "Out of stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: m.label },
    })),
    review: p.reviews.map(r => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: r.name },
      name: r.title,
      reviewBody: r.body,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: i.name,
      item: i.url,
    })),
  };
}
```

- [ ] **Step 2: Write `src/app/p/[slug]/page.tsx`**

Port from [`pages.jsx:112-348`](.design-bundle/orderlink/project/pages.jsx).

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Stars } from "@/components/Stars";
import { Price } from "@/components/Price";
import { ProductGallery } from "@/components/ProductGallery";
import { MerchantList } from "@/components/MerchantList";
import { CommissionNote } from "@/components/CommissionNote";
import { TrustStrip } from "@/components/TrustStrip";
import { ProductTabs } from "@/components/ProductTabs";
import { RelatedGrid } from "@/components/RelatedGrid";
import { findProduct, products } from "@/data/affiliate-products";
import { findCategory } from "@/data/categories";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

const SITE = "https://orderlink.in";

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    openGraph: {
      title: p.title,
      description: p.summary,
      images: [{ url: p.images[0], width: 1200, height: 630 }],
    },
  };
}

export default async function PdpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) notFound();

  const cat = findCategory(p.category);
  const productLd = productJsonLd(p, SITE);
  const crumbsLd = breadcrumbJsonLd([
    { name: "Home", url: SITE },
    { name: cat?.name ?? "Shop", url: `${SITE}/shop/${p.category}` },
    { name: p.title, url: `${SITE}/p/${p.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}/>

      <div className="flex items-center gap-2 text-[13px] text-ol-muted py-5 flex-wrap">
        <Link href="/">Home</Link>
        <Icon name="chevron-right" size={12}/>
        <Link href={`/shop/${p.category}`}>{cat?.name}</Link>
        <Icon name="chevron-right" size={12}/>
        <span className="text-ol-ink">{p.title}</span>
      </div>

      <div className="grid gap-10 items-start mb-14 ol-detail-grid"
           style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)" }}>
        <ProductGallery product={p}/>

        <div>
          <div className="inline-flex items-center gap-2 text-ol-muted text-[13px] font-semibold uppercase tracking-[0.1em] mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `oklch(0.55 0.18 ${cat?.hue ?? 0})` }}/>
            {cat?.name}
          </div>
          <h1 className="font-display font-bold tracking-tight m-0 mb-2.5 text-[clamp(28px,3vw,40px)]"
              style={{ lineHeight: 1.1, textWrap: "balance" }}>
            {p.title}
          </h1>
          <p className="text-[16px] text-ol-muted m-0 mb-5">{p.subtitle}</p>

          <div className="flex items-center gap-3.5 mb-5">
            <Stars value={p.rating} size={16}/>
            <span className="text-[14px] font-semibold">{p.rating}</span>
            <span className="text-[14px] text-ol-muted">· {p.reviewCount.toLocaleString("en-IN")} reviews</span>
          </div>

          <div className="mb-6"><Price value={p.price} mrp={p.mrp} size="xl"/></div>

          <MerchantList product={p}/>
          <CommissionNote/>
          <TrustStrip/>
        </div>
      </div>

      <ProductTabs product={p}/>
      <RelatedGrid product={p}/>
    </>
  );
}
```

- [ ] **Step 3: Add mobile breakpoint helpers to globals.css**

Append to `src/app/globals.css`:

```css
@media (max-width: 880px) {
  .ol-detail-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```

Expected: 12 product pages + 8 category + /shop + / + healthz + opengraph endpoint.

- [ ] **Step 5: Commit**

```bash
git add src/app/p/[slug]/page.tsx src/lib/jsonld.ts src/app/globals.css
git commit -m "feat(affiliate): PDP — gallery, merchants, tabs, related, JSON-LD"
```

---

### Task 44: M7 sweep

```bash
npm run typecheck && npm test -- --run && npm run build
```

Expected: ≥30 tests, build succeeds.

---

## M8 — Redirect flow

### Task 45: `RedirectInterstitial` client component

**Files:**
- Create: `src/components/RedirectInterstitial.tsx`
- Test: `tests/components/RedirectInterstitial.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/RedirectInterstitial.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { RedirectInterstitial } from "@/components/RedirectInterstitial";

const merchant = { id: "amazon" as const, label: "Amazon", price: 1299, eta: "Tomorrow", stock: "In stock" as const, affiliateUrl: "https://example.test/" };
const product = {
  id:"p1", slug:"p", title:"Test", subtitle:"", category:"techland" as const,
  price:1299, mrp:2999, rating:4.5, reviewCount:1, images:["/x.webp"],
  summary:"x", highlights:[], specs:[], merchants:[merchant],
  reviews:[{name:"x",rating:5 as const,date:"x",title:"x",body:"x"}],
};

describe("RedirectInterstitial", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders confirmed price + ETA + merchant", () => {
    const { container } = render(<RedirectInterstitial product={product} merchant={merchant}/>);
    expect(container.textContent).toContain("Off you go!");
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).toContain("Tomorrow");
  });

  it("countdown reaches 0 then redirects via window.location.assign", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<RedirectInterstitial product={product} merchant={merchant}/>);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(assign).toHaveBeenCalledWith("https://example.test/");
  });

  it("shows fallback message when affiliateUrl looks like a placeholder", () => {
    const ph = { ...merchant, affiliateUrl: "https://www.amazon.in/?tag=PLACEHOLDER" };
    const { container } = render(<RedirectInterstitial product={product} merchant={ph}/>);
    expect(container.textContent).toContain("Link not yet available");
  });
});
```

- [ ] **Step 2: Write `src/components/RedirectInterstitial.tsx`**

Port from [`pages.jsx:529-590`](.design-bundle/orderlink/project/pages.jsx). Convert from modal to full-page panel; replace the close-button-back-to-product with a Next `<Link>`.

```tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { MerchantLogo } from "./MerchantLogo";
import { formatRupees } from "@/lib/format";
import type { AffiliateProduct, Merchant } from "@/data/affiliate-products";

const COUNTDOWN_SECONDS = 4;

export function RedirectInterstitial({
  product, merchant,
}: { product: AffiliateProduct; merchant: Merchant }) {
  const isPlaceholder = /PLACEHOLDER/i.test(merchant.affiliateUrl);
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (isPlaceholder) return;
    if (count <= 0) {
      window.location.assign(merchant.affiliateUrl);
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, merchant.affiliateUrl, isPlaceholder]);

  return (
    <div className="fixed inset-0 z-[200] bg-ol-deep/60 backdrop-blur-md flex items-center justify-center p-5 animate-ol-fade">
      <div className="bg-white rounded-[22px] px-9 py-10 max-w-[460px] w-full text-center relative shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]">
        <Link href={`/p/${product.slug}`} aria-label="Back to product"
          className="absolute top-3.5 right-3.5 inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10 text-ol-ink">
          <Icon name="close" size={16}/>
        </Link>

        <div className="w-20 h-20 rounded-full mx-auto mb-5 bg-ol-soft flex items-center justify-center relative">
          <Image src={product.images[0]} alt="" width={56} height={56} className="rounded-full object-cover"/>
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-ol-accent flex items-center justify-center">
            <Icon name="arrow-right" size={14} stroke={2.4}/>
          </span>
        </div>

        <h2 className="font-display font-bold text-[28px] tracking-tight m-0 mb-2" style={{ textWrap: "balance" }}>
          {isPlaceholder ? "Link not yet available" : "Off you go!"}
        </h2>
        <p className="text-[15px] text-ol-muted m-0 mb-6 leading-snug">
          {isPlaceholder ? (
            <>This affiliate link hasn't been set up yet. We'll get it sorted soon.</>
          ) : (
            <>We're sending you to <MerchantLogo id={merchant.id} height={18}/> to complete your purchase. You'll land on the exact product page.</>
          )}
        </p>

        {!isPlaceholder && (
          <>
            <div className="bg-ol-soft rounded-[14px] p-4.5 mb-6 flex justify-between items-center gap-3 flex-wrap text-left">
              <div>
                <div className="text-[12px] text-ol-muted mb-0.5">Confirmed price</div>
                <div className="font-display font-bold text-[24px] tracking-tight">{formatRupees(merchant.price)}</div>
              </div>
              <div className="text-right text-[12px] text-ol-muted">
                <div><Icon name="truck" size={11}/> {merchant.eta}</div>
                <div className="mt-0.5">{merchant.stock}</div>
              </div>
            </div>

            <a
              href={merchant.affiliateUrl}
              className="block w-full text-center bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px] py-3.5 rounded-full"
            >
              {count > 0 ? <>Redirecting in {count}s…</> : <>Take me there</>}
            </a>
          </>
        )}

        <Link href={`/p/${product.slug}`}
          className="block bg-transparent border-0 text-ol-muted text-[13px] mt-3.5 underline">
          Stay on OrderLink
        </Link>

        <div className="mt-5 text-[11px] text-ol-muted leading-snug">
          OrderLink earns a small commission on qualifying purchases. <br/>The price you pay does not change.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run, verify pass, commit**

```bash
npm test -- --run tests/components/RedirectInterstitial.test.tsx
git add src/components/RedirectInterstitial.tsx tests/components/RedirectInterstitial.test.tsx
git commit -m "feat(affiliate): RedirectInterstitial — countdown + window.location.assign"
```

---

### Task 46: `/go/[productId]/[merchantId]` route

**Files:**
- Create: `src/app/go/[productId]/[merchantId]/page.tsx`

- [ ] **Step 1: Write the route**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct, products, type MerchantId } from "@/data/affiliate-products";
import { RedirectInterstitial } from "@/components/RedirectInterstitial";

const VALID_MERCHANTS: MerchantId[] = ["amazon", "myntra", "nykaa"];

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Redirecting…",
};

export function generateStaticParams() {
  const out: { productId: string; merchantId: MerchantId }[] = [];
  for (const p of products) {
    for (const m of p.merchants) out.push({ productId: p.id, merchantId: m.id });
  }
  return out;
}

export default async function GoPage(
  { params }: { params: Promise<{ productId: string; merchantId: string }> }
) {
  const { productId, merchantId } = await params;
  if (!VALID_MERCHANTS.includes(merchantId as MerchantId)) notFound();

  const product = products.find(p => p.id === productId);
  if (!product) notFound();

  const merchant = product.merchants.find(m => m.id === merchantId);
  if (!merchant) notFound();

  return <RedirectInterstitial product={product} merchant={merchant}/>;
}
```

- [ ] **Step 2: Verify build prerenders all combinations**

```bash
npm run build 2>&1 | grep -E "/go/|/p/" | head -20
```

Expected: each `(product, merchant)` pair listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/go/[productId]/[merchantId]/page.tsx
git commit -m "feat(affiliate): /go/[productId]/[merchantId] — interstitial route, noindex"
```

---

### Task 47: 404 pages

**Files:**
- Create: `src/app/not-found.tsx`
- Create: `src/app/p/[slug]/not-found.tsx`
- Create: `src/app/go/[productId]/[merchantId]/not-found.tsx`

- [ ] **Step 1: Write `src/app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <h1 className="font-display text-[clamp(48px,8vw,96px)] font-bold tracking-tight">404.</h1>
      <p className="text-[18px] text-ol-muted max-w-[460px] mt-2 mb-8">
        This page got lost on the way to the merchant. Let's get you back to the curated finds.
      </p>
      <Link href="/"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px]">
        Back to home
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Write `src/app/p/[slug]/not-found.tsx`**

```tsx
import Link from "next/link";
import { categories } from "@/data/categories";

export default function ProductNotFound() {
  return (
    <main className="min-h-[50vh] py-16">
      <h1 className="font-display text-[36px] font-bold tracking-tight">Can't find that find.</h1>
      <p className="text-[16px] text-ol-muted max-w-[560px] mt-2 mb-8">
        That product isn't in our edit. Browse a sub-brand instead — every shelf is hand-tested.
      </p>
      <div className="flex flex-wrap gap-2.5">
        {categories.map(c => (
          <Link key={c.id} href={`/shop/${c.id}`}
            className="px-4 py-2 rounded-full bg-white border border-ol-deep/10 text-[13px] font-semibold hover:border-ol-accent">
            {c.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write `src/app/go/[productId]/[merchantId]/not-found.tsx`**

This 404 immediately redirects to `/` (per spec §6: "since these are usually scraper bots").

```tsx
import { redirect } from "next/navigation";
export default function GoNotFound(): never { redirect("/"); }
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/not-found.tsx src/app/p/[slug]/not-found.tsx src/app/go/[productId]/[merchantId]/not-found.tsx
git commit -m "feat(affiliate): 404 pages — global, product-not-found, /go redirect-to-home"
```

---

## M9 — Policy pages

### Task 48: New `PolicyPage` shared layout (affiliate tone)

**Files:**
- Create: `src/components/PolicyPage.tsx`
- Create: `src/lib/legal.ts`

- [ ] **Step 1: Write `src/lib/legal.ts`**

Pull just the fields the affiliate site actually needs (no GST, CIN — those belong to the dropshipping company; the affiliate site is informational).

```ts
export const LEGAL = {
  brand: "OrderLink",
  domain: "orderlink.in",
  supportEmail: "hi@orderlink.in",
  editorialEmail: "editor@orderlink.in",
};
```

- [ ] **Step 2: Write `src/components/PolicyPage.tsx`**

```tsx
import { LEGAL } from "@/lib/legal";

export function PolicyPage({
  title, updated, children,
}: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-16 font-sans text-ol-ink leading-relaxed">
      <header className="mb-10">
        <p className="text-[12px] uppercase tracking-[0.14em] text-ol-muted">Last updated: {updated}</p>
        <h1 className="font-display font-bold text-[clamp(36px,5vw,52px)] tracking-tight mt-2">{title}</h1>
      </header>
      <article
        className="
          [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3
          [&_p]:my-3
          [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-3 [&_ul>li]:mb-1
          [&_a]:text-ol-accent [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:no-underline
        "
      >
        {children}
      </article>
      <footer className="mt-16 pt-6 border-t border-ol-deep/10 font-sans text-[13px] text-ol-muted space-y-1">
        <p>{LEGAL.brand} · {LEGAL.domain}</p>
        <p>
          Editorial &amp; corrections:{" "}
          <a href={`mailto:${LEGAL.editorialEmail}`} className="text-ol-accent underline underline-offset-4 hover:no-underline">
            {LEGAL.editorialEmail}
          </a>
        </p>
      </footer>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PolicyPage.tsx src/lib/legal.ts
git commit -m "feat(affiliate): PolicyPage shared layout + legal constants"
```

---

### Task 49: Seven policy pages

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/affiliate-disclosure/page.tsx`
- Create: `src/app/editorial-policy/page.tsx`
- Create: `src/app/how-we-curate/page.tsx`

For each page below, write the file with `metadata` + `<PolicyPage>` wrapper + the body shown. Commit all 7 together at the end.

- [ ] **Step 1: `src/app/about/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "About",
  description: "OrderLink is a small editorial team that hand-tests products and sends you to the best price.",
};

export default function About() {
  return (
    <PolicyPage title="About OrderLink" updated="2026-05-02">
      <p>
        OrderLink is a small editorial team based in India. We test products, take notes, and put the ones we'd actually buy into a weekly edit. When you click through, we send you to whichever big retailer (Amazon, Myntra, Nykaa) currently has the best price. We earn a small commission; the price you pay doesn't change.
      </p>
      <h2>Why we're not a store</h2>
      <p>
        We tried that. Running a store means inventory, returns, customer support, payment disputes, and a hundred other things that have nothing to do with picking good products. By stepping back to curation only, we get to spend the time on the part we're useful at: figuring out which version of "the" earbuds, prayer mat, lip oil, or notebook is actually worth your money.
      </p>
      <h2>How we make money</h2>
      <p>
        Affiliate commissions, full stop. No sponsored slots, no paid placements, no "promoted" products in the edit. If something is in our edit, our team bought it with their own card and used it.
      </p>
      <h2>Reach us</h2>
      <p>
        Email us at <a href="mailto:hi@orderlink.in">hi@orderlink.in</a> if a link is broken, a price is wrong, or you want us to try something.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 2: `src/app/contact/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Contact", description: "Reach the OrderLink editorial team." };

export default function Contact() {
  return (
    <PolicyPage title="Contact" updated="2026-05-02">
      <p>We're a small team — every email reaches a person.</p>
      <h2>For everything</h2>
      <p><a href="mailto:hi@orderlink.in">hi@orderlink.in</a> — broken links, price mismatches, suggestions.</p>
      <h2>Editorial &amp; corrections</h2>
      <p><a href="mailto:editor@orderlink.in">editor@orderlink.in</a> — review pitches, factual corrections.</p>
      <p>We aim to reply within two working days.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 3: `src/app/affiliate-disclosure/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Affiliate disclosure" };

export default function AffiliateDisclosure() {
  return (
    <PolicyPage title="Affiliate disclosure" updated="2026-05-02">
      <p>
        OrderLink is an affiliate marketplace. When you click "Go to Amazon" (or Myntra, or Nykaa) on a product page, you're sent through a link that tells the merchant we referred you. If you buy, the merchant pays us a small commission. The price you pay does not change.
      </p>
      <h2>Why we disclose</h2>
      <p>
        Because you deserve to know. The Indian Advertising Standards Council and US FTC both require it; we'd do it anyway. Our editorial choices are not influenced by which merchant pays the highest commission — we pick whoever has the best combination of price, stock, and delivery on a given day.
      </p>
      <h2>What we never do</h2>
      <ul>
        <li>Take payment to feature a product</li>
        <li>Disguise sponsored placements as editorial</li>
        <li>Sort merchants by commission rate</li>
        <li>Hide the disclosure</li>
      </ul>
      <h2>Questions</h2>
      <p>Email <a href="mailto:editor@orderlink.in">editor@orderlink.in</a> if anything looks off.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 4: `src/app/editorial-policy/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Editorial policy" };

export default function EditorialPolicy() {
  return (
    <PolicyPage title="Editorial policy" updated="2026-05-02">
      <p>The rules we hold ourselves to so the edit stays trustworthy.</p>
      <h2>What we consider</h2>
      <ul>
        <li>Does it actually do the thing it claims to?</li>
        <li>Is it well-made enough to last beyond the warranty?</li>
        <li>Is the merchant reliable on delivery, returns, and stock?</li>
        <li>Is it priced fairly relative to alternatives we tested?</li>
      </ul>
      <h2>What we don't consider</h2>
      <ul>
        <li>Commission rate</li>
        <li>Whether the brand asked us to feature it</li>
        <li>How much the brand spends on advertising</li>
      </ul>
      <h2>How we test</h2>
      <p>
        For most products, our editors live with them for two weeks before adding them to the edit. For perishables and beauty products, we test on multiple skin types where it matters. We also keep a four-week "watch list" before declaring something a Bestseller or Editor's pick.
      </p>
      <h2>Corrections</h2>
      <p>
        If we got something wrong — a spec, a price comparison, a claim — email <a href="mailto:editor@orderlink.in">editor@orderlink.in</a>. We'll update the page and add a "corrected on" stamp.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 5: `src/app/how-we-curate/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "How we curate" };

export default function HowWeCurate() {
  return (
    <PolicyPage title="How we curate" updated="2026-05-02">
      <p>The pipeline from "interesting product" to "in this week's edit."</p>
      <h2>1. Scout</h2>
      <p>
        We watch trends across Amazon India, Myntra, and Nykaa, plus Instagram and trending-product reports. About 50 candidates a week reach our shortlist.
      </p>
      <h2>2. Buy</h2>
      <p>
        Editors order finalists with their own cards from the merchant they'd recommend. We don't accept review samples — paid samples create incentives we'd rather not manage.
      </p>
      <h2>3. Test</h2>
      <p>
        Two weeks of real use. We score on durability, claimed-vs-actual specs, and how it compares to alternatives we already tested.
      </p>
      <h2>4. Compare</h2>
      <p>
        On launch day we re-check prices and ETAs across all three retailers. The "best price today" panel updates from a periodic re-check (manual right now; eventually automated).
      </p>
      <h2>5. Publish</h2>
      <p>
        The edit goes live each Friday morning. Subscribe to the newsletter at the bottom of the page if you want it in your inbox.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 6: `src/app/privacy/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <PolicyPage title="Privacy" updated="2026-05-02">
      <p>This is the short version because we don't actually collect much.</p>
      <h2>What we don't collect</h2>
      <ul>
        <li>Accounts. There aren't any.</li>
        <li>Carts, addresses, payment info. The merchant handles checkout, not us.</li>
        <li>Server-side cookies for tracking. We don't set any.</li>
      </ul>
      <h2>What we do collect</h2>
      <ul>
        <li><strong>Wishlist:</strong> stored in your browser's localStorage. Stays on your device. Clearing browser data clears it.</li>
        <li><strong>Newsletter signup (when implemented):</strong> just your email. Unsubscribe in one click from any email.</li>
        <li><strong>Outbound clicks (when implemented):</strong> aggregate counts only — "X people clicked through to merchant Y this week". No personally identifiable information.</li>
      </ul>
      <h2>Third parties</h2>
      <p>
        When you click "Go to Amazon", you go to Amazon. Their privacy policy applies from that point. Same for Myntra and Nykaa.
      </p>
      <h2>Sentry</h2>
      <p>
        We use Sentry to capture site errors. Stack traces and the URL of the failing page are sent. We strip query strings and other potentially-sensitive content before transmission.
      </p>
      <h2>Contact</h2>
      <p><a href="mailto:hi@orderlink.in">hi@orderlink.in</a></p>
    </PolicyPage>
  );
}
```

- [ ] **Step 7: `src/app/terms/page.tsx`**

```tsx
import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <PolicyPage title="Terms of use" updated="2026-05-02">
      <p>The plain-English version.</p>
      <h2>What OrderLink is</h2>
      <p>
        OrderLink is an editorial site that links to other retailers. You're a reader, not a customer of OrderLink. When you click through and buy something, your contract is with the merchant (Amazon, Myntra, Nykaa).
      </p>
      <h2>Prices and stock</h2>
      <p>
        We refresh price and stock data periodically, not in real time. The merchant's site is always the source of truth — what you see in your cart there is what you'll pay.
      </p>
      <h2>Returns, refunds, support</h2>
      <p>
        Handled by the merchant under their policies. We can't intervene in a merchant transaction, but we will help you find the right contact form.
      </p>
      <h2>Liability</h2>
      <p>
        We try hard to recommend good products and accurate prices. We can't be held liable for a merchant's actions, a defective product, or stale price data. Your remedy in any case is whatever the merchant offers under their terms.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms; the "Last updated" date at the top reflects the most recent version.</p>
    </PolicyPage>
  );
}
```

- [ ] **Step 8: Build to verify all 7 pages**

```bash
npm run build 2>&1 | grep -E "/about|/contact|/privacy|/terms|/affiliate-disclosure|/editorial-policy|/how-we-curate"
```

Expected: 7 lines, all `○` (static).

- [ ] **Step 9: Commit**

```bash
git add src/app/about src/app/contact src/app/privacy src/app/terms src/app/affiliate-disclosure src/app/editorial-policy src/app/how-we-curate
git commit -m "feat(affiliate): 7 policy pages with affiliate-tone copy"
```

---

## M10 — SEO + assets

### Task 50: `robots.ts`

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 1: Write `src/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

const SITE = "https://orderlink.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/go/"],
      },
      {
        userAgent: [
          "GPTBot", "OAI-SearchBot", "ChatGPT-User",
          "ClaudeBot", "Claude-SearchBot", "Claude-User",
          "PerplexityBot", "Perplexity-User",
          "Google-Extended", "Applebot-Extended",
          "Amazonbot", "DuckAssistBot", "Meta-ExternalAgent",
        ],
        allow: "/",
        disallow: ["/api/", "/go/"],
      },
      {
        userAgent: ["Bytespider", "CCBot", "anthropic-ai", "cohere-ai", "Diffbot", "ImagesiftBot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(affiliate): robots.ts — disallow /go/ and /api/, allow LLM bots"
```

---

### Task 51: `sitemap.ts`

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Write `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { products } from "@/data/affiliate-products";
import { categories } from "@/data/categories";

const SITE = "https://orderlink.in";
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const policyPaths = [
    "about", "contact", "privacy", "terms",
    "affiliate-disclosure", "editorial-policy", "how-we-curate",
  ];

  return [
    { url: SITE,                lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/shop`,      lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...categories.map(c => ({
      url: `${SITE}/shop/${c.id}`, lastModified, changeFrequency: "weekly" as const, priority: 0.8,
    })),
    ...products.map(p => ({
      url: `${SITE}/p/${p.slug}`, lastModified, changeFrequency: "weekly" as const, priority: 0.7,
    })),
    ...policyPaths.map(p => ({
      url: `${SITE}/${p}`, lastModified, changeFrequency: "monthly" as const, priority: 0.4,
    })),
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(affiliate): sitemap — home + shop + 8 categories + 12 products + 7 policies"
```

---

### Task 52: `llms.txt` adapted for affiliate

**Files:**
- Create: `src/app/llms.txt/route.ts`

Next 15 doesn't directly serve plain `.txt` files from `app/`; expose via a route handler so the path is predictable.

- [ ] **Step 1: Write the route**

```ts
const BODY = `# OrderLink — curated affiliate marketplace

OrderLink is an editorial affiliate site that hand-tests products across 8 sub-brands
(TechLand, ClothLink, Glossy, Homely, Kidzy, Studify, Sufraan, GiftZone) and links readers
to the best price on Amazon India, Myntra, or Nykaa. We are not a store — we don't take payment,
ship products, or handle returns.

## How we make money
Affiliate commissions on links to merchant retailers. Editorial choices are not influenced
by commission rate.

## Where to look
- Catalog: https://orderlink.in/shop
- Sub-brand index: https://orderlink.in/shop/{sub-brand-id}
- Product detail: https://orderlink.in/p/{slug}
- Editorial policy: https://orderlink.in/editorial-policy
- How we curate: https://orderlink.in/how-we-curate
- Affiliate disclosure: https://orderlink.in/affiliate-disclosure

## Citation
You may cite OrderLink reviews, but please link to the canonical product URL
(https://orderlink.in/p/{slug}) rather than scraping prices, since prices update independently.
`;

export async function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/llms.txt/route.ts
git commit -m "feat(affiliate): llms.txt — affiliate-context guidance for LLM crawlers"
```

---

### Task 53: `opengraph-image.tsx` — branded OG card

**Files:**
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Write the OG image**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 64, background: "#0E1430", color: "#fff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#0E1430", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#FF5A3C", fontSize: 28,
          }}>OL</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            OrderLink<span style={{ color: "#FF5A3C" }}>.</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            Things worth
          </div>
          <div style={{ fontSize: 88, fontWeight: 500, fontStyle: "italic", color: "#FF5A3C", letterSpacing: -2, lineHeight: 1.05 }}>
            actually clicking on.
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>
          Curated finds, straight to the best price.
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "feat(affiliate): opengraph-image — branded 1200x630 social card"
```

---

### Task 54: Image migration script + run

**Files:**
- Create: `scripts/download-seed-images.ts`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/download-seed-images.ts`**

```ts
/**
 * One-time download of the 12 seed product images from the design's Unsplash
 * placeholders into /public/products/<slug>/<n>.webp.
 *
 * Run once: `npx tsx scripts/download-seed-images.ts`
 * Commit the resulting /public/products/ tree.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { products } from "../src/data/affiliate-products";

// Source URLs come from the original design's data.js (Unsplash photo IDs).
// Map: slug -> [unsplash-id...]  (mirrors the order in src/data/affiliate-products.ts)
const SOURCES: Record<string, string[]> = {
  "ai-translation-earbuds":     ["1606220588913-b3aacb4d2f46", "1590658268037-6bf12165a8df", "1572569511254-d8f925fe2cbb", "1608043152269-423dbba4e7e1"],
  "mini-sleep-earbuds":         ["1590658268037-6bf12165a8df", "1606220588913-b3aacb4d2f46", "1572569511254-d8f925fe2cbb"],
  "mens-grooming-kit":          ["1621607512214-68297480165e", "1593702288056-7927b4d51d9c", "1599351431202-1e0f0137899a"],
  "crystal-velvet-prayer-mat":  ["1604719312566-8912e9227c6a", "1606293606464-f6d2c0686e51", "1600585154340-be6161a56a0c"],
  "granite-cookware-set-7pc":   ["1584990347449-a8d2f6c6f0f1", "1556909114-f6e7ad7d3136", "1604908554007-9a64a31e5b06"],
  "rechargeable-spray-bottle":  ["1585421514738-01798e348b17", "1556909114-f6e7ad7d3136"],
  "glow-serum-vitamin-c-20":    ["1620916566398-39f1143ab7be", "1556228720-195a672e8a03", "1556228578-8c89e6adf883"],
  "hydrating-lip-oil-trio":     ["1586495777744-4413f21062fa", "1571781926291-c477ebfd024b"],
  "linen-blend-oversized-shirt":["1602810318383-e386cc2a3ccf", "1620799140408-edc6dcb6d633", "1551488831-00ddcb6c6bd3"],
  "pleated-midi-skirt":         ["1583496661160-fb5886a13d44", "1551488831-00ddcb6c6bd3"],
  "wooden-montessori-cube":     ["1558877385-8c1604e1de0d", "1566576912321-d58ddd7a6088", "1545558014-8692077e9b5c"],
  "refillable-notebook-system": ["1531346878377-a5be20888e57", "1517842645767-c639042777db"],
};

async function fetchOneToWebp(unsplashId: string, outPath: string) {
  const url = `https://images.unsplash.com/photo-${unsplashId}?w=1200&q=80&auto=format&fit=crop&fm=webp`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${unsplashId}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath} (${(buf.length / 1024).toFixed(0)} kB)`);
}

async function main() {
  for (const product of products) {
    const ids = SOURCES[product.slug];
    if (!ids) {
      console.warn(`No source mapping for slug ${product.slug} — skipping`);
      continue;
    }
    for (let i = 0; i < ids.length; i++) {
      await fetchOneToWebp(ids[i], join("public", "products", product.slug, `${i + 1}.webp`));
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add `tsx` dev dep + script**

```bash
npm install --save-dev tsx
```

In `package.json` `"scripts"` add:

```json
"download:seed-images": "tsx scripts/download-seed-images.ts"
```

- [ ] **Step 3: Run the script**

```bash
npm run download:seed-images
```

Expected: ~32 webp files in `public/products/<slug>/<n>.webp`. Network failures on individual photos are acceptable — the placeholder.webp from T31 still resolves.

- [ ] **Step 4: Commit**

```bash
git add scripts/download-seed-images.ts public/products package.json package-lock.json
git commit -m "chore(affiliate): seed product images downloaded from design Unsplash placeholders"
```

---

### Task 55: Reel video migration script + run

**Files:**
- Create: `scripts/download-seed-reels.ts`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/download-seed-reels.ts`**

```ts
/**
 * Downloads the 4 distinct placeholder reels from Pixabay (per the design)
 * into /public/products/<slug>/reel.mp4 for the products that have a `reel`
 * field in the catalog.
 *
 * Run once: `npx tsx scripts/download-seed-reels.ts`
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { products } from "../src/data/affiliate-products";

// Per-category placeholder URL — same mapping as the design's reelMap
const REEL_BY_CATEGORY: Record<string, string> = {
  techland:  "https://cdn.pixabay.com/video/2023/08/04/175044-852361758_tiny.mp4",
  glossy:    "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
  clothlink: "https://cdn.pixabay.com/video/2022/10/27/137000-764746551_tiny.mp4",
  homely:    "https://cdn.pixabay.com/video/2020/06/20/42389-433130128_tiny.mp4",
  sufraan:   "https://cdn.pixabay.com/video/2020/06/20/42389-433130128_tiny.mp4",
  studify:   "https://cdn.pixabay.com/video/2022/10/27/137000-764746551_tiny.mp4",
  kidzy:     "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
  giftzone:  "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
};

async function downloadOne(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath} (${(buf.length / 1024).toFixed(0)} kB)`);
}

async function main() {
  for (const p of products) {
    if (!p.reel) continue;
    const url = REEL_BY_CATEGORY[p.category];
    if (!url) {
      console.warn(`No reel URL for category ${p.category} — skipping`);
      continue;
    }
    await downloadOne(url, join("public", "products", p.slug, "reel.mp4"));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add script entry**

In `package.json` `"scripts"` add:

```json
"download:seed-reels": "tsx scripts/download-seed-reels.ts"
```

- [ ] **Step 3: Run the script**

```bash
npm run download:seed-reels
```

- [ ] **Step 4: Commit**

```bash
git add scripts/download-seed-reels.ts public/products package.json
git commit -m "chore(affiliate): seed reel videos downloaded for products with reel field"
```

---

## M11 — Verification + push

### Task 56: Add e2e Playwright tests

**Files:**
- Create: `tests/e2e/home-to-merchant.spec.ts`
- Create: `tests/e2e/search.spec.ts`
- Create: `tests/e2e/mobile.spec.ts`
- Create: `tests/e2e/bad-go-route.spec.ts`

- [ ] **Step 1: `tests/e2e/home-to-merchant.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("home → category → product → merchant interstitial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Things worth")).toBeVisible();

  // Click first sub-brand card
  await page.getByRole("link", { name: /TechLand/i }).first().click();
  await expect(page).toHaveURL(/\/shop\/techland/);

  // Click first product card
  await page.locator("a[href^='/p/']").first().click();
  await expect(page).toHaveURL(/\/p\//);

  // Click first merchant CTA
  await page.getByRole("link", { name: /Go to Amazon/ }).first().click();
  await expect(page).toHaveURL(/\/go\//);
  await expect(page.getByText(/Off you go|Link not yet available/)).toBeVisible();
});
```

- [ ] **Step 2: `tests/e2e/search.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("search via header navigates to /shop?q=...", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/Search/).fill("earbuds");
  await page.getByPlaceholder(/Search/).press("Enter");
  await expect(page).toHaveURL(/\/shop\?q=earbuds/);
  await expect(page.getByText(/earbuds/i).first()).toBeVisible();
});
```

- [ ] **Step 3: `tests/e2e/mobile.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 800 } });

test("mobile home renders without overflow + footer collapses", async ({ page }) => {
  await page.goto("/");
  const html = await page.locator("body").boundingBox();
  expect(html?.width).toBeLessThanOrEqual(375 + 16);
  await expect(page.getByText("Things worth")).toBeVisible();
});
```

- [ ] **Step 4: `tests/e2e/bad-go-route.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("/go/ with bad ids redirects home", async ({ page }) => {
  await page.goto("/go/nope/nope", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/");
});
```

- [ ] **Step 5: Run all e2e**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: 4+ specs pass.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e
git commit -m "test(affiliate): Playwright e2e for home→merchant, search, mobile, bad-go"
```

---

### Task 57: Final sweep — typecheck, test, build, Lighthouse

- [ ] **Step 1: typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 2: tests**

```bash
npm test -- --run
```

Expected: ≥30 tests pass.

- [ ] **Step 3: production build**

```bash
npm run build
```

Expected: ≥27 prerendered routes (1 home + 1 shop + 8 categories + 12 products + 7 policies + healthz + go/* combinations + opengraph + sitemap + robots + llms.txt).

- [ ] **Step 4: Lighthouse manual run**

Boot the prod build, run Lighthouse on home and one PDP:

```bash
npm run start &
sleep 4
# In another terminal or via Chrome DevTools:
# 1. http://localhost:3000/        — Lighthouse mobile + desktop
# 2. http://localhost:3000/p/ai-translation-earbuds  — same
kill %1 2>/dev/null
```

Target per spec: ≥95 perf, ≥95 a11y, ≥95 SEO. If perf is below 95, the most likely culprits are: image sizes (re-export at lower quality), unused JS (most likely Sentry — set `dryRun: true` in dev), or CLS from font swap (already handled by `display: swap`).

This is a verification step. No commit unless tweaks are made.

---

### Task 58: Push branch to GitHub

- [ ] **Step 1: Confirm clean tree**

```bash
git status
```

Expected: clean (all changes committed).

- [ ] **Step 2: Push**

```bash
git push -u origin phase-2b-affiliate
```

- [ ] **Step 3: STOP — do not deploy**

Per spec §11 and memory `deploy-gate-orderlink.md`: **no VPS deploy without explicit user authorisation.** Surface the build status to the user with:

> "Branch pushed. Build is green locally. Ready when you are to authorise the VPS deploy — I won't touch `sfdcdevelopers-vps` until you say so."

---

## Self-review notes

This plan covers spec §1–§13:

- §1 Goal + §2 Why — covered by branch strategy in T1, archived coming-soon
- §3 Scope (in) — home (T26-31), list (T32-34), PDP (T36-43), interstitial (T45-46), policies (T48-49), reel (T38-39), responsive breakpoints (T23, T43), fonts/palette (T4-5), Sentry (T6), sitemap+robots+llms+JSON-LD (T50-52, T43)
- §3 Scope (out) — explicitly not implemented; placeholder URLs in T9; localStorage-only wishlist in T12
- §4 Architecture — folder layout in T2-T49 matches spec; data model in T8-T9; routing in T31-T34, T43, T46
- §5 Component fidelity — every component task references the prototype file:line range
- §6 Error handling — 404 pages in T47, placeholder-URL fallback in T45
- §7 Testing — unit tests in T8-T12, component tests in T17-T18, T29, T39, T45; e2e in T56
- §8 SEO — JSON-LD in T43, robots/sitemap/llms in T50-52, opengraph in T53
- §9 Performance — `priority` images via Next/Image, `preload="metadata"` on video, conditional video render in T39
- §10 Migration — Sentry copied (T6), icon.png copied (T5), nothing else from phase-2a-store ported wholesale
- §11 Deploy — T58 explicitly stops at push, no VPS step
- §12 Done criteria — T57 verifies all boxes
- §13 Non-goals — none ported in (no Razorpay, OTP, Salesforce, GST, IG embed)

Spec-coverage check: ✓ all sections have tasks. Type consistency: `CategoryId`, `MerchantId`, `AffiliateProduct`, `Reel`, `Merchant`, `Review` defined once in `src/data/`, imported everywhere. `SortKey` defined in `src/lib/search.ts`.






