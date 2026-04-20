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
