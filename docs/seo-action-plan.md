# OrderLink SEO Action Plan

> Consolidated output of a 4-agent audit (technical, content/E-E-A-T, schema,
> GEO) against the local codebase on branch `phase-2a-store`. Site not yet
> deployed — host `https://orderlink.in` is planned. All paths are repo-relative.

**Current aggregate score: ~47/100.** Biggest lifts: per-product metadata,
`robots.ts`/`sitemap.ts`, Product+Offer JSON-LD, FAQ sections, Meesho
rebrand. Projected post-fix score: **~92/100**.

## Ship order (priority buckets)

### P0 — Critical (blocks indexing, creates brand risk)
1. Generate `src/app/robots.ts` + `src/app/sitemap.ts`
2. Add `generateMetadata()` to PDP (`/p/[slug]`)
3. Add `Product` + `Offer` + `BreadcrumbList` JSON-LD to PDP
4. Noindex `/checkout`, `/track`, `/orders/[id]` (PII leak)
5. Reposition Meesho references — remove brand-harmful surfaces
6. Exclude `status: "coming-soon"` products from `generateStaticParams` + sitemap

### P1 — High (major ranking + rich-result impact)
7. Extend root `Organization` schema → `OnlineStore` with `legalName`, `address`, `contactPoint`, `identifier[GSTIN,CIN]`, `founder`, `foundingDate`
8. Add `WebSite` JSON-LD in root (no SearchAction)
9. Root-layout metadata: `title.template`, `alternates.canonical`, `robots`, `lang="en-IN"`, separate `viewport` export
10. Per-page metadata on `/about`, `/contact`, `/logistics`, policies
11. Flesh out `/about` (founder, sourcing philosophy, address, incorporation year)
12. Homepage H2s per category band + "Why OrderLink" editorial block
13. Add FAQ section to every PDP + `FAQPage` JSON-LD
14. Add `/llms.txt` route (server-generated from catalog)

### P2 — Medium (optimization, entity disambiguation)
15. `CollectionPage` + `ItemList` on home
16. `AboutPage` on `/about`, `ContactPage` on `/contact`
17. `FAQPage` on `/logistics`
18. Expand `Product` type with `tldr`, `faqs[]` for passage-level citability
19. Add GSTIN / CIN to footer (already in source, not rendered)
20. Add LinkedIn, YouTube to `sameAs` when channels exist
21. Fix `<html lang="en">` → `"en-IN"`
22. CSP header in `next.config.mjs`

### P3 — Low (longer-tail authority)
23. `/blog` or `/journal` route with 6–8 editorial pieces for topical authority
24. Drop `priority` on Hero background image if not LCP
25. Bundle-audit client popups on PDP (ExitIntent/Activity/FOMO) for INP
26. `trailingSlash: false` in `next.config.mjs`

---

## Detailed changes

### 1. `src/app/robots.ts` (create)

Allow everything indexable, block private surfaces, allow mainstream AI
crawlers, block scraper-only bots.

```ts
import type { MetadataRoute } from "next";

const SITE = "https://orderlink.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/checkout", "/orders/", "/track"],
      },
      // AI search crawlers we want to cite us — explicit allow
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "Amazonbot",
          "DuckAssistBot",
          "Meta-ExternalAgent",
        ],
        allow: "/",
        disallow: ["/api/", "/checkout", "/orders/", "/track"],
      },
      // Training-only / low-ROI scrapers — block
      {
        userAgent: [
          "Bytespider",
          "CCBot",
          "anthropic-ai",
          "cohere-ai",
          "Diffbot",
          "ImagesiftBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
```

### 2. `src/app/sitemap.ts` (create)

