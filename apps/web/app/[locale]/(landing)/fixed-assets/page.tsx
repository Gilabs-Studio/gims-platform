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
        ? ["aset tetap", "penyusutan aset", "register aset", "nilai buku", "salesview assets"]
        : ["fixed assets", "asset depreciation", "asset register", "book value", "salesview assets"],
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
        heroTitle={isId ? "Aset Tetap yang" : "Fixed Assets that"}
        heroAccent={isId ? "Lebih Teratur" : "Stay Structured"}
        heroDescription={
          isId
            ? "Catat aset, nilai, dan status pemakaian agar keputusan investasi lebih berbasis data."
            : "Track assets, values, and usage status so investment decisions stay data-driven."
        }
        heroImageAlt={isId ? "Tampilan aset tetap SalesView" : "SalesView fixed assets interface"}
        heroImageKey="fixedAssetsHero"
        introTitle={isId ? "Kendalikan aset dalam satu sistem" : "Control assets in one system"}
        introDescription={
          isId
            ? "Aset tetap tidak lagi tersebar di file manual yang sulit ditelusuri."
            : "Fixed assets no longer stay scattered across hard-to-track manual files."
        }
        featureBlocks={[
          {
            title: isId ? "Registrasi aset lebih jelas" : "Clearer asset registration",
            description: isId
              ? "Simpan detail aset agar pelacakan kepemilikan dan penggunaan lebih konsisten."
              : "Store asset details for more consistent ownership and usage tracking.",
            screenshotKey: "fixedAssetsRegistration",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Ringkasan nilai aset" : "Asset value summary",
            description: isId
              ? "Pantau nilai aset dalam tampilan yang membantu evaluasi finansial periodik."
              : "Monitor asset value through views that support periodic financial evaluation.",
            screenshotKey: "fixedAssetsValueSummary",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Dokumentasi siap audit" : "Audit-ready documentation",
            description: isId
              ? "Siapkan data aset yang rapi untuk kebutuhan audit dan rekonsiliasi internal."
              : "Keep asset records tidy for audits and internal reconciliation.",
            screenshotKey: "fixedAssetsAuditDocs",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Aset tetap lebih mudah dikendalikan" : "Fixed assets become easier to control"}
        finalCtaLabel={isId ? "Mulai Kelola Aset" : "Start Managing Assets"}
      />
    </>
  );
}
