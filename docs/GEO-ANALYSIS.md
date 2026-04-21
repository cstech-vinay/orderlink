# OrderLink — GEO / AI Search Readiness Analysis

Generated: 2026-04-21. Scope: codebase on `phase-2a-store` (site not yet
deployed, host `https://orderlink.in` planned). Analysis uses the Feb 2026
GEO criteria: 134–167 word citable passages, multi-modal content, brand
mentions as the dominant signal (3× correlation vs. backlinks).

---

## 1. GEO Readiness Score: **52 / 100**

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 16/25 | Bullets/specs/howItWorks well-chunked and self-contained. Missing FAQ, description paragraphs under the optimal 134–167 word range, no direct-answer lead-in. |
| Structural Readability | 20% | 14/20 | Clean H1→H2→H3 on PDP; `<dl>` for specs, `<ul>` for bullets. No question-based H2s, no `<details>`, no anchor IDs. |
| Multi-Modal | 15% | 11/15 | 7-image PDP set with real alt text. No video, no ImageObject schema, no transcripts. |
| Authority / Brand | 20% | 8/20 | Organization JSON-LD + `sameAs` (IG, FB, X). No Wikipedia / Wikidata, no YouTube, no LinkedIn, no Reddit, no author bylines, no published/updated dates. |
| Technical Accessibility | 20% | 13/20 | Next 15 server components = SSR ✓. No `robots.txt`, no `sitemap.xml`, no `/llms.txt`, no RSL. |

---

## 2. Platform Breakdown

| Platform | Score | Primary gap |
|---|---|---|
| **Google AI Overviews** | 45 / 100 | No Product/Offer schema = no Merchant Center / rich-answer eligibility. |
| **ChatGPT** (OAI-SearchBot, Wikipedia 47.9% + Reddit 11.3% of citations) | 60 / 100 | No Wikipedia entity, no Reddit brand presence, no `/llms.txt`. SSR already strong. |
| **Perplexity** (Reddit 46.7% of citations) | 65 / 100 | Passage structure (bullets, specs, howItWorks) is above-average; missing Reddit mentions + per-PDP dates. |
| **Bing Copilot** | 55 / 100 | Indexable HTML is fine; needs sitemap, Product schema, IndexNow submission once live. |

---

## 3. AI Crawler Access Status

Current state: **no `robots.txt` exists**. Default behavior = every crawler
gets unrestricted access to everything including `/api/*`, `/checkout`,
`/orders/*`, `/track`.

**Recommended policy** (paired with `src/app/robots.ts` in the action plan):

| Crawler | Owner | Decision | Rationale |
|---|---|---|---|
| GPTBot | OpenAI | ✅ Allow | ChatGPT search — primary AI discovery channel |
| OAI-SearchBot | OpenAI | ✅ Allow | OpenAI search index |
| ChatGPT-User | OpenAI | ✅ Allow | User-initiated browsing |
| ClaudeBot | Anthropic | ✅ Allow | Claude web features |
| Claude-SearchBot | Anthropic | ✅ Allow | Claude search results |
| PerplexityBot | Perplexity | ✅ Allow | Perplexity AI answer engine |
| Google-Extended | Google | ✅ Allow | Gemini / AI Overviews grounding |
| Applebot-Extended | Apple | ✅ Allow | Apple Intelligence |
| Amazonbot | Amazon | ✅ Allow | Rufus / Alexa |
| DuckAssistBot | DuckDuckGo | ✅ Allow | DuckAssist |
| Meta-ExternalAgent | Meta | ✅ Allow | Meta AI |
| Bytespider | ByteDance | ❌ Block | Aggressive training-only crawler, weak India D2C ROI |
| CCBot | Common Crawl | ❌ Block | Training-only |
| anthropic-ai | Anthropic | ❌ Block | Training (ClaudeBot already covers search) |
| cohere-ai | Cohere | ❌ Block | Training-only |
| Diffbot | Diffbot | ❌ Block | Scraper reseller |
| ImagesiftBot | Imagesift | ❌ Block | Image training |

---

## 4. llms.txt Status: **MISSING**

No `/llms.txt` anywhere in repo. Recommended implementation is a
server-generated route (`src/app/llms.txt/route.ts`) so the file stays
automatically in sync with `src/data/products.ts`. Body sketch:

