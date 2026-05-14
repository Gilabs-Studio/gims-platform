import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/evaluation",
    title: locale === "id" ? "Evaluasi Kinerja & KPI Karyawan | SalesView" : "Employee Performance & KPI Review | SalesView",
    description:
      locale === "id"
        ? "Jalankan siklus penilaian performa, review KPI, dan tindak lanjut pengembangan karyawan secara terstruktur untuk peningkatan performa tim."
        : "Run performance appraisal cycles, KPI reviews, and employee development follow-ups in a structured workflow to improve team performance.",
    keywords:
      locale === "id"
        ? ["evaluasi kinerja", "review kpi", "penilaian karyawan", "appraisal karyawan", "salesview evaluation"]
        : ["performance evaluation", "kpi review", "employee appraisal", "review workflow", "salesview evaluation"],
    imageAlt: "SalesView evaluation overview",
  });
}

export default async function EvaluationLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/evaluation#product`,
    name: "SalesView Evaluation",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem evaluasi kinerja karyawan." : "Employee performance evaluation system.",
    url: `https://salesview.id/${locale}/evaluation`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Evaluation"
        heroTitle={isId ? "Evaluasi Kinerja yang" : "Performance Evaluation that"}
        heroAccent={isId ? "Terukur." : "Stays Measurable."}
        heroDescription={
          isId
            ? "Jalankan evaluasi KPI dengan struktur yang membantu diskusi performa lebih objektif."
            : "Run KPI evaluations with a structure that supports more objective performance reviews."
        }
        heroImageAlt={isId ? "Tampilan evaluasi SalesView" : "SalesView evaluation interface"}
        heroImageKey="dashboard"
        introTitle={isId ? "Dari penilaian ke tindak lanjut" : "From evaluation to follow-up"}
        introDescription={
          isId
            ? "Evaluation membantu tim memantau progres perbaikan secara berkelanjutan."
            : "Evaluation helps teams monitor improvement progress continuously."
        }
        featureBlocks={[
          {
            title: isId ? "KPI lebih terstruktur" : "More structured KPI tracking",
            description: isId
              ? "Kelola indikator performa agar evaluasi tidak hanya bersifat subjektif."
              : "Manage performance indicators so evaluations go beyond subjective opinions.",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Review periodik" : "Periodic reviews",
            description: isId
              ? "Buat ritme review yang konsisten untuk menjaga fokus tim."
              : "Build consistent review cadence to keep teams aligned.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Ringkasan untuk manajemen" : "Management-ready summaries",
            description: isId
              ? "Sajikan ringkasan evaluasi agar keputusan pembinaan lebih cepat diambil."
              : "Provide evaluation summaries so coaching decisions can be made faster.",
            screenshotKey: "dashboard",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Evaluasi yang mendorong pertumbuhan tim" : "Evaluation that drives team growth"}
        finalCtaLabel={isId ? "Mulai Evaluation" : "Start Evaluation"}
      />
    </>
  );
}
