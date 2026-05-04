import { describe, it, expect } from "vitest";
import { categories, type CategoryId } from "@/data/categories";

describe("categories", () => {
  it("has exactly 8 sub-brands", () => {
    expect(categories).toHaveLength(8);
  });

  it("ids match the design (techland, clothlink, glossy, homely, kidzy, studify, sufraan, giftzone)", () => {
    const ids: CategoryId[] = [
      "techland", "clothlink", "glossy", "homely",
      "kidzy", "studify", "sufraan", "giftzone",
    ];
    expect(categories.map(c => c.id).sort()).toEqual(ids.sort());
  });

  it("every category has a non-empty name, tagline, hue (0-360), icon", () => {
    for (const c of categories) {
      expect(c.name).toBeTruthy();
      expect(c.tagline).toBeTruthy();
      expect(c.hue).toBeGreaterThanOrEqual(0);
      expect(c.hue).toBeLessThanOrEqual(360);
      expect(c.icon).toBeTruthy();
    }
  });
});
