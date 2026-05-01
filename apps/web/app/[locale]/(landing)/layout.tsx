import Script from "next/script";
import { LandingHeader } from "@/components/landing/landing-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://salesview.id/#organization",
        "name": "GILABS",
        "url": "https://salesview.id",
        "logo": "https://salesview.id/logo.png",
        "description": "Provider of SalesView: All-in-One Enterprise Platform ERP, CRM, HRIS, POS, and Finance.",
        "sameAs": [
          "https://www.linkedin.com/company/gilabs"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://salesview.id/#product",
        "name": "SalesView - ERP, CRM, HRIS, POS & Finance",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Windows, macOS, Linux",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "0",
          "offerCount": "3"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "154"
        }
      }
    ]
  };

  return (
    <>
      <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(schemaOrg)}
      </Script>
      <LandingHeader />
      {children}
    </>
  );
}
