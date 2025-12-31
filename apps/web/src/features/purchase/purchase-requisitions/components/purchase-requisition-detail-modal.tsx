"use client";

import { Edit, Trash2, CheckCircle2, XCircle, ArrowRight, FileText, Calendar, Building2, ShoppingCart, DollarSign, User, Clock, Package } from "lucide-react";
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
import { PurchaseRequisitionForm } from "./purchase-requisition-form";
import { PurchaseRequisitionDetailTabs } from "./purchase-requisition-detail-tabs";
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
              <div className="flex flex-col lg:flex-row lg:items-start gap-4 pb-4 border-b">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                    <FileText className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-2 truncate">{requisition.code}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
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
                <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap">
                  {hasApprovePermission && requisition.status === "DRAFT" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleApprove}
                          disabled={approveRequisition.isPending}
                          className="cursor-pointer px-2 lg:px-3"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="hidden xl:inline ml-2">
                            {approveRequisition.isPending ? t("approving") : tList("approve")}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="xl:hidden">
                        <p>{approveRequisition.isPending ? t("approving") : tList("approve")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {hasRejectPermission && requisition.status === "DRAFT" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReject}
                          disabled={rejectRequisition.isPending}
                          className="cursor-pointer px-2 lg:px-3"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="hidden xl:inline ml-2">
                            {rejectRequisition.isPending ? t("rejecting") : tList("reject")}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="xl:hidden">
                        <p>{rejectRequisition.isPending ? t("rejecting") : tList("reject")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {hasConvertPermission && requisition.status === "APPROVED" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleConvert}
                          disabled={convertRequisition.isPending}
                          className="cursor-pointer px-2 lg:px-3"
                        >
                          <ArrowRight className="h-4 w-4" />
                          <span className="hidden xl:inline ml-2">
                            {convertRequisition.isPending ? t("converting") : tList("convert")}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="xl:hidden">
                        <p>{convertRequisition.isPending ? t("converting") : tList("convert")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {hasEditPermission && requisition.status === "DRAFT" && (
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
                  {hasDeletePermission && requisition.status === "DRAFT" && (
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

              {/* Quick Info Cards - Compact & Responsive */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {requisition.supplier && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Supplier</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs font-semibold truncate cursor-default">{requisition.supplier.name}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{requisition.supplier.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {requisition.business_unit && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Business Unit</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs font-semibold truncate cursor-default">{requisition.business_unit.name}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{requisition.business_unit.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {requisition.user && (
                  <Card className="border-l-4 border-l-primary/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Requested By</p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs font-semibold truncate cursor-default">{requisition.user.name}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{requisition.user.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-l-4 border-l-primary/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Total Amount</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs font-bold truncate cursor-default tabular-nums">
                              {formatCurrency(requisition.total_amount ?? 0)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="tabular-nums">{formatCurrency(requisition.total_amount ?? 0)}</p>
                          </TooltipContent>
                        </Tooltip>
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
                  <PurchaseRequisitionDetailTabs requisition={requisition} />
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

