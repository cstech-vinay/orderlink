import fs from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "@/invoices/InvoiceDocument";
import { calculateGSTBreakup } from "@/lib/pricing";
import { SHIPPING_HSN_CODE, SHIPPING_GST_RATE } from "@/data/products";

type Args = {
  invoiceNumber: string;
  invoiceDate: Date;
  orderNumber: string;
  customer: { name: string; email: string; mobile: string; address: string };
  shipState: string;
  product: { title: string; hsn: string; gstRate: number; itemPricePaise: number };
  shippingPaise: number;
  paymentMethod: "prepaid" | "pay_on_delivery";
  advancePaid: number;
  balanceDue: number;
  totalPaise: number;
};

function buildInvoiceProps(args: Args): InvoiceProps {
  const gst = calculateGSTBreakup({
    shippingState: args.shipState,
    lines: [
      {
        taxableValuePaise: args.product.itemPricePaise,
        gstRatePercent: args.product.gstRate,
      },
      {
        taxableValuePaise: args.shippingPaise,
        gstRatePercent: SHIPPING_GST_RATE,
      },
    ],
  });

  return {
    invoiceNumber: args.invoiceNumber,
    invoiceDate: args.invoiceDate.toISOString(),
    orderNumber: args.orderNumber,
    customer: args.customer,
    placeOfSupplyState: args.shipState,
    isIntraState: args.shipState === "Maharashtra",
    lines: [
      {
        description: args.product.title,
        hsn: args.product.hsn,
        qty: 1,
        unitPricePaise: args.product.itemPricePaise,
        taxableValuePaise: args.product.itemPricePaise,
        gstRate: args.product.gstRate,
      },
      {
        description: "Shipping & Handling",
        hsn: SHIPPING_HSN_CODE,
        qty: 1,
        unitPricePaise: args.shippingPaise,
        taxableValuePaise: args.shippingPaise,
        gstRate: SHIPPING_GST_RATE,
      },
    ],
    cgstPaise: gst.cgstPaise,
    sgstPaise: gst.sgstPaise,
    igstPaise: gst.igstPaise,
    totalPaise: args.totalPaise,
    paymentMethod: args.paymentMethod === "prepaid" ? "Prepaid" : "Pay-on-Delivery",
    advancePaid: args.advancePaid,
    balanceDue: args.balanceDue,
  };
}

export async function renderInvoiceBuffer(args: Args): Promise<Buffer> {
  const props = buildInvoiceProps(args);
  return renderToBuffer(InvoiceDocument(props));
}

export async function generateInvoicePdf(args: Args): Promise<string> {
  const buf = await renderInvoiceBuffer(args);
  const dir = path.join(process.cwd(), "data", "invoices");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${args.invoiceNumber}.pdf`);
  await fs.writeFile(filePath, buf);
  return filePath;
}
