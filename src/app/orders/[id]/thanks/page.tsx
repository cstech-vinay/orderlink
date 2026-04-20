// Minimal stub for T20 — replaced by the full confirmation page in T24
// (with invoice download, order summary, tracking link, shipping ETA).
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { LEGAL } from "@/lib/legal";

export const dynamic = "force-dynamic";

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate UUID shape before hitting DB
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, id))
    .limit(1);

  if (!order) notFound();

  const rupees = (paise: number) =>
    `\u20B9${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-coral">
        Order confirmed
      </p>
      <h1 className="font-display text-4xl text-ink mt-3">Thank you, {order.customerFirstInitial}</h1>
      <p className="mt-4 font-sans text-lg text-ink-soft">
        Your order <strong className="text-ink font-mono">{order.orderNumber}</strong> is confirmed
        and will ship via Meesho Logistics.
      </p>

      <dl className="mt-10 rounded-lg border border-[color:var(--rule)] p-6 space-y-3 font-sans text-sm">
        <Row label="Order number">
          <span className="font-mono">{order.orderNumber}</span>
        </Row>
        <Row label="Invoice number">
          <span className="font-mono">{order.invoiceNumber}</span>
        </Row>
        <Row label="Status">
          <span className="font-mono uppercase text-[0.65rem] tracking-wider bg-cream-deep/60 px-2 py-0.5 rounded">
            {order.status}
          </span>
        </Row>
        <Row label="Payment method">
          {order.paymentMethod === "prepaid" ? "Prepaid" : "Pay on delivery"}
        </Row>
        <Row label="Paid now">{rupees(order.advancePaise)}</Row>
        {order.balanceDuePaise > 0 && (
          <Row label="Balance due on delivery">{rupees(order.balanceDuePaise)}</Row>
        )}
        <Row label="Total">{rupees(order.totalPaise)}</Row>
      </dl>

      <p className="mt-8 font-sans text-sm text-ink-soft">
        You&rsquo;ll receive an invoice email shortly (sent from Salesforce, our CRM system of
        record). SMS tracking follows once Meesho picks up the parcel &mdash; usually within
        1 working day.
      </p>

      <p className="mt-6 font-sans text-sm text-ink-soft">
        Track your order any time at{" "}
        <a href="/track" className="text-coral underline underline-offset-4 hover:no-underline">
          /track
        </a>{" "}
        with your order number and the last 4 digits of your mobile (
        <code className="font-mono">{order.customerMobileLast4}</code>).
      </p>

      <p className="mt-6 font-sans text-xs text-ink-soft/70">
        Questions? Email{" "}
        <a href={`mailto:${LEGAL.supportEmail}`} className="text-coral underline">
          {LEGAL.supportEmail}
        </a>{" "}
        or message us on WhatsApp at {LEGAL.whatsappNumber}.
      </p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink text-right">{children}</dd>
    </div>
  );
}
