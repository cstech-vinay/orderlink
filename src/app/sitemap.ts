import type { MetadataRoute } from "next";
import { products } from "@/data/affiliate-products";
import { categories } from "@/data/categories";

const SITE = "https://orderlink.in";
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const policyPaths = [
    "about", "contact", "privacy", "terms",
    "affiliate-disclosure", "editorial-policy", "how-we-curate",
  ];

  return [
    { url: SITE,                lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/shop`,      lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...categories.map(c => ({
      url: `${SITE}/shop/${c.id}`, lastModified, changeFrequency: "weekly" as const, priority: 0.8,
    })),
    ...products.map(p => ({
      url: `${SITE}/p/${p.slug}`, lastModified, changeFrequency: "weekly" as const, priority: 0.7,
    })),
    ...policyPaths.map(p => ({
      url: `${SITE}/${p}`, lastModified, changeFrequency: "monthly" as const, priority: 0.4,
    })),
  ];
}
