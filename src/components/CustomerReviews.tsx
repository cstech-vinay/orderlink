"use client";
import { useState } from "react";
import {
  getReviewsBySlug,
  getAverageRating,
  getReviewCount,
  formatRelativeDays,
  type Review,
} from "@/data/reviews";

const PAGE_SIZE = 6;

export function CustomerReviews({ productSlug }: { productSlug: string }) {
  const all = getReviewsBySlug(productSlug);
  const [filter, setFilter] = useState<null | 5 | 4 | 3 | 2 | 1>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (all.length === 0) {
    return (
      <section className="mt-16 border-t border-[color:var(--rule)] pt-10">
        <h2 className="font-display text-2xl text-ink">Customer reviews</h2>
        <p className="mt-4 font-sans text-ink-soft">
          No reviews yet &mdash; be the first to share your experience after your order
          arrives.
        </p>
      </section>
    );
  }

  const filtered = filter ? all.filter((r) => r.rating === filter) : all;
  const visible = filtered.slice(0, visibleCount);
  const average = getAverageRating(productSlug);
  const count = getReviewCount(productSlug);

  return (
    <section className="mt-16 border-t border-[color:var(--rule)] pt-10">
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <h2 className="font-display text-2xl text-ink">Customer reviews</h2>
        <p className="font-sans text-sm text-ink-soft">
          <span className="font-display text-lg text-ink">{average.toFixed(1)}</span>
          <span className="font-mono text-xs text-coral ml-1">
            {"\u2605".repeat(Math.round(average))}
          </span>
          <span className="ml-2">
            from {count.toLocaleString("en-IN")} verified buyer
            {count === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <FilterChip
          label="All"
          active={filter === null}
          onClick={() => {
            setFilter(null);
            setVisibleCount(PAGE_SIZE);
          }}
        />
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const bucket = all.filter((r) => r.rating === s).length;
          if (bucket === 0) return null;
          return (
            <FilterChip
              key={s}
              label={`${s}★ (${bucket})`}
              active={filter === s}
              onClick={() => {
                setFilter(s);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          );
        })}
      </div>

      {/* Reviews grid */}
      <ul className="mt-6 space-y-5">
        {visible.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </ul>

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
            className="rounded-md border border-[color:var(--rule-strong)] text-ink font-sans text-sm px-5 py-2 hover:bg-cream-deep/30 transition-colors"
          >
            Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
          </button>
        </div>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border font-mono text-[0.65rem] uppercase tracking-wider px-3 py-1.5 transition-colors ${
        active
          ? "border-coral bg-coral text-cream"
          : "border-[color:var(--rule-strong)] text-ink-soft hover:border-coral hover:text-coral"
      }`}
    >
      {label}
    </button>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.authorName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li className="rounded-lg border border-[color:var(--rule)] p-5">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-coral/10 text-coral font-mono text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="font-sans text-sm font-medium text-ink">
              {review.authorName}
              <span className="font-sans text-xs text-ink-soft ml-2">
                &middot; {review.authorCity}
              </span>
            </p>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-soft/70">
              {formatRelativeDays(review.daysAgo)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-coral" aria-label={`${review.rating} out of 5 stars`}>
              {"\u2605".repeat(review.rating)}
              <span className="text-ink-soft/30">
                {"\u2605".repeat(5 - review.rating)}
              </span>
            </span>
            {review.verifiedBuyer && (
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-green-700 bg-green-100 rounded px-1.5 py-0.5">
                Verified buyer
              </span>
            )}
          </div>
        </div>
      </header>
      {review.title && (
        <h3 className="mt-3 font-display text-base text-ink">{review.title}</h3>
      )}
      <p className="mt-2 font-sans text-sm text-ink leading-relaxed">{review.body}</p>
    </li>
  );
}