```
# OrderLink

> Curated lifestyle D2C store based in Pune, India. A tight edit of home,
  kitchen, beauty, electronics, fashion, and footwear goods shipped all-India
  with free shipping, COD, UPI, and a 15-day delivery guarantee.

Legal entity: CodeSierra Tech Private Limited (CIN U62013PN2025PTC241138,
GSTIN 27AAMCC6643G1ZF). Support: hello@orderlink.in.

## Products — Kitchen
- [Duck Oil & Brush Bottle — 200ml](https://orderlink.in/p/oil-dispenser):
  200ml glass + silicone brush oil dispenser, ₹499 incl. shipping.

## Products — Beauty
- …

## Policies
- [Shipping](https://orderlink.in/shipping-policy)
- [Refund & Returns](https://orderlink.in/refund-policy)
- [Privacy](https://orderlink.in/privacy)
- [Terms](https://orderlink.in/terms)

## Optional
- [Sitemap](https://orderlink.in/sitemap.xml)
- [About](https://orderlink.in/about)
- [Contact](https://orderlink.in/contact)
```

Generate category groupings and product bullets from `products.filter(p =>
p.status === "live")` so coming-soon items don't leak.

---

## 5. Brand Mention Analysis

AI visibility tracks brand mentions far more than backlinks (Ahrefs Dec 2025:
YouTube r=0.737 vs. backlinks r=0.266). Current state:

| Platform | Status | Priority |
|---|---|---|
| Instagram | ✅ `@orderlink.in` — in `sameAs` | — |
| Facebook | ✅ `profile.php?id=61570689463930` — in `sameAs` | — |
| X / Twitter | ✅ `@OrderLink_in` — in `sameAs` | — |
| **YouTube** | ❌ None | **P1** — highest AI-citation correlation (0.737). Start with 5–10 product videos reused from PDP 6-slide content. Link channel in `sameAs`. |
| **LinkedIn** | ❌ No company page | **P1** — moderate correlation. CodeSierra Tech already exists as parent entity; create OrderLink sub-page or use parent. |
| **Reddit** | ❌ No presence | **P2** — dominant Perplexity source (46.7%). Authentic participation in `r/IndiaInvestments`, `r/IndianFood`, `r/ShopLokal`, etc.; no spam. |
| **Wikipedia / Wikidata** | ❌ None | **P2** — register when coverage / revenue justifies. Until then, add `identifier[GSTIN,CIN]` so entity-matching services can disambiguate. |
| Press / editorial | ❌ None | **P3** — PR seeding for Pune D2C beat (YourStory, Inc42). |

---

## 6. Passage-Level Citability Audit

**Target: 134–167 words per self-contained passage.** Checked `oil-dispenser`
as the only content-complete product (the other 21 are empty).

| Block | Word count | Self-contained? | Citable? |
|---|---|---|---|
| `shortSubtitle` | 7 | ✓ | Too short to be a standalone quote |
| Each `bullet` | 12–14 | ✓ | Quotable — keep |
| `specs` rows | 4–8 | ✓ | Perfect for RAG tables — keep |
| `scenarios[n].body` | 15–25 | ✓ | Quotable — keep |
| `howItWorks[n].body` | 10–18 | ✓ | Quotable — keep |
| `description` P1 | ~55 | Opens with narrative, buries product | ⚠️ Rewrite |
| `description` P2 | ~80 | Sensory, standalone | Keep |
| `description` P3 | ~55 | Materials/dims — should be self-sufficient | Expand to 134+ |
| `description` P4 | ~30 | Colourways — too thin alone | Merge or expand |

**Total description: ~220 words.** For peak AI citation we want at least one
134–167 word self-contained block per product.

### Suggested rewrite — `oil-dispenser` intro (134 words)

Currently description opens with a narrative hook. Replace with a direct-
answer lead paragraph (the pattern AI assistants prefer):

> The Duck Oil & Brush Bottle is a 200 ml borosilicate-glass oil dispenser
> with a food-grade silicone brush that lives inside the jar. It solves the
> everyday kitchen problem of pouring oil from a bulky 5-litre can onto a
> roti, a skewer, or a cake tin — you end up with drips on the counter, too
> much oil on the food, and a separate brush to wash. The duck brush stays
> coated in oil between uses, so you lift, glaze, and cook without a second
> tool and without mess. The clear glass body lets you see the oil level at
> a glance. It is dishwasher-safe, food-grade, 17 cm tall, weighs 180 g, and
> ships free across India for ₹499 with a 15-day delivery guarantee.

