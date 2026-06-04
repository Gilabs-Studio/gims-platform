import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import type { LandingScreenshotKey } from "@/lib/landing-theme-images";
import { buildLandingMetadata } from "@/lib/seo";

type PosFeatureConfig = {
  path: string;
  label: string;
  title: { id: string; en: string };
  description: { id: string; en: string };
  keywords: { id: string[]; en: string[] };
  schemaDescription: { id: string; en: string };
  heroTitle: { id: string; en: string };
  heroAccent: { id: string; en: string };
  heroDescription: { id: string; en: string };
  heroImageAlt: { id: string; en: string };
  heroImageKey: LandingScreenshotKey;
  introTitle: { id: string; en: string };
  introDescription: { id: string; en: string };
  featureBlocks: Array<{
    title: { id: string; en: string };
    description: { id: string; en: string };
    descriptionSecondary?: { id: string; en: string };
    screenshotKey: LandingScreenshotKey;
  }>;
  finalTitle: { id: string; en: string };
  finalPoints: [
    { title: { id: string; en: string }; description: { id: string; en: string } },
    { title: { id: string; en: string }; description: { id: string; en: string } },
  ];
  finalCtaLabel: { id: string; en: string };
};

export const POS_FEATURES = {
  floorLayout: {
    path: "/pos/floor-layout",
    label: "SalesView POS Floor Layout",
    title: {
      id: "Software Layout Meja Restoran & Cafe | SalesView",
      en: "Restaurant & Cafe Floor Layout Software | SalesView",
    },
    description: {
      id: "Atur layout meja, area layanan, dan status dine-in secara visual agar operasional restoran berjalan lebih rapi.",
      en: "Arrange table layouts, service areas, and dine-in status visually so restaurant operations stay organized.",
    },
    keywords: {
      id: ["layout meja restoran", "floor layout cafe", "software meja restoran", "pos f&b", "salesview floor layout"],
      en: ["restaurant floor layout", "cafe table layout", "table management software", "f&b pos", "salesview floor layout"],
    },
    schemaDescription: {
      id: "Sistem visual untuk mengatur layout meja dan area layanan POS F&B.",
      en: "Visual system for arranging table layouts and F&B POS service areas.",
    },
    heroTitle: { id: "Atur Setiap Meja", en: "Design Every Table" },
    heroAccent: { id: "Dengan Alur Lebih Rapi", en: "Around Better Flow" },
    heroDescription: {
      id: "Buat floor plan per outlet dengan meja, kursi, dinding, pintu, area, dekorasi, dan titik kasir supaya layout dine-in sesuai bentuk outlet.",
      en: "Create outlet floor plans with tables, chairs, walls, doors, zones, decorations, and cashier points so dine-in layout matches outlet shape.",
    },
    heroImageAlt: { id: "Tampilan layout meja POS SalesView", en: "SalesView POS floor layout interface" },
    heroImageKey: "posFloorLayoutHero",
    introTitle: { id: "Buat layanan dine-in terasa lebih terkoordinasi", en: "Make dine-in service feel more coordinated" },
    introDescription: {
      id: "Floor layout membantu tim membuat, menyimpan, mem-publish, dan mencetak QR meja dari layout outlet yang sama.",
      en: "Floor layout helps teams create, save, publish, and print table QR codes from the same outlet layout.",
    },
    featureBlocks: [
      {
        title: { id: "Layout meja visual", en: "Visual table layout" },
        description: {
          id: "Tambahkan meja bundar/persegi, kursi, dinding, pintu, area, dekorasi, dan kasir lewat canvas editor.",
          en: "Add round/square tables, chairs, walls, doors, zones, decorations, and cashier points through canvas editor.",
        },
        screenshotKey: "posFloorLayoutCanvasEditor",
      },
      {
        title: { id: "Status meja real-time", en: "Real-time table status" },
        description: {
          id: "Simpan draft layout, publish floor plan, dan kelola versi layout agar perubahan outlet tetap terkontrol.",
          en: "Save layout drafts, publish floor plans, and manage layout versions so outlet changes stay controlled.",
        },
        screenshotKey: "posFloorLayoutVersionPublish",
      },
      {
        title: { id: "Cocok untuk banyak area", en: "Built for multiple areas" },
        description: {
          id: "Generate dan print QR token untuk tiap meja agar pelanggan bisa membuka self order dari meja yang benar.",
          en: "Generate and print QR tokens for each table so customers can open self order from the correct table.",
        },
        screenshotKey: "posFloorLayoutTableQr",
      },
    ],
    finalTitle: { id: "Siap membuat floor service lebih tenang?", en: "Ready to make floor service calmer?" },
    finalPoints: [
      {
        title: { id: "Waiter lebih cepat bergerak", en: "Waiters move faster" },
        description: {
          id: "Tim dapat membangun layout outlet memakai object canvas yang sesuai kebutuhan F&B.",
          en: "Teams can build outlet layouts with canvas objects built for F&B needs.",
        },
      },
      {
        title: { id: "Kasir tetap sinkron", en: "Cashiers stay synced" },
        description: {
          id: "QR meja dari layout menghubungkan pelanggan ke halaman self order publik.",
          en: "Table QR from layout connects customers to public self-order pages.",
        },
      },
    ],
    finalCtaLabel: { id: "Coba Layout Meja Gratis", en: "Try Floor Layout Free" },
  },
  selfOrder: {
    path: "/pos/self-order",
    label: "SalesView POS Self Order",
    title: { id: "Self Order QR untuk Restoran & Cafe | SalesView", en: "QR Self Order for Restaurants & Cafes | SalesView" },
    description: {
      id: "Biarkan pelanggan scan QR, pilih menu, dan kirim pesanan langsung ke operasional outlet.",
      en: "Let customers scan QR codes, choose menu items, and send orders directly to outlet operations.",
    },
    keywords: {
      id: ["self order qr", "pesan mandiri restoran", "qr menu cafe", "pos self order", "salesview self order"],
      en: ["qr self order", "restaurant self ordering", "qr menu cafe", "pos self order", "salesview self order"],
    },
    schemaDescription: {
      id: "Sistem self order berbasis QR untuk pelanggan restoran dan cafe.",
      en: "QR-based self ordering system for restaurant and cafe customers.",
    },
    heroTitle: { id: "Biarkan Pelanggan", en: "Let Customers" },
    heroAccent: { id: "Pesan Sendiri", en: "Order Themselves" },
    heroDescription: {
      id: "Pelanggan membuka link QR meja, melihat katalog POS, memasukkan item ke cart, lalu memilih QRIS atau bayar di kasir.",
      en: "Customers open table QR links, browse POS catalog, add items to cart, then choose QRIS or pay at cashier.",
    },
    heroImageAlt: { id: "Tampilan self order POS SalesView", en: "SalesView POS self order interface" },
    heroImageKey: "posSelfOrderHero",
    introTitle: { id: "Kurangi antrean, percepat order masuk", en: "Reduce queues and speed up incoming orders" },
    introDescription: {
      id: "Self order memakai token meja publik, cart, checkout, status order, cancel order, QRIS, dan pay-at-cashier dalam alur pelanggan.",
      en: "Self order uses public table tokens, cart, checkout, order status, cancel order, QRIS, and pay-at-cashier in customer flow.",
    },
    featureBlocks: [
      {
        title: { id: "QR untuk tiap meja", en: "QR for every table" },
        description: {
          id: "QR meja memakai token publik sehingga halaman pelanggan tahu outlet dan label meja yang sedang dipakai.",
          en: "Table QR uses public tokens so customer page knows active outlet and table label.",
        },
        screenshotKey: "posSelfOrderTableToken",
      },
      {
        title: { id: "Menu digital mudah dibaca", en: "Readable digital menu" },
        description: {
          id: "Pelanggan melihat katalog, menambah item, mengubah quantity, memberi catatan, dan melihat subtotal, pajak, service charge, serta total.",
          en: "Customers browse catalog, add items, change quantity, add notes, and see subtotal, tax, service charge, and total.",
        },
        screenshotKey: "posSelfOrderMenuCart",
      },
      {
        title: { id: "Order masuk ke tim outlet", en: "Orders flow to outlet teams" },
        description: {
          id: "Setelah checkout, pelanggan dapat membayar QRIS, memilih bayar di kasir, melihat status order, cancel, atau order lagi.",
          en: "After checkout, customers can pay with QRIS, choose pay at cashier, view order status, cancel, or order again.",
        },
        screenshotKey: "posSelfOrderPaymentStatus",
      },
    ],
    finalTitle: { id: "Siap menerima order lebih cepat?", en: "Ready to receive orders faster?" },
    finalPoints: [
      {
        title: { id: "Waiter fokus ke servis", en: "Waiters focus on service" },
        description: {
          id: "Tim bisa fokus mengantar makanan, menjawab pertanyaan, dan menjaga pengalaman tamu.",
          en: "Teams can focus on serving food, answering questions, and maintaining guest experience.",
        },
      },
      {
        title: { id: "Kesalahan input berkurang", en: "Input mistakes drop" },
        description: {
          id: "Pelanggan memilih sendiri item dan catatan sehingga miskomunikasi lebih mudah ditekan.",
          en: "Customers choose items and notes themselves, reducing miscommunication.",
        },
      },
    ],
    finalCtaLabel: { id: "Coba Self Order Gratis", en: "Try Self Order Free" },
  },
  qrReview: {
    path: "/pos/qr-review",
    label: "SalesView POS QR Review",
    title: { id: "QR Review Pelanggan untuk POS | SalesView", en: "Customer QR Review for POS | SalesView" },
    description: {
      id: "Kumpulkan rating dan ulasan pelanggan lewat QR setelah transaksi agar feedback outlet lebih mudah dipantau.",
      en: "Collect customer ratings and reviews through QR codes after transactions so outlet feedback is easier to monitor.",
    },
    keywords: {
      id: ["qr review pelanggan", "review barcode pos", "feedback restoran", "rating pelanggan", "salesview qr review"],
      en: ["customer qr review", "pos barcode review", "restaurant feedback", "customer rating", "salesview qr review"],
    },
    schemaDescription: {
      id: "Sistem pengumpulan review pelanggan melalui QR/barcode setelah transaksi POS.",
      en: "System for collecting customer reviews through QR/barcode after POS transactions.",
    },
    heroTitle: { id: "Ubah Setiap Struk", en: "Turn Every Receipt" },
    heroAccent: { id: "Menjadi Feedback", en: "Into Feedback" },
    heroDescription: {
      id: "Bagikan link feedback publik berbasis token agar pelanggan mengisi form rating dan komentar setelah pengalaman outlet selesai.",
      en: "Share public token-based feedback links so customers fill rating and comment forms after outlet experience.",
    },
    heroImageAlt: { id: "Tampilan QR review POS SalesView", en: "SalesView POS QR review interface" },
    heroImageKey: "posQrReviewHero",
    introTitle: { id: "Dengar pelanggan sebelum masalah membesar", en: "Hear customers before problems grow" },
    introDescription: {
      id: "Feedback POS menyediakan form builder, link publik, submit response, dan halaman response list untuk membaca masukan pelanggan.",
      en: "POS feedback provides form builder, public links, response submit, and response list pages for reading customer input.",
    },
    featureBlocks: [
      {
        title: { id: "Scan QR setelah transaksi", en: "Scan QR after checkout" },
        description: {
          id: "Pelanggan membuka link feedback publik dari token dan mengisi form tanpa perlu login atau instal aplikasi.",
          en: "Customers open public feedback token links and fill forms without logging in or installing an app.",
        },
        screenshotKey: "posQrReviewPublicForm",
      },
      {
        title: { id: "Rating dan komentar terstruktur", en: "Structured ratings and comments" },
        description: {
          id: "Tim membuat schema form feedback, mengatur field, lalu mengumpulkan jawaban pelanggan secara terstruktur.",
          en: "Teams create feedback form schemas, configure fields, then collect customer answers in structured form.",
        },
        screenshotKey: "posQrReviewFormBuilder",
      },
      {
        title: { id: "Pantau tren kepuasan", en: "Track satisfaction trends" },
        description: {
          id: "Halaman response membantu tim melihat daftar masukan yang masuk dari form feedback outlet.",
          en: "Response page helps teams review incoming feedback from outlet feedback forms.",
        },
        screenshotKey: "posQrReviewResponseList",
      },
    ],
    finalTitle: { id: "Siap menangkap suara pelanggan?", en: "Ready to capture customer voice?" },
    finalPoints: [
      {
        title: { id: "Feedback lebih mudah masuk", en: "Feedback comes in easier" },
        description: {
          id: "Pelanggan punya jalur sederhana untuk menyampaikan pengalaman langsung setelah transaksi.",
          en: "Customers get a simple channel to share their experience right after checkout.",
        },
      },
      {
        title: { id: "Outlet lebih cepat membaik", en: "Outlets improve faster" },
        description: {
          id: "Manajer bisa melihat masalah berulang dan memperbaiki layanan sebelum berdampak luas.",
          en: "Managers can spot repeated issues and fix service before impact grows.",
        },
      },
    ],
    finalCtaLabel: { id: "Coba QR Review Gratis", en: "Try QR Review Free" },
  },
  offlineSupport: {
    path: "/pos/offline-support",
    label: "SalesView POS Offline Support",
    title: { id: "POS Offline Support untuk Koneksi Tidak Stabil | SalesView", en: "POS Offline Support for Unstable Connections | SalesView" },
    description: {
      id: "Tetap proses order POS saat koneksi putus dengan mode offline, antrian sinkronisasi, dan pembayaran tunai yang aman untuk di-sync kembali.",
      en: "Keep POS orders moving when connection drops with offline mode, sync queue, and cash payments that safely sync later.",
    },
    keywords: {
      id: ["pos offline", "kasir offline", "aplikasi kasir tanpa internet", "offline support pos", "salesview offline support"],
      en: ["offline pos", "offline cashier", "pos without internet", "offline support pos", "salesview offline support"],
    },
    schemaDescription: {
      id: "Dukungan offline untuk aplikasi POS: banner koneksi, transaksi tunai antrian, dan sinkronisasi ulang saat online.",
      en: "Offline support for POS app: connection banner, queued cash transactions, and re-sync when back online.",
    },
    heroTitle: { id: "Kasir Tetap Jalan", en: "Cashier Keeps Moving" },
    heroAccent: { id: "Saat Internet Putus", en: "When Internet Drops" },
    heroDescription: {
      id: "Aplikasi POS menyimpan order, item, konfirmasi, dan pembayaran tunai ke antrian lokal saat offline, lalu menyinkronkannya kembali saat koneksi pulih.",
      en: "POS app stores orders, items, confirmations, and cash payments in a local queue while offline, then syncs them when connection returns.",
    },
    heroImageAlt: { id: "Tampilan mode offline aplikasi POS SalesView", en: "SalesView POS app offline mode interface" },
    heroImageKey: "posOfflineSupportHero",
    introTitle: { id: "Offline support untuk aplikasi kasir POS", en: "Offline support for POS cashier app" },
    introDescription: {
      id: "Mode offline POS berfokus pada operasional kasir: status koneksi terlihat jelas, transaksi tunai masuk antrian, dan pembayaran digital tetap membutuhkan koneksi internet.",
      en: "POS offline mode focuses on cashier operations: connection status stays visible, cash transactions enter queue, and digital payments still require internet.",
    },
    featureBlocks: [
      {
        title: { id: "Status offline jelas", en: "Clear offline status" },
        description: {
          id: "Banner mode offline dan chip status di AppBar memberi tahu kasir bahwa transaksi akan disinkronkan saat kembali online.",
          en: "Offline mode banner and AppBar status chip tell cashiers that transactions will sync when connection returns.",
        },
        screenshotKey: "posOfflineSupportOfflineBanner",
      },
      {
        title: { id: "Transaksi masuk antrian", en: "Transactions enter queue" },
        description: {
          id: "Order, item, konfirmasi order, dan pembayaran tunai dapat masuk sync queue lokal; chip menampilkan jumlah antrian yang menunggu sync.",
          en: "Orders, items, order confirmations, and cash payments can enter local sync queue; chip shows queued transaction count waiting for sync.",
        },
        screenshotKey: "posOfflineSupportQueuedOrders",
      },
    ],
    finalTitle: { id: "Siap membuat POS lebih tahan koneksi tidak stabil?", en: "Ready to make POS safer on unstable connections?" },
    finalPoints: [
      {
        title: { id: "Kasir tidak langsung berhenti", en: "Cashier does not stop immediately" },
        description: {
          id: "Tim tetap bisa mencatat transaksi tunai penting saat koneksi outlet bermasalah.",
          en: "Teams can keep recording important cash transactions when outlet connection has issues.",
        },
      },
      {
        title: { id: "Sync tetap terpantau", en: "Sync stays visible" },
        description: {
          id: "Jumlah antrian dan proses sinkronisasi tampil di header POS sehingga tim tahu kapan data masih menunggu server.",
          en: "Queue count and sync progress appear in POS header so teams know when data still waits for server.",
        },
      },
    ],
    finalCtaLabel: { id: "Coba Offline Support Gratis", en: "Try Offline Support Free" },
  },} satisfies Record<string, PosFeatureConfig>;

