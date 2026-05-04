import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Contact", description: "Reach the OrderLink editorial team." };

export default function Contact() {
  return (
    <PolicyPage title="Contact" updated="2026-05-02">
      <p>We&apos;re a small team — every email reaches a person.</p>
      <h2>For everything</h2>
      <p><a href="mailto:hi@orderlink.in">hi@orderlink.in</a> — broken links, price mismatches, suggestions.</p>
      <h2>Editorial &amp; corrections</h2>
      <p><a href="mailto:editor@orderlink.in">editor@orderlink.in</a> — review pitches, factual corrections.</p>
      <p>We aim to reply within two working days.</p>
    </PolicyPage>
  );
}
