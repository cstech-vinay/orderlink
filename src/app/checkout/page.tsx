"use client";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProductBySlug } from "@/data/products";
import { calculateOrderAmounts } from "@/lib/pricing";
import { PincodeField } from "@/components/PincodeField";
import { PaymentSelector } from "@/components/PaymentSelector";
import { OrderSummary } from "@/components/OrderSummary";
import { SalesforceTrustStrip } from "@/components/SalesforceTrustStrip";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutFallback() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <p className="font-sans text-ink-soft">Loading checkout…</p>
    </main>
  );
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sku = searchParams.get("sku") ?? "oil-dispenser";
  const product = getProductBySlug(sku);

  useEffect(() => {
    if (!product || product.status !== "live") {
      router.replace("/");
    }
  }, [product, router]);

  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "pay_on_delivery">("prepaid");
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    pincode: "",
    city: "",
    state: "",
    couponCode: "",
  });
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);

  const amounts = useMemo(() => {
    if (!product) return null;
    return calculateOrderAmounts({
      itemPricePaise: product.itemPricePaise,
      itemPrepaidPricePaise: product.itemPrepaidPricePaise,
      method: paymentMethod,
      couponDiscountPaise: 0,
    });
  }, [product, paymentMethod]);

  const handlePincodeResult = useCallback(
    (r: { serviceable: boolean; city?: string; state?: string }) => {
      setPincodeServiceable(r.serviceable);
      if (r.serviceable && r.city && r.state) {
        setForm((f) => ({ ...f, city: r.city!, state: r.state! }));
      }
    },
    []
  );

  if (!product || product.status !== "live" || !amounts) {
    return <CheckoutFallback />;
  }

  const canSubmit =
    pincodeServiceable === true &&
    form.fullName.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(form.mobile) &&
    /.+@.+\..+/.test(form.email) &&
    form.addressLine1.trim().length >= 5 &&
    form.city.trim().length >= 2 &&
    form.state.trim().length >= 2;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl text-ink">Checkout</h1>
      <p className="font-sans text-ink-soft mt-2">
        Ordering <strong>{product.title}</strong>
      </p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <section className="space-y-4">
            <h2 className="font-display text-xl">Shipping details</h2>
            <Input
              label="Full name"
              required
              value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })}
            />
            <Input
              label="Mobile (10-digit)"
              required
              value={form.mobile}
              onChange={(v) =>
                setForm({ ...form, mobile: v.replace(/\D/g, "").slice(0, 10) })
              }
              help="We share this with Meesho for delivery SMS."
              inputMode="numeric"
              maxLength={10}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Input
              label="Address line 1"
              required
              value={form.addressLine1}
              onChange={(v) => setForm({ ...form, addressLine1: v })}
            />
            <Input
              label="Address line 2 (optional)"
              value={form.addressLine2}
              onChange={(v) => setForm({ ...form, addressLine2: v })}
            />
            <Input
              label="Landmark (optional)"
              value={form.landmark}
              onChange={(v) => setForm({ ...form, landmark: v })}
            />
            <PincodeField
              value={form.pincode}
              onChange={(pc) => setForm({ ...form, pincode: pc })}
              onResult={handlePincodeResult}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                required
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />
              <Input
                label="State"
                required
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl">Payment method</h2>
            <PaymentSelector
              itemPricePaise={product.itemPricePaise}
              itemPrepaidPricePaise={product.itemPrepaidPricePaise}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </section>

          <section className="space-y-2">
            <label className="block font-sans text-sm text-ink-soft">
              Have a coupon code? (optional)
            </label>
            <input
              type="text"
              value={form.couponCode}
              onChange={(e) =>
                setForm({ ...form, couponCode: e.target.value.toUpperCase() })
              }
              className="w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest uppercase"
              maxLength={20}
              placeholder="WELCOME10"
            />
          </section>

          <SalesforceTrustStrip />
        </form>

        <aside className="lg:sticky lg:top-24 h-fit">
          <OrderSummary
            product={product}
            method={paymentMethod}
            canSubmit={canSubmit}
            amounts={amounts}
            onSubmit={() => {
              // Wired to /api/orders in Task 19
              alert("Buy Now flow wired in Task 19");
            }}
          />
        </aside>
      </div>
    </main>
  );
}

function Input(props: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  help?: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="font-sans text-sm text-ink-soft">
        {props.label}
        {props.required && <span className="text-coral"> *</span>}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        required={props.required}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-sans text-ink focus:outline-none focus:border-coral"
      />
      {props.help && (
        <span className="mt-1 block font-sans text-xs text-ink-soft/70">
          {props.help}
        </span>
      )}
    </label>
  );
}
