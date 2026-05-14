import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/employees",
    title: locale === "id" ? "Manajemen Profil Karyawan Terpusat | SalesView" : "Centralized Employee Profile Management | SalesView",
    description:
      locale === "id"
        ? "Simpan profil karyawan, data organisasi, dan informasi administrasi SDM dalam satu master data terpusat untuk operasional HR yang lebih konsisten."
        : "Store employee profiles, organizational data, and HR administration details in one centralized master record for more consistent HR operations.",
    keywords:
      locale === "id"
        ? ["data karyawan", "profil karyawan", "master data hris", "administrasi sdm", "salesview employees"]
        : ["employee data", "employee profile", "hr master data", "people administration", "salesview employees"],
    imageAlt: "SalesView employee management overview",
  });
}

export default async function EmployeesLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/employees#product`,
    name: "SalesView Employees",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem manajemen data karyawan." : "Employee data management system.",
    url: `https://salesview.id/${locale}/employees`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Employees"
        heroTitle={isId ? "Data Karyawan yang" : "Employee Data that"}
        heroAccent={isId ? "Tersentralisasi." : "Stay Centralized."}
        heroDescription={
          isId
            ? "Satukan informasi karyawan agar tim HR bekerja dengan data yang konsisten."
            : "Unify employee information so HR teams operate on consistent data."
        }
        heroImageAlt={isId ? "Tampilan data karyawan SalesView" : "SalesView employee data interface"}
        heroImageKey="salary"
        introTitle={isId ? "Fondasi HR dimulai dari data" : "HR foundation starts from data"}
        introDescription={
          isId
            ? "Data karyawan yang rapi membantu proses administrasi dan evaluasi berjalan lebih cepat."
            : "Clean employee records help administration and evaluation processes run faster."
        }
        featureBlocks={[
          {
            title: isId ? "Profil karyawan terstruktur" : "Structured employee profiles",
            description: isId
              ? "Simpan informasi karyawan dalam format yang mudah diakses lintas fungsi HR."
              : "Store employee information in a format accessible across HR functions.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Akses data lebih cepat" : "Faster data access",
            description: isId
              ? "Temukan informasi penting tanpa menelusuri dokumen terpisah."
              : "Find key information without searching across separate documents.",
            screenshotKey: "salary",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Siap untuk proses HR lain" : "Ready for downstream HR processes",
            description: isId
              ? "Data employee terhubung ke attendance, evaluation, dan proses lainnya."
              : "Employee data connects to attendance, evaluation, and related HR processes.",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Kelola tim dengan fondasi data yang benar" : "Manage teams on a reliable data foundation"}
        finalCtaLabel={isId ? "Mulai Kelola Employees" : "Start Managing Employees"}
      />
    </>
  );
}
