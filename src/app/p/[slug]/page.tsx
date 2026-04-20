import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProductBySlug,
  products,
  SHIPPING_PAISE,
} from "@/data/products";
import { getHeadlinePricePaise, getDisplayDiscountPercent } from "@/lib/pricing";
import { ProductGallery } from "@/components/ProductGallery";
import { TrustBand } from "@/components/TrustBand";
import { ReviewDistribution } from "@/components/ReviewDistribution";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ActivityPopup } from "@/components/ActivityPopup";
import { CustomerReviews } from "@/components/CustomerReviews";
import { InYourKitchen } from "@/components/InYourKitchen";
import { HowItWorksRibbon } from "@/components/HowItWorksRibbon";
import {
  getAverageRating,
  getReviewCount,
  getRatingDistribution,
} from "@/data/reviews";

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
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

          {(() => {
            const reviewCount = getReviewCount(product.slug);
            if (reviewCount === 0) return null;
            const avg = getAverageRating(product.slug);
            return (
              <p className="font-sans text-sm text-ink-soft">
                <span className="text-coral">{"\u2605".repeat(Math.round(avg))}</span>{" "}
                <span className="font-medium text-ink">{avg.toFixed(1)}</span> &middot;{" "}
                {reviewCount.toLocaleString("en-IN")} verified buyer review
                {reviewCount === 1 ? "" : "s"}
              </p>
            );
          })()}

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

              {/* Payment selector + Buy Now — wired in Task 14 (checkout) */}
              <div className="rounded-lg border-2 border-dashed border-[color:var(--rule-strong)] p-4">
                <p className="font-sans text-sm text-ink-soft">
                  Payment selector + Buy Now button &mdash; wired in the checkout milestone.
                </p>
                <Link
                  href={`/checkout?sku=${product.slug}`}
                  className="mt-3 inline-flex rounded-md bg-coral text-cream font-sans text-sm font-medium px-5 py-2 hover:opacity-90 transition"
                >
                  Go to checkout
                </Link>
              </div>

              <TrustBand />

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans text-xs text-ink-soft">
                <li>
                  &#128230; Delivery in 3&ndash;8 days &middot;{" "}
                  <strong className="text-ink">15-day guarantee or shipping refunded</strong>
                </li>
                <li>&#128257; 7-day return on item</li>
                <li>&#128274; Secure payment via Razorpay</li>
                <li>&#9201; Only {product.startingInventory} left</li>
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
