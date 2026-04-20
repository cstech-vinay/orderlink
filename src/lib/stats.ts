import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Returns true if this product had >= threshold paid/advance-paid orders in
 * the last 24h. Drives the "Selling fast" badge on product pages.
 */
export async function isSellingFast(
  productSlug: string,
  threshold: number = 3
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count
      FROM orders_ref
     WHERE product_slug = ${productSlug}
       AND status IN ('advance_paid', 'paid', 'confirmed', 'shipped', 'delivered')
       AND created_at >= ${since.toISOString()}
  `);
  const rows =
    (result as unknown as Array<{ count: string }>) ??
    (result as unknown as { rows: Array<{ count: string }> }).rows ??
    [];
  const flat = Array.isArray(rows) ? rows : [];
  const first = flat[0] ?? (result as unknown as { rows: Array<{ count: string }> }).rows?.[0];
  return parseInt(first?.count ?? "0", 10) >= threshold;
}
