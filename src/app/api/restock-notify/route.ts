import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { createRateLimiter } from "@/lib/rate-limit";

// 5 notify sign-ups per IP per hour. Anti-spam for the public endpoint.
const restockByIp = createRateLimiter({ max: 5, windowMs: 60 * 60_000 });

const bodySchema = z.object({
  productSlug: z.string().min(1).max(80),
  email: z.string().email().max(120),
});

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = restockByIp.check(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { productSlug, email } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Deduplicate quietly — returning the same {ok:true} whether this is a new
  // signup or an existing one. Also preserves privacy (no "email already
  // signed up" leak).
  const existing = await db
    .select({ id: schema.restockNotifications.id })
    .from(schema.restockNotifications)
    .where(
      and(
        eq(schema.restockNotifications.productSlug, productSlug),
        eq(schema.restockNotifications.email, normalizedEmail)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(schema.restockNotifications).values({
      productSlug,
      email: normalizedEmail,
    });

    // Enqueue SF sync. The pending_sf_sync worker (T30) drains this
    // asynchronously; if SF is unreachable/disabled, the PG mirror above
    // still holds the signup so no data is lost.
    const { encryptJSON } = await import("@/lib/crypto");
    const product = (await import("@/data/products")).getProductBySlug(productSlug);
    const enc = encryptJSON({
      productSlug,
      productTitle: product?.title ?? productSlug,
      email: normalizedEmail,
    });
    await db.insert(schema.pendingSfSync).values({
      orderRefId: null,
      payloadCiphertext: enc.ciphertext,
      payloadIv: enc.iv,
      payloadTag: enc.tag,
      jobKind: "restock_signup_sync",
      status: "pending",
    });
  }

  return NextResponse.json({ ok: true });
}
