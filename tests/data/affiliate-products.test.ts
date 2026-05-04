import { describe, it, expect } from "vitest";
import { products, findProduct, productsByCategory } from "@/data/affiliate-products";
import { categories } from "@/data/categories";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("affiliate-products", () => {
  it("has at least 12 products", () => {
    expect(products.length).toBeGreaterThanOrEqual(12);
  });

  it("every product has a unique id and unique slug", () => {
    const ids = new Set(products.map(p => p.id));
    const slugs = new Set(products.map(p => p.slug));
    expect(ids.size).toBe(products.length);
    expect(slugs.size).toBe(products.length);
  });

  it("every slug is kebab-case", () => {
    for (const p of products) expect(p.slug).toMatch(KEBAB);
  });

  it("every product references an existing category id", () => {
    const valid = new Set(categories.map(c => c.id));
    for (const p of products) expect(valid.has(p.category)).toBe(true);
  });

  it("every product has 1-3 merchants, each with non-empty affiliateUrl", () => {
    for (const p of products) {
      expect(p.merchants.length).toBeGreaterThanOrEqual(1);
      expect(p.merchants.length).toBeLessThanOrEqual(3);
      for (const m of p.merchants) expect(m.affiliateUrl).toBeTruthy();
    }
  });

  it("every product has at least one image and one review", () => {
    for (const p of products) {
      expect(p.images.length).toBeGreaterThanOrEqual(1);
      expect(p.reviews.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("price <= mrp for every product", () => {
    for (const p of products) expect(p.price).toBeLessThanOrEqual(p.mrp);
  });

  it("rating is between 0 and 5", () => {
    for (const p of products) {
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
    }
  });

  it("findProduct returns by slug", () => {
    expect(findProduct(products[0].slug)?.id).toBe(products[0].id);
    expect(findProduct("does-not-exist")).toBeUndefined();
  });

  it("productsByCategory filters correctly", () => {
    for (const c of categories) {
      const list = productsByCategory(c.id);
      for (const p of list) expect(p.category).toBe(c.id);
    }
  });
});
