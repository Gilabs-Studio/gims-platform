"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { invoiceService } from "../../invoice/services/invoice-service";
import { invoiceKeys } from "../../invoice/hooks/use-invoices";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { formatCurrency } from "@/lib/utils";
import { InvoiceDetailModal } from "../../invoice/components/invoice-detail-modal";
import type { CustomerInvoice } from "../../invoice/types";
import { useUserPermission } from "@/hooks/use-user-permission";

interface InvoiceLinkedDialogProps {
  salesOrderCode: string;
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceLinkedDialog({ salesOrderCode, salesOrderId, open, onOpenChange }: InvoiceLinkedDialogProps) {
  const t = useTranslations("invoice");
  const canViewInvoice = useUserPermission("customer_invoice.read");
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: invoiceKeys.list({ sales_order_id: salesOrderId, per_page: 100 }),
    queryFn: () => invoiceService.list({ sales_order_id: salesOrderId, per_page: 100 }),
    // Only fetch when the dialog is open and the user has permission
    enabled: open && !!salesOrderId && canViewInvoice,
  });

  const invoices = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {t("title")} — {salesOrderCode}
          </DialogTitle>
        </DialogHeader>

        {/* If user doesn't have permission, show inline warning instead of fetching and toasts */}
        {!canViewInvoice ? (
          <div className="p-6 text-center">
            <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view invoices."}</p>
          </div>
        ) : (
          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoiceNumber") || "Invoice #"}</TableHead>
                <TableHead>{t("invoiceDate") || "Date"}</TableHead>
                <TableHead>{t("dueDate") || "Due Date"}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-right">{t("amount") || "Amount"}</TableHead>
                <TableHead className="text-right">{t("paidAmount") || "Paid"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {t("notFound")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {canViewInvoice ? (
                        <button
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            setSelectedInvoice({ id: invoice.id } as CustomerInvoice);
                            setDetailOpen(true);
                          }}
                        >
                          {invoice.code}
                        </button>
                      ) : (
                        <span className="font-medium">{invoice.code}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.invoice_date
                        ? new Date(invoice.invoice_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} className="text-xs" />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.paid_amount ?? 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </DialogContent>
      <InvoiceDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        invoice={selectedInvoice}
      />
    </Dialog>
  );
}
