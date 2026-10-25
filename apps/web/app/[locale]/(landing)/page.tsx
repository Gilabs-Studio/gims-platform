"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import { LazyMount } from "@/features/general/dashboard/components/lazy-mount";

const PricingSection = dynamic(
  () => import("@/components/landing/pricing-section").then((m) => m.PricingSection),
  {
    ssr: false,
    loading: () => <div className="min-h-[500px] w-full" aria-hidden="true" />,
  }
);

const ROTATING_SEGMENTS = {
  id: [
    "Bisnis Ritel & F&B",
    "Distributor & Grosir",
    "Tim Sales Lapangan",
    "Operasional Multi-Gudang",
    "Bisnis Multi-Cabang",
  ],
  en: [
    "Retail & F&B Outlets",
    "Wholesale & Distribution",
    "Field Sales Teams",
    "Multi-Warehouse Operations",
    "Multi-Branch Enterprises",
  ],
} as const;

function HeroRotatingTitle({
  prefix,
  suffix,
  words,
}: {
  prefix: string;
  suffix: string;
  words: readonly string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <h1 className="text-4xl sm:text-6xl lg:text-7xl text-white font-medium mb-4 sm:mb-5 leading-[1.14] tracking-tight text-balance">
      <span className="block">{prefix}</span>
      <span className="relative inline-flex items-center overflow-hidden h-[1.25em] align-middle py-0.5 my-0.5">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="text-primary font-medium inline-block"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-white/80 block">{suffix}</span>
    </h1>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ParallaxImageCard({
  src,
  alt,
  href,
}: {
  src: string;
  alt: string;
  href: string;
}) {
  const containerRef = useRef<HTMLAnchorElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Pure vertical Y translation only (no zoom or scaling)
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "12%"]);

  return (
    <Link
      ref={containerRef}
      href={href}
      className="group relative block cursor-pointer select-none"
    >
      <div className="relative overflow-hidden rounded-xl aspect-[16/10] bg-muted shadow-sm border border-border/70">
        <motion.div
          style={{ y }}
          className="absolute inset-x-0 -top-[14%] -bottom-[14%] w-full h-[128%]"
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 700px"
            className="w-full h-full object-cover transition-opacity duration-300"
            loading="lazy"
          />
        </motion.div>

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />

        {/* Circular Corner Arrow Button */}
        <div className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-all duration-300 transform translate-y-1 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-110 shadow-sm">
          <ArrowRight className="h-4 w-4 text-primary-foreground -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
        </div>
      </div>
    </Link>
  );
}

const SUPERIORITY_KEYS = [
  "allInOne",
  "customFlow",
  "fastAdoption",
  "fieldReliability",
  "scalability",
] as const;

