import { Hero } from "@/components/Hero";
import { CategoryBand } from "@/components/CategoryBand";
import { FirstOrderBanner } from "@/components/FirstOrderBanner";
import { products, productsByCategory } from "@/data/products";

export const dynamic = "force-static";

const liveProducts = products.filter((p) => p.status === "live");

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "OrderLink — Curated lifestyle goods",
  url: "https://orderlink.in",
  inLanguage: "en-IN",
  isPartOf: { "@id": "https://orderlink.in/#website" },
  mainEntity: {
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: liveProducts.length,
    itemListElement: liveProducts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://orderlink.in/p/${p.slug}`,
      name: p.title,
    })),
  },
};

export default function HomePage() {
  const grouped = productsByCategory();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <FirstOrderBanner />
      <Hero />
      <CategoryBand category="kitchen" products={grouped.kitchen} />
      <CategoryBand category="beauty" products={grouped.beauty} />
      <CategoryBand category="electronics" products={grouped.electronics} />
      <CategoryBand category="fashion" products={grouped.fashion} />
      <CategoryBand category="footwear" products={grouped.footwear} />
    </>
  );
}
