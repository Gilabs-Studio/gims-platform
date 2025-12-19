"use client";

import { Edit, Trash2, CheckCircle2, XCircle, FileText, Calendar, Building2, ShoppingCart, DollarSign, User, Clock, Package } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContents } from "@/components/ui/tabs";
import { PurchaseOrderForm } from "./purchase-order-form";
import { PurchaseOrderDetailTabs } from "./purchase-order-detail-tabs";
import {
  usePurchaseOrder,
  useDeletePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
} from "../hooks/use-purchase-orders";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { formatCurrency } from "@/lib/utils";
import type {
  UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";
import type { PurchaseOrder } from "../types";

interface PurchaseOrderDetailModalProps {
  readonly orderId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onOrderUpdated?: () => void;
  readonly embedded?: boolean; // For split view without dialog overlay
}

export function PurchaseOrderDetailModal({
  orderId,
  open,
  onOpenChange,
  onOrderUpdated,
  embedded = false,
}: PurchaseOrderDetailModalProps) {
  const { data, isLoading, error } = usePurchaseOrder(orderId);
  const deleteOrder = useDeletePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const confirmOrder = useConfirmPurchaseOrder();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("purchaseOrders.detailModal");
  const tDetail = useTranslations("purchaseOrders.detail");
  const tList = useTranslations("purchaseOrders.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const order: PurchaseOrder | undefined = data?.data;
  const items = order?.items ?? order?.purchase_order_items ?? [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {tDetail("draft")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="default" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("approved")}
          </Badge>
        );
      case "REVISED":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1.5" />
            {tDetail("revised")}
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("closed")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const getReceiptsStatusBadge = (status?: string) => {
    switch (status) {
      case "NOT_CREATED":
        return (
          <Badge variant="secondary" className="text-xs">
            {tList("notCreated")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="text-xs">
            {tList("pending")}
          </Badge>
        );
      case "RECEIVED":
      case "COMPLETED":
        return (
          <Badge variant="default" className="text-xs">
            {tList("received")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="text-xs">
            {tList("partial")}
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">-</Badge>;
    }
  };

  const getInvoicesStatusBadge = (status?: string) => {
    switch (status) {
      case "NOT_CREATED":
        return (
          <Badge variant="secondary" className="text-xs">
            {tList("notCreated")}
          </Badge>
        );
      case "COMPLETED":
      case "PAID":
        return (
          <Badge variant="default" className="text-xs">
            {tList("paid")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="text-xs">
            {tList("partial")}
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">-</Badge>;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!order || !orderId) return;
    try {
      await deleteOrder.mutateAsync(orderId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onOrderUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleConfirm = async () => {
    if (!order || !orderId) return;
    try {
      await confirmOrder.mutateAsync(orderId);
      toast.success(t("toastConfirmed"));
      onOrderUpdated?.();
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

      {!isLoading && !error && order && (
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight mb-2">{order.code}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(order.status)}
                  {order.supplier && (
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1.5" />
                      {order.supplier.name ?? order.supplier.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasApprovePermission && order.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={confirmOrder.isPending}
                  className="gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {confirmOrder.isPending ? t("confirming") : tList("confirm")}
                </Button>
              )}
              {hasEditPermission && order.status === "DRAFT" && (
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
              {hasDeletePermission && order.status === "DRAFT" && (
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {order.supplier && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Supplier</p>
                      <p className="text-sm font-medium truncate">{order.supplier.name ?? order.supplier.code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {order.business_unit && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Business Unit</p>
                      <p className="text-sm font-medium truncate">{order.business_unit.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {order.created_by && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Created By</p>
                      <p className="text-sm font-medium truncate">{order.created_by.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-l-4 border-l-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-sm font-medium">{formatCurrency(order.total_amount ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Organized Information - Lazy Loaded */}
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
              <PurchaseOrderDetailTabs order={order} />
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
        {isEditDialogOpen && order && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <PurchaseOrderForm
                order={order}
                onSubmit={async (formData) => {
                  try {
                    await updateOrder.mutateAsync({
                      id: orderId!,
                      data: formData as UpdatePurchaseOrderFormData,
                    });
                    setIsEditDialogOpen(false);
                    toast.success(t("toastUpdated"));
                    onOrderUpdated?.();
                  } catch {
                    // Error already handled in api-client interceptor
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={updateOrder.isPending}
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
            order
              ? t("deleteDialogDescriptionWithName", { code: order.code })
              : t("deleteDialogDescription")
          }
          itemName={t("deleteDialogItemName")}
          isLoading={deleteOrder.isPending}
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
      {isEditDialogOpen && order && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <PurchaseOrderForm
              order={order}
              onSubmit={async (formData) => {
                try {
                  await updateOrder.mutateAsync({
                    id: orderId!,
                    data: formData as UpdatePurchaseOrderFormData,
                  });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onOrderUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateOrder.isPending}
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
          order
            ? t("deleteDialogDescriptionWithName", { code: order.code })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteOrder.isPending}
      />
    </>
  );
}
