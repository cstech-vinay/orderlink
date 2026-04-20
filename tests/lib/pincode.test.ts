import { describe, it, expect, beforeEach } from "vitest";
import {
  isServiceablePincode,
  loadPincodeWhitelist,
  __resetPincodeCacheForTests,
} from "@/lib/pincode/whitelist";

describe("pincode whitelist", () => {
  beforeEach(async () => {
    __resetPincodeCacheForTests();
    await loadPincodeWhitelist();
  });

  it("returns true for a known pincode from seed list", () => {
    expect(isServiceablePincode("411014")).toBe(true);
    expect(isServiceablePincode("400001")).toBe(true);
    expect(isServiceablePincode("560034")).toBe(true);
  });

  it("returns false for an unknown 6-digit pincode", () => {
    expect(isServiceablePincode("999999")).toBe(false);
    expect(isServiceablePincode("123456")).toBe(false);
  });

  it("rejects invalid formats before checking the set", () => {
    expect(isServiceablePincode("abc")).toBe(false);
    expect(isServiceablePincode("12345")).toBe(false);
    expect(isServiceablePincode("1234567")).toBe(false);
    expect(isServiceablePincode("")).toBe(false);
    expect(isServiceablePincode("41101a")).toBe(false);
  });
});

describe("pincode whitelist — without loading first", () => {
  beforeEach(() => {
    __resetPincodeCacheForTests();
  });

  it("returns false if loadPincodeWhitelist was not awaited", () => {
    expect(isServiceablePincode("411014")).toBe(false);
  });
});
