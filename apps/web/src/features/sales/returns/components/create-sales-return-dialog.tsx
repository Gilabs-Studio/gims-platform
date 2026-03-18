"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalesReturnForm } from "./sales-return-form";

interface CreateSalesReturnDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly invoiceId?: string;
}

export function CreateSalesReturnDialog({ open, onOpenChange, invoiceId }: CreateSalesReturnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Return</DialogTitle>
        </DialogHeader>
        <SalesReturnForm defaultInvoiceId={invoiceId} />
      </DialogContent>
    </Dialog>
  );
}
