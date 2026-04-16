"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/finance/settings/fiscal-years", label: "Fiscal Year" },
  { href: "/finance/settings/tax-config", label: "Tax" },
  { href: "/finance/accounting/coa", label: "Chart of Accounts" },
  { href: "/finance/settings/accounting-mapping", label: "Accounting Mapping" },
  { href: "/finance/settings/inventory", label: "Inventory Settings" },
  { href: "/finance/settings/opening-balance", label: "Opening Balance" },
];

export function FinanceSettingsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-xl border bg-muted/20 p-2">
        {tabs.map((tab) => {
          const active = pathname?.startsWith(tab.href) ?? false;

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
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
