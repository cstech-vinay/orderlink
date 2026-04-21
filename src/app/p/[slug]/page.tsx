import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProductBySlug,
  products,
  SHIPPING_PAISE,
} from "@/data/products";
import { getHeadlinePricePaise, getDisplayDiscountPercent } from "@/lib/pricing";
import { getAvailable } from "@/lib/inventory";
import { ProductGallery } from "@/components/ProductGallery";
import { TrustBand } from "@/components/TrustBand";
import { ReviewDistribution } from "@/components/ReviewDistribution";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ActivityPopup } from "@/components/ActivityPopup";
import { CustomerReviews } from "@/components/CustomerReviews";
import { InYourKitchen } from "@/components/InYourKitchen";
import { HowItWorksRibbon } from "@/components/HowItWorksRibbon";
import { FOMOLines } from "@/components/FOMOLines";
import { BackInStockCapture } from "@/components/BackInStockCapture";
import { ExitIntentOverlay } from "@/components/ExitIntentOverlay";
import {
  getAverageRating,
  getReviewCount,
  getRatingDistribution,
} from "@/data/reviews";

export const dynamicParams = false;
// ISR: regenerate product pages every 60 seconds so FOMOLines (live stock +
// selling-fast flag) picks up DB changes without hitting it on every request.
export const revalidate = 60;

const BASE_URL = "https://orderlink.in";

