"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileEdit,
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ImageOff,
} from "lucide-react";
import { cn, formatCurrency, resolveImageUrl } from "@/lib/utils";
import { useInventory } from "@/features/stock/inventory/hooks/use-inventory";
import type { Product } from "../../types";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-right">{value ?? "-"}</span>
    </div>
  );
}

function GroupBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

const formatCurrencyValue = (value?: number) => (value ? formatCurrency(value) : "-");

export function ProductDetailDialog({
  open,
  onOpenChange,
  product,
}: ProductDetailDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  // Fetch stock per warehouse when dialog is open
  const { data: inventoryData, isLoading: inventoryLoading } = useInventory({
    product_id: product?.id,
    per_page: 50,
    enabled: open && !!product?.id,
  });

  const warehouseStocks = inventoryData?.data?.data ?? [];

  if (!product) return null;

  const statusBadge = () => {
    const map: Record<string, React.ReactNode> = {
      draft: (
        <Badge variant="secondary" className="gap-1">
          <FileEdit className="h-3 w-3" />Draft
        </Badge>
      ),
      pending: (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />Pending
        </Badge>
      ),
      approved: (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />Approved
        </Badge>
      ),
      rejected: (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />Rejected
        </Badge>
      ),
    };

    return map[product.status] ?? <Badge variant="outline">{product.status}</Badge>;
  };

  const stockStatusIcon = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      ok: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
      low_stock: <TrendingDown className="h-3.5 w-3.5 text-warning" />,
      out_of_stock: <AlertTriangle className="h-3.5 w-3.5 text-accent" />,
      overstock: <TrendingUp className="h-3.5 w-3.5 text-primary" />,
    };
    return map[status] ?? null;
  };

  const stockStatusColor = (status: string) => ({
    ok: "text-success",
    low_stock: "text-warning",
    out_of_stock: "text-accent",
    overstock: "text-primary",
  }[status] ?? "text-muted-foreground");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Minimal header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            <div className="h-14 w-14 shrink-0 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <Image
                  src={resolveImageUrl(product.image_url) ?? ""}
                  alt={product.name}
                  width={56}
                  height={56}
                  unoptimized
                  loader={({ src }: { src: string }) => src}
                  className="object-cover w-full h-full"
                />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {product.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.code}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {product.is_active ? (
                  <Badge variant="default" className="h-5 text-[10px]">
                    {tCommon("active")}
                  </Badge>
                ) : (
                  <Badge variant="inactive" className="h-5 text-[10px]">
                    {tCommon("inactive")}
                  </Badge>
                )}
                {statusBadge()}
                {product.category && (
                  <Badge variant="outline" className="h-5 text-[10px]">{product.category.name}</Badge>
                )}
              </div>
            </div>

            {/* Price summary */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-muted-foreground">{t("form.sellingPrice")}</p>
              <p className="text-base font-bold text-primary">{formatCurrencyValue(product.selling_price)}</p>
              {product.cost_price > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Cost: {formatCurrencyValue(product.cost_price)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Col 1: Classification */}
            <GroupBox title={t("section.classification")}>
              <InfoRow label={t("form.category")} value={product.category?.name} />
              <InfoRow label={t("form.brand")} value={product.brand?.name} />
              <InfoRow label={t("form.segment")} value={product.segment?.name} />
              <InfoRow label={t("form.type")} value={product.type?.name} />
              {product.manufacturer_part_number && (
                <InfoRow label={t("mpn")} value={product.manufacturer_part_number} />
              )}
            </GroupBox>

            {/* Col 2: Units & Pricing */}
            <GroupBox title={t("section.unitsPackaging")}>
              <InfoRow
                label={t("form.uom")}
                value={product.uom ? `${product.uom.name} (${product.uom.symbol})` : undefined}
              />
              <InfoRow
                label="Purchase UoM"
                value={product.purchase_uom ? `${product.purchase_uom.name} (${product.purchase_uom.symbol})` : undefined}
              />
              <InfoRow label={t("conversion")} value={product.purchase_uom_conversion || undefined} />
              <InfoRow label={t("form.packaging")} value={product.packaging?.name} />
              <InfoRow label={t("form.costPrice")} value={formatCurrencyValue(product.cost_price)} />
              <InfoRow label={t("currentHpp")} value={formatCurrencyValue(product.current_hpp)} />
            </GroupBox>

            {/* Col 3: Supply Chain */}
            <GroupBox title={t("section.supplyChain")}>
              <InfoRow label={t("form.supplier")} value={product.supplier?.name} />
              <InfoRow label={t("form.procurementType")} value={product.procurement_type?.name} />
              <InfoRow label={t("leadTime")} value={`${product.lead_time_days ?? 0} days`} />
              <InfoRow label={t("taxType")} value={product.tax_type} />
              <InfoRow
                label={t("taxInclusive")}
                value={product.is_tax_inclusive ? "Yes" : "No"}
              />
              <InfoRow label={t("form.businessUnit")} value={product.business_unit?.name} />
            </GroupBox>
          </div>

          {/* Stock per Warehouse */}
          <div className="mt-4 rounded-md border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stock by Warehouse
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                Total: <span className="font-semibold text-foreground">
                  {inventoryLoading
                    ? "..."
                    : warehouseStocks.reduce((sum, ws) => sum + (ws.on_hand ?? 0), 0).toLocaleString("id-ID")}
                </span>
                {product.uom && ` ${product.uom.symbol ?? product.uom.name}`}
              </span>
            </div>

            {inventoryLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : warehouseStocks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                No warehouse stock data
              </p>
            ) : (
              <div className="divide-y">
                {warehouseStocks.map((ws) => (
                  <div key={`${ws.warehouse_id}-${ws.product_id}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 text-sm font-medium truncate">{ws.warehouse_name ?? ws.warehouse_id}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex gap-1 items-center">
                        <span className="text-muted-foreground">On hand:</span>
                        <span className="font-semibold text-foreground">{ws.on_hand.toLocaleString("id-ID")}</span>
                      </span>
                      <span className="flex gap-1 items-center">
                        <span className="text-muted-foreground">Reserved:</span>
                        <span className="font-medium">{ws.reserved.toLocaleString("id-ID")}</span>
                      </span>
                      <span className={cn("flex gap-1 items-center font-semibold", stockStatusColor(ws.status))}>
                        {stockStatusIcon(ws.status)}
                        {ws.available.toLocaleString("id-ID")}
                        <span className="font-normal text-muted-foreground">{ws.uom_name}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {t("form.description") ?? "Description"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