export function createPosFeatureMetadata(feature: PosFeatureConfig) {
  return async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isId = locale === "id";

    return buildLandingMetadata({
      locale,
      path: feature.path,
      title: isId ? feature.title.id : feature.title.en,
      description: isId ? feature.description.id : feature.description.en,
      keywords: isId ? feature.keywords.id : feature.keywords.en,
      imageAlt: feature.heroImageAlt.en,
    });
  };
}

export async function PosFeatureLandingPage({
  params,
  feature,
}: {
  params: Promise<{ locale: string }>;
  feature: PosFeatureConfig;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}${feature.path}#product`,
    name: feature.label,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId ? feature.schemaDescription.id : feature.schemaDescription.en,
    url: `https://salesview.id/${locale}${feature.path}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label={feature.label}
        heroTitle={isId ? feature.heroTitle.id : feature.heroTitle.en}
        heroAccent={isId ? feature.heroAccent.id : feature.heroAccent.en}
        heroDescription={isId ? feature.heroDescription.id : feature.heroDescription.en}
        heroImageAlt={isId ? feature.heroImageAlt.id : feature.heroImageAlt.en}
        heroImageKey={feature.heroImageKey}
        introTitle={isId ? feature.introTitle.id : feature.introTitle.en}
        introDescription={isId ? feature.introDescription.id : feature.introDescription.en}
        featureBlocks={feature.featureBlocks.map((block) => ({
          title: isId ? block.title.id : block.title.en,
          description: isId ? block.description.id : block.description.en,
          descriptionSecondary: block.descriptionSecondary
            ? isId
              ? block.descriptionSecondary.id
              : block.descriptionSecondary.en
            : undefined,
          screenshotKey: block.screenshotKey,
          placeholder: "multiOutlet",
        }))}
        finalTitle={isId ? feature.finalTitle.id : feature.finalTitle.en}
        finalPoints={feature.finalPoints.map((point) => ({
          title: isId ? point.title.id : point.title.en,
          description: isId ? point.description.id : point.description.en,
        })) as [{ title: string; description: string }, { title: string; description: string }]}
        finalCtaLabel={isId ? feature.finalCtaLabel.id : feature.finalCtaLabel.en}
      />
    </>
  );
}


