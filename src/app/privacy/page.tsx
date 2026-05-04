import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <PolicyPage title="Privacy" updated="2026-05-02">
      <p>This is the short version because we don&apos;t actually collect much.</p>
      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>Accounts. There aren&apos;t any.</li>
        <li>Carts, addresses, payment info. The merchant handles checkout, not us.</li>
        <li>Server-side cookies for tracking. We don&apos;t set any.</li>
      </ul>
      <h2>What we do collect</h2>
      <ul>
        <li><strong>Wishlist:</strong> stored in your browser&apos;s localStorage. Stays on your device. Clearing browser data clears it.</li>
        <li><strong>Newsletter signup (when implemented):</strong> just your email. Unsubscribe in one click from any email.</li>
        <li><strong>Outbound clicks (when implemented):</strong> aggregate counts only — &ldquo;X people clicked through to merchant Y this week&rdquo;. No personally identifiable information.</li>
      </ul>
      <h2>Third parties</h2>
      <p>
        When you click &ldquo;Go to Amazon&rdquo;, you go to Amazon. Their privacy policy applies from that point. Same for Myntra and Nykaa.
      </p>
      <h2>Sentry</h2>
      <p>
        We use Sentry to capture site errors. Stack traces and the URL of the failing page are sent. We strip query strings and other potentially-sensitive content before transmission.
      </p>
      <h2>Contact</h2>
      <p><a href="mailto:hi@orderlink.in">hi@orderlink.in</a></p>
    </PolicyPage>
  );
}
