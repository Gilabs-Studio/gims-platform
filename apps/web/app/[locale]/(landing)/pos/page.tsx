import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { type LandingScreenshotKey } from "@/lib/landing-theme-images";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === "id"
    ? "Software POS Restoran, Cafe & Retail Multi Cabang | SalesView"
    : "POS Software for Restaurants, Cafes & Multi-Outlet Retail | SalesView";
    
  const desc = locale === "id"
    ? "Sistem kasir POS untuk restoran, cafe, dan retail dengan sinkronisasi stok real-time, mode offline, floor plan meja, QR/self-order, serta kontrol multi-cabang."
    : "POS software for restaurants, cafes, and retail with real-time stock sync, offline mode, table floor plans, QR or self-order, and multi-branch control.";

  return buildLandingMetadata({
    locale,
    path: "/pos",
    title,
    description: desc,
    keywords: locale === "id"
      ? [
          "aplikasi kasir restoran cafe multi cabang",
          "software pos retail minimarket sinkron stok",
          "sistem kasir offline online untuk outlet",
          "pos qr order dan layout meja restoran",
          "software point of sale cloud indonesia",
          "salesview pos",
        ]
      : [
          "restaurant cafe pos software with table layout",
          "multi outlet retail pos with inventory sync",
          "offline online point of sale software",
          "qr self order pos system for fnb",
          "salesview pos",
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
    descriptionSecondary?: string;
    screenshotKey?: LandingScreenshotKey;
    placeholder: "terminalFlow" | "multiOutlet";
  }> = [
    {
      title: isId ? "Transaksi cepat, alur kasir tetap rapi" : "Fast checkout with a cleaner cashier flow",
      description: isId
        ? "Gabungkan item, diskon, dan pembayaran dalam satu alur yang ringkas supaya antrean bergerak lebih cepat di jam sibuk."
        : "Combine items, discounts, and payments in one focused flow so queues keep moving during peak hours.",
      descriptionSecondary: isId
        ? "Kasir tetap bisa melayani dengan konsisten karena tampilan terminal dibuat sederhana dan minim langkah berulang."
        : "Cashiers stay consistent because the terminal is built with fewer repetitive steps.",
      screenshotKey: "posTerminalFlow",
      placeholder: "terminalFlow",
    },
    {
      title: isId ? "Live table bantu servis tetap terkontrol" : "Live table keeps service under control",
      description: isId
        ? "Pantau status meja, durasi layanan, dan antrean pesanan secara real-time agar koordinasi tim outlet lebih cepat."
        : "Track table status, service duration, and order queues in real time so outlet teams coordinate faster.",
      screenshotKey: "posLiveTable",
      placeholder: "terminalFlow",
    },
    {
      title: isId ? "Atur layout meja sesuai ritme outlet" : "Design floor layout for each outlet flow",
      description: isId
        ? "Sesuaikan posisi meja dan area layanan supaya alur dine-in lebih efisien untuk jam ramai maupun jam normal."
        : "Arrange table positions and service areas to keep dine-in flow efficient during peak and normal hours.",
      screenshotKey: "posFloorLayout",
      placeholder: "multiOutlet",
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Point of Sale"
        heroTitle={isId ? "Kasir untuk Cafe," : "Point of Sale for Cafes,"}
        heroAccent={isId ? "Restoran & Ritel Multi-Cabang" : "Restaurants & Multi-Outlet Retail"}
        heroDescription={
          isId
            ? "Transaksi cepat, sinkronisasi stok otomatis antar outlet, dan dukungan kasir offline saat jaringan internet terputus."
            : "Fast transactions, automated stock sync across outlets, and offline support when internet drops."
        }
        heroImageAlt={isId ? "Tampilan POS SalesView" : "SalesView POS interface"}
        heroImageKey="posHero"
        introTitle={
          isId
            ? "Pengalaman checkout cepat dan rapi untuk pelanggan"
            : "Deliver fast, reliable checkout for your customers"
        }
        introDescription={
          isId
            ? "Tingkatkan efisiensi kasir dan pastikan setiap transaksi tercatat akurat langsung ke sistem inventaris dan akuntansi."
            : "Increase cashier efficiency and ensure every transaction syncs directly into inventory and accounting."
        }
        featureBlocks={featureBlocks}
        finalTitle={
          isId
            ? "Siap melayani pelanggan Anda lebih cepat dan tertib?"
            : "Ready to serve your customers faster and smoother?"
        }
        finalPoints={[
          {
            title: isId ? "Sesi kasir lebih terkontrol" : "Better cashier session control",
            description: isId
              ? "Buka dan tutup sesi kasir dengan verifikasi modal awal dan akhir untuk mempermudah serah terima shift."
              : "Open and close cashier sessions with starting and closing cash checks for smooth shift handovers.",
          },
          {
            title: isId ? "Pembayaran fleksibel dan instan" : "Flexible, instant payments",
            description: isId
              ? "Dukung pembayaran tunai, QRIS, kartu debit, hingga transfer dengan status pencatatan otomatis."
              : "Support cash, QRIS, debit cards, and bank transfers with instant reconciled records.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba POS Gratis" : "Start Free POS Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
