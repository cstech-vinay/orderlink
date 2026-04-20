import { PolicyPage } from "@/components/PolicyPage";

export const metadata = { title: "Shipping Policy — OrderLink" };

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping Policy" updated="20 April 2026">
      <h2>Shipping charge</h2>
      <p>
        Flat ₹49 across all Indian pincodes we serve. This is shown as a separate line at
        checkout and on your invoice. Shipping is non-refundable under normal return scenarios;
        see our <a href="/refund-policy">Refund Policy</a> for exceptions.
      </p>

      <h2>Delivery window</h2>
      <p>
        Orders ship within one working day of confirmation and arrive within 3–8 business days
        for most pincodes.
      </p>

      <h2>15-day delivery guarantee</h2>
      <p>
        If your order is not delivered within 15 days of placement, we refund the ₹49 shipping
        charge in full. Item refunds are handled separately per our Refund Policy.
      </p>

      <h2>Tracking</h2>
      <p>
        Once dispatched, you&rsquo;ll receive an SMS from our logistics partner Meesho with a
        tracking link. You can also check status any time on our{" "}
        <a href="/track">Track Order</a> page.
      </p>

      <h2>Serviceability</h2>
      <p>
        We ship to most Indian pincodes. Enter yours at checkout to confirm &mdash; if we
        don&rsquo;t currently serve your area, you can leave your email to be notified when we
        expand.
      </p>
    </PolicyPage>
  );
}
