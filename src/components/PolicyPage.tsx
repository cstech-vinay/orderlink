import { LEGAL } from "@/lib/legal";

export function PolicyPage({
  title, updated, children,
}: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-16 font-sans text-ol-ink leading-relaxed">
      <header className="mb-10">
        <p className="text-[12px] uppercase tracking-[0.14em] text-ol-muted">Last updated: {updated}</p>
        <h1 className="font-display font-bold text-[clamp(36px,5vw,52px)] tracking-tight mt-2">{title}</h1>
      </header>
      <article
        className="
          [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3
          [&_p]:my-3
          [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-3 [&_ul>li]:mb-1
          [&_a]:text-ol-accent [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:no-underline
        "
      >
        {children}
      </article>
      <footer className="mt-16 pt-6 border-t border-ol-deep/10 font-sans text-[13px] text-ol-muted space-y-1">
        <p>{LEGAL.brand} · {LEGAL.domain}</p>
        <p>
          Editorial &amp; corrections:{" "}
          <a href={`mailto:${LEGAL.editorialEmail}`} className="text-ol-accent underline underline-offset-4 hover:no-underline">
            {LEGAL.editorialEmail}
          </a>
        </p>
      </footer>
    </main>
  );
}
