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
        ? "Rencanakan perjalanan dinas multi-hari dengan itinerary per hari, peta interaktif dengan stop dan optimasi rute, catat expense (transport, accommodation, meal, fuel), dan link ke visit report — semua dalam satu workspace kolaboratif."
        : "Plan multi-day business trips with daily itineraries, interactive maps with stops and route optimization, record expenses (transport, accommodation, meal, fuel), and link to visit reports — all in one collaborative workspace.",
    keywords:
      locale === "id"
        ? [
            "travel planner bisnis",
            "itinerary perjalanan dinas",
            "peta perjalanan interaktif",
            "expense perjalanan dinas",
            "optimasi rute",
            "visit report",
            "rencana perjalanan multi-hari",
            "salesview travel planner",
          ]
        : [
            "business travel planner",
            "trip itinerary",
            "interactive travel map",
            "travel expense tracking",
            "route optimization",
            "visit report",
            "multi-day travel plan",
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
        heroTitle={isId ? "Travel Planner yang" : "Travel Planning that"}
        heroAccent={isId ? "Lebih Terkontrol" : "Stays Organized"}
        heroDescription={
          isId
            ? "Rencanakan perjalanan dinas multi-hari dengan itinerary, peta interaktif, dan pencatatan expense — semua dalam satu workspace."
            : "Plan multi-day business trips with itinerary, interactive maps, and expense tracking — all in one workspace."
        }
        heroImageAlt={isId ? "Tampilan travel planner SalesView" : "SalesView travel planner interface"}
        heroImageKey="travelHero"
        introTitle={isId ? "Atur mobilitas tim dengan rapi" : "Organize team mobility cleanly"}
        introDescription={
          isId
            ? "Travel planner memberi tim HR dan operasional visibilitas penuh atas rencana perjalanan, rute, dan biaya — dari hari pertama sampai selesai."
            : "Travel planner gives HR and operations full visibility into travel plans, routes, and costs — from day one to completion."
        }
        featureBlocks={[
          {
            title: isId ? "Itinerary multi-hari per perjalanan" : "Multi-day itinerary per trip",
            description: isId
              ? "Buat rencana perjalanan dengan beberapa hari — setiap hari punya daftar stop (pickup, dropoff, checkpoint, rest) dan catatan harian. Atur ulang stop dengan drag."
              : "Create travel plans with multiple days — each day has a list of stops (pickup, dropoff, checkpoint, rest) and daily notes. Reorder stops by drag.",
            descriptionSecondary: isId
              ? "Status plan mengalir dari draft → active → completed / cancelled."
              : "Plan status flows from draft → active → completed / cancelled.",
            screenshotKey: "travelItinerary",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Peta interaktif dengan optimasi rute" : "Interactive map with route optimization",
            description: isId
              ? "Lihat semua stop dalam peta interaktif — tambahkan tempat dari Google Places atau manual. Optimasi rute otomatis untuk urutan perjalanan paling efisien."
              : "View all stops on an interactive map — add places from Google Places or manually. Auto-optimize routes for the most efficient travel order.",
            screenshotKey: "travelMap",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Catat expense dan link ke visit report" : "Track expenses and link to visit reports",
            description: isId
              ? "Catat biaya perjalanan — transport, accommodation, meal, fuel, toll, parking. Lihat total per plan. Linkkan travel plan ke visit report untuk jejak lapangan yang lengkap."
              : "Record travel expenses — transport, accommodation, meal, fuel, toll, parking. See totals per plan. Link travel plans to visit reports for a complete field trail.",
            screenshotKey: "travelExpense",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Perjalanan dinas lebih terencana, biaya lebih terkontrol" : "Business trips more planned, costs more controlled"}
        finalPoints={[
          {
            title: isId ? "Multi-hari" : "Multi-day",
            description: isId
              ? "Itinerary harian dengan stop dan catatan."
              : "Daily itinerary with stops and notes.",
          },
          {
            title: isId ? "Peta + rute" : "Map + route",
            description: isId
              ? "Peta interaktif dengan optimasi rute otomatis."
              : "Interactive map with auto route optimization.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Travel Planner" : "Start Travel Planner"}
      />
    </>
  );
}
