"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  Database,
  Package,
  CreditCard,
  Users,
  BarChart3,
  ArrowUpRight,
  Truck,
  PhoneCall,
  ChevronDown,
  LineChart,
  Sparkles,
} from "lucide-react";

// WebGL background — single instance, fixed behind entire page
import type { LightRaysProps } from "@/components/landing/light-rays";
const LightRays = dynamic(
  () => import("@/components/landing/light-rays").then((m) => m.default as React.ComponentType<LightRaysProps>),
  { ssr: false }
);

// Leaflet map — requires browser environment
const MarketingMapDemo = dynamic(
  () =>
    import("@/components/landing/marketing-map-demo").then(
      (m) => m.MarketingMapDemo
    ),
  { ssr: false }
);

const PRIMARY_HEX = "#FFFFFF";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut", delay },
  }),
};

// Common content width constraint
const W = "relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12";

const PRODUCT_MODULES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Ringkasan operasional, widget cepat, dan akses ke indikator utama bisnis.",
  },
  {
    icon: Database,
    title: "Master Data",
    description: "Geographic, organization, employee, supplier, customer, product, warehouse, dan user master.",
  },
  {
    icon: BarChart3,
    title: "Sales",
    description: "Quotation, sales order, delivery, invoice, pembayaran, dan recap piutang.",
  },
  {
    icon: Truck,
    title: "Purchase",
    description: "Requisition, purchase order, goods receipt, supplier invoice, pembayaran, dan recap hutang.",
  },
  {
    icon: Package,
    title: "Stock",
    description: "Inventory, stock movement, dan stock opname untuk kontrol persediaan.",
  },
  {
    icon: CreditCard,
    title: "Finance",
    description: "Accounting, banking, payables, budgeting, asset management, dan financial statements.",
  },
  {
    icon: Users,
    title: "HRD",
    description: "Attendance, leave request, evaluation, recruitment, work schedule, dan holidays.",
  },
  {
    icon: PhoneCall,
    title: "CRM",
    description: "Leads, pipeline, tasks, visit reports, area mapping, sales targets, dan settings.",
  },
  {
    icon: LineChart,
    title: "Reports",
    description: "Sales overview, top product, geo performance, customer research, dan supplier research.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description: "Chatbot dan settings untuk pertanyaan operasional dan bantuan kerja cepat.",
  },
];

const FEATURE_BENEFITS = [
  {
    icon: LayoutDashboard,
    title: "Satu sumber data",
    description:
      "Dashboard, master data, sales, purchase, stock, finance, HRD, CRM, dan reports terhubung dalam satu alur.",
  },
  {
    icon: Package,
    title: "Kontrol operasional lebih rapi",
    description:
      "Stok, delivery, purchase order, goods receipt, dan stock opname tercatat dengan jejak yang jelas.",
  },
  {
    icon: CreditCard,
    title: "Keuangan lebih siap audit",
    description:
      "Chart of accounts, jurnal, bank, piutang, hutang, budget, dan laporan keuangan tersedia dalam format yang konsisten.",
  },
  {
    icon: Users,
    title: "Proses HRD lebih disiplin",
    description:
      "Attendance, leave request, evaluation, recruitment, work schedule, dan holidays berjalan dalam satu struktur.",
  },
  {
    icon: LineChart,
    title: "Insight lebih cepat terbaca",
    description:
      "Sales overview, geo performance, customer research, dan supplier research membantu tim mengambil keputusan.",
  },
  {
    icon: Sparkles,
    title: "Bisa dipakai untuk automation",
    description:
      "AI assistant, workflow, dan notifikasi membantu mempercepat pekerjaan sehari-hari.",
  },
];

const FEATURE_SCREENSHOTS = [
  {
    title: "CRM Pipeline",
    caption: "Alur sales dengan visual kanban yang mudah dipahami (drag & drop deal).",
    image: "/screenshot/pipeline.webp",
  },
  {
    title: "Dashboard",
    caption: "Overview revenue, tren, dan metrik penting untuk keputusan strategis.",
    image: "/screenshot/dashboard.webp",
  },
  {
    title: "Sales Order",
    caption: "Pantau pesanan masuk secara real-time dari pemesanan hingga pengiriman.",
    image: "/screenshot/sales-order.webp",
  },
  {
    title: "Stock Inventory",
    caption: "Monitor dan bandingkan kesediaan barang secara langsung multi-gudang.",
    image: "/screenshot/stock-inventory.webp",
  },
  {
    title: "Profit & Loss",
    caption: "Laporan keuangan komprehensif mengukur performa pengeluaran dan pemasukan.",
    image: "/screenshot/profit-loss.webp",
  },
  {
    title: "Customer",
    caption: "Master data informasi riwayat pelanggan dan relasinya (Single Source of Truth).",
    image: "/screenshot/master-customer.webp",
  },
  {
    title: "Geo Performance",
    caption: "Lihat kinerja area penjualan hingga cakupan provinsi dan kota lewat peta interaktif.",
    image: "/screenshot/geo-peformance.webp",
  },
  {
    title: "Salary",
    caption: "Proses penggajian terotomatisasi yang terhubung dengan absensi dan data HRD.",
    image: "/screenshot/salary.webp",
  },
];

