export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <h1 className="font-display text-[length:var(--text-hero)] leading-[var(--text-hero--line-height)] tracking-[var(--text-hero--letter-spacing)] font-light text-ink text-center max-w-4xl">
        Everyday objects,{" "}
        <em className="italic font-normal relative">
          better-curated.
          <span
            className="absolute left-0 right-0 bottom-1 h-[0.09em] bg-coral rounded"
            aria-hidden
          />
        </em>
      </h1>
      <p className="mt-8 font-sans text-lg text-ink-soft max-w-xl text-center">
        Scaffolding check — home page comes online in Task 7.
      </p>
      <p className="mt-12 font-mono text-xs uppercase tracking-widest text-ink-soft/60">
        Fraunces · Instrument Sans · JetBrains Mono
      </p>
    </main>
  );
}
