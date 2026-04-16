import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
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
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gims.gilabs.co.id"),
  title: {
    template: "%s | GIMS by GILABS",
    default: "GIMS by GILABS - ERP, CRM, HRIS, POS & Finance",
  },
  description:
    "GIMS by GILABS adalah software all-in-one ERP, CRM, HRIS, POS, dan Finance untuk bisnis Indonesia. Satu platform untuk operasional, penjualan, stok, HR, dan laporan keuangan.",
  keywords: [
    "ERP Indonesia",
    "Aplikasi CRM",
    "Sistem HRIS",
    "Aplikasi Kasir POS",
    "Software Finance",
    "GIMS",
    "GILABS",
    "Manajemen Bisnis Terintegrasi",
    "All-in-one Software",
    "Vendor ERP",
    "Custom ERP",
    "Custom ERP Indonesia",
    "ERP Indonesia Murah",
  ],
  authors: [{ name: "GILABS" }],
  creator: "GILABS",
  publisher: "GILABS",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://gims.gilabs.co.id",
    title: "GIMS by GILABS - ERP, CRM, HRIS, POS & Finance",
    description:
      "GIMS by GILABS adalah platform bisnis all-in-one untuk ERP, CRM, HRIS, POS, dan Finance di Indonesia.",
    siteName: "GIMS by GILABS",
    images: [
      {
        url: "/screenshot/dashboard.webp",
        width: 1920,
        height: 1080,
        alt: "GIMS by GILABS dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIMS by GILABS - ERP, CRM, HRIS, POS & Finance",
    description:
      "GIMS by GILABS adalah platform bisnis all-in-one untuk ERP, CRM, HRIS, POS, dan Finance di Indonesia.",
    creator: "@gilabs",
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
    canonical: "https://gims.gilabs.co.id",
  },
};

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
  let locale: Locale;
  try {
    const localeValue = await getLocale();
    locale = routing.locales.includes(localeValue as Locale)
      ? (localeValue as Locale)
      : routing.defaultLocale;
  } catch {
    locale = routing.defaultLocale;
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${headingFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
