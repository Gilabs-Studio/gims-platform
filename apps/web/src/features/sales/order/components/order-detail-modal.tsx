"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, Package, Truck, Clock, Receipt } from "lucide-react";
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
import { OrderForm } from "./order-form";
import {
  useDeleteOrder,
  useUpdateOrderStatus,
  useOrder,
} from "../hooks/use-orders";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import type { SalesOrder } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useOrderDetail } from "../hooks/use-order-detail";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { QuotationDetailModal } from "../../quotation/components/quotation-detail-modal";
import type { SalesQuotation } from "../../quotation/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";
import { DeliveryForm } from "../../delivery/components/delivery-form";
import { InvoiceForm } from "../../invoice/components/invoice-form";

interface OrderDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly order: SalesOrder | null;
}

export function OrderDetailModal({
  open,
  onClose,
  order,
}: OrderDetailModalProps) {
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("order");

  const { data: detailData, isLoading } = useOrder(order?.id ?? "", {
    enabled: open && !!order?.id,
  });

  const canEdit = useUserPermission("sales_order.update");
  const canDelete = useUserPermission("sales_order.delete");
  const canApprove = useUserPermission("sales_order.approve");
  const canCancel = useUserPermission("sales_order.cancel");
  const canCreateDO = useUserPermission("delivery_order.create");
  const canCreateInvoice = useUserPermission("customer_invoice.create");

  const [isCreateDOOpen, setIsCreateDOOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  const {
    canViewEmployee,
    canViewProduct,
    canViewSalesQuotation,
    isEmployeeOpen, setIsEmployeeOpen, selectedEmployeeId,
    isProductOpen, setIsProductOpen, selectedProductId,
    isQuotationOpen, setIsQuotationOpen, selectedQuotationId,
    openEmployee, openProduct, openQuotation,
  } = useOrderDetail();

  if (!order) return null;

  const displayOrder = detailData?.data ?? order;
  const allItems = displayOrder.items ?? [];
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
    if (!order?.id) return;
    try {
      await deleteOrder.mutateAsync(order.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleApprove = async () => {
    if (!order?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        data: { status: "approved" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to approve order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleCancel = async () => {
    if (!order?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        data: { status: "cancelled" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to cancel order:", error);
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
                <DialogTitle className="text-xl mb-2">{displayOrder?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {order && getStatusBadge(order.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayOrder?.order_date && new Date(displayOrder.order_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && order?.status === "draft" && (
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
                {canDelete && order?.status === "draft" && (
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
                {displayOrder?.status === "submitted" && canApprove && (
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
                {displayOrder?.status !== "cancelled" && canCancel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancel}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-500"
                    title={t("actions.cancel")}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {displayOrder?.status === "approved" && canCreateDO && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreateDOOpen(true)}
                    className="cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("actions.createDelivery")}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                )}
                {displayOrder?.status === "approved" && canCreateInvoice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.createInvoice")}
                  >
                    <Receipt className="h-4 w-4" />
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
                        <TableCell>{displayOrder.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("orderDate")}</TableCell>
                        <TableCell>{new Date(displayOrder.order_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayOrder.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("salesQuotation")}</TableCell>
                        <TableCell>
                          {canViewSalesQuotation && displayOrder.sales_quotation_id ? (
                            <button
                              onClick={() => openQuotation(displayOrder.sales_quotation_id)}
                              className="text-primary hover:underline cursor-pointer text-left"
                            >
                              {displayOrder.sales_quotation?.code ?? displayOrder.sales_quotation_id}
                            </button>
                          ) : (
                            <span>{displayOrder.sales_quotation?.code ?? displayOrder.sales_quotation_id ?? "-"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {displayOrder.payment_terms && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("paymentTerms")}</TableCell>
                          <TableCell>{displayOrder.payment_terms.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("salesRep")}</TableCell>
                          <TableCell>
                            {canViewEmployee && displayOrder.sales_rep ? (
                              <button
                                onClick={() => openEmployee(displayOrder.sales_rep?.id)}
                                className="text-primary hover:underline cursor-pointer text-left"
                              >
                                {displayOrder.sales_rep.name}
                              </button>
                            ) : (
                              <span>{displayOrder.sales_rep?.name ?? "-"}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      {displayOrder.business_unit && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("businessUnit")}</TableCell>
                          <TableCell>{displayOrder.business_unit.name}</TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("businessType")}</TableCell>
                          <TableCell>{displayOrder.business_type?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayOrder.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayOrder.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Customer Information Table */}
                {(displayOrder.customer_name || displayOrder.customer_contact || 
                  displayOrder.customer_phone || displayOrder.customer_email) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerName")}</TableCell>
                              <TableCell>{displayOrder.customer_name ?? "-"}</TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerContact")}</TableCell>
                              <TableCell>{displayOrder.customer_contact ?? "-"}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("customerPhone")}</TableCell>
                              <TableCell>
                                {displayOrder.customer_phone ? (
                                  <a
                                    href={`https://wa.me/${displayOrder.customer_phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {displayOrder.customer_phone}
                                  </a>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="font-medium bg-muted/50">{t("customerEmail")}</TableCell>
                              <TableCell>
                                {displayOrder.customer_email ? (
                                  <a href={`mailto:${displayOrder.customer_email}`} className="text-primary hover:underline">
                                    {displayOrder.customer_email}
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
                          <TableCell className="text-right">{formatCurrency(displayOrder.subtotal)}</TableCell>
                        </TableRow>
                        {displayOrder.discount_amount > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("discountAmount")}</TableCell>
                            <TableCell className="text-right text-destructive">
                              -{formatCurrency(displayOrder.discount_amount)}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {t("taxAmount")} ({displayOrder.tax_rate}%)
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(displayOrder.tax_amount)}</TableCell>
                        </TableRow>
                        {displayOrder.delivery_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("deliveryCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayOrder.delivery_cost)}</TableCell>
                          </TableRow>
                        )}
                        {displayOrder.other_cost > 0 && (
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50">{t("otherCost")}</TableCell>
                            <TableCell className="text-right">{formatCurrency(displayOrder.other_cost)}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("totalAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(displayOrder.total_amount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {(displayOrder.confirmed_at || displayOrder.cancelled_at) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayOrder.confirmed_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("confirmedAt")}</TableCell>
                                <TableCell>{new Date(displayOrder.confirmed_at).toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {displayOrder.cancelled_at && (
                              <>
                                <TableRow>
                                  <TableCell className="font-medium bg-muted/50">{t("cancelledAt")}</TableCell>
                                  <TableCell>{new Date(displayOrder.cancelled_at).toLocaleString()}</TableCell>
                                </TableRow>
                                {displayOrder.cancellation_reason && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("cancellationReason")}</TableCell>
                                    <TableCell>{displayOrder.cancellation_reason}</TableCell>
                                  </TableRow>
                                )}
                              </>
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
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
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

      {order && (
        <OrderForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          order={order}
        />
      )}

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteOrder.isPending}
      />

      <EmployeeDetailModal
        open={isEmployeeOpen}
        onOpenChange={setIsEmployeeOpen}
        employee={selectedEmployeeId ? { id: selectedEmployeeId } as unknown as MdEmployee : null}
      />

      <QuotationDetailModal
        open={isQuotationOpen}
        onClose={() => setIsQuotationOpen(false)}
        quotation={selectedQuotationId ? { id: selectedQuotationId } as unknown as SalesQuotation : null}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

      {/* Create DO from approved SO */}
      {order && isCreateDOOpen && (
        <DeliveryForm
          open={isCreateDOOpen}
          onClose={() => setIsCreateDOOpen(false)}
          defaultSalesOrderId={order.id}
        />
      )}

      {/* Create Invoice from approved SO */}
      {order && isCreateInvoiceOpen && (
        <InvoiceForm
          open={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          defaultSalesOrderId={order.id}
        />
      )}
    </>
  );
}
