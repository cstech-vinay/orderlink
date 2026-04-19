import { describe, it, expect } from "vitest";
import { LEGAL } from "@/lib/legal";

describe("LEGAL constants", () => {
  it("has CodeSierra Tech Private Limited as companyName", () => {
    expect(LEGAL.companyName).toBe("CodeSierra Tech Private Limited");
  });

  it("has valid 21-char CIN starting with U", () => {
    expect(LEGAL.cin).toMatch(/^U[A-Z0-9]{20}$/);
    expect(LEGAL.cin).toBe("U62013PN2025PTC241138");
  });

  it("has valid 15-char GSTIN", () => {
    expect(LEGAL.gstin).toMatch(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z][0-9A-Z]$/);
    expect(LEGAL.gstin).toBe("27AAMCC6643G1ZF");
  });

  it("has Pune registered address with 411014 pincode", () => {
    expect(LEGAL.registeredAddress.city).toBe("Pune");
    expect(LEGAL.registeredAddress.pincode).toBe("411014");
    expect(LEGAL.registeredAddress.line1).toBe("Eon Free Zone");
  });

  it("has WhatsApp number in E.164-ish format with no spaces", () => {
    expect(LEGAL.whatsappNumber).toMatch(/^\+91\d{10,11}$/);
  });

  it("exposes derived helper: whatsappDeepLink", () => {
    expect(LEGAL.whatsappDeepLink()).toMatch(/^https:\/\/wa\.me\/91/);
  });

  it("exposes derived helper: formattedAddress", () => {
    const formatted = LEGAL.formattedAddress();
    expect(formatted).toContain("Eon Free Zone");
    expect(formatted).toContain("Pune");
    expect(formatted).toContain("411014");
    expect(formatted).toContain("India");
  });
});
