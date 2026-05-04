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
