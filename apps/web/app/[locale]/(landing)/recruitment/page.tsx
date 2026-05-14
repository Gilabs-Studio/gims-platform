import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/recruitment",
    title: locale === "id" ? "Software Recruitment Pipeline Kandidat | SalesView" : "Candidate Pipeline Recruitment Software | SalesView",
    description:
      locale === "id"
        ? "Kelola sourcing kandidat, tahapan seleksi, dan koordinasi hiring dalam satu alur recruitment yang terukur untuk mempercepat proses rekrutmen."
        : "Manage candidate sourcing, selection stages, and hiring coordination in one measurable recruitment workflow to accelerate hiring cycles.",
    keywords:
      locale === "id"
        ? ["software recruitment", "pipeline kandidat", "proses hiring", "seleksi kandidat", "salesview recruitment"]
        : ["recruitment software", "candidate pipeline", "hiring workflow", "candidate selection", "salesview recruitment"],
    imageAlt: "SalesView recruitment overview",
  });
}

export default async function RecruitmentLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/recruitment#product`,
    name: "SalesView Recruitment",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem recruitment untuk tim HR." : "Recruitment system for HR teams.",
    url: `https://salesview.id/${locale}/recruitment`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Recruitment"
        heroTitle={isId ? "Recruitment yang" : "Recruitment that"}
        heroAccent={isId ? "Lebih Terarah." : "Stays Focused."}
        heroDescription={
          isId
            ? "Atur tahapan kandidat agar proses hiring lebih cepat dan tidak kehilangan konteks."
            : "Organize candidate stages so hiring moves faster without losing context."
        }
        heroImageAlt={isId ? "Tampilan recruitment SalesView" : "SalesView recruitment interface"}
        heroImageKey="dashboard"
        introTitle={isId ? "Sederhanakan proses hiring" : "Simplify your hiring process"}
        introDescription={
          isId
            ? "Recruitment membantu tim HR menjaga alur seleksi tetap konsisten."
            : "Recruitment helps HR teams keep candidate selection flow consistent."
        }
        featureBlocks={[
          {
            title: isId ? "Pipeline kandidat" : "Candidate pipeline",
            description: isId
              ? "Kelola kandidat dari tahap awal hingga final dengan visibilitas yang lebih baik."
              : "Manage candidates from early stage to final step with better visibility.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Kolaborasi tim hiring" : "Hiring team collaboration",
            description: isId
              ? "Catat evaluasi agar keputusan hiring dibuat berdasarkan data yang sama."
              : "Log evaluations so hiring decisions are based on shared context.",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Monitoring progres" : "Progress monitoring",
            description: isId
              ? "Pantau progres recruitment tanpa perlu spreadsheet terpisah."
              : "Track recruitment progress without relying on separate spreadsheets.",
            screenshotKey: "dashboard",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Hiring lebih cepat dan terarah" : "Faster, more focused hiring"}
        finalCtaLabel={isId ? "Mulai Recruitment" : "Start Recruitment"}
      />
    </>
  );
}
