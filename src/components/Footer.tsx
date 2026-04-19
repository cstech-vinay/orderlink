import Image from "next/image";
import Link from "next/link";
import { FooterTrustRow } from "./FooterTrustRow";

type FooterLink = { href: string; label: string };

const SHOP_LINKS: FooterLink[] = [
  { href: "/#kitchen", label: "Kitchen" },
  { href: "/#beauty", label: "Beauty" },
  { href: "/#electronics", label: "Electronics" },
  { href: "/#fashion", label: "Fashion" },
  { href: "/#footwear", label: "Footwear" },
];

const COMPANY_LINKS: FooterLink[] = [
  { href: "/about", label: "About OrderLink" },
  { href: "/logistics", label: "Shipped by Meesho" },
  { href: "/contact", label: "Contact us" },
];

const HELP_LINKS: FooterLink[] = [
  { href: "/track", label: "Track your order" },
  { href: "/shipping-policy", label: "Shipping policy" },
  { href: "/refund-policy", label: "Returns & refunds" },
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-[color:var(--rule)] bg-cream-deep/30">
      {/* Brand anchor + tagline */}
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <Link href="/" aria-label="OrderLink home" className="block">
            <Image
              src="/assets/optimized/logo_horizontal-600.webp"
              alt="OrderLink"
              width={220}
              height={54}
              className="h-auto w-[220px]"
            />
          </Link>
          <p className="font-display text-xl italic text-ink-soft leading-snug max-w-sm">
            A curated lifestyle store from Pune.
            <br />
            <span className="text-ink">Made with restraint, not rush.</span>
          </p>
        </div>
      </div>

      {/* Asterism rule */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4" aria-hidden>
          <span className="flex-1 h-px bg-[color:var(--rule)]" />
          <span className="font-display text-lg text-coral">⁂</span>
          <span className="flex-1 h-px bg-[color:var(--rule)]" />
        </div>
      </div>

      {/* 3-column nav */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-20">
        <FooterColumn label="Shop" links={SHOP_LINKS} />
        <FooterColumn label="Company" links={COMPANY_LINKS} />
        <FooterColumn label="Help & policies" links={HELP_LINKS} />
      </div>

      {/* Partner strip */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <FooterTrustRow />
      </div>

      {/* Legal strip */}
      <div className="border-t border-[color:var(--rule)]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-soft/70">
          <span>
            &copy; 2026 OrderLink &middot; A brand of{" "}
            <a
              href="https://codesierra.tech"
              target="_blank"
              rel="noopener"
              className="text-ink hover:text-coral transition-colors underline underline-offset-4 decoration-[color:var(--rule-strong)]"
            >
              CodeSierra Tech Private Limited
            </a>
          </span>
          <span>CIN U62013PN2025PTC241138 &middot; GSTIN 27AAMCC6643G1ZF &middot; Made in India</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ label, links }: { label: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-ink-soft/70 mb-4">
        {label}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-sans text-sm text-ink hover:text-coral transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
