import { db, schema } from "@/db/client";
import { eq, sql } from "drizzle-orm";

/**
 * Reserve stock atomically. Returns true if the reservation succeeded.
 * Uses a single conditional UPDATE so concurrent requests race on the row
 * lock, not on read-then-write — no oversell possible under any load.
 */
export async function reserveInventory(slug: string, qty: number = 1): Promise<boolean> {
  const result = await db.execute(
    sql`
      UPDATE inventory
         SET reserved = reserved + ${qty}, updated_at = now()
       WHERE product_slug = ${slug}
         AND remaining - reserved >= ${qty}
   RETURNING remaining
    `
  );
  // postgres-js returns an array directly; drizzle's execute wraps slightly — handle both shapes
  const rows = (result as unknown as { length: number }).length ??
    (result as unknown as { rows: { length: number } }).rows?.length ??
    0;
  return rows > 0;
}

/** Commit the reservation into an actual decrement (called after payment success). */
export async function commitInventory(slug: string, qty: number = 1): Promise<void> {
  await db.execute(sql`
    UPDATE inventory
       SET remaining = remaining - ${qty},
           reserved  = reserved  - ${qty},
           updated_at = now()
     WHERE product_slug = ${slug}
       AND reserved >= ${qty}
  `);
}

/** Release a reservation (called if payment fails / webhook says so). */
export async function releaseInventory(slug: string, qty: number = 1): Promise<void> {
  await db.execute(sql`
    UPDATE inventory
       SET reserved = reserved - ${qty},
           updated_at = now()
     WHERE product_slug = ${slug}
       AND reserved >= ${qty}
  `);
}

/**
 * Reap inventory reservations from orders that never completed payment.
 *
 * For each stale order (`pending_advance` or `pending_payment` AND older than
 * `olderThanMinutes`):
 *   1. Release the 1-unit inventory reservation
 *   2. Flip the order status to `abandoned` (distinct from `cancelled` so the
 *      admin dashboard can show an abandoned-cart funnel)
 *   3. Promote the corresponding `pending_sf_sync` row from `full_sync` to
 *      `lead_sync`. The encrypted PII (name, email, mobile, address) is already
 *      sitting there — the T28 Salesforce worker will pick it up and create a
 *      Lead record instead of a Person Account + Order, preserving these
 *      high-intent shoppers for retargeting.
 *
 * Returns the count of rows reaped (for logging / cron heartbeat).
 */
export async function reapStaleReservations(
  olderThanMinutes: number = 15
): Promise<number> {
  const stale = await db
    .select({
      id: schema.ordersRef.id,
      productSlug: schema.ordersRef.productSlug,
    })
    .from(schema.ordersRef)
    .where(
      sql`status IN ('pending_advance', 'pending_payment')
          AND created_at < now() - (interval '1 minute' * ${olderThanMinutes})`
    );

  for (const row of stale) {
    await db.execute(sql`
      UPDATE inventory
         SET reserved = GREATEST(reserved - 1, 0),
             updated_at = now()
       WHERE product_slug = ${row.productSlug}
    `);
    await db
      .update(schema.ordersRef)
      .set({ status: "abandoned", updatedAt: new Date() })
      .where(eq(schema.ordersRef.id, row.id));
    // Flip any still-pending SF sync job for this order from full_sync → lead_sync.
    // Already-succeeded sync rows (shouldn't happen for abandoned orders but safe
    // to guard) are left alone.
    await db.execute(sql`
      UPDATE pending_sf_sync
         SET job_kind = 'lead_sync',
             next_attempt_at = now()
       WHERE order_ref_id = ${row.id}
         AND status = 'pending'
         AND job_kind = 'full_sync'
    `);
  }
  return stale.length;
}

/** Read available (not-reserved) stock count for display surfaces (FOMO, out-of-stock). */
export async function getAvailable(slug: string): Promise<number> {
  const rows = await db
    .select({
      remaining: schema.inventory.remaining,
      reserved: schema.inventory.reserved,
    })
    .from(schema.inventory)
    .where(eq(schema.inventory.productSlug, slug))
    .limit(1);
  if (rows.length === 0) return 0;
  return Math.max(0, rows[0].remaining - rows[0].reserved);
}
