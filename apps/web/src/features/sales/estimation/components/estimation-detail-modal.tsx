"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
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
import {
  useDeleteEstimation,
  useUpdateEstimationStatus,
  useEstimation,
} from "../hooks/use-estimations";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesEstimation } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useEstimationDetail } from "../hooks/use-estimation-detail";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";

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
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("estimation");

  const { data: detailData, isLoading } = useEstimation(estimation?.id ?? "", {
    enabled: open && !!estimation?.id,
  });

  const canEdit = useUserPermission("sales_estimation.update");
  const canDelete = useUserPermission("sales_estimation.delete");
  const canApprove = useUserPermission("sales_estimation.approve");
  const canReject = useUserPermission("sales_estimation.reject");

  const {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen, setIsEmployeeOpen, selectedEmployeeId,
    isProductOpen, setIsProductOpen, selectedProductId,
    openEmployee, openProduct,
  } = useEstimationDetail();

  if (!estimation) return null;

  const displayEstimation = detailData?.data ?? estimation;
  const allItems = displayEstimation.items ?? [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * pageSize,
    itemsPage * pageSize
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
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
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
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
      toast.success(t("status.approved"));
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
      toast.success(t("status.rejected"));
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
                )}
                {displayEstimation?.status === "submitted" && canReject && (
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
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="general" className="w-full">
              <TabsList>
                <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
                <TabsTrigger value="items">{t("tabs.items")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 py-4">
                
                {/* Main Information Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("code")}</TableCell>
                        <TableCell>{displayEstimation.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("estimationDate")}</TableCell>
                        <TableCell>{new Date(displayEstimation.estimation_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayEstimation.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("probability")}</TableCell>
                        <TableCell>
                          {displayEstimation.probability ? `${displayEstimation.probability}%` : "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("salesRep")}</TableCell>
                        <TableCell>
                          {canViewEmployee && displayEstimation.sales_rep ? (
                            <button
                              onClick={() => openEmployee(displayEstimation.sales_rep?.id)}
                              className="text-primary hover:underline cursor-pointer text-left"
                            >
                              {displayEstimation.sales_rep.name}
                            </button>
                          ) : (
                            <span>{displayEstimation.sales_rep?.name ?? "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48"></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {displayEstimation.business_unit && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("businessUnit")}</TableCell>
                          <TableCell>{displayEstimation.business_unit.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("businessType")}</TableCell>
                          <TableCell>{displayEstimation.business_type?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayEstimation.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayEstimation.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Customer Information Table */}
                {(displayEstimation.customer_name || displayEstimation.customer_contact || 
                  displayEstimation.customer_phone || displayEstimation.customer_email) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerName")}</TableCell>
                              <TableCell>{displayEstimation.customer_name ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerContact")}</TableCell>
                              <TableCell>{displayEstimation.customer_contact ?? "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("customerPhone")}</TableCell>
                              <TableCell>
                                {displayEstimation.customer_phone ? (
                                  <a
                                    href={`https://wa.me/${displayEstimation.customer_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {displayEstimation.customer_phone}
                                  </a>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="font-medium bg-muted/50">{t("customerEmail")}</TableCell>
                              <TableCell>
                                {displayEstimation.customer_email ? (
                                  <a href={`mailto:${displayEstimation.customer_email}`} className="text-primary hover:underline">
                                    {displayEstimation.customer_email}
                                  </a>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Summary Table */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("common.financial")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-48">{t("subtotal")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(displayEstimation.subtotal)}</TableCell>
                        </TableRow>
                        {displayEstimation.discount_amount > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("discountAmount")}</TableCell>
                            <TableCell className="text-right text-destructive">
                              -{formatCurrency(displayEstimation.discount_amount)}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {t("taxAmount")} ({displayEstimation.tax_rate}%)
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(displayEstimation.tax_amount)}</TableCell>
                        </TableRow>
                        {displayEstimation.delivery_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayEstimation.delivery_cost)}</TableCell>
                          </TableRow>
                        )}
                        {displayEstimation.other_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayEstimation.other_cost)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("totalAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(displayEstimation.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {(displayEstimation.approved_at || displayEstimation.rejected_at || displayEstimation.converted_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayEstimation.approved_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("status.approved")}</TableCell>
                                <TableCell>{new Date(displayEstimation.approved_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {displayEstimation.rejected_at && (
                              <>
                                <TableRow>
                                  <TableCell className="font-medium bg-muted/50">{t("status.rejected")}</TableCell>
                                  <TableCell>{new Date(displayEstimation.rejected_at).toLocaleString()}</TableCell>
                                </TableRow>
                                {displayEstimation.rejection_reason && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("rejectionReason")}</TableCell>
                                    <TableCell>{displayEstimation.rejection_reason}</TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                            {displayEstimation.converted_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50">{t("status.converted")}</TableCell>
                                <TableCell>{new Date(displayEstimation.converted_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-4 py-4">
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("item.product")}</TableHead>
                          <TableHead className="text-right">{t("item.quantity")}</TableHead>
                          <TableHead className="text-right">{t("item.price")}</TableHead>
                          <TableHead className="text-right">{t("item.discount")}</TableHead>
                          <TableHead className="text-right">{t("item.subtotal")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {t("noItems")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {canViewProduct && item.product ? (
                                  <button
                                    onClick={() => openProduct(item.product?.id)}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    <p className="font-medium">{item.product.name}</p>
                                    {item.product.code && (
                                      <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                    )}
                                  </button>
                                ) : (
                                  <div>
                                    <p className="font-medium">{item.product?.name ?? t("unknownProduct")}</p>
                                    {item.product?.code && (
                                      <p className="text-sm text-muted-foreground">{item.product.code}</p>
                                    )}
                                  </div>
                                )}
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
                  )}
                </>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {estimation && (
        <EstimationForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          estimation={estimation}
        />
      )}

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteEstimation.isPending}
      />

      <EmployeeDetailModal
        open={isEmployeeOpen}
        onOpenChange={setIsEmployeeOpen}
        employee={selectedEmployeeId ? { id: selectedEmployeeId } as unknown as MdEmployee : null}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />
    </>
  );
}
