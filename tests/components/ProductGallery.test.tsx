import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ProductGallery } from "@/components/ProductGallery";
import type { AffiliateProduct } from "@/data/affiliate-products";

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play",  { value: vi.fn(), writable: true });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { value: vi.fn(), writable: true });
});

const baseProduct: AffiliateProduct = {
  id: "px", slug: "px", title: "Test Product", subtitle: "",
  category: "techland", price: 100, mrp: 200, rating: 4.5, reviewCount: 1,
  images: ["/a.webp", "/b.webp"],
  reel: { src: "/reel.mp4", caption: "test caption" },
  summary: "x", highlights: [], specs: [],
  merchants: [{ id: "amazon", label: "Amazon", price: 100, eta: "x", stock: "In stock", affiliateUrl: "x" }],
  reviews: [{ name: "x", rating: 5, date: "x", title: "x", body: "x" }],
};

const productNoReel: AffiliateProduct = { ...baseProduct, reel: undefined };

describe("ProductGallery", () => {
  it("renders one thumb per image plus reel thumb when product has reel", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    expect(container.querySelectorAll("[data-testid='thumb']")).toHaveLength(3);
    expect(container.querySelector("[data-testid='reel-thumb']")).not.toBeNull();
  });

  it("omits reel thumb when product has no reel", () => {
    const { container } = render(<ProductGallery product={productNoReel}/>);
    expect(container.querySelectorAll("[data-testid='thumb']")).toHaveLength(2);
    expect(container.querySelector("[data-testid='reel-thumb']")).toBeNull();
  });

  it("clicking a thumb makes it the active slide", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const thumbs = container.querySelectorAll("[data-testid='thumb']");
    fireEvent.click(thumbs[1]);
    expect(thumbs[1].getAttribute("data-active")).toBe("true");
  });

  it("clicking the reel thumb activates the reel slide", () => {
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const reelThumb = container.querySelector("[data-testid='reel-thumb']") as HTMLElement;
    fireEvent.click(reelThumb);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("navigating away from reel pauses the video", () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause");
    const { container } = render(<ProductGallery product={baseProduct}/>);
    const reelThumb = container.querySelector("[data-testid='reel-thumb']") as HTMLElement;
    fireEvent.click(reelThumb);
    const firstThumb = container.querySelector("[data-testid='thumb']") as HTMLElement;
    fireEvent.click(firstThumb);
    expect(pauseSpy).toHaveBeenCalled();
  });
});
