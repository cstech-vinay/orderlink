import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/msg91";
import { otpSendByMobile, otpSendByIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile"),
});

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_mobile" },
      { status: 400 }
    );
  }

  const mobile = parsed.mobile;
  const ip = clientIp(request);

  const byMobile = otpSendByMobile.check(mobile);
  if (!byMobile.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited_mobile",
        retryAfterSeconds: Math.ceil(byMobile.retryAfterMs / 1000),
      },
      { status: 429 }
    );
  }
  const byIp = otpSendByIp.check(ip);
  if (!byIp.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited_ip",
        retryAfterSeconds: Math.ceil(byIp.retryAfterMs / 1000),
      },
      { status: 429 }
    );
  }

  const result = await sendOtp(mobile);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, requestId: result.requestId });
}
