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
    ? `Software Procurement & Purchase Order | SalesView` 
    : `Procurement & Purchase Order Software | SalesView`;
    
  const desc = locale === 'id'
    ? `Kelola pengadaan dari permintaan pembelian, approval, hingga purchase order dan kontrol supplier dalam satu alur yang terstruktur.`
    : `Manage procurement from purchase requests and approvals to purchase orders and supplier control in one structured workflow.`;

  return buildLandingMetadata({
    locale,
    path: "/purchase",
    title,
    description: desc,
    keywords: locale === "id"
      ? [
          "software procurement",
          "sistem purchase order",
          "permintaan pembelian",
          "manajemen supplier",
          "salesview purchase",
        ]
      : [
          "procurement software",
          "purchase order system",
          "purchase requisition",
          "supplier management",
          "salesview purchase",
        ],
    imageAlt: "SalesView purchase and procurement overview",
  });
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
  const featureBlocks: Array<{
    id: "purchasing" | "vendor-control" | "po-tracking";
    title: string;
    description: string;
    descriptionSecondary?: string;
    screenshotKey?: LandingScreenshotKey;
    placeholder: "vendorPanel" | "purchaseFlow";
  }> = [
    {
      id: "purchasing",
      title: isId ? "Purchasing dengan alur yang ringkas" : "Purchasing with a focused workflow",
      description: isId
        ? "Buat purchase order lebih cepat agar tim procurement bisa bergerak tanpa menunggu proses berlapis."
        : "Create purchase orders faster so procurement teams can move without layered delays.",
      screenshotKey: "salesOrder",
      placeholder: "purchaseFlow",
    },
    {
      id: "vendor-control",
      title: isId ? "Kontrol vendor tetap terpusat" : "Vendor control stays centralized",
      description: isId
        ? "Kelola profil vendor, histori transaksi, dan catatan penting dalam satu tampilan kerja."
        : "Manage vendor profiles, transaction history, and important notes in one working view.",
      placeholder: "vendorPanel",
    },
    {
      id: "po-tracking",
      title: isId ? "Status PO mudah dipantau" : "PO status is easier to monitor",
      description: isId
        ? "Pantau status order agar koordinasi pembelian dan penerimaan barang lebih sinkron."
        : "Monitor order status so purchasing and goods receipt coordination stays synchronized.",
      descriptionSecondary: isId
        ? "Data pembelian tersusun rapi untuk transisi ke invoicing dan finance."
        : "Purchase records stay organized for smoother transitions into invoicing and finance.",
      screenshotKey: "dashboard",
      placeholder: "purchaseFlow",
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
        <section className="pt-24 pb-10 px-6 max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-6">
            SalesView Purchase
          </p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.1] mb-6">
            {isId ? `Pengadaan Barang yang` : `Procurement that`}
            <br />
            <span className="text-primary font-accent font-medium italic text-[4.5rem] md:text-[6.5rem] leading-none inline-block mt-2">
              {isId ? `Terkoordinasi.` : `Stays Coordinated.`}
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-light text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            {isId 
              ? `Satukan purchasing, data vendor, dan tracking purchase order dalam satu alur kerja yang stabil.`
              : `Unify purchasing, vendor records, and purchase order tracking in one stable workflow.`
            }
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="cursor-pointer rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isId ? "Mulai sekarang - Gratis" : "Start now - Free"}
            </Link>
            <Link
              href="/login"
              className="cursor-pointer rounded-full bg-secondary text-secondary-foreground px-8 py-4 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {isId ? "Ketahui lebih lanjut" : "Learn more"}
            </Link>
          </div>
        </section>

        <section className="px-6 max-w-7xl mx-auto w-full pb-24">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
            <div className="relative aspect-video w-full">
              <ThemeAwareImage
                lightSrc={LANDING_THEME_IMAGES_BY_FEATURE.salesOrder.light}
                darkSrc={LANDING_THEME_IMAGES_BY_FEATURE.salesOrder.dark}
                alt={isId ? "Tampilan purchasing SalesView" : "SalesView purchasing interface"}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            </div>
          </div>
        </section>

        <section className="bg-secondary/20 py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14 md:mb-20 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-5">
                {isId ? "Purchasing yang siap dipakai harian" : "Purchasing ready for daily execution"}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                {isId
                  ? "Bagian ini menampilkan alur inti pengadaan berdasarkan kebutuhan operasional nyata."
                  : "This section presents core procurement flow based on real operational needs."}
              </p>
            </div>

            <div className="space-y-20 md:space-y-24">
              {featureBlocks.map((feature, index) => {
                const useScreenshot = Boolean(feature.screenshotKey);
                const reverse = index % 2 === 0;

                return (
                  <div
                    id={feature.id}
                    key={feature.id}
                    className={`scroll-mt-32 flex flex-col gap-12 lg:gap-20 items-center ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}
                  >
                    <div className="lg:w-1/2 w-full">
                      <div className="aspect-video rounded-3xl overflow-hidden bg-background border border-border shadow-sm p-6 md:p-8 flex items-center justify-center relative">
                        {useScreenshot ? (
                          <ThemeAwareImage
                            lightSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].light}
                            darkSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].dark}
                            alt={feature.title}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        ) : feature.placeholder === "vendorPanel" ? (
                          <div className="w-full h-full border border-border/50 rounded-xl p-4 space-y-3">
                            {[1, 2, 3, 4].map((item) => (
                              <div key={item} className="rounded-md bg-secondary/60 border border-border/40 p-3 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/20 shrink-0" />
                                <div className="space-y-2 w-full">
                                  <div className="h-2 w-1/3 bg-muted rounded" />
                                  <div className="h-2 w-2/3 bg-muted rounded" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
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
                              <div className="h-20 rounded-md bg-card border border-border/50 p-3 flex items-center justify-between">
                                <div className="h-3 w-1/3 bg-muted rounded" />
                                <div className="h-8 w-20 bg-primary/70 rounded" />
                              </div>
                            </div>
                            <div className="col-span-2 border-l border-border/50 pl-4 space-y-3">
                              {[1, 2, 3].map((item) => (
                                <div key={item} className="rounded-md bg-secondary/60 border border-border/40 p-2">
                                  <div className="h-2 w-2/3 bg-muted rounded mb-2" />
                                  <div className="h-2 w-full bg-muted rounded" />
                                </div>
                              ))}
                              <div className="h-9 rounded-md bg-primary/80" />
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
                      {feature.descriptionSecondary ? (
                        <p className="text-lg text-muted-foreground font-light leading-relaxed">
                          {feature.descriptionSecondary}
                        </p>
                      ) : null}
                    </div>
                   </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border/50 bg-card p-8 md:p-10 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">SalesView Apps</p>
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              {isId ? "Jelajahi Modul Terkait" : "Explore Related Modules"}
            </h3>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              {isId
                ? "Sambungkan alur procurement dengan inventory dan finance agar pergerakan barang dan biaya tetap sinkron."
                : "Connect procurement with inventory and finance so item movement and cost control stay aligned."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/goods-receipt" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
                {isId ? "Penerimaan Barang" : "Goods Receipt"}
              </Link>
              <Link href="/stock" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
                {isId ? "Inventory" : "Inventory"}
              </Link>
              <Link href="/accounting" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
                {isId ? "Accounting" : "Accounting"}
              </Link>
              <Link href="/reconciliation" className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
                {isId ? "Rekonsiliasi" : "Reconciliation"}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            {isId ? "Procurement yang sinkron dengan operasional" : "Procurement synced with operations"}
          </h2>
          <div className="pt-12">
            <Link
              href="/register"
              className="cursor-pointer rounded-full bg-foreground px-8 py-4 text-sm font-medium text-background hover:bg-foreground/90 transition-transform hover:scale-105 inline-flex shadow-xl"
            >
              {isId ? "Lihat fitur purchasing" : "See purchasing features"}
            </Link>
          </div>
        </section>
      </PageMotion>
    </>
  );
}
