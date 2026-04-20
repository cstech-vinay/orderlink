"use client";
import { useCallback, useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (mobile: string) => void;
  verified: boolean;
  onVerified: (verified: boolean) => void;
};

const RESEND_SECONDS = 30;

export function MobileVerifier({ value, onChange, verified, onVerified }: Props) {
  const [stage, setStage] = useState<"input" | "code">("input");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const mobileIsValid = /^[6-9]\d{9}$/.test(value);

  const handleMobileChange = useCallback(
    (v: string) => {
      const digits = v.replace(/\D/g, "").slice(0, 10);
      onChange(digits);
      if (verified) {
        onVerified(false);
        setStage("input");
        setCode("");
      }
      setError(null);
    },
    [onChange, verified, onVerified]
  );

  async function handleSend() {
    if (!mobileIsValid || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: value }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "rate_limited_mobile" || data.error === "rate_limited_ip"
            ? `Too many attempts. Try again in ${data.retryAfterSeconds}s.`
            : "Couldn't send OTP. Try again."
        );
        return;
      }
      setStage("code");
      setResendIn(RESEND_SECONDS);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (code.length < 4 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: value, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === "rate_limited"
            ? `Too many attempts. Try again in ${data.retryAfterSeconds}s.`
            : "Invalid OTP. Check the code and try again."
        );
        onVerified(false);
        return;
      }
      onVerified(true);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="font-sans text-sm text-ink-soft">
          Mobile (10-digit) <span className="text-coral">*</span>
          {verified && (
            <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-wider text-green-700 bg-green-100 rounded px-1.5 py-0.5">
              ✓ verified
            </span>
          )}
        </span>
        <div className="mt-1 flex gap-2">
          <input
            type="tel"
            value={value}
            onChange={(e) => handleMobileChange(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            disabled={verified}
            className="flex-1 rounded-md border border-[color:var(--rule)] px-3 py-2 font-sans text-ink focus:outline-none focus:border-coral disabled:bg-cream-deep/40"
          />
          {!verified && (
            <button
              type="button"
              onClick={handleSend}
              disabled={!mobileIsValid || sending || (stage === "code" && resendIn > 0)}
              className="rounded-md border border-coral text-coral font-sans text-sm font-medium px-4 py-2 hover:bg-coral/5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {sending
                ? "Sending…"
                : stage === "code"
                  ? resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : "Resend OTP"
                  : "Send OTP"}
            </button>
          )}
        </div>
        <span className="mt-1 block font-sans text-xs text-ink-soft/70">
          We&apos;ll text a 6-digit code to confirm it&apos;s really you. Used later for delivery SMS.
        </span>
      </label>

      {stage === "code" && !verified && (
        <div className="rounded-md bg-cream-deep/30 border border-[color:var(--rule)] p-3 space-y-2">
          <label className="block">
            <span className="font-sans text-sm text-ink-soft">Enter the 6-digit OTP</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                autoComplete="one-time-code"
                className="flex-1 rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-[0.5em] text-center text-lg focus:outline-none focus:border-coral"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={code.length < 4 || verifying}
                className="rounded-md bg-coral text-cream font-sans text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </div>
          </label>
        </div>
      )}

      {error && <p className="font-sans text-xs text-coral">{error}</p>}
    </div>
  );
}
