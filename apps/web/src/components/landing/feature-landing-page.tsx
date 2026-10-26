"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PageMotion } from "@/components/motion/page-motion";
import { Link } from "@/i18n/routing";
import { ThemeAwareImage } from "@/components/landing/theme-aware-image";
import {
  LANDING_THEME_IMAGES_BY_FEATURE,
  type LandingScreenshotKey,
} from "@/lib/landing-theme-images";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export type PlaceholderVariant =
  | "terminalFlow"
  | "multiOutlet"
  | "timelineFlow"
  | "invoiceFlow"
  | "scorecardFlow"
  | "warehouseFlow";

export type FeatureBlock = {
  title: string;
  description: string;
  descriptionSecondary?: string;
  screenshotKey?: LandingScreenshotKey;
  placeholder: PlaceholderVariant;
};

export type FeaturePoint = {
  title: string;
  description: string;
};

type EditorialModuleItem = {
  href: string;
  category: { id: string; en: string };
  title: { id: string; en: string };
  summary: { id: string; en: string };
  screenshotKey: LandingScreenshotKey;
};

const EDITORIAL_CATALOG: EditorialModuleItem[] = [
  // POS Group
  {
    href: "/pos",
    category: { id: "POS & RITEL", en: "POINT OF SALE" },
    title: { id: "Sistem Kasir POS Toko", en: "Store POS System" },
    summary: {
      id: "Kasir cepat dengan sinkronisasi stok instan, barcode scanner, dan rekap shift otomatis.",
      en: "High-speed checkout with instant stock sync, barcode scanning, and shift cash handovers.",
    },
    screenshotKey: "posHero",
  },
  {
    href: "/pos/floor-layout",
    category: { id: "F&B & RESTORAN", en: "F&B & RESTAURANT" },
    title: { id: "Layout Meja Interaktif", en: "Interactive Floor Layout" },
    summary: {
      id: "Visualisasikan denah meja, pesanan aktif tiap meja, dan status billing secara real-time.",
      en: "Visualize floor plans, active orders per table, and billing status in real-time.",
    },
    screenshotKey: "posFloorLayoutHero",
  },
  {
    href: "/pos/self-order",
    category: { id: "ORDER DIGITAL", en: "DIGITAL ORDERING" },
    title: { id: "Self Order QR Meja", en: "QR Self Order" },
    summary: {
      id: "Pelanggan pesan dan bayar langsung dari smartphone tanpa perlu antre di kasir.",
      en: "Guests order and pay directly from smartphones without waiting in cashier lines.",
    },
    screenshotKey: "posSelfOrderHero",
  },
  {
    href: "/pos/offline-support",
    category: { id: "KASIR RESILIEN", en: "OFFLINE FIRST" },
    title: { id: "Ketahanan Mode Offline", en: "Offline Mode Resilience" },
    summary: {
      id: "Tetap memproses penjualan saat internet terputus, sinkronisasi otomatis saat online kembali.",
      en: "Keep processing sales when internet drops, auto-syncing transactions once reconnected.",
    },
    screenshotKey: "posOfflineSupportHero",
  },
  {
    href: "/pos/qr-review",
    category: { id: "LOYALITAS & RATING", en: "CUSTOMER FEEDBACK" },
    title: { id: "Ulasan Pelanggan QR", en: "QR Customer Review" },
    summary: {
      id: "Kumpulkan feedback langsung di meja untuk meningkatkan kualitas layanan outlet.",
      en: "Capture on-table guest reviews to boost service satisfaction across outlets.",
    },
    screenshotKey: "posQrReviewHero",
  },

  // CRM & Sales Group
  {
    href: "/crm",
    category: { id: "SALES & CRM", en: "CRM & SALES" },
    title: { id: "Monitoring Sales & Pipeline", en: "Field Sales & Pipeline" },
    summary: {
      id: "Lacak pipeline prospek, geofencing kunjungan sales lapangan, dan histori interaksi klien.",
      en: "Track deal pipelines, field sales GPS check-ins, and complete client touchpoints.",
    },
    screenshotKey: "crmHero",
  },
  {
    href: "/quotations",
    category: { id: "ALUR PENJUALAN", en: "COMMERCIAL" },
    title: { id: "Surat Penawaran Harga", en: "Quotations & Estimates" },
    summary: {
      id: "Susun proposal penawaran harga resmi dan konversikan ke sales order dalam 1 klik.",
      en: "Generate price quotations and convert them to confirmed sales orders in one click.",
    },
    screenshotKey: "quotationsHero",
  },
  {
    href: "/sales",
    category: { id: "DISTRIBUSI & ORDER", en: "ORDER FULFILLMENT" },
    title: { id: "Order Penjualan (Sales Orders)", en: "Sales Order Management" },
    summary: {
      id: "Kelola order penjualan grosir, verifikasi limit kredit pelanggan, dan jadwal pengiriman.",
      en: "Manage sales orders, enforce customer credit terms, and schedule dispatch routes.",
    },
    screenshotKey: "salesOrderHero",
  },
  {
    href: "/invoicing",
    category: { id: "KEUANGAN", en: "BILLING" },
    title: { id: "Faktur & Tagihan Pelanggan", en: "Invoicing & Receivables" },
    summary: {
      id: "Terbitkan invoice resmi, monitor umur piutang (AR aging), dan konfirmasi pembayaran cepat.",
      en: "Issue official invoices, track accounts receivable aging, and confirm collections.",
    },
    screenshotKey: "invoicingHero",
  },

  // Supply Chain Group
  {
    href: "/stock",
    category: { id: "SUPPLY CHAIN", en: "INVENTORY" },
    title: { id: "Inventaris Multi-Gudang", en: "Multi-Warehouse Inventory" },
    summary: {
      id: "Visibilitas stok presisi di seluruh gudang dengan pelacakan nomor batch dan kedaluwarsa.",
      en: "Precise stock balances across facilities with lot batch and expiration tracking.",
    },
    screenshotKey: "stockInventoryList",
  },
  {
    href: "/goods-receipt",
    category: { id: "LOGISTIK MASUK", en: "INBOUND LOGISTICS" },
    title: { id: "Penerimaan Barang (GR)", en: "Goods Receipt & Inbound" },
    summary: {
      id: "Inspeksi fisik barang masuk terhadap PO supplier sebelum dialokasikan ke stok gudang.",
      en: "Inspect physical goods against supplier POs before shelving into warehouse stock.",
    },
    screenshotKey: "goodsReceiptHero",
  },
  {
    href: "/movements",
    category: { id: "LOGISTIK", en: "STOCK TRANSFERS" },
    title: { id: "Mutasi & Transfer Antar Gudang", en: "Stock Movements & Transfers" },
    summary: {
      id: "Pantau perpindahan barang antar cabang dan transit logistik tanpa potensi selisih stok.",
      en: "Oversee inter-warehouse transfers and transit inventory without variance leaks.",
    },
    screenshotKey: "movementHero",
  },
  {
    href: "/purchase",
    category: { id: "PENGADAAN", en: "PROCUREMENT" },
    title: { id: "Pengadaan & Purchase Order", en: "Purchasing & Procurement" },
    summary: {
      id: "Otomasi purchase requisition ke PO supplier dan pantau estimasi kedatangan barang.",
      en: "Streamline requisition to supplier POs with real-time ETA tracking.",
    },
    screenshotKey: "purchaseHero",
  },

  // Finance Group
  {
    href: "/accounting",
    category: { id: "FINANCE", en: "GENERAL LEDGER" },
    title: { id: "Buku Besar & Jurnal Otomatis", en: "Automated General Ledger" },
    summary: {
      id: "Jurnal transaksi terbentuk otomatis dari POS, faktur penjualan, dan mutasi kas.",
      en: "Auto-post double-entry journals from POS, invoices, and cash movements without manual entry.",
    },
    screenshotKey: "accountingHero",
  },
  {
    href: "/financial-reports",
    category: { id: "EKSEKUTIF", en: "REPORTING" },
    title: { id: "Laporan Laba Rugi & Neraca", en: "Financial Statements" },
    summary: {
      id: "Laporan laba rugi, arus kas, dan neraca konsolidasi siap saji setiap akhir periode.",
      en: "Audit-ready P&L, cash flow statements, and balance sheets at period close.",
    },
    screenshotKey: "financialReportsHero",
  },
  {
    href: "/reconciliation",
    category: { id: "AUDIT KAS", en: "RECONCILIATION" },
    title: { id: "Rekonsiliasi Bank Otomatis", en: "Bank Reconciliation" },
    summary: {
      id: "Cocokkan mutasi rekening bank dengan pencatatan kas internal secara presisi.",
      en: "Match bank statements against internal cash books with automated variance detection.",
    },
    screenshotKey: "reconciliationHero",
  },
  {
    href: "/fixed-assets",
    category: { id: "ASET PERUSAHAAN", en: "ASSET MANAGEMENT" },
    title: { id: "Pencatatan & Depresiasi Aset", en: "Fixed Assets & Depreciation" },
    summary: {
      id: "Jadwalkan penyusutan aset berkala dan lacak lokasi inventaris fisik perusahaan.",
      en: "Automate depreciation schedules and monitor physical company asset assignments.",
    },
    screenshotKey: "fixedAssetsHero",
  },

  // HR Group
  {
    href: "/employees",
    category: { id: "HRIS & SDM", en: "WORKFORCE" },
    title: { id: "Database & Dokumen Karyawan", en: "Employee Master Directory" },
    summary: {
      id: "Kelola profil lengkap staf, struktur organisasi, dan riwayat masa berlaku kontrak.",
      en: "Centralize employee files, org hierarchies, and contract renewal timelines.",
    },
    screenshotKey: "employeeHero",
  },
  {
    href: "/attendance",
    category: { id: "HRIS & SDM", en: "TIME & ATTENDANCE" },
    title: { id: "Presensi Geofence & Shift Kerja", en: "GPS Attendance & Rosters" },
    summary: {
      id: "Absensi anti-fake GPS dengan validasi foto selfie dan pengaturan jadwal shift fleksibel.",
      en: "Anti-mock GPS check-in with selfie validation and multi-shift roster management.",
    },
    screenshotKey: "attendanceHero",
  },
  {
    href: "/recruitment",
    category: { id: "TALENT & HR", en: "RECRUITMENT" },
    title: { id: "Pipeline Rekrutmen & Seleksi", en: "Recruitment & Onboarding" },
    summary: {
      id: "Pantau kandidat pelamar melalui kanban stage hingga konversi otomatis ke karyawan aktif.",
      en: "Track candidates via visual stages to direct conversion into active employee records.",
    },
    screenshotKey: "recruitmentHero",
  },
  {
    href: "/travel-planner",
    category: { id: "OPERASIONAL", en: "BUSINESS TRAVEL" },
    title: { id: "Perjalanan Dinas & Reimburse", en: "Travel Planner & Expenses" },
    summary: {
      id: "Pengajuan izin dinas, approval anggaran tiket/hotel, dan klaim pengeluaran terpadu.",
      en: "Submit trip requests, approve budgets, and reconcile expense receipts cleanly.",
    },
    screenshotKey: "travelHero",
  },
  {
    href: "/evaluation",
    category: { id: "PERFORMA SDM", en: "APPRAISAL" },
    title: { id: "Evaluasi Kinerja & KPI", en: "Performance Appraisals" },
    summary: {
      id: "Penilaian berkala berdasarkan metrik objektif dan indikator kompetensi kerja terukur.",
      en: "Objective reviews based on measurable milestones and competency scorecards.",
    },
    screenshotKey: "evaluationHero",
  },
];

