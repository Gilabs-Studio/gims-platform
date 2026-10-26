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
        heroTitle={isId ? "Kelola Pesanan Penjualan," : "Manage Sales Orders,"}
        heroAccent={isId ? "Dari Penawaran Hingga Pengiriman" : "From Quotation to Delivery"}
        heroDescription={
          isId
            ? "Otomatiskan alur sales order, alokasi stok gudang, dan penerbitan surat jalan dalam satu sistem terpadu."
            : "Automate sales orders, warehouse stock allocation, and delivery notes in one unified system."
        }
        heroImageAlt={isId ? "Tampilan sales orders SalesView" : "SalesView sales orders interface"}
        heroImageKey="salesOrderHero"
        introTitle={isId ? "Percepat pemenuhan pesanan pelanggan tanpa kendala" : "Fulfill customer orders faster without bottlenecks"}
        introDescription={
          isId
            ? "Hubungkan tim sales, logistik gudang, dan finance agar setiap order diproses tepat waktu dan akurat."
            : "Connect sales, warehouse logistics, and finance so every order is delivered accurately and on time."
        }
        featureBlocks={[
          {
            title: isId ? "Order masuk terstruktur dan otomatis" : "Structured, automated order intake",
            description: isId
              ? "Konversi penawaran yang disetujui langsung menjadi sales order lengkap dengan syarat pembayaran dan diskon."
              : "Convert approved quotations directly into sales orders with payment terms and discounts intact.",
            screenshotKey: "salesOrderEntryFlow",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Alokasi stok dan koordinasi gudang" : "Stock allocation and warehouse dispatch",
            description: isId
              ? "Sistem otomatis mengunci kuantitas stok yang dipesan agar tidak terjadi overselling antar cabang."
              : "Automated stock reserving prevents overselling across different branches or sales channels.",
            screenshotKey: "salesOrderFulfillment",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Pemantauan status pengiriman real-time" : "Real-time delivery fulfillment tracking",
            description: isId
              ? "Pantau status pesanan mulai dari packing, pengiriman ekspedisi, hingga barang diterima pelanggan."
              : "Track order milestones from packing and courier dispatch to final customer receipt.",
            screenshotKey: "salesOrderBillingCollection",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Tingkatkan efisiensi penjualan dan distribusi Anda" : "Scale your sales and distribution efficiency today"}
        finalPoints={[
          {
            title: isId ? "Bebas selisih data" : "Zero data discrepancies",
            description: isId
              ? "Data harga, kuantitas, dan diskon konsisten dari penawaran sampai faktur tagihan."
              : "Consistent prices, quantities, and terms from quotation straight through to final invoice.",
          },
          {
            title: isId ? "Otomatisasi pengiriman" : "Automated fulfillment",
            description: isId
              ? "Cetak surat jalan dan instruksi picking gudang seketika setelah pesanan disetujui."
              : "Generate picking lists and delivery notes immediately once orders are approved.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
