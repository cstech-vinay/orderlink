"use client";
import { useEffect, useRef, useState } from "react";
import { NAMES } from "@/lib/fomo/name-pool";
import { CITIES } from "@/lib/fomo/city-pool";
import { REVIEWS } from "@/lib/fomo/review-pool";

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Event =
  | { kind: "purchase"; name: string; city: string; productTitle: string; minutesAgo: number }
  | {
      kind: "review";
      name: string;
      city: string;
      productTitle: string;
      stars: 1 | 2 | 3 | 4 | 5;
      text: string;
      minutesAgo: number;
    };

function relative(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const h = Math.floor(min / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

const MAX_SHOWS = 3;
const VISIBLE_MS = 6_000;
const FIRST_DELAY_MIN = 25_000;
const FIRST_DELAY_MAX = 45_000;
const NEXT_DELAY_MIN = 90_000;
const NEXT_DELAY_MAX = 180_000;

export function ActivityPopup({ productTitle }: { productTitle: string }) {
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FOMO_POPUP_ENABLED === "false") return;

    let shown = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const nextDelay = () => {
      const [min, max] =
        shown === 0 ? [FIRST_DELAY_MIN, FIRST_DELAY_MAX] : [NEXT_DELAY_MIN, NEXT_DELAY_MAX];
      return min + Math.random() * (max - min);
    };

    const schedule = () => {
      if (shown >= MAX_SHOWS) return;
      const t = setTimeout(() => {
        const name = pick(NAMES);
        const city = weightedPick(CITIES).name;
        const minutesAgo = 2 + Math.floor(Math.random() * 180);
        const isReview = Math.random() < 0.3;
        if (isReview) {
          const r = pick(REVIEWS);
          setEvent({
            kind: "review",
            name,
            city,
            productTitle,
            stars: r.stars,
            text: r.text,
            minutesAgo,
          });
        } else {
          setEvent({ kind: "purchase", name, city, productTitle, minutesAgo });
        }
        setVisible(true);
        shown += 1;
        const hide = setTimeout(() => setVisible(false), VISIBLE_MS);
        timers.push(hide);
        schedule();
      }, nextDelay());
      timers.push(t);
    };

    schedule();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [productTitle]);

  if (!event) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-4 md:left-6 z-40 w-[320px] max-w-[calc(100vw-32px)] rounded-lg border border-[color:var(--rule)] bg-cream shadow-lg p-4 font-sans transition-all duration-300 motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-coral text-cream font-mono text-sm flex items-center justify-center">
          {event.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{event.name}</span>
            <span className="text-ink-soft"> from {event.city}</span>
          </p>
          <p className="text-xs text-ink-soft truncate">
            {event.kind === "purchase" ? (
              <>bought {event.productTitle}</>
            ) : (
              <>
                {"★".repeat(event.stars)}
                {"☆".repeat(5 - event.stars)} · &ldquo;{event.text}&rdquo;
              </>
            )}
          </p>
          <p className="font-mono text-[0.7rem] text-ink-soft/60 mt-1">
            {relative(event.minutesAgo)}
          </p>
        </div>
        <button
          type="button"
          className="text-ink-soft/50 hover:text-ink-soft text-lg leading-none"
          aria-label="Dismiss"
          onClick={() => {
            setVisible(false);
            setEvent(null);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
