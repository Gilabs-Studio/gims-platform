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
      subtextColor: "text-success font-medium",
      icon: Wallet,
      iconBg: "bg-success/10 text-success",
    },
    {
      title: t("metrics.totalEmployees"),
      value: metrics.totalEmployees.toString(),
      subtext: t("metrics.activePerDate", { date: metrics.activeEmployeeDate }),
      subtextColor: "text-muted-foreground",
      icon: Users,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      title: t("metrics.basicSalary"),
      value: formatCurrency(metrics.basicSalary),
      subtext: t("metrics.pctOfTotal", { pct: metrics.basicSalaryPct }),
      subtextColor: "text-muted-foreground",
      icon: Banknote,
      iconBg: "bg-warning/10 text-warning",
    },
    {
      title: t("metrics.allowances"),
      value: formatCurrency(metrics.allowances),
      subtext: t("metrics.pctOfTotal", { pct: metrics.allowancesPct }),
      subtextColor: "text-muted-foreground",
      icon: Gift,
      iconBg: "bg-purple/10 text-purple",
    },
    {
      title: t("metrics.deductions"),
      value: formatCurrency(metrics.deductions),
      subtext: t("metrics.pctOfTotal", { pct: metrics.deductionsPct }),
      subtextColor: "text-muted-foreground",
      icon: MinusCircle,
      iconBg: "bg-rose/10 text-rose",
    },
    {
      title: t("metrics.netPay"),
      value: formatCurrency(metrics.netPay),
      subtext: t("metrics.pctOfTotal", { pct: metrics.netPayPct }),
      subtextColor: "text-muted-foreground",
      icon: CreditCard,
      iconBg: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="relative overflow-hidden transition-shadow hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
              <p className={`mt-2 text-xs ${card.subtextColor}`}>
                {card.subtext}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
