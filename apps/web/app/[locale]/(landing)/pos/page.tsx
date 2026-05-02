import { Metadata } from "next";
import Image from "next/image";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Aplikasi Sistem Kasir POS Terbaik (Ritel & F&B) | SalesView` 
    : `Best Point of Sale (POS) Software | SalesView`;
    
  const desc = locale === 'id'
    ? `Sistem Point of Sale (POS) antijam otomatis tersinkronisasi ke inventori dan akuntansi. Sempurna untuk kafe, resto, dan retail.`
    : `Fast, reliable Point of Sale (POS) software natively synced with inventory and accounting. Ideal for retail and F&B.`;

  return buildLandingMetadata({
    locale,
    path: "/pos",
    title,
    description: desc,
    keywords: [
      `Aplikasi Kasir Terbaik`, 
      `Sistem Kasir Cafe`, 
      `Software POS Retail`,
      `Mesin Kasir Online`
    ],
    imageAlt: "SalesView point-of-sale overview",
  });
}

export default async function PosLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://salesview.id/${locale}/pos#business`,
    "name": locale === 'id' ? "Sistem Point of Sale Terbaik" : "Best POS System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Point of sale cerdas dengan stok real-time, loyalty, dan dukungan multi-cabang.`
      : `Smart point of sale with real-time stock, loyalty, and multi-branch support.`,
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
    "url": `https://salesview.id/${locale}/pos`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            SalesView Point of Sale
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Sistem Kasir yang` : `A Point of Sale that`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Menyenangkan.` : `Delights.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Tingkatkan layanan pelanggan Anda. POS super cepat yang berfungsi di perangkat apa pun, walau koneksi terputus.`
              : `Elevate your customer service. A blazing fast POS that works on any device, even when the connection drops.`
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

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row-reverse">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {isId ? "Satu Kasir, Multi-Kondisi" : "One terminal, completely fluid"}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {isId 
                    ? `POS kami bukan sekadar mesin tik angka. Gabungkan diskon, loyalty points, multi-pembayaran langsung dalam satu aliran transaksi kilat.`
                    : `Our POS isn't just a number pad. Merge discounts, loyalty points, and split-payments right into a single lightning-fast flow.`
                  }
                </p>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border shadow-sm p-8 flex items-center justify-center">
                   <div className="w-full h-full border border-border/50 rounded-lg p-4 grid grid-cols-3 gap-4">
                     <div className="col-span-2 space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-12 bg-secondary rounded flex items-center px-4 justify-between">
                            <div className="w-1/2 h-3 bg-muted rounded" />
                            <div className="w-8 h-3 bg-muted rounded" />
                          </div>
                        ))}
                     </div>
                     <div className="col-span-1 border-l border-border/50 pl-4 flex flex-col justify-end">
                       <div className="h-20 bg-primary/20 rounded mb-4 flex items-center justify-center">
                          <div className="w-1/2 h-4 bg-primary/40 rounded" />
                       </div>
                       <div className="h-10 bg-primary rounded" />
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
