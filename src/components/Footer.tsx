import Image from "next/image";
import Link from "next/link";
import { FooterTrustRow } from "./FooterTrustRow";
import { LEGAL } from "@/lib/legal";

type FooterLink = { href: string; label: string };

type SocialLink = { href: string; label: string; icon: "instagram" | "facebook" | "x" };

const SOCIAL_LINKS: SocialLink[] = [
  { href: "https://www.instagram.com/orderlink.in/", label: "OrderLink on Instagram", icon: "instagram" },
  { href: "https://www.facebook.com/profile.php?id=61570689463930", label: "OrderLink on Facebook", icon: "facebook" },
  { href: "https://x.com/OrderLink_in", label: "OrderLink on X", icon: "x" },
];

const SHOP_LINKS: FooterLink[] = [
  { href: "/#kitchen", label: "Kitchen" },
  { href: "/#beauty", label: "Beauty" },
  { href: "/#electronics", label: "Electronics" },
  { href: "/#fashion", label: "Fashion" },
  { href: "/#footwear", label: "Footwear" },
];

const COMPANY_LINKS: FooterLink[] = [
  { href: "/about", label: "About OrderLink" },
  { href: "/logistics", label: "Shipping & delivery" },
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
          <div className="flex flex-col gap-5 md:items-end">
            <p className="font-display text-xl italic text-ink-soft leading-snug max-w-sm">
              A curated lifestyle store from Pune.
              <br />
              <span className="text-ink">Made with restraint, not rush.</span>
            </p>
            <SocialRow />
          </div>
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
          <span>CIN {LEGAL.cin} &middot; GSTIN {LEGAL.gstin} &middot; Made in India</span>
        </div>
      </div>
    </footer>
  );
}

function SocialRow() {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-ink-soft/70">
        Follow
      </span>
      <span className="h-px w-6 bg-[color:var(--rule)]" aria-hidden />
      <ul className="flex items-center gap-2">
        {SOCIAL_LINKS.map((link) => (
          <li key={link.icon}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={link.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)] text-ink transition-colors hover:border-coral hover:text-coral"
            >
              <SocialIcon icon={link.icon} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ icon }: { icon: SocialLink["icon"] }) {
  if (icon === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (icon === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.9.3-1.5 1.6-1.5H16.7V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10.5H8v3h2.3V21h3.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
      <path d="M17.6 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2 3h6.5l4.4 5.8L17.6 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.6 14.3Z" />
    </svg>
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
