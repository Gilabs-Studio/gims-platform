"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PurchaseReturn } from "../types";

interface PurchaseReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: PurchaseReturn | null;
}

export function PurchaseReturnDetail({ open, onOpenChange, item }: PurchaseReturnDetailProps) {
  const data = item ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? "Purchase Return Detail"}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{data.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Goods Receipt</span>
              <span>{data.goods_receipt_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Action</span>
              <span>{data.action}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span>{formatCurrency(data.total_amount ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(data.created_at)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
