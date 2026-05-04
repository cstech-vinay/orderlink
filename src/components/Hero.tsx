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
