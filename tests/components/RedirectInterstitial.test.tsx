import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { RedirectInterstitial } from "@/components/RedirectInterstitial";

const merchant = { id: "amazon" as const, label: "Amazon", price: 1299, eta: "Tomorrow", stock: "In stock" as const, affiliateUrl: "https://example.test/" };
const product = {
  id:"p1", slug:"p", title:"Test", subtitle:"", category:"techland" as const,
  price:1299, mrp:2999, rating:4.5, reviewCount:1, images:["/x.webp"],
  summary:"x", highlights:[], specs:[], merchants:[merchant],
  reviews:[{name:"x",rating:5 as const,date:"x",title:"x",body:"x"}],
};

describe("RedirectInterstitial", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders confirmed price + ETA + merchant", () => {
    const { container } = render(<RedirectInterstitial product={product} merchant={merchant}/>);
    expect(container.textContent).toContain("Off you go!");
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).toContain("Tomorrow");
  });

  it("countdown reaches 0 then redirects via window.location.assign", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true });
    render(<RedirectInterstitial product={product} merchant={merchant}/>);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(assign).toHaveBeenCalledWith("https://example.test/");
  });

  it("shows fallback message when affiliateUrl looks like a placeholder", () => {
    const ph = { ...merchant, affiliateUrl: "https://www.amazon.in/?tag=PLACEHOLDER" };
    const { container } = render(<RedirectInterstitial product={product} merchant={ph}/>);
    expect(container.textContent).toContain("Link not yet available");
  });
});
