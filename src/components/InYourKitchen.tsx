import Image from "next/image";
import type { Product } from "@/data/products";

/**
 * "In your kitchen" — zig-zag scenario rows. Each scenario is a full-width row
 * with image + text side-by-side; image and text swap sides every other row
 * (image-left/text-right, then text-left/image-right, and so on). Renders only
 * when the product defines the `scenarios` field.
 *
 * Uses md:grid-flow-dense so the CSS `order` swap stays semantic for keyboard
 * and screen-reader flow (text always follows its paired image in the DOM).
 */
export function InYourKitchen({
  scenarios,
}: {
  scenarios: NonNullable<Product["scenarios"]>;
}) {
  if (!scenarios || scenarios.length === 0) return null;

  return (
    <section className="mt-20">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-coral">
          In your kitchen
        </p>
        <span
          className="block h-[0.09em] w-10 bg-coral rounded mt-2"
          aria-hidden
        />
        <h2 className="mt-4 font-display text-3xl md:text-4xl text-ink leading-tight">
          A few ways it&apos;ll{" "}
          <em className="italic font-normal relative">
            earn its spot
            <span
              className="absolute left-0 right-0 bottom-0.5 h-[0.09em] bg-coral rounded"
              aria-hidden
            />
          </em>
          .
        </h2>
      </header>

      <div className="mt-12 space-y-16 md:space-y-24">
        {scenarios.map((s, i) => {
          const textFirst = i % 2 === 1; // row 0, 2 → image first; row 1, 3 → text first
          return (
            <article
              key={s.title}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center"
            >
              <div className={textFirst ? "md:order-2" : "md:order-1"}>
                {s.imageSrc ? (
                  <div className="relative aspect-[4/3] bg-cream-deep rounded-lg overflow-hidden">
                    <Image
                      src={s.imageSrc}
                      alt={s.imageAlt ?? s.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-cream-deep rounded-lg flex items-center justify-center font-display italic text-ink-soft/30 text-8xl">
                    {s.title.charAt(0)}
                  </div>
                )}
              </div>

              <div className={textFirst ? "md:order-1" : "md:order-2"}>
                <p className="font-mono text-xs uppercase tracking-widest text-coral">
                  {`Scene ${(i + 1).toString().padStart(2, "0")}`}
                </p>
                <h3 className="mt-3 font-display text-2xl md:text-3xl text-ink leading-tight">
                  {s.title}
                </h3>
                <p className="mt-4 font-sans text-base text-ink leading-relaxed max-w-lg">
                  {s.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
