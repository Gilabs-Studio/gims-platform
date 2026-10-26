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
        ? "Kelola recruitment request dengan approval, lihat kandidat dalam kanban board per tahapan, pindahkan antar stage, dan convert applicant yang diterima menjadi employee secara otomatis."
        : "Manage recruitment requests with approval, view candidates in a kanban board per stage, move between stages, and convert accepted applicants into employees seamlessly.",
    keywords:
      locale === "id"
        ? [
            "aplikasi recruitment tracking system ats",
            "software lowongan kerja perusahaan online",
            "sistem seleksi wawancara karyawan baru",
            "aplikasi penerimaan calon pekerja hrd",
            "salesview recruitment",
          ]
        : [
            "applicant tracking system recruitment software",
            "online hiring management tool hr",
            "job opening career page builder",
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
        heroTitle={isId ? "Akuisisi Talenta &" : "Talent Acquisition &"}
        heroAccent={isId ? "Pipeline Rekrutmen Karyawan" : "Recruitment Pipeline"}
        heroDescription={
          isId
            ? "Kelola permintaan rekrutmen departemen, lacak tahap seleksi pelamar di papan kanban, dan konversi kandidat lolos menjadi karyawan."
            : "Manage hiring requisitions, track applicant stages on kanban boards, and convert hired candidates into employees."
        }
        heroImageAlt={isId ? "Tampilan recruitment SalesView" : "SalesView recruitment interface"}
        heroImageKey="recruitmentHero"
        introTitle={isId ? "Percepat alur seleksi dan perekrutan talenta terbaik" : "Accelerate hiring pipelines and secure top talent"}
        introDescription={
          isId
            ? "Sederhanakan proses peninjauan berkas, jadwal wawancara, dan pengesahan tawaran kerja dalam satu workspace tim HR."
            : "Streamline resume reviews, interview schedules, and job offer releases within a collaborative HR workspace."
        }
        featureBlocks={[
          {
            title: isId ? "Kanban pipeline kandidat interaktif" : "Interactive candidate kanban board",
            description: isId
              ? "Pantau posisi pelamar mulai dari screening resume, interview teknis, psikotes, hingga negosiasi offering dengan sistem drag and drop."
              : "Track applicants from resume screening, technical interviews, to offer negotiations with effortless drag-and-drop progression.",
            descriptionSecondary: isId
              ? "Lihat resume PDF dan catatan evaluator langsung pada panel rincian kandidat."
              : "Review candidate CVs and interviewer feedback directly inside the side preview sheet.",
            screenshotKey: "recruitmentKanban",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Permintaan rekrutmen dengan persetujuan" : "Requisition requests with approval flow",
            description: isId
              ? "Kepala divisi dapat mengajukan penambahan formasi kerja lengkap dengan kriteria keahlian, estimasi gaji, dan tanggal target bergabung."
              : "Department heads request new headcount with skill requirements, salary brackets, and targeted onboard dates.",
            descriptionSecondary: isId
              ? "Status permintaan mengalir dari draft, persetujuan direksi, pembukaan lowongan, hingga kuota terpenuhi."
              : "Requisitions progress smoothly from draft, board approval, job posting, to target fulfillment.",
            screenshotKey: "recruitmentRequest",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Konversi instan kandidat ke master karyawan" : "Instant candidate-to-employee onboarding",
            description: isId
              ? "Kandidat yang menerima penawaran kerja otomatis dikonversi menjadi data master karyawan tanpa perlu pengetikan ulang biodata."
              : "Hired candidates bridge automatically into employee master databases without manual data re-entry.",
            screenshotKey: "recruitmentConvert",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Bangun tim kerja solid tanpa birokrasi berbelit" : "Build your dream team without administrative roadblocks"}
        finalPoints={[
          {
            title: isId ? "Kolaborasi hiring efisien" : "Efficient hiring collaboration",
            description: isId
              ? "User departemen dan HRD dapat memberi skor interview bersama di platform."
              : "Hiring managers and HR recruiters collaborate and score interviews together.",
          },
          {
            title: isId ? "Transisi kerja instan" : "Instant work transition",
            description: isId
              ? "Berkas lamaran dan identitas langsung menjadi dokumen personalia sah."
              : "Application files and credentials immediately transfer into official employee records.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
