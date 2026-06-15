import { MetadataRoute } from "next";
import { INDEXABLE_MARKETING_PATHS } from "@/lib/seo-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://salesview.id";
  const locales = ["id", "en"] as const;

  const marketingUrls = locales.flatMap((locale) =>
    INDEXABLE_MARKETING_PATHS.map((path) => {
      const localizedPath = path === '/' ? `/${locale}` : `/${locale}${path}`;
      const isCore = path === '/';
      const isPricing = path === '/pricing';
      const isFeaturePage = path !== "/" && path !== "/about" && path !== "/templates";

      return {
        url: `${baseUrl}${localizedPath}`,
        lastModified: new Date(),
        changeFrequency: (isCore ? "monthly" : isFeaturePage ? "weekly" : "monthly") as "monthly" | "weekly",
        priority: isCore ? 1 : isPricing ? 0.95 : isFeaturePage ? 0.9 : 0.75,
      };
    })
  );

  return marketingUrls;
}
