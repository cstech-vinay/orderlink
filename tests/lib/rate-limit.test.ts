import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("rate-limit — sliding window", () => {
  let now: number;
  let clock: () => number;

  beforeEach(() => {
    now = 1_000_000;
    clock = () => now;
  });

  it("allows up to `max` hits inside the window", () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000, clock });
    expect(rl.check("user-a").allowed).toBe(true);
    expect(rl.check("user-a").allowed).toBe(true);
    expect(rl.check("user-a").allowed).toBe(true);
  });

  it("blocks the (max+1)-th hit inside the window", () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000, clock });
    rl.check("user-a");
    rl.check("user-a");
    rl.check("user-a");
    const fourth = rl.check("user-a");
    if (fourth.allowed) throw new Error("expected block");
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 60_000, clock });
    rl.check("user-a");
    rl.check("user-a");
    expect(rl.check("user-a").allowed).toBe(false);
    expect(rl.check("user-b").allowed).toBe(true);
  });

  it("re-allows after the window expires", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, clock });
    rl.check("user-a");
    expect(rl.check("user-a").allowed).toBe(false);
    now += 60_001;
    expect(rl.check("user-a").allowed).toBe(true);
  });

  it("reports retryAfterMs equal to (oldest hit + windowMs) - now", () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, clock });
    rl.check("user-a"); // at t=1_000_000
    now += 10_000; // t=1_010_000
    const blocked = rl.check("user-a");
    if (blocked.allowed) throw new Error("expected block");
    // oldest hit at 1_000_000 + 60_000 = 1_060_000; now 1_010_000 → retryAfter 50_000
    expect(blocked.retryAfterMs).toBe(50_000);
  });
});
