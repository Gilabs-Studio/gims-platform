"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";

interface LedgerBalanceCardProps {
  clearedBalance?: number;
  paymentsAmount?: number;
  paymentsCount?: number;
  depositsAmount?: number;
  depositsCount?: number;
}

export function LedgerBalanceCard({
  clearedBalance = 0,
  paymentsAmount = 0,
  paymentsCount = 0,
  depositsAmount = 0,
  depositsCount = 0,
}: LedgerBalanceCardProps) {
  const t = useTranslations("financeBankReconciliation");

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("ledgerBalance")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-baseline">
        <div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(clearedBalance, "USD")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t("cleared")}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4">
          <div className="text-base font-semibold text-foreground">
            {formatCurrency(paymentsAmount, "USD")}
          </div>
          <div className="text-xs text-muted-foreground">
            {paymentsCount} {t("payments")}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4">
          <div className="text-base font-semibold text-foreground">
            {formatCurrency(depositsAmount, "USD")}
          </div>
          <div className="text-xs text-muted-foreground">
            {depositsCount} {t("deposits")}
          </div>
        </div>
      </div>
    </div>
  );
}
