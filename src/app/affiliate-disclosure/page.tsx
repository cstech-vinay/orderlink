import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Affiliate disclosure" };

export default function AffiliateDisclosure() {
  return (
    <PolicyPage title="Affiliate disclosure" updated="2026-05-02">
      <p>
        OrderLink is an affiliate marketplace. When you click &ldquo;Go to Amazon&rdquo; (or Myntra, or Nykaa) on a product page, you&apos;re sent through a link that tells the merchant we referred you. If you buy, the merchant pays us a small commission. The price you pay does not change.
      </p>
      <h2>Why we disclose</h2>
      <p>
        Because you deserve to know. The Indian Advertising Standards Council and US FTC both require it; we&apos;d do it anyway. Our editorial choices are not influenced by which merchant pays the highest commission — we pick whoever has the best combination of price, stock, and delivery on a given day.
      </p>
      <h2>What we never do</h2>
      <ul>
        <li>Take payment to feature a product</li>
        <li>Disguise sponsored placements as editorial</li>
        <li>Sort merchants by commission rate</li>
        <li>Hide the disclosure</li>
      </ul>
      <h2>Questions</h2>
      <p>Email <a href="mailto:editor@orderlink.in">editor@orderlink.in</a> if anything looks off.</p>
    </PolicyPage>
  );
}
