import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[70vh] overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/assets/optimized/bg-1600.webp"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cream/10 via-transparent to-cream" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <h1 className="font-display font-light text-ink max-w-3xl text-[length:var(--text-hero)] leading-[var(--text-hero--line-height)] tracking-[var(--text-hero--letter-spacing)]">
          Everyday objects,{" "}
          <em className="italic font-normal relative">
            better-curated.
            <span
              className="absolute left-0 right-0 bottom-1 h-[0.09em] bg-coral rounded"
              aria-hidden
            />
          </em>
        </h1>
        <p className="mt-6 font-sans text-lg text-ink-soft max-w-xl">
          A tightly-edited shop of lifestyle pieces for your home, your day, and the small moments in between.
        </p>
        <Link
          href="#kitchen"
          className="inline-flex items-center gap-2 mt-8 rounded-md bg-coral text-cream font-sans px-6 py-3 font-medium hover:opacity-90 transition"
        >
          Shop Kitchen &darr;
        </Link>
      </div>
    </section>
  );
}
