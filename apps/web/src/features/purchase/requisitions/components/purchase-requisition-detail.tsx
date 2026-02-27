"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  User,
  XCircle,
} from "lucide-react";

import { usePurchaseRequisition } from "../hooks/use-purchase-requisitions";

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
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  switch (normalizeStatus(status)) {
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <Clock className="h-3 w-3 mr-1" />
          {t("status.draft")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <FileText className="h-3 w-3 mr-1" />
          {t("status.submitted")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.approved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t("status.rejected")}
        </Badge>
      );
    case "converted":
      return (
        <Badge variant="outline" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.converted")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="inactive" className="text-xs font-medium">
          <XCircle className="h-3 w-3 mr-1" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs font-medium">{status}</Badge>;
  }
}

interface PurchaseRequisitionDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly requisitionId?: string | null;
}

export function PurchaseRequisitionDetail({ open, onClose, requisitionId }: PurchaseRequisitionDetailProps) {
  const t = useTranslations("purchaseRequisition");
  const id = requisitionId ?? "";
  const { data, isLoading, isError } = usePurchaseRequisition(id, {
    enabled: open && !!requisitionId,
  });
  const pr = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{pr?.code ?? t("detail.title")}</DialogTitle>
            {pr && <StatusBadge status={pr.status} t={t} />}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !pr ? (
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
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{pr.code}</h3>
                  <p className="text-sm text-muted-foreground">{t("detail.title")}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {safeDate(pr.request_date)}
                  </div>
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
                      <span className="col-span-2 font-medium">{pr.supplier?.name ?? "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.paymentTerms")}</span>
                      <span className="col-span-2 font-medium">{pr.payment_terms?.name ?? "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                    <User className="h-4 w-4" />
                    {t("fields.requestedBy")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.businessUnit")}</span>
                      <span className="col-span-2 font-medium">{pr.business_unit?.name ?? "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.requestedBy")}</span>
                      <span className="col-span-2 font-medium">{pr.user?.email ?? "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-3 flex justify-between items-center px-6">
                    <span className="text-sm text-muted-foreground">{t("fields.subtotal")}</span>
                    <span className="font-mono font-medium">{formatMoney(pr.subtotal)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6">
                    <span className="text-sm text-muted-foreground">{t("fields.taxAmount")}</span>
                    <span className="font-mono font-medium">{formatMoney(pr.tax_amount)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6 border-t">
                    <span className="text-sm text-muted-foreground">{t("fields.deliveryCost")}</span>
                    <span className="font-mono font-medium">{formatMoney(pr.delivery_cost)}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center px-6 border-t">
                    <span className="text-sm text-muted-foreground">{t("fields.otherCost")}</span>
                    <span className="font-mono font-medium">{formatMoney(pr.other_cost)}</span>
                  </div>
                  <div className="col-span-2 p-3 flex justify-between items-center px-6 border-t bg-muted/20">
                    <span className="font-semibold">{t("fields.total")}</span>
                    <span className="font-mono font-bold text-lg">{formatMoney(pr.total_amount)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="items" className="py-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fields.product")}</TableHead>
                      <TableHead className="text-right">{t("fields.quantity")}</TableHead>
                      <TableHead className="text-right">{t("fields.purchasePrice")}</TableHead>
                      <TableHead className="text-right">{t("fields.discount")}</TableHead>
                      <TableHead className="text-right">{t("fields.subtotal")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pr.items?.length ? (
                      pr.items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">
                            {it.product?.name ?? it.product_id}
                          </TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(it.purchase_price)}</TableCell>
                          <TableCell className="text-right">{it.discount}%</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(it.subtotal)}</TableCell>
                        </TableRow>
                      ))
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
