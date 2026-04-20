"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";

const VALID_STATUSES = new Set([
  "pending_advance",
  "pending_payment",
  "advance_paid",
  "paid",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "abandoned",
]);

/**
 * Admin sets a new status on an order. Local-DB only for now — Salesforce
 * back-sync (T31) will layer on top later to push the same update to SF.
 */
export async function setOrderStatus(orderId: string, newStatus: string): Promise<void> {
  if (!VALID_STATUSES.has(newStatus)) {
    throw new Error(`invalid_status:${newStatus}`);
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, orderId))
    .limit(1);
  if (!order) {
    throw new Error("order_not_found");
  }

  await db
    .update(schema.ordersRef)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schema.ordersRef.id, orderId));

  revalidatePath("/admin/orders");
}
