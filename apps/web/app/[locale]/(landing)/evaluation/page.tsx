import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/evaluation",
    title:
      locale === "id"
        ? "Sistem Evaluasi Kinerja: Group, Kriteria & Penilaian Karyawan | SalesView"
        : "Performance Evaluation System: Groups, Criteria & Employee Appraisal | SalesView",
    description:
      locale === "id"
        ? "Bangun group evaluasi dengan kriteria berbobot, lakukan penilaian SELF dan MANAGER per periode, lihat skor tertimbang per karyawan, dan lacak perubahan lewat audit trail — sistem appraisal yang terstruktur dan terukur."
        : "Build evaluation groups with weighted criteria, perform SELF and MANAGER appraisals per period, see weighted scores per employee, and track changes via audit trail — a structured and measurable appraisal system.",
    keywords:
      locale === "id"
        ? [
            "sistem evaluasi kinerja",
            "kriteria penilaian berbobot",
            "appraisal karyawan",
            "evaluasi SELF MANAGER",
            "skor KPI karyawan",
            "audit trail evaluasi",
            "group evaluasi HR",
            "salesview evaluation",
          ]
        : [
            "performance evaluation system",
            "weighted appraisal criteria",
            "employee appraisal",
            "SELF MANAGER evaluation",
            "employee KPI score",
            "evaluation audit trail",
            "HR evaluation group",
            "salesview evaluation",
          ],
    imageAlt: "SalesView evaluation employee appraisal overview",
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
    description: isId
      ? "Sistem evaluasi kinerja dengan group kriteria berbobot, penilaian SELF & MANAGER, dan audit trail."
      : "Performance evaluation system with weighted criteria groups, SELF & MANAGER appraisals, and audit trail.",
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
            ? "Buat group evaluasi dengan kriteria berbobot, jalankan penilaian SELF & MANAGER per periode, dan lihat skor tertimbang — semua dengan audit trail."
            : "Create evaluation groups with weighted criteria, run SELF & MANAGER appraisals per period, and see weighted scores — all with audit trail."
        }
        heroImageAlt={isId ? "Tampilan evaluasi SalesView" : "SalesView evaluation interface"}
        heroImageKey="evaluationHero"
        introTitle={isId ? "Dari penilaian ke tindak lanjut" : "From evaluation to follow-up"}
        introDescription={
          isId
            ? "Evaluation menyediakan kerangka appraisal yang bisa disesuaikan — group, kriteria, bobot, sampai penilaian per karyawan — untuk diskusi performa yang lebih objektif."
            : "Evaluation provides a customizable appraisal framework — groups, criteria, weights, per-employee scoring — for more objective performance discussions."
        }
        featureBlocks={[
          {
            title: isId ? "Group & kriteria evaluasi berbobot" : "Weighted evaluation groups & criteria",
            description: isId
              ? "Buat group evaluasi (misal: Technical Skills, Soft Skills) lalu tambahkan kriteria dengan bobot (weight) dan skor maksimal (max_score). Total weight per group divalidasi agar tidak kelebihan."
              : "Create evaluation groups (e.g. Technical Skills, Soft Skills) then add criteria with weight and max score. Total weight per group is validated to prevent overflow.",
            descriptionSecondary: isId
              ? "Group bisa diaktifkan/nonaktifkan (is_active) tanpa menghapus data."
              : "Groups can be toggled active/inactive without deleting data.",
            screenshotKey: "evaluationCriteria",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Penilaian SELF & MANAGER per periode" : "SELF & MANAGER appraisal per period",
            description: isId
              ? "Jalankan evaluasi per karyawan dalam periode tertentu (period_start–period_end). Evaluator memberikan skor per kriteria — sistem otomatis menghitung weighted_score dan overall_score."
              : "Run evaluations per employee in a specific period (period_start–period_end). Evaluator scores each criterion — system auto-calculates weighted_score and overall_score.",
            descriptionSecondary: isId
              ? "Dua tipe evaluasi: SELF (karyawan menilai diri sendiri) dan MANAGER (atasan menilai)."
              : "Two evaluation types: SELF (employee self-rating) and MANAGER (supervisor rating).",
            screenshotKey: "evaluationEmployee",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Group evaluasi siap pakai" : "Ready-to-use evaluation groups",
            description: isId
              ? "Buat dan kelola group evaluasi — atur nama, deskripsi, dan status aktif/nonaktif. Setiap group menampung kriteria berbobot yang siap digunakan untuk penilaian karyawan."
              : "Create and manage evaluation groups — set name, description, and active/inactive status. Each group holds weighted criteria ready for employee appraisals.",
            descriptionSecondary: isId
              ? "Group bisa dinonaktifkan tanpa menghapus data historis penilaian."
              : "Groups can be deactivated without deleting historical appraisal data.",
            screenshotKey: "evaluationGroup",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Penilaian karyawan lebih objektif, proses lebih transparan" : "Employee appraisal more objective, process more transparent"}
        finalPoints={[
          {
            title: isId ? "Bobot kriteria" : "Weighted criteria",
            description: isId
              ? "Setiap kriteria punya weight dan max_score sendiri."
              : "Each criterion has its own weight and max_score.",
          },
          {
            title: isId ? "Skor otomatis" : "Auto-calculated scores",
            description: isId
              ? "Weighted score dan overall score dihitung otomatis."
              : "Weighted score and overall score calculated automatically.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Evaluasi" : "Start Evaluation"}
      />
    </>
  );
}