const FAQ_ITEMS = [
  {
    q: "Apakah GIMS cocok untuk distribusi multi-gudang?",
    a: "Ya. GIMS dirancang sejak awal untuk skenario multi-gudang — stok di tiap lokasi tercatat secara real-time, transfer antar gudang terotomatisasi, dan laporan konsolidasi tersedia tanpa rekap manual.",
  },
  {
    q: "Berapa lama proses onboarding?",
    a: "Sebagian besar perusahaan sudah bisa beroperasi penuh dalam 1–2 hari kerja. Tim kami memandu migrasi data masterdata, konfigurasi awal, dan sesi pelatihan singkat untuk setiap departemen.",
  },
  {
    q: "Bisakah diintegrasikan dengan sistem yang sudah ada?",
    a: "GIMS menggunakan REST API terbuka. Integrasi dengan timbangan digital, barcode scanner, sistem akuntansi existing, atau marketplace bisa dilakukan tanpa menyentuh kode inti platform.",
  },
  {
    q: "Bagaimana keamanan data kami dijaga?",
    a: "Data tersimpan di infrastruktur cloud dengan enkripsi at-rest dan in-transit. Akses dikontrol per role dan per entitas — staf gudang Surabaya hanya melihat data gudang mereka sendiri.",
  },
  {
    q: "Apakah tersedia versi mobile untuk tim lapangan?",
    a: "Antarmuka GIMS berjalan di browser modern termasuk di smartphone Android dan iOS. Tim sales bisa input order, cek stok, dan catat kunjungan pelanggan langsung dari ponsel mereka.",
  },
  {
    q: "Apa yang membedakan GIMS dari ERP generik?",
    a: "GIMS dibangun khusus untuk pola operasional distribusi di Indonesia — termasuk surat jalan, retur barang, multi-PPN, dan wilayah pengiriman berdasarkan peta administratif Indonesia hingga tingkat kelurahan.",
  },
];

