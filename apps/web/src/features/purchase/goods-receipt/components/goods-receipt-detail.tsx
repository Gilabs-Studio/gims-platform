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
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Package,
} from "lucide-react";

import { useGoodsReceipt } from "../hooks/use-goods-receipts";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
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
    case "confirmed":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {t("status.confirmed")}
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs font-medium">{status}</Badge>;
  }
}

interface GoodsReceiptDetailProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly goodsReceiptId?: string | null;
}

export function GoodsReceiptDetail({ open, onClose, goodsReceiptId }: GoodsReceiptDetailProps) {
  const t = useTranslations("goodsReceipt");
  const id = goodsReceiptId ?? "";

  const { data, isLoading, isError } = useGoodsReceipt(id, {
    enabled: open && !!goodsReceiptId,
  });

  const gr = data?.data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl">{gr?.code ?? t("detail.title")}</DialogTitle>
            {gr && <StatusBadge status={gr.status} t={t} />}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError || !gr ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Header Card */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{gr.code}</h3>
                <p className="text-sm text-muted-foreground">{t("detail.title")}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="h-3 w-3" />
                  {safeDate(gr.receipt_date)}
                </div>
              </div>
            </div>

            {/* Reference & Supplier Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <FileText className="h-4 w-4" />
                  {t("fields.purchaseOrder")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.purchaseOrder")}</span>
                    <span className="col-span-2 font-mono font-medium text-primary">
                      {gr.purchase_order?.code ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                  <Building2 className="h-4 w-4" />
                  {t("fields.supplier")}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{t("fields.supplier")}</span>
                    <span className="col-span-2 font-medium">{gr.supplier?.name ?? "-"}</span>
                  </div>
                  {gr.notes ? (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">{t("fields.notes")}</span>
                      <span className="col-span-2 font-medium">{gr.notes}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2 text-sm border-b pb-2">
                <Package className="h-4 w-4" />
                {t("items.title")}
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("items.fields.product")}</TableHead>
                      <TableHead className="text-right">{t("items.fields.receivedQty")}</TableHead>
                      <TableHead>{t("items.fields.notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gr.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          -
                        </TableCell>
                      </TableRow>
                    ) : (
                      gr.items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">{it.product?.name ?? "-"}</TableCell>
                          <TableCell className="text-right font-mono">{it.quantity_received}</TableCell>
                          <TableCell className="text-muted-foreground">{it.notes ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
