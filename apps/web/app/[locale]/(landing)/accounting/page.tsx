import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/accounting",
    title: locale === "id" ? "Software Accounting Closing, Jurnal & Buku Besar | SalesView" : "Accounting Software for Closing, Journals & Ledger | SalesView",
    description:
      locale === "id"
        ? "Kelola jurnal otomatis, chart of accounts, buku besar, dan closing finance terintegrasi agar tim accounting lebih cepat tutup buku, telusur transaksi, dan siap audit."
        : "Manage automated journals, chart of accounts, ledgers, and finance closing in one flow so accounting teams can close faster, trace transactions, and stay audit-ready.",
    keywords:
      locale === "id"
        ? [
            "software closing buku bulanan perusahaan",
            "aplikasi jurnal otomatis dari transaksi erp",
            "sistem buku besar dan coa audit ready",
            "software akuntansi distributor retail",
            "finance closing terintegrasi inventory sales purchase",
            "salesview accounting",
          ]
        : [
            "accounting software for monthly closing",
            "automated journal entry from erp transactions",
            "general ledger and chart of accounts software",
            "audit ready accounting system for operations teams",
            "salesview accounting",
          ],
    imageAlt: "SalesView accounting overview",
  });
}

export default async function AccountingLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/accounting#product`,
    name: isId ? "SalesView Accounting" : "SalesView Accounting",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Accounting terintegrasi untuk operasional bisnis harian."
      : "Integrated accounting for daily business operations.",
    url: `https://salesview.id/${locale}/accounting`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Accounting"
        heroTitle={isId ? "Sistem Akuntansi &" : "Cloud Accounting &"}
        heroAccent={isId ? "Jurnal Otomatis Tutup Buku" : "Automated Journal Closing"}
        heroDescription={
          isId
            ? "Otomatiskan pencatatan jurnal umum, buku besar, dan neraca saldo langsung dari transaksi operasional POS dan ERP."
            : "Automate general journals, ledgers, and trial balances straight from live POS and ERP operational transactions."
        }
        heroImageAlt={isId ? "Tampilan accounting SalesView" : "SalesView accounting interface"}
        heroImageKey="accountingHero"
        introTitle={isId ? "Tutup buku bulanan lebih cepat tanpa selisih akun" : "Close monthly books faster without account discrepancies"}
        introDescription={
          isId
            ? "Setiap penjualan, pembelian barang, dan biaya operasional langsung menjurnal otomatis sesuai bagan akun (COA) perusahaan."
            : "Every sales receipt, supplier purchase, and operational expense posts automated journal entries to your chart of accounts."
        }
        featureBlocks={[
          {
            title: isId ? "Jurnal otomatis dari seluruh transaksi" : "Automated journals from all transactions",
            description: isId
              ? "Hilangkan penjurnalan manual. Transaksi kasir, invoice penjualan, dan tagihan supplier otomatis membentuk debit dan kredit seimbang."
              : "Eliminate manual bookkeeping. POS sales, customer invoices, and vendor bills generate balanced debit-credit journal lines.",
            screenshotKey: "accountingAutoJournal",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Buku besar interaktif dan audit trail" : "Interactive general ledger and audit trail",
            description: isId
              ? "Telusuri saldo per akun hingga ke dokumen transaksi awal dengan klik drill-down pada setiap baris mutasi buku besar."
              : "Drill down into any account balance to inspect the original source invoice or payment receipt with a single click.",
            screenshotKey: "accountingGeneralLedger",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Closing periode finansial terstruktur" : "Structured period financial closing",
            description: isId
              ? "Kunci periode akuntansi bulanan dan tahunan untuk mencegah perubahan data historis setelah laporan keuangan disahkan."
              : "Lock monthly and yearly accounting periods to safeguard historical records once financial statements are finalized.",
            screenshotKey: "accountingPeriodClosing",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Rapikan pembukuan dan perpajakan bisnis Anda sekarang" : "Streamline your business bookkeeping and tax readiness"}
        finalPoints={[
          {
            title: isId ? "Kepatuhan audit standar" : "Compliance audit standard",
            description: isId
              ? "Bagan akun COA terstruktur sesuai standar PSAK dan perpajakan Indonesia."
              : "Standardized chart of accounts structured for local compliance and reporting.",
          },
          {
            title: isId ? "Laporan keuangan real-time" : "Real-time financial visibility",
            description: isId
              ? "Laba rugi dan posisi neraca terupdate otomatis setiap kali ada transaksi."
              : "Profit and loss and balance sheets update dynamically with every posted entry.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
