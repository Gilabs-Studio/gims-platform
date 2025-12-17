import { routing } from "@/i18n/routing";
import type { Locale } from "@/types/locale";

/**
 * Extract locale from pathname or return default locale
 * Handles paths with and without locale prefix
 * 
 * @param pathname - The pathname to extract locale from (e.g., "/en/dashboard" or "/dashboard")
 * @returns The locale string ("en" or "id")
 */
export function getLocaleFromPathname(pathname: string): Locale {
  // Try to match locale from pathname (e.g., /en/..., /id/...)
  const localeMatch = pathname.match(/^\/(en|id)(\/|$)/);
  if (localeMatch && routing.locales.includes(localeMatch[1] as Locale)) {
    return localeMatch[1] as Locale;
  }

  // If no locale in pathname, try to get from localStorage
  if (typeof window !== "undefined") {
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale === "en" || savedLocale === "id") {
      return savedLocale;
    }
  }

  // Default to configured default locale
  return routing.defaultLocale;
}

