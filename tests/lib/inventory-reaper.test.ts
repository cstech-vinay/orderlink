import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

describe.skipIf(!hasDb)("reapStaleReservations", () => {
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;
  let eq: typeof import("drizzle-orm").eq;
  let reapStaleReservations: typeof import("@/lib/inventory").reapStaleReservations;
  let encryptJSON: typeof import("@/lib/crypto").encryptJSON;

  beforeAll(async () => {
    ({ db, schema } = await import("@/db/client"));
    ({ sql, eq } = await import("drizzle-orm"));
    ({ reapStaleReservations } = await import("@/lib/inventory"));
    ({ encryptJSON } = await import("@/lib/crypto"));
  });

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    await db.execute(sql`DELETE FROM pending_sf_sync`);
    await db.execute(sql`DELETE FROM orders_ref`);
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'oil-dispenser'`);
    await db.insert(schema.inventory).values({
      productSlug: "oil-dispenser",
      remaining: 5,
      reserved: 2,
    });
  });

  async function insertOrder(args: {
    status: string;
    minutesAgo: number;
  }): Promise<string> {
    const [row] = await db
      .insert(schema.ordersRef)
      .values({
        orderNumber: `OL-2026-REAP-${Math.floor(Math.random() * 10000)}`,
        invoiceNumber: `OL-INV-2026-${Math.floor(Math.random() * 1_000_000)}`,
        status: args.status,
        paymentMethod: "prepaid",
        totalPaise: 19200,
        advancePaise: 19200,
        balanceDuePaise: 0,
        productSlug: "oil-dispenser",
        customerFirstInitial: "P.",
        customerMobileLast4: "3210",
        shipPincode: "411014",
        shipState: "Maharashtra",
        razorpayOrderId: `order_reap_${Math.random()}`,
        trackKey: "3210",
      })
      .returning();

    // Backdate created_at to simulate age
    await db.execute(
      sql`UPDATE orders_ref SET created_at = now() - (interval '1 minute' * ${args.minutesAgo}) WHERE id = ${row.id}`
    );

    // Stash a dummy encrypted PII payload like /api/orders does
    const enc = encryptJSON({
      orderNumber: row.orderNumber,
      fullName: "Priya Sharma",
      email: "priya@example.com",
      mobile: "9876543210",
    });
    await db.insert(schema.pendingSfSync).values({
      orderRefId: row.id,
      payloadCiphertext: enc.ciphertext,
      payloadIv: enc.iv,
      payloadTag: enc.tag,
      jobKind: "full_sync",
      status: "pending",
    });
    return row.id;
  }

  it("marks stale pending order as abandoned + releases reservation", async () => {
    const orderId = await insertOrder({ status: "pending_payment", minutesAgo: 30 });

    const reaped = await reapStaleReservations(15);
    expect(reaped).toBe(1);

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.id, orderId));
    expect(order.status).toBe("abandoned");

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.reserved).toBe(1); // 2 → 1 after releasing this one
  });

  it("promotes pending_sf_sync row from full_sync to lead_sync", async () => {
    const orderId = await insertOrder({ status: "pending_payment", minutesAgo: 30 });

    await reapStaleReservations(15);

    const [syncRow] = await db
      .select()
      .from(schema.pendingSfSync)
      .where(eq(schema.pendingSfSync.orderRefId, orderId));
    expect(syncRow.jobKind).toBe("lead_sync");
    expect(syncRow.status).toBe("pending"); // still needs to drain; just a type change
  });

  it("leaves fresh pending orders alone", async () => {
    const orderId = await insertOrder({ status: "pending_payment", minutesAgo: 5 });

    const reaped = await reapStaleReservations(15);
    expect(reaped).toBe(0);

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.id, orderId));
    expect(order.status).toBe("pending_payment");
  });

  it("leaves already-paid orders alone (doesn't clobber paid orders that happened to be old)", async () => {
    const orderId = await insertOrder({ status: "paid", minutesAgo: 30 });

    const reaped = await reapStaleReservations(15);
    expect(reaped).toBe(0);

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.id, orderId));
    expect(order.status).toBe("paid");
  });

  it("handles POD (pending_advance) orders the same as prepaid", async () => {
    const orderId = await insertOrder({ status: "pending_advance", minutesAgo: 30 });

    const reaped = await reapStaleReservations(15);
    expect(reaped).toBe(1);

    const [order] = await db
      .select()
      .from(schema.ordersRef)
      .where(eq(schema.ordersRef.id, orderId));
    expect(order.status).toBe("abandoned");
  });

  it("reserved never goes below zero when releasing multiple times", async () => {
    // Start with reserved=0 to simulate a weird state
    await db
      .update(schema.inventory)
      .set({ reserved: 0 })
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    await insertOrder({ status: "pending_payment", minutesAgo: 30 });

    await reapStaleReservations(15);

    const [inv] = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "oil-dispenser"));
    expect(inv.reserved).toBe(0); // GREATEST clamp held
  });

  it("reaps multiple stale orders in a single call", async () => {
    await insertOrder({ status: "pending_payment", minutesAgo: 30 });
    await insertOrder({ status: "pending_advance", minutesAgo: 45 });
    await insertOrder({ status: "pending_payment", minutesAgo: 5 }); // fresh — should NOT be reaped

    const reaped = await reapStaleReservations(15);
    expect(reaped).toBe(2);

    const leads = await db
      .select()
      .from(schema.pendingSfSync)
      .where(eq(schema.pendingSfSync.jobKind, "lead_sync"));
    expect(leads).toHaveLength(2);
  });
});
