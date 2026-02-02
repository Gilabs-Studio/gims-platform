"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Clock, Send, Info, DollarSign, Package, User, BarChart3 } from "lucide-react";
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
import { EstimationForm } from "./estimation-form";
import { ConvertToQuotationDialog } from "./convert-to-quotation-dialog";
import {
  useDeleteEstimation,
  useUpdateEstimationStatus,
  useEstimation,
  useEstimationItems,
} from "../hooks/use-estimations";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesEstimation } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface EstimationDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly estimation: SalesEstimation | null;
}

export function EstimationDetailModal({
  open,
  onClose,
  estimation,
}: EstimationDetailModalProps) {
  const deleteEstimation = useDeleteEstimation();
  const updateStatus = useUpdateEstimationStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("estimation");

  // Fetch full detail
  const { data: detailData, isLoading } = useEstimation(estimation?.id ?? "", {
    enabled: open && !!estimation?.id,
  });

  // Fetch items with pagination
  const { data: itemsData, isLoading: itemsLoading } = useEstimationItems(
    estimation?.id ?? "",
    { page: itemsPage, per_page: pageSize },
    { enabled: open && !!estimation?.id }
  );

  const canEdit = useUserPermission("sales_estimation.update");
  const canDelete = useUserPermission("sales_estimation.delete");
  const canApprove = useUserPermission("sales_estimation.approve");

  if (!estimation) return null;

  const displayEstimation = detailData?.data ?? estimation;
  const items = itemsData?.data ?? [];
  const itemsPagination = itemsData?.meta?.pagination;
  
  const totalItems = itemsPagination?.total ?? 0;
  const totalPages = itemsPagination?.total_pages ?? 0;
  const hasNextPage = itemsPagination?.has_next ?? false;
  const hasPrevPage = itemsPagination?.has_prev ?? false;

  const getProbabilityBadge = (probability: number) => {
    if (probability >= 75) {
      return <Badge variant="success">{probability}%</Badge>;
    } else if (probability >= 50) {
      return <Badge variant="default">{probability}%</Badge>;
    } else if (probability >= 25) {
      return <Badge variant="secondary">{probability}%</Badge>;
    } else {
      return <Badge variant="outline">{probability}%</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.submitted")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1.5" />
            {t("status.rejected")}
          </Badge>
        );
      case "converted":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <BarChart3 className="h-3 w-3 mr-1.5" />
            {t("status.converted")}
          </Badge>
        );
      default:
        return <Badge className="text-xs font-medium">{status}</Badge>;
    }
  };

  const handleDelete = async () => {
    if (!estimation?.id) return;
    try {
      await deleteEstimation.mutateAsync(estimation.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete estimation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleApprove = async () => {
    if (!estimation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: estimation.id,
        data: { status: "approved" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to approve estimation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleReject = async () => {
    if (!estimation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: estimation.id,
        data: { status: "rejected" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to reject estimation:", error);
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
                <DialogTitle className="text-xl mb-2">{displayEstimation?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {estimation && getStatusBadge(estimation.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayEstimation?.estimation_date && new Date(displayEstimation.estimation_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && estimation?.status === "draft" && (
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
                {canDelete && estimation?.status === "draft" && (
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
                {displayEstimation?.status === "submitted" && canApprove && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleApprove}
                      disabled={updateStatus.isPending}
                      className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                      title={t("actions.approve")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReject}
                      disabled={updateStatus.isPending}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                      title={t("actions.reject")}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {displayEstimation?.status === "approved" && canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsConvertDialogOpen(true)}
                    className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("actions.convert")}
                  >
                    <BarChart3 className="h-4 w-4" />
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
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
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
              {/* Total Amount Hero */}
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
                        {formatCurrency(displayEstimation.total_amount)}
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t("probability")}:</span>
                        </div>
                        {getProbabilityBadge(displayEstimation.probability ?? 0)}
                      </div>
                      {displayEstimation.notes && (
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl leading-relaxed">
                          {displayEstimation.notes}
                        </p>
                      )}
                    </div>
                    {(displayEstimation.approved_at || displayEstimation.rejected_at || displayEstimation.converted_at) && (
                      <div className="flex flex-col gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-4 border shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          <Clock className="h-3.5 w-3.5" />
                          {t("common.workflow")}
                        </div>
                        {displayEstimation.approved_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-green-700 dark:text-green-400">{t("status.approved")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayEstimation.approved_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayEstimation.rejected_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-red-700 dark:text-red-400">{t("status.rejected")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayEstimation.rejected_at).toLocaleString()}
                              </p>
                              {displayEstimation.rejection_reason && (
                                <p className="text-xs mt-1.5 italic text-muted-foreground border-l-2 border-red-300 pl-2">
                                  {displayEstimation.rejection_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {displayEstimation.converted_at && (
                          <div className="flex items-start gap-2.5 text-sm">
                            <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-blue-700 dark:text-blue-400">{t("status.converted")}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(displayEstimation.converted_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Section */}
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        {t("customerInfo")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("customerName")}</p>
                        <p className="text-base font-semibold">{displayEstimation.customer_name}</p>
                      </div>
                      {displayEstimation.customer_contact && (
                        <>
                          <Separator />
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("customerContact")}</p>
                            <p className="text-sm font-medium">{displayEstimation.customer_contact}</p>
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {displayEstimation.customer_email && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("customerEmail")}</p>
                            <p className="text-sm font-medium">{displayEstimation.customer_email}</p>
                          </div>
                        )}
                        {displayEstimation.customer_phone && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("customerPhone")}</p>
                            <p className="text-sm font-medium">{displayEstimation.customer_phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estimation Info */}
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {t("common.estimation")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("code")}</p>
                        <p className="text-base font-semibold">{displayEstimation.code}</p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("estimationDate")}</p>
                          <p className="text-sm font-medium">{new Date(displayEstimation.estimation_date).toLocaleDateString()}</p>
                        </div>
                        {displayEstimation.expected_close_date && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("expectedCloseDate")}</p>
                            <p className="text-sm font-medium">{new Date(displayEstimation.expected_close_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      {(displayEstimation.sales_rep || displayEstimation.area || displayEstimation.business_unit) && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            {displayEstimation.sales_rep && (
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <p className="text-xs text-muted-foreground">{t("salesRep")}</p>
                                  <p className="text-sm font-medium">{displayEstimation.sales_rep.name}</p>
                                </div>
                              </div>
                            )}
                            {displayEstimation.area && (
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Info className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <p className="text-xs text-muted-foreground">{t("area")}</p>
                                  <p className="text-sm font-medium">{displayEstimation.area.name}</p>
                                </div>
                              </div>
                            )}
                            {displayEstimation.business_unit && (
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Package className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <p className="text-xs text-muted-foreground">{t("businessUnit")}</p>
                                  <p className="text-sm font-medium">{displayEstimation.business_unit.name}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section - Financial */}
                <div className="space-y-6">
                  <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-6 py-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        {t("common.financial")}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">{t("subtotal")}</span>
                        <span className="text-base font-semibold">{formatCurrency(displayEstimation.subtotal)}</span>
                      </div>

                      {displayEstimation.discount_amount > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("discountAmount")}</span>
                          <span className="text-base font-semibold text-destructive">
                            -{formatCurrency(displayEstimation.discount_amount)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-3 border-b border-dashed">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("taxAmount")} ({displayEstimation.tax_rate}%)
                        </span>
                        <span className="text-base font-semibold">{formatCurrency(displayEstimation.tax_amount)}</span>
                      </div>

                      {displayEstimation.delivery_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("deliveryCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayEstimation.delivery_cost)}</span>
                        </div>
                      )}

                      {displayEstimation.other_cost > 0 && (
                        <div className="flex items-center justify-between py-3 border-b border-dashed">
                          <span className="text-sm font-medium text-muted-foreground">{t("otherCost")}</span>
                          <span className="text-base font-semibold">{formatCurrency(displayEstimation.other_cost)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-4 px-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                        <span className="text-base font-bold text-primary">{t("totalAmount")}</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(displayEstimation.total_amount)}</span>
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
                          <TableHead className="text-right">{t("item.estimatedPrice")}</TableHead>
                          <TableHead className="text-right">{t("item.discount")}</TableHead>
                          <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                              <TableCell className="text-right">{formatCurrency(item.estimated_price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {totalItems > 0 && (
                    <div className="mt-4">
                      <DataTablePagination
                        pageIndex={itemsPage}
                        pageSize={pageSize}
                        rowCount={totalItems}
                        onPageChange={setItemsPage}
                        onPageSizeChange={(newSize) => {
                          setPageSize(newSize);
                          setItemsPage(1);
                        }}
                      />
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
      {estimation && (
        <EstimationForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          estimation={estimation}
        />
      )}

      {/* Convert Dialog */}
      {estimation && (
        <ConvertToQuotationDialog
          open={isConvertDialogOpen}
          onClose={() => setIsConvertDialogOpen(false)}
          estimation={estimation}
        />
      )}

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteEstimation.isPending}
      />
    </>
  );
}
