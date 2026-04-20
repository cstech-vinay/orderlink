import { SHIPPING_PAISE, type Product } from "@/data/products";

export type PaymentMethod = "prepaid" | "pay_on_delivery";

export type OrderAmountInput = {
  itemPricePaise: number;
  itemPrepaidPricePaise: number;
  method: PaymentMethod;
  couponDiscountPaise: number;
};

export type OrderAmountResult = {
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  advancePaise: number;
  balanceDuePaise: number;
  shippingPaise: number;
};

export function calculateOrderAmounts(input: OrderAmountInput): OrderAmountResult {
  const shippingPaise = SHIPPING_PAISE;
  const subtotalPaise = input.itemPricePaise + shippingPaise;

  const prepaidItemDiscount =
    input.method === "prepaid"
      ? input.itemPricePaise - input.itemPrepaidPricePaise
      : 0;
  const discountPaise = prepaidItemDiscount + input.couponDiscountPaise;
  const totalPaise = subtotalPaise - discountPaise;

  const advancePaise = input.method === "prepaid" ? totalPaise : shippingPaise;
  const balanceDuePaise = totalPaise - advancePaise;

  return {
    subtotalPaise,
    discountPaise,
    totalPaise,
    advancePaise,
    balanceDuePaise,
    shippingPaise,
  };
}

export type GSTLine = { taxableValuePaise: number; gstRatePercent: number };
export type GSTInput = { lines: GSTLine[]; shippingState: string };
export type GSTResult = {
  basePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
};

const OUR_STATE = "Maharashtra";

export function calculateGSTBreakup(input: GSTInput): GSTResult {
  const isIntra = input.shippingState === OUR_STATE;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let base = 0;
  for (const line of input.lines) {
    const tax = Math.round((line.taxableValuePaise * line.gstRatePercent) / 100);
    base += line.taxableValuePaise;
    if (isIntra) {
      const half = Math.round(tax / 2);
      cgst += half;
      sgst += tax - half;
    } else {
      igst += tax;
    }
  }
  return {
    basePaise: base,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: igst,
    totalTaxPaise: cgst + sgst + igst,
  };
}

export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The "headline" price shown on cards, PDP, and ads — i.e. what the customer
 * will actually be billed at checkout before any prepaid discount.
 *
 * For `shippingIncluded: true` products, this rolls shipping into the visible
 * number (so ads that promise "₹499 all-in" match the storefront). For regular
 * products it's just the item price, with shipping shown separately.
 */
export function getHeadlinePricePaise(product: Product): number {
  return product.shippingIncluded
    ? product.itemPricePaise + SHIPPING_PAISE
    : product.itemPricePaise;
}

/** Discount % vs MRP, using the headline price the customer actually sees. */
export function getDisplayDiscountPercent(product: Product): number {
  const headline = getHeadlinePricePaise(product);
  if (product.mrpPaise <= headline) return 0;
  return Math.round(((product.mrpPaise - headline) / product.mrpPaise) * 100);
}
