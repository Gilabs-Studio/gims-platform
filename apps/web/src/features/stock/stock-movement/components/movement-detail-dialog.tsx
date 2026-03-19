"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  sizeClasses,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { StockMovement } from "../types";
import { MovementBadge } from "./movement-badge";
import {
  ArrowRightLeft,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  Package,
  TrendingUp,
  User,
} from "lucide-react";

interface MovementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: StockMovement | null;
  relatedMovements?: StockMovement[];
}

interface TransferItemDetail {
  productKey: string;
  productName: string;
  productCode: string;
  qty: number;
  sourceWarehouse: string;
  targetWarehouse: string;
}

function isTransferMovement(movement: StockMovement | null) {
  return movement?.type === "TRANSFER" || movement?.ref_type?.toUpperCase() === "TRANSFER";
}

export function MovementDetailDialog({
  open,
  onOpenChange,
  item,
  relatedMovements,
}: MovementDetailDialogProps) {
  const t = useTranslations("stock_movement.dialog");

  const transferMovements = useMemo(() => {
    if (!item || !isTransferMovement(item)) {
      return [] as StockMovement[];
    }

    return (relatedMovements ?? [])
      .filter((movement) => {
        const sameReference = movement.ref_number === item.ref_number;
        return sameReference && isTransferMovement(movement);
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [item, relatedMovements]);

  const transferItems = useMemo(() => {
    const byProduct = new Map<string, TransferItemDetail>();

    for (const movement of transferMovements) {
      const productKey = movement.product_id || movement.product?.id || movement.id;
      const current = byProduct.get(productKey) ?? {
        productKey,
        productName: movement.product?.name ?? "-",
        productCode: movement.product?.code ?? "-",
        qty: Math.max(movement.qty_in, movement.qty_out),
        sourceWarehouse: "-",
        targetWarehouse: "-",
      };

      if (movement.product?.name) {
        current.productName = movement.product.name;
      }
      if (movement.product?.code) {
        current.productCode = movement.product.code;
      }

      if (movement.qty_out > 0 && movement.warehouse?.name) {
        current.sourceWarehouse = movement.warehouse.name;
        current.qty = Math.max(current.qty, movement.qty_out);
      }

      if (movement.qty_in > 0 && movement.warehouse?.name) {
        current.targetWarehouse = movement.warehouse.name;
        current.qty = Math.max(current.qty, movement.qty_in);
      }

      byProduct.set(productKey, current);
    }

    return Array.from(byProduct.values());
  }, [transferMovements]);

  const transferTotalValue = useMemo(() => {
    return transferMovements.reduce((sum, movement) => {
      if (movement.qty_out > 0) {
        return sum + movement.qty_out * movement.cost;
      }
      if (movement.qty_in > 0) {
        return sum + movement.qty_in * movement.cost;
      }
      return sum;
    }, 0);
  }, [transferMovements]);

  if (!item) {
    return null;
  }

  const transferSourceWarehouse =
    transferItems.find((detail) => detail.sourceWarehouse !== "-")?.sourceWarehouse ?? "-";
  const transferTargetWarehouse =
    transferItems.find((detail) => detail.targetWarehouse !== "-")?.targetWarehouse ?? "-";

  if (isTransferMovement(item)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(sizeClasses["2xl"], "max-h-[90vh] overflow-y-auto")}>
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-xl">{t("title")}</DialogTitle>
              <MovementBadge type={item.type} refType={item.ref_type} />
              <Badge variant="outline">
                <ArrowRightLeft className="mr-1 h-3 w-3" />
                {t("transferTitle")}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("transferSummary")}</p>
                  <p className="font-semibold text-lg">{item.ref_number}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-start sm:justify-end">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(item.date)}
                  </div>
                  <div className="flex items-center gap-2 justify-start sm:justify-end mt-1">
                    <User className="h-3.5 w-3.5" />
                    {item.creator?.name ?? "-"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("transferSource")}
                  </p>
                  <p className="mt-1 font-medium">{transferSourceWarehouse}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("transferTarget")}
                  </p>
                  <p className="mt-1 font-medium">{transferTargetWarehouse}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-sm border-b pb-2 flex-1">
                  {t("transferItems")}
                </h4>
                <Badge variant="secondary" className="shrink-0">
                  {t("transferItemCount", { count: transferItems.length })}
                </Badge>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_1fr_0.7fr] border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>{t("transferProduct")}</span>
                  <span>{t("transferFrom")}</span>
                  <span>{t("transferTo")}</span>
                  <span className="text-right">{t("transferQty")}</span>
                </div>

                {transferItems.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">{t("transferSingleMovement")}</div>
                ) : (
                  transferItems.map((detail) => (
                    <div
                      key={detail.productKey}
                      className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_1fr_0.7fr] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{detail.productName}</p>
                        <p className="text-xs text-muted-foreground truncate">{detail.productCode}</p>
                      </div>

                      <div className="text-sm text-muted-foreground md:text-foreground">
                        {detail.sourceWarehouse}
                      </div>

                      <div className="text-sm text-muted-foreground md:text-foreground">
                        {detail.targetWarehouse}
                      </div>

                      <div className="text-right font-mono font-semibold">{detail.qty}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x border-b">
                <div className="p-3 flex justify-between items-center px-6">
                  <span className="text-sm text-muted-foreground">{t("unitCost")}</span>
                  <span className="font-mono font-medium">{formatCurrency(item.cost)}</span>
                </div>
                <div className="p-3 flex justify-between items-center px-6">
                  <span className="text-sm text-muted-foreground">{t("totalValue")}</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(transferTotalValue)}
                  </span>
                </div>
              </div>

              <div className="p-4 text-sm text-muted-foreground">{t("transferLinkedMovement")}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses.xl, "max-h-[90vh] overflow-y-auto")}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{t("title")}</DialogTitle>
            <MovementBadge type={item.type} refType={item.ref_type} />
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{item.product?.name ?? "Unknown Product"}</h3>
              <p className="text-sm text-muted-foreground font-mono">{item.product?.code}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(item.date)}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 justify-end">
                <User className="h-3 w-3" />
                {item.creator?.name ?? "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                <FileText className="h-4 w-4" />
                {t("refInfo")}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Type</span>
                  <span className="col-span-2 font-medium">{item.ref_type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">No.</span>
                  <span className="col-span-2 font-mono font-medium text-primary cursor-pointer hover:underline">
                    {item.ref_number}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">ID</span>
                  <span className="col-span-2 font-mono text-xs text-muted-foreground truncate" title={item.ref_id}>
                    {item.ref_id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                <MapPin className="h-4 w-4" />
                {t("movementInfo")}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Warehouse</span>
                  <span className="col-span-2 font-medium">{item.warehouse?.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground">Source</span>
                  <span className="col-span-2 font-medium">{item.source || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-y md:divide-y-0">
              <div className="p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">{t("qtyIn")}</p>
                <p
                  className={cn(
                    "text-xl font-bold font-mono",
                    item.qty_in > 0 ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {item.qty_in > 0 ? `+${item.qty_in}` : "-"}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {item.product?.unit_of_measure?.symbol}
                  </span>
                </p>
              </div>
              <div className="p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">{t("qtyOut")}</p>
                <p
                  className={cn(
                    "text-xl font-bold font-mono",
                    item.qty_out > 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.qty_out > 0 ? `-${item.qty_out}` : "-"}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {item.product?.unit_of_measure?.symbol}
                  </span>
                </p>
              </div>
              <div className="p-4 text-center space-y-1 bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase font-semibold">{t("balanceAfter")}</p>
                <p className="text-xl font-bold font-mono">
                  {item.balance}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {item.product?.unit_of_measure?.symbol}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x border-t">
              <div className="p-3 flex justify-between items-center px-6">
                <span className="text-sm text-muted-foreground">{t("unitCost")}</span>
                <span className="font-mono font-medium">{formatCurrency(item.cost)}</span>
              </div>
              <div className="p-3 flex justify-between items-center px-6">
                <span className="text-sm text-muted-foreground">{t("totalValue")}</span>
                <span className="font-mono font-bold">
                  {formatCurrency((item.qty_in + item.qty_out) * item.cost)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-4 text-sm flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("qtyIn")}
              </span>
              <span className="font-semibold">{item.qty_in}</span>
            </div>
            <div className="rounded-md border p-4 text-sm flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t("unitCost")}
              </span>
              <span className="font-semibold">{formatCurrency(item.cost)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