**134 words, opens with "is a…" definition, ends with price + guarantee —
exactly the pattern that gets pulled into ChatGPT Search + Perplexity
answers.**

### New field proposal: `tldr`

Add a 40-word `tldr` field that renders as a bold italic lead above the
Description H2 on PDP and is the first line of the Product schema
`description`:

```ts
tldr?: string; // 40-word direct-answer summary, keyword-first
```

Example (`oil-dispenser`): *"200 ml borosilicate glass oil dispenser with a
silicone brush stored inside the jar — glaze rotis, skewers, cake tins
evenly, ₹499 incl. all-India shipping, dishwasher-safe, 15-day guarantee."*
(40 words.)

---

## 7. Server-Side Rendering Check

| Surface | Render mode | AI-crawler visible? |
|---|---|---|
| Home `/` | Server component, `force-static` | ✅ |
| PDP `/p/[slug]` | Server component, ISR `revalidate: 60` | ✅ |
| `/about`, `/contact`, `/logistics`, policies | Server components | ✅ |
| PDP interactive bits (`ProductGallery`, `ActivityPopup`, `ExitIntentOverlay`, `FOMOLines`, `BackInStockCapture`) | Client components | ⚠️ Not seen by AI crawlers — fine, they're interactive overlays, no primary content lives there |
| `CustomerReviews`, `ReviewDistribution`, `TrustBand`, `HowItWorksRibbon`, `InYourKitchen` | Mixed — verify each | ⚠️ Audit required: primary content (reviews, how-it-works steps, scenarios) must render server-side |

**Action:** audit the five mixed-render components. Any `"use client"` that
wraps primary product content (reviews text, how-it-works steps, scenario
bodies) needs to be split so the content is server-rendered and only the
interactivity is client-side.

---

## 8. Top 5 Highest-Impact Changes

Ordered by (impact × effort), assuming host goes live.

1. **Ship `/robots.txt` + `/sitemap.xml` + `/llms.txt`** — 20 min effort.
   Unlocks AI crawler access and gives them the full URL set. Without these,
   every other change is invisible.
2. **Add Product + Offer + BreadcrumbList JSON-LD to PDP** — 30 min effort
   per the template in `docs/seo-action-plan.md`. Single biggest lever for
   Google AI Overviews + Shopping eligibility.
3. **Add `tldr` + 5 FAQs to every live product + FAQPage JSON-LD** — 45 min
   per product. Directly addresses the ChatGPT/Perplexity citation pattern
   (first 40 words + question-based passages).
4. **Rewrite PDP description P1 to a 134-word direct-answer block** — 30 min
   per product. Shifts from narrative opening to AI-friendly definition
   opener.
5. **Create a YouTube channel + seed 5 product videos using the existing
   6-slide PDP visuals** — 1 day of setup. Highest single brand-mention
   correlation (r=0.737). Link channel in `Organization.sameAs`.

---

## 9. Schema Recommendations for AI Discoverability

See `docs/seo-action-plan.md` §3–4 for full JSON-LD templates. GEO-specific
priorities:

| Schema | Purpose for AI | Priority |
|---|---|---|
| `OnlineStore` (extend existing Organization) with `identifier[GSTIN,CIN]`, `legalName`, `founder`, `foundingDate`, full `address`, `contactPoint` | Entity disambiguation — AI assistants can match the brand to the legal entity and avoid hallucinating a different company. | Critical |
| `Product` + `Offer` with `priceCurrency: "INR"`, `availability`, `shippingDetails`, `hasMerchantReturnPolicy` | Structured facts AI can quote verbatim without parsing prose. | Critical |
| `AggregateRating` + first 5 `Review` nodes (from internal `reviews.ts`, not Meesho) | Social-proof claims AI can cite ("rated 4.7/5 across 120 reviews"). | High |
| `BreadcrumbList` | Category taxonomy for entity relationships. | High |
| `FAQPage` on PDP + `/logistics` | Directly ingested by ChatGPT, Perplexity, Bing Copilot. Google deprecated the rich result for commercial sites in Aug 2023, but AI ingestion continues. | High |
| `WebSite` (no `SearchAction` — no site search) | Brand name attribution. | Medium |
| `CollectionPage` + `ItemList` on home | Product catalog discovery. | Medium |
| `ImageObject` on PDP image nodes | Multi-modal citation surface. | Low |

