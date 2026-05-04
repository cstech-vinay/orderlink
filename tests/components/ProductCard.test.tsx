import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/affiliate-products";

const p = products[0];

describe("ProductCard", () => {
  it("renders default variant with title, price, and link to detail", () => {
    const { container } = render(<ProductCard p={p}/>);
    expect(container.textContent).toContain(p.title);
    expect(container.textContent).toContain("₹");
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(`/p/${p.slug}`);
  });

  it("renders tall variant", () => {
    const { container } = render(<ProductCard p={p} variant="tall"/>);
    expect(container.textContent).toContain(p.title);
  });

  it("renders wide variant with summary", () => {
    const { container } = render(<ProductCard p={p} variant="wide"/>);
    expect(container.textContent).toContain(p.title);
    expect(container.textContent).toContain(p.summary.slice(0, 30));
  });
});
