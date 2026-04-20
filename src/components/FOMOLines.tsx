import { getAvailable } from "@/lib/inventory";
import { isSellingFast } from "@/lib/stats";

/**
 * Trust + scarcity chips rendered on the product page. Server component — DB
 * reads happen at render time; Next's per-request rendering re-fetches on each
 * request. Safe to SSR since inputs are productSlug and public counts only.
 */
export async function FOMOLines({ productSlug }: { productSlug: string }) {
  const [available, sellingFast] = await Promise.all([
    getAvailable(productSlug),
    isSellingFast(productSlug),
  ]);

  return (
    <div className="flex flex-wrap gap-2 font-mono text-[0.65rem] uppercase tracking-widest">
      {sellingFast && (
        <span className="inline-flex items-center gap-1 rounded-full bg-coral/10 text-coral px-2.5 py-1">
          <span aria-hidden>🔥</span> Selling fast
        </span>
      )}
      {available > 0 && available < 10 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--rule)] text-ink-soft px-2.5 py-1">
          <span aria-hidden>⏱</span> Only {available} left
        </span>
      )}
      {available === 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-ink-soft/10 text-ink-soft px-2.5 py-1">
          Back in stock soon
        </span>
      )}
    </div>
  );
}
