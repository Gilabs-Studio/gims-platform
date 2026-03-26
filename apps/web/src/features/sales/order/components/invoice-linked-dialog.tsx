"use client";

import { useTranslations } from "next-intl";
import { Receipt, Banknote, CheckCircle2, Clock, CreditCard, PieChart, Send, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceDetailModal } from "../../invoice/components/invoice-detail-modal";
import { CustomerInvoiceDPDetailModal } from "../../customer-invoice-down-payments/components/customer-invoice-dp-detail-modal";
import { SalesPaymentsLinkedDialog } from "@/features/sales/payments/components/sales-payments-linked-dialog";
import type { CustomerInvoice } from "../../invoice/types";
import { useInvoiceLinkedDialog } from "../hooks/use-invoice-linked-dialog";

function DPStatusBadge({ status, className }: { status?: string; className?: string }) {
  const t = useTranslations("customerInvoiceDP");
  const normalized = (status ?? "").toLowerCase();

  switch (normalized) {
    case "draft":
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("status.draft") || "Draft"}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className={className}>
          <Send className="h-3 w-3 mr-1.5" />
          {t("status.submitted") || "Submitted"}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("status.approved") || "Approved"}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("status.rejected") || "Rejected"}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="warning" className={className}>
          <CreditCard className="h-3 w-3 mr-1.5" />
          {t("status.unpaid") || "Unpaid"}
        </Badge>
      );
    case "waiting_payment":
      return (
        <Badge variant="info" className={className}>
          <Clock className="h-3 w-3 mr-1.5" />
          {t("status.waiting_payment") || "Waiting Payment"}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className={className}>
          <PieChart className="h-3 w-3 mr-1.5" />
          {t("status.partial") || "Partial"}
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="h-3 w-3 mr-1.5" />
          {t("status.paid") || "Paid"}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1.5" />
          {t("status.cancelled") || "Cancelled"}
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status ?? "-"}</Badge>;
  }
}

interface InvoiceLinkedDialogProps {
  salesOrderCode: string;
  salesOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceLinkedDialog({ salesOrderCode, salesOrderId, open, onOpenChange }: InvoiceLinkedDialogProps) {
  const t = useTranslations("invoice");
  const tDP = useTranslations("customerInvoiceDP");
  const {
    canViewInvoice,
    canViewDP,
    activeTab,
    setActiveTab,
    hasNoPermission,
    visibleInvoices,
    dpInvoices,
    isInvoiceLoading,
    isDPLoading,
    totalDPAmount,
    totalInvoiceAmount,
    selectedInvoiceId,
    detailOpen,
    setDetailOpen,
    selectedDPId,
    setSelectedDPId,
    isPaymentOpen,
    setIsPaymentOpen,
    selectedInvoiceForPayments,
    setSelectedInvoiceForPayments,
    openInvoiceDetail,
    openPaymentDialog,
    isPaymentStatus,
  } = useInvoiceLinkedDialog({ open, salesOrderId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {t("title")} — {salesOrderCode}
          </DialogTitle>
        </DialogHeader>

        {hasNoPermission ? (
          <div className="p-6 text-center">
            <p className="text-warning font-medium">{t("forbidden") || "You don't have permission to view invoices."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Financial overview is calculated from currently loaded tab data */}
            {(dpInvoices.length > 0 || visibleInvoices.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center bg-primary/5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Down Payments</p>
                  <p className="text-lg font-bold font-mono text-primary">{formatCurrency(totalDPAmount)}</p>
                  <p className="text-xs text-muted-foreground">{dpInvoices.length} {dpInvoices.length === 1 ? "invoice" : "invoices"}</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Final Invoices</p>
                  <p className="text-lg font-bold font-mono">{formatCurrency(totalInvoiceAmount)}</p>
                  <p className="text-xs text-muted-foreground">{visibleInvoices.length} {visibleInvoices.length === 1 ? "invoice" : "invoices"}</p>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value === "dp" ? "dp" : "invoices")} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invoices" className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  {t("title")} ({visibleInvoices.length})
                </TabsTrigger>
                <TabsTrigger value="dp" className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" />
                  {tDP("title")} ({dpInvoices.length})
                </TabsTrigger>
              </TabsList>

              {/* Regular Invoices Tab */}
              <TabsContent value="invoices" className="mt-3">
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
                      {isInvoiceLoading ? (
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
                        visibleInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {canViewInvoice ? (
                                <button
                                  className="font-medium text-primary hover:underline cursor-pointer"
                                  onClick={() => openInvoiceDetail(invoice.id)}
                                >
                                  {invoice.code}
                                </button>
                              ) : (
                                <span className="font-medium">{invoice.code}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {invoice.invoice_date
                                ? formatDate(invoice.invoice_date)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {invoice.due_date
                                ? formatDate(invoice.due_date)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {isPaymentStatus(invoice.status) ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center cursor-pointer"
                                  title={t("common.view")}
                                  onClick={() => openPaymentDialog(invoice.id, invoice.code)}
                                >
                                  <InvoiceStatusBadge status={invoice.status} className="text-xs" />
                                </button>
                              ) : (
                                <InvoiceStatusBadge status={invoice.status} className="text-xs" />
                              )}
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
              </TabsContent>

              {/* Down Payment Invoices Tab */}
              <TabsContent value="dp" className="mt-3">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tDP("columns.code")}</TableHead>
                        <TableHead>{tDP("fields.invoiceDate")}</TableHead>
                        <TableHead>{tDP("fields.dueDate")}</TableHead>
                        <TableHead>{tDP("fields.status")}</TableHead>
                        <TableHead className="text-right">{tDP("columns.amount")}</TableHead>
                        <TableHead className="text-right">{tDP("columns.remainingAmount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDPLoading ? (
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
                      ) : dpInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            {tDP("detail.title")} - No data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        dpInvoices.map((dp) => (
                          <TableRow key={dp.id}>
                            <TableCell>
                              {canViewDP ? (
                                <button
                                  className="font-medium text-primary hover:underline cursor-pointer"
                                  onClick={() => setSelectedDPId(dp.id)}
                                >
                                  {dp.code}
                                </button>
                              ) : (
                                <span className="font-medium">{dp.code}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {dp.invoice_date
                                ? formatDate(dp.invoice_date)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {dp.due_date
                                ? formatDate(dp.due_date)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <DPStatusBadge status={dp.status} className="text-xs" />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(dp.amount ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(dp.remaining_amount ?? dp.amount ?? 0)}
                            </TableCell>
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

      <InvoiceDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        invoice={selectedInvoiceId ? ({ id: selectedInvoiceId } as CustomerInvoice) : null}
      />

      <CustomerInvoiceDPDetailModal
        open={!!selectedDPId}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedDPId(null); }}
        id={selectedDPId}
      />

      {selectedInvoiceForPayments && (
        <SalesPaymentsLinkedDialog
          open={isPaymentOpen}
          onOpenChange={(open) => {
            setIsPaymentOpen(open);
            if (!open) setSelectedInvoiceForPayments(null);
          }}
          invoiceId={selectedInvoiceForPayments.id}
          invoiceCode={selectedInvoiceForPayments.code}
        />
      )}
    </Dialog>
  );
}
