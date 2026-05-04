import { ProductCard } from "./ProductCard";
import { SectionHead } from "./SectionHead";
import { relatedProducts } from "@/data/affiliate-products";
import { findCategory } from "@/data/categories";
import type { AffiliateProduct } from "@/data/affiliate-products";

export function RelatedGrid({ product }: { product: AffiliateProduct }) {
  const list = relatedProducts(product);
  if (list.length === 0) return null;
  const cat = findCategory(product.category);
  return (
    <section className="mb-14">
      <SectionHead eyebrow={`More from ${cat?.name ?? ""}`} title="You'll probably like these too"/>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {list.map(rp => <ProductCard key={rp.id} p={rp}/>)}
      </div>
    </section>
  );
}
