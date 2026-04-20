import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { LEGAL } from "@/lib/legal";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1E1C1C" },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  small: { fontSize: 9, color: "#5A5350" },
  row: { flexDirection: "row" },
  section: { marginBottom: 16 },
  table: {
    marginTop: 8,
    borderTop: "1px solid #ccc",
    borderBottom: "1px solid #ccc",
  },
  trHead: {
    flexDirection: "row",
    backgroundColor: "#F4EEE3",
    padding: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tr: { flexDirection: "row", padding: 4, borderTop: "1px solid #eee" },
  td: { padding: 2 },
});

export type InvoiceProps = {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  orderNumber: string;
  customer: { name: string; email: string; mobile: string; address: string };
  placeOfSupplyState: string;
  isIntraState: boolean;
  lines: {
    description: string;
    hsn: string;
    qty: number;
    unitPricePaise: number;
    taxableValuePaise: number;
    gstRate: number;
  }[];
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  paymentMethod: "Prepaid" | "Pay-on-Delivery";
  advancePaid: number;
  balanceDue: number;
};

function r(p: number): string {
  return `Rs. ${(p / 100).toFixed(2)}`;
}

export function InvoiceDocument(props: InvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h1}>{LEGAL.companyName}</Text>
          <Text style={styles.small}>{LEGAL.formattedAddress()}</Text>
          <Text style={styles.small}>
            CIN: {LEGAL.cin} · GSTIN: {LEGAL.gstin}
          </Text>
          <Text style={styles.small}>
            {LEGAL.brandName} · {LEGAL.supportEmail} · {LEGAL.supportPhone}
          </Text>
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>TAX INVOICE</Text>
            <Text style={styles.small}>Invoice #: {props.invoiceNumber}</Text>
            <Text style={styles.small}>Order #: {props.orderNumber}</Text>
            <Text style={styles.small}>Date: {props.invoiceDate.slice(0, 10)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>Bill to</Text>
            <Text>{props.customer.name}</Text>
            <Text style={styles.small}>{props.customer.address}</Text>
            <Text style={styles.small}>
              {props.customer.email} · {props.customer.mobile}
            </Text>
            <Text style={styles.small}>Place of supply: {props.placeOfSupplyState}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.td, { flex: 3 }]}>Description</Text>
            <Text style={[styles.td, { flex: 1 }]}>HSN</Text>
            <Text style={[styles.td, { flex: 0.6, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.td, { flex: 1.3, textAlign: "right" }]}>Unit</Text>
            <Text style={[styles.td, { flex: 1.3, textAlign: "right" }]}>Taxable</Text>
            <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>GST %</Text>
          </View>
          {props.lines.map((line, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, { flex: 3 }]}>{line.description}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{line.hsn}</Text>
              <Text style={[styles.td, { flex: 0.6, textAlign: "right" }]}>{line.qty}</Text>
              <Text style={[styles.td, { flex: 1.3, textAlign: "right" }]}>
                {r(line.unitPricePaise)}
              </Text>
              <Text style={[styles.td, { flex: 1.3, textAlign: "right" }]}>
                {r(line.taxableValuePaise)}
              </Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{line.gstRate}%</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10, alignItems: "flex-end" }}>
          {props.isIntraState ? (
            <>
              <Text style={styles.small}>CGST: {r(props.cgstPaise)}</Text>
              <Text style={styles.small}>SGST: {r(props.sgstPaise)}</Text>
            </>
          ) : (
            <Text style={styles.small}>IGST: {r(props.igstPaise)}</Text>
          )}
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 4 }}>
            Total: {r(props.totalPaise)}
          </Text>
          <Text style={styles.small}>Payment: {props.paymentMethod}</Text>
          {props.paymentMethod === "Pay-on-Delivery" && (
            <>
              <Text style={styles.small}>Advance paid online: {r(props.advancePaid)}</Text>
              <Text style={styles.small}>
                Balance due on delivery: {r(props.balanceDue)}
              </Text>
            </>
          )}
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={styles.small}>
            This is a computer-generated invoice and does not require a signature.
          </Text>
          <Text style={styles.small}>
            For grievances: {LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation} ·{" "}
            {LEGAL.supportEmail}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
