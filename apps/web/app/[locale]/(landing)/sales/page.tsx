import { Metadata } from "next";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'id' 
    ? `Aplikasi Sistem Penjualan Terbaik | GIMS` 
    : `Best B2B Sales Software | GIMS`;
    
  const desc = locale === 'id'
    ? `Bawa Sales Anda ke level berikutnya. Buat Sales Order dalam sekejap, kirim faktur cantik, dan integrasikan pembayaran online.`
    : `Take your sales to the next level. Craft Sales Orders instantly, send beautiful invoices, and accept online payments.`;

  return {
    title,
    description: desc,
    keywords: [
      `Aplikasi Sales Terbaik`, 
      `Sistem Penjualan Perusahaan`, 
      `Software Pembukuan Penjualan`,
      `Aplikasi Pembuat Invoice`
    ]
  };
}

export default async function SalesLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SoftwareApplication"],
    "@id": `https://gims.gilabs.co.id/${locale}/sales#business`,
    "name": locale === 'id' ? "Sistem Penjualan B2B Terbaik" : "Best B2B Sales System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === 'id' 
      ? `Aplikasi penjualan B2B dan pencatatan transaksi yang terintegrasi secara cerdas.`
      : `B2B sales and transaction tracking seamlessly integrated.`,
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
    "url": `https://gims.gilabs.co.id/${locale}/sales`,
    "telephone": "+628111222333"
  };

  const isId = locale === 'id';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            GIMS Sales
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Pesan Penjualan` : `Closing Sales,`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Secara Instan.` : `Perfected.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Ubah penawaran harga menjadi pesanan penjualan dengan satu klik, tanpa buang-buang waktu mengkonversi data ke dokumen tertulis.`
              : `Turn quotations to sales orders in one click, without wasting a second converting files to boring documents.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isId ? "Otomatisasi Penjualan" : "Automate Sales"}
            </Link>
          </div>
        </section>

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col gap-12 lg:gap-24 items-center lg:flex-row-reverse">
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  {isId ? "Penawaran yang Elegan" : "Elegant Quotations"}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {isId 
                    ? `Perlihatkan profesionalisme Anda dengan format pesanan yang cemerlang, rapih, dan tertaut langsung ke penagihan dan inventaris produk.`
                    : `Showcase your professionalism with incredibly sharp quotes, directly linked to billing and real-time inventory.`
                  }
                </p>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-background border border-border flex items-center justify-center p-8 shadow-sm">
                   <div className="w-full h-full border border-border/50 rounded flex flex-col p-4 bg-card">
                     <div className="w-full flex justify-between items-center border-b border-border/50 pb-4 mb-4">
                       <div className="w-16 h-16 bg-muted rounded" />
                       <div className="w-1/4 h-2 bg-muted rounded" />
                     </div>
                     <div className="space-y-2 flex-1">
                       <div className="h-6 w-full bg-secondary rounded flex justify-between px-2 items-center">
                         <div className="w-1/2 h-2 bg-muted rounded" />
                         <div className="w-10 h-2 bg-muted rounded" />
                       </div>
                       <div className="h-6 w-full bg-secondary rounded flex justify-between px-2 items-center">
                         <div className="w-1/3 h-2 bg-muted rounded" />
                         <div className="w-14 h-2 bg-muted rounded" />
                       </div>
                     </div>
                     <div className="border-t border-border/50 pt-4 flex justify-end">
                       <div className="w-32 h-6 bg-primary/20 rounded flex items-center justify-center">
                          <div className="w-1/2 h-2 bg-primary/50 rounded" />
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
