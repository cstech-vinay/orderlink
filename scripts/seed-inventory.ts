// One-shot: populate the inventory table with starting stock for every product
// in src/data/products.ts. Uses onConflictDoNothing so re-runs are safe.
// Run with:  npx tsx scripts/seed-inventory.ts
import "dotenv/config";
import { db, schema } from "@/db/client";
import { products } from "@/data/products";

async function main() {
  let inserted = 0;
  let skipped = 0;
  for (const p of products) {
    const result = await db
      .insert(schema.inventory)
      .values({ productSlug: p.slug, remaining: p.startingInventory, reserved: 0 })
      .onConflictDoNothing()
      .returning({ slug: schema.inventory.productSlug });
    if (result.length > 0) inserted += 1;
    else skipped += 1;
  }
  console.log(`Seeded ${inserted} inventory rows; skipped ${skipped} existing.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
