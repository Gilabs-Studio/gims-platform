import { Metadata } from "next";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Aplikasi Procurement & Purchase Terbaik | SalesView` 
    : `Best Procurement & Purchase Software | SalesView`;
    
  const desc = locale === 'id'
    ? `Pesan inventaris otomatis. Pantau purchase order, permintaan pembelian, dan integrasi penagihan dengan alur supplier otomatis.`
    : `Order inventory automatically. Track purchase orders, requisitions, and vendor billing via automatic flows.`;

  return {
    title,
    description: desc,
    keywords: [
      `Software Pembelian Perusahaan`, 
      `Aplikasi Procurement Indonesia`, 
      `Sistem Purchase Order`,
      `B2B Procurement System`
    ]
  };
}

export default async function PurchaseLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://salesview.id/${locale}/purchase#business`,
    "name": locale === 'id' ? "Sistem Procurement Terbaik" : "Best Procurement System",
    // Base localized schemas logic identically applied
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi pengadaan barang cerdas untuk B2B.`
      : `Smart procurement software for B2B.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Semarang",
      "addressRegion": "Jawa Tengah",
      "addressCountry": "ID"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -7.005145,
      "longitude": 110.438125
    },
    "url": `https://salesview.id/${locale}/purchase`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            SalesView Purchase
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Pengadaan Barang` : `Smart Procurement`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Otomatis.` : `Automated.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Aturan pengadaan cerdas untuk memastikan ketersediaan barang. Purchase Order diklik dan terpusat dengan data vendor Anda.`
              : `Smart procurement rules ensure stock availability. Purchase Orders are one click away, centralized with vendor data.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isId ? "Mulai Pengadaan Cerdas" : "Start Smart Procurement"}
            </Link>
          </div>
        </section>

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {isId ? "Kontrol Vendor Terpusat" : "Centralized Vendor Control"}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {isId 
                    ? `Periksa riwayat, harga khusus pemasok, kinerja ketepatan waktu. Setiap tagihan pembelian ditarik otomatis ke Akuntansi.`
                    : `Check histories, supplier-specific pricings, on-time performance. Every vendor invoice routes seamlessly to Accounting.`
                  }
                </p>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center p-8">
                   <div className="w-full flex flex-col gap-4">
                     <div className="h-12 w-full bg-secondary rounded flex items-center px-4">
                       <div className="w-1/3 h-2 bg-muted rounded" />
                     </div>
                     <div className="h-24 w-full bg-card border border-border/50 rounded flex items-center px-4 gap-4">
                       <div className="w-12 h-12 bg-primary/20 rounded shrink-0" />
                       <div className="flex-1 space-y-2">
                         <div className="w-1/2 h-2 bg-foreground/20 rounded" />
                         <div className="w-1/3 h-2 bg-muted rounded" />
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageMotion>
    </>
  );
}
