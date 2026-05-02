import type { Metadata } from "next";

export const SEO_BASE_URL = "https://salesview.id";
export const SUPPORTED_SEO_LOCALES = ["id", "en"] as const;

type SupportedLocale = (typeof SUPPORTED_SEO_LOCALES)[number];

type LandingMetadataInput = {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords: string[];
  imageAlt: string;
};

function normalizeLocale(locale: string): SupportedLocale {
  return locale === "id" ? "id" : "en";
}

function withLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getLocalizedPath(path: string, locale: string): string {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedPath = withLeadingSlash(path);

  if (normalizedPath === "/") {
    return `/${normalizedLocale}`;
  }

  return `/${normalizedLocale}${normalizedPath}`;
}

export function getLanguageAlternates(path: string): Record<string, string> {
  return {
    id: getLocalizedPath(path, "id"),
    en: getLocalizedPath(path, "en"),
    "x-default": getLocalizedPath(path, "en"),
  };
}

export function buildLandingMetadata({
  locale,
  path,
  title,
  description,
  keywords,
  imageAlt,
}: LandingMetadataInput): Metadata {
  const canonicalPath = getLocalizedPath(path, locale);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
      languages: getLanguageAlternates(path),
    },
    openGraph: {
      type: "website",
      locale: locale === "id" ? "id_ID" : "en_US",
      url: `${SEO_BASE_URL}${canonicalPath}`,
      title,
      description,
      siteName: "SalesView",
      images: [
        {
          url: "/screenshot/dashboard.webp",
          width: 1920,
          height: 1080,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/screenshot/dashboard.webp"],
    },
  };
}
