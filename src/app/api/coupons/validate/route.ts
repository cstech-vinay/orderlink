import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupons";

const bodySchema = z.object({
  code: z.string().min(2).max(40),
  email: z.string().email().max(120),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const result = await validateCoupon(parsed.data);
  if (!result.ok) {
    // 404 when code is unknown, 400 for expired / already_used / max_uses
    const status = result.error === "unknown_code" ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    amountPaise: result.amountPaise,
    kind: result.kind,
  });
}
