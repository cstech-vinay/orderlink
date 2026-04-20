import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";

const CSV_COLUMNS: Array<keyof typeof schema.ordersRef.$inferSelect> = [
  "orderNumber",
  "invoiceNumber",
  "status",
  "paymentMethod",
  "totalPaise",
  "advancePaise",
  "balanceDuePaise",
  "productSlug",
  "shipPincode",
  "shipState",
  "razorpayOrderId",
  "razorpayPaymentId",
  "sfSynced",
  "sfAccountId",
  "sfOrderId",
  "createdAt",
  "updatedAt",
  "utmSource",
  "utmMedium",
  "utmCampaign",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const rows = await db
    .select()
    .from(schema.ordersRef)
    .orderBy(desc(schema.ordersRef.createdAt));

  const lines: string[] = [];
  lines.push(CSV_COLUMNS.map((c) => csvEscape(c)).join(","));
  for (const r of rows) {
    lines.push(CSV_COLUMNS.map((c) => csvEscape(r[c])).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orderlink-orders-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
