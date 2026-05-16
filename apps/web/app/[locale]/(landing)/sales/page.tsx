import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/sales",
    title: locale === "id" ? "Software Sales Order B2B | SalesView" : "B2B Sales Order Software | SalesView",
    description:
      locale === "id"
        ? "Kelola sales order dari konversi quotation hingga pemenuhan order agar proses eksekusi penjualan berjalan konsisten di setiap tim."
        : "Manage sales orders from quotation conversion to fulfillment so sales execution stays consistent across teams.",
    keywords:
      locale === "id"
        ? ["software sales order", "eksekusi penjualan", "order fulfillment", "penjualan b2b", "salesview sales"]
        : ["sales order software", "sales execution", "order fulfillment", "b2b sales process", "salesview sales"],
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
        heroTitle={isId ? "Sales Orders yang" : "Sales Orders that"}
        heroAccent={isId ? "Siap Eksekusi." : "Are Execution-Ready."}
        heroDescription={
          isId
            ? "Ubah proses penjualan menjadi lebih terstruktur dari pencatatan order sampai koordinasi tim."
            : "Make sales execution more structured from order capture to team coordination."
        }
        heroImageAlt={isId ? "Tampilan sales orders SalesView" : "SalesView sales orders interface"}
        heroImageKey="salesOrderHero"
        introTitle={isId ? "Penjualan bergerak lebih cepat" : "Move sales execution faster"}
        introDescription={
          isId
            ? "Sales orders membantu tim menjaga ritme closing dan operasional tetap sinkron."
            : "Sales orders help teams keep closing cadence and operations in sync."
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
        finalTitle={isId ? "Sales orders yang siap scale" : "Sales orders ready to scale"}
        finalCtaLabel={isId ? "Mulai Sales Orders" : "Start Sales Orders"}
      />
    </>
  );
}