```ts
import type { MetadataRoute } from "next";
import { products } from "@/data/products";

const BASE = "https://orderlink.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,                 lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/about`,            lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/logistics`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`,          lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/terms`,            lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/refund-policy`,    lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/shipping-policy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.status === "live")
    .map((p) => ({
      url: `${BASE}/p/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  return [...staticRoutes, ...productRoutes];
}
```

### 3. `src/app/layout.tsx` — metadata + schema

Changes:

- `<html lang="en">` → `lang="en-IN"`
- Split `viewport` into its own export (Next 15 requirement)
- Add `title.template`, `alternates.canonical`, `robots`, `formatDetection`
- Replace flat `Organization` JSON-LD with a `@graph` containing `OnlineStore`
  + `WebSite`

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://orderlink.in"),
  title: {
    default: "OrderLink — Curated lifestyle goods for India",
    template: "%s | OrderLink",
  },
  description: "A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "OrderLink",
    title: "OrderLink — A tight edit of everyday things, made well",
    description: "A curated lifestyle store from Pune. Home, kitchen, and small joys — shipped across India with free shipping, COD, and UPI.",
    url: "https://orderlink.in",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    site: "@OrderLink_in",
    creator: "@OrderLink_in",
    title: "OrderLink — A tight edit of everyday things, made well",
    description: "A curated lifestyle store from Pune. Home, kitchen, and small joys — shipped across India.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f1",
  width: "device-width",
  initialScale: 1,
};
```

Root `@graph` JSON-LD:

```ts
import { LEGAL } from "@/lib/legal";

const graphJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "OnlineStore",
      "@id": "https://orderlink.in/#organization",
      name: "OrderLink",
      legalName: LEGAL.companyName,
      url: "https://orderlink.in",
      logo: "https://orderlink.in/assets/optimized/logo_horizontal-600.webp",
      foundingDate: `${LEGAL.incorporatedYear}-01-01`,
      founder: { "@type": "Person", name: "Vinay Vernekar" },
      taxID: LEGAL.gstin,
      identifier: [
        { "@type": "PropertyValue", propertyID: "GSTIN", value: LEGAL.gstin },
        { "@type": "PropertyValue", propertyID: "CIN",   value: LEGAL.cin },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: `${LEGAL.registeredAddress.line1}, ${LEGAL.registeredAddress.line2}`,
        addressLocality: LEGAL.registeredAddress.city,
        addressRegion: LEGAL.registeredAddress.state,
        postalCode: LEGAL.registeredAddress.pincode,
        addressCountry: "IN",
      },
      contactPoint: [{
        "@type": "ContactPoint",
        contactType: "customer service",
        email: LEGAL.supportEmail,
        telephone: LEGAL.supportPhone,
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      }],
      sameAs: [
        "https://www.instagram.com/orderlink.in/",
        "https://www.facebook.com/profile.php?id=61570689463930",
        "https://x.com/OrderLink_in",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://orderlink.in/#website",
      url: "https://orderlink.in",
      name: "OrderLink",
      publisher: { "@id": "https://orderlink.in/#organization" },
      inLanguage: "en-IN",
    },
  ],
};
```

Emit once at the bottom of `<body>`.

### 4. PDP — `src/app/p/[slug]/page.tsx`

Add `generateMetadata` (per-product title/description/canonical/OG/Twitter),
inject Product + BreadcrumbList JSON-LD, inject FAQPage JSON-LD when
`product.faqs` present.

```ts
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = getProductBySlug(slug);
  if (!p) return { title: "Not found", robots: { index: false } };

  const price = Math.round(getHeadlinePricePaise(p) / 100);
  const desc = (
    `${p.shortSubtitle} ₹${price.toLocaleString("en-IN")}. ` +
    `Free shipping across India. ${p.bullets[0] ?? ""}`
  ).slice(0, 155);

  return {
    title: p.title,
    description: desc,
    alternates: { canonical: `/p/${p.slug}` },
    robots: p.status === "live"
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      title: p.title,
      description: desc,
      url: `/p/${p.slug}`,
      siteName: "OrderLink",
      locale: "en_IN",
      images: p.images[0]
        ? [{ url: p.images[0].src, width: p.images[0].width, height: p.images[0].height, alt: p.images[0].alt }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: desc,
      images: p.images[0]?.src ? [p.images[0].src] : [],
    },
    other: {
      "product:price:amount":    price.toString(),
      "product:price:currency":  "INR",
      "product:availability":    p.status === "live" ? "in stock" : "out of stock",
      "product:brand":           "OrderLink",
      "product:retailer_item_id": p.slug,
    },
  };
}
```

Inside `ProductPage`, after stock + reviews are resolved, inject:

```tsx
const BASE = "https://orderlink.in";
const priceINR = (getHeadlinePricePaise(product) / 100).toFixed(2);
const priceValidUntil = new Date(Date.now() + 365 * 86400_000)
  .toISOString().slice(0, 10);

