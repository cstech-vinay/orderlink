"use client";
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
            A curated catalog. We test, we sort, we send you to the best price. That&apos;s it.
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
