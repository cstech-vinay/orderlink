import { describe, it, expect } from "vitest";
import {
  products,
  SHIPPING_PAISE,
  COD_ADVANCE_PAISE,
  getProductBySlug,
  productsByCategory,
} from "@/data/products";

describe("products catalog", () => {
  it("has exactly 25 products", () => {
    expect(products).toHaveLength(25);
  });

  it("has 5 products per category", () => {
    const grouped = productsByCategory();
    expect(grouped.kitchen).toHaveLength(5);
    expect(grouped.beauty).toHaveLength(5);
    expect(grouped.electronics).toHaveLength(5);
    expect(grouped.fashion).toHaveLength(5);
    expect(grouped.footwear).toHaveLength(5);
  });

  it("has unique slugs", () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("each product has required fields with valid values", () => {
    for (const p of products) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(3);
      expect(p.category).toMatch(/^(kitchen|beauty|electronics|fashion|footwear)$/);
      expect(p.status).toMatch(/^(live|coming-soon)$/);
      expect(p.itemPricePaise).toBeGreaterThan(0);
      expect(p.itemPrepaidPricePaise).toBeLessThan(p.itemPricePaise);
      expect(p.hsnCode).toMatch(/^\d{4,8}$/);
      expect(p.gstRatePercent).toBeGreaterThanOrEqual(5);
      expect(p.mrpPaise).toBeGreaterThanOrEqual(p.itemPricePaise);
    }
  });

  it("only oil-dispenser is live in Phase 2a", () => {
    const live = products.filter((p) => p.status === "live");
    expect(live).toHaveLength(1);
    expect(live[0].slug).toBe("oil-dispenser");
  });

  it("SHIPPING_PAISE is 4900 and COD_ADVANCE_PAISE equals SHIPPING_PAISE", () => {
    expect(SHIPPING_PAISE).toBe(4900);
    expect(COD_ADVANCE_PAISE).toBe(SHIPPING_PAISE);
  });

  it("getProductBySlug returns product or undefined", () => {
    expect(getProductBySlug("oil-dispenser")?.title).toContain("Oil Dispenser");
    expect(getProductBySlug("nonexistent")).toBeUndefined();
  });

  it("prepaid price is exactly 5% off item rounded to nearest rupee", () => {
    for (const p of products) {
      const expected = Math.round((p.itemPricePaise * 0.95) / 100) * 100;
      expect(p.itemPrepaidPricePaise).toBe(expected);
    }
  });

  it("live product has starting inventory and Meesho rating data", () => {
    const live = products.find((p) => p.status === "live")!;
    expect(live.startingInventory).toBeGreaterThan(0);
    expect(live.meeshoRating).toBeGreaterThanOrEqual(3.5);
    expect(live.meeshoReviewCount).toBeGreaterThan(1000);
    expect(live.meeshoRatingDistribution).toBeDefined();
    expect(live.meeshoRatingDistribution!.length).toBe(5);
  });
});
