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

import { useGoodsReceipt } from "../hooks/use-goods-receipts";

function safeDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
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
        ) : isError || !gr ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{gr.code}</span>
              <Badge variant="outline" className="text-xs font-medium">
                {gr.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t("fields.purchaseOrder")}: {gr.purchase_order?.code ?? "-"}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("fields.receiptDate")}: {safeDate(gr.receipt_date)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("fields.supplier")}: </span>
                <span className="font-medium">{gr.supplier?.name ?? "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("fields.notes")}: </span>
                <span className="font-medium">{gr.notes ?? "-"}</span>
              </div>
            </div>

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
                        <TableCell>{it.product?.name ?? "-"}</TableCell>
                        <TableCell className="text-right">{it.quantity_received}</TableCell>
                        <TableCell>{it.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
