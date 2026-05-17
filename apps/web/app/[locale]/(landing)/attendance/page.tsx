import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/attendance",
    title: locale === "id" ? "Software Attendance & Jam Kerja Karyawan | SalesView" : "Attendance & Work Hours Software | SalesView",
    description:
      locale === "id"
        ? "Pantau absensi, keterlambatan, dan ringkasan jam kerja tim dalam satu dashboard attendance yang terstruktur untuk kontrol HR harian."
        : "Track attendance, lateness, and team work-hour summaries in one structured attendance dashboard for daily HR control.",
    keywords:
      locale === "id"
        ? ["attendance karyawan", "absensi karyawan", "jam kerja", "timesheet", "salesview attendance"]
        : ["employee attendance", "work hours", "timesheet", "attendance tracking", "salesview attendance"],
    imageAlt: "SalesView attendance overview",
  });
}

export default async function AttendanceLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/attendance#product`,
    name: "SalesView Attendance",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem attendance karyawan." : "Employee attendance system.",
    url: `https://salesview.id/${locale}/attendance`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Attendance"
        heroTitle={isId ? "Attendance yang" : "Attendance that"}
        heroAccent={isId ? "Terkendali." : "Stays Controlled."}
        heroDescription={
          isId
            ? "Pantau kehadiran tim agar administrasi HR berjalan lebih cepat dan akurat."
            : "Monitor team attendance so HR administration runs faster and more accurately."
        }
        heroImageAlt={isId ? "Tampilan attendance SalesView" : "SalesView attendance interface"}
        heroImageKey="salary"
        introTitle={isId ? "Visibilitas kehadiran dalam satu layar" : "Attendance visibility in one screen"}
        introDescription={
          isId
            ? "Data absensi tersusun agar memudahkan review bulanan dan evaluasi tim."
            : "Attendance data stays organized for monthly reviews and team evaluations."
        }
        featureBlocks={[
          {
            title: isId ? "Ringkasan kehadiran harian" : "Daily attendance summary",
            description: isId
              ? "Lihat status kehadiran tim tanpa menunggu rekap manual."
              : "View team attendance status without waiting for manual recaps.",
            screenshotKey: "salary",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Pantau jam kerja" : "Track working hours",
            description: isId
              ? "Gunakan ringkasan jam kerja untuk dukung kebijakan SDM yang lebih akurat."
              : "Use work-hour summaries to support more accurate HR policies.",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Sinkron dengan evaluasi" : "Synced with evaluation",
            description: isId
              ? "Data attendance terhubung untuk membantu proses penilaian performa."
              : "Attendance data connects to support performance evaluation workflows.",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Absensi lebih jelas, koordinasi lebih cepat" : "Clearer attendance, faster coordination"}
        finalCtaLabel={isId ? "Mulai Attendance" : "Start Attendance"}
      />
    </>
  );
}
