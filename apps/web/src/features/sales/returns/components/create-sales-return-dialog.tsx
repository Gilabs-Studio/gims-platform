"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalesReturnForm } from "./sales-return-form";

interface CreateSalesReturnDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly invoiceId?: string;
  readonly deliveryId?: string;
}

export function CreateSalesReturnDialog({ open, onOpenChange, invoiceId, deliveryId }: CreateSalesReturnDialogProps) {
  const t = useTranslations("salesReturns");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        {open && (
          <SalesReturnForm
            defaultInvoiceId={invoiceId}
            defaultDeliveryId={deliveryId}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
