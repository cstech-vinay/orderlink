import { describe, it, expect, beforeEach } from "vitest";
import { getWishlist, isWishlisted, toggleWishlist, WISHLIST_KEY } from "@/lib/wishlist";

describe("wishlist (localStorage)", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(getWishlist()).toEqual([]);
    expect(isWishlisted("p1")).toBe(false);
  });

  it("toggle adds then removes", () => {
    toggleWishlist("p1");
    expect(isWishlisted("p1")).toBe(true);
    expect(getWishlist()).toEqual(["p1"]);
    toggleWishlist("p1");
    expect(isWishlisted("p1")).toBe(false);
  });

  it("survives a stored value being malformed", () => {
    localStorage.setItem(WISHLIST_KEY, "not json");
    expect(getWishlist()).toEqual([]);
  });
});
