import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";
import { setOrderStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = [
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
];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  advance_paid: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-200 text-green-900",
  pending_advance: "bg-ink-soft/10 text-ink-soft",
  pending_payment: "bg-ink-soft/10 text-ink-soft",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
  abandoned: "bg-ink-soft/10 text-ink-soft/70",
};

export default async function AdminOrdersPage() {
  const rows = await db
    .select()
    .from(schema.ordersRef)
    .orderBy(desc(schema.ordersRef.createdAt))
    .limit(200);

  const counts = countByStatus(rows);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-[color:var(--rule)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-coral">
            OrderLink admin
          </p>
          <h1 className="font-display text-3xl text-ink mt-2">Orders</h1>
          <p className="font-sans text-sm text-ink-soft mt-1">
            {rows.length} of most recent 200
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/orders/export"
            className="rounded-md border border-[color:var(--rule-strong)] text-ink font-mono text-xs uppercase tracking-widest px-4 py-2 hover:bg-cream-deep/30"
          >
            Export CSV &darr;
          </a>
        </div>
      </header>

      {/* Summary chips */}
      <div className="mt-6 flex flex-wrap gap-2 font-mono text-[0.65rem] uppercase tracking-widest">
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([status, n]) => (
            <span
              key={status}
              className={`rounded-full px-2.5 py-1 ${STATUS_STYLES[status] ?? "bg-ink-soft/10 text-ink-soft"}`}
            >
              {status}: {n}
            </span>
          ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 font-sans text-ink-soft">No orders yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full font-sans text-sm border-collapse">
            <thead>
              <tr className="text-left font-mono text-[0.65rem] uppercase tracking-widest text-ink-soft border-b border-[color:var(--rule)]">
                <th className="py-3 pr-4">Order</th>
                <th className="pr-4">Date</th>
                <th className="pr-4">Customer</th>
                <th className="pr-4">Pincode</th>
                <th className="pr-4">Product</th>
                <th className="pr-4 text-right">Total</th>
                <th className="pr-4 text-right">COD due</th>
                <th className="pr-4">Method</th>
                <th className="pr-4">Status</th>
                <th className="pr-4">SF</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const product = getProductBySlug(r.productSlug);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[color:var(--rule)] align-top hover:bg-cream-deep/30"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-mono text-xs text-ink">{r.orderNumber}</p>
                      <p className="font-mono text-[0.65rem] text-ink-soft/70 mt-0.5">
                        {r.invoiceNumber}
                      </p>
                    </td>
                    <td className="pr-4 text-ink-soft">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="pr-4">
                      {r.customerFirstInitial} &middot; …{r.customerMobileLast4}
                    </td>
                    <td className="pr-4 font-mono text-xs">{r.shipPincode}</td>
                    <td className="pr-4 text-ink">{product?.title ?? r.productSlug}</td>
                    <td className="pr-4 text-right">{rupees(r.totalPaise)}</td>
                    <td className="pr-4 text-right text-coral">
                      {r.balanceDuePaise > 0 ? rupees(r.balanceDuePaise) : "—"}
                    </td>
                    <td className="pr-4 font-mono text-[0.65rem] uppercase">
                      {r.paymentMethod === "prepaid" ? "PRE" : "POD"}
                    </td>
                    <td className="pr-4">
                      <form
                        action={async (fd: FormData) => {
                          "use server";
                          await setOrderStatus(r.id, String(fd.get("status")));
                        }}
                        className="flex items-center gap-2"
                      >
                        <span
                          aria-hidden
                          className={`inline-block w-2 h-2 rounded-full ${
                            (STATUS_STYLES[r.status] ?? "").includes("coral") ||
                            (STATUS_STYLES[r.status] ?? "").includes("red")
                              ? "bg-coral"
                              : r.status === "delivered" || r.status === "paid"
                                ? "bg-green-600"
                                : "bg-ink-soft"
                          }`}
                        />
                        <select
                          name="status"
                          defaultValue={r.status}
                          className="rounded border border-[color:var(--rule)] bg-cream px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-coral"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-xs text-coral underline underline-offset-4 hover:no-underline"
                        >
                          Set
                        </button>
                      </form>
                    </td>
                    <td className="pr-4 text-xs text-ink-soft">
                      {r.sfSynced ? "✓" : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/orders/${r.id}/invoice.pdf`}
                        target="_blank"
                        className="text-xs text-ink-soft underline underline-offset-4 hover:text-coral"
                      >
                        PDF
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function countByStatus(rows: { status: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}
