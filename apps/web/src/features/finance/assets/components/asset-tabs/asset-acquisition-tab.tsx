"use client";

import { useTranslations } from "next-intl";
import {
  Package,
  Truck,
  Wrench,
  Receipt,
  DollarSign,
  Calculator,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import type { Asset } from "../../types";
import { formatDate } from "@/lib/utils";

interface AssetAcquisitionTabProps {
  asset: Asset | undefined;
  isLoading: boolean;
}

interface CostItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AssetAcquisitionTab({
  asset,
  isLoading,
}: AssetAcquisitionTabProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon("noData")}
      </div>
    );
  }

  // Build cost breakdown items
  const costItems: CostItem[] = [
    {
      label: t("detail.fields.basePrice") || "Base Price",
      value: asset.acquisition_cost || 0,
      icon: <DollarSign className="h-4 w-4" />,
      color: "bg-blue-500",
    },
    {
      label: t("detail.fields.shippingCost"),
      value: asset.shipping_cost || 0,
      icon: <Truck className="h-4 w-4" />,
      color: "bg-green-500",
    },
    {
      label: t("detail.fields.installationCost"),
      value: asset.installation_cost || 0,
      icon: <Wrench className="h-4 w-4" />,
      color: "bg-amber-500",
    },
    {
      label: t("detail.fields.taxAmount"),
      value: asset.tax_amount || 0,
      icon: <Receipt className="h-4 w-4" />,
      color: "bg-purple-500",
    },
    {
      label: t("detail.fields.otherCosts"),
      value: asset.other_costs || 0,
      icon: <Package className="h-4 w-4" />,
      color: "bg-pink-500",
    },
  ];

  const totalCost =
    asset.total_cost || costItems.reduce((sum, item) => sum + item.value, 0);

  // Calculate percentages for visual breakdown
  const getPercentage = (value: number): number => {
    if (totalCost === 0) return 0;
    return Math.round((value / totalCost) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Acquisition Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("detail.sections.acquisitionDetails") || "Acquisition Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Supplier Info */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.supplier") || "Supplier"}
              </p>
              <p className="text-sm font-medium">
                {asset.acquisition_cost_breakdown?.supplier_name || "—"}
              </p>
            </div>

            {/* Purchase Order */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.purchaseOrder") || "Purchase Order"}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {asset.acquisition_cost_breakdown?.po_number || "—"}
                </p>
                {asset.acquisition_cost_breakdown?.po_number && (
                  <Badge variant="secondary" className="text-xs">
                    PO
                  </Badge>
                )}
              </div>
            </div>

            {/* Invoice */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.invoice") || "Invoice"}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {asset.acquisition_cost_breakdown?.invoice_number || "—"}
                </p>
                {asset.acquisition_cost_breakdown?.invoice_number && (
                  <Badge variant="outline" className="text-xs">
                    INV
                  </Badge>
                )}
              </div>
            </div>

            {/* Acquisition Date */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("fields.acquisitionDate")}
              </p>
              <p className="text-sm font-medium">
                {formatDate(asset.acquisition_date)}
              </p>
            </div>

            {/* Invoice Date */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.invoiceDate") || "Invoice Date"}
              </p>
              <p className="text-sm font-medium">
                {asset.acquisition_cost_breakdown?.invoice_date
                  ? formatDate(asset.acquisition_cost_breakdown.invoice_date)
                  : "—"}
              </p>
            </div>

            {/* Payment Status */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.paymentStatus") || "Payment Status"}
              </p>
              <Badge
                variant={
                  asset.acquisition_cost_breakdown?.is_paid
                    ? "success"
                    : "secondary"
                }
                className="text-xs"
              >
                {asset.acquisition_cost_breakdown?.is_paid
                  ? t("detail.fields.paid") || "Paid"
                  : t("detail.fields.unpaid") || "Unpaid"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t("detail.sections.costBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Cost Breakdown */}
          <div className="space-y-4">
            <div className="flex h-4 overflow-hidden rounded-full">
              {costItems.map((item, index) => {
                const percentage = getPercentage(item.value);
                if (percentage === 0) return null;
                return (
                  <div
                    key={index}
                    className={`${item.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                    title={`${item.label}: ${formatNumber(item.value)} (${percentage}%)`}
                  />
                );
              })}
            </div>

            {/* Cost Items with Progress Bars */}
            <div className="space-y-3">
              {costItems.map((item, index) => {
                const percentage = getPercentage(item.value);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`${item.color} p-1 rounded text-white`}>
                          {item.icon}
                        </div>
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {formatNumber(item.value)}
                        </span>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Cost */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded text-primary-foreground">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="font-semibold">
                  {t("detail.fields.totalCost")}
                </span>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatNumber(totalCost)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("detail.sections.costDetails") || "Cost Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("description")}</TableHead>
                  <TableHead className="text-right">
                    {tCommon("amount")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("detail.fields.percentage") || "% of Total"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`${item.color} p-1 rounded text-white`}>
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(item.value)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {getPercentage(item.value)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary p-1 rounded text-primary-foreground">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <span>{t("detail.fields.totalCost")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {formatNumber(totalCost)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    100%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
