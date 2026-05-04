import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Price } from "@/components/Price";

describe("Price", () => {
  it("renders price, mrp strikethrough, and % off", () => {
    const { container } = render(<Price value={1299} mrp={2999} />);
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).toContain("₹2,999");
    expect(container.textContent).toContain("57% off");
  });

  it("hides mrp + % when no mrp passed", () => {
    const { container } = render(<Price value={1299} />);
    expect(container.textContent).toContain("₹1,299");
    expect(container.textContent).not.toContain("off");
  });
});
