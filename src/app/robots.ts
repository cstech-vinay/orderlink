import type { MetadataRoute } from "next";

const SITE = "https://orderlink.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/checkout", "/orders/", "/track"],
      },
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "Amazonbot",
          "DuckAssistBot",
          "Meta-ExternalAgent",
        ],
        allow: "/",
        disallow: ["/api/", "/checkout", "/orders/", "/track"],
      },
      {
        userAgent: [
          "Bytespider",
          "CCBot",
          "anthropic-ai",
          "cohere-ai",
          "Diffbot",
          "ImagesiftBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
