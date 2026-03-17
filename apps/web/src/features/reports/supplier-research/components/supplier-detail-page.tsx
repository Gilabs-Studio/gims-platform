"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { PageMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useSupplierDetail } from "../hooks/use-supplier-detail";

interface SupplierDetailPageProps {
  readonly supplierId: string;
}

export function SupplierDetailPage({ supplierId }: SupplierDetailPageProps) {
  const t = useTranslations("supplierResearchReport.detail");
  const router = useRouter();
  const { detail, isLoading } = useSupplierDetail(supplierId);

  if (isLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </PageMotion>
    );
  }

  if (!detail) {
    return (
      <PageMotion className="space-y-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/reports/supplier-research")}
          className="inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
          {t("notFound")}
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="space-y-6">
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push("/reports/supplier-research")}
        className="inline-flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{detail.supplier_name}</h1>
        <p className="text-muted-foreground">{detail.supplier_code ?? "-"}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("summaryTitle")}</CardTitle>
          <CardDescription>{t("summaryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Metric label={t("totalPurchaseValue")} value={formatCurrency(detail.total_purchase_value)} />
          <Metric
            label={t("totalPurchaseOrders")}
            value={detail.total_purchase_orders.toLocaleString("id-ID")}
          />
          <Metric label={t("averageLeadTime")} value={`${detail.average_lead_time_days.toFixed(2)} days`} />
          <Metric label={t("onTimeRate")} value={`${detail.supplier_on_time_rate.toFixed(2)}%`} />
          <Metric
            label={t("lateDeliveries")}
            value={detail.late_delivery_count.toLocaleString("id-ID")}
          />
          <Metric label={t("dependencyScore")} value={`${detail.dependency_score.toFixed(2)}%`} />
        </CardContent>
      </Card>
    </PageMotion>
  );
}

interface MetricProps {
  readonly label: string;
  readonly value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
