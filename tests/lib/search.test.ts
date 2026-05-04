import { describe, it, expect } from "vitest";
import { filterProducts, sortProducts, type SortKey } from "@/lib/search";
import type { AffiliateProduct } from "@/data/affiliate-products";

const fixtures: AffiliateProduct[] = [
  { id:"a", slug:"a", title:"Bluetooth Earbuds", subtitle:"", category:"techland",
    price:1000, mrp:2000, rating:4.5, reviewCount:10, images:["/x.webp"], summary:"audio gear",
    highlights:[], specs:[], merchants:[{id:"amazon",label:"Amazon",price:1000,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
  { id:"b", slug:"b", title:"Lip Oil Trio", subtitle:"", category:"glossy",
    price:500, mrp:1000, rating:4.7, reviewCount:5, images:["/x.webp"], summary:"beauty",
    highlights:[], specs:[], merchants:[{id:"nykaa",label:"Nykaa",price:500,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
  { id:"c", slug:"c", title:"Cookware Set", subtitle:"", category:"sufraan",
    price:3000, mrp:5000, rating:4.2, reviewCount:50, images:["/x.webp"], summary:"kitchen",
    highlights:[], specs:[], merchants:[{id:"amazon",label:"Amazon",price:3000,eta:"x",stock:"In stock",affiliateUrl:"x"}],
    reviews:[{name:"x",rating:5,date:"x",title:"x",body:"x"}] },
];

describe("filterProducts", () => {
  it("filters by category", () => {
    expect(filterProducts(fixtures, { category: "glossy" })).toHaveLength(1);
  });
  it("filters by case-insensitive query against title + summary", () => {
    expect(filterProducts(fixtures, { query: "lip" })).toHaveLength(1);
    expect(filterProducts(fixtures, { query: "AUDIO" })).toHaveLength(1);
  });
  it("filters by max price", () => {
    expect(filterProducts(fixtures, { maxPrice: 1000 })).toHaveLength(2);
  });
  it("combines filters AND-style", () => {
    expect(filterProducts(fixtures, { category: "techland", maxPrice: 500 })).toHaveLength(0);
  });
});

describe("sortProducts", () => {
  const test = (key: SortKey, expectedFirst: string) => {
    const sorted = sortProducts(fixtures, key);
    expect(sorted[0].id).toBe(expectedFirst);
  };
  it("price-asc", () => test("price-asc", "b"));
  it("price-desc", () => test("price-desc", "c"));
  it("rating", () => test("rating", "b"));
  it("curated keeps original order", () => test("curated", "a"));
});