const FEATURE_PATH_BY_LABEL: Record<string, string> = {
  "SalesView Point of Sale": "/pos",
  "SalesView POS Floor Layout": "/pos/floor-layout",
  "SalesView POS Self Order": "/pos/self-order",
  "SalesView POS QR Review": "/pos/qr-review",
  "SalesView POS Offline Support": "/pos/offline-support",
  "SalesView CRM": "/crm",
  "SalesView Accounting": "/accounting",
  "SalesView Financial Reports": "/financial-reports",
  "SalesView Reconciliation": "/reconciliation",
  "SalesView Fixed Assets": "/fixed-assets",
  "SalesView Quotations": "/quotations",
  "SalesView Sales Orders": "/sales",
  "SalesView Invoicing": "/invoicing",
  "SalesView Purchase": "/purchase",
  "SalesView Goods Receipt": "/goods-receipt",
  "SalesView Movements": "/movements",
  "SalesView Inventory": "/stock",
  "SalesView Employees": "/employees",
  "SalesView Attendance": "/attendance",
  "SalesView Recruitment": "/recruitment",
  "SalesView Travel Planner": "/travel-planner",
  "SalesView Evaluation": "/evaluation",
};

function getRelatedEditorialModules(label: string): EditorialModuleItem[] {
  const currentPath = FEATURE_PATH_BY_LABEL[label] || "";
  const lowerLabel = label.toLowerCase();

  // Find priority group
  let targetGroupHrefs: string[] = [];
  if (
    lowerLabel.includes("pos") ||
    lowerLabel.includes("floor") ||
    lowerLabel.includes("self order") ||
    lowerLabel.includes("qr review") ||
    lowerLabel.includes("offline")
  ) {
    targetGroupHrefs = ["/pos", "/pos/floor-layout", "/pos/self-order", "/pos/offline-support", "/pos/qr-review", "/crm", "/stock"];
  } else if (
    lowerLabel.includes("accounting") ||
    lowerLabel.includes("financial") ||
    lowerLabel.includes("reconciliation") ||
    lowerLabel.includes("fixed assets") ||
    lowerLabel.includes("invoicing")
  ) {
    targetGroupHrefs = ["/accounting", "/invoicing", "/financial-reports", "/reconciliation", "/fixed-assets", "/sales", "/purchase"];
  } else if (
    lowerLabel.includes("inventory") ||
    lowerLabel.includes("purchase") ||
    lowerLabel.includes("goods receipt") ||
    lowerLabel.includes("movements") ||
    lowerLabel.includes("stock")
  ) {
    targetGroupHrefs = ["/stock", "/goods-receipt", "/movements", "/purchase", "/sales", "/accounting"];
  } else if (
    lowerLabel.includes("employees") ||
    lowerLabel.includes("attendance") ||
    lowerLabel.includes("recruitment") ||
    lowerLabel.includes("travel planner") ||
    lowerLabel.includes("evaluation")
  ) {
    targetGroupHrefs = ["/employees", "/attendance", "/recruitment", "/travel-planner", "/evaluation", "/accounting"];
  } else {
    targetGroupHrefs = ["/crm", "/quotations", "/sales", "/invoicing", "/stock", "/pos"];
  }

  // Filter out current page and take 4 items
  const matched = EDITORIAL_CATALOG.filter(
    (item) => item.href !== currentPath && targetGroupHrefs.includes(item.href)
  );

  if (matched.length >= 4) {
    return matched.slice(0, 4);
  }

  // Fallback if less than 4
  const others = EDITORIAL_CATALOG.filter(
    (item) => item.href !== currentPath && !matched.some((m) => m.href === item.href)
  );
  return [...matched, ...others].slice(0, 4);
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PlaceholderVisual({ variant }: { variant: PlaceholderVariant }) {
  if (variant === "multiOutlet") {
    return (
      <div className="w-full h-full p-4 md:p-6 grid grid-cols-5 gap-4 bg-muted/10">
        <div className="col-span-3 space-y-3">
          <div className="h-10 bg-secondary/70 border border-border/50" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 bg-secondary/60 border border-border/40 p-2">
                <div className="h-2 w-2/3 bg-muted mb-2" />
                <div className="h-5 w-1/2 bg-foreground/15" />
              </div>
            ))}
          </div>
          <div className="h-32 bg-card border border-border/50 p-3 flex items-end gap-2">
            {[30, 45, 35, 60, 50, 70].map((height, idx) => (
              <div key={idx} className="flex-1 bg-primary/40" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="col-span-2 border-l border-border/50 pl-4 space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-secondary/60 border border-border/40 p-2">
              <div className="h-2 w-2/3 bg-muted mb-2" />
              <div className="h-2 w-full bg-muted" />
            </div>
          ))}
          <div className="h-9 bg-primary/80" />
        </div>
      </div>
    );
  }

  if (variant === "timelineFlow") {
    return (
      <div className="w-full h-full p-6 space-y-3 bg-muted/10">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex items-center gap-3 border border-border/40 p-3 bg-secondary/50">
            <div className="h-8 w-8 bg-primary/25 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2 w-1/3 bg-muted" />
              <div className="h-2 w-2/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "invoiceFlow") {
    return (
      <div className="w-full h-full p-6 space-y-4 bg-muted/10">
        <div className="h-8 w-2/5 bg-secondary" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 bg-secondary/60" />
          <div className="h-10 bg-secondary/60" />
        </div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-8 w-full bg-secondary/50 flex items-center justify-between px-3">
            <div className="h-2 w-1/3 bg-muted" />
            <div className="h-2 w-10 bg-muted" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <div className="h-10 w-32 bg-primary" />
        </div>
      </div>
    );
  }

  if (variant === "scorecardFlow") {
    return (
      <div className="w-full h-full p-6 space-y-4 bg-muted/10">
        <div className="h-8 bg-secondary/70 border border-border/40" />
        {[1, 2, 3].map((item) => (
          <div key={item} className="border border-border/40 p-3 bg-card">
            <div className="h-2 w-1/3 bg-muted mb-3" />
            <div className="h-2 w-full bg-muted mb-2" />
            <div className="h-2 w-2/3 bg-primary/40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-4 bg-muted/10">
      <div className="h-8 bg-secondary/70 border border-border/50" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="border border-border/40 p-3 bg-card flex items-center justify-between">
          <div className="space-y-2 w-2/3">
            <div className="h-2 w-1/2 bg-muted" />
            <div className="h-2 w-full bg-muted" />
          </div>
          <div className="h-8 w-16 bg-primary/30" />
        </div>
      ))}
    </div>
  );
}

/**
 * HorizontalStorytellingShowcase
 * Linear panoramic storytelling track [title1][gambar1][title2][gambar2]...
 * - No numbers in UI
 * - Full-height uncropped images with slight margins, zero rounded border, zero hover effects
 * - Simple minimalism without card containers
 * - Subtle thin vertical dividers between points
 * - Desktop: Sticky vertical scroll driving horizontal track glide
 * - Mobile friendly: Touch snap scroll & fluid responsiveness
 */
function HorizontalStorytellingShowcase({
  introTitle,
  introDescription,
  featureBlocks,
  isId,
}: {
  introTitle: string;
  introDescription: string;
  featureBlocks: FeatureBlock[];
  isId: boolean;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const calculateScroll = () => {
      if (trackRef.current) {
        const trackWidth = trackRef.current.scrollWidth;
        const windowWidth = window.innerWidth;
        const padding = window.innerWidth >= 1024 ? 96 : 32;
        const range = Math.max(0, trackWidth - windowWidth + padding);
        setMaxScroll(range);
      }
    };

    calculateScroll();
    window.addEventListener("resize", calculateScroll);
    return () => window.removeEventListener("resize", calculateScroll);
  }, [featureBlocks]);

  const x = useTransform(scrollYProgress, (pos) => -pos * maxScroll);

  // Height proportional to the number of story points so the scroll speed is natural
  const sectionHeight = `${Math.max(220, featureBlocks.length * 85)}vh`;

  return (
    <section
      ref={targetRef}
      className="relative bg-background border-t border-border/40"
      style={{ height: sectionHeight }}
    >
      <div className="sticky top-0 h-[100dvh] w-full flex flex-col justify-between overflow-hidden py-4 sm:py-6">
        {/* Sticky Header with Title and Scroll Progress */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 shrink-0 pt-2 sm:pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-foreground text-balance">
                {introTitle}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl text-balance">
                {introDescription}
              </p>
            </div>

            {/* Scroll Indicator */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80">
                {isId ? "Alur Fitur" : "Feature Story"}
              </span>
              <div className="w-24 sm:w-36 h-1 rounded-full bg-border overflow-hidden">
                <motion.div
                  style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Track Gliding Across Viewport: [title1][gambar1][title2][gambar2] */}
        <div className="w-full overflow-hidden flex-1 flex items-center my-auto">
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex items-center gap-8 sm:gap-14 pl-6 sm:pl-10 lg:pl-[max(4rem,calc((100vw-80rem)/2+4rem))] pr-24 w-max h-full my-auto"
          >
            {featureBlocks.map((feature, index) => {
              const useScreenshot = Boolean(feature.screenshotKey);

              return (
                <div
                  key={feature.title}
                  className="flex items-center gap-6 sm:gap-12 shrink-0 h-full py-2"
                >
                  {/* [Title + Description Block] - Simple minimalism, NO card container, NO numbers */}
                  <div className="w-[280px] sm:w-[360px] lg:w-[420px] shrink-0 flex flex-col justify-center">
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-foreground leading-[1.12] mb-3 sm:mb-4 text-balance">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    {feature.descriptionSecondary ? (
                      <p className="mt-3 text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
                        {feature.descriptionSecondary}
                      </p>
                    ) : null}
                  </div>

                  {/* [Gambar Block] - Full-height window with slight padding/margins, uncropped, NO rounded border, NO hover effect */}
                  <figure className="h-[55vh] sm:h-[68vh] lg:h-[75vh] aspect-[16/10] shrink-0 relative bg-muted/10 border border-border/80 rounded-none shadow-xs">
                    {useScreenshot ? (
                      <ThemeAwareImage
                        lightSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].light}
                        darkSrc={LANDING_THEME_IMAGES_BY_FEATURE[feature.screenshotKey!].dark}
                        alt={feature.title}
                        fill
                        className="object-contain rounded-none select-none pointer-events-none"
                        sizes="(max-height: 80vh) 120vh, 100vw"
                        fallback={<PlaceholderVisual variant={feature.placeholder} />}
                      />
                    ) : (
                      <PlaceholderVisual variant={feature.placeholder} />
                    )}
                    <figcaption className="sr-only">{feature.title}</figcaption>
                  </figure>

                  {/* [Thin Minimalist Divider] between story points */}
                  {index < featureBlocks.length - 1 && (
                    <div
                      className="w-px h-[45vh] sm:h-[58vh] bg-border/40 shrink-0 self-center mx-2 sm:mx-4"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Bottom subtle guidance */}
        {/* <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 shrink-0 pb-2">
          <div className="text-[11px] font-mono text-muted-foreground/60 flex items-center justify-between">
            <span>{isId ? "Gulir ke bawah untuk menelusuri seluruh fitur" : "Scroll down to explore all features"}</span>
            <span>{featureBlocks.length} {isId ? "Pilar Operasional" : "Operational Pillars"}</span>
          </div>
        </div> */}
      </div>
    </section>
  );
}

type FeatureLandingPageProps = {
  locale: string;
  label: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  heroImageAlt: string;
  heroImageKey: LandingScreenshotKey;
  introTitle: string;
  introDescription: string;
  featureBlocks: FeatureBlock[];
  finalTitle: string;
  finalPoints?: [FeaturePoint, FeaturePoint];
  finalCtaLabel: string;
  finalCtaHref?: string;
};

export function FeatureLandingPage({
  locale,
  label,
  heroTitle,
  heroAccent,
  heroDescription,
  heroImageAlt,
  heroImageKey,
  introTitle,
  introDescription,
  featureBlocks,
  finalTitle,
  finalPoints,
  finalCtaLabel,
  finalCtaHref = "/register",
}: FeatureLandingPageProps) {
  const isId = locale === "id";
  const editorialModules = getRelatedEditorialModules(label);
  const currentPath = FEATURE_PATH_BY_LABEL[label] || `/${label.toLowerCase().replace(/\s+/g, "-")}`;

  const whatsappUrl = `https://wa.me/6281367954062?text=${encodeURIComponent(
    isId
      ? `Halo SalesView, saya tertarik berdiskusi tentang ${label} dan implementasi sistem untuk bisnis saya.`
      : `Hello SalesView, I'd like to discuss ${label} and custom ERP solutions for my business.`
  )}`;

  // JSON-LD Structured Data for Google SEO & AI Search Engine Indexing (Google AI Overviews, SearchGPT, Perplexity)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `https://salesview.id/${locale}${currentPath}#software`,
        "name": `SalesView ${label}`,
        "applicationCategory": "BusinessApplication, EnterpriseResourcePlanning",
        "operatingSystem": "Web Browser, Windows, macOS, iOS, Android",
        "description": heroDescription,
        "url": `https://salesview.id/${locale}${currentPath}`,
        "screenshot": [
          `https://salesview.id${LANDING_THEME_IMAGES_BY_FEATURE[heroImageKey].light}`,
        ],
        "featureList": featureBlocks.map((f) => f.title),
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "IDR",
          "description": isId ? "Uji coba gratis dan konsultasi alur khusus" : "Free trial and custom workflow consultation",
        },
        "publisher": {
          "@type": "Organization",
          "name": "GILABS",
          "url": "https://gilabs.id",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://salesview.id/${locale}${currentPath}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": isId ? "Beranda" : "Home",
            "item": `https://salesview.id/${locale}`,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": isId ? "Modul ERP" : "ERP Modules",
            "item": `https://salesview.id/${locale}#features`,
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": label,
            "item": `https://salesview.id/${locale}${currentPath}`,
          },
        ],
      },
    ],
  };

  return (
    <PageMotion className="flex flex-col min-h-screen bg-background pt-16">
      {/* High-Impact Structured Data for AI & Search Engine Crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main id="main-content" role="main">
        {/* ════════════════════════════════════════════════════════
            1. HERO SECTION (Minimalist, To the Point, Font Medium)
        ════════════════════════════════════════════════════════ */}
        <header className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 sm:px-10 lg:px-16 max-w-5xl mx-auto text-center">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4 inline-block">
            {label}
          </span>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-foreground leading-[1.08] mb-6 text-balance">
            {heroTitle} <br className="hidden sm:inline" />
            <span className="text-muted-foreground block sm:inline">{heroAccent}</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 text-balance">
            {heroDescription}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm sm:text-base px-6 py-3.5 rounded-lg inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
            >
              <span>{isId ? "Coba Gratis" : "Try Free"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border bg-card hover:bg-muted text-foreground font-medium text-sm sm:text-base px-5 py-3.5 rounded-lg inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none shadow-xs"
            >
              <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <WhatsAppIcon className="w-3 h-3 text-white fill-current" />
              </span>
              <span>{isId ? "Software Khusus" : "Custom Software"}</span>
            </a>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════
            2. HERO VISUAL OVERVIEW
        ════════════════════════════════════════════════════════ */}
        <section aria-label="Feature Overview" className="px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto w-full pb-20 lg:pb-28">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <figure className="relative aspect-[16/10] sm:aspect-video w-full m-0">
              <ThemeAwareImage
                lightSrc={LANDING_THEME_IMAGES_BY_FEATURE[heroImageKey].light}
                darkSrc={LANDING_THEME_IMAGES_BY_FEATURE[heroImageKey].dark}
                alt={heroImageAlt}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
                fallback={<PlaceholderVisual variant={featureBlocks?.[0]?.placeholder ?? "multiOutlet"} />}
              />
              <figcaption className="sr-only">{heroImageAlt}</figcaption>
            </figure>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            3. HORIZONTAL STORYTELLING SHOWCASE [title1][gambar1][title2][gambar2]
        ════════════════════════════════════════════════════════ */}
        <HorizontalStorytellingShowcase
          introTitle={introTitle}
          introDescription={introDescription}
          featureBlocks={featureBlocks}
          isId={isId}
        />

        {/* ════════════════════════════════════════════════════════
            4. EDITORIAL NEWS PORTAL GRID: MODUL TERKAIT
        ════════════════════════════════════════════════════════ */}
        {editorialModules.length > 0 && (
          <section aria-label="Related Modules" className="px-6 sm:px-10 lg:px-16 py-20 sm:py-28 border-t border-border/40 bg-background">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 sm:mb-16">
                <div>
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-primary mb-2 inline-block">
                    {isId ? "Ekosistem Terintegrasi" : "Connected Ecosystem"}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
                    {isId ? "Modul & Alur Terkait" : "Related Modules & Workflows"}
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                  {isId
                    ? "Integrasi data instan tanpa perantara manual untuk mendukung efisiensi operasional harian."
                    : "Direct cross-department workflows eliminating manual recaps and data duplication."}
                </p>
              </div>

              {/* News Portal Card Grid: 4 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {editorialModules.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer select-none"
                  >
                    <div>
                      {/* 16:10 Editorial Thumbnail with Crisp Zero-Overlap Border */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border border-border/60 bg-muted/20 mb-4">
                        <ThemeAwareImage
                          lightSrc={LANDING_THEME_IMAGES_BY_FEATURE[item.screenshotKey].light}
                          darkSrc={LANDING_THEME_IMAGES_BY_FEATURE[item.screenshotKey].dark}
                          alt={isId ? item.title.id : item.title.en}
                          fill
                          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-102"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
                          fallback={<div className="w-full h-full bg-secondary/50" />}
                        />
                      </div>

                      {/* Eyebrow Category */}
                      <span className="text-[11px] font-mono font-medium tracking-wider text-muted-foreground uppercase mb-1.5 inline-block">
                        {isId ? item.category.id : item.category.en}
                      </span>

                      {/* Editorial Title */}
                      <h3 className="text-base sm:text-lg font-medium text-foreground tracking-tight group-hover:text-primary transition-colors leading-snug mb-2">
                        {isId ? item.title.id : item.title.en}
                      </h3>

                      {/* Teaser Description */}
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {isId ? item.summary.id : item.summary.en}
                      </p>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-primary">
                      <span>{isId ? "Lihat modul" : "Explore module"}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
            5. FINAL CTA CARD
        ════════════════════════════════════════════════════════ */}
        <section aria-label="Call to Action" className="pb-24 sm:pb-32 px-6 sm:px-10 lg:px-16 border-t border-border/40 pt-16 sm:pt-20 bg-background">
          <div className="max-w-5xl mx-auto rounded-2xl bg-card border border-border p-8 sm:p-14 lg:p-16 text-center shadow-xs">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.1] mb-5 text-balance">
              {finalTitle}
            </h2>
            {finalPoints ? (
              <div className="grid sm:grid-cols-2 gap-6 text-left my-8 max-w-2xl mx-auto">
                {finalPoints.map((point) => (
                  <div key={point.title} className="p-5 rounded-xl border border-border bg-background">
                    <h4 className="font-medium text-base text-foreground mb-1.5">{point.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={finalCtaHref}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm sm:text-base px-7 py-3.5 rounded-lg inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
              >
                <span>{finalCtaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border bg-background hover:bg-muted text-foreground font-medium text-sm sm:text-base px-6 py-3.5 rounded-lg inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none shadow-xs"
              >
                <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <WhatsAppIcon className="w-3 h-3 text-white fill-current" />
                </span>
                <span>{isId ? "Software Khusus" : "Custom Software"}</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </PageMotion>
  );
}
