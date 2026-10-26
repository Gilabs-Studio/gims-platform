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
        ? "Bangun group evaluasi dengan kriteria berbobot, lakukan penilaian SELF dan MANAGER per periode, lihat skor tertimbang per karyawan, dan lacak perubahan lewat audit trail sebagai sistem appraisal terstruktur."
        : "Build evaluation groups with weighted criteria, perform SELF and MANAGER appraisals per period, see weighted scores per employee, and track changes via audit trail for structured appraisals.",
    keywords:
      locale === "id"
        ? [
            "aplikasi kpi performance appraisal karyawan",
            "software penilaian kinerja karyawan online",
            "sistem evaluasi performa kerja hrd indonesia",
            "software manajemen kompetensi karyawan",
            "salesview evaluation",
          ]
        : [
            "employee performance appraisal software cloud",
            "online kpi tracking tool hr",
            "employee evaluation and feedback management system",
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
        heroTitle={isId ? "Evaluasi Kinerja Karyawan &" : "Employee Performance Appraisals &"}
        heroAccent={isId ? "Penilaian KPI Berbobot Objektif" : "Objective Weighted KPI Evaluation"}
        heroDescription={
          isId
            ? "Susun matriks kompetensi berbobot, lakukan review mandiri dan atasan, serta hitung skor KPI secara transparan."
            : "Build weighted competency matrices, conduct self and manager reviews, and calculate KPI scores transparently."
        }
        heroImageAlt={isId ? "Tampilan evaluasi SalesView" : "SalesView evaluation interface"}
        heroImageKey="evaluationHero"
        introTitle={isId ? "Kembangkan potensi karyawan dengan penilaian adil" : "Nurture employee growth with objective assessments"}
        introDescription={
          isId
            ? "Ciptakan budaya kerja berbasis kinerja terukur dengan penetapan sasaran target kerja dan tinjauan berkala."
            : "Foster a high-performance work culture with transparent target goals and systematic periodic reviews."
        }
        featureBlocks={[
          {
            title: isId ? "Grup dan kriteria penilaian berbobot" : "Weighted appraisal groups and criteria",
            description: isId
              ? "Kelompokkan kriteria evaluasi teknis dan kepemimpinan dengan bobot persentase terstandar yang divalidasi sistem."
              : "Group technical and leadership competencies with standardized percentage weights validated by the system.",
            descriptionSecondary: isId
              ? "Grup penilaian dapat diaktifkan atau dinonaktifkan sesuai kebutuhan periode evaluasi."
              : "Appraisal groups can be activated or paused flexibly per review cycle.",
            screenshotKey: "evaluationCriteria",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Penilaian mandiri dan evaluasi atasan" : "Self-evaluation and supervisor reviews",
            description: isId
              ? "Karyawan mengisi refleksi pencapaian kerja sebelum manajer memberikan skor berbobot dan catatan masukan konstruktif."
              : "Employees submit self-appraisal reflections before direct managers provide weighted scores and constructive feedback.",
            descriptionSecondary: isId
              ? "Sistem otomatis menghitung nilai akhir berdasarkan bobot masing-masing indikator."
              : "Final performance indexes compute automatically according to preset formula weights.",
            screenshotKey: "evaluationEmployee",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Template grup evaluasi siap pakai" : "Standardized appraisal templates",
            description: isId
              ? "Terapkan template evaluasi divisi dengan cepat untuk menjaga keseragaman standar penilaian di seluruh cabang perusahaan."
              : "Deploy departmental evaluation templates quickly to uphold uniform performance standards across all branches.",
            screenshotKey: "evaluationGroup",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Dorong produktivitas tim dengan evaluasi terstruktur" : "Drive team productivity with structured appraisals"}
        finalPoints={[
          {
            title: isId ? "Standar penilaian objektif" : "Objective assessment standards",
            description: isId
              ? "Menghilangkan bias personal dalam penentuan promosi dan bonus kerja."
              : "Eliminates personal bias in promotion and bonus compensation decisions.",
          },
          {
            title: isId ? "Perhitungan skor instan" : "Instant score computation",
            description: isId
              ? "Hasil rekapitulasi penilaian muncul seketika setelah formulir disetujui."
              : "Appraisal scorecards finalize immediately once review forms are approved.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
