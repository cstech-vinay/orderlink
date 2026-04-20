"use client";
import { useState, useEffect } from "react";

const KEY = "orderlink.dpdp.consent";

type Consent = {
  essentials: true;
  analytics: boolean;
  decidedAt: string;
};

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      setOpen(!stored);
    } catch {
      setOpen(false);
    }
  }, []);

  function record(consent: Consent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      // localStorage may throw in private browsing; the decision applies to this session only
    }
    setOpen(false);
  }

  if (!open) return null;

  const now = () => new Date().toISOString();

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 rounded-lg border border-[color:var(--rule-strong)] bg-cream shadow-xl p-5 font-sans text-sm"
    >
      <p className="text-ink">
        We use essential cookies to run the store, keep you signed into checkout, and process
        your orders. No advertising or cross-site tracking cookies. Read our{" "}
        <a href="/privacy" className="text-coral underline underline-offset-4 hover:no-underline">
          Privacy Policy
        </a>{" "}
        for details.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => record({ essentials: true, analytics: false, decidedAt: now() })}
          className="rounded-md bg-coral text-cream font-medium px-3 py-1.5 hover:opacity-90"
        >
          Accept essentials
        </button>
        <button
          type="button"
          onClick={() => record({ essentials: true, analytics: false, decidedAt: now() })}
          className="rounded-md border border-[color:var(--rule-strong)] text-ink px-3 py-1.5 hover:bg-cream-deep/30"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
