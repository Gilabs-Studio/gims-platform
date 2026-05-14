import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/accounting",
    title: locale === "id" ? "Software Accounting Jurnal & Buku Besar | SalesView" : "Accounting Software for Ledger & Journals | SalesView",
    description:
      locale === "id"
        ? "Kelola jurnal otomatis, chart of accounts, dan buku besar terintegrasi sebagai fondasi proses closing finance yang lebih cepat, akurat, dan siap audit."
        : "Manage automated journals, chart of accounts, and integrated ledgers as the foundation of a faster, more accurate, and audit-ready finance closing process.",
    keywords:
      locale === "id"
        ? ["software accounting", "jurnal otomatis", "buku besar", "chart of accounts", "salesview accounting"]
        : ["accounting software", "automated journal", "general ledger", "chart of accounts", "salesview accounting"],
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
        heroTitle={isId ? "Accounting yang" : "Accounting that"}
        heroAccent={isId ? "Terkoneksi." : "Stays Connected."}
        heroDescription={
          isId
            ? "Satukan jurnal, buku besar, dan posting transaksi dari modul lain dalam satu alur yang konsisten."
            : "Unify journal entries, ledgers, and cross-module transaction posting in one consistent flow."
        }
        heroImageAlt={isId ? "Tampilan accounting SalesView" : "SalesView accounting interface"}
        heroImageKey="profitLoss"
        introTitle={isId ? "Bangun fondasi keuangan yang rapi" : "Build a cleaner financial foundation"}
        introDescription={
          isId
            ? "Accounting dirancang untuk operasional harian, bukan hanya laporan akhir bulan."
            : "Accounting is designed for daily execution, not just month-end reporting."
        }
        featureBlocks={[
          {
            title: isId ? "Jurnal otomatis dari transaksi" : "Automatic journals from transactions",
            description: isId
              ? "Transaksi dari sales, purchase, dan inventory langsung membentuk jurnal sesuai alur bisnis."
              : "Transactions from sales, purchasing, and inventory generate journals directly from your operational flow.",
            screenshotKey: "profitLoss",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Buku besar lebih mudah ditelusuri" : "A more traceable general ledger",
            description: isId
              ? "Pantau mutasi akun dengan struktur yang jelas untuk mendukung audit dan analisis internal."
              : "Track account movements with a clearer structure to support audit and internal analysis.",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Closing period lebih cepat" : "Faster period closing",
            description: isId
              ? "Siapkan data closing lebih cepat karena fondasi transaksi sudah rapi sejak awal."
              : "Prepare closing data faster because transaction foundations stay clean from the start.",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Accounting siap dipakai lintas tim" : "Accounting ready for cross-team execution"}
        finalPoints={[
          {
            title: isId ? "Kontrol data" : "Data control",
            description: isId
              ? "Jaga konsistensi transaksi dari hulu ke hilir."
              : "Keep transaction consistency from source to report.",
          },
          {
            title: isId ? "Akses cepat" : "Fast access",
            description: isId
              ? "Laporan inti bisa dipantau kapan saja."
              : "Key reports remain accessible anytime.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Accounting" : "Start Accounting"}
      />
    </>
  );
}
