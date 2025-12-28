"use client";

import { Edit, Trash2, CheckCircle2, XCircle, Clock, FileText, Calendar, Building2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SupplierInvoiceDownPaymentForm } from "./supplier-invoice-down-payment-form";
import {
  useSupplierInvoiceDownPayment,
  useDeleteSupplierInvoiceDownPayment,
  useUpdateSupplierInvoiceDownPayment,
  usePendingSupplierInvoiceDownPayment,
} from "../hooks/use-supplier-invoice-down-payments";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { formatCurrency } from "@/lib/utils";
import type {
  UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";
import type { SupplierInvoiceDownPayment } from "../types";

interface SupplierInvoiceDownPaymentDetailModalProps {
  readonly invoiceId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onInvoiceUpdated?: () => void;
  readonly embedded?: boolean; // For split view without dialog overlay
}

export function SupplierInvoiceDownPaymentDetailModal({
  invoiceId,
  open,
  onOpenChange,
  onInvoiceUpdated,
  embedded = false,
}: SupplierInvoiceDownPaymentDetailModalProps) {
  const { data, isLoading, error } = useSupplierInvoiceDownPayment(invoiceId);
  const deleteInvoice = useDeleteSupplierInvoiceDownPayment();
  const updateInvoice = useUpdateSupplierInvoiceDownPayment();
  const pendingInvoice = usePendingSupplierInvoiceDownPayment();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("supplierInvoiceDownPayments.detailModal");
  const tDetail = useTranslations("supplierInvoiceDownPayments.detail");
  const tList = useTranslations("supplierInvoiceDownPayments.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const invoice: SupplierInvoiceDownPayment | undefined = data?.data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {tDetail("draft")}
          </Badge>
        );
      case "UNPAID":
        return (
          <Badge variant="default" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {tDetail("unpaid")}
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("paid")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!invoice || !invoiceId) return;
    try {
      await deleteInvoice.mutateAsync(invoiceId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onInvoiceUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handlePending = async () => {
    if (!invoice || !invoiceId) return;
    try {
      await pendingInvoice.mutateAsync(invoiceId);
      toast.success(t("toastPending"));
      onInvoiceUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const renderContent = () => (
    <>
      {embedded && (
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
      )}
      {!embedded && (
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
        </DialogHeader>
      )}

      {isLoading && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      )}

      {error && (
        <div className="text-center text-muted-foreground py-12">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">{tDetail("loadError")}</p>
        </div>
      )}

      {!isLoading && !error && invoice && (
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight mb-2">{invoice.code}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(invoice.status)}
                  {invoice.purchase_order && (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1.5" />
                      {invoice.purchase_order.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasApprovePermission && invoice.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePending}
                  disabled={pendingInvoice.isPending}
                  className="gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {pendingInvoice.isPending ? t("settingPending") : tList("pending")}
                </Button>
              )}
              {hasEditPermission && invoice.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                  {t("edit")}
                </Button>
              )}
              {hasDeletePermission && invoice.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("delete")}
                </Button>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {invoice.purchase_order && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {tDetail("purchaseOrder")}
                      </p>
                      <p className="text-sm font-medium truncate">{invoice.purchase_order.code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {tDetail("invoiceDate")}
                    </p>
                    <p className="text-sm font-medium">
                      {invoice.invoice_date
                        ? new Date(invoice.invoice_date).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {tDetail("amount")}
                    </p>
                    <p className="text-sm font-medium">{formatCurrency(invoice.amount ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {tDetail("invoiceNumber")}
                  </p>
                  <p className="text-sm font-medium">{invoice.invoice_number ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {tDetail("dueDate")}
                  </p>
                  <p className="text-sm font-medium">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {tDetail("notes")}
                  </p>
                  <p className="text-sm">{invoice.notes ?? "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="h-full overflow-y-auto p-6">
          {renderContent()}
        </div>
        {/* Edit Dialog */}
        {isEditDialogOpen && invoice && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <SupplierInvoiceDownPaymentForm
                invoice={invoice}
                onSubmit={async (formData) => {
                  try {
                    await updateInvoice.mutateAsync({
                      id: invoiceId!,
                      data: formData as UpdateSupplierInvoiceDownPaymentFormData,
                    });
                    setIsEditDialogOpen(false);
                    toast.success(t("toastUpdated"));
                    onInvoiceUpdated?.();
                  } catch {
                    // Error already handled in api-client interceptor
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={updateInvoice.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Dialog */}
        <DeleteDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title={t("deleteDialogTitle")}
          description={
            invoice
              ? t("deleteDialogDescriptionWithName", { code: invoice.code })
              : t("deleteDialogDescription")
          }
          itemName={t("deleteDialogItemName")}
          isLoading={deleteInvoice.isPending}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {isEditDialogOpen && invoice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <SupplierInvoiceDownPaymentForm
              invoice={invoice}
              onSubmit={async (formData) => {
                try {
                  await updateInvoice.mutateAsync({
                    id: invoiceId!,
                    data: formData as UpdateSupplierInvoiceDownPaymentFormData,
                  });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onInvoiceUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateInvoice.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t("deleteDialogTitle")}
        description={
          invoice
            ? t("deleteDialogDescriptionWithName", { code: invoice.code })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteInvoice.isPending}
      />
    </>
  );
}

