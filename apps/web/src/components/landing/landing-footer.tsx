"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ThemeAwareImage } from "@/components/landing/theme-aware-image";
import { Globe } from "lucide-react";

export function LandingFooter() {
  const locale = useLocale();
  const isId = locale === "id";

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background py-16 text-muted-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid gap-10 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 select-none">
              <ThemeAwareImage
                lightSrc="/salesview%20logo%20light.png"
                darkSrc="/salesview%20logo%20dark.png"
                alt="SalesView logo"
                width={150}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground/80">
              {isId
                ? "Platform bisnis all-in-one terintegrasi dengan ERP, CRM, HRIS, POS, dan Finance. Dibangun untuk efisiensi bisnis modern di Indonesia."
                : "All-in-one integrated business platform featuring ERP, CRM, HRIS, POS, and Finance. Built for the efficiency of modern teams."}
            </p>
          </div>

          {/* Product Links */}
          <div className="md:col-span-1 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {isId ? "Produk" : "Product"}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Harga" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Template" : "Templates"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="md:col-span-1 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {isId ? "Perusahaan" : "Company"}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Tentang Kami" : "About Us"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="md:col-span-1 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {isId ? "Hukum" : "Legal"}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Ketentuan Layanan" : "Terms of Service"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Kebijakan Privasi" : "Privacy Policy"}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-foreground transition-colors cursor-pointer">
                  {isId ? "Kebijakan Cookie" : "Cookie Policy"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="md:col-span-2 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {isId ? "Kontak" : "Contact"}
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="leading-relaxed text-xs text-muted-foreground/80">
                <span className="font-semibold block text-foreground text-xs uppercase tracking-wider mb-1">{isId ? "Alamat Kantor" : "Office Address"}</span>
                {isId
                  ? ""
                  : ""}
              </li>
              <li className="text-xs">
                <span className="font-semibold block text-foreground text-xs uppercase tracking-wider mb-1">{isId ? "Telepon / WhatsApp" : "Phone / WhatsApp"}</span>
                <a href="https://wa.me/6289526770703" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors cursor-pointer font-medium text-primary">
                  +62 895-2677-0703
                </a>
              </li>
              <li className="text-xs">
                <span className="font-semibold block text-foreground text-xs uppercase tracking-wider mb-1">Email</span>
                <a href="mailto:support@salesview.id" className="hover:text-foreground transition-colors cursor-pointer font-medium text-primary">
                  
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-muted-foreground/75">
            &copy; {currentYear} {isId ? "Hak cipta dilindungi undang-undang." : "All rights reserved."}
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground/75">
              <Globe className="h-3.5 w-3.5" />
              {isId ? "Bahasa Indonesia" : "English"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
