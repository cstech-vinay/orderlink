import { createHmac, timingSafeEqual } from "node:crypto";

type SignInput = {
  mobile: string;
  secret: string;
  ttlSeconds: number;
  now?: number;
};

type VerifyInput = {
  token: string;
  mobile: string;
  secret: string;
  now: number;
};

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "malformed" | "bad_signature" | "mobile_mismatch" | "expired" };

export const OTP_COOKIE_NAME = "orderlink-otp";

// Returns the HMAC secret for the OTP cookie. In non-production, falls back to
// a fixed dev secret so local builds work without env setup. Returns null in
// production if OTP_COOKIE_SECRET is missing (caller must 500).
export function otpSecret(): string | null {
  const configured = process.env.OTP_COOKIE_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return "dev-only-otp-secret-do-not-use-in-production";
}

function hmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signOtpToken(input: SignInput): string {
  const issuedAt = input.now ?? Date.now();
  const expiresAt = issuedAt + input.ttlSeconds * 1000;
  const payload = `${input.mobile}.${expiresAt}`;
  const sig = hmac(input.secret, payload);
  return `${payload}.${sig}`;
}

export function verifyOtpToken(input: VerifyInput): VerifyResult {
  const parts = input.token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  const [mobile, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!mobile || !Number.isFinite(expiresAt) || !sig) {
    return { ok: false, reason: "malformed" };
  }

  const expectedSig = hmac(input.secret, `${mobile}.${expiresAt}`);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (mobile !== input.mobile) return { ok: false, reason: "mobile_mismatch" };
  if (input.now >= expiresAt) return { ok: false, reason: "expired" };

  return { ok: true };
}
