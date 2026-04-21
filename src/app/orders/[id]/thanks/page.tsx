import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";
import { LEGAL } from "@/lib/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate UUID shape before hitting DB to avoid Drizzle errors on bad input.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const [order] = await db
    .select()
    .from(schema.ordersRef)
    .where(eq(schema.ordersRef.id, id))
    .limit(1);

  if (!order) notFound();

  const product = getProductBySlug(order.productSlug);

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 md:py-20">
      <div
        aria-hidden
        className="w-14 h-14 rounded-full bg-coral text-cream flex items-center justify-center mb-6 shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41z" />
        </svg>
      </div>

      <p className="font-mono text-xs uppercase tracking-widest text-coral">
        Order confirmed
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-ink mt-3">
        Thank you, {order.customerFirstInitial}
      </h1>
      <p className="mt-3 font-sans text-ink-soft text-lg">
        Your order{" "}
        <strong className="text-ink font-mono">{order.orderNumber}</strong> is
        confirmed and will ship via Meesho Logistics.
      </p>

      {/* Order summary grid */}
      <dl className="mt-10 rounded-lg border border-[color:var(--rule)] p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 font-sans text-sm">
        <Row label="Order number">
          <span className="font-mono">{order.orderNumber}</span>
        </Row>
        <Row label="Invoice number">
          <span className="font-mono">{order.invoiceNumber}</span>
        </Row>
        <Row label="Payment method">
          {order.paymentMethod === "prepaid" ? "Prepaid" : "Pay on delivery"}
        </Row>
        <Row label="Status">
          <span className="font-mono uppercase text-[0.65rem] tracking-wider bg-cream-deep/60 px-2 py-0.5 rounded">
            {order.status}
          </span>
        </Row>
        <Row label={order.paymentMethod === "prepaid" ? "Paid online" : "Advance paid"}>
          {rupees(order.advancePaise)}
        </Row>
        {order.balanceDuePaise > 0 && (
          <Row label="Balance due on delivery">
            <span className="text-coral">{rupees(order.balanceDuePaise)}</span>
          </Row>
        )}
        <Row label="Total">
          <strong className="text-ink">{rupees(order.totalPaise)}</strong>
        </Row>
        {product && <Row label="Product">{product.title}</Row>}
      </dl>

      {/* What happens next */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">What happens next</h2>
        <ul className="mt-4 space-y-2 font-sans text-sm text-ink">
          <li className="flex gap-3">
            <span aria-hidden className="text-coral shrink-0">&#10004;</span>
            <span>
              Invoice email sent from Salesforce (our CRM system of record) &mdash;
              usually arrives within a minute or two.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-coral shrink-0">&#128230;</span>
            <span>
              We pack and hand over to Meesho Logistics within 1 working day.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-coral shrink-0">&#128241;</span>
            <span>
              You&rsquo;ll receive shipping + tracking SMS from Meesho at each stage &mdash;
              dispatched, out for delivery, delivered.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-coral shrink-0">&#127968;</span>
            <span>
              Arrives at pincode <strong className="text-ink">{order.shipPincode}</strong>{" "}
              in 3&ndash;8 business days.
            </span>
          </li>
        </ul>
      </section>

      {/* Invoice download — shows when PDF has been generated */}
      {order.invoicePdfPath && (
        <section className="mt-8 rounded-md bg-cream-deep/30 border border-[color:var(--rule)] p-4">
          <p className="font-sans text-sm text-ink">
            <a
              href={`/orders/${order.id}/invoice.pdf`}
              className="text-coral underline underline-offset-4 hover:no-underline font-medium"
            >
              Download GST invoice (PDF)
            </a>
            <span className="text-ink-soft"> &middot; also emailed to you.</span>
          </p>
        </section>
      )}

      {/* Action buttons */}
      <div className="mt-10 flex flex-wrap gap-3 font-sans text-sm">
        <Link
          href={`/track?order=${order.orderNumber}&code=${order.trackKey}`}
          className="rounded-md bg-coral text-cream font-medium px-5 py-2.5 hover:opacity-90 transition-colors"
        >
          Track this order
        </Link>
        <Link
          href="/"
          className="rounded-md border border-[color:var(--rule-strong)] text-ink px-5 py-2.5 hover:bg-cream-deep/30 transition-colors"
        >
          &larr; Continue shopping
        </Link>
      </div>

      {/* Support footer */}
      <p className="mt-12 font-sans text-xs text-ink-soft/80 border-t border-[color:var(--rule)] pt-6">
        Questions? Email{" "}
        <a
          href={`mailto:${LEGAL.supportEmail}`}
          className="text-coral underline underline-offset-4 hover:no-underline"
        >
          {LEGAL.supportEmail}
        </a>{" "}
        or WhatsApp {LEGAL.whatsappNumber}. Or track your order anytime at{" "}
        <Link href="/track" className="text-coral underline underline-offset-4 hover:no-underline">
          /track
        </Link>{" "}
        with order number + last 4 digits of your mobile (
        <code className="font-mono">{order.customerMobileLast4}</code>).
      </p>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-soft mb-1">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
