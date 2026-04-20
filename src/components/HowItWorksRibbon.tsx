import type { Product } from "@/data/products";

/**
 * Horizontal 3-step "how it works" ribbon — text-only, HTML-rendered (indexable
 * for SEO, unlike the equivalent pdp-05 gallery slide). Coral numbered badges,
 * Fraunces titles, Instrument Sans bodies. Thin coral connectors between steps
 * on md+ screens.
 */
export function HowItWorksRibbon({
  steps,
}: {
  steps: NonNullable<Product["howItWorks"]>;
}) {
  if (!steps || steps.length === 0) return null;

  return (
    <section className="mt-20">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-coral">
          How it works
        </p>
        <span
          className="block h-[0.09em] w-10 bg-coral rounded mt-2"
          aria-hidden
        />
        <h2 className="mt-4 font-display text-3xl md:text-4xl text-ink leading-tight">
          Three steps.{" "}
          <em className="italic font-normal relative">
            Zero mess
            <span
              className="absolute left-0 right-0 bottom-0.5 h-[0.09em] bg-coral rounded"
              aria-hidden
            />
          </em>
          .
        </h2>
      </header>

      <ol className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        {steps.map((s) => (
          <li key={s.step}>
            <div className="flex items-start gap-4 md:block">
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-coral text-cream w-12 h-12 font-mono text-lg font-medium"
                aria-hidden
              >
                {s.step.toString().padStart(2, "0")}
              </span>
              <div className="md:mt-5 flex-1 min-w-0">
                <h3 className="font-display text-xl text-ink leading-snug">
                  {s.title}
                </h3>
                <p className="mt-2 font-sans text-sm text-ink-soft leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