const productLd = {
  "@type": "Product",
  name: product.title,
  description: product.shortSubtitle || product.description?.slice(0, 300),
  sku: product.slug,
  mpn: product.slug,
  category: product.categoryLabel,
  image: product.images.map((i) => `${BASE}${i.src}`),
  brand: { "@type": "Brand", name: "OrderLink" },
  ...(reviewCount > 0 && {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
  }),
  offers: {
    "@type": "Offer",
    url: `${BASE}/p/${product.slug}`,
    priceCurrency: "INR",
    price: priceINR,
    priceValidUntil,
    itemCondition: "https://schema.org/NewCondition",
    availability: soldOut
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock",
    seller: { "@id": `${BASE}/#organization` },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: product.shippingIncluded ? "0" : (SHIPPING_PAISE / 100).toFixed(2),
        currency: "INR",
      },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
        transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6, unitCode: "DAY" },
      },
    },
  },
};

const breadcrumbLd = {
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",                 item: BASE },
    { "@type": "ListItem", position: 2, name: product.categoryLabel,  item: `${BASE}/#${product.categoryLabel.toLowerCase()}` },
    { "@type": "ListItem", position: 3, name: product.title,          item: `${BASE}/p/${product.slug}` },
  ],
};

const faqLd = product.faqs?.length
  ? {
      "@type": "FAQPage",
      mainEntity: product.faqs.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.answer },
      })),
    }
  : null;

const pdpGraph = {
  "@context": "https://schema.org",
  "@graph": [productLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])],
};
```

Emit a single `<script type="application/ld+json">` at the bottom of the page.

### 5. Exclude coming-soon products from index + sitemap

`src/app/p/[slug]/page.tsx`:

```ts
export function generateStaticParams() {
  return products
    .filter((p) => p.status === "live")
    .map((p) => ({ slug: p.slug }));
}
```

Pair with `dynamicParams: false` (already set) — any slug not in the live set
returns `notFound()`. Coming-soon products no longer render at all, so no
thin-content footprint.

### 6. Meesho rebrand — de-risk the storefront

**Remove (P0):**
- `src/app/p/[slug]/page.tsx:149` — delete the `Verified Meesho partner` bullet.
- `src/data/products.ts` Product type — remove `meeshoRating`, `meeshoReviewCount`,
  `meeshoRatingDistribution`, `meeshoSourceUrl` fields (grep + prune usage).
  Internal reviews (`src/data/reviews.ts`) are the source of truth; the Meesho
  fields are a leak waiting to happen.

**Reframe (P0):**
- `src/components/TrustBand.tsx` — change headline from any Meesho mention to
  "Pan-India delivery · 19,000+ pincodes". Generic logistics language.
- `src/app/logistics/page.tsx` — mention Meesho once, buried, as a back-end 3PL
  ("We use Valmo/Meesho Logistics for last-mile, the same network marketplaces
  rely on"). Not a trust claim.

### 7. Per-page metadata (one-line pattern)

```ts
// /about
export const metadata = {
  title: "About OrderLink — Pune-based curated lifestyle store",
  description: "Founded in 2025 in Pune. A tight edit of home, kitchen, beauty, and everyday pieces — tested, packed, and shipped across India.",
  alternates: { canonical: "/about" },
};

// /contact
export const metadata = {
  title: "Contact OrderLink — WhatsApp, email, grievance officer",
  description: "Support via WhatsApp, email, or phone. CodeSierra Tech Private Limited, Pune. Response within 24 hours on business days.",
  alternates: { canonical: "/contact" },
};

// /logistics
export const metadata = {
  title: "Shipping & delivery across India",
  description: "Free shipping, 3–8 day delivery to 19,000+ pincodes, COD available. Here's how an OrderLink parcel gets to your door.",
  alternates: { canonical: "/logistics" },
};

// /track — noindex
export const metadata = {
  title: "Track your order",
  robots: { index: false, follow: false },
};

// /checkout — noindex
export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

