"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { scrollY } = useScroll();
  const headerBg = useTransform(scrollY, [0, 80], ["rgba(0,0,0,0)", "rgba(0,0,0,0.01)"]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "#features", label: t("features") },
    { href: "#modules", label: t("modules") },
    { href: "#faq", label: t("faq") },
  ] as const;

  return (
    <motion.header
      style={{ backgroundColor: mounted ? headerBg : undefined }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <span className="text-lg font-semibold tracking-tight text-foreground">GIMS</span>
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
            by GILABS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggleButton />

          {/* Language toggle */}
          <Link href={pathname || "/"} locale={locale === "en" ? "id" : "en"} scroll={false}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Switch language"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === "en" ? "ID" : "EN"}
            </Button>
          </Link>

          <Link href="/login" prefetch={false}>
            <Button
              size="sm"
              className="cursor-pointer rounded-full px-5 text-sm shadow-sm"
            >
              {t("signIn")}
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggleButton />
          <Link href={pathname || "/"} locale={locale === "en" ? "id" : "en"} scroll={false}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground cursor-pointer"
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div
          className={cn(
            "border-b border-border bg-background/95 backdrop-blur-md md:hidden",
          )}
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 pt-2 border-t border-border">
              <Link href="/login" prefetch={false}>
                <Button size="sm" className="w-full cursor-pointer rounded-full">
                  {t("signIn")}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </motion.header>
  );
}
