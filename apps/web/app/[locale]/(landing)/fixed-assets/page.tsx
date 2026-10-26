import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/fixed-assets",
    title: locale === "id" ? "Manajemen Aset Tetap & Penyusutan | SalesView" : "Fixed Asset & Depreciation Management | SalesView",
    description:
      locale === "id"
        ? "Kelola register aset, nilai buku, penyusutan, dan histori pemakaian dalam alur aset yang siap audit serta mudah ditelusuri tim finance."
        : "Manage asset registers, book values, depreciation, and usage history in an audit-ready asset workflow.",
    keywords:
      locale === "id"
        ? [
            "software manajemen aset tetap perusahaan",
            "aplikasi pencatatan depresiasi aset online",
            "sistem pelacakan inventaris aset bisnis",
            "aplikasi fixed asset depreciation kalkulator",
            "salesview fixed assets",
          ]
        : [
            "fixed asset management tracking software",
            "depreciation calculator asset tracking tool",
            "corporate asset inventory control system",
            "salesview fixed assets",
          ],
    imageAlt: "SalesView fixed asset overview",
  });
}

export default async function FixedAssetsLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/fixed-assets#product`,
    name: "SalesView Fixed Assets",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? "Sistem pengelolaan aset tetap perusahaan." : "Company fixed asset management system.",
    url: `https://salesview.id/${locale}/fixed-assets`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Fixed Assets"
        heroTitle={isId ? "Aset Tetap Perusahaan &" : "Fixed Asset Management &"}
        heroAccent={isId ? "Kalkulasi Depresiasi Nilai Buku" : "Automated Book Depreciation"}
        heroDescription={
          isId
            ? "Catat register aset inventaris, hitung jadwal penyusutan garis lurus, dan pantau lokasi penanggung jawab aset secara berkala."
            : "Register enterprise assets, automate straight-line depreciation schedules, and track custodian locations periodically."
        }
        heroImageAlt={isId ? "Tampilan aset tetap SalesView" : "SalesView fixed assets interface"}
        heroImageKey="fixedAssetsHero"
        introTitle={isId ? "Kontrol kepemilikan dan depresiasi aset berharga Anda" : "Track ownership and valuation across enterprise assets"}
        introDescription={
          isId
            ? "Hindari aset hilang atau pencatatan nilai buku fiktif dengan register barcode aset, histori servis, dan jadwal penyusutan otomatis."
            : "Eliminate missing equipment and inaccurate book values with asset tags, service logs, and automated monthly depreciation."
        }
        featureBlocks={[
          {
            title: isId ? "Registrasi aset dengan barcode dan kategori" : "Asset register with barcode labeling",
            description: isId
              ? "Catat tanggal perolehan, harga beli, nomor seri pabrikan, dan lokasi penempatan kantor atau cabang untuk setiap unit aset."
              : "Document acquisition dates, purchase costs, manufacturer serial numbers, and office locations for each asset.",
            screenshotKey: "fixedAssetsRegistration",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Jadwal kalkulasi penyusutan otomatis" : "Automated depreciation schedule",
            description: isId
              ? "Sistem menghitung beban depresiasi bulanan secara presisi menggunakan metode garis lurus dan langsung membukukannya ke jurnal."
              : "System computes monthly straight-line depreciation expenses accurately and generates corresponding accounting journal entries.",
            screenshotKey: "fixedAssetsValueSummary",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Riwayat pemeliharaan dan siap audit" : "Maintenance history and audit trails",
            description: isId
              ? "Simpan riwayat servis perbaikan, pemindahan penanggung jawab karyawan, serta nilai sisa buku yang siap ditinjau auditor."
              : "Maintain repair logs, custodian reassignments, and salvage book values ready for annual external audits.",
            screenshotKey: "fixedAssetsAuditDocs",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Optimalkan pengelolaan aset investasi perusahaan Anda" : "Maximize your enterprise asset investments today"}
        finalPoints={[
          {
            title: isId ? "Jurnal penyusutan otomatis" : "Automated journal entries",
            description: isId
              ? "Nilai beban depresiasi otomatis tercatat ke laporan laba rugi bulanan."
              : "Depreciation expense posts directly into monthly profit and loss accounts.",
          },
          {
            title: isId ? "Inventarisasi barcode akurat" : "Accurate barcode audit",
            description: isId
              ? "Stock opname aset fisik lebih cepat dengan pemindaian barcode unik."
              : "Faster physical asset stocktaking through unique QR and barcode tags.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
