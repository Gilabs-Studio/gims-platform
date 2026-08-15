import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const isId = locale === "id";
  return buildLandingMetadata({
    locale,
    path: "/",
    title: isId
      ? "SalesView: ERP, POS, CRM & Finance untuk Distributor, Retail, dan F&B"
      : "SalesView: ERP, POS, CRM & Finance for Distribution, Retail, and F&B",
    description: isId
      ? "Platform all-in-one untuk distributor, retail, dan F&B: kelola penjualan, pembelian, stok multi-gudang, POS, CRM, SDM, dan finance dalam satu sistem."
      : "An all-in-one platform for distribution, retail, and F&B teams to manage sales, purchasing, multi-warehouse inventory, POS, CRM, HR, and finance in one system.",
    keywords: isId
      ? [
          "erp distributor fmcg indonesia",
          "software pos restoran cafe multi cabang",
          "crm sales lapangan area mapping indonesia",
          "software inventory multi gudang pembelian penjualan",
          "aplikasi finance accounting dan hris terintegrasi",
          "salesview",
        ]
      : [
          "erp software for distribution retail and fnb",
          "multi warehouse inventory pos crm finance platform",
          "field sales crm and purchasing software",
          "integrated accounting hris and business operations system",
          "salesview",
        ],
    imageAlt: "SalesView platform overview",
  });
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://salesview.id/#organization",
        "name": "GILABS",
        "url": "https://salesview.id",
        "logo": "https://salesview.id/MECCAYA.webp",
        "description": "Provider of SalesView: All-in-One Enterprise Platform ERP, CRM, HRIS, POS, and Finance.",
        "sameAs": [
          "https://www.linkedin.com/company/gilabs"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://salesview.id/#website",
        "url": "https://salesview.id",
        "name": "SalesView",
        "publisher": {
          "@id": "https://salesview.id/#organization"
        }
      }
    ]
  };

  return (
    <>
      {/* JSON-LD rendered server-side so crawlers see it immediately */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      {/* Preload LCP image for faster perception of page load */}
      <link
        rel="preload"
        as="image"
        href="/screenshot/dashboard.webp"
        type="image/webp"
      />
      <LandingHeader />
      {children}
      <LandingFooter />
    </>
  );
}
