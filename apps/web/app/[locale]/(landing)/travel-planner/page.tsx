import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/travel-planner",
    title:
      locale === "id"
        ? "Travel Planner: Itinerary Multi-hari, Peta Interaktif & Expense | SalesView"
        : "Travel Planner: Multi-day Itinerary, Interactive Map & Expenses | SalesView",
    description:
      locale === "id"
        ? "Rencanakan perjalanan dinas multi-hari dengan itinerary per hari, peta interaktif dengan stop dan optimasi rute, catat expense (transport, accommodation, meal, fuel), dan link ke visit report dalam satu workspace kolaboratif."
        : "Plan multi-day business trips with daily itineraries, interactive maps with stops and route optimization, record expenses (transport, accommodation, meal, fuel), and link to visit reports in one collaborative workspace.",
    keywords:
      locale === "id"
        ? [
            "aplikasi pengajuan dinas perjalanan hrd",
            "software travel planner dinas kantor",
            "sistem reimbursement biaya dinas karyawan",
            "aplikasi manajemen perjalanan dinas",
            "salesview travel planner",
          ]
        : [
            "corporate travel management software cloud",
            "business trip request approval system",
            "travel expense reimbursement tracker",
            "salesview travel planner",
          ],
    imageAlt: "SalesView travel planner collaborative workspace overview",
  });
}

export default async function TravelPlannerLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/travel-planner#product`,
    name: "SalesView Travel Planner",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Travel planner kolaboratif dengan itinerary multi-hari, peta interaktif, dan pencatatan expense perjalanan dinas."
      : "Collaborative travel planner with multi-day itinerary, interactive maps, and business trip expense tracking.",
    url: `https://salesview.id/${locale}/travel-planner`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Travel Planner"
        heroTitle={isId ? "Perjalanan Dinas &" : "Business Travel &"}
        heroAccent={isId ? "Manajemen Biaya Operasional Lapangan" : "Field Expense Management"}
        heroDescription={
          isId
            ? "Susun rencana kunjungan multi-hari, petakan rute efisien, dan klaim biaya perjalanan dinas secara transparan."
            : "Structure multi-day itineraries, optimize travel routes, and submit verified travel expense claims transparently."
        }
        heroImageAlt={isId ? "Tampilan travel planner SalesView" : "SalesView travel planner interface"}
        heroImageKey="travelHero"
        introTitle={isId ? "Kelola mobilitas tim dinas luar dengan efisien" : "Coordinate field missions and client visits effectively"}
        introDescription={
          isId
            ? "Satukan jadwal kunjungan klien, navigasi rute terpendek, dan pelaporan bukti pengeluaran dalam satu aplikasi."
            : "Consolidate customer meeting agendas, route optimizations, and expense receipts in one unified application."
        }
        featureBlocks={[
          {
            title: isId ? "Itinerary perjalanan multi-hari terstruktur" : "Structured multi-day trip itineraries",
            description: isId
              ? "Atur jadwal keberangkatan, titik singgah pertemuan klien, waktu istirahat, dan catatan penting per hari secara berurutan."
              : "Organize travel departures, client checkpoints, rest stops, and daily notes chronologically.",
            descriptionSecondary: isId
              ? "Status perjalanan mengalir dari rancangan, sedang aktif berjalan, hingga selesai terlapor."
              : "Trip plans track seamlessly from draft stage, active transit, to completed field execution.",
            screenshotKey: "travelItinerary",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Peta interaktif dengan optimasi rute cerdas" : "Interactive map and automated route optimization",
            description: isId
              ? "Visualisasikan semua titik kunjungan pada peta navigasi dan dapatkan urutan kunjungan yang paling hemat bahan bakar dan waktu."
              : "Visualize destination stops on interactive maps and generate optimized travel sequences to save time and fuel.",
            screenshotKey: "travelMap",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Pencatatan pengeluaran dan laporan kunjungan" : "Expense logging and visit report integration",
            description: isId
              ? "Catat pengeluaran tiket, hotel, konsumsi, bensin, dan tol lengkap dengan unggahan foto kuitansi untuk reimbursement instan."
              : "Log airfare, hotels, meals, fuel, and toll receipts with photo attachments for expedited finance reimbursements.",
            screenshotKey: "travelExpense",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Jadikan perjalanan dinas tim lebih terencana dan hemat biaya" : "Make corporate business travel organized and accountable"}
        finalPoints={[
          {
            title: isId ? "Efisiensi rute perjalanan" : "Route cost optimization",
            description: isId
              ? "Sistem memilih rute logis untuk menghemat jam perjalanan tim."
              : "Smart sequencing saves driving hours and travel expenditures.",
          },
          {
            title: isId ? "Transparansi klaim biaya" : "Clean expense transparency",
            description: isId
              ? "Semua nota kuitansi terdokumentasi dan siap diaudit bagian keuangan."
              : "All digital receipts are archived and ready for finance audits.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
