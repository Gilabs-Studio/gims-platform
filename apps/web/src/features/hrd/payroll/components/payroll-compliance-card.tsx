"use client";

import { useTranslations } from "next-intl";
import { FileText, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ComplianceTaxItem } from "../types/payroll.types";

interface PayrollComplianceCardProps {
  items: ComplianceTaxItem[];
  onSelectComplianceItem?: (item: ComplianceTaxItem) => void;
}

export function PayrollComplianceCard({
  items,
  onSelectComplianceItem,
}: PayrollComplianceCardProps) {
  const t = useTranslations("payroll");

  const getItemStyle = (type: ComplianceTaxItem["type"]) => {
    switch (type) {
      case "pph21":
        return {
          icon: FileText,
          bgColor: "bg-rose/10 text-rose",
        };
      case "bpjs_health":
        return {
          icon: ShieldCheck,
          bgColor: "bg-success/10 text-success",
        };
      case "bpjs_employment":
        return {
          icon: Clock,
          bgColor: "bg-rose/10 text-rose",
        };
      default:
        return {
          icon: FileText,
          bgColor: "bg-muted text-muted-foreground",
        };
    }
  };

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            {t("compliance.title")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {items.map((item) => {
            const { icon: IconComp, bgColor } = getItemStyle(item.type);
            return (
              <div
                key={item.id}
                onClick={() => onSelectComplianceItem?.(item)}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-rose transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground sm:text-sm tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </div>

      <div className="px-6 pb-4 pt-1">
        <button
          type="button"
          onClick={() => items.length > 0 && onSelectComplianceItem?.(items[0])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-rose hover:underline cursor-pointer"
        >
          {t("compliance.viewAllCompliance")} &gt;
        </button>
      </div>
    </Card>
  );
}
