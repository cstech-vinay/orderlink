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
