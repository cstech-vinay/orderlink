import { NextResponse } from "next/server";
import { isServiceablePincode, loadPincodeWhitelist } from "@/lib/pincode/whitelist";
import { lookupPincode } from "@/lib/pincode/lookup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_format" }, { status: 400 });
  }

  await loadPincodeWhitelist();
  const serviceable = isServiceablePincode(code);

  if (!serviceable) {
    return NextResponse.json({ ok: true, serviceable: false });
  }

  const lookup = await lookupPincode(code);
  if (!lookup) {
    return NextResponse.json({ ok: true, serviceable: true, city: null, state: null });
  }

  return NextResponse.json({
    ok: true,
    serviceable: true,
    city: lookup.city,
    state: lookup.state,
  });
}
