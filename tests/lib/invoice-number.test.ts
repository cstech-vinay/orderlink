import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { formatInvoiceNumber } from "@/lib/invoice-number";

const hasDb = Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== "";

describe("formatInvoiceNumber", () => {
  it("formats number with year + 6-digit zero-pad", () => {
    expect(formatInvoiceNumber(1, 2026)).toBe("OL-INV-2026-000001");
    expect(formatInvoiceNumber(42, 2026)).toBe("OL-INV-2026-000042");
    expect(formatInvoiceNumber(999999, 2026)).toBe("OL-INV-2026-999999");
  });

  it("year flows through verbatim", () => {
    expect(formatInvoiceNumber(7, 2027)).toBe("OL-INV-2027-000007");
  });
});

describe.skipIf(!hasDb)("generateInvoiceNumber (requires DATABASE_URL)", () => {
  let db: typeof import("@/db/client").db;
  let sql: typeof import("drizzle-orm").sql;
  let generateInvoiceNumber: typeof import("@/lib/invoice-number").generateInvoiceNumber;

  beforeAll(async () => {
    ({ db } = await import("@/db/client"));
    ({ sql } = await import("drizzle-orm"));
    ({ generateInvoiceNumber } = await import("@/lib/invoice-number"));
  });

  beforeEach(async () => {
    await db.execute(sql`ALTER SEQUENCE invoice_sequence RESTART WITH 1`);
  });

  it("generates sequential invoice numbers via DB sequence", async () => {
    const first = await generateInvoiceNumber(new Date("2026-01-01"));
    const second = await generateInvoiceNumber(new Date("2026-01-01"));
    const third = await generateInvoiceNumber(new Date("2026-01-01"));
    expect(first).toBe("OL-INV-2026-000001");
    expect(second).toBe("OL-INV-2026-000002");
    expect(third).toBe("OL-INV-2026-000003");
  });

  it("is gap-free even under concurrent calls", async () => {
    const promises = Array.from({ length: 10 }, () =>
      generateInvoiceNumber(new Date("2026-01-01"))
    );
    const results = await Promise.all(promises);
    const numbers = results
      .map((s) => parseInt(s.split("-").pop()!, 10))
      .sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
