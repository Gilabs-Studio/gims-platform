"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";

interface StatementBalanceCardProps {
  endingBalance?: number;
  clearedBalance?: number;
  difference?: number;
}

export function StatementBalanceCard({
  endingBalance = 0,
  clearedBalance = 0,
  difference = 0,
}: StatementBalanceCardProps) {
  const t = useTranslations("financeBankReconciliation");

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("statementBalance")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-baseline">
        <div>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(endingBalance, "USD")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t("ending")}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4">
          <div className="text-base font-semibold text-foreground">
            {formatCurrency(clearedBalance, "USD")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("cleared")}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4">
          <div
            className={`text-base font-semibold ${
              difference !== 0 ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatCurrency(difference, "USD")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("difference")}
          </div>
        </div>
      </div>
    </div>
  );
}
