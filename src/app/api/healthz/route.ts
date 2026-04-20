import { NextResponse } from "next/server";

export async function GET() {
  const result: {
    ok: boolean;
    ts: string;
    db: "ok" | "error" | "not_configured";
    commit?: string;
  } = {
    ok: true,
    ts: new Date().toISOString(),
    db: "not_configured",
    commit: process.env.GIT_SHA,
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(result);
  }

  try {
    // Import lazily so that DATABASE_URL-less dev/CI doesn't crash on module load.
    const { db } = await import("@/db/client");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    result.db = "ok";
    return NextResponse.json(result);
  } catch {
    result.ok = false;
    result.db = "error";
    return NextResponse.json(result, { status: 503 });
  }
}
