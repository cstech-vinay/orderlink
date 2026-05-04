import { describe, it, expect } from "vitest";
import { formatRupees, percentOff } from "@/lib/format";

describe("formatRupees", () => {
  it("formats with Indian grouping", () => {
    expect(formatRupees(1299)).toBe("₹1,299");
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("percentOff", () => {
  it("returns rounded integer", () => {
    expect(percentOff(1299, 2999)).toBe(57);
    expect(percentOff(749, 1499)).toBe(50);
  });
  it("returns 0 when mrp is missing or invalid", () => {
    expect(percentOff(100, 0)).toBe(0);
    expect(percentOff(100, 100)).toBe(0);
    expect(percentOff(100, 50)).toBe(0);
  });
});
