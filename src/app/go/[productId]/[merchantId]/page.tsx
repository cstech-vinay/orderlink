import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products, type MerchantId } from "@/data/affiliate-products";
import { RedirectInterstitial } from "@/components/RedirectInterstitial";

const VALID_MERCHANTS: MerchantId[] = ["amazon", "myntra", "nykaa"];

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "Redirecting…",
};

export function generateStaticParams() {
  const out: { productId: string; merchantId: MerchantId }[] = [];
  for (const p of products) {
    for (const m of p.merchants) out.push({ productId: p.id, merchantId: m.id });
  }
  return out;
}

export default async function GoPage(
  { params }: { params: Promise<{ productId: string; merchantId: string }> }
) {
  const { productId, merchantId } = await params;
  if (!VALID_MERCHANTS.includes(merchantId as MerchantId)) notFound();

  const product = products.find(p => p.id === productId);
  if (!product) notFound();

  const merchant = product.merchants.find(m => m.id === merchantId);
  if (!merchant) notFound();

  return <RedirectInterstitial product={product} merchant={merchant}/>;
}
