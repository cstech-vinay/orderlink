import { describe, it, expect } from "vitest";
import { calculateOrderAmounts, calculateGSTBreakup } from "@/lib/pricing";
import { SHIPPING_PAISE } from "@/data/products";

describe("calculateOrderAmounts — prepaid", () => {
  it("applies prepaid item discount, shipping stays full", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14250,
      method: "prepaid",
      couponDiscountPaise: 0,
    });
    expect(r.subtotalPaise).toBe(15000 + SHIPPING_PAISE);
    expect(r.discountPaise).toBe(750);
    expect(r.totalPaise).toBe(19900 - 750);
    expect(r.advancePaise).toBe(19150);
    expect(r.balanceDuePaise).toBe(0);
    expect(r.shippingPaise).toBe(SHIPPING_PAISE);
  });
});

describe("calculateOrderAmounts — pay-on-delivery", () => {
  it("charges ₹49 upfront, item price on delivery", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14200,
      method: "pay_on_delivery",
      couponDiscountPaise: 0,
    });
    expect(r.subtotalPaise).toBe(15000 + SHIPPING_PAISE);
    expect(r.discountPaise).toBe(0);
    expect(r.totalPaise).toBe(19900);
    expect(r.advancePaise).toBe(SHIPPING_PAISE);
    expect(r.balanceDuePaise).toBe(15000);
  });
});

describe("coupon discounts", () => {
  it("subtracts coupon on top of prepaid discount", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14200,
      method: "prepaid",
      couponDiscountPaise: 1000,
    });
    expect(r.totalPaise).toBe(18100);
    expect(r.advancePaise).toBe(18100);
  });

  it("subtracts coupon even on pay-on-delivery, reducing balance due", () => {
    const r = calculateOrderAmounts({
      itemPricePaise: 15000,
      itemPrepaidPricePaise: 14200,
      method: "pay_on_delivery",
      couponDiscountPaise: 1000,
    });
    expect(r.discountPaise).toBe(1000);
    expect(r.totalPaise).toBe(18900);
    expect(r.advancePaise).toBe(SHIPPING_PAISE);
    expect(r.balanceDuePaise).toBe(18900 - SHIPPING_PAISE);
  });
});

describe("calculateGSTBreakup", () => {
  it("intra-state MH order splits CGST/SGST equally", () => {
    const r = calculateGSTBreakup({
      lines: [
        { taxableValuePaise: 15000, gstRatePercent: 18 },
        { taxableValuePaise: 4900, gstRatePercent: 18 },
      ],
      shippingState: "Maharashtra",
    });
    expect(r.cgstPaise).toBe(1791);
    expect(r.sgstPaise).toBe(1791);
    expect(r.igstPaise).toBe(0);
    expect(r.totalTaxPaise).toBe(3582);
    expect(r.basePaise).toBe(19900);
  });

  it("inter-state order uses IGST only", () => {
    const r = calculateGSTBreakup({
      lines: [
        { taxableValuePaise: 15000, gstRatePercent: 18 },
        { taxableValuePaise: 4900, gstRatePercent: 18 },
      ],
      shippingState: "Karnataka",
    });
    expect(r.cgstPaise).toBe(0);
    expect(r.sgstPaise).toBe(0);
    expect(r.igstPaise).toBe(3582);
    expect(r.totalTaxPaise).toBe(3582);
  });

  it("CGST+SGST sum equals tax even when tax is odd (half-rupee edge case)", () => {
    const r = calculateGSTBreakup({
      lines: [{ taxableValuePaise: 101, gstRatePercent: 5 }],
      shippingState: "Maharashtra",
    });
    expect(r.cgstPaise + r.sgstPaise).toBe(r.totalTaxPaise);
  });
});
