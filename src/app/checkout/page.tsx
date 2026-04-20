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
  const [couponStatus, setCouponStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "valid"; amountPaise: number; code: string }
    | { state: "invalid"; error: string }
  >({ state: "idle" });

  const amounts = useMemo(() => {
    if (!product) return null;
    return calculateOrderAmounts({
      itemPricePaise: product.itemPricePaise,
      itemPrepaidPricePaise: product.itemPrepaidPricePaise,
      method: paymentMethod,
      couponDiscountPaise:
        couponStatus.state === "valid" ? couponStatus.amountPaise : 0,
    });
  }, [product, paymentMethod, couponStatus]);

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
            const msg =
              verified.error === "order_not_found"
                ? `Couldn't find order ${created.orderNumber} on our side. Your payment went through on Razorpay — email ${"hello@orderlink.in"} with order ${created.orderNumber} and payment ${resp.razorpay_payment_id}.`
                : verified.error === "signature_invalid"
                  ? `Signature check failed on order ${created.orderNumber}. Possible tampering. Email support with the payment ID ${resp.razorpay_payment_id}.`
                  : verified.error === "order_mismatch"
                    ? `Order mismatch on ${created.orderNumber}. Email support.`
                    : `Payment verification failed. Contact support with order ${created.orderNumber} and payment ${resp.razorpay_payment_id}.`;
            setSubmitError(msg);
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

  const otpGateEnabled = process.env.NEXT_PUBLIC_OTP_GATE_ENABLED === "true";

  const missingFields: string[] = [];
  if (form.fullName.trim().length < 2) missingFields.push("full name");
  if (!/^[6-9]\d{9}$/.test(form.mobile))
    missingFields.push("10-digit mobile starting 6–9");
  if (otpGateEnabled && !mobileVerified) missingFields.push("mobile OTP verification");
  if (!/.+@.+\..+/.test(form.email)) missingFields.push("valid email");
  if (form.addressLine1.trim().length < 5) missingFields.push("address line 1");
  if (!/^\d{6}$/.test(form.pincode)) missingFields.push("6-digit pincode");
  else if (pincodeServiceable === null) missingFields.push("pincode check (still loading)");
  else if (pincodeServiceable === false)
    missingFields.push("a serviceable pincode (we don't ship here yet)");
  if (form.city.trim().length < 2) missingFields.push("city");
  if (form.state.trim().length < 2) missingFields.push("state");

  const canSubmit = missingFields.length === 0;

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
            {otpGateEnabled ? (
              <MobileVerifier
                value={form.mobile}
                onChange={(v) => setForm((f) => ({ ...f, mobile: v }))}
                verified={mobileVerified}
                onVerified={setMobileVerified}
              />
            ) : (
              <Input
                label="Mobile (10-digit)"
                required
                value={form.mobile}
                onChange={(v) =>
                  setForm({ ...form, mobile: v.replace(/\D/g, "").slice(0, 10) })
                }
                help="Used for delivery SMS updates from Meesho."
                inputMode="numeric"
                maxLength={10}
              />
            )}
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
            <div className="flex gap-2">
              <input
                type="text"
                value={form.couponCode}
                onChange={(e) => {
                  setForm({ ...form, couponCode: e.target.value.toUpperCase() });
                  setCouponStatus({ state: "idle" });
                }}
                className="flex-1 rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest uppercase focus:outline-none focus:border-coral"
                maxLength={20}
                placeholder="WELCOME10"
              />
              <button
                type="button"
                disabled={
                  !form.couponCode ||
                  !/.+@.+\..+/.test(form.email) ||
                  couponStatus.state === "checking"
                }
                onClick={async () => {
                  setCouponStatus({ state: "checking" });
                  try {
                    const res = await fetch("/api/coupons/validate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        code: form.couponCode,
                        email: form.email,
                      }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setCouponStatus({
                        state: "valid",
                        amountPaise: data.amountPaise,
                        code: data.code,
                      });
                    } else {
                      setCouponStatus({
                        state: "invalid",
                        error:
                          data.error === "unknown_code"
                            ? "Unknown code"
                            : data.error === "expired"
                              ? "This code has expired"
                              : data.error === "already_used"
                                ? "You've already used this code"
                                : data.error === "max_uses_reached"
                                  ? "This code is fully redeemed"
                                  : "Couldn't apply this code",
                      });
                    }
                  } catch {
                    setCouponStatus({
                      state: "invalid",
                      error: "Network error. Try again.",
                    });
                  }
                }}
                className="rounded-md border border-coral text-coral font-sans text-sm font-medium px-4 py-2 hover:bg-coral/5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {couponStatus.state === "checking" ? "…" : "Apply"}
              </button>
            </div>
            {couponStatus.state === "valid" && (
              <p className="font-sans text-xs text-green-700">
                ✓ Code <strong>{couponStatus.code}</strong> applied &mdash;{" "}
                <strong>₹{couponStatus.amountPaise / 100}</strong> off.
              </p>
            )}
            {couponStatus.state === "invalid" && (
              <p className="font-sans text-xs text-coral">{couponStatus.error}</p>
            )}
            {couponStatus.state === "checking" && (
              <p className="font-sans text-xs text-ink-soft">Checking…</p>
            )}
            {couponStatus.state === "idle" && form.couponCode && (
              <p className="font-sans text-xs text-ink-soft/70">
                Enter your email first, then click Apply.
              </p>
            )}
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
          {!canSubmit && missingFields.length > 0 && (
            <div className="mt-3 rounded-md border border-[color:var(--rule)] bg-cream-deep/30 p-3 font-sans text-xs text-ink-soft">
              <p className="font-medium text-ink-soft mb-1">
                Complete these to pay:
              </p>
              <ul className="list-disc ml-4 space-y-0.5">
                {missingFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
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
