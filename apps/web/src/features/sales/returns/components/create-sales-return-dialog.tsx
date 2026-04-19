"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalesReturnForm } from "./sales-return-form";
import type { SalesReturn } from "../types";

interface CreateSalesReturnDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly invoiceId?: string;
  readonly deliveryId?: string;
  readonly salesReturn?: SalesReturn | null;
}

export function CreateSalesReturnDialog({ open, onOpenChange, invoiceId, deliveryId, salesReturn }: CreateSalesReturnDialogProps) {
  const t = useTranslations("salesReturns");
  const isEdit = !!salesReturn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        {open && (
          <SalesReturnForm
            defaultInvoiceId={invoiceId}
            defaultDeliveryId={deliveryId}
            salesReturn={salesReturn ?? undefined}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
