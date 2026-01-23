"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Clock, DollarSign, Info, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { InvoiceForm } from "./invoice-form";
import {
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useInvoice,
  useInvoiceItems,
} from "../hooks/use-invoices";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, cn } from "@/lib/utils";
import type { CustomerInvoice } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoice: CustomerInvoice | null;
}

export function InvoiceDetailModal({
  open,
  onClose,
  invoice,
}: InvoiceDetailModalProps) {
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const itemsPerPage = 20;
  const t = useTranslations("invoice");

  // Fetch full detail WITHOUT items when modal opens
  const { data: detailData, isLoading } = useInvoice(invoice?.id ?? "", {
    enabled: open && !!invoice?.id,
  });

  // Fetch items separately with server-side pagination
  const { data: itemsData, isLoading: itemsLoading } = useInvoiceItems(
    invoice?.id ?? "",
    { page: itemsPage, per_page: itemsPerPage },
    { enabled: open && !!invoice?.id }
  );

  const canEdit = useUserPermission("customer_invoice.update");
  const canDelete = useUserPermission("customer_invoice.delete");
  const canRecordPayment = useUserPermission("customer_invoice.update");

  if (!invoice) return null;

  // Use detailed data if available, otherwise use passed invoice
  const displayInvoice = detailData?.data ?? invoice;
  
  // Use server-side paginated items
  const items = itemsData?.data ?? [];
  const itemsPagination = itemsData?.meta?.pagination;
  
  // Server pagination values
  const totalItems = itemsPagination?.total ?? 0;
  const totalPages = itemsPagination?.total_pages ?? 0;
  const hasNextPage = itemsPagination?.has_next ?? false;
  const hasPrevPage = itemsPagination?.has_prev ?? false;

  // Calculate gross profit
  const totalHpp = items.reduce((acc, item) => acc + (item.hpp_amount ?? 0) * item.quantity, 0);
  const grossProfit = displayInvoice.subtotal - totalHpp;

  const isOverdue = () => {
    if (displayInvoice.status === "paid" || displayInvoice.status === "cancelled") return false;
    if (!displayInvoice.due_date) return false;
    return new Date(displayInvoice.due_date) < new Date();
  };

  const getStatusBadge = (status?: string) => {
    const overdue = isOverdue();

    if (overdue && status !== "paid" && status !== "cancelled") {
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <AlertTriangle className="h-3 w-3 mr-1.5" />
          {t("overdue")}
        </Badge>
      );
    }

    switch (status) {
      case "unpaid":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.unpaid")}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="default" className="text-xs font-medium bg-amber-600">
            <DollarSign className="h-3 w-3 mr-1.5" />
            {t("status.partial")}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="default" className="text-xs font-medium bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.paid")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!invoice?.id) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const handleCancel = async () => {
    if (!invoice?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { status: "cancelled" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { 
          status: "paid",
          paid_amount: displayInvoice.amount,
          payment_at: new Date().toISOString(),
        },
      });
      toast.success(t("paymentRecorded"));
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      toast.error(t("common.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{displayInvoice?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {invoice && getStatusBadge(invoice.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayInvoice?.invoice_date && new Date(displayInvoice.invoice_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && invoice?.status === "unpaid" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="cursor-pointer"
                    title={t("common.edit")}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && invoice?.status === "unpaid" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {canRecordPayment && (displayInvoice?.status === "unpaid" || displayInvoice?.status === "partial") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkPaid}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.markPaid")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && displayInvoice?.status === "unpaid" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    title={t("actions.cancel")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <Skeleton className="h-20 flex-1" />
                <Skeleton className="h-20 flex-1" />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">
                  <Info className="h-4 w-4 mr-2" />
                  {t("tabs.general")}
                </TabsTrigger>
                <TabsTrigger value="items">
                  <Package className="h-4 w-4 mr-2" />
                  {t("tabs.items")}
                </TabsTrigger>
              </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-8 py-6">
              {/* Total Amount Card - Hero Section */}
              <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-background border border-primary/20 shadow-sm">
                <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-sm font-medium uppercase tracking-wide">{t("totalAmount")}</span>
                      </div>
                      <div className="text-4xl font-bold tracking-tight text-primary">
                        {formatCurrency(displayInvoice.amount)}
                      </div>
                      {displayInvoice.paid_amount !== undefined && displayInvoice.paid_amount > 0 && (
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            {t("paidAmount")}: <span className="text-green-600 font-medium">{formatCurrency(displayInvoice.paid_amount)}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t("remainingAmount")}: <span className="font-medium">{formatCurrency(displayInvoice.remaining_amount ?? 0)}</span>
                          </span>
                        </div>
                      )}
                      {displayInvoice.notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {displayInvoice.notes}
                        </p>
                      )}
                    </div>
                    {displayInvoice.payment_at && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        <div className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-green-700 dark:text-green-400">{t("paidAt")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(displayInvoice.payment_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Section - Invoice Details & Related Info */}
                <div className="space-y-6">
                  {/* Invoice Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("common.invoice")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                        <p className="text-base font-semibold">{displayInvoice.code}</p>
                      </div>
                      {displayInvoice.invoice_number && (
                        <>
                          <Separator />
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("invoiceNumber")}</p>
                            <p className="text-base font-semibold">{displayInvoice.invoice_number}</p>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("invoiceDate")}</p>
                          <p className="text-sm font-medium">{new Date(displayInvoice.invoice_date).toLocaleDateString()}</p>
                        </div>
                        {displayInvoice.due_date && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("dueDate")}</p>
                            <p className={cn("text-sm font-medium", isOverdue() && "text-destructive")}>
                              {new Date(displayInvoice.due_date).toLocaleDateString()}
                              {isOverdue() && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Related Information Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        {t("common.related")}
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-5">
                        {displayInvoice.payment_terms && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("paymentTerms")}</p>
                              <p className="text-sm font-medium truncate">{displayInvoice.payment_terms.name}</p>
                            </div>
                          </div>
                        )}
                        {displayInvoice.sales_order && (
                          <div className="flex items-start gap-3 group">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{t("salesOrder")}</p>
                              <p className="text-sm font-medium truncate">{displayInvoice.sales_order.code}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section - Financial Breakdown */}
                <div className="space-y-6">
                  {/* Financial Summary Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("common.financial")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Subtotal */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">{t("subtotal")}</span>
                        <span className="text-base font-semibold">{formatCurrency(displayInvoice.subtotal)}</span>
                      </div>

                      {/* Tax */}
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("taxAmount")} ({displayInvoice.tax_rate}%)
                        </span>
                        <span className="text-base font-semibold">{formatCurrency(displayInvoice.tax_amount)}</span>
                      </div>

                      {/* Delivery Cost */}
                      {displayInvoice.delivery_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("deliveryCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayInvoice.delivery_cost)}</span>
                        </div>
                      )}

                      {/* Other Cost */}
                      {displayInvoice.other_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("otherCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayInvoice.other_cost)}</span>
                        </div>
                      )}

                      {/* Total - Highlighted */}
                      <div className="flex items-center justify-between py-4 px-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                        <span className="text-base font-bold text-primary">{t("totalAmount")}</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(displayInvoice.amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit Card */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("grossProfit")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">{t("hppAmount")}</span>
                        <span className="text-base font-semibold">{formatCurrency(totalHpp)}</span>
                      </div>
                      <div className="flex items-center justify-between py-4 px-4 bg-muted/30 rounded-lg">
                        <span className="text-base font-bold">{t("grossProfit")}</span>
                        <span className={cn("text-2xl font-bold", grossProfit >= 0 ? "text-green-600" : "text-destructive")}>
                          {formatCurrency(grossProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 py-4">
              {itemsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("item.product")}</TableHead>
                          <TableHead className="text-right">{t("item.quantity")}</TableHead>
                          <TableHead className="text-right">{t("item.price")}</TableHead>
                          <TableHead className="text-right">{t("item.discount")}</TableHead>
                          <TableHead className="text-right">{t("item.hpp")}</TableHead>
                          <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>{t("noItems")}</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                                  {item.product?.code && (
                                    <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.hpp_amount ?? 0)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t("common.page")} {itemsPage} {t("common.of")} {totalPages} ({totalItems} items)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasPrevPage || itemsLoading}
                          onClick={() => setItemsPage(itemsPage - 1)}
                          className="cursor-pointer"
                        >
                          {t("common.previous")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!hasNextPage || itemsLoading}
                          onClick={() => setItemsPage(itemsPage + 1)}
                          className="cursor-pointer"
                        >
                          {t("common.next")}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {invoice && (
        <InvoiceForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          invoice={invoice}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteInvoice.isPending}
      />
    </>
  );
}
