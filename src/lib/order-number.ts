import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export function formatOrderNumber(seqValue: number, year: number): string {
  return `OL-${year}-${String(seqValue).padStart(4, "0")}`;
}

export async function generateOrderNumber(now: Date = new Date()): Promise<string> {
  const row = await db.execute<{ nextval: string | number }>(
    sql`SELECT nextval('order_number_sequence') AS nextval`
  );
  const raw =
    (row as unknown as Array<{ nextval: string | number }>)[0]?.nextval ??
    (row as unknown as { rows: Array<{ nextval: string | number }> }).rows?.[0]?.nextval;
  const seqValue = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return formatOrderNumber(seqValue, now.getFullYear());
}
