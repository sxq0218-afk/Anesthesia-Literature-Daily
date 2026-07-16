import type { MetadataRoute } from "next";
import { allArticles, editionDateKey, editions } from "./content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticPaths = ["", "/daily", "/archive", "/about", "/privacy", "/rss"];
  return [
    ...staticPaths.map(path => ({ url: `${base}${path}/`, lastModified: new Date() })),
    ...editions.map(edition => ({ url: `${base}/archive/${editionDateKey(edition)}/`, lastModified: new Date(edition.generatedAt || Date.now()) })),
    ...allArticles.map(article => ({ url: `${base}/articles/${article.slug}/`, lastModified: new Date(article.publishedDate || Date.now()) })),
  ];
}
