"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  FileText,
  NotebookText,
} from "lucide-react";

import { usePurchaseOrder } from "../hooks/use-purchase-orders";
import { PurchaseOrderStatusBadge } from "./purchase-order-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

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
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{po?.code ?? t("detail.title")}</DialogTitle>
            {po && <PurchaseOrderStatusBadge status={po.status} />}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !po ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 py-4">
              {/* Header Card */}
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <NotebookText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{po.code}</h3>
                  <p className="text-sm text-muted-foreground">{t("detail.title")}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    {formatDate(po.order_date)}
                  </div>
                  {po.due_date ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{t("fields.dueDate")}:</span> {formatDate(po.due_date)}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                    <Building2 className="h-4 w-4" />
                    {t("fields.supplier")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.supplier")}</span>
                      <span className="col-span-2 font-medium">{supplierName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.paymentTerms")}</span>
                      <span className="col-span-2 font-medium">{paymentTermsName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.businessUnit")}</span>
                      <span className="col-span-2 font-medium">{businessUnitName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                    <FileText className="h-4 w-4" />
                    {t("fields.notes")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.notes")}</span>
                      <span className="col-span-2 font-medium">{po.notes ?? "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-3 flex justify-between items-center px-6">
                    <span className="text-sm text-muted-foreground">{t("summary.subtotal")}</span>
                    <span className="font-mono font-medium">{formatCurrency(po.sub_total ?? 0)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6">
                    <span className="text-sm text-muted-foreground">{t("summary.taxAmount")}</span>
                    <span className="font-mono font-medium">{formatCurrency(po.tax_amount ?? 0)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6 border-t">
                    <span className="text-sm text-muted-foreground">{t("summary.deliveryCost")}</span>
                    <span className="font-mono font-medium">{formatCurrency(po.delivery_cost ?? 0)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6 border-t">
                    <span className="text-sm text-muted-foreground">{t("summary.otherCost")}</span>
                    <span className="font-mono font-medium">{formatCurrency(po.other_cost ?? 0)}</span>
                  </div>
                  <div className="col-span-2 p-3 flex justify-between items-center px-6 border-t bg-muted/20">
                    <span className="font-semibold">{t("summary.total")}</span>
                    <span className="font-mono font-bold text-lg">{formatCurrency(po.total_amount)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="items" className="py-4">
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
                            <TableCell className="text-right font-mono">{formatCurrency(it.price)}</TableCell>
                            <TableCell className="text-right">{it.discount ?? 0}%</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(it.subtotal)}</TableCell>
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
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
