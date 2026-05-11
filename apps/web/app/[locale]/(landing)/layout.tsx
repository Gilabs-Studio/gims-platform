import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
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
      ? "SalesView: ERP, CRM, HRIS, POS & Finance untuk Bisnis Indonesia"
      : "SalesView: ERP, CRM, HRIS, POS & Finance for Modern Teams",
    description: isId
      ? "Platform all-in-one untuk penjualan, pembelian, stok, SDM, dan keuangan. Jalankan operasional bisnis lebih cepat dengan SalesView."
      : "An all-in-one platform for sales, purchasing, inventory, HR, and finance. Run your business operations faster with SalesView.",
    keywords: isId
      ? [
          "erp indonesia",
          "software crm",
          "hris indonesia",
          "aplikasi kasir pos",
          "software akuntansi",
          "salesview",
        ]
      : [
          "erp software",
          "crm software",
          "hris platform",
          "point of sale software",
          "accounting software",
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
        "logo": "https://salesview.id/logo.png",
        "description": "Provider of SalesView: All-in-One Enterprise Platform ERP, CRM, HRIS, POS, and Finance.",
        "sameAs": [
          "https://www.linkedin.com/company/gilabs"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://salesview.id/#product",
        "name": "SalesView - ERP, CRM, HRIS, POS & Finance",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Windows, macOS, Linux",
        "url": "https://salesview.id",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "0",
          "offerCount": "3"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "154",
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": [
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Budi Santoso" },
            "datePublished": "2025-02-10",
            "reviewBody": "SalesView sangat membantu tim sales kami. Laporan penjualan real-time dan integrasi stok membuat operasional jauh lebih efisien.",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "1"
            }
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Sari Dewi" },
            "datePublished": "2025-03-15",
            "reviewBody": "Platform ERP terlengkap yang pernah kami pakai. Modul HRD, Finance, dan CRM terintegrasi sempurna. Tim support responsif.",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "1"
            }
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Ahmad Fauzi" },
            "datePublished": "2025-04-01",
            "reviewBody": "Sistem kasir POS-nya cepat dan stabil. Sinkronisasi stok otomatis sangat membantu bisnis retail multi-cabang kami.",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "1"
            }
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://salesview.id/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Apa itu SalesView?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "SalesView adalah platform bisnis all-in-one yang mencakup ERP, CRM, HRIS, POS, dan Finance. Dirancang untuk bisnis Indonesia yang ingin mengelola penjualan, stok, SDM, dan keuangan dalam satu sistem terintegrasi."
            }
          },
          {
            "@type": "Question",
            "name": "Apakah SalesView cocok untuk bisnis kecil dan menengah?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ya, SalesView tersedia dalam beberapa paket harga mulai dari gratis hingga enterprise, sehingga cocok untuk UMKM maupun perusahaan skala besar di Indonesia."
            }
          },
          {
            "@type": "Question",
            "name": "Apakah SalesView memiliki fitur Point of Sale (POS) atau kasir?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ya, SalesView memiliki sistem kasir POS lengkap yang mendukung multi-cabang, inventory real-time, loyalty pelanggan, dan integrasi pembayaran. Cocok untuk retail, kafe, restoran, dan F&B."
            }
          },
          {
            "@type": "Question",
            "name": "Bagaimana cara mulai menggunakan SalesView?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Anda dapat mendaftar gratis di salesview.id dan langsung menggunakan seluruh fitur. Tidak perlu kartu kredit untuk memulai."
            }
          }
        ]
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
      <LandingHeader />
      {children}
    </>
  );
}
