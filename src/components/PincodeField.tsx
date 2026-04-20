"use client";
import { useEffect, useState } from "react";

type Result = { serviceable: boolean; city?: string; state?: string };

export function PincodeField({
  value,
  onChange,
  onResult,
}: {
  value: string;
  onChange: (v: string) => void;
  onResult: (r: Result) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "serviceable" | "not_serviceable" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!/^\d{6}$/.test(value)) {
      setStatus("idle");
      setMessage("");
      return;
    }
    let cancel = false;
    setStatus("loading");
    setMessage("Checking…");
    fetch(`/api/pincode/${value}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (!data.ok) {
          setStatus("error");
          setMessage("Invalid pincode");
          return;
        }
        if (data.serviceable) {
          setStatus("serviceable");
          setMessage(
            data.city
              ? `✓ We deliver to ${data.city}, ${data.state} in 3–8 days`
              : "✓ Serviceable"
          );
          onResult({ serviceable: true, city: data.city, state: data.state });
        } else {
          setStatus("not_serviceable");
          setMessage("⚠ Sorry, we don't ship here yet");
          onResult({ serviceable: false });
        }
      })
      .catch(() => {
        if (cancel) return;
        setStatus("error");
        setMessage("Couldn't check. Try again.");
      });
    return () => {
      cancel = true;
    };
  }, [value, onResult]);

  const colour =
    status === "serviceable"
      ? "text-green-700"
      : status === "not_serviceable"
        ? "text-amber-700"
        : status === "error"
          ? "text-coral"
          : "text-ink-soft";

  return (
    <label className="block">
      <span className="font-sans text-sm text-ink-soft">
        Pincode <span className="text-coral">*</span>
      </span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="mt-1 block w-full rounded-md border border-[color:var(--rule)] px-3 py-2 font-mono tracking-widest"
        placeholder="411014"
      />
      {message && (
        <span className={`mt-1 block font-sans text-xs ${colour}`}>{message}</span>
      )}
    </label>
  );
}
