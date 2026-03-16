"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import { SupplierInvoiceStatusBadge } from "@/features/purchase/supplier-invoices/components/supplier-invoice-status-badge";
import { supplierInvoicesService } from "@/features/purchase/supplier-invoices/services/supplier-invoices-service";
import { supplierInvoiceKeys } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";

interface SILinkedDialogProps {
  goodsReceiptCode: string;
  goodsReceiptId: string;
  purchaseOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SILinkedDialog({ goodsReceiptCode, goodsReceiptId, purchaseOrderId, open, onOpenChange }: SILinkedDialogProps) {
  const t = useTranslations("supplierInvoice");
  const canViewSI = useUserPermission("supplier_invoice.read");

  const [selectedSIId, setSelectedSIId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch supplier invoices linked to the purchase order to optimize, 
  // since there's no direct filter by goods_receipt_id in the list endpoint.
  const { data: siData, isLoading: siLoading } = useQuery({
    queryKey: supplierInvoiceKeys.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    queryFn: () => supplierInvoicesService.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    enabled: open && !!purchaseOrderId && canViewSI,
  });

  const invoices = siData?.data ?? [];
  // Filter invoices for this specific goods receipt
  const invoicesForGR = invoices.filter((inv) => inv.goods_receipt?.id === goodsReceiptId);

  const totalInvoiceAmount = invoicesForGR.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const hasNoPermission = !canViewSI;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              {t("title")} — {goodsReceiptCode}
            </DialogTitle>
          </DialogHeader>

          {hasNoPermission ? (
            <div className="p-6 text-center">
              <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view supplier invoices."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoicesForGR.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-lg border p-3 text-center bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">{t("title")}</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(totalInvoiceAmount)}</p>
                    <p className="text-xs text-muted-foreground">{invoicesForGR.length} {invoicesForGR.length === 1 ? "invoice" : "invoices"}</p>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("title")}</span>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("columns.code")}</TableHead>
                        <TableHead>{t("columns.invoiceDate")}</TableHead>
                        <TableHead>{t("columns.dueDate")}</TableHead>
                        <TableHead>{t("columns.status")}</TableHead>
                        <TableHead className="text-right">{t("columns.amount")}</TableHead>
                        <TableHead className="text-right">{t("columns.paidAmount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {siLoading ? (
                        Array.from({ length: 1 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          </TableRow>
                        ))
                      ) : invoicesForGR.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            {t("notFound")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoicesForGR.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell>
                              {canViewSI ? (
                                <button
                                  type="button"
                                  className="font-medium text-primary hover:underline cursor-pointer"
                                  onClick={() => {
                                    setSelectedSIId(inv.id);
                                    setDetailOpen(true);
                                  }}
                                >
                                  {inv.code}
                                </button>
                              ) : (
                                <span className="font-medium">{inv.code}</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                            <TableCell>{inv.due_date ? formatDate(inv.due_date) : "—"}</TableCell>
                            <TableCell>
                              <SupplierInvoiceStatusBadge status={inv.status} className="text-xs" />
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(inv.amount)}</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(inv.paid_amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SupplierInvoiceDetail open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedSIId(null); }} invoiceId={selectedSIId} />
    </>
  );
}
