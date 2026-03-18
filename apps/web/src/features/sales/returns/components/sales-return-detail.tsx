"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SalesReturn } from "../types";

interface SalesReturnDetailProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item?: SalesReturn | null;
}

export function SalesReturnDetail({ open, onOpenChange, item }: SalesReturnDetailProps) {
  const data = item ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.return_number ?? "Sales Return Detail"}</DialogTitle>
        </DialogHeader>

        {!data ? null : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{data.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span>{data.invoice_id}</span>
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
