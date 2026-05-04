import { products } from "@/data/affiliate-products";
import { ProductCard } from "./ProductCard";
import { FeaturedHero } from "./FeaturedHero";
import { SectionHead } from "./SectionHead";

export function FeaturedGrid() {
  const featured = products.slice(0, 6);
  return (
    <section className="my-14">
      <SectionHead
        eyebrow="This week's edit"
        title="What we're loving right now"
        link={{ label: `See all ${products.length}`, href: "/shop" }}
      />
      <div className="ol-featured-grid grid gap-4" style={{ gridTemplateColumns: "repeat(12, 1fr)", gridAutoRows: "minmax(260px, auto)" }}>
        <div className="col-span-12 md:col-span-6"><FeaturedHero p={featured[0]} /></div>
        <div className="col-span-12 md:col-span-3"><ProductCard p={featured[1]} variant="tall"/></div>
        <div className="col-span-12 md:col-span-3"><ProductCard p={featured[2]} variant="tall"/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[3]}/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[4]}/></div>
        <div className="col-span-12 md:col-span-4"><ProductCard p={featured[5]}/></div>
      </div>
    </section>
  );
}
