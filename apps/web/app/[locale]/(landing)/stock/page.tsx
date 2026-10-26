import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/stock",
    title:
      locale === "id"
        ? "Software Inventory Multi Gudang, Batch & Stock Opname | SalesView"
        : "Multi-Warehouse Inventory Software: Batch, Stock Opname & Ledger | SalesView",
    description:
      locale === "id"
        ? "Pantau stok real-time lintas gudang, lacak batch kadaluarsa, catat pergerakan barang, dan jalankan stock opname dengan pencocokan variance dalam satu sistem inventory terintegrasi."
        : "Monitor real-time stock across warehouses, track expiry batches, record stock movements, and run stock opname with variance matching in one integrated system.",
    keywords:
      locale === "id"
        ? [
            "software stok barang gudang terintegrasi",
            "aplikasi stock opname barang minimarket",
            "sistem kontrol persediaan barang bisnis",
            "aplikasi cek stok barang online",
            "salesview stock",
          ]
        : [
            "integrated inventory stock management software",
            "stock opname barcode scanner application",
            "real time inventory level tracking",
            "salesview stock",
          ],
    imageAlt: "SalesView multi-warehouse inventory overview",
  });
}

export default async function StockLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/stock#product`,
    name: "SalesView Inventory",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem inventory multi gudang dengan batch tracking, stock opname, dan ledger stok terintegrasi."
      : "Multi-warehouse inventory system with batch tracking, stock opname, and integrated stock ledger.",
    url: `https://salesview.id/${locale}/stock`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Inventory"
        heroTitle={isId ? "Manajemen Inventaris &" : "Inventory Management &"}
        heroAccent={isId ? "Multi-Gudang Terintegrasi" : "Integrated Multi-Warehouse"}
        heroDescription={
          isId
            ? "Pantau stok real-time lintas cabang, lacak batch kedaluwarsa, dan lakukan stock opname dengan presisi tinggi."
            : "Track real-time inventory across locations, manage expiry batches, and execute stock opname with high precision."
        }
        heroImageAlt={isId ? "Tampilan inventory SalesView" : "SalesView inventory interface"}
        heroImageKey="stockInventoryList"
        introTitle={isId ? "Akurasi persediaan stok di setiap lokasi gudang" : "Accurate inventory tracking across all warehouse locations"}
        introDescription={
          isId
            ? "Dapatkan visibilitas penuh terhadap perputaran barang masuk, mutasi antar cabang, dan sisa stok siap jual."
            : "Gain total visibility over inbound receipts, inter-branch transfers, and available-to-promise inventory levels."
        }
        featureBlocks={[
          {
            title: isId ? "Stok real-time lintas lokasi" : "Real-time multi-location inventory",
            description: isId
              ? "Pantau kuantitas barang di setiap gudang dengan indikator status stok aman, menipis, atau habis secara otomatis."
              : "Monitor item quantities across all warehouses with automated badges for healthy, low, or out-of-stock items.",
            descriptionSecondary: isId
              ? "Filter berdasarkan gudang, kategori produk, atau status stok untuk tindakan cepat pengadaan ulang."
              : "Filter by warehouse, product category, or status to trigger fast replenishment.",
            screenshotKey: "stockInventoryList",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Pelacakan nomor batch dan kedaluwarsa" : "Batch tracking and expiry date monitoring",
            description: isId
              ? "Lacak batch produksi, nomor lot, serta tanggal kadaluarsa untuk memastikan metode FIFO atau FEFO berjalan tepat."
              : "Track production batches, lot numbers, and expiry dates to maintain strict FIFO or FEFO dispatch protocols.",
            screenshotKey: "stockInventoryBatch",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Stock opname dengan rekonsiliasi varians" : "Stock opname with automated variance matching",
            description: isId
              ? "Bandingkan hitungan fisik lapangan dengan data sistem secara cepat untuk mencatat selisih dan penyesuaian nilai buku."
              : "Compare physical warehouse counts against system records quickly to document variances and book value adjustments.",
            descriptionSecondary: isId
              ? "Hasil opname langsung tersinkron ke buku besar mutasi persediaan."
              : "Opname adjustments post directly into inventory mutation ledgers.",
            screenshotKey: "stockOpnameVariance",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Tingkatkan ketepatan persediaan gudang Anda" : "Enhance your warehouse inventory precision"}
        finalPoints={[
          {
            title: isId ? "Visibilitas multi cabang" : "Multi-location visibility",
            description: isId
              ? "Kelola puluhan gudang dan outlet retail dari satu dashboard manajemen terpusat."
              : "Oversee dozens of warehouses and retail outlets from a single unified management dashboard.",
          },
          {
            title: isId ? "Audit mutasi lengkap" : "Complete mutation audit trail",
            description: isId
              ? "Setiap perpindahan, penjualan, dan penyesuaian barang memiliki riwayat waktu dan operator yang jelas."
              : "Every movement, sale, and stock adjustment logs exact timestamps and responsible users.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
