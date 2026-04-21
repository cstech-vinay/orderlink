import type { MetadataRoute } from "next";
import { products } from "@/data/products";

const BASE = "https://orderlink.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,                lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/about`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/logistics`,       lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`,         lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/terms`,           lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/refund-policy`,   lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/shipping-policy`, lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.status === "live")
    .map((p) => ({
      url: `${BASE}/p/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  return [...staticRoutes, ...productRoutes];
}
