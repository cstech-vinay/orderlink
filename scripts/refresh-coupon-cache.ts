// Pulls the active coupon list from Salesforce into the Postgres `coupons` cache.
//
// Why a cache: /api/coupons/validate is on the hot checkout path. Each call
// runs the first-order dedup query which is local; if it ALSO had to hit SF
// over the internet we'd add 200-500ms to the "Apply" click. The PG cache
// lets validation be sub-50ms.
//
// Source of truth: OrderLink_Coupon__c in Salesforce. Marketing creates/edits
// coupons there. This script reconciles PG to match — inserts new, updates
// amounts/expiry, and deactivates codes that marketing has toggled off.
// It does NOT delete PG rows; historical redemptions in coupon_redemptions
// keep their FK to the coupon code even after retirement.
//
// Run modes:
//   - Standalone script (cron or manual): npx tsx scripts/refresh-coupon-cache.ts
//   - LOOP mode (sidecar-friendly): COUPON_CACHE_INTERVAL_MS=600000 LOOP=1 ...
//
// Env:
//   COUPON_CACHE_INTERVAL_MS — default 600000 (10 min), LOOP mode only
//   LOOP=1                   — run forever; otherwise single pass + exit
import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getSalesforceCredentials } from "@/lib/salesforce/config";
import { sfQuery } from "@/lib/salesforce/client";

const INTERVAL_MS = Number(process.env.COUPON_CACHE_INTERVAL_MS ?? 600_000);
const LOOP = process.env.LOOP === "1";

type SfCoupon = {
  Name: string;
  Kind__c: string;
  Amount_Paise__c: number;
  Is_Active__c: boolean;
  Starts_At__c: string | null;
  Expires_At__c: string | null;
  Max_Uses__c: number | null;
};

async function refreshOnce(): Promise<{ upserted: number; deactivated: number }> {
  if (!getSalesforceCredentials()) {
    console.log("[coupon-cache] SF credentials missing — skipping");
    return { upserted: 0, deactivated: 0 };
  }

  // Pull every coupon, active or not. We need the inactive rows too so we can
  // flip is_active off locally (e.g. marketing retired a code).
  const coupons = await sfQuery<SfCoupon>(
    "SELECT Name, Kind__c, Amount_Paise__c, Is_Active__c, Starts_At__c, Expires_At__c, Max_Uses__c FROM OrderLink_Coupon__c"
  );

  if (coupons.length === 0) {
    console.log("[coupon-cache] SF returned zero coupons");
    return { upserted: 0, deactivated: 0 };
  }

  let upserted = 0;
  for (const c of coupons) {
    const code = c.Name.toUpperCase();
    // Only upsert coupons that are active AND within their date window.
    // Inactive or expired coupons are "deactivated" via the second query below.
    const now = new Date();
    const hasStarted = !c.Starts_At__c || new Date(c.Starts_At__c) <= now;
    const notExpired = !c.Expires_At__c || new Date(c.Expires_At__c) > now;
    if (!c.Is_Active__c || !hasStarted || !notExpired) continue;

    // Upsert: insert new, or update amount/expiry/max_uses if the row exists.
    // PG `coupons` table has `code` as PRIMARY KEY, so ON CONFLICT works.
    await db
      .insert(schema.coupons)
      .values({
        code,
        kind: c.Kind__c,
        amountPaise: c.Amount_Paise__c,
        expiresAt: c.Expires_At__c ? new Date(c.Expires_At__c) : null,
        maxUses: c.Max_Uses__c ?? null,
      })
      .onConflictDoUpdate({
        target: schema.coupons.code,
        set: {
          kind: c.Kind__c,
          amountPaise: c.Amount_Paise__c,
          expiresAt: c.Expires_At__c ? new Date(c.Expires_At__c) : null,
          maxUses: c.Max_Uses__c ?? null,
        },
      });
    upserted++;
  }

  // Deactivate any PG coupons that are NOT in the active set from SF. We do
  // this by setting their max_uses to a value ≤ their current redemptions,
  // which poisons /api/coupons/validate so they fail with max_uses_reached.
  //
  // We can't simply DELETE the row — coupon_redemptions has a FK to
  // coupons.code for historical integrity.
  const activeSet = new Set(
    coupons
      .filter((c) => {
        const now = new Date();
        const hasStarted = !c.Starts_At__c || new Date(c.Starts_At__c) <= now;
        const notExpired = !c.Expires_At__c || new Date(c.Expires_At__c) > now;
        return c.Is_Active__c && hasStarted && notExpired;
      })
      .map((c) => c.Name.toUpperCase())
  );

  const pgRows = await db.select().from(schema.coupons);
  const toDeactivate = pgRows.filter(
    (r) => !activeSet.has(r.code) && (r.maxUses === null || r.maxUses > r.redemptions)
  );

  let deactivated = 0;
  for (const row of toDeactivate) {
    await db
      .update(schema.coupons)
      .set({ maxUses: row.redemptions })
      .where(eq(schema.coupons.code, row.code));
    deactivated++;
  }

  // Silence unused-import warnings when the toDeactivate path is empty
  void inArray;
  void sql;

  return { upserted, deactivated };
}

async function main(): Promise<void> {
  if (LOOP) {
    console.log(`[coupon-cache] LOOP mode — interval ${INTERVAL_MS}ms`);
    let stopping = false;
    for (const sig of ["SIGINT", "SIGTERM"]) {
      process.on(sig, () => {
        console.log(`[coupon-cache] ${sig} received — stopping`);
        stopping = true;
      });
    }
    while (!stopping) {
      try {
        const result = await refreshOnce();
        console.log(
          `[coupon-cache] ✓ upserted=${result.upserted} deactivated=${result.deactivated}`
        );
      } catch (err) {
        console.error("[coupon-cache] refresh failed:", err);
      }
      if (stopping) break;
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }
    process.exit(0);
  }

  // Single-pass
  const result = await refreshOnce();
  console.log(
    `[coupon-cache] done — upserted=${result.upserted} deactivated=${result.deactivated}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[coupon-cache] fatal:", err);
  process.exit(1);
});