// Only build pages for live products — coming-soon placeholders never ship
// as indexable URLs (thin content / doorway risk per SEO audit 2026-04-21).
export function generateStaticParams() {
  return products
    .filter((p) => p.status === "live")
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Not found", robots: { index: false } };

  const priceRupees = Math.round(getHeadlinePricePaise(product) / 100);
  const desc = (
    `${product.shortSubtitle}. \u20B9${priceRupees.toLocaleString("en-IN")}. ` +
    `Free shipping across India. ${product.bullets[0] ?? ""}`
  ).slice(0, 155);

  return {
    title: product.title,
    description: desc,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description: desc,
      url: `/p/${product.slug}`,
      siteName: "OrderLink",
      locale: "en_IN",
      images: product.images[0]
        ? [
            {
              url: product.images[0].src,
              width: product.images[0].width,
              height: product.images[0].height,
              alt: product.images[0].alt,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: desc,
      images: product.images[0]?.src ? [product.images[0].src] : [],
    },
    other: {
      "product:price:amount": priceRupees.toString(),
      "product:price:currency": "INR",
      "product:availability": product.status === "live" ? "in stock" : "out of stock",
      "product:brand": "OrderLink",
      "product:retailer_item_id": product.slug,
    },
  };
}

function rupees(paise: number): string {
  return `\u20B9${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const isLive = product.status === "live";
  const headlinePricePaise = getHeadlinePricePaise(product);
  const discountPct = getDisplayDiscountPercent(product);
  const available = isLive ? await getAvailable(product.slug) : 0;
  const soldOut = isLive && available === 0;

  const reviewCount = getReviewCount(product.slug);
  const avgRating = getAverageRating(product.slug);
  const priceINR = (headlinePricePaise / 100).toFixed(2);
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const productLd: Record<string, unknown> = {
    "@type": "Product",
    name: product.title,
    description: product.shortSubtitle || product.description?.slice(0, 300),
    sku: product.slug,
    mpn: product.slug,
    category: product.categoryLabel,
    image: product.images.map((i) => `${BASE_URL}${i.src}`),
    brand: { "@type": "Brand", name: "OrderLink" },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/p/${product.slug}`,
      priceCurrency: "INR",
      price: priceINR,
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: { "@id": `${BASE_URL}/#organization` },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: product.shippingIncluded
            ? "0"
            : (SHIPPING_PAISE / 100).toFixed(2),
          currency: "INR",
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 6,
            unitCode: "DAY",
          },
        },
      },
    },
  };
  if (reviewCount > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumbLd = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoryLabel,
        item: `${BASE_URL}/#${product.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `${BASE_URL}/p/${product.slug}`,
      },
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pdpGraph) }}
      />
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-ink-soft hover:text-coral transition-colors"
      >
        &larr; Back to all products
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

          {reviewCount > 0 && (
            <p className="font-sans text-sm text-ink-soft">
              <span className="text-coral">{"\u2605".repeat(Math.round(avgRating))}</span>{" "}
              <span className="font-medium text-ink">{avgRating.toFixed(1)}</span> &middot;{" "}
              {reviewCount.toLocaleString("en-IN")} verified buyer review
              {reviewCount === 1 ? "" : "s"}
            </p>
          )}

          {isLive ? (
            <>
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display text-4xl font-semibold text-coral">
                    {rupees(headlinePricePaise)}
                  </span>
                  {product.mrpPaise > headlinePricePaise && (
                    <>
                      <span className="font-sans text-lg text-ink-soft line-through">
                        {rupees(product.mrpPaise)}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-wider text-coral bg-coral/10 rounded px-2 py-0.5">
                        {discountPct}% off
                      </span>
                    </>
                  )}
                </div>
                {product.shippingIncluded ? (
                  <p className="font-sans text-sm text-ink-soft mt-2">
                    Shipping included &middot; all-India &middot; no extra charge at checkout
                  </p>
                ) : (
                  <>
                    <p className="font-sans text-sm text-ink-soft mt-2">
                      + {rupees(SHIPPING_PAISE)} shipping &middot; non-refundable
                    </p>
                    <p className="font-sans text-base text-ink mt-2 font-medium">
                      Total: {rupees(product.itemPricePaise + SHIPPING_PAISE)}
                    </p>
                  </>
                )}
              </div>

              {soldOut ? (
                <BackInStockCapture productSlug={product.slug} />
              ) : (
                <Link
                  href={`/checkout?sku=${product.slug}`}
                  className="inline-flex rounded-md bg-coral text-cream font-sans text-base font-medium px-6 py-3 hover:opacity-90 transition"
                >
                  Buy now &middot; {rupees(headlinePricePaise)}
                </Link>
              )}

              <FOMOLines productSlug={product.slug} />

              <TrustBand />

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans text-xs text-ink-soft">
                <li>
                  &#128230; Delivery in 3&ndash;8 days &middot;{" "}
                  <strong className="text-ink">15-day guarantee or shipping refunded</strong>
                </li>
                <li>&#128257; 7-day return on item</li>
                <li>&#128274; Secure payment via Razorpay</li>
                <li>&#10004; Pan-India delivery &middot; 19,000+ pincodes</li>
              </ul>

              <p className="font-sans text-sm text-ink-soft">
                Unsure if this is right for you?{" "}
                <WhatsAppButton
                  variant="inline"
                  prefill={`Hi%20OrderLink%2C%20I'm%20looking%20at%20${encodeURIComponent(product.title)}%20and%20have%20a%20quick%20question`}
                  label="WhatsApp us"
                />{" "}
                &mdash; we&apos;ll help in minutes.
              </p>
            </>
          ) : (
            <>
              <ComingSoonBadge />
              <p className="font-sans text-ink-soft">
                This product is part of our curated pipeline and isn&apos;t available for purchase yet.
              </p>
            </>
          )}
        </div>
      </div>

      {isLive && <ActivityPopup productTitle={product.title} />}
      {isLive && !soldOut && <ExitIntentOverlay />}

      {isLive && product.howItWorks && product.howItWorks.length > 0 && (
        <HowItWorksRibbon steps={product.howItWorks} />
      )}

      {isLive && product.description && (
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="font-display text-2xl text-ink">Why you&apos;ll love it</h2>
              <ul className="mt-4 space-y-2 font-sans text-ink">
                {product.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span aria-hidden className="text-coral">&mdash;</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink">Description</h2>
              <div className="mt-4 font-sans text-ink leading-relaxed space-y-4">
                {product.description.split(/\n\n+/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            {getReviewCount(product.slug) > 0 && (
              <ReviewDistribution
                distribution={getRatingDistribution(product.slug)}
                totalReviews={getReviewCount(product.slug)}
                averageRating={getAverageRating(product.slug)}
              />
            )}
          </aside>
        </section>
      )}

      {isLive && product.scenarios && product.scenarios.length > 0 && (
        <InYourKitchen scenarios={product.scenarios} />
      )}

      {isLive && product.specs && product.specs.length > 0 && (
        <section className="mt-20">
          <header className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-coral">
              Specifications
            </p>
            <span
              className="block h-[0.09em] w-10 bg-coral rounded mt-2"
              aria-hidden
            />
            <h2 className="mt-4 font-display text-3xl md:text-4xl text-ink leading-tight">
              The{" "}
              <em className="italic font-normal relative">
                details
                <span
                  className="absolute left-0 right-0 bottom-0.5 h-[0.09em] bg-coral rounded"
                  aria-hidden
                />
              </em>
              .
            </h2>
          </header>

          <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.specs.map((spec) => (
              <div
                key={spec.label}
                className="rounded-lg bg-cream-deep/60 p-5 border border-[color:var(--rule)] hover:border-coral/40 transition-colors"
              >
                <dt className="font-mono text-[0.68rem] uppercase tracking-widest text-ink-soft">
                  {spec.label}
                </dt>
                <dd className="mt-2 font-display text-xl text-ink leading-snug">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {isLive && <CustomerReviews productSlug={product.slug} />}
    </main>
  );
}
