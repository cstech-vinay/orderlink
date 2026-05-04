import { Hero } from "@/components/Hero";
import { CategoryStrip } from "@/components/CategoryStrip";
import { FeaturedGrid } from "@/components/FeaturedGrid";

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <FeaturedGrid />
    </>
  );
}
