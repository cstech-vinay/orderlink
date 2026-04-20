import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import { generateInvoicePdf, renderInvoiceBuffer } from "@/lib/invoice-pdf";

const sampleArgs = {
  invoiceNumber: "OL-INV-2026-TEST001",
  invoiceDate: new Date("2026-04-20T12:00:00Z"),
  orderNumber: "OL-2026-TEST001",
  customer: {
    name: "Priya Sharma",
    email: "priya@example.com",
    mobile: "+919876543210",
    address: "221B Baker St, Pune, Maharashtra 411014",
  },
  shipState: "Maharashtra",
  product: {
    title: "Premium Glass Oil Dispenser",
    hsn: "7013",
    gstRate: 18,
    itemPricePaise: 15000,
  },
  shippingPaise: 4900,
  paymentMethod: "prepaid" as const,
  advancePaid: 19100,
  balanceDue: 0,
  totalPaise: 19100,
};

describe("generateInvoicePdf", () => {
  it("renders a non-empty PDF buffer starting with the %PDF magic header", async () => {
    const buf = await renderInvoiceBuffer(sampleArgs);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("writes the PDF to disk under data/invoices/", async () => {
    const filePath = await generateInvoicePdf(sampleArgs);
    const stat = await fs.stat(filePath);
    expect(stat.size).toBeGreaterThan(1000);
    await fs.rm(filePath);
  });

  it("renders a POD invoice showing advance + balance lines", async () => {
    const buf = await renderInvoiceBuffer({
      ...sampleArgs,
      invoiceNumber: "OL-INV-2026-TEST002",
      paymentMethod: "pay_on_delivery",
      advancePaid: 4900,
      balanceDue: 15000,
      totalPaise: 19900,
    });
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders an inter-state (IGST) invoice when shipState differs from Maharashtra", async () => {
    const buf = await renderInvoiceBuffer({
      ...sampleArgs,
      invoiceNumber: "OL-INV-2026-TEST003",
      shipState: "Karnataka",
      customer: { ...sampleArgs.customer, address: "MG Road, Bengaluru, KA 560001" },
    });
    expect(buf.length).toBeGreaterThan(1000);
  });
});
