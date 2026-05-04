import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListPage } from "@/components/ListPage";
import { categories, findCategory } from "@/data/categories";

export function generateStaticParams() {
  return categories.map(c => ({ category: c.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> }
): Promise<Metadata> {
  const { category } = await params;
  const cat = findCategory(category);
  if (!cat) return {};
  return {
    title: `${cat.name} — ${cat.tagline}`,
    description: `OrderLink's ${cat.name} edit: ${cat.tagline}, hand-tested and price-checked.`,
  };
}

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  if (!findCategory(category)) notFound();
  return <ListPage activeCategory={category}/>;
}
