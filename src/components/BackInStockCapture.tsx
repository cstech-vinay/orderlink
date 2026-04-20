"use client";
import { useState } from "react";

export function BackInStockCapture({ productSlug }: { productSlug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || !email) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/restock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, email }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border-2 border-dashed border-[color:var(--rule-strong)] p-4 space-y-2"
    >
      <p className="font-sans text-sm font-medium text-ink">
        Currently sold out
      </p>
      <p className="font-sans text-xs text-ink-soft">
        Drop your email — we&rsquo;ll notify you the moment it&rsquo;s back.
      </p>
      {status === "ok" ? (
        <p className="font-sans text-sm text-green-700">
          ✓ You&rsquo;re on the list. Watch your inbox.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "submitting"}
            className="flex-1 rounded-md border border-[color:var(--rule)] px-3 py-2 font-sans text-sm focus:outline-none focus:border-coral disabled:bg-cream-deep/40"
          />
          <button
            type="submit"
            disabled={status === "submitting" || !email}
            className="rounded-md bg-coral text-cream font-sans text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === "submitting" ? "…" : "Notify me"}
          </button>
        </div>
      )}
      {status === "error" && (
        <p className="font-sans text-xs text-coral">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
