import Link from "next/link";
import { FooterTrustRow } from "./FooterTrustRow";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/about", label: "About" },
  { href: "/logistics", label: "Logistics" },
  { href: "/contact", label: "Contact" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-cream-deep/60">
      <FooterTrustRow />
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono text-xs uppercase tracking-widest text-ink-soft">
        <div>
          <span>Curated by OrderLink &middot; Delivered by Meesho</span>
          <br />
          <span className="text-ink-soft/70">Customer care on Salesforce</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-coral transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="md:text-right">
          &copy; 2026 OrderLink
          <br />
          <span className="text-ink-soft/70 normal-case tracking-normal">
            a brand of CodeSierra Tech Private Limited
          </span>
        </div>
      </div>
    </footer>
  );
}
