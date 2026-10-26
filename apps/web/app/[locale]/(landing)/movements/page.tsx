import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FeatureLandingPage } from "@/components/landing/feature-landing-page";
import { buildLandingMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  return buildLandingMetadata({
    locale,
    path: "/movements",
    title:
      locale === "id"
        ? "Sistem Pergerakan Stok (IN, OUT, Transfer, Adjust) | Audit Mutasi Gudang | SalesView"
        : "Stock Movement System (IN, OUT, Transfer, Adjust) | Warehouse Mutation Audit | SalesView",
    description:
      locale === "id"
        ? "Catat empat jenis mutasi stok IN, OUT, ADJUST, dan TRANSFER antar gudang dengan filter lengkap, detail qty in/out/balance, dan tautan referensi ke delivery order, goods receipt, dan stock opname."
        : "Record four stock movement types IN, OUT, ADJUST, and inter-warehouse TRANSFER with full filters, qty in/out/balance detail, and reference links to delivery orders, goods receipt, and stock opname.",
    keywords:
      locale === "id"
        ? [
            "software transfer stok antar gudang",
            "aplikasi mutasi barang internal perusahaan",
            "sistem pelacakan pengiriman stok logistik",
            "aplikasi kontrol stok multi cabang",
            "salesview stock movements",
          ]
        : [
            "multi warehouse stock transfer software",
            "internal inventory movement tracking tool",
            "stock relocation management system",
            "salesview stock movements",
          ],
    imageAlt: "SalesView stock movements tracking overview",
  });
}

export default async function MovementsLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isId = locale === "id";

  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://salesview.id/${locale}/movements#product`,
    name: "SalesView Movements",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: isId
      ? "Sistem pencatatan pergerakan stok: IN, OUT, ADJUST, dan TRANSFER antar gudang dengan audit trail dan referensi dokumen."
      : "Stock movement tracking system: IN, OUT, ADJUST, and inter-warehouse TRANSFER with audit trail and document references.",
    url: `https://salesview.id/${locale}/movements`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
      <FeatureLandingPage
        locale={locale}
        label="SalesView Movements"
        heroTitle={isId ? "Pergerakan Stok &" : "Stock Movements &"}
        heroAccent={isId ? "Mutasi Barang Antar Gudang" : "Inter-Warehouse Transfers"}
        heroDescription={
          isId
            ? "Lacak mutasi masuk, keluar, transfer antar gudang, dan penyesuaian stok dengan jejak dokumen sumber yang transparan."
            : "Track inbound, outbound, inter-warehouse transfers, and adjustments with complete source document trails."
        }
        heroImageAlt={isId ? "Tampilan pergerakan stok SalesView" : "SalesView stock movements interface"}
        heroImageKey="movementHero"
        introTitle={isId ? "Visibilitas perputaran logistik barang masuk dan keluar" : "Complete visibility over inbound and outbound logistics"}
        introDescription={
          isId
            ? "Ketahui perjalanan setiap item dari penerimaan awal hingga pengiriman ke pelanggan dengan buku besar mutasi real-time."
            : "Follow the precise path of each product from receiving dock to final customer delivery with real-time mutation logs."
        }
        featureBlocks={[
          {
            title: isId ? "Empat jenis mutasi stok terintegrasi" : "Four integrated stock movement types",
            description: isId
              ? "Catat mutasi IN barang masuk, OUT pengiriman penjualan, ADJUST penyesuaian opname, dan TRANSFER antar gudang dalam satu catatan terpadu."
              : "Log IN receipts, OUT sales dispatches, ADJUST opname variances, and inter-warehouse TRANSFERS in one centralized register.",
            screenshotKey: "movementList",
            placeholder: "multiOutlet",
          },
          {
            title: isId ? "Penyaringan multi-lokasi dan periode" : "Multi-location and date range filtering",
            description: isId
              ? "Saring riwayat mutasi berdasarkan lokasi gudang, SKU produk, dan rentang tanggal untuk audit rekonsiliasi yang cepat."
              : "Filter historical movements by warehouse site, product SKU, and specific date windows for rapid audit reconciliations.",
            screenshotKey: "movementFilter",
            placeholder: "terminalFlow",
          },
          {
            title: isId ? "Rincian mutasi tersambung ke dokumen sumber" : "Movement lines linked to source documents",
            description: isId
              ? "Klik baris transaksi untuk melihat kuantitas, nilai per unit, saldo berjalan, serta tautan ke delivery order atau goods receipt terkait."
              : "Click any mutation entry to view quantities, unit costs, running balances, and direct links to origin delivery orders or goods receipts.",
            descriptionSecondary: isId
              ? "Setiap pergerakan barang otomatis sinkron dengan jurnal persediaan akuntansi."
              : "Every physical stock movement posts synchronistic entries to accounting inventory ledgers.",
            screenshotKey: "movementDetail",
            placeholder: "scorecardFlow",
          },
        ]}
        finalTitle={isId ? "Kendalikan pergerakan barang gudang Anda sekarang" : "Secure total oversight over inventory movements today"}
        finalPoints={[
          {
            title: isId ? "Kendali mutasi transparan" : "Transparent movement control",
            description: isId
              ? "Pantau keluar masuk barang secara akurat tanpa estimasi manual."
              : "Monitor inbound and outbound flow accurately without manual guesswork.",
          },
          {
            title: isId ? "Ketertelusuran akuntansi" : "Financial traceability",
            description: isId
              ? "Nilai mutasi stok langsung terhubung ke buku besar dan laporan harga pokok penjualan."
              : "Inventory movement values reflect instantly in ledgers and cost-of-goods-sold reporting.",
          },
        ]}
        finalCtaLabel={isId ? "Mulai Uji Coba Gratis" : "Start Free Trial"}
        finalCtaHref="/register"
      />
    </>
  );
}
