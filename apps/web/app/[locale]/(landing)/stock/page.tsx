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
        ? "Pantau stok real-time lintas gudang, lacak batch kadaluarsa, catat pergerakan barang, dan jalankan stock opname dengan pencocokan variance — semua dalam satu sistem inventory yang tersambung ke purchase dan finance."
        : "Monitor real-time stock across warehouses, track expiry batches, record stock movements, and run stock opname with variance matching — all in one inventory system connected to purchase and finance.",
    keywords:
      locale === "id"
        ? [
            "software inventory",
            "stok gudang multi lokasi",
            "batch kadaluarsa",
            "stock opname",
            "pergerakan stok",
            "ledger stok",
            "inventory real-time",
            "salesview inventory",
          ]
        : [
            "inventory software",
            "multi-warehouse stock",
            "batch expiry tracking",
            "stock opname",
            "stock movement",
            "stock ledger",
            "real-time inventory",
            "salesview inventory",
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
        heroTitle={isId ? "Inventory yang" : "Inventory that"}
        heroAccent={isId ? "Lebih Presisi" : "Stays Precise"}
        heroDescription={
          isId
            ? "Kendalikan stok lintas gudang dengan visibilitas real-time, batch tracking, dan stock opname — semua tersambung dalam satu alur."
            : "Control stock across warehouses with real-time visibility, batch tracking, and stock opname — all connected in one flow."
        }
        heroImageAlt={isId ? "Tampilan inventory SalesView" : "SalesView inventory interface"}
        heroImageKey="stockInventoryList"
        introTitle={isId ? "Akurasi stok untuk operasional harian" : "Stock accuracy for daily operations"}
        introDescription={
          isId
            ? "Inventory dirancang untuk membantu tim gudang bergerak lebih cepat dan akurat — dari pemantauan stok sampai stock opname."
            : "Inventory is designed to help warehouse teams move faster with better accuracy — from stock monitoring through stock opname."
        }
        featureBlocks={[
          {
            title: isId ? "Stok real-time lintas gudang" : "Real-time stock across warehouses",
            description: isId
              ? "Pantau ketersediaan barang di setiap gudang dengan status ok, low stock, overstock, dan out of stock — tanpa rekap manual."
              : "Track item availability per warehouse with status badges — ok, low stock, overstock, out of stock — without manual recaps.",
            descriptionSecondary: isId
              ? "Filter berdasarkan gudang, kategori, atau status stok untuk fokus pada area yang perlu tindakan."
              : "Filter by warehouse, category, or stock status to focus on areas needing action.",
            screenshotKey: "stockInventoryList",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Lacak batch dan tanggal kadaluarsa" : "Track batches and expiry dates",
            description: isId
              ? "Lihat batch per produk — nomor batch, kuantitas, dan tanggal kadaluarsa — agar barang expired tidak terlewat."
              : "View batches per product — batch number, quantity, and expiry date — so expired goods never slip through.",
            screenshotKey: "stockInventoryBatch",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Stock opname dengan pencocokan variance" : "Stock opname with variance matching",
            description: isId
              ? "Jalankan stock opname terjadwal, bandingkan system quantity vs physical quantity, dan catat variance langsung — semua dalam satu alur audit."
              : "Run scheduled stock opname, compare system qty vs physical qty, and record variance directly — all in one auditable flow.",
            descriptionSecondary: isId
              ? "Hasil opname tersambung ke ledger stok untuk jejak mutasi yang lengkap."
              : "Opname results connect to stock ledger for a complete mutation trail.",
            screenshotKey: "stockOpnameVariance",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Inventory yang siap scale" : "Inventory operations ready to scale"}
        finalPoints={[
          {
            title: isId ? "Multi gudang" : "Multi warehouse",
            description: isId
              ? "Satu sistem untuk semua lokasi gudang."
              : "One system for all warehouse locations.",
          },
          {
            title: isId ? "Audit trail" : "Audit trail",
            description: isId
              ? "Setiap mutasi tercatat di ledger stok."
              : "Every mutation recorded in the stock ledger.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Inventory" : "Start Inventory"}
      />
    </>
  );
}
