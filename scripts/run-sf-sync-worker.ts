// Background worker that drains pending_sf_sync rows to Salesforce.
// Picks up rows where status='pending' AND next_attempt_at <= now(), processes
// up to BATCH_SIZE at a time, respects exponential backoff on failure, and
// exits cleanly when SF_SYNC_ENABLED=false.
//
// Run modes:
//   LOOP (default): polls every 30s forever — for Docker sidecar use
//       npx tsx scripts/run-sf-sync-worker.ts
//   ONCE (e.g. for cron or manual drain):
//       ONCE=1 npx tsx scripts/run-sf-sync-worker.ts
//
// Env:
//   SF_WORKER_BATCH_SIZE  — default 10; rows processed per poll iteration
//   SF_WORKER_INTERVAL_MS — default 30_000
import "dotenv/config";
import { and, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { isSalesforceEnabled } from "@/lib/salesforce/config";
import { syncPendingRow, type SyncOutcome } from "@/lib/salesforce/sync";

const BATCH_SIZE = Number(process.env.SF_WORKER_BATCH_SIZE ?? 10);
const INTERVAL_MS = Number(process.env.SF_WORKER_INTERVAL_MS ?? 30_000);
const ONCE = process.env.ONCE === "1";

// Exponential backoff: attempt N → wait 2^N minutes, capped at 60.
function nextAttemptDelayMs(attempts: number): number {
  const minutes = Math.min(60, Math.pow(2, attempts));
  return minutes * 60 * 1000;
}

async function drainBatch(): Promise<{ processed: number; failed: number }> {
  const rows = await db
    .select()
    .from(schema.pendingSfSync)
    .where(
      and(
        eq(schema.pendingSfSync.status, "pending"),
        lte(schema.pendingSfSync.nextAttemptAt, new Date())
      )
    )
    .orderBy(schema.pendingSfSync.nextAttemptAt)
    .limit(BATCH_SIZE);

  if (rows.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    const outcome = await withErrorCatch(() => syncPendingRow(row));
    if (outcome.ok) {
      await markSynced(row.id, outcome);
      processed++;
      console.log(
        `[sf-worker] ✓ ${row.jobKind} ${row.id} → synced (sfOrderId=${outcome.sfOrderId ?? "—"})`
      );
    } else {
      const attempts = row.attempts + 1;
      const delayMs = nextAttemptDelayMs(attempts);
      const retryable = outcome.retryable ?? false;
      await markFailed(row.id, {
        attempts,
        nextAttemptAt: retryable
          ? new Date(Date.now() + delayMs)
          : new Date("2099-01-01"), // "never" for non-retryable
        lastError: outcome.error,
        status: retryable ? "pending" : "failed",
      });
      failed++;
      console.warn(
        `[sf-worker] ✗ ${row.jobKind} ${row.id} → ${outcome.error}` +
          (retryable ? ` (retry in ${delayMs / 60000}min)` : " (fatal)")
      );
    }
  }

  return { processed, failed };
}

async function withErrorCatch(
  fn: () => Promise<SyncOutcome>
): Promise<SyncOutcome & { retryable?: boolean }> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Network errors + SF transient errors are retryable; misconfig is not.
    const retryable =
      !message.includes("salesforce_not_configured") &&
      !message.includes("decrypt_failed") &&
      !message.includes("order_ref_missing");
    return { ok: false, jobKind: "unknown", error: message, retryable };
  }
}

async function markSynced(pendingId: string, outcome: SyncOutcome): Promise<void> {
  if (!outcome.ok) return;
  await db
    .update(schema.pendingSfSync)
    .set({
      status: "synced",
      sfAccountId: outcome.sfAccountId ?? null,
      sfOrderId: outcome.sfOrderId ?? null,
      lastError: null,
    })
    .where(eq(schema.pendingSfSync.id, pendingId));
}

async function markFailed(
  pendingId: string,
  patch: {
    attempts: number;
    nextAttemptAt: Date;
    lastError: string;
    status: "pending" | "failed";
  }
): Promise<void> {
  await db
    .update(schema.pendingSfSync)
    .set({
      attempts: patch.attempts,
      nextAttemptAt: patch.nextAttemptAt,
      lastError: patch.lastError,
      status: patch.status,
    })
    .where(eq(schema.pendingSfSync.id, pendingId));
}

async function main(): Promise<void> {
  if (!isSalesforceEnabled()) {
    console.log(
      "[sf-worker] SF_SYNC_ENABLED is not 'true' OR required creds missing. Exiting."
    );
    process.exit(0);
  }

  console.log(
    `[sf-worker] starting (mode=${ONCE ? "ONCE" : "LOOP"}, batchSize=${BATCH_SIZE}, intervalMs=${INTERVAL_MS})`
  );

  if (ONCE) {
    const result = await drainBatch();
    console.log(
      `[sf-worker] done — processed=${result.processed} failed=${result.failed}`
    );
    process.exit(0);
  }

  // Loop mode — poll forever with graceful shutdown on SIGINT/SIGTERM
  let stopping = false;
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      console.log(`[sf-worker] ${sig} received — finishing current batch then exiting`);
      stopping = true;
    });
  }

  while (!stopping) {
    try {
      await drainBatch();
    } catch (err) {
      console.error("[sf-worker] batch failed:", err);
    }
    if (stopping) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  console.log("[sf-worker] stopped.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[sf-worker] fatal:", err);
  process.exit(1);
});

// Silence the unused `sql` import helper if TS complains in strict mode
void sql;
