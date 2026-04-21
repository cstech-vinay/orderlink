// Reaper: releases inventory held by abandoned checkouts AND promotes their
// pending_sf_sync rows from full_sync → lead_sync so the sf-sync-worker creates
// Salesforce Leads (not Accounts+Orders) for retargeting.
//
// Run modes:
//   - ONCE (default): single pass, for ad-hoc / cron invocations
//       docker compose -f docker-compose.dev.yml exec app npx tsx scripts/reap-reservations.ts
//   - LOOP (LOOP=1): polls every REAPER_INTERVAL_MS, for the docker sidecar
//
// Env:
//   REAPER_STALE_MINUTES  — default 15; threshold for "abandoned"
//   REAPER_INTERVAL_MS    — default 300000 (5 min); LOOP mode only
//   LOOP=1                — enables LOOP mode
import "dotenv/config";
import { reapStaleReservations } from "@/lib/inventory";

const DEFAULT_MINUTES = 15;
const DEFAULT_INTERVAL_MS = 5 * 60_000;

function staleMinutes(): number {
  const v = Number(process.env.REAPER_STALE_MINUTES);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MINUTES;
}

function intervalMs(): number {
  const v = Number(process.env.REAPER_INTERVAL_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_INTERVAL_MS;
}

async function runOnce(): Promise<void> {
  const minutes = staleMinutes();
  const reaped = await reapStaleReservations(minutes);
  console.log(
    `[reaper] scanned for orders older than ${minutes} min — reaped ${reaped}`
  );
}

async function main(): Promise<void> {
  const isLoop = process.env.LOOP === "1";

  if (!isLoop) {
    await runOnce();
    process.exit(0);
  }

  const interval = intervalMs();
  console.log(
    `[reaper] LOOP mode — stale threshold ${staleMinutes()} min, poll every ${interval}ms`
  );

  let stopping = false;
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      console.log(`[reaper] ${sig} received — stopping after current pass`);
      stopping = true;
    });
  }

  while (!stopping) {
    try {
      await runOnce();
    } catch (err) {
      console.error("[reaper] pass failed:", err);
    }
    if (stopping) break;
    await new Promise((r) => setTimeout(r, interval));
  }

  console.log("[reaper] stopped.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[reaper] fatal:", err);
  process.exit(1);
});