// /orders/[id] — noindex, nocache
export const metadata = {
  title: "Your order",
  robots: { index: false, follow: false, nocache: true },
};
```

Policy pages (`/privacy`, `/terms`, `/refund-policy`, `/shipping-policy`) —
add `description` + `alternates.canonical`, keep indexable.

### 8. Flesh out `/about` (content gap)

Add to `src/app/about/page.tsx`:
- "Founded in 2025 by Vinay Vernekar" — 2-sentence founder story.
- "How we pick products" — 3 criteria (tested at home, genuinely useful, ships well).
- "Backed by CodeSierra Tech" — link to `LEGAL.parentSiteUrl`.
- Registered address rendered in the page body, not only in the footer.

Target: 400+ words, one H1 + three H2s, one optional H3 per section.

### 9. Homepage editorial lift (`src/app/page.tsx`)

- Add H2 above each `<CategoryBand>` with a two-sentence intro:
  - Kitchen: "Things you reach for daily…"
  - Beauty & Personal Care, Electronics, Fashion, Footwear.
- Add a "Why OrderLink" block below the last band (~150 words): curation
  promise, Pune base, 15-day guarantee, WhatsApp-first support.
- Result: indexable H2 hierarchy, more keyword surface, internal links to
  `/about` and `/logistics`.

Add `CollectionPage` + `ItemList` JSON-LD emitted from the home page:

```ts
const homeLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "OrderLink — Curated lifestyle goods",
  url: "https://orderlink.in",
  inLanguage: "en-IN",
  isPartOf: { "@id": "https://orderlink.in/#website" },
  mainEntity: {
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: products.filter(p => p.status === "live").length,
    itemListElement: products
      .filter((p) => p.status === "live")
      .map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://orderlink.in/p/${p.slug}`,
        name: p.title,
      })),
  },
};
```

### 10. Per-PDP FAQ section

Extend `Product` type:

```ts
tldr?: string;                        // 40-word direct summary — optimal for AI citations
faqs?: { question: string; answer: string }[];
```

Render FAQ section in `src/app/p/[slug]/page.tsx` below Specs, above
`CustomerReviews`. Each answer 40–60 words (ideal passage length). Marks up
via `FAQPage` JSON-LD in the `@graph`. AI assistants (ChatGPT, Perplexity,
Bing Copilot) ingest this even though Google deprecated the commercial rich
result.

Standard 5-FAQ template per product:
1. How long does delivery take?
2. What's the return window?
3. What materials is it made from? / How do I clean it?
4. Is COD available?
5. How is this different from the cheap lookalikes?

### 11. `/llms.txt` route (`src/app/llms.txt/route.ts`)

Server-generate from `products.ts` so it stays in sync.

```ts
import { NextResponse } from "next/server";
import { products } from "@/data/products";
import { LEGAL } from "@/lib/legal";

export const dynamic = "force-static";

