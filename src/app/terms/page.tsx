import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <PolicyPage title="Terms of use" updated="2026-05-02">
      <p>The plain-English version.</p>
      <h2>What OrderLink is</h2>
      <p>
        OrderLink is an editorial site that links to other retailers. You&apos;re a reader, not a customer of OrderLink. When you click through and buy something, your contract is with the merchant (Amazon, Myntra, Nykaa).
      </p>
      <h2>Prices and stock</h2>
      <p>
        We refresh price and stock data periodically, not in real time. The merchant&apos;s site is always the source of truth — what you see in your cart there is what you&apos;ll pay.
      </p>
      <h2>Returns, refunds, support</h2>
      <p>
        Handled by the merchant under their policies. We can&apos;t intervene in a merchant transaction, but we will help you find the right contact form.
      </p>
      <h2>Liability</h2>
      <p>
        We try hard to recommend good products and accurate prices. We can&apos;t be held liable for a merchant&apos;s actions, a defective product, or stale price data. Your remedy in any case is whatever the merchant offers under their terms.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms; the &ldquo;Last updated&rdquo; date at the top reflects the most recent version.</p>
    </PolicyPage>
  );
}
