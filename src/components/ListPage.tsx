"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, findCategory } from "@/data/categories";
import { products } from "@/data/affiliate-products";
import { filterProducts, sortProducts, type SortKey } from "@/lib/search";
import { CategoryGlyph } from "./CategoryGlyph";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";
import { formatRupees } from "@/lib/format";

export function ListPage({
  activeCategory = "all",
  initialQuery = "",
}: {
  activeCategory?: string;
  initialQuery?: string;
}) {
  const [sort, setSort] = useState<SortKey>("curated");
  const [priceCap, setPriceCap] = useState(5000);
  const [query, setQuery] = useState(initialQuery);

  const cat = activeCategory !== "all" ? findCategory(activeCategory) : undefined;

  const filtered = useMemo(() => {
    const f = filterProducts(products, {
      category: cat?.id,
      query,
      maxPrice: priceCap,
    });
    return sortProducts(f, sort);
  }, [cat?.id, query, priceCap, sort]);

  return (
    <>
      <section
        className="rounded-ol px-8 py-9 my-6 flex items-center justify-between gap-6 flex-wrap"
        style={{ background: cat ? `oklch(0.96 0.04 ${cat.hue})` : "var(--color-ol-soft)" }}
      >
        <div>
          <div className="flex items-center gap-2 text-[13px] text-ol-muted mb-2">
            <Link href="/">Home</Link>
            <Icon name="chevron-right" size={12}/>
            <span>{cat ? cat.name : "All curated finds"}</span>
          </div>
          <h1 className="font-display font-bold tracking-tight m-0 text-[clamp(34px,4.5vw,56px)]" style={{ lineHeight: 1.05 }}>
            {cat ? cat.name : "Everything we love."}
          </h1>
          <p className="mt-2.5 text-[16px] text-ol-muted max-w-[540px]">
            {cat
              ? `${cat.tagline}. Curated picks tested by the OrderLink team.`
              : "Twelve weeks of weekly edits, all in one place. Updated every Friday."}
          </p>
        </div>
        {cat && (
          <div
            className="w-[120px] h-[120px] rounded-3xl flex items-center justify-center"
            style={{ background: `oklch(0.88 0.08 ${cat.hue})`, color: `oklch(0.32 0.15 ${cat.hue})` }}
          >
            <CategoryGlyph kind={cat.icon} size={56}/>
          </div>
        )}
      </section>

      <div className="flex gap-2 overflow-x-auto py-3 mb-2">
        {[{ id: "all", name: "All", icon: undefined } as const, ...categories].map(c => {
          const isActive = (c.id === "all" && !cat) || (cat && c.id === cat.id);
          const href = c.id === "all" ? "/shop" : `/shop/${c.id}`;
          return (
            <Link key={c.id} href={href}
              className={`inline-flex items-center gap-2 flex-shrink-0 px-3.5 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap border ${isActive ? "bg-ol-deep text-white border-ol-deep" : "bg-white text-ol-ink border-ol-deep/10"}`}>
              {c.icon && <CategoryGlyph kind={c.icon} size={16}/>}
              {c.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap py-4 border-t border-b border-ol-deep/10 mb-6">
        <div className="text-[14px] text-ol-muted">
          <strong className="text-ol-ink">{filtered.length}</strong> finds
          {query && <> matching &ldquo;{query}&rdquo;</>}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2.5 text-[13px] text-ol-muted">
            Search
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Filter by name…"
              className="bg-white border border-ol-deep/10 rounded-md px-3 py-1.5 text-[13px] text-ol-ink"
            />
          </label>
          <label className="flex items-center gap-2.5 text-[13px] text-ol-muted">
            Under <span className="text-ol-ink font-bold">{formatRupees(priceCap)}</span>
            <input
              type="range" min={500} max={5000} step={100}
              value={priceCap} onChange={e => setPriceCap(+e.target.value)}
              className="w-[140px] accent-ol-accent"
            />
          </label>
          <select
            value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="bg-white border border-ol-deep/10 px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-ol-ink cursor-pointer"
          >
            <option value="curated">Editor&apos;s pick</option>
            <option value="rating">Top rated</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>

      <div className="grid gap-[18px] mb-14" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {filtered.map(p => <ProductCard key={p.id} p={p}/>)}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-ol-muted py-12">
            No matches. Try widening the price filter or clearing the search.
          </div>
        )}
      </div>
    </>
  );
}
