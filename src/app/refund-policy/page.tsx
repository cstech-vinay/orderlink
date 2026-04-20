import { PolicyPage } from "@/components/PolicyPage";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Refund & Return Policy — OrderLink" };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Return Policy" updated="20 April 2026">
      <h2>What&rsquo;s refundable</h2>
      <p>
        <strong>The item cost.</strong> Returns accepted within 7 days of delivery in original
        unused condition with original packaging.
      </p>

      <h2>What&rsquo;s not</h2>
      <p>
        <strong>The ₹49 shipping charge.</strong> This covers Meesho Logistics&rsquo; actual
        dispatch cost and is non-refundable on returns or refused deliveries without valid
        cause.
      </p>

      <h2>Exceptions &mdash; full refund (item + shipping)</h2>
      <ul>
        <li>
          You received a <strong>damaged or incorrect item</strong>.
        </li>
        <li>
          Your order is <strong>not delivered within 15 days</strong> of placement. The ₹49
          shipping is refunded on top of any item refund.
        </li>
      </ul>

      <h2>Refund timeline</h2>
      <p>
        Once the return is received and approved, refunds are issued within 7 working days to
        the original payment method (Razorpay UPI/card/netbanking) or to a bank account for
        cash-on-delivery balances.
      </p>

      <h2>How to request a return</h2>
      <p>
        Email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> or WhatsApp{" "}
        {LEGAL.supportPhone} with your order number (<code>OL-YYYY-NNNN</code>) within the
        7-day window. We&rsquo;ll coordinate pickup via Meesho and update you within 48 hours.
      </p>
    </PolicyPage>
  );
}
