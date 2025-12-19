"use client";

import { Edit, Trash2, CheckCircle2, XCircle, ArrowRight, FileText, Calendar, Building2, ShoppingCart, DollarSign, User, MapPin, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from "@/components/ui/tabs";
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import {
  usePurchaseRequisition,
  useDeletePurchaseRequisition,
  useUpdatePurchaseRequisition,
  useApprovePurchaseRequisition,
  useRejectPurchaseRequisition,
  useConvertPurchaseRequisition,
} from "../hooks/use-purchase-requisitions";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import { formatCurrency } from "@/lib/utils";
import type {
  UpdatePurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";
import type { PurchaseRequisition } from "../types";

interface PurchaseRequisitionDetailModalProps {
  readonly requisitionId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRequisitionUpdated?: () => void;
  readonly embedded?: boolean; // For split view without dialog overlay
}

export function PurchaseRequisitionDetailModal({
  requisitionId,
  open,
  onOpenChange,
  onRequisitionUpdated,
  embedded = false,
}: PurchaseRequisitionDetailModalProps) {
  const { data, isLoading, error } = usePurchaseRequisition(requisitionId);
  const deleteRequisition = useDeletePurchaseRequisition();
  const updateRequisition = useUpdatePurchaseRequisition();
  const approveRequisition = useApprovePurchaseRequisition();
  const rejectRequisition = useRejectPurchaseRequisition();
  const convertRequisition = useConvertPurchaseRequisition();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("purchaseRequisitions.detailModal");
  const tDetail = useTranslations("purchaseRequisitions.detail");
  const tList = useTranslations("purchaseRequisitions.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");
  const hasRejectPermission = useHasPermission("REJECT");
  const hasConvertPermission = useHasPermission("CONVERT");

  const requisition: PurchaseRequisition | undefined = data?.data;
  const items = requisition?.items ?? [];

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
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {tDetail("rejected")}
          </Badge>
        );
      case "CONVERTED":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("converted")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!requisition || !requisitionId) return;
    try {
      await deleteRequisition.mutateAsync(requisitionId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onRequisitionUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleApprove = async () => {
    if (!requisition || !requisitionId) return;
    try {
      await approveRequisition.mutateAsync(requisitionId);
      toast.success(t("toastApproved"));
      onRequisitionUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleReject = async () => {
    if (!requisition || !requisitionId) return;
    try {
      await rejectRequisition.mutateAsync(requisitionId);
      toast.success(t("toastRejected"));
      onRequisitionUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleConvert = async () => {
    if (!requisition || !requisitionId) return;
    try {
      await convertRequisition.mutateAsync(requisitionId);
      toast.success(t("toastConverted"));
      onRequisitionUpdated?.();
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

          {!isLoading && !error && requisition && (
            <div className="space-y-6">
              {/* Enhanced Header Section */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-20 w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">{requisition.code}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(requisition.status)}
                      {requisition.supplier && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1.5" />
                          {requisition.supplier.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasApprovePermission && requisition.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveRequisition.isPending}
                      className="gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approveRequisition.isPending ? t("approving") : tList("approve")}
                    </Button>
                  )}
                  {hasRejectPermission && requisition.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReject}
                      disabled={rejectRequisition.isPending}
                      className="gap-2 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      {rejectRequisition.isPending ? t("rejecting") : tList("reject")}
                    </Button>
                  )}
                  {hasConvertPermission && requisition.status === "APPROVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConvert}
                      disabled={convertRequisition.isPending}
                      className="gap-2 cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {convertRequisition.isPending ? t("converting") : tList("convert")}
                    </Button>
                  )}
                  {hasEditPermission && requisition.status === "DRAFT" && (
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
                  {hasDeletePermission && requisition.status === "DRAFT" && (
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
                {requisition.supplier && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Supplier</p>
                          <p className="text-sm font-medium truncate">{requisition.supplier.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {requisition.business_unit && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Business Unit</p>
                          <p className="text-sm font-medium truncate">{requisition.business_unit.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {requisition.user && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Requested By</p>
                          <p className="text-sm font-medium truncate">{requisition.user.name}</p>
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
                        <p className="text-sm font-medium">{formatCurrency(requisition.total_amount ?? 0)}</p>
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
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {tDetail("basicInfo.title")}
                        </CardTitle>
                        <CardDescription>Basic purchase requisition information</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              {tDetail("basicInfo.code")}
                            </label>
                            <p className="text-sm font-medium">{requisition.code}</p>
                          </div>
                          {requisition.supplier && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {tDetail("basicInfo.supplier")}
                              </label>
                              <p className="text-sm font-medium">{requisition.supplier.name}</p>
                            </div>
                          )}
                          {requisition.business_unit && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {tDetail("basicInfo.businessUnit")}
                              </label>
                              <p className="text-sm font-medium">{requisition.business_unit.name}</p>
                            </div>
                          )}
                          {requisition.payment_terms && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {tDetail("basicInfo.paymentTerms")}
                              </label>
                              <p className="text-sm font-medium">
                                {requisition.payment_terms.name} ({requisition.payment_terms.days} days)
                              </p>
                            </div>
                          )}
                          {requisition.request_date && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {tDetail("basicInfo.requestDate")}
                              </label>
                              <p className="text-sm font-medium">
                                {new Date(requisition.request_date).toLocaleDateString("id-ID", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                          {requisition.user && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {tDetail("basicInfo.requestedBy")}
                              </label>
                              <p className="text-sm font-medium">{requisition.user.name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {(requisition.address || requisition.notes) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {tDetail("notes.title")}
                          </CardTitle>
                          <CardDescription>Additional notes and delivery address</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {requisition.address && (
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                                {tDetail("notes.address")}
                              </label>
                              <p className="text-sm font-medium">{requisition.address}</p>
                            </div>
                          )}
                          {requisition.notes && (
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                                {tDetail("notes.notes")}
                              </label>
                              <p className="text-sm font-medium whitespace-pre-wrap">{requisition.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Items Tab */}
                  <TabsContent value="items" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5" />
                          {tDetail("items.title")}
                        </CardTitle>
                        <CardDescription>
                          {items.length === 0
                            ? tDetail("items.empty")
                            : `${items.length} item${items.length > 1 ? "s" : ""} in this requisition`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {tDetail("items.empty")}
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-base">
                                      {item.product?.name ?? `Product #${item.product_id}`}
                                    </p>
                                    {item.product?.code && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Code: {item.product.code}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold text-base ml-4">
                                    {formatCurrency(item.subtotal ?? 0)}
                                  </p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground mb-1">{tDetail("items.quantity")}</p>
                                    <p className="font-medium">{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">
                                      {tDetail("items.purchasePrice")}
                                    </p>
                                    <p className="font-medium">{formatCurrency(item.purchase_price ?? 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground mb-1">{tDetail("items.discount")}</p>
                                    <p className="font-medium">{item.discount ?? 0}%</p>
                                  </div>
                                </div>
                                {item.notes && (
                                  <>
                                    <Separator />
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                      <p className="text-sm">{item.notes}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Financial Tab */}
                  <TabsContent value="financial" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          {tDetail("financial.title")}
                        </CardTitle>
                        <CardDescription>Financial breakdown and summary</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              {tDetail("financial.subtotal")}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(requisition.subtotal ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              {tDetail("financial.taxRate")}
                            </span>
                            <span className="text-sm font-medium">{requisition.tax_rate ?? 0}%</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              {tDetail("financial.taxAmount")}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(requisition.tax_amount ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              {tDetail("financial.deliveryCost")}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(requisition.delivery_cost ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              {tDetail("financial.otherCost")}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(requisition.other_cost ?? 0)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between py-2">
                            <span className="text-base font-semibold">{tDetail("financial.totalAmount")}</span>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(requisition.total_amount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Metadata Tab */}
                  <TabsContent value="metadata" className="space-y-6 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {tDetail("metadata.title")}
                        </CardTitle>
                        <CardDescription>System information and audit trail</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {requisition.created_by && (
                            <div className="flex items-center justify-between py-2 border-b">
                              <span className="text-sm font-medium text-muted-foreground">
                                {tDetail("metadata.createdBy")}
                              </span>
                              <span className="text-sm font-medium">{requisition.created_by.name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {tDetail("metadata.createdAt")}
                            </span>
                            <span className="text-sm font-medium">
                              {requisition.created_at
                                ? new Date(requisition.created_at).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {tDetail("metadata.updatedAt")}
                            </span>
                            <span className="text-sm font-medium">
                              {requisition.updated_at
                                ? new Date(requisition.updated_at).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
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
        {isEditDialogOpen && requisition && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <PurchaseRequisitionForm
                requisition={requisition}
                onSubmit={async (formData) => {
                  try {
                    await updateRequisition.mutateAsync({
                      id: requisitionId!,
                      data: formData as UpdatePurchaseRequisitionFormData,
                    });
                    setIsEditDialogOpen(false);
                    toast.success(t("toastUpdated"));
                    onRequisitionUpdated?.();
                  } catch {
                    // Error already handled in api-client interceptor
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={updateRequisition.isPending}
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
            requisition
              ? t("deleteDialogDescriptionWithName", { code: requisition.code })
              : t("deleteDialogDescription")
          }
          itemName={t("deleteDialogItemName")}
          isLoading={deleteRequisition.isPending}
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
      {isEditDialogOpen && requisition && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <PurchaseRequisitionForm
              requisition={requisition}
              onSubmit={async (formData) => {
                try {
                  await updateRequisition.mutateAsync({
                    id: requisitionId!,
                    data: formData as UpdatePurchaseRequisitionFormData,
                  });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onRequisitionUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateRequisition.isPending}
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
          requisition
            ? t("deleteDialogDescriptionWithName", { code: requisition.code })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteRequisition.isPending}
      />
    </>
  );
}

