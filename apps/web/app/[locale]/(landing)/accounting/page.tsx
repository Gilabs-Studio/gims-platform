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
        heroTitle={isId ? "Ubah Pembukuan Rumit" : "Turn Complex Bookkeeping"}
        heroAccent={isId ? "Menjadi Kejelasan Finansial" : "Into Financial Clarity"}
        heroDescription={
          isId
            ? "Otomatiskan entri jurnal, buku besar, dan pelaporan sehingga Anda bisa fokus mengembangkan bisnis, bukan membereskan spreadsheet."
            : "Automate your journal entries, ledgers, and reporting so you can focus on growing your business instead of fighting spreadsheets."
        }
        heroImageAlt={isId ? "Tampilan accounting SalesView" : "SalesView accounting interface"}
        heroImageKey="accountingHero"
        introTitle={isId ? "Dapatkan kontrol penuh atas keuangan Anda" : "Take full control of your finances"}
        introDescription={
          isId
            ? "Sistem akuntansi kami dirancang agar Anda bisa mengambil keputusan bisnis harian yang lebih percaya diri dengan data real-time."
            : "Our accounting system is designed so you can make more confident daily business decisions with real-time data."
        }
        featureBlocks={[
          {
            title: isId ? "Jurnal otomatis dari transaksi" : "Automatic journals from transactions",
            description: isId
              ? "Transaksi dari sales, purchase, dan inventory langsung membentuk jurnal sesuai alur bisnis."
              : "Transactions from sales, purchasing, and inventory generate journals directly from your operational flow.",
            screenshotKey: "accountingAutoJournal",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Buku besar lebih mudah ditelusuri" : "A more traceable general ledger",
            description: isId
              ? "Pantau mutasi akun dengan struktur yang jelas untuk mendukung audit dan analisis internal."
              : "Track account movements with a clearer structure to support audit and internal analysis.",
            screenshotKey: "accountingGeneralLedger",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Closing period lebih cepat" : "Faster period closing",
            description: isId
              ? "Siapkan data closing lebih cepat karena fondasi transaksi sudah rapi sejak awal."
              : "Prepare closing data faster because transaction foundations stay clean from the start.",
            screenshotKey: "accountingPeriodClosing",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Akuntansi siap pakai untuk pertumbuhan Anda" : "Accounting ready for your growth"}
        finalPoints={[
          {
            title: isId ? "Kendali penuh atas data Anda" : "Full control over your data",
            description: isId
              ? "Jaga konsistensi setiap transaksi bisnis Anda dari awal hingga akhir."
              : "Maintain the consistency of every business transaction from start to finish.",
          },
          {
            title: isId ? "Akses data instan" : "Instant data access",
            description: isId
              ? "Dapatkan visibilitas langsung ke laporan inti yang paling Anda butuhkan."
              : "Get immediate visibility into the core reports you need most.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis Anda" : "Start My Free Trial"}
      />
    </>
  );
}
