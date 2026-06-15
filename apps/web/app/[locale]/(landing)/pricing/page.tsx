import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PricingSection } from "@/components/landing/pricing-section";
import { buildLandingMetadata, SEO_BASE_URL } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isId = locale === "id";

  const title = isId
    ? "Harga ERP, POS, CRM, HRIS & Finance untuk Distributor, Retail, dan F&B | SalesView"
    : "ERP, POS, CRM, HRIS & Finance Pricing for Distribution, Retail, and F&B | SalesView";
  const description = isId
    ? "Bandingkan harga bundle dan modular untuk ERP distributor, POS restoran atau retail, CRM sales lapangan, HRIS, dan finance agar rollout software sesuai kebutuhan tim Anda."
    : "Compare bundle and modular pricing for distributor ERP, restaurant or retail POS, field sales CRM, HRIS, and finance so your rollout matches your team structure.";

  return buildLandingMetadata({
    locale,
    path: "/pricing",
    title,
    description,
    keywords: isId
      ? [
          "harga erp distributor per user indonesia",
          "biaya pos restoran cafe multi outlet",
          "harga crm sales lapangan dan follow up",
          "paket software accounting inventory hris",
          "erp modular untuk distributor retail fnb",
          "salesview pricing",
        ]
      : [
          "distributor erp software pricing plans",
          "restaurant retail pos pricing per user",
          "field sales crm and finance software pricing",
          "modular erp pricing for growing business teams",
          "salesview pricing",
        ],
    imageAlt: "SalesView pricing overview",
  });
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
      url: `${SEO_BASE_URL}/${locale}/pricing`,
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
