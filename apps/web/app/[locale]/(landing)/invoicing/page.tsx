import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/invoicing",
    title: locale === "id" ? "Software Invoicing & Penagihan B2B | SalesView" : "B2B Invoicing & Billing Software | SalesView",
    description:
      locale === "id"
        ? "Kelola siklus invoice, status pembayaran, dan tindak lanjut penagihan agar arus kas bisnis lebih terjaga setiap periodenya."
        : "Manage invoice cycles, payment status, and collection follow-ups to keep business cash flow healthier.",
    keywords:
      locale === "id"
        ? ["software invoicing", "aplikasi faktur", "penagihan b2b", "status pembayaran", "salesview invoicing"]
        : ["invoicing software", "billing software", "b2b invoice", "collections workflow", "salesview invoicing"],
    imageAlt: "SalesView invoicing overview",
  });
}

export default async function InvoicingLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/invoicing#product`,
    name: "SalesView Invoicing",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem invoicing untuk pencatatan dan penagihan bisnis."
      : "Invoicing system for business billing and collections.",
    url: `https://salesview.id/${locale}/invoicing`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Invoicing"
        heroTitle={isId ? "Invoicing yang" : "Invoicing that"}
        heroAccent={isId ? "Lebih Ringkas" : "Stays Focused"}
        heroDescription={
          isId
            ? "Buat faktur, pantau pembayaran, dan lakukan follow-up tanpa lompat antar sistem."
            : "Create invoices, track payments, and run follow-ups without jumping between systems."
        }
        heroImageAlt={isId ? "Tampilan invoicing SalesView" : "SalesView invoicing interface"}
        heroImageKey="invoicingHero"
        introTitle={isId ? "Percepat siklus penagihan" : "Accelerate your billing cycle"}
        introDescription={
          isId
            ? "Invoicing dibuat untuk membantu cashflow tetap sehat dengan alur yang mudah dipantau."
            : "Invoicing is built to keep cashflow healthier with a flow that is easy to monitor."
        }
        featureBlocks={[
          {
            title: isId ? "Faktur konsisten untuk pelanggan" : "Consistent invoices for customers",
            description: isId
              ? "Gunakan format faktur yang rapi agar komunikasi tagihan lebih profesional."
              : "Use clean invoice formatting to keep billing communication professional.",
            screenshotKey: "invoicingConsistentInvoice",
            placeholder: "invoiceFlow",
          },
          {
            title: isId ? "Status pembayaran selalu terlihat" : "Payment status always visible",
            description: isId
              ? "Pantau status tagihan agar tim bisa memprioritaskan follow-up yang tepat waktu."
              : "Track bill status so teams can prioritize timely follow-ups.",
            screenshotKey: "invoicingPaymentStatus",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Follow-up lebih terstruktur" : "More structured follow-up flow",
            description: isId
              ? "Atur ritme reminder tanpa membuat proses penagihan terasa rumit."
              : "Set reminder cadence without making collections feel complicated.",
            screenshotKey: "invoicingFollowUp",
            placeholder: "timelineFlow",
          },
        ]}
        finalTitle={isId ? "Tagihan rapi, arus kas lebih sehat" : "Clean billing, healthier cashflow"}
        finalCtaLabel={isId ? "Mulai Invoicing" : "Start Invoicing"}
      />
    </>
  );
}
