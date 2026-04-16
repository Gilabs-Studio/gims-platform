import Script from "next/script";

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
        "@id": "https://gims.gilabs.co.id/#organization",
        "name": "GILABS",
        "url": "https://gims.gilabs.co.id",
        "logo": "https://gims.gilabs.co.id/logo.png",
        "description": "Provider of GIMS: All-in-One Enterprise Platform ERP, CRM, HRIS, POS, and Finance.",
        "sameAs": [
          "https://www.linkedin.com/company/gilabs"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://gims.gilabs.co.id/#product",
        "name": "GIMS (GILABS Integrated Management System)",
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
      {children}
    </>
  );
}
