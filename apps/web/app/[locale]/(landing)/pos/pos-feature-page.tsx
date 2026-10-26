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
      id: ["software layout meja restoran cafe", "aplikasi floor plan outlet f&b", "sistem visual map meja makan pos", "manajemen area pelayanan restoran", "salesview floor layout"],
      en: ["restaurant table layout software design", "f&b outlet floor plan designer app", "visual table management system pos", "salesview floor layout"],
    },
    schemaDescription: {
      id: "Sistem visual untuk mengatur layout meja dan area layanan POS F&B.",
      en: "Visual system for arranging table layouts and F&B POS service areas.",
    },
    heroTitle: { id: "Desain Layout Meja,", en: "Design Table Layouts," },
    heroAccent: { id: "Operasional Servis Lebih Teratur", en: "Smoother Floor Service" },
    heroDescription: {
      id: "Petakan denah outlet dengan meja, kursi, dinding, dan kasir untuk mempercepat alur dine-in dan cetak QR meja.",
      en: "Map outlet floor plans with tables, chairs, zones, and cashiers to speed up dine-in flow and print table QRs.",
    },
    heroImageAlt: { id: "Tampilan layout meja POS SalesView", en: "SalesView POS floor layout interface" },
    heroImageKey: "posFloorLayoutHero",
    introTitle: { id: "Layanan dine-in lebih cepat dan terkoordinasi", en: "Faster, better coordinated dine-in service" },
    introDescription: {
      id: "Floor layout membantu tim menyusun posisi meja secara visual dan menerbitkan QR pemesanan dari satu tempat.",
      en: "Floor layout helps teams design table positions visually and publish ordering QR codes from one place.",
    },
    featureBlocks: [
      {
        title: { id: "Visual canvas layout meja", en: "Visual canvas table layout" },
        description: {
          id: "Susun meja bundar, meja persegi, partisi, kasir, dan zona servis lewat editor kanvas interaktif.",
          en: "Arrange round tables, square tables, partitions, cashiers, and zones through an interactive canvas editor.",
        },
        screenshotKey: "posFloorLayoutCanvasEditor",
      },
      {
        title: { id: "Status meja dan publish versi", en: "Table status and version publishing" },
        description: {
          id: "Simpan draft dan publish versi layout terbaru agar perubahan posisi meja segera aktif di kasir.",
          en: "Save drafts and publish layout versions so table updates activate instantly at cash registers.",
        },
        screenshotKey: "posFloorLayoutVersionPublish",
      },
      {
        title: { id: "Cetak QR token per meja", en: "Print QR tokens per table" },
        description: {
          id: "Generate dan cetak token QR unik untuk setiap meja agar pesanan mandiri tamu langsung teridentifikasi.",
          en: "Generate and print unique QR tokens for each table so guest self-orders map accurately.",
        },
        screenshotKey: "posFloorLayoutTableQr",
      },
    ],
    finalTitle: { id: "Mulai rapikan tata letak meja restoran Anda", en: "Start organizing your restaurant tables today" },
    finalPoints: [
      {
        title: { id: "Pramusaji lebih efisien", en: "More efficient waitstaff" },
        description: {
          id: "Posisi meja jelas memudahkan tim mengantar pesanan ke nomor meja yang tepat tanpa kebingungan.",
          en: "Clear table mapping helps teams deliver orders to correct table numbers without confusion.",
        },
      },
      {
        title: { id: "Sinkron dengan POS dan QR", en: "Synced with POS and QR" },
        description: {
          id: "Setiap perubahan denah meja langsung terhubung ke kasir dan sistem self order.",
          en: "Every floor plan adjustment links directly to POS terminals and self-order links.",
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
      id: ["aplikasi self order scan qr restoran", "menu digital qr code cafe online", "sistem pemesanan mandiri meja pelanggan", "cara buat qr menu rumah makan", "salesview self order"],
      en: ["restaurant qr self ordering system", "digital menu catalog scanning app", "table customer order automation pos", "salesview self order"],
    },
    schemaDescription: {
      id: "Sistem self order berbasis QR untuk pelanggan restoran dan cafe.",
      en: "QR-based self ordering system for restaurant and cafe customers.",
    },
    heroTitle: { id: "Pemesanan Mandiri QR,", en: "Contactless QR Ordering," },
    heroAccent: { id: "Langsung dari Meja Tamu", en: "Direct from Guest Tables" },
    heroDescription: {
      id: "Tamu cukup memindai kode QR di meja untuk membuka menu digital, memilih item, dan membayar tanpa antre di kasir.",
      en: "Guests scan the table QR code to browse digital menus, pick items, and pay without waiting in line.",
    },
    heroImageAlt: { id: "Tampilan self order POS SalesView", en: "SalesView POS self order interface" },
    heroImageKey: "posSelfOrderHero",
    introTitle: { id: "Pangkas waktu antre dan percepat perputaran meja", en: "Eliminate wait lines and turn tables faster" },
    introDescription: {
      id: "Pesanan masuk langsung ke dapur dan kasir secara terstruktur dengan pilihan bayar QRIS atau kasir.",
      en: "Orders route directly to kitchen and cashier terminals with QRIS or counter payment options.",
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
      id: ["aplikasi feedback pelanggan scan qr struk", "software rating kepuasan konsumen outlet", "sistem pengumpulan kuesioner kasir pos", "kuesioner ulasan pembeli offline", "salesview qr review"],
      en: ["receipt qr customer feedback software", "outlet satisfaction rating collection tool", "pos customer survey response system", "salesview qr review"],
    },
    schemaDescription: {
      id: "Sistem pengumpulan review pelanggan melalui QR/barcode setelah transaksi POS.",
      en: "System for collecting customer reviews through QR/barcode after POS transactions.",
    },
    heroTitle: { id: "Kumpulkan Ulasan Tamu,", en: "Collect Guest Reviews," },
    heroAccent: { id: "Tingkatkan Kualitas Layanan Outlet", en: "Elevate Outlet Service Quality" },
    heroDescription: {
      id: "Kumpulkan rating dan masukan pelanggan melalui QR struk untuk memantau kepuasan cabang secara real-time.",
      en: "Collect ratings and customer feedback through receipt QRs to monitor outlet satisfaction in real time.",
    },
    heroImageAlt: { id: "Tampilan QR review POS SalesView", en: "SalesView POS QR review interface" },
    heroImageKey: "posQrReviewHero",
    introTitle: { id: "Dengar respon pelanggan langsung setelah bertransaksi", en: "Hear customer feedback right after checkout" },
    introDescription: {
      id: "Sistem review berbasis token memudahkan pelanggan memberi masukan tanpa perlu registrasi atau unduh aplikasi.",
      en: "Token-based feedback allows guests to share ratings easily without downloading apps or registering.",
    },
    featureBlocks: [
      {
        title: { id: "Scan QR struk langsung di meja", en: "Instant receipt QR scanning" },
        description: {
          id: "Tamu memindai QR code unik di struk atau meja untuk langsung mengisi formulir penilaian pelayanan.",
          en: "Guests scan a unique QR code on receipts or tables to fill out service evaluation forms.",
        },
        screenshotKey: "posQrReviewPublicForm",
      },
      {
        title: { id: "Kustomisasi form penilaian", en: "Customizable feedback forms" },
        description: {
          id: "Sesuaikan pertanyaan rating bintang, pilihan ganda rasa makanan, dan kolom saran lewat form builder terpadu.",
          en: "Customize star ratings, food taste choices, and suggestion boxes through an intuitive form builder.",
        },
        screenshotKey: "posQrReviewFormBuilder",
      },
      {
        title: { id: "Pantau tren kepuasan per cabang", en: "Track branch satisfaction trends" },
        description: {
          id: "Analisis skor rata-rata per outlet dan identifikasi kendala operasional sebelum keluhan menyebar.",
          en: "Analyze average outlet scores and resolve operational bottlenecks before complaints escalate.",
        },
        screenshotKey: "posQrReviewResponseList",
      },
    ],
    finalTitle: { id: "Dengarkan suara pelanggan di setiap transaksi", en: "Listen to customers on every single order" },
    finalPoints: [
      {
        title: { id: "Feedback masuk seketika", en: "Instant incoming feedback" },
        description: {
          id: "Data ulasan langsung tercatat dan dapat ditinjau oleh manajer outlet secara berkala.",
          en: "Review entries log instantly and can be reviewed by outlet managers periodically.",
        },
      },
      {
        title: { id: "Perbaikan standar layanan", en: "Service standard elevation" },
        description: {
          id: "Gunakan data kepuasan nyata untuk melatih pramusaji dan meningkatkan mutu sajian.",
          en: "Use genuine customer satisfaction metrics to train waitstaff and improve food quality.",
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
      id: ["aplikasi kasir pos offline tanpa internet", "software kasir antrian sinkronisasi lokal", "pos offline transaction queue system", "aplikasi kasir hemat kuota internet", "salesview offline support"],
      en: ["offline mode point of sale software", "cashier local sync transaction queue app", "unstable connection pos backup system", "salesview offline support"],
    },
    schemaDescription: {
      id: "Dukungan offline untuk aplikasi POS: banner koneksi, transaksi tunai antrian, dan sinkronisasi ulang saat online.",
      en: "Offline support for POS app: connection banner, queued cash transactions, and re-sync when back online.",
    },
    heroTitle: { id: "Kasir Tetap Berjalan,", en: "Cashier Keeps Running," },
    heroAccent: { id: "Bahkan Saat Koneksi Putus", en: "Even When Offline" },
    heroDescription: {
      id: "Antrean transaksi tunai tersimpan aman di perangkat lokal dan disinkronkan otomatis ke server saat internet pulih.",
      en: "Cash transactions stay safe in local device queues and automatically sync to cloud once connection restores.",
    },
    heroImageAlt: { id: "Tampilan mode offline aplikasi POS SalesView", en: "SalesView POS app offline mode interface" },
    heroImageKey: "posOfflineSupportHero",
    introTitle: { id: "Operasional kasir tanpa henti di jam sibuk", en: "Uninterrupted cashier operations during peak hours" },
    introDescription: {
      id: "Jaga kelancaran antrean pelanggan meskipun koneksi WiFi atau seluler outlet sedang mengalami gangguan.",
      en: "Keep customer queues moving smoothly even when outlet WiFi or mobile data fluctuates.",
    },
    featureBlocks: [
      {
        title: { id: "Indikator koneksi transparan", en: "Transparent connectivity indicator" },
        description: {
          id: "Status offline terlihat jelas pada header kasir sehingga tim mengetahui kapan transaksi berjalan lokal.",
          en: "Offline banner indicates local mode clearly so cashiers know exactly when orders queue locally.",
        },
        screenshotKey: "posOfflineSupportOfflineBanner",
      },
      {
        title: { id: "Antrean sinkronisasi otomatis", en: "Automated sync queue" },
        description: {
          id: "Semua struk dan transaksi tunai tersimpan di antrean lokal dengan jumlah pending order yang terpantau.",
          en: "All receipts and cash orders queue locally with pending order counts always visible.",
        },
        screenshotKey: "posOfflineSupportQueuedOrders",
      },
    ],
    finalTitle: { id: "Hindari antrean macet akibat internet bermasalah", en: "Prevent stalled checkout lines from network drops" },
    finalPoints: [
      {
        title: { id: "Transaksi tunai tetap lancar", en: "Smooth cash checkouts" },
        description: {
          id: "Kasir tetap dapat mencetak struk dan menerima pembayaran tunai tanpa menunggu loading internet.",
          en: "Cashiers keep issuing receipts and taking cash payments without waiting for slow connections.",
        },
      },
      {
        title: { id: "Sinkronisasi aman tanpa duplikasi", en: "Safe deduplicated syncing" },
        description: {
          id: "Begitu perangkat tersambung kembali, seluruh antrean transaksi otomatis diposting ke database pusat.",
          en: "Once devices reconnect, all pending orders post automatically to central cloud records.",
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


