"use client";
import { useEffect, useState } from "react";

const KEY = "orderlink.first_order_banner_dismissed";

export function FirstOrderBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!localStorage.getItem(KEY));
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-coral text-cream py-2 px-6 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-widest">
      <span>
        First order? Use <strong>WELCOME10</strong> for extra ₹10 off
      </span>
      <button
        type="button"
        aria-label="Dismiss first-order banner"
        className="ml-2 opacity-70 hover:opacity-100 text-sm leading-none"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            // ignore — dismissal is a nice-to-have
          }
          setVisible(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
