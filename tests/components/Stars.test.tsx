import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Stars } from "@/components/Stars";

describe("Stars", () => {
  it("renders 5 stars total", () => {
    const { container } = render(<Stars value={4.6} />);
    expect(container.querySelectorAll("[data-testid='star']")).toHaveLength(5);
  });

  it("rounds 4.6 to 5 filled stars", () => {
    const { container } = render(<Stars value={4.6} />);
    const filled = container.querySelectorAll("[data-testid='star'][data-filled='true']");
    expect(filled).toHaveLength(5);
  });

  it("rounds 4.4 to 4 filled stars", () => {
    const { container } = render(<Stars value={4.4} />);
    const filled = container.querySelectorAll("[data-testid='star'][data-filled='true']");
    expect(filled).toHaveLength(4);
  });

  it("clamps 0 to no filled, 5 to all filled", () => {
    const empty  = render(<Stars value={0} />).container;
    const full   = render(<Stars value={5} />).container;
    expect(empty.querySelectorAll("[data-filled='true']")).toHaveLength(0);
    expect(full.querySelectorAll("[data-filled='true']")).toHaveLength(5);
  });
});
