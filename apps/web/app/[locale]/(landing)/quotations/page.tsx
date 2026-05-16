import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/quotations",
    title: locale === "id" ? "Software Quotation & Penawaran Harga B2B | SalesView" : "B2B Quotation Software | SalesView",
    description:
      locale === "id"
        ? "Buat quotation profesional, kelola versi penawaran, dan percepat approval pelanggan sebelum masuk sales order."
        : "Create professional quotations, manage proposal revisions, and speed up customer approval before sales orders.",
    keywords:
      locale === "id"
        ? ["software quotation", "penawaran harga b2b", "proposal harga", "approval penawaran", "salesview quotations"]
        : ["quotation software", "b2b proposal", "pricing proposal", "quotation approval", "salesview quotations"],
    imageAlt: "SalesView quotations overview",
  });
}

export default async function QuotationsLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/quotations#product`,
    name: "SalesView Quotations",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem pembuatan penawaran harga B2B." : "B2B quotation management system.",
    url: `https://salesview.id/${locale}/quotations`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Quotations"
        heroTitle={isId ? "Penawaran Harga yang" : "Quotations that"}
        heroAccent={isId ? "Meyakinkan." : "Win Confidence."}
        heroDescription={
          isId
            ? "Siapkan quotation profesional untuk mempercepat approval pelanggan dan proses closing."
            : "Prepare professional quotations to speed up customer approval and deal closing."
        }
        heroImageAlt={isId ? "Tampilan quotation SalesView" : "SalesView quotation interface"}
        heroImageKey="quotationsHero"
        introTitle={isId ? "Quotations siap kirim lebih cepat" : "Quotations ready to send faster"}
        introDescription={
          isId
            ? "Semua elemen penawaran disusun agar tim sales bergerak lebih efisien."
            : "Every quotation element is organized so sales teams can move more efficiently."
        }
        featureBlocks={[
          {
            title: isId ? "Buat quotation dengan cepat" : "Create quotations quickly",
            description: isId
              ? "Isi item, harga, dan ketentuan dalam form terstruktur agar penawaran siap dikirim lebih cepat."
              : "Fill in items, pricing, and terms in a structured form so proposals are ready to send faster.",
            screenshotKey: "quotationsForm",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Detail quotation lengkap" : "Complete quotation details",
            description: isId
              ? "Lihat seluruh informasi penawaran—item, harga, status, dan riwayat—dalam satu tampilan detail."
              : "View all proposal information—items, pricing, status, and history—in one detailed view.",
            screenshotKey: "quotationsDetail",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Konversi ke sales order" : "Convert to sales orders",
            description: isId
              ? "Lanjutkan ke proses order tanpa mengetik ulang detail penawaran."
              : "Move to order processing without retyping quotation details.",
            screenshotKey: "quotationsToSalesOrder",
            placeholder: "terminalFlow",
          },
        ]}
        finalTitle={isId ? "Penawaran yang mendorong closing" : "Quotations that push deals forward"}
        finalCtaLabel={isId ? "Mulai Buat Quotation" : "Start Creating Quotations"}
      />
    </>
  );
}
