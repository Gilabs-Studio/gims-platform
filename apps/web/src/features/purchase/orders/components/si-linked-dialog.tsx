"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Receipt, Banknote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate } from "@/lib/utils";

import { SupplierInvoiceDetail } from "@/features/purchase/supplier-invoices/components/supplier-invoice-detail";
import { SupplierInvoiceStatusBadge } from "@/features/purchase/supplier-invoices/components/supplier-invoice-status-badge";
import { supplierInvoicesService } from "@/features/purchase/supplier-invoices/services/supplier-invoices-service";
import { supplierInvoiceKeys } from "@/features/purchase/supplier-invoices/hooks/use-supplier-invoices";

import { SupplierInvoiceDPDetailModal } from "@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-dp-detail-modal";
import { SupplierInvoiceDownPaymentStatusBadge } from "@/features/purchase/supplier-invoice-down-payments/components/supplier-invoice-down-payment-status-badge";
import { supplierInvoiceDPService } from "@/features/purchase/supplier-invoice-down-payments/services/supplier-invoice-dp-service";
import { supplierInvoiceDPKeys } from "@/features/purchase/supplier-invoice-down-payments/hooks/use-supplier-invoice-dp";
import { PurchasePaymentsLinkedDialog } from "@/features/purchase/payments/components/purchase-payments-linked-dialog";

