import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/movements",
    title: locale === "id" ? "Pergerakan Stok (Movements) | SalesView" : "Stock Movements Tracking | SalesView",
    description:
      locale === "id"
        ? "Lacak perpindahan stok antar lokasi dengan histori yang jelas untuk kontrol gudang lebih baik dan pengambilan keputusan operasional."
        : "Track stock transfers across locations with clear history for better warehouse control and operational decision-making.",
    keywords:
      locale === "id"
        ? ["pergerakan stok", "stock movement", "transfer gudang", "inventory tracking", "salesview movements"]
        : ["stock movement", "inventory transfer", "warehouse movement", "inventory tracking", "salesview movements"],
    imageAlt: "SalesView stock movements overview",
  });
}

export default async function MovementsLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/movements#product`,
    name: "SalesView Movements",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem pelacakan pergerakan stok." : "Stock movement tracking system.",
    url: `https://salesview.id/${locale}/movements`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Movements"
        heroTitle={isId ? "Pergerakan Stok yang" : "Stock Movements that"}
        heroAccent={isId ? "Terdokumentasi." : "Stay Documented."}
        heroDescription={
          isId
            ? "Pantau transfer stok antar lokasi dengan histori yang mudah ditelusuri."
            : "Monitor stock transfers across locations with history that is easy to trace."
        }
        heroImageAlt={isId ? "Tampilan pergerakan stok SalesView" : "SalesView stock movements interface"}
        heroImageKey="stockInventory"
        introTitle={isId ? "Lacak barang lintas lokasi" : "Track inventory across locations"}
        introDescription={
          isId
            ? "Pergerakan stok tercatat rapi untuk membantu kontrol operasional harian."
            : "Stock movements are recorded clearly to support daily operational control."
        }
        featureBlocks={[
          {
            title: isId ? "Transfer antar gudang" : "Inter-warehouse transfers",
            description: isId
              ? "Kelola perpindahan stok agar distribusi barang lebih terencana."
              : "Manage stock transfer so item distribution remains planned.",
            placeholder: "warehouseFlow",
          },
          {
            title: isId ? "Histori movement lengkap" : "Complete movement history",
            description: isId
              ? "Simpan jejak perpindahan untuk memudahkan investigasi saat ada selisih."
              : "Store transfer logs to simplify investigation when discrepancies appear.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Kontrol stok lintas outlet" : "Cross-outlet stock control",
            description: isId
              ? "Pastikan setiap lokasi memiliki visibilitas terhadap stok yang bergerak."
              : "Ensure each location has visibility into moving stock.",
            screenshotKey: "dashboard",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Perpindahan barang lebih mudah dipantau" : "Item transfers become easier to monitor"}
        finalCtaLabel={isId ? "Mulai Tracking Movement" : "Start Tracking Movements"}
      />
    </>
  );
}
