import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/reconciliation",
    title: locale === "id" ? "Rekonsiliasi Bank & Transaksi | SalesView" : "Bank Transaction Reconciliation | SalesView",
    description:
      locale === "id"
        ? "Cocokkan mutasi bank dan transaksi internal lebih cepat untuk menemukan selisih, mempercepat proses closing, dan meningkatkan kontrol keuangan."
        : "Match bank movements and internal transactions faster to detect discrepancies, accelerate period closing, and improve financial control.",
    keywords:
      locale === "id"
        ? ["rekonsiliasi bank", "rekonsiliasi transaksi", "selisih transaksi", "closing period", "salesview reconciliation"]
        : ["bank reconciliation", "transaction reconciliation", "discrepancy detection", "period closing", "salesview reconciliation"],
    imageAlt: "SalesView reconciliation overview",
  });
}

export default async function ReconciliationLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/reconciliation#product`,
    name: "SalesView Reconciliation",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem rekonsiliasi transaksi bisnis." : "Business transaction reconciliation system.",
    url: `https://salesview.id/${locale}/reconciliation`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Reconciliation"
        heroTitle={isId ? "Rekonsiliasi yang" : "Reconciliation that"}
        heroAccent={isId ? "Lebih Terkontrol" : "Stays Controlled"}
        heroDescription={
          isId
            ? "Bandingkan mutasi dan transaksi internal dengan alur yang jelas untuk mempercepat closing."
            : "Compare bank movements and internal transactions through a clear flow to accelerate closing."
        }
        heroImageAlt={isId ? "Tampilan rekonsiliasi SalesView" : "SalesView reconciliation interface"}
        heroImageKey="reconciliationHero"
        introTitle={isId ? "Kurangi friksi saat closing" : "Reduce friction during closing"}
        introDescription={
          isId
            ? "Rekonsiliasi membantu tim finance memvalidasi data lebih cepat dan presisi."
            : "Reconciliation helps finance teams validate data faster and with better precision."
        }
        featureBlocks={[
          {
            title: isId ? "Pencocokan transaksi" : "Transaction matching",
            description: isId
              ? "Cocokkan data mutasi dan transaksi agar anomali cepat ditemukan."
              : "Match movement and transaction data so anomalies are found faster.",
            screenshotKey: "reconciliationTransactionMatching",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Penelusuran selisih" : "Variance tracing",
            description: isId
              ? "Telusuri selisih dengan tampilan yang membantu investigasi lebih terarah."
              : "Trace differences with views that make investigation more directed.",
            screenshotKey: "reconciliationVarianceTracing",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Closing lebih yakin" : "More confident closing",
            description: isId
              ? "Selesaikan period closing dengan data yang telah tervalidasi lintas transaksi."
              : "Finish period closing with data validated across transactions.",
            screenshotKey: "reconciliationClosingConfidence",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Closing period lebih terprediksi" : "More predictable period closing"}
        finalCtaLabel={isId ? "Mulai Rekonsiliasi" : "Start Reconciliation"}
      />
    </>
  );
}
