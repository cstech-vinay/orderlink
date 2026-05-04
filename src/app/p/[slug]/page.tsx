import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { Stars } from "@/components/Stars";
import { Price } from "@/components/Price";
import { ProductGallery } from "@/components/ProductGallery";
import { MerchantList } from "@/components/MerchantList";
import { CommissionNote } from "@/components/CommissionNote";
import { TrustStrip } from "@/components/TrustStrip";
import { ProductTabs } from "@/components/ProductTabs";
import { RelatedGrid } from "@/components/RelatedGrid";
import { findProduct, products } from "@/data/affiliate-products";
import { findCategory } from "@/data/categories";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";

const SITE = "https://orderlink.in";

export function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    openGraph: {
      title: p.title,
      description: p.summary,
      images: [{ url: p.images[0], width: 1200, height: 630 }],
    },
  };
}

export default async function PdpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) notFound();

  const cat = findCategory(p.category);
  const productLd = productJsonLd(p, SITE);
  const crumbsLd = breadcrumbJsonLd([
    { name: "Home", url: SITE },
    { name: cat?.name ?? "Shop", url: `${SITE}/shop/${p.category}` },
    { name: p.title, url: `${SITE}/p/${p.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsLd) }}/>

      <div className="flex items-center gap-2 text-[13px] text-ol-muted py-5 flex-wrap">
        <Link href="/">Home</Link>
        <Icon name="chevron-right" size={12}/>
        <Link href={`/shop/${p.category}`}>{cat?.name}</Link>
        <Icon name="chevron-right" size={12}/>
        <span className="text-ol-ink">{p.title}</span>
      </div>

      <div className="grid gap-10 items-start mb-14 ol-detail-grid"
           style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)" }}>
        <ProductGallery product={p}/>

        <div>
          <div className="inline-flex items-center gap-2 text-ol-muted text-[13px] font-semibold uppercase tracking-[0.1em] mb-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `oklch(0.55 0.18 ${cat?.hue ?? 0})` }}/>
            {cat?.name}
          </div>
          <h1 className="font-display font-bold tracking-tight m-0 mb-2.5 text-[clamp(28px,3vw,40px)]"
              style={{ lineHeight: 1.1, textWrap: "balance" }}>
            {p.title}
          </h1>
          <p className="text-[16px] text-ol-muted m-0 mb-5">{p.subtitle}</p>

          <div className="flex items-center gap-3.5 mb-5">
            <Stars value={p.rating} size={16}/>
            <span className="text-[14px] font-semibold">{p.rating}</span>
            <span className="text-[14px] text-ol-muted">· {p.reviewCount.toLocaleString("en-IN")} reviews</span>
          </div>

          <div className="mb-6"><Price value={p.price} mrp={p.mrp} size="xl"/></div>

          <MerchantList product={p}/>
          <CommissionNote/>
          <TrustStrip/>
        </div>
      </div>

      <ProductTabs product={p}/>
      <RelatedGrid product={p}/>
    </>
  );
}
