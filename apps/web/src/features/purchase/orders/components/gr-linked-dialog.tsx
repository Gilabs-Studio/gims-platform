"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPermission } from "@/hooks/use-user-permission";
import { GoodsReceiptStatusBadge } from "@/features/purchase/goods-receipt/components/goods-receipt-status-badge";
import { GoodsReceiptDetail } from "@/features/purchase/goods-receipt/components/goods-receipt-detail";
import type { PurchaseOrderGRSummary } from "../types";

interface GRLinkedDialogProps {
  purchaseOrderCode: string;
  items: PurchaseOrderGRSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GRLinkedDialog({
  purchaseOrderCode,
  items,
  open,
  onOpenChange,
}: GRLinkedDialogProps) {
  const t = useTranslations("goodsReceipt");
  const canViewGR = useUserPermission("goods_receipt.read");
  const [selectedGRId, setSelectedGRId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              {t("title")} — {purchaseOrderCode}
            </DialogTitle>
          </DialogHeader>

          {!canViewGR ? (
            <div className="p-6 text-center">
              <p className="text-warning font-medium">
                You don&apos;t have permission to view goods receipts.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("list.code")}</TableHead>
                    <TableHead>{t("list.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                        {t("notFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((gr) => (
                      <TableRow key={gr.id} className="hover:bg-muted/50">
                        <TableCell>
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              setSelectedGRId(gr.id);
                              setDetailOpen(true);
                            }}
                          >
                            {gr.code}
                          </button>
                        </TableCell>
                        <TableCell>
                          <GoodsReceiptStatusBadge status={gr.status} className="text-xs" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GoodsReceiptDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedGRId(null);
        }}
        goodsReceiptId={selectedGRId}
      />
    </>
  );
}
