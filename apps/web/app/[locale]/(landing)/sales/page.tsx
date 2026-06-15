import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/sales",
    title: locale === "id" ? "Software Sales Order Distributor & B2B | SalesView" : "Sales Order Software for B2B Distributors | SalesView",
    description:
      locale === "id"
        ? "Kelola sales order distributor dari quotation, approval, alokasi stok, sampai pengiriman agar proses order-to-delivery tetap rapi untuk tim sales dan operasional."
        : "Manage distributor sales orders from quotation and approval through stock allocation and delivery so order-to-delivery stays structured across sales and operations teams.",
    keywords:
      locale === "id"
        ? [
            "software sales order distributor barang",
            "aplikasi order penjualan b2b multi gudang",
            "sistem order to delivery distributor indonesia",
            "sales order dan fulfillment untuk tim sales",
            "software erp distribusi penjualan",
            "salesview sales",
          ]
        : [
            "sales order software for distributors",
            "b2b order to delivery management system",
            "multi warehouse sales fulfillment software",
            "quotation to delivery workflow software",
            "salesview sales",
          ],
    imageAlt: "SalesView sales orders overview",
  });
}

export default async function SalesLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/sales#product`,
    name: "SalesView Sales Orders",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem sales order untuk operasional penjualan B2B."
      : "Sales order system for B2B sales operations.",
    url: `https://salesview.id/${locale}/sales`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Sales Orders"
        heroTitle={isId ? "Ubah Proses Order" : "Turn Your Order Flow"}
        heroAccent={isId ? "Menjadi Eksekusi Tanpa Hambatan" : "Into Seamless Execution"}
        heroDescription={
          isId
            ? "Otomatiskan perjalanan pesanan Anda dari persetujuan hingga pemenuhan, pastikan setiap pelanggan mendapatkan apa yang mereka harapkan tepat waktu."
            : "Automate your order journey from approval to fulfillment, ensuring every customer gets exactly what they expect on time."
        }
        heroImageAlt={isId ? "Tampilan sales orders SalesView" : "SalesView sales orders interface"}
        heroImageKey="salesOrderHero"
        introTitle={isId ? "Percepat pengiriman pesanan Anda ke pelanggan" : "Accelerate your order delivery to customers"}
        introDescription={
          isId
            ? "Hilangkan miskomunikasi antar tim. Sinkronkan proses penjualan dan operasi Anda agar pesanan mengalir lancar."
            : "Eliminate cross-team miscommunication. Sync your sales and operations processes so orders flow smoothly."
        }
        featureBlocks={[
          {
            title: isId ? "Order masuk lebih terstruktur" : "Structured order intake",
            description: isId
              ? "Catat pesanan dengan format yang konsisten untuk mengurangi kesalahan proses."
              : "Capture orders in a consistent format to reduce execution errors.",
            screenshotKey: "salesOrderEntryFlow",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Koordinasi lintas tim" : "Cross-team coordination",
            description: isId
              ? "Hubungkan proses sales dengan tim operasional agar eksekusi order lebih mulus."
              : "Connect sales flow with operations teams for smoother order fulfillment.",
            screenshotKey: "salesOrderFulfillment",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Visibilitas performa penjualan" : "Sales performance visibility",
            description: isId
              ? "Pantau progres order dan performa tim dari satu tampilan terpusat."
              : "Track order progress and team performance from one centralized view.",
            screenshotKey: "salesOrderBillingCollection",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Skalakan proses pemenuhan pesanan Anda hari ini" : "Scale your order fulfillment process today"}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis Anda" : "Start My Free Trial"}
      />
    </>
  );
}