function FaqItem({
  q,
  a,
  index,
}: {
  q: string;
  a: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      custom={index * 0.07}
      className="border-b border-border last:border-0"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-start justify-between gap-4 py-6 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground sm:text-base">
          {q}
        </span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LandingPage() {
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  return (
    <>
      {/* ── Single global WebGL background (fixed, below everything) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <LightRays
          raysOrigin="top-center"
          raysColor={PRIMARY_HEX}
          raysSpeed={0.35}
          lightSpread={2.0}
          rayLength={2.8}
          fadeDistance={0.92}
          saturation={0.5}
          pulsating
          followMouse
          mouseInfluence={0.07}
        />
      </div>

      <div className="relative z-10 overflow-x-hidden">

        {/* ════════════════════════════════════════════════════════
            1. HERO
        ════════════════════════════════════════════════════════ */}
        <section className="flex min-h-screen flex-col items-center justify-center py-24 text-center">
          <div className={W}>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              GIMS — Platform Manajemen Distribusi
            </p>

            <h1 className="mx-auto max-w-4xl text-5xl font-light leading-[1.06] tracking-tight text-foreground sm:text-6xl lg:text-[5.5rem]">
              ERP yang tumbuh bersama bisnis
              <br />
              <span className="text-primary">dari UMKM sampai enterprise</span>
            </h1>

            <p className="mx-auto mt-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Dari master data sampai finance, dari cloud sampai on-premise license — GIMS menghubungkan
              seluruh operasional dalam satu sistem yang konsisten dan mudah dijual ke klien.
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/login" prefetch={false}>
                <Button size="lg" className="cursor-pointer px-10 text-base shadow-md">
                  Masuk
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            2. BENEFITS GRID
        ════════════════════════════════════════════════════════ */}
        <section id="features" className="flex min-h-screen flex-col items-center justify-center py-24">
          <div className={W}>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="mx-auto max-w-3xl text-center"
            >
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Kelebihan utama GIMS
              </p>
              <h2 className="text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
                Fitur yang terasa di operasional harian
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                GIMS dirancang agar data sekali input bisa dipakai lintas modul. Tim sales,
                gudang, finance, HRD, dan manajemen melihat informasi yang sama tanpa rekap manual.
              </p>
            </motion.div>

            <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_BENEFITS.map(({ icon: Icon, title, description }, index) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  custom={index * 0.1}
                  className="overflow-hidden rounded-3xl border border-border bg-card/40 p-8 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-lg font-medium text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            2.5. SCREENSHOT SHOWCASE TABS
        ════════════════════════════════════════════════════════ */}
        <section className="flex flex-col items-center justify-center py-24 relative">
          <div className="absolute inset-0 bg-muted/10 -z-10" />
          <div className={`${W} max-w-7xl`}>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="mb-12 text-center"
            >
              <h2 className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">
                Antarmuka Bersih & Fungsional
              </h2>
            </motion.div>

            {/* TAB BUTTONS */}
            <div className="mb-8 flex overflow-x-auto pb-4 scrollbar-hide justify-start lg:justify-center">
              <div className="flex gap-2 px-4 lg:px-0">
                {FEATURE_SCREENSHOTS.map((shot, index) => (
                  <button
                    key={shot.title}
                    onClick={() => setActiveScreenshot(index)}
                    className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm cursor-pointer ${
                      activeScreenshot === index
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {shot.title}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm mx-auto"
            >
              <div className="p-4 sm:p-6 border-b border-border/50 bg-card/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-foreground">
                  {FEATURE_SCREENSHOTS[activeScreenshot].title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {FEATURE_SCREENSHOTS[activeScreenshot].caption}
                </p>
              </div>
              <div className="relative aspect-video w-full overflow-hidden bg-muted/20">
                <Image
                  src={FEATURE_SCREENSHOTS[activeScreenshot].image}
                  alt={FEATURE_SCREENSHOTS[activeScreenshot].title}
                  fill
                  className="object-contain p-2 sm:p-4"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            3. TURNING POINT
        ════════════════════════════════════════════════════════ */}
        <section className="flex min-h-screen flex-col items-center justify-center py-24 text-center">
          <div className={W}>
            <motion.div
              variants={fadeUp} initial="hidden"
              whileInView="visible" viewport={{ once: true, margin: "-120px" }}
              className="mx-auto max-w-4xl"
            >
              <h2 className="text-4xl font-light leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Satu sistem yang mencatat,
                <br />
                menghubungkan, dan melaporkan
                <br />
                <span className="text-primary">secara otomatis</span>
              </h2>
              <p className="mt-8 text-base leading-relaxed text-muted-foreground sm:text-lg">
                GIMS dirancang agar data yang masuk di satu bagian langsung tersedia
                di seluruh sistem — tanpa impor manual, tanpa salinan ganda.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            4. FEATURE: MAP (real Leaflet)
        ════════════════════════════════════════════════════════ */}
        <section id="features" className="flex min-h-screen flex-col items-center justify-center py-24">
          <div className={W}>
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-20 items-center">
              <motion.div
                variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true, margin: "-80px" }}
              >
                <h2 className="mb-5 text-3xl font-light leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Lihat seluruh jaringan
                  <br />
                  distribusi Anda sekaligus
                </h2>
                <p className="mb-5 text-base leading-relaxed text-muted-foreground">
                  Peta interaktif menampilkan lokasi pelanggan, stok aktif di setiap
                  gudang, dan sebaran tim lapangan — dari tingkat provinsi hingga
                  kecamatan di seluruh Indonesia.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ketika cabang Surabaya kehabisan stok, manajer pusat bisa
                  langsung melihatnya — bukan dua hari kemudian lewat laporan.
                </p>
              </motion.div>

              <motion.div
                variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true, margin: "-60px" }}
                custom={0.1}
                className="relative h-80 lg:h-[420px] overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm"
              >
                {/* useRemote=false: never call protected APIs from the public landing page */}
                <MarketingMapDemo useRemote={false} />

                {/* Legend overlay */}
                <div className="pointer-events-none absolute top-3 right-3 z-500 flex flex-col gap-1.5 rounded-xl border border-border bg-card/90 px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary opacity-90" />
                    <span className="text-xs text-muted-foreground">Gudang utama</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary opacity-50" />
                    <span className="text-xs text-muted-foreground">Titik distribusi</span>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-3 left-3 z-500">
                  <span className="rounded-lg border border-primary/25 bg-card/90 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
                    13 hub aktif — Indonesia
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            5. FEATURE: AI
        ════════════════════════════════════════════════════════ */}
        <section className="flex min-h-screen flex-col items-center justify-center py-24">
          <div className={W}>
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-20 items-center">
              <motion.div
                variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true, margin: "-60px" }}
                className="order-2 lg:order-1 overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-chart-3/50" />
                  <div className="h-3 w-3 rounded-full bg-chart-2/50" />
                  <span className="ml-3 font-mono text-xs text-muted-foreground">GIMS AI Assistant</span>
                </div>
                <div className="space-y-5 p-6 font-mono text-sm">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">Anda</p>
                    <p className="rounded-lg bg-primary/8 px-4 py-2.5 text-sm text-foreground">
                      Berapa stok SKU-201 di gudang Bandung?
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-primary">GIMS AI</p>
                    <p className="rounded-lg border border-border bg-card/50 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
                      Stok SKU-201 di Gudang Bandung:{" "}
                      <span className="font-medium text-foreground">342 unit</span>.
                      <br />
                      Terakhir diperbarui 14 menit lalu. Reorder point: 200 unit.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">Anda</p>
                    <p className="rounded-lg bg-primary/8 px-4 py-2.5 text-sm text-foreground">
                      Buat PO ke supplier untuk 500 unit.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-primary">GIMS AI</p>
                    <p className="rounded-lg border border-border bg-card/50 px-4 py-2.5 text-sm leading-relaxed text-muted-foreground">
                      Purchase Order{" "}
                      <span className="font-medium text-foreground">PO-2026-0847</span>{" "}
                      berhasil dibuat — 500 unit SKU-201 ke CV Maju Sejahtera.{" "}
                      Menunggu persetujuan.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true, margin: "-80px" }}
                custom={0.1}
                className="order-1 lg:order-2"
              >
                <h2 className="mb-5 text-3xl font-light leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  Tanya data Anda
                  <br />
                  dalam bahasa sehari-hari
                </h2>
                <p className="mb-5 text-base leading-relaxed text-muted-foreground">
                  Asisten GIMS memahami perintah dalam Bahasa Indonesia. Cek stok,
                  buat purchase order, atau tarik laporan penjualan — cukup dengan
                  mengetik kalimat biasa.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tidak ada lagi bolak-balik menu atau menunggu tim IT untuk
                  membuat laporan ad-hoc.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            6. MODULES
        ════════════════════════════════════════════════════════ */}
        <section id="modules" className="flex min-h-screen flex-col items-center justify-center py-24">
          <div className={W}>
            <motion.div
              variants={fadeUp} initial="hidden"
              whileInView="visible" viewport={{ once: true, margin: "-80px" }}
              className="mx-auto mb-14 max-w-2xl text-center"
            >
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Menu utama GIMS
              </p>
              <h2 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                Semua modul inti
                <br />
                dalam satu platform
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Menu ini mengikuti struktur dokumentasi produk. Starter berisi menu inti,
                sedangkan Full Standard mencakup seluruh modul standar tanpa custom tambahan.
              </p>
            </motion.div>

            <div className="grid gap-px bg-border/50 rounded-2xl overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_MODULES.map(({ icon: Icon, title, description }, i) => (
                <motion.div
                  key={title}
                  variants={fadeUp} initial="hidden"
                  whileInView="visible" viewport={{ once: true, margin: "-30px" }}
                  custom={i * 0.07}
                  className="group flex flex-col gap-4 bg-card/60 p-8 backdrop-blur-sm transition-colors hover:bg-card/80"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
                    <Icon className="h-[18px] w-[18px] text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            6. FAQ
        ════════════════════════════════════════════════════════ */}
        <section id="faq" className="flex min-h-screen flex-col items-center justify-center py-24">
          <div className={W}>
            <div className="grid gap-16 lg:grid-cols-[1fr_1.5fr] lg:gap-24 items-start">
              <motion.div
                variants={fadeUp} initial="hidden"
                whileInView="visible" viewport={{ once: true, margin: "-80px" }}
                className="lg:sticky lg:top-24"
              >
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Pertanyaan umum
                </p>
                <h2 className="text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
                  Hal yang sering
                  <br />
                  ditanyakan
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  Tidak menemukan jawaban yang dicari? Hubungi tim kami — kami
                  biasanya membalas dalam hitungan jam.
                </p>
                <div className="mt-8">
                  <Link href="/login">
                    <Button variant="outline" className="cursor-pointer bg-card/60 backdrop-blur-sm">
                      Hubungi tim
                      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <div className="divide-y divide-border rounded-2xl border border-border bg-card/50 px-6 backdrop-blur-sm">
                {FAQ_ITEMS.map((item, i) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
          7. CTA
        ════════════════════════════════════════════════════════ */}
        <section className="flex min-h-screen flex-col items-center justify-center py-24 text-center">
          <div className={W}>
            <motion.div
              variants={fadeUp} initial="hidden"
              whileInView="visible" viewport={{ once: true, margin: "-80px" }}
              className="mx-auto max-w-2xl"
            >
              <h2 className="mb-5 text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Siap dibawa ke
                <br />
                implementasi yang jelas
              </h2>
              <p className="mb-10 text-base leading-relaxed text-muted-foreground">
                Mulai dari fitur inti yang paling relevan, lalu scale ke modul lain saat bisnis tumbuh.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="#features">
                  <Button size="lg" className="cursor-pointer px-10 text-base shadow-md">
                    Lihat fitur
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="cursor-pointer px-8 text-base bg-card/60 backdrop-blur-sm"
                  >
                    Masuk
                    <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

      </div>
    </>
  );
}
