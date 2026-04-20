import { describe, it, expect, beforeEach, beforeAll } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

describe.skipIf(!hasDb)("inventory lib (requires DATABASE_URL)", () => {
  let db: typeof import("@/db/client").db;
  let schema: typeof import("@/db/client").schema;
  let sql: typeof import("drizzle-orm").sql;
  let eq: typeof import("drizzle-orm").eq;
  let inventory: typeof import("@/lib/inventory");

  beforeAll(async () => {
    ({ db, schema } = await import("@/db/client"));
    ({ sql, eq } = await import("drizzle-orm"));
    inventory = await import("@/lib/inventory");
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM inventory WHERE product_slug = 'test-sku'`);
    await db.insert(schema.inventory).values({
      productSlug: "test-sku",
      remaining: 5,
      reserved: 0,
    });
  });

  it("reserves when stock is available", async () => {
    expect(await inventory.reserveInventory("test-sku")).toBe(true);
    expect(await inventory.getAvailable("test-sku")).toBe(4);
  });

  it("refuses when out of stock", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await inventory.reserveInventory("test-sku")).toBe(true);
    }
    expect(await inventory.reserveInventory("test-sku")).toBe(false);
    expect(await inventory.getAvailable("test-sku")).toBe(0);
  });

  it("commit decrements both remaining and reserved", async () => {
    await inventory.reserveInventory("test-sku");
    await inventory.commitInventory("test-sku");
    const row = await db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.productSlug, "test-sku"));
    expect(row[0].remaining).toBe(4);
    expect(row[0].reserved).toBe(0);
  });

  it("release returns capacity", async () => {
    await inventory.reserveInventory("test-sku");
    expect(await inventory.getAvailable("test-sku")).toBe(4);
    await inventory.releaseInventory("test-sku");
    expect(await inventory.getAvailable("test-sku")).toBe(5);
  });

  it("concurrent reserves never oversell", async () => {
    // Fire 10 parallel reserves against a stock of 5 — must get exactly 5 successes
    const promises = Array.from({ length: 10 }, () => inventory.reserveInventory("test-sku"));
    const results = await Promise.all(promises);
    const successes = results.filter(Boolean).length;
    expect(successes).toBe(5);
    expect(await inventory.getAvailable("test-sku")).toBe(0);
  });
});
