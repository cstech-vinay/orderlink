import { Suspense } from "react";
import type { Metadata } from "next";
import { ListPage } from "@/components/ListPage";

export const metadata: Metadata = {
  title: "Shop — every curated find",
  description: "Browse all 12 of OrderLink's curated finds across 8 sub-brands.",
};

function ShopInner({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  return <ListPage activeCategory="all" initialQuery={q}/>;
}

export default async function ShopPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const sp = await searchParams;
  return (
    <Suspense>
      <ShopInner searchParams={sp}/>
    </Suspense>
  );
}
