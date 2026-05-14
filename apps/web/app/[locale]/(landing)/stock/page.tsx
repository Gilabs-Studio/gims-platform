import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/stock",
    title: locale === "id" ? "Software Inventory untuk Kontrol Stok Gudang | SalesView" : "Inventory Software for Warehouse Stock Control | SalesView",
    description:
      locale === "id"
        ? "Pantau ketersediaan barang real-time, kontrol level stok, dan jaga akurasi gudang lintas lokasi serta cabang dengan lebih konsisten."
        : "Monitor item availability in real time, control stock levels, and maintain warehouse accuracy across locations.",
    keywords:
      locale === "id"
        ? ["software inventory", "kontrol stok", "manajemen gudang", "stok barang real-time", "salesview inventory"]
        : ["inventory software", "stock control", "warehouse inventory", "real-time stock", "salesview inventory"],
    imageAlt: "SalesView inventory overview",
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
    description: isId ? "Sistem inventory dan manajemen stok." : "Inventory and stock management system.",
    url: `https://salesview.id/${locale}/stock`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Inventory"
        heroTitle={isId ? "Inventory yang" : "Inventory that"}
        heroAccent={isId ? "Lebih Presisi." : "Stays Precise."}
        heroDescription={
          isId
            ? "Kendalikan stok dengan visibilitas real-time agar operasional gudang tetap stabil."
            : "Control stock with real-time visibility so warehouse operations remain stable."
        }
        heroImageAlt={isId ? "Tampilan inventory SalesView" : "SalesView inventory interface"}
        heroImageKey="stockInventory"
        introTitle={isId ? "Akurasi stok untuk operasional harian" : "Stock accuracy for daily operations"}
        introDescription={
          isId
            ? "Inventory dirancang untuk membantu tim gudang bergerak lebih cepat dan akurat."
            : "Inventory is designed to help warehouse teams move faster with better accuracy."
        }
        featureBlocks={[
          {
            title: isId ? "Pemantauan stok real-time" : "Real-time stock monitoring",
            description: isId
              ? "Pantau ketersediaan barang lintas lokasi tanpa rekap manual berulang."
              : "Track availability across locations without repetitive manual recaps.",
            screenshotKey: "stockInventory",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Kontrol stok masuk dan keluar" : "Inbound and outbound stock control",
            description: isId
              ? "Kelola alur barang agar proses gudang tetap sinkron dengan demand lapangan."
              : "Manage item flow so warehouse execution stays aligned with field demand.",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Visibilitas performa stok" : "Stock performance visibility",
            description: isId
              ? "Gunakan ringkasan performa untuk menentukan keputusan replenishment yang tepat."
              : "Use performance summaries to make more accurate replenishment decisions.",
            screenshotKey: "dashboard",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Inventory yang siap scale" : "Inventory operations ready to scale"}
        finalCtaLabel={isId ? "Mulai Inventory" : "Start Inventory"}
      />
    </>
  );
}
