import type { AffiliateProduct } from "@/data/affiliate-products";
import type { CategoryId } from "@/data/categories";

export type FilterOptions = {
  category?: CategoryId | "all";
  query?: string;
  maxPrice?: number;
};

export type SortKey = "curated" | "price-asc" | "price-desc" | "rating";

export function filterProducts(
  list: AffiliateProduct[],
  opts: FilterOptions = {}
): AffiliateProduct[] {
  const { category, query, maxPrice } = opts;
  const q = query?.toLowerCase().trim();
  return list.filter(p => {
    if (category && category !== "all" && p.category !== category) return false;
    if (q && !(p.title + " " + p.summary).toLowerCase().includes(q)) return false;
    if (typeof maxPrice === "number" && p.price > maxPrice) return false;
    return true;
  });
}

export function sortProducts(
  list: AffiliateProduct[],
  key: SortKey
): AffiliateProduct[] {
  const out = [...list];
  if (key === "price-asc") out.sort((a, b) => a.price - b.price);
  else if (key === "price-desc") out.sort((a, b) => b.price - a.price);
  else if (key === "rating") out.sort((a, b) => b.rating - a.rating);
  return out;
}
