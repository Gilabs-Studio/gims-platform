"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

import { useSupplierInvoiceDP } from "../hooks/use-supplier-invoice-dp";
import { SupplierInvoiceDownPaymentStatusBadge } from "./supplier-invoice-down-payment-status-badge";

interface SupplierInvoiceDPDetailModalProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierInvoiceDPDetailModal({ id, open, onOpenChange }: SupplierInvoiceDPDetailModalProps) {
  const t = useTranslations("supplierInvoiceDP");
  const { data, isLoading, isError } = useSupplierInvoiceDP(id, { enabled: open && !!id });

  const row = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("detail.title")}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !row ? (
          <div className="text-sm text-destructive">{t("detail.failed")}</div>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{row.invoice_number}</h3>
                <p className="text-sm text-muted-foreground font-mono">{row.code}</p>
              </div>
              <div className="text-right">
                <SupplierInvoiceDownPaymentStatusBadge status={row.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("fields.purchaseOrder")}</p>
                <p className="font-mono font-medium text-primary">{row.purchase_order?.code ?? "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("fields.invoiceDate")}</p>
                <p className="font-medium">{formatDate(row.invoice_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">{t("fields.dueDate")}</p>
                <p className="font-medium">{formatDate(row.due_date)}</p>
              </div>
              {row.notes ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("fields.notes")}</p>
                  <p className="font-medium">{row.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="p-4 flex justify-between items-center px-6 bg-muted/20">
                <span className="font-semibold">{t("fields.amount")}</span>
                <span className="font-mono font-bold text-xl">{formatCurrency(row.amount)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
