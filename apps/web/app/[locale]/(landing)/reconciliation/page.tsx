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
        ? [
            "software rekonsiliasi bank otomatis online",
            "aplikasi pencocokan mutasi bank kasir",
            "sistem rekonsiliasi transaksi keuangan bisnis",
            "aplikasi import rekening koran bank",
            "salesview reconciliation",
          ]
        : [
            "automated bank reconciliation software cloud",
            "bank statement matching tool accounting",
            "cash ledger bank reconciliation system",
            "salesview reconciliation",
          ],
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
        heroTitle={isId ? "Rekonsiliasi Bank &" : "Bank Reconciliation &"}
        heroAccent={isId ? "Pencocokan Mutasi Rekening Koran" : "Automated Statement Matching"}
        heroDescription={
          isId
            ? "Cocokkan mutasi rekening koran dengan buku kas internal secara otomatis untuk mendeteksi selisih tanpa cek manual baris per baris."
            : "Match bank statement records with internal cash books automatically to detect variances without line-by-line manual checks."
        }
        heroImageAlt={isId ? "Tampilan rekonsiliasi SalesView" : "SalesView reconciliation interface"}
        heroImageKey="reconciliationHero"
        introTitle={isId ? "Kunci saldo kas dan bank dengan pencocokan cerdas" : "Lock in cash and bank balances with smart matching"}
        introDescription={
          isId
            ? "Hilangkan perbedaan saldo buku dan saldo bank lewat algoritma pencocokan nomor referensi, nominal, dan tanggal transaksi."
            : "Eliminate discrepancies between book and bank balances using smart matching algorithms on reference IDs, amounts, and dates."
        }
        featureBlocks={[
          {
            title: isId ? "Impor rekening koran dan pencocokan otomatis" : "Bank statement import and auto-matching",
            description: isId
              ? "Unggah mutasi bank format CSV/Excel atau hubungkan bank feed untuk mencocokkan ribuan transaksi masuk dan keluar dalam hitungan detik."
              : "Upload CSV/Excel bank statements or connect feeds to reconcile thousands of transactions in seconds.",
            screenshotKey: "reconciliationTransactionMatching",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Identifikasi selisih dan penyesuaian biaya bank" : "Variance identification and bank fee adjustments",
            description: isId
              ? "Temukan transaksi yang belum teridentifikasi seperti biaya administrasi bank atau bunga rekening, lalu catat penyesuaian langsung."
              : "Spot unrecorded bank fees or interest earnings immediately and create balancing adjustment entries on the fly.",
            screenshotKey: "reconciliationVarianceTracing",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Laporan rekonsiliasi bank siap audit" : "Audit-ready bank reconciliation reports",
            description: isId
              ? "Cetak lembar rekonsiliasi akhir bulan lengkap dengan daftar outstanding check dan deposit in transit untuk lampiran audit."
              : "Generate month-end reconciliation statements detailing outstanding checks and deposits in transit for audit binders.",
            screenshotKey: "reconciliationClosingConfidence",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Tutup pembukuan kas bank Anda dengan presisi" : "Reconcile your corporate banking with confidence"}
        finalPoints={[
          {
            title: isId ? "Pencocokan 99% otomatis" : "99% automated matching",
            description: isId
              ? "Aturan pencocokan otomatis menghemat waktu staf akuntansi setiap pagi."
              : "Smart rule matching saves finance staff hours of routine ledger checking.",
          },
          {
            title: isId ? "Deteksi anomali lebih awal" : "Early anomaly detection",
            description: isId
              ? "Cegah kebocoran dana dan transaksi mencurigakan sebelum closing bulanan."
              : "Catch payment leakages and unauthorized charges before monthly books close.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