export function GET() {
  const live = products.filter((p) => p.status === "live");
  const byCat = Object.groupBy(live, (p) => p.categoryLabel);
  let body = `# OrderLink\n\n> Curated lifestyle D2C store based in Pune, India. A tight edit of home, kitchen, beauty, electronics, fashion, and footwear. Shipped all-India with free shipping, COD, UPI, 15-day guarantee.\n\n`;
  body += `Legal entity: ${LEGAL.companyName} (CIN ${LEGAL.cin}, GSTIN ${LEGAL.gstin}). Support: ${LEGAL.supportEmail}.\n\n`;
  for (const [cat, items] of Object.entries(byCat)) {
    body += `## Products — ${cat}\n`;
    for (const p of items ?? []) {
      body += `- [${p.title}](https://orderlink.in/p/${p.slug}): ${p.shortSubtitle}\n`;
    }
    body += `\n`;
  }
  body += `## Policies\n- [Shipping](https://orderlink.in/shipping-policy)\n- [Refund & Returns](https://orderlink.in/refund-policy)\n- [Privacy](https://orderlink.in/privacy)\n- [Terms](https://orderlink.in/terms)\n\n`;
  body += `## Optional\n- [Sitemap](https://orderlink.in/sitemap.xml)\n- [About](https://orderlink.in/about)\n- [Contact](https://orderlink.in/contact)\n`;
  return new NextResponse(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
```

### 12. Footer — render GSTIN + CIN

Add a legal block to the Footer component with `CIN · GSTIN` rendered
from `LEGAL`. Already in the invoice; promote to user-facing for entity
disambiguation (helps AI assistants match the brand to the correct company).

### 13. Noindex dynamic pages that leak

- `/orders/[id]` — add `export const metadata = { robots: { index: false, follow: false, nocache: true } }`. These URLs are shareable and otherwise visible to any crawler that gets the link.
- `/checkout` — `{ robots: { index: false, follow: false } }`.
- `/track` — `{ robots: { index: false, follow: false } }`.

---

## Product onboarding checklist (NEW — enforce before `status: "live"`)

To move a product from `status: "coming-soon"` to `"live"`, the following are
REQUIRED. Any missing field blocks go-live.

| Field | Minimum | Notes |
|---|---|---|
| `title` | 5–8 words | Include one keyword, one differentiator |
| `shortSubtitle` | 10–15 words | Material + capacity/size + one differentiator (e.g. "200ml borosilicate glass oil bottle with silicone brush") |
| `tldr` | 40 words | NEW FIELD — direct first-paragraph summary for AI citation |
| `bullets` | 4 benefit bullets | Each 12–14 words, self-contained, quotable |
| `description` | 4 paragraphs, 350–500 words | P1 problem, P2 sensory usage, P3 materials/dims/care, P4 colourways + personality |
| `specs` | 6 rows minimum | Capacity, Material, Dimensions, Weight, Colours, Care — feeds Product schema |
| `scenarios` | 3–4 use-cases | Powers `InYourKitchen`; each 15–25 words |
| `howItWorks` | 3 steps | Powers `HowItWorksRibbon`; each 10–18 words |
| `faqs` | 5 Q&A pairs | NEW FIELD — answers 40–60 words each; template above |
| `images` | 7 images | 1 thumbnail (4:5) + 6 PDP slides per existing style guides |
| Each image has `alt`, `width`, `height` | — | Next/Image + schema both require |
| `hsnCode`, `gstRatePercent` | — | Required for invoices |
| `startingInventory` | — | Required for stock gating |

See `oil-dispenser` in `src/data/products.ts` as the canonical reference.

## Files to create

- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/llms.txt/route.ts`

## Files to edit

- `src/app/layout.tsx` — metadata, viewport export, `lang="en-IN"`, `@graph` JSON-LD
- `src/app/page.tsx` — H2 per band, "Why OrderLink" block, CollectionPage JSON-LD
- `src/app/p/[slug]/page.tsx` — generateMetadata, Product+Breadcrumb+FAQ JSON-LD, live-only generateStaticParams, drop "Verified Meesho partner" bullet
- `src/app/about/page.tsx` — expand content, AboutPage JSON-LD, metadata
- `src/app/contact/page.tsx` — metadata, ContactPage JSON-LD
- `src/app/logistics/page.tsx` — reframe Meesho as back-end 3PL, metadata, optional FAQPage
- `src/app/{privacy,terms,refund-policy,shipping-policy}/page.tsx` — description + canonical
- `src/app/{track,checkout}/page.tsx` + `src/app/orders/[id]/page.tsx` — noindex metadata
- `src/components/Footer.tsx` — render GSTIN + CIN
- `src/components/TrustBand.tsx` — reword Meesho line
- `src/data/products.ts` — add `tldr`, `faqs` fields; remove `meeshoRating`, `meeshoReviewCount`, `meeshoRatingDistribution`, `meeshoSourceUrl` from type + data
- `next.config.mjs` — `trailingSlash: false`, optional CSP

## Projected scores

| Dimension | Before | After |
|---|---|---|
| Technical SEO     | 42 | 92 |
| Content / E-E-A-T | 48 | 78 (pending /blog for 90+) |
| Schema            | 30 | 95 |
| GEO / AI          | 52 | 88 |
| **Aggregate**     | **47** | **~92** |

Remaining gap to 100 needs: live site for CrUX data, published blog content,
Wikidata entity registration, YouTube/LinkedIn presence.
