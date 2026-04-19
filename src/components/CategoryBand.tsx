import type { Category, Product } from "@/data/products";
import { ProductCard } from "./ProductCard";

const TAGLINES: Record<Category, string> = {
  kitchen: "Small tools, big evenings.",
  beauty: "Well-kept, quietly.",
  electronics: "Small upgrades, everyday.",
  fashion: "Wardrobe staples, re-considered.",
  footwear: "Soft soles, long walks.",
};

const LABELS: Record<Category, string> = {
  kitchen: "Kitchen",
  beauty: "Beauty & Personal Care",
  electronics: "Consumer Electronics",
  fashion: "Fashion — Kurtis",
  footwear: "Women Footwear",
};

export function CategoryBand({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  return (
    <section id={category} className="py-16 border-t border-[color:var(--rule)]">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-10 flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
          <h2 className="font-display text-3xl md:text-4xl text-ink">
            {LABELS[category]}
            <em className="block md:inline md:ml-3 text-ink-soft text-xl md:text-2xl font-normal">
              {TAGLINES[category]}
            </em>
          </h2>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            {products.length} products
          </span>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