interface SILinkedDialogProps {
  purchaseOrderCode: string;
  purchaseOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SILinkedDialog({ purchaseOrderCode, purchaseOrderId, open, onOpenChange }: SILinkedDialogProps) {
  const t = useTranslations("supplierInvoice");
  const tDP = useTranslations("supplierInvoiceDP");
  const canViewSI = useUserPermission("supplier_invoice.read");
  const canViewDP = useUserPermission("supplier_invoice_dp.read");

  const [selectedSIId, setSelectedSIId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoiceForPayments, setSelectedInvoiceForPayments] = useState<{ id: string; code: string } | null>(null);

  const isPaymentStatus = (status?: string): boolean => {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "waiting_payment" || normalized === "partial" || normalized === "paid";
  };

  // Fetch supplier invoices linked to the purchase order
  const { data: siData, isLoading: siLoading } = useQuery({
    queryKey: supplierInvoiceKeys.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    queryFn: () => supplierInvoicesService.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    enabled: open && !!purchaseOrderId && canViewSI,
  });

  // Fetch supplier invoice down-payments for the same PO
  const { data: dpData, isLoading: dpLoading } = useQuery({
    queryKey: supplierInvoiceDPKeys.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    queryFn: () => supplierInvoiceDPService.list({ purchase_order_id: purchaseOrderId, per_page: 100 }),
    enabled: open && !!purchaseOrderId && canViewDP,
  });

  const invoices = siData?.data ?? [];
  const dpInvoices = dpData?.data ?? [];

  // Backend may return invoices for other purchase orders — filter client-side by purchaseOrderId
  const invoicesForPO = invoices.filter((inv) => inv.purchase_order?.id === purchaseOrderId);
  const dpInvoicesForPO = dpInvoices.filter((dp) => dp.purchase_order?.id === purchaseOrderId);

  // Exclude any supplier invoice items that are actually down-payment records
  const dpCodes = new Set(dpInvoicesForPO.map((d) => d.code));
  const visibleInvoices = invoicesForPO.filter((inv) => !dpCodes.has(inv.code));

  const totalDPAmount = dpInvoicesForPO.reduce((sum, dp) => sum + (dp.amount ?? 0), 0);
  const totalInvoiceAmount = visibleInvoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const hasNoPermission = !canViewSI && !canViewDP;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>
              {t("title")} — {purchaseOrderCode}
            </DialogTitle>
          </DialogHeader>

          {hasNoPermission ? (
            <div className="p-6 text-center">
              <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view supplier invoices."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(dpInvoicesForPO.length > 0 || invoicesForPO.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center bg-primary/5">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">{tDP("title")}</p>
                    <p className="text-lg font-bold font-mono text-primary">{formatCurrency(totalDPAmount)}</p>
                    <p className="text-xs text-muted-foreground">{dpInvoicesForPO.length} {dpInvoicesForPO.length === 1 ? "invoice" : "invoices"}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">{t("title")}</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(totalInvoiceAmount)}</p>
                    <p className="text-xs text-muted-foreground">{invoicesForPO.length} {invoicesForPO.length === 1 ? "invoice" : "invoices"}</p>
                  </div>
                </div>
              )}

              <Tabs defaultValue="invoices" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="invoices" className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" />
                    {t("title")} ({visibleInvoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="dp" className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5" />
                    {tDP("title")} ({dpInvoicesForPO.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="mt-3">
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
                        ) : visibleInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              {t("notFound")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          visibleInvoices.map((inv) => (
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
                                {isPaymentStatus(inv.status) ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center cursor-pointer"
                                    title={t("common.view")}
                                    onClick={() => {
                                      setSelectedInvoiceForPayments({ id: inv.id, code: inv.code });
                                      setIsPaymentOpen(true);
                                    }}
                                  >
                                    <SupplierInvoiceStatusBadge status={inv.status} className="text-xs" />
                                  </button>
                                ) : (
                                  <SupplierInvoiceStatusBadge status={inv.status} className="text-xs" />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">{formatCurrency(inv.amount)}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(inv.paid_amount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="dp" className="mt-3">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tDP("columns.code")}</TableHead>
                          <TableHead>{tDP("fields.invoiceDate")}</TableHead>
                          <TableHead>{tDP("fields.dueDate")}</TableHead>
                          <TableHead>{tDP("fields.status")}</TableHead>
                          <TableHead className="text-right">{tDP("paidAmount") ?? "Paid"}</TableHead>
                          <TableHead className="text-right">{tDP("columns.amount")}</TableHead>
                          <TableHead className="text-right">{tDP("columns.remainingAmount")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dpLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            </TableRow>
                          ))
                        ) : dpInvoicesForPO.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                              {tDP("notFound") || "No down payment invoices found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          dpInvoicesForPO.map((dp) => (
                            <TableRow key={dp.id}>
                              <TableCell>
                                {canViewDP ? (
                                  <button
                                    type="button"
                                    className="font-medium text-primary hover:underline cursor-pointer"
                                    onClick={() => setSelectedDPId(dp.id)}
                                  >
                                    {dp.code}
                                  </button>
                                ) : (
                                  <span className="font-medium">{dp.code}</span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(dp.invoice_date)}</TableCell>
                              <TableCell>{dp.due_date ? formatDate(dp.due_date) : "—"}</TableCell>
                              <TableCell>
                                {isPaymentStatus(dp.status) ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center cursor-pointer"
                                    title={t("common.view")}
                                    onClick={() => {
                                      setSelectedInvoiceForPayments({ id: dp.id, code: dp.code });
                                      setIsPaymentOpen(true);
                                    }}
                                  >
                                    <SupplierInvoiceDownPaymentStatusBadge status={dp.status} className="text-xs" />
                                  </button>
                                ) : (
                                  <SupplierInvoiceDownPaymentStatusBadge status={dp.status} className="text-xs" />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">{formatCurrency(dp.paid_amount ?? 0)}</TableCell>
                              <TableCell className="text-right font-mono font-medium">{formatCurrency(dp.amount)}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(dp.remaining_amount ?? dp.amount ?? 0)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SupplierInvoiceDetail open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedSIId(null); }} invoiceId={selectedSIId} />

      <SupplierInvoiceDPDetailModal open={!!selectedDPId} onOpenChange={(isOpen) => { if (!isOpen) setSelectedDPId(null); }} id={selectedDPId ?? ""} />

      {selectedInvoiceForPayments && (
        <PurchasePaymentsLinkedDialog
          open={isPaymentOpen}
          onOpenChange={(open) => {
            setIsPaymentOpen(open);
            if (!open) setSelectedInvoiceForPayments(null);
          }}
          invoiceId={selectedInvoiceForPayments.id}
          invoiceCode={selectedInvoiceForPayments.code}
        />
      )}
    </>
  );
}