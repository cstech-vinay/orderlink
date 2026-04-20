"use client";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { rupees } from "@/lib/pricing";
import { getProductBySlug } from "@/data/products";
import { LEGAL } from "@/lib/legal";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentMethod: "prepaid" | "pay_on_delivery";
  totalPaise: number;
  advancePaise: number;
  balanceDuePaise: number;
  productSlug: string;
  shipPincode: string;
  createdAt: string;
};

// Stage order drives the timeline fill. Abandoned/cancelled orders break out
// via a separate failure banner below.
const STAGES: { key: string; label: string; sub?: string }[] = [
  { key: "paid", label: "Payment received" },
  { key: "confirmed", label: "Confirmed with Meesho" },
  { key: "shipped", label: "In transit", sub: "Tracking SMS sent" },
  { key: "delivered", label: "Delivered" },
];

// "Pending advance/payment" and "advance_paid" (POD) are collapsed onto the
// "Payment received" stage for display.
function stageIndexForStatus(status: string): number {
  if (status === "delivered") return 3;
  if (status === "shipped") return 2;
  if (status === "confirmed") return 1;
  if (status === "paid" || status === "advance_paid") return 0;
  return -1;
}

export default function TrackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <TrackInner />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <p className="font-sans text-ink-soft">Loading…</p>
    </main>
  );
}

function TrackInner() {
  const sp = useSearchParams();
  // Accept both ?order= (from /thanks) and legacy ?id= just in case
  const [orderNumber, setOrderNumber] = useState(sp.get("order") ?? sp.get("id") ?? "");
  const [trackKey, setTrackKey] = useState(sp.get("code") ?? "");
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.toUpperCase(), trackKey }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "rate_limited"
            ? `Too many lookups. Try again in ${Math.ceil((data.retryAfterSeconds ?? 3600) / 60)} minutes.`
            : data.error === "invalid_input"
              ? "Check the format — order number like OL-2026-0001, then 4 digits."
              : "We couldn't find that order. Check the number + last-4 mobile match."
        );
        setResult(null);
        return;
      }
      setResult(data.order as TrackedOrder);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, orderNumber, trackKey]);

  // Auto-submit if both params arrived in the URL (deep-link from /thanks)
  useEffect(() => {
    if (orderNumber && trackKey && !result && !loading) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-coral">
        Track your order
      </p>
      <h1 className="font-display text-4xl text-ink mt-3">Where is my order?</h1>
      <p className="font-sans text-ink-soft mt-2">
        Enter your order number and the last 4 digits of the mobile you used at
        checkout.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="block">
          <span className="font-sans text-sm text-ink-soft">Order number</span>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono focus:outline-none focus:border-coral"
            placeholder="OL-2026-0001"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="block">
          <span className="font-sans text-sm text-ink-soft">
            Mobile (last 4 digits)
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={trackKey}
            onChange={(e) => setTrackKey(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-[0.5em] text-center focus:outline-none focus:border-coral"
            placeholder="••••"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !orderNumber || trackKey.length !== 4}
          className="rounded-md bg-coral text-cream font-sans font-medium px-5 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Looking up…" : "Look up order"}
        </button>
        {error && <p className="font-sans text-sm text-coral">{error}</p>}
      </form>

      {result && <OrderTimeline order={result} />}

      {!result && !error && (
        <p className="mt-10 font-sans text-xs text-ink-soft/70">
          Need help? Message us on WhatsApp at {LEGAL.whatsappNumber} or email{" "}
          <a
            href={`mailto:${LEGAL.supportEmail}`}
            className="text-coral underline underline-offset-4 hover:no-underline"
          >
            {LEGAL.supportEmail}
          </a>
          .
        </p>
      )}
    </main>
  );
}

function OrderTimeline({ order }: { order: TrackedOrder }) {
  const product = getProductBySlug(order.productSlug);
  const stageIdx = stageIndexForStatus(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "abandoned";
  const placedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section className="mt-10 rounded-lg border border-[color:var(--rule)] p-6 space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          {order.orderNumber}
        </p>
        <h2 className="font-display text-2xl text-ink mt-1">
          {product?.title ?? order.productSlug}
        </h2>
        <p className="font-sans text-sm text-ink-soft mt-2">Placed {placedDate}</p>
      </header>

      {isCancelled ? (
        <div className="rounded-md bg-coral/10 border border-coral/30 p-4">
          <p className="font-sans text-sm text-coral font-medium">
            {order.status === "abandoned"
              ? "This order was abandoned before payment could complete."
              : "This order was cancelled."}
          </p>
          <p className="font-sans text-xs text-ink-soft/80 mt-1">
            If this is a mistake, email us with the order number and we&rsquo;ll
            look into it.
          </p>
        </div>
      ) : stageIdx < 0 ? (
        <p className="font-sans text-sm text-ink-soft">
          Status:{" "}
          <code className="font-mono bg-cream-deep/60 px-2 py-0.5 rounded">
            {order.status}
          </code>{" "}
          — awaiting payment confirmation.
        </p>
      ) : (
        <ol className="space-y-4">
          {STAGES.map((stage, i) => {
            const done = i <= stageIdx;
            const current = i === stageIdx;
            return (
              <li
                key={stage.key}
                className={`flex items-start gap-3 font-sans text-sm ${
                  done ? "text-ink" : "text-ink-soft/50"
                }`}
              >
                <span
                  className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                    done ? "bg-coral" : "border-2 border-ink-soft/30"
                  } ${current ? "ring-4 ring-coral/20" : ""}`}
                  aria-hidden
                />
                <div>
                  <p className={done ? "font-medium" : ""}>{stage.label}</p>
                  {done && stage.sub && (
                    <p className="text-xs text-ink-soft/80 mt-0.5">{stage.sub}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="border-t border-[color:var(--rule)] pt-4 flex flex-wrap gap-x-8 gap-y-2 font-sans text-sm">
        <div>
          <dt className="text-ink-soft text-xs uppercase tracking-wider font-mono">
            Total
          </dt>
          <dd className="text-ink mt-1">{rupees(order.totalPaise)}</dd>
        </div>
        {order.balanceDuePaise > 0 && (
          <div>
            <dt className="text-ink-soft text-xs uppercase tracking-wider font-mono">
              Balance due
            </dt>
            <dd className="text-coral mt-1">{rupees(order.balanceDuePaise)}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-soft text-xs uppercase tracking-wider font-mono">
            Delivering to
          </dt>
          <dd className="text-ink mt-1 font-mono">{order.shipPincode}</dd>
        </div>
      </div>
    </section>
  );
}
