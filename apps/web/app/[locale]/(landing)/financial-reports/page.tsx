import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/financial-reports",
    title: locale === "id" ? "Laporan Keuangan Real-time | SalesView" : "Real-time Financial Reports | SalesView",
    description:
      locale === "id"
        ? "Pantau laporan laba rugi, neraca, dan arus kas dengan data terkini untuk pengambilan keputusan manajemen yang lebih cepat dan berbasis data."
        : "Monitor profit and loss, balance sheet, and cash flow reports with up-to-date data for faster, data-driven management decisions.",
    keywords:
      locale === "id"
        ? ["laporan keuangan", "laba rugi", "neraca", "arus kas", "salesview reports"]
        : ["financial reports", "profit and loss", "balance sheet", "cash flow", "salesview reports"],
    imageAlt: "SalesView financial reports overview",
  });
}

export default async function FinancialReportsLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/financial-reports#product`,
    name: "SalesView Financial Reports",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Laporan keuangan real-time untuk bisnis." : "Real-time financial reports for business.",
    url: `https://salesview.id/${locale}/financial-reports`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Financial Reports"
        heroTitle={isId ? "Laporan Keuangan yang" : "Financial Reports that"}
        heroAccent={isId ? "Lebih Cepat." : "Move Faster."}
        heroDescription={
          isId
            ? "Pantau performa keuangan tanpa menunggu kompilasi manual yang memakan waktu."
            : "Monitor financial performance without waiting for time-consuming manual compilation."
        }
        heroImageAlt={isId ? "Tampilan laporan keuangan SalesView" : "SalesView financial reports interface"}
        heroImageKey="financialReportsHero"
        introTitle={isId ? "Dari data operasional ke insight" : "From operational data to insight"}
        introDescription={
          isId
            ? "Laporan dirancang agar mudah dipahami oleh tim finance maupun manajemen."
            : "Reports are designed to be readable by finance teams and management alike."
        }
        featureBlocks={[
          {
            title: isId ? "Ringkasan performa keuangan" : "Financial performance summary",
            description: isId
              ? "Lihat ringkasan metrik utama agar keputusan strategis lebih cepat diambil."
              : "View key metric summaries to speed up strategic decisions.",
            screenshotKey: "financialReportsSummary",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Laporan laba rugi" : "Profit and loss reporting",
            description: isId
              ? "Pantau tren laba rugi dengan data yang konsisten dari operasional harian."
              : "Track P&L trends using data that stays consistent from daily operations.",
            screenshotKey: "financialReportsProfitLoss",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Data siap evaluasi" : "Data ready for review",
            description: isId
              ? "Gunakan laporan untuk review bulanan tanpa menyiapkan ulang data dari nol."
              : "Use reports for monthly reviews without rebuilding data from scratch.",
            screenshotKey: "financialReportsReview",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Laporan yang membantu aksi" : "Reports that drive action"}
        finalCtaLabel={isId ? "Lihat Laporan Keuangan" : "See Financial Reports"}
      />
    </>
  );
}
