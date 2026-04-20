import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";
import { SHIPPING_PAISE } from "@/data/products";
import { getHeadlinePricePaise, getDisplayDiscountPercent } from "@/lib/pricing";
import { ComingSoonBadge } from "./ComingSoonBadge";

function rupees(paise: number): string {
  return `\u20B9${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function ProductCard({ product }: { product: Product }) {
  const isLive = product.status === "live";
  const hasImage = product.images.length > 0;
  const headlinePricePaise = getHeadlinePricePaise(product);
  const discountPercent = getDisplayDiscountPercent(product);

  const cardContent = (
    <>
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
                  {rupees(headlinePricePaise)}
                </span>
                {product.mrpPaise > headlinePricePaise && (
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
                {product.shippingIncluded
                  ? "Shipping included \u00b7 all-India"
                  : <>+ {rupees(SHIPPING_PAISE)} shipping &middot; non-refundable</>}
              </p>
              {product.meeshoReviewCount && (
                <p className="font-mono text-[0.7rem] text-ink-soft/80 mt-1">
                  &#9733; {product.meeshoRating?.toFixed(1)} &middot;{" "}
                  {product.meeshoReviewCount.toLocaleString("en-IN")} loved it
                </p>
              )}
              <span className="mt-3 block w-full rounded-md bg-coral text-cream font-sans text-sm font-medium py-2.5 text-center group-hover:opacity-90 transition">
                Buy Now
              </span>
            </>
          ) : (
            <ComingSoonBadge />
          )}
        </div>
      </div>
    </>
  );

  if (!isLive) {
    return (
      <div
        className="group block cursor-not-allowed opacity-60"
        aria-disabled
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group block focus:outline-none focus:ring-2 focus:ring-coral rounded-lg"
    >
      {cardContent}
    </Link>
  );
}
