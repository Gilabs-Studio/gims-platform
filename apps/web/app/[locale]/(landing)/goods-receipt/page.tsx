import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/goods-receipt",
    title: locale === "id" ? "Penerimaan Barang (Goods Receipt) | SalesView" : "Goods Receipt Management | SalesView",
    description:
      locale === "id"
        ? "Catat penerimaan barang dengan alur terstruktur agar data stok masuk tetap akurat dan langsung siap diproses ke inventory."
        : "Record goods receipt with a structured workflow so inbound stock data stays accurate and ready for downstream inventory processing.",
    keywords:
      locale === "id"
        ? ["penerimaan barang", "goods receipt", "stok masuk", "supply chain", "salesview receipt"]
        : ["goods receipt", "inbound inventory", "warehouse receiving", "supply chain", "salesview receipt"],
    imageAlt: "SalesView goods receipt overview",
  });
}

export default async function GoodsReceiptLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/goods-receipt#product`,
    name: "SalesView Goods Receipt",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem penerimaan barang untuk gudang." : "Warehouse goods receipt system.",
    url: `https://salesview.id/${locale}/goods-receipt`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Goods Receipt"
        heroTitle={isId ? "Penerimaan Barang yang" : "Goods Receipt that"}
        heroAccent={isId ? "Lebih Akurat." : "Stays Accurate."}
        heroDescription={
          isId
            ? "Pastikan barang masuk tercatat jelas agar stok dan purchasing selalu sinkron."
            : "Ensure inbound goods are recorded clearly so inventory and purchasing stay synchronized."
        }
        heroImageAlt={isId ? "Tampilan penerimaan barang SalesView" : "SalesView goods receipt interface"}
        heroImageKey="stockInventory"
        introTitle={isId ? "Kurangi kesalahan stok masuk" : "Reduce inbound stock mistakes"}
        introDescription={
          isId
            ? "Goods receipt membantu tim gudang mencatat barang masuk dengan langkah yang konsisten."
            : "Goods receipt helps warehouse teams record inbound items with consistent steps."
        }
        featureBlocks={[
          {
            title: isId ? "Catat barang per dokumen" : "Record items by document",
            description: isId
              ? "Hubungkan penerimaan barang dengan dokumen pembelian agar jejak data lengkap."
              : "Connect receipt records with purchase documents for complete traceability.",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Validasi kuantitas masuk" : "Validate received quantities",
            description: isId
              ? "Pastikan kuantitas diterima sesuai sehingga update stok lebih presisi."
              : "Ensure received quantities match expectations so stock updates remain precise.",
            screenshotKey: "stockInventory",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Sinkron ke inventory" : "Synced to inventory",
            description: isId
              ? "Data penerimaan langsung memperbarui inventory untuk operasional berikutnya."
              : "Receipt data updates inventory directly for downstream operations.",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Gudang bekerja dengan data yang lebih presisi" : "Warehouses operate with more precise data"}
        finalCtaLabel={isId ? "Mulai Goods Receipt" : "Start Goods Receipt"}
      />
    </>
  );
}
