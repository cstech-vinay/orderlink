import { describe, it, expect } from "vitest";
import { signOtpToken, verifyOtpToken } from "@/lib/otp-token";

const SECRET = "test-secret-at-least-16-bytes-long";

describe("otp-token sign/verify roundtrip", () => {
  it("verifies a freshly signed token for the same mobile", () => {
    const token = signOtpToken({ mobile: "9876543210", secret: SECRET, ttlSeconds: 900 });
    const result = verifyOtpToken({ token, mobile: "9876543210", secret: SECRET, now: Date.now() });
    expect(result.ok).toBe(true);
  });

  it("rejects a token for a different mobile", () => {
    const token = signOtpToken({ mobile: "9876543210", secret: SECRET, ttlSeconds: 900 });
    const result = verifyOtpToken({ token, mobile: "9000000000", secret: SECRET, now: Date.now() });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("mobile_mismatch");
  });

  it("rejects a token signed with a different secret", () => {
    const token = signOtpToken({ mobile: "9876543210", secret: SECRET, ttlSeconds: 900 });
    const result = verifyOtpToken({ token, mobile: "9876543210", secret: "different-secret-of-sufficient-length", now: Date.now() });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects an expired token", () => {
    const signedAt = Date.now();
    const token = signOtpToken({ mobile: "9876543210", secret: SECRET, ttlSeconds: 60, now: signedAt });
    const result = verifyOtpToken({ token, mobile: "9876543210", secret: SECRET, now: signedAt + 120_000 });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("expired");
  });

  it("rejects a malformed token", () => {
    const result = verifyOtpToken({ token: "not-a-valid-token", mobile: "9876543210", secret: SECRET, now: Date.now() });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("malformed");
  });

  it("rejects a tampered payload", () => {
    const token = signOtpToken({ mobile: "9876543210", secret: SECRET, ttlSeconds: 900 });
    // Swap the mobile in the payload but keep the original signature
    const [, , sig] = token.split(".");
    const tampered = `9000000000.${Date.now() + 900_000}.${sig}`;
    const result = verifyOtpToken({ token: tampered, mobile: "9000000000", secret: SECRET, now: Date.now() });
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("bad_signature");
  });
});
