"use client";
import { SHIPPING_PAISE, type Product } from "@/data/products";
import { rupees, type PaymentMethod } from "@/lib/pricing";

type Amounts = {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  advancePaise: number;
  balanceDuePaise: number;
  shippingPaise: number;
};

export function OrderSummary({
  product,
  method,
  amounts,
  canSubmit,
  onSubmit,
}: {
  product: Product;
  method: PaymentMethod;
  amounts: Amounts;
  canSubmit: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--rule)] p-6 bg-cream-deep/30 space-y-4">
      {product.shippingIncluded && (
        <div className="rounded-md bg-coral/10 px-3 py-2 font-mono text-[0.7rem] uppercase tracking-widest text-coral">
          Shipping already in the {rupees(product.itemPricePaise + SHIPPING_PAISE)} price
        </div>
      )}
      <div className="flex justify-between font-sans text-sm">
        <span>{product.title}</span>
        <span>{rupees(product.itemPricePaise)}</span>
      </div>
      <div className="flex justify-between font-sans text-sm text-ink-soft">
        <span>Shipping (non-refundable*)</span>
        <span>{rupees(SHIPPING_PAISE)}</span>
      </div>
      <div className="border-t border-[color:var(--rule)] pt-3 flex justify-between font-sans text-sm text-ink-soft">
        <span>Subtotal</span>
        <span>{rupees(amounts.subtotalPaise)}</span>
      </div>
      {amounts.discountPaise > 0 && (
        <div className="flex justify-between font-sans text-sm text-coral">
          <span>
            {method === "prepaid" ? "Prepaid discount" : "Coupon discount"}
          </span>
          <span>−{rupees(amounts.discountPaise)}</span>
        </div>
      )}
      <div className="border-t border-[color:var(--rule)] pt-3 flex justify-between font-sans text-base font-medium text-ink">
        <span>Total</span>
        <span>{rupees(amounts.totalPaise)}</span>
      </div>

      <div className="rounded-md bg-cream/60 p-3 space-y-1 font-mono text-xs text-ink-soft">
        <div className="flex justify-between">
          <span>Pay now (Razorpay)</span>
          <span>{rupees(amounts.advancePaise)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pay on delivery</span>
          <span>{rupees(amounts.balanceDuePaise)}</span>
        </div>
      </div>

      <p className="font-sans text-xs text-ink-soft/80">
        *Shipping refunded if order isn&apos;t delivered within 15 days.
        {method === "pay_on_delivery" &&
          " Otherwise non-refundable on returns / refused deliveries — covers Meesho dispatch."}
      </p>

      <p className="font-sans text-xs text-ink-soft/80">
        📱 SMS tracking from Meesho — our logistics partner.
      </p>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className="w-full rounded-md bg-coral text-cream font-sans font-medium py-3 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
      >
        {method === "prepaid"
          ? `Pay ${rupees(amounts.totalPaise)} securely`
          : `Pay ${rupees(SHIPPING_PAISE)} shipping & confirm`}
      </button>
    </div>
  );
}
