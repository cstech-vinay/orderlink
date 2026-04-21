// Wipes all transactional test data from BOTH Salesforce UAT and local Postgres.
// Preserves seed/catalog data:
//   - PG coupons table (WELCOME10 + STAY5 are real catalog)
//   - PG inventory table (25 seeded products)
//   - SF OrderLink_Coupon__c records
//
// Deletes everything else: orders, customers, leads, redemptions, waitlist,
// invoice PDFs, webhook events. Sequences reset to 1.
//
// Run: docker compose -f docker-compose.dev.yml exec app npx tsx scripts/clear-test-data.ts
//
// NOTE: SF records land in the recycle bin for 15 days. To hard-delete sooner,
// empty the recycle bin in the SF UI (Setup → Storage Usage → Recycle Bin).
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getSalesforceCredentials } from "@/lib/salesforce/config";
import { sfQuery, sfRest } from "@/lib/salesforce/client";

async function countAll(): Promise<void> {
  const counts = await db.execute<{ table: string; count: string }>(sql`
    SELECT 'orders_ref' AS table, COUNT(*)::text AS count FROM orders_ref
    UNION ALL SELECT 'pending_sf_sync', COUNT(*)::text FROM pending_sf_sync
    UNION ALL SELECT 'coupon_redemptions', COUNT(*)::text FROM coupon_redemptions
    UNION ALL SELECT 'webhook_events', COUNT(*)::text FROM webhook_events
    UNION ALL SELECT 'restock_notifications', COUNT(*)::text FROM restock_notifications
    UNION ALL SELECT 'coupons (kept)', COUNT(*)::text FROM coupons
    UNION ALL SELECT 'inventory (kept)', COUNT(*)::text FROM inventory
  `);
  const rows =
    (counts as unknown as Array<{ table: string; count: string }>) ??
    (counts as unknown as { rows: Array<{ table: string; count: string }> }).rows ??
    [];
  const flat = Array.isArray(rows) ? rows : [];
  for (const r of flat) console.log(`   ${r.table}: ${r.count}`);
}

async function clearPostgres(): Promise<void> {
  console.log("\n[pg] BEFORE:");
  await countAll();

  console.log("\n[pg] wiping transactional tables...");
  await db.execute(
    sql`TRUNCATE orders_ref, pending_sf_sync, coupon_redemptions, webhook_events, restock_notifications RESTART IDENTITY CASCADE`
  );

  console.log("[pg] resetting number sequences...");
  await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);

  console.log("\n[pg] AFTER:");
  await countAll();
}

type SfRecord = { Id: string };

async function clearSalesforce(): Promise<void> {
  if (!getSalesforceCredentials()) {
    console.log("\n[sf] SF credentials missing — skipping");
    return;
  }

  const config = getSalesforceCredentials()!;
  const orderRt = config.recordTypeIds.order;
  const accountRt = config.recordTypeIds.personAccount;
  const leadRt = config.recordTypeIds.lead;

  // DELETE order matters due to FK-like dependencies. Delete children first.

  // 1. Coupon redemptions (master-detail to OrderLink_Coupon__c and Lookup to Order)
  const redemptions = await sfQuery<SfRecord>(
    "SELECT Id FROM OrderLink_Coupon_Redemption__c"
  );
  console.log(`\n[sf] OrderLink_Coupon_Redemption__c: ${redemptions.length} records`);
  for (const r of redemptions) {
    await sfRest({
      method: "DELETE",
      path: `/sobjects/OrderLink_Coupon_Redemption__c/${r.Id}`,
    });
  }

  // 2. OrderLink-tagged Orders. ContentDocumentLinks cascade automatically when
  //    the Order is deleted, but the ContentDocument itself survives — we
  //    handle those below.
  const orders = await sfQuery<SfRecord & { OrderNumber: string }>(
    `SELECT Id, OrderNumber FROM Order WHERE RecordTypeId = '${orderRt}'`
  );
  console.log(`[sf] Order (OrderLink): ${orders.length} records`);
  // Grab the ContentDocuments linked to these Orders BEFORE we delete them
  const contentDocIds: string[] = [];
  if (orders.length > 0) {
    const orderIds = orders.map((o) => `'${o.Id}'`).join(",");
    const links = await sfQuery<{ ContentDocumentId: string }>(
      `SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId IN (${orderIds})`
    );
    for (const l of links) contentDocIds.push(l.ContentDocumentId);
  }
  for (const o of orders) {
    await sfRest({ method: "DELETE", path: `/sobjects/Order/${o.Id}` });
  }

  // 3. Invoice ContentDocuments (orphaned after Orders deletion)
  console.log(`[sf] ContentDocument (invoice PDFs): ${contentDocIds.length} records`);
  for (const docId of contentDocIds) {
    try {
      await sfRest({ method: "DELETE", path: `/sobjects/ContentDocument/${docId}` });
    } catch (err) {
      // Some ContentDocuments may already be gone (recycle bin), continue
      console.warn(`   skipped ${docId}:`, err instanceof Error ? err.message : err);
    }
  }

  // 4. OrderLink-tagged Leads (abandoned carts)
  const leads = await sfQuery<SfRecord>(
    `SELECT Id FROM Lead WHERE RecordTypeId = '${leadRt}'`
  );
  console.log(`[sf] Lead (OrderLink_Abandoned_Cart): ${leads.length} records`);
  for (const l of leads) {
    await sfRest({ method: "DELETE", path: `/sobjects/Lead/${l.Id}` });
  }

  // 5. Restock waitlist
  const restock = await sfQuery<SfRecord>(
    "SELECT Id FROM OrderLink_Restock_Waitlist__c"
  );
  console.log(`[sf] OrderLink_Restock_Waitlist__c: ${restock.length} records`);
  for (const r of restock) {
    await sfRest({
      method: "DELETE",
      path: `/sobjects/OrderLink_Restock_Waitlist__c/${r.Id}`,
    });
  }

  // 6. OrderLink-tagged Person Accounts (last — other deletes may cascade to them)
  const accounts = await sfQuery<SfRecord>(
    `SELECT Id FROM Account WHERE RecordTypeId = '${accountRt}'`
  );
  console.log(`[sf] Account (OrderLink_Customer): ${accounts.length} records`);
  for (const a of accounts) {
    try {
      await sfRest({ method: "DELETE", path: `/sobjects/Account/${a.Id}` });
    } catch (err) {
      // If the account has any linked record we didn't know about, SF will
      // refuse the delete. Log and keep going.
      console.warn(`   skipped ${a.Id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n[sf] done — records sent to Recycle Bin (15-day TTL).");
  console.log("[sf] Hard-delete now via: SF UI → Setup → Storage Usage → Recycle Bin.");
}

async function main(): Promise<void> {
  console.log("=== OrderLink test-data cleanup ===");
  console.log("   Preserves: PG coupons, PG inventory, SF OrderLink_Coupon__c");
  console.log("   Deletes:   everything else (orders, customers, leads, PDFs, events)");

  await clearPostgres();
  await clearSalesforce();

  console.log("\n✓ cleanup complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[cleanup] fatal:", err);
  process.exit(1);
});
