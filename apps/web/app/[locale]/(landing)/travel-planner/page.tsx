import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/travel-planner",
    title: locale === "id" ? "Travel Planner untuk Approval Perjalanan Dinas | SalesView" : "Business Trip Approval Travel Planner | SalesView",
    description:
      locale === "id"
        ? "Atur pengajuan perjalanan dinas, proses approval, dan monitoring itinerary dalam satu workflow travel planner."
        : "Manage business trip requests, approval flow, and itinerary status tracking in one travel planner workflow.",
    keywords:
      locale === "id"
        ? ["travel planner", "perjalanan dinas", "approval perjalanan", "pengajuan dinas", "salesview travel"]
        : ["travel planner", "business trip", "travel approval", "trip request workflow", "salesview travel"],
    imageAlt: "SalesView travel planner overview",
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
    description: isId ? "Travel planner untuk perjalanan dinas tim." : "Travel planner for team business trips.",
    url: `https://salesview.id/${locale}/travel-planner`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Travel Planner"
        heroTitle={isId ? "Travel Planner yang" : "Travel Planning that"}
        heroAccent={isId ? "Lebih Terkontrol." : "Stays Organized."}
        heroDescription={
          isId
            ? "Rencanakan perjalanan dinas dan pantau status pengajuan dalam satu alur kerja."
            : "Plan business travel and monitor request status in one unified workflow."
        }
        heroImageAlt={isId ? "Tampilan travel planner SalesView" : "SalesView travel planner interface"}
        heroImageKey="dashboard"
        introTitle={isId ? "Atur mobilitas tim dengan rapi" : "Organize team mobility cleanly"}
        introDescription={
          isId
            ? "Travel planner membantu tim HR dan operasional bekerja dengan visibilitas yang lebih baik."
            : "Travel planner gives HR and operations better visibility into mobility planning."
        }
        featureBlocks={[
          {
            title: isId ? "Pengajuan perjalanan" : "Travel requests",
            description: isId
              ? "Buat pengajuan perjalanan dinas dengan detail yang mudah ditinjau."
              : "Create business trip requests with details that are easy to review.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Monitoring status" : "Status monitoring",
            description: isId
              ? "Pantau status approval agar koordinasi perjalanan lebih lancar."
              : "Monitor approval status to keep travel coordination smoother.",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Dokumentasi terpusat" : "Centralized documentation",
            description: isId
              ? "Simpan data perjalanan agar histori aktivitas lebih mudah dilacak."
              : "Store trip records so activity history is easier to trace.",
            placeholder: "invoiceFlow",
          },
        ]}
        finalTitle={isId ? "Perjalanan dinas lebih terencana" : "Business trips become better planned"}
        finalCtaLabel={isId ? "Mulai Travel Planner" : "Start Travel Planner"}
      />
    </>
  );
}
