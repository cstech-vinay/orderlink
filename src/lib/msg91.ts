// MSG91 OTP client. Docs: https://docs.msg91.com/send-otp
//
// Dev bypass: when MSG91_AUTH_KEY is unset AND NODE_ENV !== "production",
// sendOtp() is a no-op (logs the mobile) and verifyOtp() accepts the code "123456".
// Lets local dev and CI exercise the checkout flow without live SMS.

const BASE = "https://control.msg91.com/api/v5";

function normalizeMobile(mobile: string): string {
  // MSG91 expects country-code-prefixed digits, e.g. 919876543210
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isDevBypass(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.MSG91_AUTH_KEY;
}

export type SendOtpResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendOtp(mobile: string): Promise<SendOtpResult> {
  const fullMobile = normalizeMobile(mobile);

  if (isDevBypass()) {
    console.log(`[msg91-dev-bypass] would send OTP to +${fullMobile}. Use "123456" to verify.`);
    return { ok: true, requestId: `dev-${Date.now()}` };
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID;

  if (!authKey || !templateId) {
    return { ok: false, error: "msg91_not_configured" };
  }

  const params = new URLSearchParams({
    template_id: templateId,
    mobile: fullMobile,
    otp_length: "6",
    otp_expiry: "10",
  });
  if (senderId) params.set("sender", senderId);

  try {
    const res = await fetch(`${BASE}/otp?${params.toString()}`, {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
    });
    const data = (await res.json()) as { type?: string; request_id?: string; message?: string };
    if (data.type === "success" && data.request_id) {
      return { ok: true, requestId: data.request_id };
    }
    return { ok: false, error: data.message ?? "msg91_unknown_error" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "msg91_network_error" };
  }
}

export async function verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult> {
  const fullMobile = normalizeMobile(mobile);

  if (isDevBypass()) {
    return code === "123456"
      ? { ok: true }
      : { ok: false, error: "dev_bypass_expected_123456" };
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { ok: false, error: "msg91_not_configured" };

  const params = new URLSearchParams({ mobile: fullMobile, otp: code });

  try {
    const res = await fetch(`${BASE}/otp/verify?${params.toString()}`, {
      method: "GET",
      headers: { authkey: authKey },
    });
    const data = (await res.json()) as { type?: string; message?: string };
    return data.type === "success"
      ? { ok: true }
      : { ok: false, error: data.message ?? "msg91_verify_failed" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "msg91_network_error" };
  }
}
