import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora, Newsreader } from "next/font/google";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getLanguageAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const headingFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const accentFont = Newsreader({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic", "normal"],
  display: "swap",
});

async function resolveDocumentLocale(): Promise<Locale> {
  const headerStore = await headers();
  const headerLocale = headerStore.get("x-gims-locale");

  if (routing.locales.includes(headerLocale as Locale)) {
    return headerLocale as Locale;
  }

  try {
    const localeValue = await getLocale();
    if (routing.locales.includes(localeValue as Locale)) {
      return localeValue as Locale;
    }
  } catch {
    // Fall through to default locale.
  }

  return routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveDocumentLocale();

  return {
    metadataBase: new URL("https://salesview.id"),
    title: {
      template: "%s | SalesView",
      default: "SalesView - ERP, CRM, HRIS, POS & Finance",
    },
    description:
      "SalesView adalah software all-in-one ERP, CRM, HRIS, POS, dan Finance untuk bisnis Indonesia. Satu platform untuk operasional, penjualan, stok, HR, dan laporan keuangan.",
    keywords: [
      "ERP Indonesia",
      "Aplikasi CRM",
      "Sistem HRIS",
      "Aplikasi Kasir POS",
      "Software Finance",
      "SalesView",
      "Manajemen Bisnis Terintegrasi",
      "All-in-one Software",
      "Vendor ERP",
      "Custom ERP",
      "Custom ERP Indonesia",
      "ERP Indonesia Murah",
      "point of sales",
      "pos kasir",
      "software hrd",
      "inventory software",
      "sales erp",
      "aplikasi pencatatan penjualan",
      "sales management software",
      "software manajemen penjualan",
    ],
    authors: [{ name: "SalesView" }],
    creator: "SalesView",
    publisher: "SalesView",
    openGraph: {
      type: "website",
      locale: locale === "id" ? "id_ID" : "en_US",
      url: "https://salesview.id",
      title: "SalesView - ERP, CRM, HRIS, POS & Finance",
      description:
        "SalesView adalah platform bisnis all-in-one untuk ERP, CRM, HRIS, POS, dan Finance di Indonesia.",
      siteName: "SalesView",
      images: [
        {
          url: "/screenshot/dashboard.webp",
          width: 1920,
          height: 1080,
          alt: "SalesView dashboard preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "SalesView - ERP, CRM, HRIS, POS & Finance",
      description:
        "SalesView adalah platform bisnis all-in-one untuk ERP, CRM, HRIS, POS, dan Finance di Indonesia.",
      creator: "@salesview",
      images: ["/screenshot/dashboard.webp"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: "https://salesview.id",
      languages: getLanguageAlternates("/"),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await resolveDocumentLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${headingFont.variable} ${accentFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
