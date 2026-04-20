import { PolicyPage } from "@/components/PolicyPage";

export const metadata = { title: "Our Logistics Partnership — OrderLink" };

export default function LogisticsPage() {
  return (
    <PolicyPage title="Shipped by Meesho Logistics" updated="20 April 2026">
      <p>
        OrderLink has partnered with <strong>Meesho Logistics</strong>, one of
        India&rsquo;s largest fulfilment networks, to bring you reliable delivery across
        19,000+ pincodes.
      </p>

      <h2>What that means for you</h2>
      <ul>
        <li>Your order ships via Meesho&rsquo;s network, reaching most Indian pincodes in 3–8 days.</li>
        <li>
          You&rsquo;ll receive <strong>SMS updates from Meesho</strong> at each stage &mdash;
          dispatched, out for delivery, delivered &mdash; alongside our email confirmation.
        </li>
        <li>
          Your payment and customer account stay with OrderLink. Meesho is our delivery
          partner, not a separate merchant.
        </li>
      </ul>

      <h2>Why Meesho</h2>
      <p>
        With crores of deliveries behind it and one of India&rsquo;s densest pincode
        coverages, Meesho&rsquo;s logistics arm is built for the scale and variety of Indian
        addresses &mdash; including pincodes many couriers refuse. It also gives you the
        confidence of a partner you already know.
      </p>

      <h2>Tracking</h2>
      <p>
        Once dispatched, your Meesho SMS contains a tracking link. You can also track on our{" "}
        <a href="/track">Track Order</a> page at any time &mdash; no login required, just your
        order number and the last four digits of your mobile.
      </p>
    </PolicyPage>
  );
}
