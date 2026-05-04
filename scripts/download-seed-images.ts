/**
 * One-time download of the 12 seed product images from the design's Unsplash
 * placeholders into /public/products/<slug>/<n>.webp.
 *
 * Run once: `npx tsx scripts/download-seed-images.ts`
 * Commit the resulting /public/products/ tree.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { products } from "../src/data/affiliate-products";

const SOURCES: Record<string, string[]> = {
  "ai-translation-earbuds":     ["1606220588913-b3aacb4d2f46", "1590658268037-6bf12165a8df", "1572569511254-d8f925fe2cbb", "1608043152269-423dbba4e7e1"],
  "mini-sleep-earbuds":         ["1590658268037-6bf12165a8df", "1606220588913-b3aacb4d2f46", "1572569511254-d8f925fe2cbb"],
  "mens-grooming-kit":          ["1621607512214-68297480165e", "1593702288056-7927b4d51d9c", "1599351431202-1e0f0137899a"],
  "crystal-velvet-prayer-mat":  ["1604719312566-8912e9227c6a", "1606293606464-f6d2c0686e51", "1600585154340-be6161a56a0c"],
  "granite-cookware-set-7pc":   ["1584990347449-a8d2f6c6f0f1", "1556909114-f6e7ad7d3136", "1604908554007-9a64a31e5b06"],
  "rechargeable-spray-bottle":  ["1585421514738-01798e348b17", "1556909114-f6e7ad7d3136"],
  "glow-serum-vitamin-c-20":    ["1620916566398-39f1143ab7be", "1556228720-195a672e8a03", "1556228578-8c89e6adf883"],
  "hydrating-lip-oil-trio":     ["1586495777744-4413f21062fa", "1571781926291-c477ebfd024b"],
  "linen-blend-oversized-shirt":["1602810318383-e386cc2a3ccf", "1620799140408-edc6dcb6d633", "1551488831-00ddcb6c6bd3"],
  "pleated-midi-skirt":         ["1583496661160-fb5886a13d44", "1551488831-00ddcb6c6bd3"],
  "wooden-montessori-cube":     ["1558877385-8c1604e1de0d", "1566576912321-d58ddd7a6088", "1545558014-8692077e9b5c"],
  "refillable-notebook-system": ["1531346878377-a5be20888e57", "1517842645767-c639042777db"],
};

async function fetchOneToWebp(unsplashId: string, outPath: string) {
  const url = `https://images.unsplash.com/photo-${unsplashId}?w=1200&q=80&auto=format&fit=crop&fm=webp`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${unsplashId}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath} (${(buf.length / 1024).toFixed(0)} kB)`);
}

async function main() {
  for (const product of products) {
    const ids = SOURCES[product.slug];
    if (!ids) {
      console.warn(`No source mapping for slug ${product.slug} — skipping`);
      continue;
    }
    for (let i = 0; i < ids.length; i++) {
      try {
        await fetchOneToWebp(ids[i], join("public", "products", product.slug, `${i + 1}.webp`));
      } catch (e) {
        console.warn(`Failed to download ${product.slug}/${i + 1}.webp: ${(e as Error).message}`);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
