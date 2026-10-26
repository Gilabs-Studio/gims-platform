import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === "id"
    ? "Software CRM Pipeline, Follow-up & Sales Lapangan | SalesView"
    : "CRM Software for Pipeline, Follow-ups & Field Sales | SalesView";
    
  const desc = locale === "id"
    ? "Kelola pipeline, aktivitas sales lapangan, follow-up prospek, area mapping, dan quotation dalam satu CRM yang terhubung langsung ke sales order."
    : "Manage pipeline, field sales activities, prospect follow-ups, area mapping, and quotations in one CRM connected directly to sales orders.";

  return buildLandingMetadata({
    locale,
    path: "/crm",
    title,
    description: desc,
    keywords: locale === "id"
      ? [
          "aplikasi crm sales lapangan area mapping",
          "software pipeline deal dan follow up prospek",
          "crm b2b terhubung quotation sales order",
          "aplikasi kunjungan sales dan target area",
          "salesforce automation untuk distributor",
          "salesview crm",
        ]
      : [
          "field sales crm with area mapping",
          "pipeline and follow up crm software",
          "crm linked to quotations and sales orders",
          "b2b sales activity tracking software",
          "salesview crm",
        ],
    imageAlt: "SalesView CRM overview",
  });
}

export default async function CrmLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://salesview.id/${locale}/crm#business`,
    "name": locale === 'id' ? "Sistem CRM Terbaik Terintegrasi" : "Best Integrated CRM System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi CRM enterprise terbaik. Bebas, tanpa batasan pengguna, untuk penjualan yang lebih modern.`
      : `Best enterprise CRM application. Seamless, without limits, designed for modern sales.`,
    "url": `https://salesview.id/${locale}/crm`,
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView CRM"
        heroTitle={isId ? "Pipeline Penjualan &" : "Sales Pipeline &"}
        heroAccent={isId ? "Pelacakan Sales Lapangan" : "Field Sales Tracking"}
        heroDescription={
          isId
            ? "Pantau status negosiasi, jadwalkan follow-up tim sales, dan petakan aktivitas wilayah dalam satu alur terintegrasi."
            : "Track negotiation stages, schedule sales follow-ups, and map regional activities in one unified flow."
        }
        heroImageAlt="SalesView CRM overview"
        heroImageKey="crmHero"
        introTitle={
          isId
            ? "Kuasai seluruh alur penjualan Anda tanpa repot"
            : "Master your entire sales pipeline effortlessly"
        }
        introDescription={
          isId
            ? "Kelola peluang dari prospek awal hingga closing tanpa ada follow-up yang terlewat."
            : "Manage opportunities from cold prospect to closed deal without missing follow-ups."
        }
        featureBlocks={[
          {
            title: isId ? "Semua tertata rapi di kanban pipeline" : "Visual kanban pipeline for every deal",
            description: isId
              ? "Kelompokkan peluang berdasarkan tahapan negosiasi. Pindahkan kartu prospek dengan cepat saat proses closing berjalan."
              : "Group opportunities by deal stage. Move prospect cards smoothly as negotiations advance.",
            screenshotKey: "crmKanbanPipeline",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Jadwal follow-up dan aktivitas terorganisir" : "Structured follow-ups and activity logs",
            description: isId
              ? "Catat setiap panggilan, jadwal meeting, dan catatan penawaran agar tim sales selalu siap melanjutkan komunikasi."
              : "Log calls, meetings, and proposal notes so sales reps stay prepared for every client interaction.",
            descriptionSecondary: isId
              ? "Seluruh riwayat interaksi tersimpan dalam satu kontak untuk mempermudah evaluasi performa closing."
              : "Complete interaction histories stay attached to each client record for accurate performance reviews.",
            screenshotKey: "crmActivityFollowup",
            placeholder: "timelineFlow",
          },
          {
            title: isId ? "Pemetaan area untuk prioritas lapangan" : "Area mapping for field priority",
            description: isId
              ? "Petakan prospek dan rute kunjungan sales di peta wilayah untuk mengoptimalkan jangkauan distributor atau outlet."
              : "Map prospect locations and sales visit routes to maximize distributor and outlet coverage.",
            screenshotKey: "crmAreaMapping",
            placeholder: "multiOutlet",
          },
        ]}
        finalTitle={
          isId
            ? "Tingkatkan konversi penjualan tim Anda sekarang"
            : "Accelerate your team's sales conversion today"
        }
        finalPoints={[
          {
            title: isId ? "Alur kerja seragam" : "Standardized sales workflow",
            description: isId
              ? "Semua sales representatif mengikuti standar follow-up yang sama dari lead masuk hingga penawaran resmi."
              : "All sales reps follow the same structured follow-up standard from initial lead to official quotation.",
          },
          {
            title: isId ? "Integrasi langsung ke sales order" : "Direct integration to sales orders",
            description: isId
              ? "Konversi penawaran deal yang berhasil menjadi sales order tanpa entri ulang data pelanggan."
              : "Convert won quotations into sales orders instantly with zero duplicate manual data entry.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba CRM Gratis" : "Start Free CRM Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
