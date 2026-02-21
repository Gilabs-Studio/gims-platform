"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, FileText, Clock, Send } from "lucide-react";
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
import { useQuotationDetail } from "../hooks/use-quotation-detail";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { QuotationProductDetailModal } from "./quotation-product-detail-modal";
import { QuotationForm } from "./quotation-form";
import {
  useDeleteQuotation,
  useUpdateQuotationStatus,
  useQuotation,
  useQuotationItems,
} from "../hooks/use-quotations";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesQuotation } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface QuotationDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quotation: SalesQuotation | null;
}

export function QuotationDetailModal({
  open,
  onClose,
  quotation,
}: QuotationDetailModalProps) {
  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("quotation");

  const { data: detailData, isLoading } = useQuotation(quotation?.id ?? "", {
    enabled: open && !!quotation?.id,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuotationItems(
    quotation?.id ?? "",
    { page: itemsPage, per_page: pageSize },
    { enabled: open && !!quotation?.id }
  );

  const canEdit = useUserPermission("sales_quotation.update");
  const canDelete = useUserPermission("sales_quotation.delete");
  const canApprove = useUserPermission("sales_quotation.approve");
  const canReject = useUserPermission("sales_quotation.reject");
  const canConvert = useUserPermission("sales_quotation.convert");

  const {
    canViewEmployee,
    canViewProduct,
    isEmployeeOpen,
    setIsEmployeeOpen,
    selectedEmployee,
    isProductOpen,
    setIsProductOpen,
    selectedProductId,
    openEmployee,
    openProduct,
    formatWhatsAppLink,
  } = useQuotationDetail();

  if (!quotation) return null;

  const displayQuotation = detailData?.data ?? quotation;
  const items = itemsData?.data ?? [];
  const itemsPagination = itemsData?.meta?.pagination;

  const totalItems = itemsPagination?.total ?? 0;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.draft")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.sent")}
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
    if (!quotation?.id) return;
    try {
      await deleteQuotation.mutateAsync(quotation.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleApprove = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "approved" },
      });
      toast.success(t("status.approved"));
    } catch (error) {
      console.error("Failed to approve quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleReject = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "rejected" },
      });
      toast.success(t("status.rejected"));
    } catch (error) {
      console.error("Failed to reject quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleConvert = async () => {
    if (!quotation?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: quotation.id,
        data: { status: "converted" },
      });
      toast.success(t("status.converted"));
    }catch (error) {
      console.error("Failed to convert quotation:", error);
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
                <DialogTitle className="text-xl mb-2">{displayQuotation?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {quotation && getStatusBadge(quotation.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayQuotation?.quotation_date && new Date(displayQuotation.quotation_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && quotation?.status === "draft" && (
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
                {canDelete && quotation?.status === "draft" && (
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
                {displayQuotation?.status === "sent" && canApprove && (
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
                {displayQuotation?.status === "sent" && canReject && (
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
                {displayQuotation?.status === "approved" && canConvert && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleConvert}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("actions.convert")}
                  >
                    <FileText className="h-4 w-4" />
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

              <TabsContent value="general" className="space-y-6">
                
                {/* Main Information (grid-based) */}
                <div className="rounded-lg">
                  <div className="grid grid-cols-4 gap-x-6 gap-y-3 pt-4">
                    <div className="text-sm text-muted-foreground">{t("code")}</div>
                    <div className="text-sm font-semibold text-foreground">{displayQuotation.code}</div>
                    <div className="text-sm text-muted-foreground">{t("quotationDate")}</div>
                    <div className="text-sm font-semibold text-foreground">{new Date(displayQuotation.quotation_date).toLocaleDateString()}</div>

                    <div className="text-sm text-muted-foreground">{t("common.status")}</div>
                    <div className="text-sm">{getStatusBadge(displayQuotation.status)}</div>
                    <div className="text-sm text-muted-foreground">{t("validUntil")}</div>
                    <div className="text-sm font-semibold text-foreground">{displayQuotation.valid_until ? new Date(displayQuotation.valid_until).toLocaleDateString() : "-"}</div>

                    {displayQuotation.payment_terms && (
                      <>
                        <div className="text-sm text-muted-foreground">{t("paymentTerms")}</div>
                        <div className="text-sm font-semibold text-foreground">{displayQuotation.payment_terms.name}</div>
                        <div className="text-sm text-muted-foreground">{t("salesRep")}</div>
                        <div className="text-sm">
                          {displayQuotation.sales_rep ? (
                            canViewEmployee ? (
                              <button
                                onClick={() => openEmployee(displayQuotation.sales_rep)}
                                className="text-primary font-semibold hover:underline cursor-pointer"
                              >
                                {displayQuotation.sales_rep.name}
                              </button>
                            ) : (
                              <span className="font-semibold text-foreground">{displayQuotation.sales_rep.name}</span>
                            )
                          ) : (
                            <span className="font-semibold text-foreground">-</span>
                          )}
                        </div>
                      </>
                    )}

                    {displayQuotation.business_unit && (
                      <>
                        <div className="text-sm text-muted-foreground">{t("businessUnit")}</div>
                        <div className="text-sm font-semibold text-foreground">{displayQuotation.business_unit.name}</div>
                        <div className="text-sm text-muted-foreground">{t("businessType")}</div>
                        <div className="text-sm font-semibold text-foreground">{displayQuotation.business_type?.name ?? "-"}</div>
                      </>
                    )}

                    {displayQuotation.notes && (
                      <>
                        <div className="text-sm text-muted-foreground pt-4">{t("notes")}</div>
                        <div className="text-sm font-semibold text-foreground col-span-3 pt-4">{displayQuotation.notes}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Customer Information Table */}
                {(displayQuotation.customer_name || displayQuotation.customer_contact ||
                  displayQuotation.customer_phone || displayQuotation.customer_email) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="rounded-lg">
                        <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                            <div className="text-sm text-muted-foreground">{t("customerName")}</div>
                            <div className="text-sm font-semibold text-foreground">{displayQuotation.customer_name ?? "-"}</div>
                            <div className="text-sm text-muted-foreground">{t("customerContact")}</div>
                            <div className="text-sm font-semibold text-foreground">{displayQuotation.customer_contact ?? "-"}</div>

                            <div className="text-sm text-muted-foreground">{t("customerPhone")}</div>
                            <div className="text-sm">
                              {displayQuotation.customer_phone ? (
                                <a href={formatWhatsAppLink(displayQuotation.customer_phone)} target="_blank" rel="noreferrer" className="text-primary">
                                  {displayQuotation.customer_phone}
                                </a>
                              ) : (
                                <span className="font-semibold text-foreground">-</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{t("customerEmail")}</div>
                            <div className="text-sm">
                              {displayQuotation.customer_email ? (
                                <a href={`mailto:${displayQuotation.customer_email}`} className="text-primary">
                                  {displayQuotation.customer_email}
                                </a>
                              ) : (
                                <span className="font-semibold text-foreground">-</span>
                              )}
                            </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Financial Summary Table */}
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">{t("common.financial")}</h3>
                  <div className="rounded-lg">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <div className="text-sm text-muted-foreground">{t("subtotal")}</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(displayQuotation.subtotal)}</div>
                      </div>

                      {displayQuotation.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-destructive">
                          <div className="text-sm text-muted-foreground">{t("discountAmount")}</div>
                          <div className="text-sm font-semibold text-foreground">-{formatCurrency(displayQuotation.discount_amount)}</div>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <div className="text-sm text-muted-foreground">{t("taxAmount")} ({displayQuotation.tax_rate}%)</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(displayQuotation.tax_amount)}</div>
                      </div>

                      {displayQuotation.delivery_cost > 0 && (
                        <div className="flex justify-between text-sm">
                          <div className="text-sm text-muted-foreground">{t("deliveryCost")}</div>
                          <div className="text-sm font-semibold text-foreground">{formatCurrency(displayQuotation.delivery_cost)}</div>
                        </div>
                      )}

                      {displayQuotation.other_cost > 0 && (
                        <div className="flex justify-between text-sm">
                          <div className="text-sm text-muted-foreground">{t("otherCost")}</div>
                          <div className="text-sm font-semibold text-foreground">{formatCurrency(displayQuotation.other_cost)}</div>
                        </div>
                      )}

                      <div className="flex justify-between pt-2 border-t">
                        <div className="font-bold">{t("totalAmount")}</div>
                        <div className="text-right font-bold text-lg">{formatCurrency(displayQuotation.total_amount)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow History */}
                {(displayQuotation.approved_at || displayQuotation.rejected_at || displayQuotation.converted_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="rounded-lg">
                        <div className="space-y-3">
                          {displayQuotation.approved_at && (
                            <div className="flex justify-between text-sm">
                              <div className="text-sm text-muted-foreground">{t("status.approved")}</div>
                              <div className="text-sm font-semibold text-foreground">{new Date(displayQuotation.approved_at).toLocaleString()}</div>
                            </div>
                          )}

                          {displayQuotation.rejected_at && (
                            <>
                              <div className="flex justify-between text-sm">
                                <div className="text-sm text-muted-foreground">{t("status.rejected")}</div>
                                <div className="text-sm font-semibold text-foreground">{new Date(displayQuotation.rejected_at).toLocaleString()}</div>
                              </div>
                              {displayQuotation.rejection_reason && (
                                <div className="flex justify-between text-sm">
                                  <div className="text-sm text-muted-foreground">{t("rejectionReason")}</div>
                                  <div className="text-sm font-semibold text-foreground">{displayQuotation.rejection_reason}</div>
                                </div>
                              )}
                            </>
                          )}

                          {displayQuotation.converted_at && (
                            <div className="flex justify-between text-sm">
                              <div className="text-sm text-muted-foreground">{t("status.converted")}</div>
                              <div className="text-sm font-semibold text-foreground">{new Date(displayQuotation.converted_at).toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                {itemsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg">
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
                          {items.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                {t("noItems")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  {item.product && canViewProduct ? (
                                    <button
                                      onClick={() => openProduct(item.product?.id)}
                                      className="text-left hover:underline cursor-pointer"
                                    >
                                      <p className="font-medium text-primary">{item.product.name}</p>
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
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.discount ?? 0)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
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
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <EmployeeDetailModal
        open={isEmployeeOpen}
        onOpenChange={setIsEmployeeOpen}
        employee={selectedEmployee as unknown as MdEmployee}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

      {quotation && (
        <QuotationForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          quotation={quotation}
        />
      )}

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteQuotation.isPending}
      />
    </>
  );
}
