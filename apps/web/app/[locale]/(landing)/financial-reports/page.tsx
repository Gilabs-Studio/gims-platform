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
        ? [
            "software pembuat laporan keuangan otomatis",
            "aplikasi neraca saldo laba rugi bisnis",
            "sistem pelaporan keuangan terintegrasi audit",
            "aplikasi analisa cash flow perusahaan",
            "salesview financial reports",
          ]
        : [
            "automated balance sheet profit loss software",
            "real time financial reporting platform business",
            "cash flow analysis tracking software",
            "salesview financial reports",
          ],
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
        heroTitle={isId ? "Laporan Keuangan &" : "Financial Statements &"}
        heroAccent={isId ? "Analisis Kinerja Bisnis Eksekutif" : "Executive Business Analytics"}
        heroDescription={
          isId
            ? "Dapatkan laporan laba rugi, posisi neraca, dan arus kas secara real-time tanpa menunggu akhir bulan."
            : "Generate profit and loss, balance sheets, and cash flow reports in real time without waiting for month-end."
        }
        heroImageAlt={isId ? "Tampilan laporan keuangan SalesView" : "SalesView financial reports interface"}
        heroImageKey="financialReportsHero"
        introTitle={isId ? "Wawasan finansial akurat untuk keputusan strategis" : "Accurate financial insights for strategic leadership decisions"}
        introDescription={
          isId
            ? "Pantau profitabilitas cabang, margin kotor per lini produk, dan likuiditas kas operasional dari satu layar eksekutif."
            : "Track branch profitabilities, gross margins by product line, and operational liquidity from a single executive dashboard."
        }
        featureBlocks={[
          {
            title: isId ? "Laporan laba rugi multi-cabang instan" : "Instant multi-branch profit and loss",
            description: isId
              ? "Lihat pendapatan kotor, beban pokok penjualan (HPP), dan biaya operasional per entitas bisnis atau per outlet."
              : "Inspect gross revenues, cost of goods sold (COGS), and operational expenses broken down by branch or legal entity.",
            screenshotKey: "financialReportsSummary",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Posisi neraca dan likuiditas kas berjalan" : "Balance sheet position and cash liquidity",
            description: isId
              ? "Ketahui posisi aset lancar, liabilitas jangka pendek, dan ekuitas modal kerja perusahaan kapan pun dibutuhkan."
              : "View current assets, short-term liabilities, and working capital equity whenever management decisions require.",
            screenshotKey: "financialReportsProfitLoss",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Ekspor format standar audit dan pajak" : "Standardized audit and tax export formats",
            description: isId
              ? "Unduh laporan keuangan berstandar akuntansi dalam format Excel atau PDF siap presentasi ke dewan direksi dan investor."
              : "Download GAAP-compliant statements in Excel or PDF formats ready for board meetings and investor presentations.",
            screenshotKey: "financialReportsReview",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Kendalikan kesehatan finansial bisnis Anda sekarang" : "Take command of your business financial health today"}
        finalPoints={[
          {
            title: isId ? "Data selalu real-time" : "Continuous real-time sync",
            description: isId
              ? "Setiap transaksi yang terjadi seketika merefleksikan angka laba rugi terkini."
              : "Posted transactions immediately reflect on live gross margin and net income tallies.",
          },
          {
            title: isId ? "Komparasi antar periode" : "Period-over-period comparisons",
            description: isId
              ? "Bandingkan pertumbuhan omzet bulan ini dengan bulan lalu atau tahun lalu."
              : "Benchmark month-on-month and year-on-year revenue growth seamlessly.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
