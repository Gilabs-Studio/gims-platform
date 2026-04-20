import { Metadata } from "next";
import Image from "next/image";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Software Akuntansi & Keuangan Terbaik di Indonesia | GIMS` 
    : `Best Finance & Accounting Software | GIMS`;
    
  const desc = locale === 'id'
    ? `Sistem keuangan, akuntansi, dan faktur terintegrasi. Buat laporan real-time tanpa pusing. Semua metrik finansial dalam satu tempat.`
    : `Integrated finance, accounting, and invoicing system. Generate real-time reports effortlessly. All financial metrics in one single place.`;

  return {
    title,
    description: desc,
    keywords: [
      `Software Akuntansi Terbaik`, 
      `Sistem Keuangan Perusahaan`, 
      `Aplikasi Faktur`,
      `Finance software Indonesia`,
      `Software Laporan Keuangan`
    ]
  };
}

export default async function FinanceLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://gims.gilabs.co.id/${locale}/solutions/finance#business`,
    "name": locale === 'id' ? "Software Akuntansi Terintegrasi Terbaik" : "Best Integrated Accounting Software",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Sistem akuntansi enterprise tanpa batas, mempermudah faktur dan kas.`
      : `Limitless enterprise accounting system, simplifying invoicing and cash flow.`,
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
    "url": `https://gims.gilabs.co.id/${locale}/solutions/finance`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        
        {/* HERO */}
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            GIMS Finance
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Kendali Keuangan` : `Financial Control,`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Mutlak.` : `Absolute.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Jauhkan stres dari pembukuan Anda. Faktur, tagihan, rekonsiliasi, dan pelaporan yang sinkron dengan operasi bisnis sesungguhnya.`
              : `Keep stress out of your books. Invoices, bills, reconciliation, and reporting—synced entirely with actual business ops.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 shadow-sm"
            >
              {isId ? "Mulai sekarang - Gratis" : "Start now - Free"}
            </Link>
          </div>
        </section>

        {/* FEATURE INTRODUCTION GRID */}
        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-6">
                {isId ? "Tinggalkan Cara Pura-Pura Laporan" : "Stop Faking the Reports."}
              </h2>
            </div>

            <div className="space-y-32">
              <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row">
                <div className="lg:w-1/2 space-y-6">
                  <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                    {isId ? "Akuntansi yang terhubung otomatis" : "Automatically connected accounting"}
                  </h3>
                  <p className="text-lg text-muted-foreground font-light leading-relaxed">
                    {isId 
                      ? `Penjualan dan pengeluaran mencatat diri mereka sendiri ke buku besar Anda. Tidak perlu sinkronisasi manual antar departemen.`
                      : `Sales and expenses record themselves straight to your ledger. Zero manual synchronizing across departments.`
                    }
                  </p>
                </div>
                <div className="lg:w-1/2 w-full">
                  <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border shadow-sm flex items-center justify-center p-8">
                     <div className="w-full flex items-end gap-3 h-full pt-16">
                       <div className="flex-1 bg-primary/20 rounded-t-lg h-1/3" />
                       <div className="flex-1 bg-primary/40 rounded-t-lg h-1/2" />
                       <div className="flex-1 bg-primary border-t-4 border-warning rounded-t-lg h-full" />
                       <div className="flex-1 bg-primary/60 rounded-t-lg h-3/4" />
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
