// Seeds the two Phase 2a coupons. Idempotent — re-running is safe.
//   WELCOME10 — ₹10 off, first-order only (1 per email)
//   STAY5     — ₹5 off, exit-intent overlay
// Run:  docker compose -f docker-compose.dev.yml exec app npx tsx scripts/seed-coupons.ts
import "dotenv/config";
import { db, schema } from "@/db/client";

async function main() {
  const result = await db
    .insert(schema.coupons)
    .values([
      {
        code: "WELCOME10",
        kind: "first_order",
        amountPaise: 1000, // ₹10
        maxUses: null,
      },
      {
        code: "STAY5",
        kind: "exit_intent",
        amountPaise: 500, // ₹5
        maxUses: null,
      },
    ])
    .onConflictDoNothing()
    .returning({ code: schema.coupons.code });

  console.log(
    result.length === 0
      ? "Coupons already present, nothing to do."
      : `Seeded ${result.length} coupon(s): ${result.map((r) => r.code).join(", ")}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
