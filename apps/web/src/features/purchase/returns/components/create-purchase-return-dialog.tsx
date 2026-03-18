"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PurchaseReturnForm } from "./purchase-return-form";

interface CreatePurchaseReturnDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly goodsReceiptId?: string;
}

export function CreatePurchaseReturnDialog({ open, onOpenChange, goodsReceiptId }: CreatePurchaseReturnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Return</DialogTitle>
        </DialogHeader>
        <PurchaseReturnForm defaultGoodsReceiptId={goodsReceiptId} />
      </DialogContent>
    </Dialog>
  );
}
