"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ThemeAwareImage } from "@/components/landing/theme-aware-image";

export function LandingFooter() {
  const locale = useLocale();
  const isId = locale === "id";
  const t = useTranslations("landing.footer");
  const currentYear = new Date().getFullYear();

  const whatsappUrl = `https://wa.me/6281367954062?text=${encodeURIComponent(
    isId
      ? "Halo SalesView, saya tertarik berdiskusi tentang implementasi ERP dan alur kerja sistem saya."
      : "Hello SalesView, I'd like to discuss ERP implementation and our business workflows."
  )}`;

  return (
    <footer className="w-full bg-sidebar-dark text-sidebar-foreground pt-36 sm:pt-40 lg:pt-48 pb-12 px-6 sm:px-10 lg:px-16 relative overflow-hidden transition-colors duration-200 border-t border-sidebar-border">
      {/* Subtle Primary Ambient Glow Anchoring the Floating Card */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 bg-primary/15 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Top 12-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-16">
          {/* Brand & Address (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col items-start">
            <Link href="/" className="inline-flex items-center mb-6 cursor-pointer select-none">
              <ThemeAwareImage
                lightSrc="/salesview%20logo%20light.webp"
                darkSrc="/salesview%20logo%20light.webp"
                alt="SalesView logo"
                width={140}
                height={36}
                className="h-9 w-auto"
              />
            </Link>

            <p className="text-sm text-sidebar-foreground/70 leading-relaxed mb-6 max-w-sm">
              {t("desc")}
            </p>

            <div className="text-xs text-sidebar-foreground/70 space-y-1.5 border-l-2 border-primary pl-3 py-1">
              <p className="font-medium text-sidebar-foreground">SalesView by GILABS</p>
              <p>{t("address")}</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline inline-block cursor-pointer"
              >
                {t("hotline")}
              </a>
            </div>
          </div>

          {/* Quick Links: Modul ERP (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-5">
              {isId ? "Modul ERP" : "ERP Modules"}
            </h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/80">
              <li>
                <Link href="/pos" className="hover:text-primary transition-colors cursor-pointer">
                  Point of Sale (POS)
                </Link>
              </li>
              <li>
                <Link href="/crm" className="hover:text-primary transition-colors cursor-pointer">
                  CRM & Field Sales
                </Link>
              </li>
              <li>
                <Link href="/attendance" className="hover:text-primary transition-colors cursor-pointer">
                  HRIS & Payroll
                </Link>
              </li>
              <li>
                <Link href="/stock" className="hover:text-primary transition-colors cursor-pointer">
                  Inventory & Gudang
                </Link>
              </li>
              <li>
                <Link href="/accounting" className="hover:text-primary transition-colors cursor-pointer">
                  Finance & Akuntansi
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigasi & Solusi (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-5">
              {isId ? "Solusi" : "Solutions"}
            </h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/80">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors cursor-pointer font-medium text-primary"
                >
                  Custom Flow ↗
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary transition-colors cursor-pointer">
                  {isId ? "Harga" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-primary transition-colors cursor-pointer">
                  {isId ? "Template" : "Templates"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors cursor-pointer">
                  {isId ? "Tentang" : "About"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legalitas & Dukungan (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-5">
              {isId ? "Bantuan" : "Support"}
            </h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/80">
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors cursor-pointer">
                  {isId ? "Syarat & Ketentuan" : "Terms"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors cursor-pointer">
                  {isId ? "Kebijakan Privasi" : "Privacy"}
                </Link>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Made by gilabs.id */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sidebar-foreground/60 border-t border-sidebar-border">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-6">
            <a
              href="https://gilabs.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sidebar-foreground hover:text-primary font-medium transition-colors cursor-pointer"
            >
              {t("madeBy")}
            </a>
            <a
              href="#main-content"
              className="hover:text-primary transition-colors font-medium cursor-pointer"
            >
              ↑ {isId ? "Ke Atas" : "Back to Top"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
