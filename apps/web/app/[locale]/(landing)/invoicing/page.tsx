import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/invoicing",
    title: locale === "id" ? "Software Invoicing & Penagihan B2B | SalesView" : "B2B Invoicing & Billing Software | SalesView",
    description:
      locale === "id"
        ? "Kelola siklus invoice, status pembayaran, dan tindak lanjut penagihan agar arus kas bisnis lebih terjaga setiap periodenya."
        : "Manage invoice cycles, payment status, and collection follow-ups to keep business cash flow healthier.",
    keywords:
      locale === "id"
        ? [
            "aplikasi buat invoice tagihan otomatis",
            "software invoicing online perusahaan dagang",
            "sistem pengiriman invoice email whatsapp",
            "aplikasi pencatatan piutang customer",
            "salesview invoicing",
          ]
        : [
            "automated client invoicing software cloud",
            "online billing invoice generator business",
            "receivables tracking and invoice management",
            "salesview invoicing",
          ],
    imageAlt: "SalesView invoicing overview",
  });
}

export default async function InvoicingLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/invoicing#product`,
    name: "SalesView Invoicing",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem invoicing untuk pencatatan dan penagihan bisnis."
      : "Invoicing system for business billing and collections.",
    url: `https://salesview.id/${locale}/invoicing`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Invoicing"
        heroTitle={isId ? "Faktur Penjualan &" : "Sales Invoicing &"}
        heroAccent={isId ? "Manajemen Penagihan Piutang" : "Accounts Receivable Billing"}
        heroDescription={
          isId
            ? "Terbitkan faktur digital profesional, pantau jadwal jatuh tempo piutang, dan otomatiskan rekonsiliasi pembayaran pelanggan."
            : "Issue professional digital invoices, track receivable aging, and automate customer payment reconciliation."
        }
        heroImageAlt={isId ? "Tampilan invoicing SalesView" : "SalesView invoicing interface"}
        heroImageKey="invoicingHero"
        introTitle={isId ? "Percepat pelunasan piutang usaha dan jaga likuiditas kas" : "Accelerate receivable collections and protect cash liquidity"}
        introDescription={
          isId
            ? "Kelola siklus faktur dari penerbitan, pengiriman otomatis ke WhatsApp/Email, hingga verifikasi bukti transfer masuk."
            : "Manage invoice lifecycles from issuance, automatic WhatsApp/email delivery, to payment receipt verification."
        }
        featureBlocks={[
          {
            title: isId ? "Format faktur penjualan terstandarisasi" : "Standardized commercial invoicing",
            description: isId
              ? "Cetak faktur komersial dan faktur pajak lengkap dengan nomor seri, rincian diskon, termin jatuh tempo, dan kode QR pembayaran."
              : "Generate commercial tax invoices with sequential numbers, line discounts, payment terms, and dynamic payment QRs.",
            screenshotKey: "invoicingConsistentInvoice",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Monitoring status pembayaran dan aging piutang" : "Live payment status and receivables aging",
            description: isId
              ? "Pantau status faktur lunas, belum dibayar, atau lewat jatuh tempo dengan filter aging 30, 60, hingga 90 hari."
              : "Track paid, unpaid, and overdue invoices with dynamic aging filters across 30, 60, and 90 day windows.",
            screenshotKey: "invoicingPaymentStatus",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Pengingat penagihan terjadwal" : "Automated scheduled payment reminders",
            description: isId
              ? "Kirimkan notifikasi pengingat pembayaran ke kontak pelanggan sebelum dan sesudah tanggal jatuh tempo tanpa kesan menekan."
              : "Send friendly automated payment reminders to client contacts before and after invoice due dates.",
            screenshotKey: "invoicingFollowUp",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Tingkatkan ketepatan pembayaran faktur pelanggan Anda" : "Speed up customer invoice settlements today"}
        finalPoints={[
          {
            title: isId ? "Pembayaran multi kanal" : "Multi-channel settlement",
            description: isId
              ? "Dukung pembayaran lewat transfer bank, virtual account, dan QRIS."
              : "Accept settlements via bank transfers, virtual accounts, and QRIS.",
          },
          {
            title: isId ? "Rekonsiliasi instan" : "Instant reconciliation",
            description: isId
              ? "Pembayaran yang terkonfirmasi otomatis melunasi status faktur dan piutang."
              : "Confirmed payments immediately update invoice statuses and customer balances.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
