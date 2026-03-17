"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { SupplierResearchKpis } from "../types";

interface SupplierResearchKpiCardsProps {
  readonly kpis?: SupplierResearchKpis;
  readonly isLoading: boolean;
}

export function SupplierResearchKpiCards({
  kpis,
  isLoading,
}: SupplierResearchKpiCardsProps) {
  const t = useTranslations("supplierResearchReport.kpi");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`supplier-kpi-skeleton-${index}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSuppliers = kpis?.total_suppliers ?? 0;
  const activeSuppliers = kpis?.active_suppliers ?? 0;
  const totalPurchaseValue = kpis?.total_purchase_value ?? 0;
  const averageLeadTimeDays = kpis?.average_lead_time_days ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("totalSuppliers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{totalSuppliers.toLocaleString("id-ID")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("activeSuppliers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{activeSuppliers.toLocaleString("id-ID")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("totalPurchaseValue")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCurrency(totalPurchaseValue)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("avgLeadTime")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {averageLeadTimeDays.toFixed(2)} {t("days")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
