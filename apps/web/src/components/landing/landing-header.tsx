"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ThemeAwareImage } from "@/components/landing/theme-aware-image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { marketingApps } from "@/lib/marketing-apps";

export function LandingHeader() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();
  const isId = locale === "id";
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);

  const navLinks = [
    { href: "#pillars", label: t("modules") },
    { href: "#custom-flow", label: t("customFlow") },
    { href: "/pricing", label: t("pricing") },
    { href: "/about", label: t("about") },
  ] as const;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-xs transition-colors duration-200"
      onMouseLeave={() => setMegaMenuOpen(false)}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        {/* Brand Logo */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 select-none cursor-pointer">
            <ThemeAwareImage
              lightSrc="/salesview%20logo%20light.webp"
              darkSrc="/salesview%20logo%20light.webp"
              alt="SalesView logo"
              width={150}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden items-center gap-1 md:flex">
            <div
              className="relative py-4"
              onMouseEnter={() => setMegaMenuOpen(true)}
            >
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                  megaMenuOpen
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
                aria-expanded={megaMenuOpen}
              >
                <span>{t("features")}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    megaMenuOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60 cursor-pointer"
                onMouseEnter={() => setMegaMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Right Actions (Clean & Minimalist: Lang + Login + 1 Primary CTA) */}
        <div
          className="hidden items-center gap-4 md:flex"
          onMouseEnter={() => setMegaMenuOpen(false)}
        >
          {/* Subtle Language Switch */}
          <Link
            href={pathname || "/"}
            locale={isId ? "en" : "id"}
            scroll={false}
            className="cursor-pointer"
          >
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1"
              aria-label="Switch language"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{isId ? "ID" : "EN"}</span>
            </button>
          </Link>

          {/* Sign In */}
          <Link
            href="/login"
            prefetch={false}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {t("signIn")}
          </Link>

          {/* Single Primary Action Button */}
          <Link href="/register" prefetch={false} className="cursor-pointer">
            <Button
              size="sm"
              className="cursor-pointer rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-sm font-medium shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {t("getStarted")}
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={pathname || "/"}
            locale={isId ? "en" : "id"}
            scroll={false}
            className="cursor-pointer"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground cursor-pointer"
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-foreground cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {megaMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-16 left-0 right-0 border-b border-border bg-background/98 shadow-md backdrop-blur-md"
            onMouseEnter={() => setMegaMenuOpen(true)}
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
              <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
                {marketingApps.map((group) => (
                  <div key={group.category.en}>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {isId ? group.category.id : group.category.en}
                    </h3>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => setMegaMenuOpen(false)}
                          >
                            {isId ? item.name.id : item.name.en}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border bg-background px-6 py-6 md:hidden shadow-lg"
          >
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-muted cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Link
                  href="/login"
                  prefetch={false}
                  className="cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-center rounded-full text-foreground cursor-pointer font-medium"
                  >
                    {t("signIn")}
                  </Button>
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
                  className="cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button className="w-full justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium">
                    {t("getStarted")}
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
