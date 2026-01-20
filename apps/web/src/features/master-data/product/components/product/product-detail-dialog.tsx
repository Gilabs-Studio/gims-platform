"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Clock, FileEdit } from "lucide-react";
import type { Product } from "../../types";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

export function ProductDetailDialog({
  open,
  onOpenChange,
  product,
}: ProductDetailDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  if (!product) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <FileEdit className="mr-1 h-3 w-3" />
            Draft
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {t("view")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Section: Image + Basic Info */}
          <div className="flex gap-6 items-start">
            <div className="w-32 h-32 shrink-0 bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xs text-center p-2">
                  {t("noImage")}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <h3 className="text-lg font-bold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.code}</p>
              </div>
              <div className="flex items-center gap-2">
                {product.is_active ? (
                  <Badge className="bg-green-500">{tCommon("active")}</Badge>
                ) : (
                  <Badge variant="secondary">{tCommon("inactive")}</Badge>
                )}
                {getStatusBadge(product.status)}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description || "-"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <Section title={t("section.classification")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label={t("form.category")} value={product.category?.name} />
                  <InfoItem label={t("form.brand")} value={product.brand?.name} />
                  <InfoItem label={t("form.segment")} value={product.segment?.name} />
                  <InfoItem label={t("form.type")} value={product.type?.name} />
                </div>
                <div className="mt-4">
                   <InfoItem label={t("mpn")} value={product.manufacturer_part_number} />
                </div>
              </Section>

              <Section title={t("section.unitsPackaging")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label={t("form.uom")}
                    value={
                      product.uom ? `${product.uom.name} (${product.uom.symbol})` : "-"
                    }
                  />
                  <InfoItem
                    label="Purchase UoM"
                    value={
                      product.purchase_uom
                        ? `${product.purchase_uom.name} (${product.purchase_uom.symbol})`
                        : "-"
                    }
                  />
                  <InfoItem
                    label={t("conversion")}
                    value={product.purchase_uom_conversion}
                  />
                  <InfoItem label={t("form.packaging")} value={product.packaging?.name} />
                </div>
              </Section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Section title={t("section.pricingStock")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label={t("form.sellingPrice")} value={formatCurrency(product.selling_price)} />
                  <InfoItem label={t("form.costPrice")} value={formatCurrency(product.cost_price)} />
                  <InfoItem label={t("currentHpp")} value={formatCurrency(product.current_hpp)} />
                  <InfoItem label={t("currentStock")} value={product.current_stock} />
                  <InfoItem label={t("form.minStock")} value={product.min_stock} />
                  <InfoItem label={t("form.maxStock")} value={product.max_stock} />
                </div>
              </Section>

              <Section title={t("section.supplyChain")}>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label={t("form.supplier")} value={product.supplier?.name} />
                  <InfoItem
                    label={t("form.procurementType")}
                    value={product.procurement_type?.name}
                  />
                  <InfoItem
                    label={t("leadTime")}
                    value={`${product.lead_time_days ?? 0} ${t("days")}`}
                  />
                  <InfoItem label={t("taxType")} value={product.tax_type} />
                  <InfoItem
                    label={t("taxInclusive")}
                    value={product.is_tax_inclusive ? "Yes" : "No"}
                  />
                   <InfoItem
                    label={t("form.businessUnit")}
                    value={product.business_unit?.name}
                  />
                </div>
              </Section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
