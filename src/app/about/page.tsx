import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "About",
  description: "OrderLink is a small editorial team that hand-tests products and sends you to the best price.",
};

export default function About() {
  return (
    <PolicyPage title="About OrderLink" updated="2026-05-02">
      <p>
        OrderLink is a small editorial team based in India. We test products, take notes, and put the ones we&apos;d actually buy into a weekly edit. When you click through, we send you to whichever big retailer (Amazon, Myntra, Nykaa) currently has the best price. We earn a small commission; the price you pay doesn&apos;t change.
      </p>
      <h2>Why we&apos;re not a store</h2>
      <p>
        We tried that. Running a store means inventory, returns, customer support, payment disputes, and a hundred other things that have nothing to do with picking good products. By stepping back to curation only, we get to spend the time on the part we&apos;re useful at: figuring out which version of &ldquo;the&rdquo; earbuds, prayer mat, lip oil, or notebook is actually worth your money.
      </p>
      <h2>How we make money</h2>
      <p>
        Affiliate commissions, full stop. No sponsored slots, no paid placements, no &ldquo;promoted&rdquo; products in the edit. If something is in our edit, our team bought it with their own card and used it.
      </p>
      <h2>Reach us</h2>
      <p>
        Email us at <a href="mailto:hi@orderlink.in">hi@orderlink.in</a> if a link is broken, a price is wrong, or you want us to try something.
      </p>
    </PolicyPage>
  );
}
