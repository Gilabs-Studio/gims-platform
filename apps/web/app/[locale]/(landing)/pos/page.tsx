import { Metadata } from "next";
import { PageMotion } from "@/components/motion/page-motion";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ThemeAwareImage } from "@/components/landing/theme-aware-image";
import {
  LANDING_THEME_IMAGES_BY_FEATURE,
  type LandingScreenshotKey,
} from "@/lib/landing-theme-images";
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
    keywords: locale === "id"
      ? [
          "aplikasi kasir terbaik",
          "sistem kasir cafe",
          "software pos retail",
          "mesin kasir online",
          "pos kasir",
          "point of sales",
          "aplikasi point of sale indonesia",
          "software kasir gratis",
          "kasir digital",
          "sistem kasir restoran",
          "salesview pos",
        ]
      : [
          "point of sales software",
          "best pos system",
          "pos kasir",
          "retail pos software",
          "restaurant pos system",
          "cloud pos indonesia",
          "salesview pos",
          "point of sale indonesia",
        ],
    imageAlt: "SalesView point-of-sale overview",
  });
}

export default async function PosLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/pos#product`,
    "name": locale === "id" ? "SalesView Sistem Point of Sale (POS) & Kasir" : "SalesView Point of Sale (POS) System",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": locale === "id"
      ? "Point of sale cerdas dengan stok real-time, loyalty pelanggan, dan dukungan multi-cabang untuk retail dan F&B."
      : "Smart point of sale with real-time stock, loyalty, and multi-branch support for retail and F&B.",
    "url": `https://salesview.id/${locale}/pos`,
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "IDR",
      "lowPrice": "0",
      "offerCount": "3"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "87",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Rini Wulandari" },
        "datePublished": "2025-03-20",
        "reviewBody": "Aplikasi kasir POS terbaik yang pernah saya coba. Cepat, mudah digunakan, dan stok langsung tersinkron otomatis.",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Hendra Kusuma" },
        "datePublished": "2025-04-05",
        "reviewBody": "Sistem kasir yang sangat andal untuk bisnis cafe multi-cabang kami. Laporan penjualan real-time sangat membantu manajemen.",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5",
          "worstRating": "1"
        }
      }
    ]
  };

  const isId = locale === 'id';
  const featureBlocks: Array<{
    title: string;
    description: string;
    screenshotKey?: LandingScreenshotKey;
    placeholder: "terminalFlow" | "multiOutlet";
  }> = [
    {
      title: isId ? "Satu Kasir, Multi-Kondisi" : "One terminal, completely fluid",
      description: isId
        ? "POS kami bukan sekadar mesin tik angka. Gabungkan diskon, loyalty points, dan split payment dalam satu aliran transaksi yang tetap cepat meski antrean ramai."
        : "Our POS is not just a number pad. Merge discounts, loyalty points, and split payments in one lightning-fast checkout flow.",
      placeholder: "terminalFlow",
    },
    {
      title: isId ? "Stok Selalu Sinkron Otomatis" : "Inventory updates itself in real time",
      description: isId
        ? "Setiap transaksi langsung memperbarui stok antar outlet dan gudang. Tim Anda tidak perlu lagi rekonsiliasi manual di akhir hari."
        : "Every transaction updates stock across stores and warehouses instantly, so your team can stop doing manual end-of-day reconciliation.",
      screenshotKey: "stockInventory",
      placeholder: "terminalFlow",
    },
    {
      title: isId ? "Loyalty & Data Customer dalam Satu Layar" : "Loyalty and customer profile in one screen",
      description: isId
        ? "Simpan histori belanja pelanggan, terapkan promosi yang tepat, dan bangun repeat order lebih konsisten dari kasir yang sama."
        : "Keep customer purchase history, apply better promotions, and drive repeat orders consistently from the same checkout screen.",
      screenshotKey: "customer",
      placeholder: "terminalFlow",
    },
    {
      title: isId ? "Kontrol Multi Outlet Lebih Rapi" : "Cleaner control for multi-store operations",
      description: isId
        ? "Pantau performa per outlet, per kasir, dan per shift dari dashboard yang ringkas. Audit harian jadi cepat tanpa lompat antar sistem."
        : "Monitor outlet, cashier, and shift performance from a focused dashboard so daily audit takes minutes, not hours.",
      placeholder: "multiOutlet",
    },
  ];

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
            <div className="text-center mb-14 md:mb-20 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-5">
                {isId ? "POS yang tumbuh bersama operasional Anda" : "A POS built for real daily operations"}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                {isId
                  ? "Empat blok fitur inti yang dirancang untuk mempercepat kasir, menjaga akurasi stok, dan memberi kontrol outlet yang lebih rapi."
                  : "Four core feature blocks designed to speed up checkout, keep stock accurate, and simplify multi-store control."}
              </p>
            </div>

            <div className="space-y-20 md:space-y-24">
              {featureBlocks.map((feature, index) => {
                const useScreenshot = Boolean(feature.screenshotKey);
                const reverse = index % 2 === 1;

                return (
                  <div
                    key={feature.title}
                    className={`flex flex-col gap-12 lg:gap-20 items-center ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}
                  >
                    <div className="lg:w-1/2 w-full">
                      <div className="aspect-square md:aspect-4/3 rounded-3xl overflow-hidden bg-background border border-border shadow-sm p-6 md:p-8 flex items-center justify-center relative">
                        {useScreenshot ? (
                          <ThemeAwareImage
                            lightSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].light}
                            darkSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].dark}
                            alt={feature.title}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        ) : feature.placeholder === "multiOutlet" ? (
                          <div className="w-full h-full border border-border/50 rounded-xl p-4 md:p-5 grid grid-cols-5 gap-4">
                            <div className="col-span-3 space-y-3">
                              <div className="h-10 rounded-md bg-secondary/70 border border-border/50" />
                              <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((item) => (
                                  <div key={item} className="h-16 rounded-md bg-secondary/60 border border-border/40 p-2">
                                    <div className="h-2 w-2/3 bg-muted rounded mb-2" />
                                    <div className="h-5 w-1/2 bg-foreground/15 rounded" />
                                  </div>
                                ))}
                              </div>
                              <div className="h-28 rounded-md bg-card border border-border/50 p-3 flex items-end gap-2">
                                {[30, 45, 35, 60, 50, 70].map((height, i) => (
                                  <div key={i} className="flex-1 rounded-t-sm bg-primary/40" style={{ height: `${height}%` }} />
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2 border-l border-border/50 pl-4 space-y-3">
                              {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="rounded-md bg-secondary/60 border border-border/40 p-2">
                                  <div className="h-2 w-2/3 bg-muted rounded mb-2" />
                                  <div className="h-2 w-full bg-muted rounded" />
                                </div>
                              ))}
                              <div className="h-9 rounded-md bg-primary/80" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full border border-border/50 rounded-xl p-4 grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                              {[1, 2, 3].map((item) => (
                                <div key={item} className="h-12 bg-secondary rounded flex items-center px-4 justify-between">
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
                        )}
                      </div>
                    </div>

                    <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                      <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-lg text-muted-foreground font-light leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                        <Link
                          href="/register"
                          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105 shadow-sm"
                        >
                          {isId ? "Mulai Gratis" : "Start Free"}
                        </Link>
                        <Link
                          href="/login"
                          className="rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground border border-border hover:bg-muted/60 transition-colors"
                        >
                          {isId ? "Lihat Demo" : "See Demo"}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </PageMotion>
    </>
  );
}
