"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useGoodsReceipt } from "@/features/purchase/goods-receipt/hooks/use-goods-receipts";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTranslations } from "next-intl";
import type { PurchaseReturn } from "../types";

interface PurchaseReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: PurchaseReturn | null;
}

export function PurchaseReturnDetail({ open, onOpenChange, item }: PurchaseReturnDetailProps) {
  const t = useTranslations("purchaseReturns");
  const data = item ?? null;
  const { data: goodsReceiptResponse } = useGoodsReceipt(data?.goods_receipt_id ?? "", {
    enabled: open && !!data?.goods_receipt_id,
  });
  const goodsReceipt = goodsReceiptResponse?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? t("detail.title")}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50 w-48">{t("detail.status")}</TableCell>
                  <TableCell><Badge>{data.status}</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.goodsReceipt")}</TableCell>
                  <TableCell>{goodsReceipt?.code ?? "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.supplier")}</TableCell>
                  <TableCell>{goodsReceipt?.supplier?.name ?? "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.action")}</TableCell>
                  <TableCell>{data.action}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.amount")}</TableCell>
                  <TableCell>{formatCurrency(data.total_amount ?? 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/50">{t("detail.createdAt")}</TableCell>
                  <TableCell>{formatDate(data.created_at)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
