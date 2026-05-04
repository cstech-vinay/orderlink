/**
 * Downloads the placeholder reels from Pixabay (per the design)
 * into /public/products/<slug>/reel.mp4 for the products that have a `reel`
 * field in the catalog.
 *
 * Run once: `npx tsx scripts/download-seed-reels.ts`
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { products } from "../src/data/affiliate-products";

const REEL_BY_CATEGORY: Record<string, string> = {
  techland:  "https://cdn.pixabay.com/video/2023/08/04/175044-852361758_tiny.mp4",
  glossy:    "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
  clothlink: "https://cdn.pixabay.com/video/2022/10/27/137000-764746551_tiny.mp4",
  homely:    "https://cdn.pixabay.com/video/2020/06/20/42389-433130128_tiny.mp4",
  sufraan:   "https://cdn.pixabay.com/video/2020/06/20/42389-433130128_tiny.mp4",
  studify:   "https://cdn.pixabay.com/video/2022/10/27/137000-764746551_tiny.mp4",
  kidzy:     "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
  giftzone:  "https://cdn.pixabay.com/video/2024/03/06/202842-921263842_tiny.mp4",
};

async function downloadOne(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath} (${(buf.length / 1024).toFixed(0)} kB)`);
}

async function main() {
  for (const p of products) {
    if (!p.reel) continue;
    const url = REEL_BY_CATEGORY[p.category];
    if (!url) {
      console.warn(`No reel URL for category ${p.category} — skipping`);
      continue;
    }
    try {
      await downloadOne(url, join("public", "products", p.slug, "reel.mp4"));
    } catch (e) {
      console.warn(`Failed: ${(e as Error).message}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
