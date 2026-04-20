import { LEGAL } from "@/lib/legal";

export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-sans text-ink leading-relaxed">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          Last updated: {updated}
        </p>
        <h1 className="font-display text-4xl mt-2">{title}</h1>
      </header>
      <article className="max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-ink [&_p]:my-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-3 [&_ul>li]:mb-1 [&_a]:text-coral [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:no-underline">
        {children}
      </article>
      <footer className="mt-16 pt-6 border-t border-[color:var(--rule)] font-sans text-sm text-ink-soft space-y-1">
        <p>{LEGAL.companyName}</p>
        <p>
          CIN: {LEGAL.cin} &middot; GSTIN: {LEGAL.gstin}
        </p>
        <p>{LEGAL.formattedAddress()}</p>
        <p>
          Grievance officer: {LEGAL.grievanceOfficerName}, {LEGAL.dpoDesignation} &middot;{" "}
          <a href={`mailto:${LEGAL.supportEmail}`} className="text-coral underline underline-offset-4 hover:no-underline">
            {LEGAL.supportEmail}
          </a>{" "}
          &middot; {LEGAL.supportPhone}
        </p>
      </footer>
    </main>
  );
}
