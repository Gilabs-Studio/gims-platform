"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FileText, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { invoiceService } from "../../invoice/services/invoice-service";
import { invoiceKeys } from "../../invoice/hooks/use-invoices";
import { customerInvoiceDPService } from "../../customer-invoice-down-payments/services/customer-invoice-dp-service";
import { customerInvoiceDPKeys } from "../../customer-invoice-down-payments/hooks/use-customer-invoice-dp";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { formatCurrency } from "@/lib/utils";
import { InvoiceDetailModal } from "../../invoice/components/invoice-detail-modal";
import { CustomerInvoiceDPDetailModal } from "../../customer-invoice-down-payments/components/customer-invoice-dp-detail-modal";
import type { CustomerInvoice } from "../../invoice/types";
import { useUserPermission } from "@/hooks/use-user-permission";

function DPStatusBadge({ status, className }: { status?: string; className?: string }) {
  const normalized = (status ?? "").toLowerCase();
  const map: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive"; label: string }> = {
    draft: { variant: "secondary", label: "Draft" },
    submitted: { variant: "info", label: "Submitted" },
    approved: { variant: "success", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    unpaid: { variant: "warning", label: "Unpaid" },
    partial: { variant: "info", label: "Partial" },
    paid: { variant: "success", label: "Paid" },
    cancelled: { variant: "secondary", label: "Cancelled" },
  };
  const cfg = map[normalized] ?? { variant: "secondary" as const, label: status ?? "-" };
  return <Badge variant={cfg.variant} className={className}>{cfg.label}</Badge>;
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
  const canViewInvoice = useUserPermission("customer_invoice.read");
  const canViewDP = useUserPermission("customer_invoice.read");
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);

  // Fetch regular invoices
  const { data, isLoading } = useQuery({
    queryKey: invoiceKeys.list({ sales_order_id: salesOrderId, per_page: 100 }),
    queryFn: () => invoiceService.list({ sales_order_id: salesOrderId, per_page: 100 }),
    enabled: open && !!salesOrderId && canViewInvoice,
  });

  // Fetch DP invoices for the same SO
  const { data: dpData, isLoading: dpLoading } = useQuery({
    queryKey: customerInvoiceDPKeys.list({ sales_order_id: salesOrderId, per_page: 100 }),
    queryFn: () => customerInvoiceDPService.list({ sales_order_id: salesOrderId, per_page: 100 }),
    enabled: open && !!salesOrderId && canViewDP,
  });

  const invoices = data?.data ?? [];
  const dpInvoices = dpData?.data ?? [];

  // Exclude any invoice items that are actually down-payment records (avoid showing DP in both tabs)
  const dpCodes = new Set(dpInvoices.map((d) => d.code));
  const visibleInvoices = invoices.filter((inv) => !dpCodes.has(inv.code));

  const totalDPAmount = dpInvoices.reduce((sum, dp) => sum + (dp.amount ?? 0), 0);
  const totalInvoiceAmount = visibleInvoices.reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const hasNoPermission = !canViewInvoice && !canViewDP;

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
            {/* Financial Overview */}
            {(dpInvoices.length > 0 || invoices.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center bg-primary/5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Down Payments</p>
                  <p className="text-lg font-bold font-mono text-primary">{formatCurrency(totalDPAmount)}</p>
                  <p className="text-xs text-muted-foreground">{dpInvoices.length} {dpInvoices.length === 1 ? "invoice" : "invoices"}</p>
                </div>
                <div className="rounded-lg border p-3 text-center bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Final Invoices</p>
                  <p className="text-lg font-bold font-mono">{formatCurrency(totalInvoiceAmount)}</p>
                  <p className="text-xs text-muted-foreground">{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}</p>
                </div>
              </div>
            )}

            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invoices" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t("title")} ({invoices.length})
                </TabsTrigger>
                <TabsTrigger value="dp" className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
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
                      {dpLoading ? (
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
                                ? new Date(dp.invoice_date).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {dp.due_date
                                ? new Date(dp.due_date).toLocaleDateString()
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
        invoice={selectedInvoice}
      />

      <CustomerInvoiceDPDetailModal
        open={!!selectedDPId}
        onOpenChange={(isOpen) => { if (!isOpen) setSelectedDPId(null); }}
        id={selectedDPId}
      />
    </Dialog>
  );
}
