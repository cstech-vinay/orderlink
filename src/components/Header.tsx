import Image from "next/image";
import Link from "next/link";

const CATEGORY_LINKS: { slug: string; label: string }[] = [
  { slug: "kitchen", label: "Kitchen" },
  { slug: "beauty", label: "Beauty" },
  { slug: "electronics", label: "Electronics" },
  { slug: "fashion", label: "Fashion" },
  { slug: "footwear", label: "Footwear" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-[color:var(--rule)]">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" aria-label="OrderLink home" className="shrink-0">
          <Image
            src="/assets/optimized/logo_horizontal-600.webp"
            alt="OrderLink"
            width={180}
            height={44}
            priority
          />
        </Link>
        <ul className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest text-ink-soft">
          {CATEGORY_LINKS.map((c) => (
            <li key={c.slug}>
              <Link href={`/#${c.slug}`} className="hover:text-coral transition-colors">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
