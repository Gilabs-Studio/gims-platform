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
        ? [
            "aplikasi buat surat penawaran harga online",
            "software quotation sales proposal",
            "sistem persetujuan quotation customer",
            "aplikasi kalkulasi harga penawaran proyek",
            "salesview quotations",
          ]
        : [
            "online business quotation creator software",
            "sales proposal generator tool cloud",
            "quotation approval workflow platform",
            "salesview quotations",
          ],
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
        heroTitle={isId ? "Penawaran Harga &" : "Sales Quotations &"}
        heroAccent={isId ? "Estimasi Biaya Prospek B2B" : "B2B Proposal Estimator"}
        heroDescription={
          isId
            ? "Buat surat penawaran harga resmi, kelola revisi margin keuntungan, dan konversi ke sales order dalam satu klik."
            : "Draft formal pricing proposals, manage profit margins across revisions, and convert won deals into sales orders in one click."
        }
        heroImageAlt={isId ? "Tampilan quotation SalesView" : "SalesView quotation interface"}
        heroImageKey="quotationsHero"
        introTitle={isId ? "Kirim penawaran resmi lebih cepat dan profesional" : "Send polished pricing proposals faster to clients"}
        introDescription={
          isId
            ? "Tingkatkan rasio closing sales dengan template penawaran rapi, syarat termin pembayaran jelas, dan persetujuan bertingkat."
            : "Elevate deal closing ratios with structured proposal templates, explicit payment terms, and manager approvals."
        }
        featureBlocks={[
          {
            title: isId ? "Pembuatan surat penawaran instan" : "Instant proposal builder",
            description: isId
              ? "Pilih produk dari master katalog, terapkan diskon volume khusus, dan cetak penawaran berformat PDF siap kirim ke klien."
              : "Select catalog items, apply negotiated volume discounts, and generate client-ready PDF quotations instantly.",
            screenshotKey: "quotationsForm",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Riwayat revisi dan status penawaran" : "Proposal revision history and status tracking",
            description: isId
              ? "Pantau setiap perubahan harga, catatan negosiasi, dan status persetujuan draft, dikirim, disetujui, atau ditolak."
              : "Track every price adjustment, negotiation note, and milestone from draft, sent, accepted, to rejected.",
            screenshotKey: "quotationsDetail",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Konversi otomatis ke pesanan penjualan" : "Seamless conversion to sales orders",
            description: isId
              ? "Begitu klien menandatangani penawaran, alihkan status menjadi sales order aktif tanpa entri ulang data."
              : "Once client signs off, convert the quotation into an active sales order with zero duplicate data entry.",
            screenshotKey: "quotationsToSalesOrder",
            placeholder: "terminalFlow",
          },
        ]}
        finalTitle={isId ? "Percepat siklus penjualan bisnis Anda sekarang" : "Accelerate your B2B sales cycles today"}
        finalPoints={[
          {
            title: isId ? "Margin profit terlindungi" : "Protected profit margins",
            description: isId
              ? "Batas diskon maksimum mencegah sales memberikan harga di bawah batas aman."
              : "Discount caps prevent sales reps from quoting below approved minimum margins.",
          },
          {
            title: isId ? "Riwayat negosiasi transparan" : "Transparent negotiation trail",
            description: isId
              ? "Semua revisi harga terdokumentasi rapi untuk evaluasi tim komersial."
              : "Every quotation revision is archived cleanly for commercial team reviews.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
