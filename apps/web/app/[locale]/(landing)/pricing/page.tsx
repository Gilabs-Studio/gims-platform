import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PricingSection } from "@/components/landing/pricing-section";

const BASE_URL = "https://salesview.id";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isId = locale === "id";

  const title = isId
    ? "Pricing SalesView: Harga ERP, CRM, HRIS, POS & Finance"
    : "SalesView Pricing: ERP, CRM, HRIS, POS & Finance Plans";
  const description = isId
    ? "Lihat harga SalesView untuk paket ERP, CRM, HRIS, POS, dan Finance. Bandingkan bundle vs modular dan pilih paket sesuai skala bisnis Anda."
    : "See SalesView pricing for ERP, CRM, HRIS, POS, and Finance. Compare bundle vs modular plans and choose the best fit for your business scale.";
  const canonicalPath = `/${locale}/pricing`;

  return {
    title,
    description,
    keywords: isId
      ? [
          "harga erp salesview",
          "harga salesview",
          "pricing erp indonesia",
          "harga software crm",
          "harga aplikasi kasir pos",
          "harga hris",
          "paket software bisnis",
        ]
      : [
          "salesview pricing",
          "erp pricing indonesia",
          "crm pricing",
          "hris pricing",
          "pos pricing",
          "business software plans",
        ],
    alternates: {
      canonical: canonicalPath,
      languages: {
        id: "/id/pricing",
        en: "/en/pricing",
      },
    },
    openGraph: {
      type: "website",
      url: `${BASE_URL}${canonicalPath}`,
      title,
      description,
      images: [
        {
          url: "/screenshot/dashboard.webp",
          width: 1920,
          height: 1080,
          alt: "SalesView pricing overview",
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

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isId = locale === "id";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "SalesView Pricing",
    description: isId
      ? "Halaman pricing resmi SalesView untuk paket ERP, CRM, HRIS, POS, dan Finance."
      : "Official SalesView pricing page for ERP, CRM, HRIS, POS, and Finance plans.",
    brand: {
      "@type": "Brand",
      name: "SalesView",
    },
    category: "Business Software",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: "79000",
      highPrice: "175000",
      offerCount: "6",
      url: `${BASE_URL}/${locale}/pricing`,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative z-10 overflow-x-hidden pt-16">
        <PricingSection />
      </div>
    </>
  );
}
