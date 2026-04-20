import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const config = { matcher: ["/admin/:path*"] };

/**
 * Basic-auth gate for every /admin/* route. Password hash verified with bcryptjs
 * (pure JS, runs fine in Next.js Edge middleware).
 *
 * Dev fallback: if ADMIN_PASSWORD_BCRYPT is unset / placeholder AND we're not
 * in production, the browser auth prompt is skipped. Avoids forcing everyone
 * to generate a bcrypt hash just to click around locally. Production WILL 503
 * if the secret isn't configured.
 *
 * To generate a real hash:
 *   node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
 * Paste into .env as ADMIN_PASSWORD_BCRYPT=...
 */
export function middleware(req: NextRequest) {
  const username = process.env.ADMIN_USERNAME ?? "";
  const hash = (process.env.ADMIN_PASSWORD_BCRYPT ?? "").trim();
  const isProd = process.env.NODE_ENV === "production";
  const placeholder = hash === "" || hash === "CHANGE_ME" || hash.startsWith("CHANGE_ME");

  if (placeholder) {
    if (isProd) {
      return new NextResponse(
        "Admin credentials not configured (ADMIN_PASSWORD_BCRYPT missing).",
        { status: 503 }
      );
    }
    // Dev passthrough
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="orderlink-admin"' },
    });
  }

  let user = "";
  let pass = "";
  try {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(":");
    user = idx >= 0 ? decoded.slice(0, idx) : decoded;
    pass = idx >= 0 ? decoded.slice(idx + 1) : "";
  } catch {
    return new NextResponse("Bad auth header", { status: 400 });
  }

  if (user !== username || !bcrypt.compareSync(pass, hash)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}
