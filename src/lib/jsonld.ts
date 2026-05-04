import type { AffiliateProduct } from "@/data/affiliate-products";

export function productJsonLd(p: AffiliateProduct, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary,
    image: p.images.map(i => baseUrl + i),
    sku: p.id,
    brand: { "@type": "Brand", name: "OrderLink" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviewCount,
    },
    offers: p.merchants.map(m => ({
      "@type": "Offer",
      url: `${baseUrl}/go/${p.id}/${m.id}`,
      priceCurrency: "INR",
      price: m.price,
      availability: m.stock === "Out of stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: m.label },
    })),
    review: p.reviews.map(r => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: { "@type": "Person", name: r.name },
      name: r.title,
      reviewBody: r.body,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: i.name,
      item: i.url,
    })),
  };
}
