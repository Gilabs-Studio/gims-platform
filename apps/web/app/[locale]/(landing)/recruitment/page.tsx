import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/recruitment",
    title:
      locale === "id"
        ? "Sistem Recruitment Pipeline: Kanban Kandidat, Approval & Convert | SalesView"
        : "Recruitment Pipeline System: Candidate Kanban, Approval & Convert | SalesView",
    description:
      locale === "id"
        ? "Kelola recruitment request dengan approval, lihat kandidat dalam kanban board per tahapan, pindahkan antar stage, dan convert applicant yang diterima menjadi employee — semua terhubung ke master data karyawan."
        : "Manage recruitment requests with approval, view candidates in a kanban board per stage, move between stages, and convert accepted applicants into employees — all connected to employee master data.",
    keywords:
      locale === "id"
        ? [
            "sistem recruitment",
            "kanban kandidat",
            "pipeline recruitment",
            "convert applicant karyawan",
            "approval hiring",
            "rekrutmen HR",
            "tahapan seleksi",
            "salesview recruitment",
          ]
        : [
            "recruitment system",
            "candidate kanban",
            "recruitment pipeline",
            "convert applicant to employee",
            "hiring approval",
            "HR recruitment",
            "candidate selection stages",
            "salesview recruitment",
          ],
    imageAlt: "SalesView recruitment pipeline overview",
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
    description: isId
      ? "Sistem recruitment dengan kanban kandidat, approval request, dan konversi applicant ke employee."
      : "Recruitment system with candidate kanban, request approval, and applicant-to-employee conversion.",
    url: `https://salesview.id/${locale}/recruitment`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Recruitment"
        heroTitle={isId ? "Recruitment yang" : "Recruitment that"}
        heroAccent={isId ? "Lebih Terarah" : "Stays Focused"}
        heroDescription={
          isId
            ? "Buat recruitment request, lihat kandidat dalam kanban board, pindahkan antar tahapan, dan convert applicant yang diterima langsung ke data karyawan."
            : "Create recruitment requests, view candidates in a kanban board, move between stages, and convert accepted applicants directly to employee records."
        }
        heroImageAlt={isId ? "Tampilan recruitment SalesView" : "SalesView recruitment interface"}
        heroImageKey="recruitmentHero"
        introTitle={isId ? "Sederhanakan proses hiring" : "Simplify your hiring process"}
        introDescription={
          isId
            ? "Recruitment membantu tim HR dari request pembukaan posisi, seleksi kandidat di kanban, sampai onboarding ke data karyawan."
            : "Recruitment supports HR teams from position requests and candidate selection in kanban through onboarding to employee records."
        }
        featureBlocks={[
          {
            title: isId ? "Kanban board kandidat per tahapan" : "Candidate kanban board per stage",
            description: isId
              ? "Lihat semua applicant dalam tampilan kanban — setiap kolom mewakili satu tahapan seleksi. Pindahkan kandidat antar stage dengan drag atau klik move."
              : "View all applicants in a kanban board — each column represents a selection stage. Move candidates between stages via drag or click move.",
            descriptionSecondary: isId
              ? "Detail kandidat tampil di sheet samping tanpa meninggalkan kanban."
              : "Applicant detail shows in a side sheet without leaving the kanban.",
            screenshotKey: "recruitmentKanban",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Recruitment request dengan approval" : "Recruitment request with approval",
            description: isId
              ? "Buat permintaan rekrutmen — pilih divisi, posisi, jumlah, employment type (FULL_TIME/PART_TIME/CONTRACT/INTERN), salary range, priority, dan job description."
              : "Create recruitment requests — select division, position, count, employment type (FULL_TIME/PART_TIME/CONTRACT/INTERN), salary range, priority, and job description.",
            descriptionSecondary: isId
              ? "Status mengalir dari DRAFT → PENDING → APPROVED → OPEN → CLOSED dengan audit lengkap."
              : "Status flows from DRAFT → PENDING → APPROVED → OPEN → CLOSED with full audit.",
            screenshotKey: "recruitmentRequest",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Convert applicant ke data karyawan" : "Convert applicant to employee",
            description: isId
              ? "Begitu kandidat diterima, convert langsung ke employee — data applicant dijembatani ke form karyawan tanpa input ulang."
              : "Once a candidate is accepted, convert directly to employee — applicant data bridges to the employee form without re-entry.",
            screenshotKey: "recruitmentConvert",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Rekrutmen lebih cepat, data karyawan otomatis" : "Faster recruitment, automatic employee records"}
        finalPoints={[
          {
            title: isId ? "Kanban kandidat" : "Candidate kanban",
            description: isId
              ? "Pindahkan kandidat antar tahapan seleksi."
              : "Move candidates between selection stages.",
          },
          {
            title: isId ? "Convert otomatis" : "Auto-convert",
            description: isId
              ? "Applicant diterima langsung jadi data karyawan."
              : "Accepted applicants become employee records instantly.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Recruitment" : "Start Recruitment"}
      />
    </>
  );
}
