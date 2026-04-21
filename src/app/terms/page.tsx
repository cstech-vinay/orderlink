import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service",
  description:
    "OrderLink terms of service: pricing, orders, shipping, returns, liability, and governing law for India.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Service" updated="20 April 2026">
      <p>
        These Terms of Service govern your use of the OrderLink website (the &ldquo;Site&rdquo;),
        operated by {LEGAL.companyName} ({LEGAL.brandName}), CIN {LEGAL.cin}. By placing an order
        you agree to these Terms.
      </p>

      <h2>Orders and pricing</h2>
      <p>
        All prices are in INR and inclusive of applicable taxes unless stated otherwise. Prices
        are final at the moment your payment is processed; we reserve the right to correct
        typographical errors before capture.
      </p>

      <h2>Payment</h2>
      <p>
        We offer two options at checkout: <strong>Prepaid</strong> (full amount online via
        Razorpay, with a small discount on the item price) and{" "}
        <strong>Pay-on-Delivery</strong> (₹49 shipping paid upfront via Razorpay, item price in
        cash on delivery). The ₹49 advance is non-refundable on refused deliveries without valid
        cause &mdash; it covers our logistics partner&rsquo;s actual dispatch cost.
      </p>

      <h2>Shipping and delivery</h2>
      <p>
        Orders ship via our logistics partner Meesho Logistics to Indian addresses within 3–8
        business days. See our <a href="/shipping-policy">Shipping Policy</a> for the full
        terms, including our 15-day delivery guarantee.
      </p>

      <h2>Returns and refunds</h2>
      <p>
        Item returns accepted within 7 days of delivery in original condition. See our{" "}
        <a href="/refund-policy">Refund &amp; Return Policy</a> for specifics on what is and is
        not refundable.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, {LEGAL.companyName}&rsquo;s total
        liability for any claim arising from these Terms shall not exceed the value of the order
        giving rise to the claim.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by Indian law. Any dispute is subject to the exclusive
        jurisdiction of the courts at Pune, Maharashtra.
      </p>

      <h2>Contact</h2>
      <p>
        For any query, reach out at{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> or {LEGAL.supportPhone}.
      </p>
    </PolicyPage>
  );
}
