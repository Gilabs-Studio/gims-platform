import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/purchase",
    title:
      locale === "id"
        ? "Software Procurement Purchase Order & Hutang Supplier | SalesView"
        : "Procurement Software: Purchase Orders & Supplier Payables | SalesView",
    description:
      locale === "id"
        ? "Kelola permintaan pembelian, purchase order, penerimaan barang, faktur supplier, hingga rekapan hutang dalam satu alur procurement yang tersambung ke inventory dan finance."
        : "Manage purchase requisitions, purchase orders, goods receipt, supplier invoices, and payable recap in one procurement flow connected to inventory and finance.",
    keywords:
      locale === "id"
        ? [
            "aplikasi procurement purchasing order perusahaan",
            "software pembelian barang ke supplier",
            "sistem persetujuan purchase request online",
            "aplikasi manajemen vendor supplier indonesia",
            "salesview purchase",
          ]
        : [
            "business procurement purchasing order software",
            "online purchase request approval system",
            "vendor performance tracking tool",
            "salesview purchase",
          ],
    imageAlt: "SalesView procurement purchase order overview",
  });
}

export default async function PurchaseLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/purchase#product`,
    name: isId ? "SalesView Purchase" : "SalesView Purchase",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Procurement terintegrasi untuk B2B: dari permintaan pembelian sampai kontrol hutang supplier."
      : "Integrated procurement for B2B: from purchase requests through supplier payable control.",
    url: `https://salesview.id/${locale}/purchase`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Purchase"
        heroTitle={isId ? "Pengadaan Barang &" : "Procurement &"}
        heroAccent={isId ? "Kontrol Pembelian Supplier" : "Supplier Purchasing Control"}
        heroDescription={
          isId
            ? "Kelola purchase order, penerimaan barang, dan hutang usaha dengan verifikasi kuantitas serta harga yang ketat."
            : "Manage purchase orders, goods receipt, and payables with strict price and quantity matching."
        }
        heroImageAlt={isId ? "Tampilan procurement SalesView" : "SalesView procurement interface"}
        heroImageKey="purchaseHero"
        introTitle={isId ? "Kendalikan pengadaan dan arus kas pembelian" : "Streamline business purchasing and cash flow"}
        introDescription={
          isId
            ? "Cegah pengeluaran tidak sah lewat alur persetujuan bertingkat dan pencocokan 3-way matching otomatis."
            : "Prevent unauthorized spend with multi-level approvals and automated 3-way invoice matching."
        }
        featureBlocks={[
          {
            title: isId ? "Dari purchase request ke PO resmi" : "From purchase request to official PO",
            description: isId
              ? "Ajukan kebutuhan barang dari unit operasional, dapatkan persetujuan manajer, dan terbitkan PO ke supplier secara instan."
              : "Submit item requisitions from operational units, secure manager approvals, and issue vendor POs instantly.",
            descriptionSecondary: isId
              ? "Lacak riwayat harga beli terbaik dari berbagai vendor terdaftar."
              : "Track historical vendor price points to negotiate better purchasing terms.",
            screenshotKey: "purchaseRequisitionToPO",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Penerimaan barang tersambung ke tagihan" : "Goods receipt synced with billing",
            description: isId
              ? "Catat barang yang tiba di gudang, sesuaikan dengan PO, dan sinkronkan ke pencatatan invoice vendor tanpa selisih."
              : "Log warehouse inbound arrivals against POs and bridge them directly to vendor bills without quantity discrepancies.",
            screenshotKey: "purchaseGRToInvoice",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Pantau jadwal jatuh tempo hutang usaha" : "Monitor accounts payable aging",
            description: isId
              ? "Kelompokkan hutang supplier berdasarkan jatuh tempo agar perencanaan pembayaran kas keluar selalu terprediksi."
              : "Group supplier balances by aging buckets to plan outflow cash disbursements predictably.",
            screenshotKey: "purchasePayableRecap",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Mulai kendalikan pengeluaran pengadaan bisnis Anda" : "Take full control of your procurement spending"}
        finalPoints={[
          {
            title: isId ? "Pencegahan kebocoran anggaran" : "Budget leak prevention",
            description: isId
              ? "Setiap pesanan barang harus melalui persetujuan anggaran sebelum PO dikirim ke pihak luar."
              : "Every requisition undergoes strict approval before POs can be sent to external vendors.",
          },
          {
            title: isId ? "Rekonsiliasi faktur otomatis" : "Automated invoice matching",
            description: isId
              ? "Pencocokan antara PO, surat jalan gudang, dan invoice tagihan supplier berjalan akurat."
              : "Accurate 3-way matching between purchase orders, delivery receipts, and supplier invoices.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
