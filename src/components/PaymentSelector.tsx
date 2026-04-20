"use client";
import { SHIPPING_PAISE } from "@/data/products";
import { rupees } from "@/lib/pricing";

type Method = "prepaid" | "pay_on_delivery";

export function PaymentSelector({
  itemPricePaise,
  itemPrepaidPricePaise,
  value,
  onChange,
}: {
  itemPricePaise: number;
  itemPrepaidPricePaise: number;
  value: Method;
  onChange: (m: Method) => void;
}) {
  const prepaidSavingPaise = itemPricePaise - itemPrepaidPricePaise;
  const prepaidTotal = itemPrepaidPricePaise + SHIPPING_PAISE;
  const podTotal = itemPricePaise + SHIPPING_PAISE;

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Payment method</legend>
      <Option
        id="method-prepaid"
        checked={value === "prepaid"}
        onChange={() => onChange("prepaid")}
        title={`Prepaid · ${rupees(prepaidTotal)}`}
        badge={
          prepaidSavingPaise > 0 ? `SAVE ${rupees(prepaidSavingPaise)} ON ITEM` : undefined
        }
        body={`Item ${rupees(itemPrepaidPricePaise)} + Shipping ${rupees(SHIPPING_PAISE)}. Pay full amount online now.`}
      />
      <Option
        id="method-pod"
        checked={value === "pay_on_delivery"}
        onChange={() => onChange("pay_on_delivery")}
        title={`Pay-on-Delivery · ${rupees(podTotal)}`}
        body={`Pay ${rupees(SHIPPING_PAISE)} shipping now (secures the order) + ${rupees(itemPricePaise)} cash on delivery.`}
        footnote="The ₹49 shipping is paid upfront and is non-refundable on returns or refused deliveries. It covers Meesho Logistics' dispatch regardless of outcome."
      />
    </fieldset>
  );
}

function Option(props: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  badge?: string;
  body: string;
  footnote?: string;
}) {
  return (
    <label
      htmlFor={props.id}
      className={`block rounded-lg border-2 p-4 cursor-pointer transition ${
        props.checked
          ? "border-coral bg-coral/5"
          : "border-[color:var(--rule)] hover:border-[color:var(--rule-strong)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          id={props.id}
          type="radio"
          name="paymentMethod"
          checked={props.checked}
          onChange={props.onChange}
          className="h-4 w-4 accent-coral"
        />
        <span className="font-sans font-medium text-ink">{props.title}</span>
        {props.badge && (
          <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-wider text-coral bg-coral/10 rounded px-2 py-0.5">
            {props.badge}
          </span>
        )}
      </div>
      <p className="font-sans text-sm text-ink-soft mt-2 ml-7">{props.body}</p>
      {props.footnote && props.checked && (
        <p className="font-sans text-xs text-ink-soft/70 mt-2 ml-7 italic">
          {props.footnote}
        </p>
      )}
    </label>
  );
}
