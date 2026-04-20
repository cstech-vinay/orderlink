// Run periodically (cron: every 10 min in prod) to free inventory held by
// abandoned checkouts. Promotes abandoned orders to SF "lead_sync" so the
// T28 Salesforce worker creates Lead records for retargeting.
//
// Local run:      npx tsx scripts/reap-reservations.ts
// Inside docker:  docker compose -f docker-compose.dev.yml exec app npx tsx scripts/reap-reservations.ts
import "dotenv/config";
import { reapStaleReservations } from "@/lib/inventory";

const DEFAULT_MINUTES = 15;

async function main() {
  const fromEnv = Number(process.env.REAPER_STALE_MINUTES);
  const minutes = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MINUTES;
  const reaped = await reapStaleReservations(minutes);
  console.log(
    `[reaper] scanned for orders older than ${minutes} min — reaped ${reaped}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[reaper] failed:", err);
  process.exit(1);
});
