"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Send,
  CreditCard,
  History,
  ShieldAlert,
  XCircle,
  Pencil,
  Printer,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import type { Customer } from "@/features/master-data/customer/types";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import type { SalesOrder } from "@/features/sales/order/types";
import { SalesPaymentForm } from "@/features/sales/payments/components/sales-payment-form";
import { customerInvoiceDPService } from "../services/customer-invoice-dp-service";
import { usePendingCustomerInvoiceDP, useApproveCustomerInvoiceDP } from "../hooks/use-customer-invoice-dp";
import {
  useCustomerInvoiceDP,
  useCustomerInvoiceDPAuditTrail,
} from "../hooks/use-customer-invoice-dp";
import type { CustomerInvoiceDPStatus } from "../types";

function normalizeStatus(status?: string | null): string {
  return (status ?? "").toLowerCase();
}

function StatusBadge({ status, t }: { status: CustomerInvoiceDPStatus; t: ReturnType<typeof useTranslations> }) {
  switch (normalizeStatus(status)) {
    case "paid":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {t("status.paid")}
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="warning" className="text-xs font-medium">
          <Send className="h-3 w-3" />
          {t("status.unpaid")}
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {t("status.partial")}
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="info" className="text-xs font-medium">
          <Send className="h-3 w-3" />
          {t("status.submitted")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="success" className="text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {t("status.approved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <XCircle className="h-3 w-3" />
          {t("status.rejected")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="text-xs font-medium text-muted-foreground">
          <Ban className="h-3 w-3" />
          {t("status.cancelled")}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          <FileText className="h-3 w-3" />
          {t("status.draft")}
        </Badge>
      );
  }
}

export function CustomerInvoiceDPDetailModal({
  open,
  onOpenChange,
  id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
}) {
  const t = useTranslations("customerInvoiceDP");

  const [selectedSOId, setSelectedSOId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);

  const canViewSalesOrder = useUserPermission("sales_order.read");
  const canViewCustomer = useUserPermission("customer.read");
  const canCreatePayment = useUserPermission("sales_payment.create");
  const canUpdate = useUserPermission("customer_invoice_dp.update");
  const canPending = useUserPermission("customer_invoice_dp.pending");
  const canPrint = useUserPermission("customer_invoice_dp.print");
  const canApprove = useUserPermission("customer_invoice_dp.approve");

  const { data, isLoading, isError } = useCustomerInvoiceDP(id as string, {
    enabled: !!id && open,
  });

  const { data: auditData, isLoading: auditLoading } = useCustomerInvoiceDPAuditTrail(
    id as string,
    { enabled: !!id && open },
  );

  const row = data?.data;

  const [isEditOpen, setIsEditOpen] = useState(false);

  const pendingMutation = usePendingCustomerInvoiceDP();
  const approveMutation = useApproveCustomerInvoiceDP();

  const CustomerInvoiceDPFormDialog = dynamic(
    () => import("./customer-invoice-dp-form").then((m) => m.CustomerInvoiceDPFormDialog),
    { ssr: false },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">
                {row?.code ?? t("detail.title")}
              </DialogTitle>
              {row && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <StatusBadge status={row.status as CustomerInvoiceDPStatus} t={t} />
                  {row.invoice_date && (
                    <span className="text-sm text-muted-foreground">
                      {formatDate(row.invoice_date)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {row && canCreatePayment &&
                (normalizeStatus(row.status) === "unpaid" ||
                  normalizeStatus(row.status) === "partial" ||
                  normalizeStatus(row.status) === "approved") ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreatePaymentOpen(true)}
                  className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title={t("actions.createPayment")}
                >
                  <CreditCard className="h-4 w-4" />
                </Button>
              ) : null}

              {row && canUpdate && normalizeStatus(row.status) === "draft" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  className="cursor-pointer"
                  title={t("actions.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}

              {row && canPending && normalizeStatus(row.status) === "draft" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!row?.id) return;
                    try {
                      const resp = await pendingMutation.mutateAsync(row.id);
                      if (!resp.success) throw new Error(resp.error ?? "pending_failed");
                      toast.success(t("toast.submitted"));
                    } catch {
                      toast.error(t("toast.failed"));
                    }
                  }}
                  className="cursor-pointer text-primary hover:text-primary/80 hover:bg-primary/5"
                  title={t("actions.submit")}
                >
                  <Send className="h-4 w-4" />
                </Button>
              ) : null}

              {row && canPrint ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!row?.id) return;
                    customerInvoiceDPService.openPrintWindow(row.id).catch(() => toast.error(t("toast.failed")));
                  }}
                  className="cursor-pointer text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                  title={t("actions.print")}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              ) : null}

              {row && canApprove && normalizeStatus(row.status) === "submitted" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!row?.id) return;
                    try {
                      await approveMutation.mutateAsync(row.id);
                      toast.success(t("statusUpdated"));
                    } catch {
                      toast.error(t("toast.failed"));
                    }
                  }}
                  className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                  title={t("actions.approve")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              ) : null}

              {/* Delete action removed from detail modal (use list view for deletion) */}
            </div>
          </div>
        </DialogHeader>

        {!id ? null : isLoading ? (
          <div className="space-y-4 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError || !data?.success ? (
          <div className="text-center py-8 text-destructive">{t("detail.failed")}</div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
              <TabsTrigger value="audit-trail" className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                {t("tabs.auditTrail")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-5 py-4">
              {/* Key Information */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-44">{t("columns.code")}</TableCell>
                      <TableCell className="font-mono font-semibold">{row?.code}</TableCell>
                      <TableCell className="font-medium bg-muted/50 w-44">{t("fields.status")}</TableCell>
                      <TableCell>
                        <StatusBadge status={row?.status as CustomerInvoiceDPStatus} t={t} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("fields.invoiceDate")}</TableCell>
                      <TableCell>{formatDate(row?.invoice_date)}</TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("fields.dueDate")}</TableCell>
                      <TableCell>
                        {row?.due_date ? (
                          formatDate(row?.due_date)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">{t("fields.salesOrder")}</TableCell>
                      <TableCell className="font-mono">
                        {canViewSalesOrder && row?.sales_order?.id ? (
                          <button
                            type="button"
                            className="font-mono text-primary underline-offset-4 hover:underline cursor-pointer"
                            onClick={() => setSelectedSOId(row.sales_order!.id)}
                          >
                            {row.sales_order.code}
                          </button>
                        ) : (
                          row?.sales_order?.code ?? "-"
                        )}
                      </TableCell>
                      <TableCell className="font-medium bg-muted/50">{t("columns.customer")}</TableCell>
                      <TableCell>
                        {canViewCustomer && row?.sales_order?.customer_id ? (
                          <button
                            type="button"
                            className="text-primary underline-offset-4 hover:underline cursor-pointer"
                            onClick={() => setSelectedCustomerId(row.sales_order!.customer_id!)}
                          >
                            {row.sales_order.customer_name ?? "-"}
                          </button>
                        ) : (
                          row?.sales_order?.customer_name ?? (
                            <span className="text-muted-foreground">-</span>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                    {row?.related_invoice_code && (
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("columns.relatedInvoiceCode")}
                        </TableCell>
                        <TableCell className="font-mono">{row?.related_invoice_code}</TableCell>
                        <TableCell className="bg-muted/50" />
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Amount Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 text-center space-y-1 bg-primary/5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                    {t("columns.amount")}
                  </p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    {formatCurrency(row?.amount ?? 0)}
                  </p>
                </div>
                <div className="border rounded-lg p-4 text-center space-y-1 bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                    {t("columns.remainingAmount")}
                  </p>
                  <p className="text-2xl font-bold font-mono">
                    {formatCurrency(row?.remaining_amount ?? row?.amount ?? 0)}
                  </p>
                </div>
              </div>

              {row?.notes && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t("fields.notes")}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/30 p-3 border">
                    {row?.notes}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit-trail" className="py-4">
              {auditLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !auditData?.success || !auditData.data?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{t("auditTrail.empty")}</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("auditTrail.columns.action")}</TableHead>
                        <TableHead>{t("auditTrail.columns.user")}</TableHead>
                        <TableHead>{t("auditTrail.columns.time")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.data.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                          <TableCell className="text-sm">
                            {entry.user?.name ?? entry.user?.email ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
              </Tabs>
        )}
      </DialogContent>
      {selectedSOId && (
        <OrderDetailModal
          open={!!selectedSOId}
          onClose={() => setSelectedSOId(null)}
          order={{ id: selectedSOId } as SalesOrder}
        />
      )}

      {selectedCustomerId && (
        <CustomerDetailModal
          open={!!selectedCustomerId}
          onOpenChange={(open) => { if (!open) setSelectedCustomerId(null); }}
          customer={{ id: selectedCustomerId } as Customer}
        />
      )}

      {row && (
        <SalesPaymentForm
          open={isCreatePaymentOpen}
          onClose={() => setIsCreatePaymentOpen(false)}
          defaultDPId={row.id}
        />
      )}

      {row && (
        <CustomerInvoiceDPFormDialog
          open={isEditOpen}
          onOpenChange={(open) => { if (!open) setIsEditOpen(false); }}
          invoiceId={row?.id}
          defaultSalesOrderId={row?.sales_order?.id}
          defaultAmount={row?.amount}
        />
      )}

      {/* Delete dialog removed from detail modal; deletion should be done from list view */}
    </Dialog>
  );
}
