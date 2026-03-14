"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageSearch,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockCheck } from "../hooks/use-deals";
import type { StockCheckItemResponse } from "../types";

interface DealStockCheckProps {
  dealId: string;
}

/**
 * Displays stock availability per product item for a deal.
 * Triggered on demand — user clicks "Check Stock" to fetch data.
 */
export function DealStockCheck({ dealId }: DealStockCheckProps) {
  const t = useTranslations("crmDeal");
  const { data, isLoading, isError, refetch, isFetched } = useStockCheck(dealId, false);

  const handleCheck = () => {
    refetch();
  };

  if (!isFetched && !isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        className="cursor-pointer"
      >
        <PackageSearch className="h-4 w-4 mr-1" />
        {t("stock.checkStock")}
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{t("stock.checking")}</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <XCircle className="h-3.5 w-3.5" />
        <span>{t("stock.checkError")}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCheck}
          className="cursor-pointer h-6 px-2 text-xs"
        >
          {t("stock.retry")}
        </Button>
      </div>
    );
  }

  const fmt = (n: number) => (n % 1 === 0 ? n.toString() : n.toFixed(2));

  return (
    <div className="space-y-2">
      {/* Overall status badge */}
      <div className="flex items-center gap-2">
        {data.all_sufficient ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-green-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("stock.allSufficient")}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("stock.someInsufficient")}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCheck}
          className="cursor-pointer h-6 px-2 text-xs text-muted-foreground"
        >
          {t("stock.refresh")}
        </Button>
      </div>

      {/* Per-item breakdown */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">{t("product")}</th>
              <th className="text-right p-2 font-medium">{t("stock.requested")}</th>
              <th className="text-right p-2 font-medium">{t("stock.available")}</th>
              <th className="text-center p-2 font-medium">{t("stock.status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: StockCheckItemResponse) => (
              <tr key={item.product_id} className="border-t">
                <td className="p-2 font-medium">{item.product_name}</td>
                <td className="text-right p-2">{fmt(item.requested_quantity)}</td>
                <td className="text-right p-2">{fmt(item.available_stock)}</td>
                <td className="text-center p-2">
                  {item.is_sufficient ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success inline-block" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive inline-block" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
