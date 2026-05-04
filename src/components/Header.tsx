"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "./Icon";

export function Header() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <header className="sticky top-0 z-50 bg-ol-bg/90 backdrop-saturate-150 backdrop-blur-md border-b border-ol-deep/10">
      <div className="max-w-[1280px] mx-auto px-6 flex items-center gap-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-ol-deep flex items-center justify-center text-ol-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M3 12h7M14 12h7"/><circle cx="12" cy="12" r="3.5"/>
            </svg>
          </span>
          <span className="font-display font-extrabold text-[22px] tracking-tight text-ol-ink">
            OrderLink<span className="text-ol-accent">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex gap-6 ml-3">
          {[
            { label: "Curated",       href: "/shop" },
            { label: "Categories",    href: "/shop" },
            { label: "How it works",  href: "/how-we-curate" },
            { label: "About",         href: "/about" },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="text-[14px] text-ol-ink font-medium opacity-80 hover:opacity-100">
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch}
          className="hidden md:flex flex-1 max-w-[460px] ml-auto items-center gap-2.5 bg-ol-soft border border-ol-deep/5 px-3.5 py-2.5 rounded-xl">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search 1,200+ curated finds…"
            className="bg-transparent border-0 outline-none text-[14px] flex-1 text-ol-ink"
            aria-label="Search products"
          />
          <kbd className="text-[11px] text-ol-muted border border-ol-deep/15 px-1.5 rounded">⌘K</kbd>
        </form>

        <div className="flex gap-2 ml-auto md:ml-0">
          <Link href="/shop" aria-label="Browse" className="md:hidden inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10">
            <Icon name="search" size={18}/>
          </Link>
        </div>
      </div>
    </header>
  );
}
