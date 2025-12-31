"use client";

import { Edit, Trash2, CheckCircle2, Package, FileText, Calendar, Warehouse, User, Clock, ShoppingCart } from "lucide-react";
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
import { GoodsReceiptForm } from "./goods-receipt-form";
import { GoodsReceiptDetailTabs } from "./goods-receipt-detail-tabs";
import {
  useGoodsReceipt,
  useDeleteGoodsReceipt,
  useUpdateGoodsReceipt,
  useConfirmGoodsReceipt,
} from "../hooks/use-goods-receipts";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useHasPermission } from "../hooks/use-has-permission";
import type {
  UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";
import type { GoodsReceipt } from "../types";

interface GoodsReceiptDetailModalProps {
  readonly goodsReceiptId: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onGoodsReceiptUpdated?: () => void;
  readonly embedded?: boolean; // For split view without dialog overlay
}

export function GoodsReceiptDetailModal({
  goodsReceiptId,
  open,
  onOpenChange,
  onGoodsReceiptUpdated,
  embedded = false,
}: GoodsReceiptDetailModalProps) {
  const { data, isLoading, error } = useGoodsReceipt(goodsReceiptId);
  const deleteGoodsReceipt = useDeleteGoodsReceipt();
  const updateGoodsReceipt = useUpdateGoodsReceipt();
  const confirmGoodsReceipt = useConfirmGoodsReceipt();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations("goodsReceipts.detailModal");
  const tDetail = useTranslations("goodsReceipts.detail");
  const tList = useTranslations("goodsReceipts.list");

  const hasEditPermission = useHasPermission("EDIT");
  const hasDeletePermission = useHasPermission("DELETE");
  const hasApprovePermission = useHasPermission("APPROVE");

  const goodsReceipt: GoodsReceipt | undefined = data?.data;
  const items = goodsReceipt?.items ?? [];

  const getStatusBadge = (status: GoodsReceipt["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {tDetail("pending")}
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge variant="default" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {tDetail("received")}
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <Package className="h-3 w-3 mr-1.5" />
            {tDetail("partial")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!goodsReceipt || !goodsReceiptId) return;
    try {
      await deleteGoodsReceipt.mutateAsync(goodsReceiptId);
      toast.success(t("toastDeleted"));
      onOpenChange(false);
      onGoodsReceiptUpdated?.();
    } catch {
      // Error already handled in api-client interceptor
    }
  };

  const handleConfirm = async () => {
    if (!goodsReceipt || !goodsReceiptId) return;
    try {
      await confirmGoodsReceipt.mutateAsync(goodsReceiptId);
      toast.success(t("toastConfirmed"));
      onGoodsReceiptUpdated?.();
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
          <Package className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">{tDetail("loadError")}</p>
        </div>
      )}

      {!isLoading && !error && goodsReceipt && (
        <div className="space-y-6">
          {/* Enhanced Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 pb-4 border-b">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <Package className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-2 truncate">{goodsReceipt.code}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(goodsReceipt.status)}
                  {goodsReceipt.warehouse && (
                    <Badge variant="outline" className="text-xs">
                      <Warehouse className="h-3 w-3 mr-1.5" />
                      {goodsReceipt.warehouse.name}
                    </Badge>
                  )}
                  {goodsReceipt.purchase_order && (
                    <Badge variant="outline" className="text-xs">
                      <ShoppingCart className="h-3 w-3 mr-1.5" />
                      {goodsReceipt.purchase_order.code}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap lg:flex-nowrap">
              {hasApprovePermission && goodsReceipt.status === "PENDING" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConfirm}
                      disabled={confirmGoodsReceipt.isPending}
                      className="cursor-pointer px-2 lg:px-3"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden xl:inline ml-2">
                        {confirmGoodsReceipt.isPending ? t("confirming") : tList("confirm")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="xl:hidden">
                    <p>{confirmGoodsReceipt.isPending ? t("confirming") : tList("confirm")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {hasEditPermission && goodsReceipt.status === "PENDING" && (
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
              {hasDeletePermission && goodsReceipt.status === "PENDING" && (
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
            {goodsReceipt.warehouse && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Warehouse className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Warehouse</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs font-semibold truncate cursor-default">{goodsReceipt.warehouse.name}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{goodsReceipt.warehouse.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {goodsReceipt.purchase_order && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Purchase Order</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs font-semibold truncate cursor-default">{goodsReceipt.purchase_order.code}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{goodsReceipt.purchase_order.code}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {goodsReceipt.received_by && (
              <Card className="border-l-4 border-l-primary/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Received By</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs font-semibold truncate cursor-default">{goodsReceipt.received_by.name}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{goodsReceipt.received_by.name}</p>
                        </TooltipContent>
                      </Tooltip>
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
                    <p className="text-xs font-medium text-muted-foreground mb-1">Receipt Date</p>
                    <p className="text-sm font-medium">
                      {goodsReceipt.receipt_date
                        ? new Date(goodsReceipt.receipt_date).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </p>
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
              <TabsTrigger value="metadata" className="gap-2">
                <Calendar className="h-4 w-4" />
                {tDetail("metadata.title")}
              </TabsTrigger>
            </TabsList>

            <TabsContents className="mt-6">
              <GoodsReceiptDetailTabs goodsReceipt={goodsReceipt} />
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
        {isEditDialogOpen && goodsReceipt && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("editDialogTitle")}</DialogTitle>
              </DialogHeader>
              <GoodsReceiptForm
                goodsReceipt={goodsReceipt}
                onSubmit={async (formData) => {
                  try {
                    await updateGoodsReceipt.mutateAsync({
                      id: goodsReceiptId!,
                      data: formData as UpdateGoodsReceiptFormData,
                    });
                    setIsEditDialogOpen(false);
                    toast.success(t("toastUpdated"));
                    onGoodsReceiptUpdated?.();
                  } catch {
                    // Error already handled in api-client interceptor
                  }
                }}
                onCancel={() => setIsEditDialogOpen(false)}
                isLoading={updateGoodsReceipt.isPending}
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
            goodsReceipt
              ? t("deleteDialogDescriptionWithName", { code: goodsReceipt.code })
              : t("deleteDialogDescription")
          }
          itemName={t("deleteDialogItemName")}
          isLoading={deleteGoodsReceipt.isPending}
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
      {isEditDialogOpen && goodsReceipt && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <GoodsReceiptForm
              goodsReceipt={goodsReceipt}
              onSubmit={async (formData) => {
                try {
                  await updateGoodsReceipt.mutateAsync({
                    id: goodsReceiptId!,
                    data: formData as UpdateGoodsReceiptFormData,
                  });
                  setIsEditDialogOpen(false);
                  toast.success(t("toastUpdated"));
                  onGoodsReceiptUpdated?.();
                } catch {
                  // Error already handled in api-client interceptor
                }
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateGoodsReceipt.isPending}
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
          goodsReceipt
            ? t("deleteDialogDescriptionWithName", { code: goodsReceipt.code })
            : t("deleteDialogDescription")
        }
        itemName={t("deleteDialogItemName")}
        isLoading={deleteGoodsReceipt.isPending}
      />
    </>
  );
}

