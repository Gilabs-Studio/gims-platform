import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/employees",
    title:
      locale === "id"
        ? "Manajemen Data Karyawan: Kontrak, Riwayat Pendidikan & Sertifikasi | SalesView"
        : "Employee Data Management: Contracts, Education & Certifications | SalesView",
    description:
      locale === "id"
        ? "Kelola profil karyawan terpusat dengan kontrak PKWTT/PKWT, riwayat pendidikan, sertifikasi, aset, tanda tangan digital, dan penugasan cabang dalam satu master data yang terhubung ke absensi."
        : "Manage centralized employee profiles with PKWTT/PKWT contracts, education history, certifications, assets, digital signatures, and branch assignments in one master record.",
    keywords:
      locale === "id"
        ? [
            "software database karyawan perusahaan cloud",
            "aplikasi administrasi data personalia hrd",
            "sistem pengelolaan biodata karyawan online",
            "aplikasi manajemen payroll dan hrd terintegrasi",
            "salesview employees",
          ]
        : [
            "cloud based employee database software",
            "integrated hr administration tool business",
            "online employee records management system",
            "salesview employees",
          ],
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
    description: isId
      ? "Sistem manajemen data karyawan terpusat dengan kontrak, riwayat pendidikan, sertifikasi, dan aset."
      : "Centralized employee data management with contracts, education history, certifications, and assets.",
    url: `https://salesview.id/${locale}/employees`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Employees"
        heroTitle={isId ? "Manajemen Data Karyawan &" : "Employee Management &"}
        heroAccent={isId ? "Administrasi Personalia Terpusat" : "Centralized Personnel Administration"}
        heroDescription={
          isId
            ? "Kelola berkas kontrak kerja PKWT/PKWTT, riwayat pendidikan, sertifikasi keahlian, dan inventaris aset karyawan dalam satu platform."
            : "Manage employment contracts, education records, certifications, and company asset assignments in one unified platform."
        }
        heroImageAlt={isId ? "Tampilan data karyawan SalesView" : "SalesView employee data interface"}
        heroImageKey="employeeHero"
        introTitle={isId ? "Pusatkan administrasi SDM perusahaan Anda" : "Centralize your organization's HR administration"}
        introDescription={
          isId
            ? "Simpan berkas personalia secara digital dan aman agar proses pembaruan kontrak serta audit internal berjalan lancar."
            : "Store personnel records securely and digitally for seamless contract renewals and internal compliance audits."
        }
        featureBlocks={[
          {
            title: isId ? "Profil personalia komprehensif dan terstruktur" : "Comprehensive structured employee profiles",
            description: isId
              ? "Kelola biodata, detail pekerjaan, riwayat jabatan, tanda tangan digital, aset perusahaan, dan penugasan cabang dalam navigasi terpadu."
              : "Manage personal info, job details, promotion history, digital signatures, company assets, and branch assignments in one view.",
            screenshotKey: "employeeList",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Manajemen kontrak PKWTT, PKWT, dan magang" : "Employment contract lifecycle management",
            description: isId
              ? "Atur tanggal mulai, batas akhir masa kerja, dan status perpanjangan kontrak karyawan dengan notifikasi pengingat otomatis."
              : "Set start dates, contract expiry milestones, and renewal statuses with automated advance notification alerts.",
            screenshotKey: "employeeContract",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Riwayat pendidikan, sertifikasi, dan aset" : "Education, certification, and asset records",
            description: isId
              ? "Dokumentasikan kompetensi staf dan serah terima laptop atau kendaraan operasional lengkap dengan tanggal penyerahan."
              : "Track staff credentials and formal handovers of company laptops or vehicles complete with handover timestamps.",
            descriptionSecondary: isId
              ? "Data tersinkron otomatis dengan modul evaluasi kinerja dan presensi kerja."
              : "Data links directly with employee performance evaluations and attendance modules.",
            screenshotKey: "employeeHistory",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Kelola sumber daya manusia perusahaan lebih profesional" : "Manage your workforce with complete data confidence"}
        finalPoints={[
          {
            title: isId ? "Master data terintegrasi" : "Integrated master record",
            description: isId
              ? "Satu profil karyawan terhubung langsung ke absensi, slip gaji, dan KPI."
              : "One employee profile links directly to attendance, payroll, and KPI metrics.",
          },
          {
            title: isId ? "Keamanan dokumen digital" : "Digital document security",
            description: isId
              ? "Hak akses berjenjang menjaga kerahasiaan gaji dan berkas identitas karyawan."
              : "Role-based permissions protect payroll confidentiality and sensitive personnel files.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
