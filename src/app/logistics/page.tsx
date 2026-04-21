import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Shipping & delivery across India",
  description:
    "Free shipping, 3–8 day delivery to 19,000+ pincodes, COD available. Here's how an OrderLink parcel gets to your door.",
  alternates: { canonical: "/logistics" },
};

export default function LogisticsPage() {
  return (
    <PolicyPage title="Shipping & delivery across India" updated="21 April 2026">
      <p>
        OrderLink ships pan-India to <strong>19,000+ pincodes</strong> using
        Valmo / Meesho Logistics — the same last-mile network several large
        Indian marketplaces rely on. Your payment and customer account stay
        with OrderLink; the courier handles the parcel from our Pune warehouse
        to your door.
      </p>

      <h2>What to expect</h2>
      <ul>
        <li>Orders ship in 1&ndash;2 working days from our Pune warehouse.</li>
        <li>Delivery to most Indian pincodes in 3&ndash;8 days.</li>
        <li>
          SMS updates at each stage &mdash; dispatched, out for delivery,
          delivered &mdash; alongside our WhatsApp + email confirmation.
        </li>
        <li>
          COD available across India. A &#8377;49 advance covers shipping and
          is paid online at checkout; the remaining amount is paid in cash
          when the courier hands over the parcel.
        </li>
      </ul>

      <h2>Why this network</h2>
      <p>
        It has one of India&rsquo;s densest pincode coverages &mdash; including
        pincodes many couriers refuse &mdash; and is built for the scale and
        variety of Indian addresses. Good for customers in Tier 2/3 cities and
        small-town addresses that need extra care.
      </p>

      <h2>Tracking</h2>
      <p>
        Once dispatched, the SMS contains a tracking link. You can also track
        on our <a href="/track">Track Order</a> page at any time &mdash; no
        login required, just your order number and the last four digits of
        your mobile.
      </p>
    </PolicyPage>
  );
}
