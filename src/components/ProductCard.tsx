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