function ScrollHorizontalSuperiority({
  t,
}: {
  t: (key: string) => string;
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
  }, []);

  const x = useTransform(scrollYProgress, (pos) => -pos * maxScroll);

  return (
    <section
      id="superiority"
      ref={targetRef}
      className="relative h-[250vh] sm:h-[280vh] lg:h-[320vh] bg-background"
    >
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden py-6 sm:py-10">
        {/* Section Header */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 mb-8 sm:mb-12 shrink-0">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl font-medium leading-[1.08] tracking-tight text-foreground text-balance">
              {t("superiority.headingTitle")}{" "}
              <span className="text-muted-foreground block sm:inline">
                {t("superiority.headingSubtitle")}
              </span>
            </h2>

            {/* Live Scroll Progress Indicator */}
            <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              </div>
              <div className="w-24 sm:w-36 h-1 rounded-full bg-border overflow-hidden">
                <motion.div
                  style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </div>

          <p className="mt-3 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-3xl text-balance">
            {t("superiority.subtitle")}
          </p>
        </div>

        {/* Horizontal Moving Cards Track (Overflow Visible, gliding across viewport) */}
        <div className="w-full overflow-visible">
          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex gap-6 sm:gap-8 pl-6 sm:pl-10 lg:pl-[max(4rem,calc((100vw-80rem)/2+4rem))] pr-16 w-max"
          >
            {SUPERIORITY_KEYS.map((itemKey) => (
              <div
                key={itemKey}
                className="w-[300px] sm:w-[380px] lg:w-[420px] shrink-0 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs hover:border-primary/40 hover:shadow-lg transition-all flex flex-col justify-between select-none"
              >
                <div>
                  {/* <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs font-mono font-medium text-muted-foreground/80">
                      {t(`superiority.items.${itemKey}.number`)}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {t(`superiority.items.${itemKey}.badge`)}
                    </span>
                  </div> */}

                  <h3 className="text-xl sm:text-2xl font-medium text-foreground tracking-tight mb-3">
                    {t(`superiority.items.${itemKey}.title`)}
                  </h3>

                  <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                    {t(`superiority.items.${itemKey}.description`)}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-muted-foreground/90">
                    {t(`superiority.items.${itemKey}.feature`)}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// 5 Core Pillars with Curated Visuals
const PILLARS = [
  {
    key: "pos" as const,
    image: "/video-bg-thumb.webp",
    href: "/pos",
  },
  {
    key: "crm" as const,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    href: "/crm",
  },
  {
    key: "hris" as const,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    href: "/attendance",
  },
  {
    key: "inventory" as const,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    href: "/stock",
  },
  {
    key: "finance" as const,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    href: "/accounting",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/80 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-left transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <span className="text-base sm:text-lg font-medium text-foreground">
          {q}
        </span>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180 text-foreground" : ""
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-sm sm:text-base leading-relaxed text-muted-foreground">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const isId = locale === "id";
  const [videoFailed, setVideoFailed] = useState(false);

  const whatsappUrl = `https://wa.me/6281367954062?text=${encodeURIComponent(
    isId
      ? "Halo SalesView, saya tertarik berdiskusi tentang Custom Flow dan solusi pengembangan ERP untuk bisnis saya."
      : "Hello SalesView, I'd like to discuss Custom Flow and tailored ERP development for my business."
  )}`;

  const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main id="main-content">

        {/* ════════════════════════════════════════════════════════
            1. HERO SECTION (Matching sipepeg Hero.astro layout)
            - Full video background with dark gradient scrim
            - Bottom-aligned flush left layout
            - Simple punchy copywriting & signature arrow button
        ════════════════════════════════════════════════════════ */}
        <section
          id="home-hero"
          className="relative w-full min-h-[92vh] sm:min-h-screen flex items-end overflow-hidden pb-16 sm:pb-24 lg:pb-28 px-6 sm:px-10 lg:px-16 bg-black"
        >
          {/* Background Video Media with Fallback */}
          <div className="absolute inset-0 z-0">
            {!videoFailed ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/video-bg-thumb.webp"
                onError={() => setVideoFailed(true)}
                className="w-full h-full object-cover object-center scale-102 transition-transform duration-1000 ease-out brightness-[0.70] contrast-[1.10]"
              >
                <source src="/video-bg.webm" type="video/webm" />
              </video>
            ) : (
              <Image
                src="/video-bg-thumb.webp"
                alt="SalesView Platform Overview"
                fill
                priority
                className="w-full h-full object-cover object-center brightness-[0.70]"
              />
            )}

            {/* Dark Vignette & Gradient Overlays Matching sipepeg Aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
          </div>

          {/* Hero Content Container (Flush left-aligned) */}
          <div className="relative z-10 w-full max-w-7xl mx-auto">
            <div className="max-w-5xl flex flex-col items-start">
              {/* Display Headline with Animated Rotating Segment (Bibit-style) */}
              <HeroRotatingTitle
                prefix={t("hero.titlePrefix")}
                suffix={t("hero.titleSuffix")}
                words={ROTATING_SEGMENTS[isId ? "id" : "en"]}
              />

              {/* Simple & To-the-Point Subtitle */}
              <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
                {t("hero.subtitle")}
              </p>

              {/* Action Buttons (Simple, To The Point, Green WhatsApp Icon) */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/register"
                  prefetch={false}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm sm:text-base px-6 py-3.5 rounded-lg inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
                  aria-label={t("hero.ctaPrimary")}
                >
                  <span>{t("hero.ctaPrimary")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 active:bg-white/15 text-white border border-white/25 backdrop-blur-sm font-medium text-sm sm:text-base px-5 py-3.5 rounded-lg inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
                >
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <WhatsAppIcon className="w-3 h-3 text-white fill-current" />
                  </span>
                  <span>{t("hero.ctaWhatsapp")}</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SUPERIORITY SECTION (Scroll-Driven Horizontal Animation)
            - Sticky pinned viewport driven by page scroll Y
            - True horizontal gliding cards overflowing across screen
            - Enterprise-grade copywriting without naming competitor brands
        ════════════════════════════════════════════════════════ */}
        <ScrollHorizontalSuperiority t={t} />

        {/* ════════════════════════════════════════════════════════
            2. 5 CORE PILLARS (Matching sipepeg 2-Column Grid Layout)
            - NO borders between sections!
            - Left Column: Sticky Anchor with 8x8px square tag + Two-Tone Display Title
            - Right Column: Narrative + Clean aspect-ratio Card with hover arrow
        ════════════════════════════════════════════════════════ */}
        <section id="pillars" className="w-full py-20 lg:py-28 bg-background px-6 sm:px-10 lg:px-16">
          <div className="max-w-7xl mx-auto space-y-28 lg:space-y-36">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.key}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
              >
                {/* Left Column: Sticky Anchor */}
                <div className="lg:col-span-5 lg:sticky lg:top-28 self-start">
                  {/* Tag: 8x8px square + label (Simple, no '/') */}
                  <div className="inline-flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-xs bg-primary inline-block flex-shrink-0" />
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {t(`pillars.${pillar.key}.tag`)}
                    </span>
                  </div>

                  {/* Display Title */}
                  <h2 className="text-3xl sm:text-5xl font-medium leading-[1.05] tracking-tight text-foreground">
                    {t(`pillars.${pillar.key}.title`)}
                  </h2>

                  <div className="mt-6 hidden lg:block">
                    <Link
                      href={pillar.href}
                      className="group inline-flex items-center gap-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center transition-transform group-hover:scale-105">
                        <ArrowRight className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <span>{t(`pillars.${pillar.key}.cta`)}</span>
                    </Link>
                  </div>
                </div>

                {/* Right Column: Narrative Body + Parallax Image Card */}
                <div className="lg:col-span-7 flex flex-col">
                  <p className="text-base sm:text-lg leading-relaxed text-muted-foreground mb-8 max-w-2xl">
                    {t(`pillars.${pillar.key}.description`)}
                  </p>

                  {/* Parallax Image Card inside normal placeholder */}
                  <ParallaxImageCard
                    src={pillar.image}
                    alt={t(`pillars.${pillar.key}.title`)}
                    href={pillar.href}
                  />

                  <div className="mt-4 lg:hidden">
                    <Link
                      href={pillar.href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                    >
                      <span>{t(`pillars.${pillar.key}.cta`)}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            3. REGIONAL DISTRIBUTION (Solid Background - Reverse Layout)
            - Transparent Background Vector Line Art on Left
            - Narrative & Structured Metric Cards on Right
        ════════════════════════════════════════════════════════ */}
        <section className="w-full py-20 lg:py-28 bg-background px-6 sm:px-10 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Transparent Vector Line Art Illustration */}
              <div className="lg:col-span-6 flex items-center justify-center order-2 lg:order-1">
                <div className="relative w-full max-w-lg aspect-square">
                  <Image
                    src="/line-art-distribution.webp"
                    alt="SalesView Distribution Team Illustration"
                    fill
                    sizes="(max-width: 1024px) 100vw, 600px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Right Column: Narrative & Metrics Cards */}
              <div className="lg:col-span-6 flex flex-col items-start order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-xs bg-primary inline-block flex-shrink-0" />
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {t("distribution.tag")}
                  </span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-medium leading-[1.08] tracking-tight text-foreground">
                  {t("distribution.headingTitle")} <br />
                  <span className="text-muted-foreground">{t("distribution.headingSubtitle")}</span>
                </h2>

                <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
                  {t("distribution.description")}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {t("distribution.point1")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {t("distribution.point2")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {t("distribution.point3")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            4. OPERATIONAL AI & ANALYTICS (Solid Background - Bento Container Card)
            - Enclosed Card Layout with Insight Pills
        ════════════════════════════════════════════════════════ */}
        <section className="w-full py-20 lg:py-28 bg-background px-6 sm:px-10 lg:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 lg:p-16 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                {/* Left Column: Narrative & Action Highlights */}
                <div className="lg:col-span-6 flex flex-col items-start">
                  <div className="inline-flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-xs bg-primary inline-block flex-shrink-0" />
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {t("aiOps.tag")}
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-medium leading-[1.08] tracking-tight text-foreground">
                    {t("aiOps.headingTitle")} <br />
                    <span className="text-muted-foreground">{t("aiOps.headingSubtitle")}</span>
                  </h2>

                  <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
                    {t("aiOps.description")}
                  </p>

                  <ul className="mt-8 space-y-3 w-full">
                    <li className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{t("aiOps.point1")}</span>
                    </li>
                    <li className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{t("aiOps.point2")}</span>
                    </li>
                    <li className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-sm font-medium text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{t("aiOps.point3")}</span>
                    </li>
                  </ul>
                </div>

                {/* Right Column: Transparent Vector Line Art Illustration */}
                <div className="lg:col-span-6 flex items-center justify-center">
                  <div className="relative w-full max-w-md aspect-square">
                    <Image
                      src="/line-art-ai.webp"
                      alt="SalesView AI & Analytics Illustration"
                      fill
                      sizes="(max-width: 1024px) 100vw, 500px"
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            5. CUSTOM FLOW & BESPOKE DEVELOPMENT SECTION
            (Unified 2-Column Grid with WhatsApp Action)
        ════════════════════════════════════════════════════════ */}
        <section id="custom-flow" className="relative w-full py-20 lg:py-28 bg-muted/20 px-6 sm:px-10 lg:px-16 overflow-hidden">
          {/* Subtle Parametric Wave Pattern Texture in Background */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none opacity-15">
            <Image
              src="/wave-pattern.webp"
              alt="Parametric Wave Texture"
              fill
              className="object-cover object-center"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <div className="inline-flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 rounded-xs bg-foreground inline-block flex-shrink-0" />
                  <span className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
                    {t("customFlow.tag")}
                  </span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-medium leading-[1.05] tracking-tight text-foreground">
                  {t("customFlow.headingTitle")} <br />
                  <span className="text-muted-foreground">{t("customFlow.headingSubtitle")}</span>
                </h2>
              </div>

              <div className="lg:col-span-7 flex flex-col items-start justify-center space-y-6">
                <p className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">
                  {t("customFlow.description")}
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 cursor-pointer select-none"
                >
                  <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-foreground text-sm sm:text-base font-medium tracking-normal hover:text-primary transition-colors">
                    {t("customFlow.ctaWhatsapp")} (+62 813-6795-4062)
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            6. PRICING SECTION (Clean with silent error handling)
        ════════════════════════════════════════════════════════ */}
        <section id="pricing" className="w-full py-20 lg:py-28 bg-background px-6 sm:px-10 lg:px-16">
          <LazyMount rootMargin="320px">
            <PricingSection />
          </LazyMount>
        </section>

        {/* ════════════════════════════════════════════════════════
            7. FAQ SECTION (Align Center & Grid 1 Single Column)
        ════════════════════════════════════════════════════════ */}
        <section id="faq" className="w-full py-20 lg:py-28 bg-background px-6 sm:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto">
            {/* Header: Align Center */}
            <div className="text-center mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-xs bg-primary inline-block flex-shrink-0" />
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("faq.tag")}
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-medium leading-[1.1] tracking-tight text-foreground text-balance">
                {t("faq.headingTitle")} {t("faq.headingSubtitle")}
              </h2>

              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto text-balance">
                {t("faq.subtitle")}
              </p>
            </div>

            {/* Grid 1 Centered Accordion */}
            <div className="w-full divide-y divide-border border-y border-border">
              {FAQ_KEYS.map((key) => (
                <FaqItem
                  key={key}
                  q={t(`faq.items.${key}`)}
                  a={t(`faq.items.${key.replace("q", "a")}`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            8. FINAL CTA FLOATING CONTAINER CARD (Bespoke UI, No 'Memulai', Khusus Buttons)
        ════════════════════════════════════════════════════════ */}
        <section className="relative z-20 w-full max-w-5xl mx-auto px-6 sm:px-10 -mb-20 sm:-mb-24 lg:-mb-28">
          <div className="relative overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl p-8 sm:p-14 lg:p-16 text-center flex flex-col items-center">
            {/* Title without 'Memulai' */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.15] tracking-tight text-foreground max-w-3xl text-balance">
              {t("cta.headingTitle")} <br />
              <span className="text-muted-foreground">{t("cta.headingSubtitle")}</span>
            </h2>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl text-balance">
              {t("cta.subtitle")}
            </p>

            {/* Specialized Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                prefetch={false}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base px-8 py-4 rounded-xl inline-flex items-center justify-center gap-3 shadow-xl shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
              >
                <span>{t("cta.ctaPrimary")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-muted hover:bg-muted/80 text-foreground font-medium text-base px-7 py-4 rounded-xl inline-flex items-center justify-center gap-3 border border-border hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none"
              >
                <span className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <WhatsAppIcon className="w-3 h-3 text-white fill-current" />
                </span>
                <span>{t("cta.ctaWhatsapp")}</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
