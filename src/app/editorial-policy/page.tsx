import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Editorial policy" };

export default function EditorialPolicy() {
  return (
    <PolicyPage title="Editorial policy" updated="2026-05-02">
      <p>The rules we hold ourselves to so the edit stays trustworthy.</p>
      <h2>What we consider</h2>
      <ul>
        <li>Does it actually do the thing it claims to?</li>
        <li>Is it well-made enough to last beyond the warranty?</li>
        <li>Is the merchant reliable on delivery, returns, and stock?</li>
        <li>Is it priced fairly relative to alternatives we tested?</li>
      </ul>
      <h2>What we don&apos;t consider</h2>
      <ul>
        <li>Commission rate</li>
        <li>Whether the brand asked us to feature it</li>
        <li>How much the brand spends on advertising</li>
      </ul>
      <h2>How we test</h2>
      <p>
        For most products, our editors live with them for two weeks before adding them to the edit. For perishables and beauty products, we test on multiple skin types where it matters. We also keep a four-week &ldquo;watch list&rdquo; before declaring something a Bestseller or Editor&apos;s pick.
      </p>
      <h2>Corrections</h2>
      <p>
        If we got something wrong — a spec, a price comparison, a claim — email <a href="mailto:editor@orderlink.in">editor@orderlink.in</a>. We&apos;ll update the page and add a &ldquo;corrected on&rdquo; stamp.
      </p>
    </PolicyPage>
  );
}
