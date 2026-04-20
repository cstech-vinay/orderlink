// Retention job: delete orders_ref rows that have been synced to Salesforce
// AND are older than the retention window. Salesforce is canonical for order
// history; Postgres only keeps a transient pointer for the live webhook/
// reconciliation window (Razorpay refunds up to 180 days, but we've seen no
// need to keep >90 days — any rare refund older than that can be resolved via
// SF Order record + Razorpay dashboard lookup).
//
// Also prunes synced pending_sf_sync rows (job's done — no reason to keep
// encrypted PII around).
//
// Run:  docker compose -f docker-compose.dev.yml exec app npx tsx scripts/prune-synced-orders.ts
// Cron: daily at 03:00 IST is plenty.
import "dotenv/config";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";

const RETENTION_DAYS = Number(process.env.ORDERS_REF_RETENTION_DAYS ?? 90);
const PENDING_SYNCED_RETENTION_HOURS = Number(
  process.env.PENDING_SYNC_RETENTION_HOURS ?? 24
);

async function main() {
  const ordersCutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const pendingCutoff = new Date(
    Date.now() - PENDING_SYNCED_RETENTION_HOURS * 60 * 60 * 1000
  );

  // 1. Delete synced pending_sf_sync rows. FK cascade on orders_ref means
  //    deleting an order would cascade these anyway — we prune early so the
  //    encrypted PII isn't sitting around longer than needed.
  const deletedPending = await db
    .delete(schema.pendingSfSync)
    .where(
      and(
        eq(schema.pendingSfSync.status, "synced"),
        lt(schema.pendingSfSync.createdAt, pendingCutoff)
      )
    )
    .returning({ id: schema.pendingSfSync.id });
  console.log(
    `[retention] deleted ${deletedPending.length} pending_sf_sync rows (synced, older than ${PENDING_SYNCED_RETENTION_HOURS}h)`
  );

  // 2. Delete orders_ref rows that are both SF-synced AND older than retention.
  //    Uses created_at as the cutoff; sf_last_sync_at could also work but
  //    created_at is simpler and typically within a few minutes of sync.
  const deletedOrders = await db
    .delete(schema.ordersRef)
    .where(
      and(
        eq(schema.ordersRef.sfSynced, true),
        lt(schema.ordersRef.createdAt, ordersCutoff)
      )
    )
    .returning({ orderNumber: schema.ordersRef.orderNumber });
  console.log(
    `[retention] deleted ${deletedOrders.length} orders_ref rows (synced, older than ${RETENTION_DAYS}d)`
  );

  if (deletedOrders.length > 0) {
    console.log(
      "[retention] sample: " +
        deletedOrders
          .slice(0, 5)
          .map((r) => r.orderNumber)
          .join(", ") +
        (deletedOrders.length > 5 ? ", …" : "")
    );
  }

  // 3. Report on what's still around — useful for ops
  const summary = await db.execute<{ kind: string; count: string }>(sql`
    SELECT 'orders_ref_synced' AS kind, COUNT(*)::text AS count
      FROM orders_ref WHERE sf_synced = true
    UNION ALL
    SELECT 'orders_ref_unsynced', COUNT(*)::text
      FROM orders_ref WHERE sf_synced = false
    UNION ALL
    SELECT 'pending_sf_sync_pending', COUNT(*)::text
      FROM pending_sf_sync WHERE status = 'pending'
    UNION ALL
    SELECT 'pending_sf_sync_failed', COUNT(*)::text
      FROM pending_sf_sync WHERE status = 'failed'
  `);
  const rows = (summary as unknown as Array<{ kind: string; count: string }>);
  const flat = Array.isArray(rows)
    ? rows
    : (summary as unknown as { rows: Array<{ kind: string; count: string }> }).rows ?? [];
  console.log("[retention] post-prune counts:");
  for (const r of flat) {
    console.log(`  ${r.kind}: ${r.count}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[retention] failed:", err);
  process.exit(1);
});
