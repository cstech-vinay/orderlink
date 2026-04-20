import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/lib/validation/checkout";

const base = {
  productSlug: "oil-dispenser",
  fullName: "Priya Sharma",
  mobile: "9876543210",
  email: "priya@example.com",
  addressLine1: "221B Baker Street",
  addressLine2: undefined,
  landmark: undefined,
  pincode: "411014",
  city: "Pune",
  state: "Maharashtra",
  paymentMethod: "prepaid" as const,
  couponCode: undefined,
};

describe("checkoutSchema", () => {
  it("accepts valid prepaid input", () => {
    expect(() => checkoutSchema.parse(base)).not.toThrow();
  });

  it("accepts valid pay_on_delivery input", () => {
    expect(() =>
      checkoutSchema.parse({ ...base, paymentMethod: "pay_on_delivery" })
    ).not.toThrow();
  });

  it("rejects mobile shorter than 10 digits", () => {
    expect(() => checkoutSchema.parse({ ...base, mobile: "123" })).toThrow();
  });

  it("rejects mobile not starting with 6-9", () => {
    expect(() => checkoutSchema.parse({ ...base, mobile: "5876543210" })).toThrow();
    expect(() => checkoutSchema.parse({ ...base, mobile: "0876543210" })).toThrow();
  });

  it("rejects pincode that is not 6 digits", () => {
    expect(() => checkoutSchema.parse({ ...base, pincode: "12345" })).toThrow();
    expect(() => checkoutSchema.parse({ ...base, pincode: "abcdef" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => checkoutSchema.parse({ ...base, email: "not-an-email" })).toThrow();
  });

  it("rejects fullName shorter than 2 characters", () => {
    expect(() => checkoutSchema.parse({ ...base, fullName: "A" })).toThrow();
  });

  it("rejects addressLine1 shorter than 5 characters", () => {
    expect(() => checkoutSchema.parse({ ...base, addressLine1: "123" })).toThrow();
  });

  it("accepts optional UTM fields when present", () => {
    expect(() =>
      checkoutSchema.parse({
        ...base,
        utm_source: "instagram",
        utm_campaign: "launch",
        referrer: "https://instagram.com/p/x",
        landing_page: "/?utm_source=instagram",
      })
    ).not.toThrow();
  });
});
