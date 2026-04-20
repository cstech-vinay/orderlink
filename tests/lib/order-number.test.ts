import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { formatOrderNumber } from "@/lib/order-number";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

describe("formatOrderNumber", () => {
  it("formats with year + 4-digit pad", () => {
    expect(formatOrderNumber(1, 2026)).toBe("OL-2026-0001");
    expect(formatOrderNumber(42, 2026)).toBe("OL-2026-0042");
    expect(formatOrderNumber(9999, 2026)).toBe("OL-2026-9999");
  });

  it("does not truncate past 4 digits — overflows naturally at 10000", () => {
    expect(formatOrderNumber(10000, 2026)).toBe("OL-2026-10000");
  });

  it("year flows through verbatim", () => {
    expect(formatOrderNumber(7, 2027)).toBe("OL-2027-0007");
  });
});

describe.skipIf(!hasDb)("generateOrderNumber (requires DATABASE_URL)", () => {
  let db: typeof import("@/db/client").db;
  let sql: typeof import("drizzle-orm").sql;
  let generateOrderNumber: typeof import("@/lib/order-number").generateOrderNumber;

  beforeAll(async () => {
    ({ db } = await import("@/db/client"));
    ({ sql } = await import("drizzle-orm"));
    ({ generateOrderNumber } = await import("@/lib/order-number"));
  });

  beforeEach(async () => {
    await db.execute(sql`ALTER SEQUENCE order_number_sequence RESTART WITH 1`);
  });

  it("generates sequential numbers", async () => {
    const a = await generateOrderNumber(new Date("2026-06-01"));
    const b = await generateOrderNumber(new Date("2026-06-01"));
    expect(a).toBe("OL-2026-0001");
    expect(b).toBe("OL-2026-0002");
  });
});
