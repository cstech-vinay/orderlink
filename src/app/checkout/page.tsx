"use client";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProductBySlug } from "@/data/products";
import { calculateOrderAmounts } from "@/lib/pricing";
import { PincodeField } from "@/components/PincodeField";
import { PaymentSelector } from "@/components/PaymentSelector";
import { OrderSummary } from "@/components/OrderSummary";
import { SalesforceTrustStrip } from "@/components/SalesforceTrustStrip";
import { MobileVerifier } from "@/components/MobileVerifier";
import { readAttribution } from "@/lib/attribution";

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler: (resp: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
};

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("razorpay_script_failed"));
    document.body.appendChild(s);
  });
}

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
  const [mobileVerified, setMobileVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleSubmit = useCallback(async () => {
    if (!product || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const attribution = readAttribution();
      const body = {
        productSlug: product.slug,
        fullName: form.fullName,
        mobile: form.mobile,
        email: form.email,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        landmark: form.landmark || undefined,
        pincode: form.pincode,
        city: form.city,
        state: form.state,
        paymentMethod,
        couponCode: form.couponCode || undefined,
        ...attribution,
      };

      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await createRes.json();
      if (!created.ok) {
        setSubmitError(
          created.error === "out_of_stock"
            ? "Sorry — this item just sold out. Refresh to see alternatives."
            : created.error === "mobile_not_verified"
              ? "Please verify your mobile with the OTP code first."
              : "Couldn't create your order. Please try again in a moment."
        );
        return;
      }

      try {
        await loadRazorpayScript();
      } catch {
        setSubmitError("Couldn't load payment gateway. Check your connection and retry.");
        return;
      }

      const rzp = new window.Razorpay({
        key: created.razorpayKeyId,
        order_id: created.razorpayOrderId,
        amount: created.amountPaise,
        currency: created.currency,
        name: "OrderLink",
        description:
          paymentMethod === "prepaid" ? "Order payment" : "Shipping advance (₹49)",
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.mobile,
        },
        notes: { orderlink_order_number: created.orderNumber },
        theme: { color: "#EC4356" },
        handler: async (resp) => {
          const verifyRes = await fetch("/api/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: created.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }),
          });
          const verified = await verifyRes.json();
          if (verified.ok) {
            router.replace(`/orders/${created.orderId}/thanks`);
          } else {
            setSubmitError(
              `Payment verification failed. Contact support with order ${created.orderNumber}.`
            );
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitError(null);
            // Reservation will time out via the inventory reaper (T22).
          },
        },
      });
      rzp.open();
    } catch (err) {
      console.error("[checkout] submit failed:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [product, submitting, form, paymentMethod, router]);

  if (!product || product.status !== "live" || !amounts) {
    return <CheckoutFallback />;
  }

  const canSubmit =
    pincodeServiceable === true &&
    mobileVerified &&
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
            <MobileVerifier
              value={form.mobile}
              onChange={(v) => setForm((f) => ({ ...f, mobile: v }))}
              verified={mobileVerified}
              onVerified={setMobileVerified}
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
            canSubmit={canSubmit && !submitting}
            amounts={amounts}
            onSubmit={handleSubmit}
          />
          {submitError && (
            <p className="mt-3 font-sans text-sm text-coral">{submitError}</p>
          )}
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
