"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/finance/settings/fiscal-years", navKey: "fiscalYears" },
  { href: "/finance/settings/tax-config", navKey: "taxConfig" },
  { href: "/finance/accounting/coa", navKey: "chartOfAccounts" },
  { href: "/finance/settings/accounting-mapping", navKey: "accountingMapping" },
  { href: "/finance/settings/inventory", navKey: "inventorySettings" },
  { href: "/finance/settings/opening-balance", navKey: "openingBalance" },
];

export function FinanceSettingsNav() {
  const pathname = usePathname();
  const tNavigation = useTranslations("navigation");

  const isActiveTab = (href: string) => {
    if (!pathname) return false;
    if (pathname.startsWith(href)) return true;

    // Keep COA tab active when route uses normalized alias.
    if (href === "/finance/accounting/coa" && pathname.startsWith("/finance/coa")) {
      return true;
    }

    return false;
  };

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-xl border bg-muted/20 p-2">
        {tabs.map((tab) => {
          const active = isActiveTab(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {tNavigation(tab.navKey)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
