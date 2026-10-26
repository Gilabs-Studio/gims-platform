import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/attendance",
    title:
      locale === "id"
        ? "Sistem Absensi Karyawan: Clock-in GPS, WFH, Statistik Bulanan | SalesView"
        : "Employee Attendance System: GPS Clock-in, WFH, Monthly Stats | SalesView",
    description:
      locale === "id"
        ? "Clock-in dan out dengan GPS dan foto (NORMAL/WFH/FIELD WORK), kalender kehadiran, statistik bulanan (present, late, absent, overtime), dan manajemen absensi manual oleh admin, semua terhubung ke data karyawan dan evaluation."
        : "Clock-in/out with GPS and photo (NORMAL/WFH/FIELD WORK), attendance calendar, monthly stats (present, late, absent, overtime), and manual attendance management by admin, all connected to employee data and evaluation.",
    keywords:
      locale === "id"
        ? [
            "aplikasi absensi karyawan online gps",
            "software manajemen kehadiran kerja terintegrasi",
            "sistem absen mobile tracker lapangan",
            "aplikasi pencatatan absensi real time perusahaan",
            "salesview attendance",
          ]
        : [
            "gps mobile employee attendance app",
            "real time employee tracking software cloud",
            "integrated attendance and shifts management system",
            "salesview attendance",
          ],
    imageAlt: "SalesView employee attendance system overview",
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
    description: isId
      ? "Sistem absensi karyawan dengan clock-in GPS, WFH, kalender kehadiran, dan statistik bulanan."
      : "Employee attendance system with GPS clock-in, WFH, attendance calendar, and monthly stats.",
    url: `https://salesview.id/${locale}/attendance`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Attendance"
        heroTitle={isId ? "Presensi & Absensi Karyawan," : "Employee Attendance & Time Tracking,"}
        heroAccent={isId ? "Berbasis GPS, Foto & Radius Kerja" : "GPS, Selfie & Geofenced Work Radius"}
        heroDescription={
          isId
            ? "Catat kehadiran kantor, WFH, dan kunjungan lapangan secara akurat dengan validasi biometrik dan koordinat geolokasi real-time."
            : "Track office, WFH, and field check-ins accurately with selfie photo validation and real-time geolocation radius."
        }
        heroImageAlt={isId ? "Tampilan attendance SalesView" : "SalesView attendance interface"}
        heroImageKey="attendanceHero"
        introTitle={isId ? "Pantau kedisiplinan dan jam kerja staf transparan" : "Transparent timekeeping and workforce discipline"}
        introDescription={
          isId
            ? "Hilangkan manipulasi absensi dengan validasi lokasi titik GPS, pengenalan wajah kamera, dan rekap otomatis jam lembur."
            : "Prevent attendance fraud using GPS coordinates, camera verification, and automated overtime tallying."
        }
        featureBlocks={[
          {
            title: isId ? "Clock-in dan clock-out dengan validasi GPS" : "GPS clock-in and selfie verification",
            description: isId
              ? "Karyawan melakukan presensi kerja untuk jadwal normal, WFH, atau tugas dinas lapangan dengan verifikasi foto dan titik peta akurat."
              : "Employees record attendance for regular shifts, remote WFH, or field visits with instant photo selfies and map pins.",
            descriptionSecondary: isId
              ? "Catatan alasan keterlambatan wajib disertakan saat jam masuk melampaui toleransi."
              : "Mandatory justification prompt prompts employees whenever check-in surpasses tardiness grace periods.",
            screenshotKey: "attendanceClockIn",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Kalender kehadiran dan statistik bulanan" : "Attendance calendar and monthly analytics",
            description: isId
              ? "Visualisasi kehadiran harian menampilkan status hadir tepat waktu, terlambat, izin, dan lembur dalam satu lembar kalender kerja."
              : "Visual daily attendance maps on-time arrivals, late marks, leaves, and overtime hours in a clean calendar layout.",
            screenshotKey: "attendanceCalendar",
            placeholder: "scorecardFlow",
          },
          {
            title: isId ? "Persetujuan koreksi absensi oleh admin" : "Admin attendance approval and corrections",
            description: isId
              ? "Pengajuan lupa absen atau koreksi jam lembur masuk ke antrean persetujuan atasan sebelum dihitung ke komponen gaji."
              : "Missing clock-in requests and overtime claims route to manager approval queues before payroll calculation.",
            screenshotKey: "attendanceAdmin",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={isId ? "Otomatiskan pencatatan presensi kerja perusahaan Anda" : "Automate employee attendance and timesheets today"}
        finalPoints={[
          {
            title: isId ? "Bebas kecurangan lokasi" : "Zero location spoofing",
            description: isId
              ? "Deteksi geofence memastikan karyawan benar-benar berada di lokasi kerja yang ditugaskan."
              : "Geofencing ensures staff members check in strictly within authorized operating perimeters.",
          },
          {
            title: isId ? "Otomatis ke modul payroll" : "Automated payroll link",
            description: isId
              ? "Data potongan keterlambatan dan uang lembur tersinkron langsung ke perhitungan gaji."
              : "Tardiness deductions and overtime hours flow automatically into monthly payroll runs.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
