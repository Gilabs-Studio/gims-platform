"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePurchaseOrder } from "../hooks/use-purchase-orders";

function formatMoney(value: number | null | undefined): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safe);
}

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getNameFromUnknown(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const maybe = value.name;
  return typeof maybe === "string" && maybe.trim() ? maybe : null;
}

interface PurchaseOrderDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly purchaseOrderId?: string | null;
}

export function PurchaseOrderDetail({
  open,
  onClose,
  purchaseOrderId,
}: PurchaseOrderDetailProps) {
  const t = useTranslations("purchaseOrder");
  const id = purchaseOrderId ?? "";

  const { data, isLoading, isError } = usePurchaseOrder(id, {
    enabled: open && !!purchaseOrderId,
  });

  const po = data?.data;
  const supplierName = getNameFromUnknown(po?.supplier) ?? "-";
  const paymentTermsName = getNameFromUnknown(po?.payment_terms) ?? "-";
  const businessUnitName = getNameFromUnknown(po?.business_unit) ?? "-";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !po ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{po.code}</span>
              <Badge variant="outline" className="text-xs font-medium">
                {po.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("fields.orderDate")}: {safeDate(po.order_date)}
              </span>
              {po.due_date ? (
                <span className="text-sm text-muted-foreground">
                  {t("fields.dueDate")}: {safeDate(po.due_date)}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("fields.supplier")}: </span>
                <span className="font-medium">{supplierName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("fields.paymentTerms")}: </span>
                <span className="font-medium">{paymentTermsName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("fields.businessUnit")}: </span>
                <span className="font-medium">{businessUnitName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("fields.notes")}: </span>
                <span className="font-medium">{po.notes ?? "-"}</span>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("items.fields.product")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.quantity")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.price")}</TableHead>
                    <TableHead className="text-right">{t("items.fields.discount")}</TableHead>
                    <TableHead className="text-right">{t("columns.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items?.length ? (
                    po.items.map((it) => {
                      const productName = getNameFromUnknown(it.product) ?? it.product_id;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">{productName}</TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right">{formatMoney(it.price)}</TableCell>
                          <TableCell className="text-right">{it.discount ?? 0}%</TableCell>
                          <TableCell className="text-right">{formatMoney(it.subtotal)}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        {t("emptyItems")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">{t("summary.subtotal")}</div>
              <div className="text-right font-medium">{formatMoney(po.sub_total ?? 0)}</div>
              <div className="text-muted-foreground">{t("summary.taxAmount")}</div>
              <div className="text-right font-medium">{formatMoney(po.tax_amount ?? 0)}</div>
              <div className="text-muted-foreground">{t("summary.deliveryCost")}</div>
              <div className="text-right font-medium">{formatMoney(po.delivery_cost ?? 0)}</div>
              <div className="text-muted-foreground">{t("summary.otherCost")}</div>
              <div className="text-right font-medium">{formatMoney(po.other_cost ?? 0)}</div>
              <div className="text-muted-foreground font-semibold">{t("summary.total")}</div>
              <div className="text-right font-semibold">{formatMoney(po.total_amount)}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
