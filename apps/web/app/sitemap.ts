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
      const isAuth = path === '/login' || path === '/register';
      const isLegal = path === '/terms' || path === '/privacy' || path === '/cookies';
      const isFeaturePage = !isCore && !isLegal && !isAuth && path !== "/about" && path !== "/templates";

      return {
        url: `${baseUrl}${localizedPath}`,
        lastModified: new Date(),
        changeFrequency: (isCore ? "monthly" : isFeaturePage || isAuth ? "weekly" : "monthly") as "monthly" | "weekly",
        priority: isCore ? 1 : isPricing ? 0.95 : isAuth ? 0.85 : isFeaturePage ? 0.9 : 0.7,
      };
    })
  );

  return marketingUrls;
}
