import { Hero } from "@/components/Hero";
import { CategoryBand } from "@/components/CategoryBand";
import { FirstOrderBanner } from "@/components/FirstOrderBanner";
import { productsByCategory } from "@/data/products";

export const dynamic = "force-static";

export default function HomePage() {
  const grouped = productsByCategory();
  return (
    <>
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
