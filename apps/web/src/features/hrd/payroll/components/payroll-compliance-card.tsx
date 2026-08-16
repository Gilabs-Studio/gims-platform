"use client";

import { useTranslations } from "next-intl";
import { FileText, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ComplianceTaxItem } from "../types/payroll.types";

interface PayrollComplianceCardProps {
  items: ComplianceTaxItem[];
}

export function PayrollComplianceCard({ items }: PayrollComplianceCardProps) {
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
          bgColor: "bg-primary/10 text-primary",
        };
      default:
        return {
          icon: FileText,
          bgColor: "bg-muted text-muted-foreground",
        };
    }
  };

  return (
    <Card className="h-full">
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
              className="group flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
                  <IconComp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground sm:text-sm">
                  {formatCurrency(item.amount)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
