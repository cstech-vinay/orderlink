"use client";
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "orderlink.exit_intent_shown";
const MIN_VIEWPORT_PX = 768; // desktop only — mobile doesn't have a mouse leave event

export function ExitIntentOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already shown this device/session? Skip.
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage blocked (private browsing) — still show once per load
    }

    if (window.innerWidth < MIN_VIEWPORT_PX) return;

    const handleLeave = (e: MouseEvent) => {
      // Fire when cursor moves ABOVE the viewport (common exit-intent signal)
      if (e.clientY <= 0) {
        setOpen(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        document.documentElement.removeEventListener("mouseleave", handleLeave);
      }
    };

    document.documentElement.addEventListener("mouseleave", handleLeave);
    return () => {
      document.documentElement.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const close = useCallback(() => setOpen(false), []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exit-intent offer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 motion-reduce:bg-ink/60"
      onClick={close}
    >
      <div
        className="max-w-md w-full rounded-lg bg-cream p-8 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Dismiss"
          onClick={close}
          className="absolute top-3 right-4 text-ink-soft/60 hover:text-ink-soft text-xl leading-none"
        >
          ×
        </button>
        <p className="font-mono text-xs uppercase tracking-widest text-coral">
          Wait &mdash; before you go
        </p>
        <h2 className="font-display text-3xl text-ink mt-2">₹5 extra off</h2>
        <p className="font-sans text-ink-soft mt-3 leading-relaxed">
          Use code{" "}
          <span className="font-mono font-medium text-coral bg-coral/10 rounded px-1.5 py-0.5">
            STAY5
          </span>{" "}
          at checkout if you order in the next 10 minutes. One-time use.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-md bg-coral text-cream font-sans font-medium px-5 py-2.5 hover:opacity-90"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-md text-ink-soft font-sans text-sm px-3 py-2.5 hover:text-ink"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
