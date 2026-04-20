import { LEGAL } from "@/lib/legal";
import { products } from "@/data/products";

export const metadata = { title: "About — OrderLink" };

export default function AboutPage() {
  const categories = new Set(products.map((p) => p.category)).size;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Our story</p>
      <h1 className="font-display text-5xl text-ink mt-3">Curated, not cluttered.</h1>
      <p className="mt-6 font-sans text-lg text-ink leading-relaxed">
        OrderLink exists for people who don&rsquo;t want the endless-aisle experience. We
        hand-pick every SKU we list, test it at home, and ship only what we&rsquo;d keep on our
        own counter.
      </p>
      <p className="mt-4 font-sans text-lg text-ink-soft leading-relaxed">
        We&rsquo;re small, Pune-based, and deliberately restrained. You&rsquo;ll never see us
        blast &ldquo;50% off site-wide&rdquo; &mdash; because curation and deep discounts are
        opposites, and we&rsquo;re committed to the former.
      </p>

      <h2 className="font-display text-2xl mt-12 text-ink">By the numbers</h2>
      <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Based in
          </dt>
          <dd className="font-display text-xl mt-1">Pune</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Products
          </dt>
          <dd className="font-display text-xl mt-1">{products.length}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Categories
          </dt>
          <dd className="font-display text-xl mt-1">{categories}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-ink-soft">
            Pincodes served
          </dt>
          <dd className="font-display text-xl mt-1">19,000+</dd>
        </div>
      </dl>

      <p className="mt-12 font-sans text-sm text-ink-soft">
        OrderLink is a brand of <strong>{LEGAL.companyName}</strong>, an incorporated Pune
        company (CIN {LEGAL.cin}).
      </p>
    </main>
  );
}
