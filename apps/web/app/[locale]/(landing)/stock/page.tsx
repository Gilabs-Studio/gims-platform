import { Metadata } from "next";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Software Inventory & Stok Barang Terbaik | GIMS` 
    : `Best Inventory & Stock Software | GIMS`;
    
  const desc = locale === 'id'
    ? `Aplikasi inventory pintar untuk memantau stok, melacak pergerakan gudang, dan sinkronisasi laporan otomatis tanpa perhitungan manual.`
    : `Smart inventory app to monitor stock, track warehouse movements, and sync auto-reports without manual counting.`;

  return {
    title,
    description: desc,
    keywords: [
      `Aplikasi Inventory Terbaik`, 
      `Sistem Gudang Indonesia`, 
      `Software Stok Barang`,
      `Warehouse Management System`
    ]
  };
}

export default async function StockLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://gims.gilabs.co.id/${locale}/stock#business`,
    "name": locale === 'id' ? "Sistem Inventaris Cerdas" : "Smart Inventory System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi gudang pintar terintegrasi dengan penjualan untuk kontrol stok akurat.`
      : `Smart warehouse application integrated with sales for accurate stock control.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Semarang",
      "addressRegion": "Jawa Tengah",
      "addressCountry": "ID"
    },
    // ... tailors omitted for brevity, logic identical to previous ones
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -7.005145,
      "longitude": 110.438125
    },
    "url": `https://gims.gilabs.co.id/${locale}/stock`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            GIMS Inventory
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Akurasi Stok yang` : `A Stock Accuracy that`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Presisi.` : `Excels.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Manajemen gudang cerdas yang tahu di mana barang Anda berada, kapan harus ditambah, dan otomatis melakukan penyesuaian saat ada penjualan.`
              : `A smart warehouse management that knows where products are, when to replenish, and self-adjusts upon sales.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isId ? "Tingkatkan Gudang Saya" : "Upgrade My Warehouse"}
            </Link>
          </div>
        </section>

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row-reverse">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {isId ? "Otomatisasi Penuh" : "Fully Automated"}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {isId 
                    ? `Kurangi waktu memproses barang. Terima, pindahkan stok, dan opname langsung tanpa menyortir rekap excel manual di akhir bulan.`
                    : `Reduce goods processing time. Receive, move stock, and opname seamlessly without sorting bulky excel files end of month.`
                  }
                </p>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border flex items-center justify-center p-8 shadow-sm">
                   <div className="w-full flex justify-between items-end h-full pt-16 px-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-8 bg-primary rounded-t-lg transition-all" style={{ height: `${20 * i}%` }} />
                      ))}
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
