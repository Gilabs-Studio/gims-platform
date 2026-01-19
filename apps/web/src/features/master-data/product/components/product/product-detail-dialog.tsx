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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {t("view")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label={t("form.code")} value={product.code} />
              <InfoItem label={t("form.name")} value={product.name} />
            </div>
            <InfoItem
              label="Manufacturer Part Number"
              value={product.manufacturer_part_number}
            />
            <InfoItem label={t("form.description")} value={product.description} />
          </Section>

          <Separator />

          {/* Classification */}
          <Section title="Classification">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label={t("form.category")} value={product.category?.name} />
              <InfoItem label={t("form.brand")} value={product.brand?.name} />
              <InfoItem label={t("form.segment")} value={product.segment?.name} />
              <InfoItem label={t("form.type")} value={product.type?.name} />
            </div>
          </Section>

          <Separator />

          {/* Units & Packaging */}
          <Section title="Units & Packaging">
            <div className="grid grid-cols-3 gap-4">
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
                label="Conversion Rate"
                value={product.purchase_uom_conversion}
              />
              <InfoItem label={t("form.packaging")} value={product.packaging?.name} />
            </div>
          </Section>

          <Separator />

          {/* Supply Chain */}
          <Section title="Supply Chain">
            <div className="grid grid-cols-3 gap-4">
              <InfoItem
                label="Procurement Type"
                value={product.procurement_type?.name}
              />
              <InfoItem label={t("form.supplier")} value={product.supplier?.name} />
              <InfoItem
                label={t("form.businessUnit")}
                value={product.business_unit?.name}
              />
              <InfoItem label="Lead Time" value={`${product.lead_time_days ?? 0} days`} />
              <InfoItem label="Tax Type" value={product.tax_type} />
              <InfoItem
                label="Tax Inclusive"
                value={product.is_tax_inclusive ? "Yes" : "No"}
              />
            </div>
          </Section>

          <Separator />

          {/* Pricing & Stock */}
          <Section title="Pricing & Stock">
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label={t("form.costPrice")} value={formatCurrency(product.cost_price)} />
              <InfoItem label={t("form.sellingPrice")} value={formatCurrency(product.selling_price)} />
              <InfoItem label="Current HPP" value={formatCurrency(product.current_hpp)} />
              <InfoItem label="Current Stock" value={product.current_stock} />
              <InfoItem label={t("form.minStock")} value={product.min_stock} />
              <InfoItem label={t("form.maxStock")} value={product.max_stock} />
            </div>
          </Section>

          <Separator />

          {/* Status */}
          <Section title="Status">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label={t("form.isActive")}
                value={
                  product.is_active ? (
                    <Badge className="bg-green-500">{tCommon("active")}</Badge>
                  ) : (
                    <Badge variant="secondary">{tCommon("inactive")}</Badge>
                  )
                }
              />
              <InfoItem label="Approval Status" value={getStatusBadge(product.status)} />
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
