"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PurchaseReturnForm } from "./purchase-return-form";
import type { PurchaseReturn } from "../types";

interface CreatePurchaseReturnDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly goodsReceiptId?: string;
  readonly purchaseReturn?: PurchaseReturn;
}

export function CreatePurchaseReturnDialog({ open, onOpenChange, goodsReceiptId, purchaseReturn }: CreatePurchaseReturnDialogProps) {
  const t = useTranslations("purchaseReturns");
  const isEdit = !!purchaseReturn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        <PurchaseReturnForm
          open={open}
          defaultGoodsReceiptId={goodsReceiptId}
          purchaseReturn={purchaseReturn}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
