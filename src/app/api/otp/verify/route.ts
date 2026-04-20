import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/msg91";
import { otpVerifyByMobile } from "@/lib/rate-limit";
import { signOtpToken, otpSecret, OTP_COOKIE_NAME } from "@/lib/otp-token";

const TTL_SECONDS = 15 * 60; // verified cookie lasts 15 minutes — enough to finish checkout

const bodySchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  code: z.string().regex(/^\d{4,8}$/),
});

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 }
    );
  }

  const { mobile, code } = parsed;

  const byMobile = otpVerifyByMobile.check(mobile);
  if (!byMobile.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: Math.ceil(byMobile.retryAfterMs / 1000),
      },
      { status: 429 }
    );
  }

  const result = await verifyOtp(mobile, code);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 401 }
    );
  }

  const secret = otpSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const token = signOtpToken({ mobile, secret, ttlSeconds: TTL_SECONDS });
  const response = NextResponse.json({ ok: true, verified: true });
  response.cookies.set(OTP_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TTL_SECONDS,
    path: "/",
  });
  return response;
}
