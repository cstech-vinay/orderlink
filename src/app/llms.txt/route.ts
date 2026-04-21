// Server-generated /llms.txt — always in sync with src/data/products.ts.
// Discovered by AI search crawlers (ChatGPT, Perplexity, Claude) as a
// structured index of the site's indexable content.
import { NextResponse } from "next/server";
import { products, type Product } from "@/data/products";
import { LEGAL } from "@/lib/legal";

export const dynamic = "force-static";

const SITE = "https://orderlink.in";

export function GET() {
  const live = products.filter((p) => p.status === "live");

  const byCat = new Map<string, Product[]>();
  for (const p of live) {
    const list = byCat.get(p.categoryLabel) ?? [];
    list.push(p);
    byCat.set(p.categoryLabel, list);
  }

  const lines: string[] = [];
  lines.push(`# ${LEGAL.brandName}`);
  lines.push("");
  lines.push(
    "> Curated lifestyle D2C store based in Pune, India. A tight edit of home, kitchen, beauty, electronics, fashion, and footwear goods shipped all-India with free shipping, COD, UPI, and a 15-day delivery guarantee."
  );
  lines.push("");
  lines.push(
    `Legal entity: ${LEGAL.companyName} (CIN ${LEGAL.cin}, GSTIN ${LEGAL.gstin}). Support: ${LEGAL.supportEmail}.`
  );
  lines.push("");

  for (const [cat, items] of byCat) {
    lines.push(`## Products — ${cat}`);
    for (const p of items) {
      lines.push(`- [${p.title}](${SITE}/p/${p.slug}): ${p.shortSubtitle}`);
    }
    lines.push("");
  }

  lines.push("## Policies");
  lines.push(`- [Shipping](${SITE}/shipping-policy)`);
  lines.push(`- [Refund & Returns](${SITE}/refund-policy)`);
  lines.push(`- [Privacy](${SITE}/privacy)`);
  lines.push(`- [Terms](${SITE}/terms)`);
  lines.push("");

  lines.push("## Optional");
  lines.push(`- [Sitemap](${SITE}/sitemap.xml)`);
  lines.push(`- [About](${SITE}/about)`);
  lines.push(`- [Contact](${SITE}/contact)`);
  lines.push("");

  return new NextResponse(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
