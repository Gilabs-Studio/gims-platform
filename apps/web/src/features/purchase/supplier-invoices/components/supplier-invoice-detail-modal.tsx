"use client";

import { Edit, Trash2, CheckCircle2, XCircle, FileText, Calendar, Building2, DollarSign, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContents } from "@/components/ui/tabs";
import { SupplierInvoiceForm } from "./supplier-invoice-form";
import { SupplierInvoiceDetailTabs } from "./supplier-invoice-detail-tabs";
import {
  useSupplierInvoice,
  useDeleteSupplierInvoice,
  useUpdateSupplierInvoice,
  useSetPendingSupplierInvoice,
} from "../hooks/use-supplier-invoices";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { formatCurrency } from "@/lib/utils";
import type {
  UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";
import type { SupplierInvoice } from "../types";
import { ShoppingCart } from "lucide-react";

interface SupplierInvoiceDetailModalProps {
  readonly invoiceId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onInvoiceUpdated?: () => void;
  readonly embedded?: boolean;
}

export function SupplierInvoiceDetailModal({
  invoiceId,
  open,
  onOpenChange,
  onInvoiceUpdated,
  embedded = false,
}: SupplierInvoiceDetailModalProps) {
  const { data, isLoading, error } = useSupplierInvoice(invoiceId);
  const deleteInvoice = useDeleteSupplierInvoice();
  const updateInvoice = useUpdateSupplierInvoice();
  const setPendingInvoice = useSetPendingSupplierInvoice();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("supplierInvoices.detailModal");
  const tDetail = useTranslations("supplierInvoices.detail");
  const tList = useTranslations("supplierInvoices.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const invoice: SupplierInvoice | undefined = data?.data;
  const items = invoice?.items ?? [];

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
          <Badge variant="destructive" className="text-xs font-medium">
            <AlertCircle className="h-3 w-3 mr-1.5" />
            {tDetail("unpaid")}
          </Badge>
        );
      case "PAID":
        return (
          <Badge variant="default" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("paid")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {tDetail("partial")}
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <AlertCircle className="h-3 w-3 mr-1.5" />
            {tDetail("overdue")}
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

  const handleSetPending = async () => {
    if (!invoice || !invoiceId) return;
    try {
      await setPendingInvoice.mutateAsync(invoiceId);
      toast.success(t("toastSetPending"));
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
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
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
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 pb-4 border-b">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <FileText className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-2 truncate">{invoice.code}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(invoice.status)}
                  {invoice.purchase_order?.supplier && (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1.5" />
                      {invoice.purchase_order.supplier.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap">
              {hasApprovePermission && invoice.status === "DRAFT" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSetPending}
                      disabled={setPendingInvoice.isPending}
                      className="cursor-pointer px-2 lg:px-3"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden xl:inline ml-2">
                        {setPendingInvoice.isPending ? t("settingPending") : tList("setPending")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="xl:hidden">
                    <p>{setPendingInvoice.isPending ? t("settingPending") : tList("setPending")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasEditPermission && invoice.status === "DRAFT" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="cursor-pointer px-2 lg:px-3"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden xl:inline ml-2">{t("edit")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="xl:hidden">
                    <p>{t("edit")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasDeletePermission && invoice.status === "DRAFT" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive hover:text-destructive cursor-pointer px-2 lg:px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden xl:inline ml-2">{t("delete")}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="xl:hidden">
                    <p>{t("delete")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {invoice.purchase_order && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Purchase Order</p>
                      <p className="text-sm font-medium truncate">{invoice.purchase_order.code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {invoice.payment_terms && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Payment Terms</p>
                      <p className="text-sm font-medium truncate">{invoice.payment_terms.name}</p>
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
                    <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                    <p className="text-sm font-medium">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}
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
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-sm font-medium">{formatCurrency(invoice.amount ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Organized Information */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="gap-2">
                <FileText className="h-4 w-4" />
                {tDetail("basicInfo.title")}
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {tDetail("items.title")} ({items.length})
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-2">
                <DollarSign className="h-4 w-4" />
                {tDetail("financial.title")}
              </TabsTrigger>
              <TabsTrigger value="metadata" className="gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.title")}
              </TabsTrigger>
            </TabsList>

            <TabsContents className="mt-6">
              <SupplierInvoiceDetailTabs invoice={invoice} />
            </TabsContents>
          </Tabs>
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
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <SupplierInvoiceForm
                invoice={invoice}
                onSubmit={async (formData) => {
                  try {
                    await updateInvoice.mutateAsync({
                      id: invoiceId!,
                      data: formData as UpdateSupplierInvoiceFormData,
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
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {isEditDialogOpen && invoice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <SupplierInvoiceForm
              invoice={invoice}
              onSubmit={async (formData) => {
                try {
                  await updateInvoice.mutateAsync({
                    id: invoiceId!,
                    data: formData as UpdateSupplierInvoiceFormData,
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