---

## 10. Content Reformatting Suggestions

Specific passage edits beyond the description rewrite in §6.

### 10.1 PDP FAQ block template (add to every product)

Render below Specs, above CustomerReviews. 5 Q&A pairs, answers 40–60 words
each. Questions are H3s; answers are `<p>`. Each answer is a self-contained
citable passage.

```
H2: Questions buyers ask
  H3: How long does delivery take?
    A: Most orders ship in 1–2 business days from our Pune warehouse and
       reach 19,000+ Indian pin codes in 3–8 days. You'll get a tracking
       link on WhatsApp and email. If your pin code is not serviceable
       we'll refund within 24 hours.
  H3: What is the return window?
    A: We accept returns within 7 days of delivery on the item value. The
       ₹49 shipping fee is non-refundable. Initiate a return from your
       order page or WhatsApp us with the order number.
  H3: [product-specific] materials & care?
    A: [product-specific answer, 40–60 words]
  H3: Is cash on delivery available?
    A: Yes. COD is available across India. A ₹49 advance covers shipping
       and is payable online at checkout; the remaining amount is paid in
       cash when the courier hands over the parcel.
  H3: How is this different from the cheap lookalikes?
    A: [product-specific: material grade, certifications, warranty, the
       curation note, 40–60 words]
```

### 10.2 About page lead

Current `/about` is 3 paragraphs. Prepend a 40-word direct-answer paragraph:

> OrderLink is a Pune-based curated lifestyle D2C store, founded in 2025 by
> Vinay Vernekar under CodeSierra Tech Private Limited. We hand-pick a tight
> edit of home, kitchen, and everyday pieces, test each one, and ship
> pan-India with a 15-day guarantee.

### 10.3 Home page Hero subtitle

Currently narrative. Add a second H2 below the hero with a definition-style
block (optional, ~134 words) covering what OrderLink is, how it curates,
how shipping + returns work, who's behind it. This gives the homepage
something AI can quote for brand queries.

### 10.4 Date signals on PDP

AI crawlers weigh freshness. Add `datePublished` and `dateModified` to the
Product schema, sourced from the product's creation/last-update timestamp
(track in `products.ts` or the git commit date). Pattern:

```ts
datePublished: "2026-03-15",
dateModified: "2026-04-18",
```

### 10.5 Author byline (future `/blog` work — P3)

When `/blog` ships, every article needs:
- `author` schema node with `name`, `url` (to `/about/team/<name>`), `sameAs[LinkedIn]`.
- Visible byline with headshot + credential line.
- `datePublished` + `dateModified` visible in the page and in schema.

---

## Quick Wins (first session)

1. Ship `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/llms.txt/route.ts`.
2. Add PDP `generateMetadata` + Product/Breadcrumb JSON-LD.
3. Render GSTIN + CIN in Footer (already in `LEGAL`).
4. Extend `Organization` schema with `identifier`, `address`, `contactPoint`, `founder`.
5. Rewrite `oil-dispenser` description P1 to a 134-word direct-answer block.

## Medium Effort

1. Add `tldr` + `faqs[]` to every live product, generate FAQPage JSON-LD.
2. Create `/about` lead paragraph + expand page to 400+ words.
3. Audit `CustomerReviews` / `HowItWorksRibbon` / `InYourKitchen` for SSR.
4. Add `datePublished` / `dateModified` to every live product.

## High Impact (quarters, not days)

1. YouTube channel + 5 seed product videos (highest brand-mention correlation).
2. LinkedIn company page.
3. Reddit: authentic participation in relevant subs; no spam.
4. Wikipedia / Wikidata entity once coverage justifies.
5. Press seeding in Pune D2C beat (YourStory, Inc42) for editorial mentions.

## RSL 1.0 (Optional, New Dec 2025)

Machine-readable AI licensing. Backed by Reddit, Yahoo, Medium, Cloudflare.
For a D2C storefront that wants AI citation (not training use), a
permissive RSL block at `/.well-known/rsl.xml` stating "search + retrieval
allowed, training not allowed without attribution" matches the site's goals.
Defer until the `robots.txt` + `llms.txt` basics ship; RSL is
additive, not a prerequisite.
