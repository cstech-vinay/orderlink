import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "How we curate" };

export default function HowWeCurate() {
  return (
    <PolicyPage title="How we curate" updated="2026-05-02">
      <p>The pipeline from &ldquo;interesting product&rdquo; to &ldquo;in this week&apos;s edit.&rdquo;</p>
      <h2>1. Scout</h2>
      <p>
        We watch trends across Amazon India, Myntra, and Nykaa, plus Instagram and trending-product reports. About 50 candidates a week reach our shortlist.
      </p>
      <h2>2. Buy</h2>
      <p>
        Editors order finalists with their own cards from the merchant they&apos;d recommend. We don&apos;t accept review samples — paid samples create incentives we&apos;d rather not manage.
      </p>
      <h2>3. Test</h2>
      <p>
        Two weeks of real use. We score on durability, claimed-vs-actual specs, and how it compares to alternatives we already tested.
      </p>
      <h2>4. Compare</h2>
      <p>
        On launch day we re-check prices and ETAs across all three retailers. The &ldquo;best price today&rdquo; panel updates from a periodic re-check (manual right now; eventually automated).
      </p>
      <h2>5. Publish</h2>
      <p>
        The edit goes live each Friday morning. Subscribe to the newsletter at the bottom of the page if you want it in your inbox.
      </p>
    </PolicyPage>
  );
}
