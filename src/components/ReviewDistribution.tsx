type Row = { stars: 1 | 2 | 3 | 4 | 5; percent: number };

export function ReviewDistribution({
  distribution,
  totalReviews,
}: {
  distribution: Row[];
  totalReviews: number;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--rule)] p-4">
      <p className="font-mono text-[0.7rem] uppercase tracking-wider text-ink-soft mb-3">
        Rating distribution from {totalReviews.toLocaleString("en-IN")} Meesho reviews
      </p>
      <ul className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const row = distribution.find((r) => r.stars === s);
          const percent = row?.percent ?? 0;
          return (
            <li key={s} className="flex items-center gap-3 font-sans text-sm">
              <span className="w-14 font-mono text-[0.7rem] text-ink-soft">
                {"\u2605".repeat(s)}
                <span className="text-ink-soft/30">{"\u2605".repeat(5 - s)}</span>
              </span>
              <div className="flex-1 h-2 bg-cream-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-coral/70"
                  style={{ width: `${percent}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-10 font-mono text-[0.7rem] text-ink-soft/80 text-right">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
