"use client";

import { useTranslations } from "next-intl";
import { Wallet, Users, Banknote, Gift, MinusCircle, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PayrollMetricSummary } from "../types/payroll.types";

interface PayrollSummaryCardsProps {
  metrics?: PayrollMetricSummary;
}

export function PayrollSummaryCards({ metrics }: PayrollSummaryCardsProps) {
  const t = useTranslations("payroll");

  if (!metrics) return null;

  const cards = [
    {
      title: t("metrics.totalPayroll"),
      value: formatCurrency(metrics.totalPayrollThisMonth),
      subtext: `↑ ${metrics.totalPayrollChangePct}% ${t("metrics.comparedToLastMonth")}`,
      isBadge: true,
      badgeClass: "bg-success/15 text-success font-semibold",
      icon: Wallet,
      iconBg: "bg-rose/10 text-rose",
    },
    {
      title: t("metrics.totalEmployees"),
      value: metrics.totalEmployees.toString(),
      subtext: t("metrics.activePerDate", { date: metrics.activeEmployeeDate }),
      isBadge: false,
      badgeClass: "text-muted-foreground font-normal",
      icon: Users,
      iconBg: "bg-purple/10 text-purple",
    },
    {
      title: t("metrics.basicSalary"),
      value: formatCurrency(metrics.basicSalary),
      subtext: t("metrics.pctOfTotal", { pct: metrics.basicSalaryPct }),
      isBadge: true,
      badgeClass: "bg-success/15 text-success font-semibold",
      icon: Banknote,
      iconBg: "bg-success/10 text-success",
    },
    {
      title: t("metrics.allowances"),
      value: formatCurrency(metrics.allowances),
      subtext: t("metrics.pctOfTotal", { pct: metrics.allowancesPct }),
      isBadge: true,
      badgeClass: "bg-warning/15 text-warning font-semibold",
      icon: Gift,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      title: t("metrics.deductions"),
      value: formatCurrency(metrics.deductions),
      subtext: t("metrics.pctOfTotal", { pct: metrics.deductionsPct }),
      isBadge: true,
      badgeClass: "bg-rose/15 text-rose font-semibold",
      icon: MinusCircle,
      iconBg: "bg-rose/10 text-rose",
    },
    {
      title: t("metrics.netPay"),
      value: formatCurrency(metrics.netPay),
      subtext: t("metrics.pctOfTotal", { pct: metrics.netPayPct }),
      isBadge: true,
      badgeClass: "bg-primary/15 text-primary font-semibold",
      icon: CreditCard,
      iconBg: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={index}
            className="relative overflow-hidden border border-border/60 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <CardContent className="p-0 flex flex-col justify-between h-full space-y-3">
              {/* Top Row: Icon Container at Top Left */}
              <div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <IconComponent className="h-4.5 w-4.5" />
                </div>
              </div>

              {/* Title & Numeric Value */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl tabular-nums">
                  {card.value}
                </p>
              </div>

              {/* Bottom Subtext / Badge */}
              <div>
                {card.isBadge ? (
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] tabular-nums ${card.badgeClass}`}>
                    {card.subtext}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {card.subtext}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
