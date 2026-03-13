"use client";

import { useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, Clock, DollarSign, Send } from "lucide-react";
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
import { InvoiceForm } from "./invoice-form";
import {
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useInvoice,
} from "../hooks/use-invoices";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatWhatsAppLink } from "@/lib/utils";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import type { CustomerInvoice } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useInvoiceDetail } from "../hooks/use-invoice-detail";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import type { SalesOrder } from "../../order/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";
import type { Customer } from "@/features/master-data/customer/types";

interface InvoiceDetailModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoice: CustomerInvoice | null;
}

export function InvoiceDetailModal({
  open,
  onClose,
  invoice,
}: InvoiceDetailModalProps) {
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsPage, setItemsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const t = useTranslations("invoice");

  const { data: detailData } = useInvoice(invoice?.id ?? "", {
    enabled: open && !!invoice?.id,
  });

  const canEdit = useUserPermission("customer_invoice.update");
  const canDelete = useUserPermission("customer_invoice.delete");
  const canPay = useUserPermission("customer_invoice.pay");
  const canViewCustomer = useUserPermission("customer.read");

  const {
    canViewProduct,
    canViewSalesOrder,
    isProductOpen, setIsProductOpen, selectedProductId,
    isSalesOrderOpen, setIsSalesOrderOpen, selectedSalesOrderId,
    openProduct, openSalesOrder,
  } = useInvoiceDetail();

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const customerProp: Customer | null = selectedCustomerId
    ? ({
        id: selectedCustomerId,
        code: "",
        name: "",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Customer)
    : null;

  if (!invoice) return null;

  const displayInvoice = detailData?.data ?? invoice;
  const allItems = displayInvoice.items ?? [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * pageSize,
    itemsPage * pageSize
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "unpaid":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.unpaid")}
          </Badge>
        );
      case "waiting_payment":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1.5" />
            {t("status.waiting_payment")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1.5" />
            {t("status.pending")}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <DollarSign className="h-3 w-3 mr-1.5" />
            {t("status.partial")}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            {t("status.paid")}
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
    if (!invoice?.id) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success(t("deleted"));
      onClose();
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { status: "paid" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to mark invoice as paid:", error);
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
                <DialogTitle className="text-xl mb-2">{displayInvoice?.code ?? t("common.view")}</DialogTitle>
                <div className="flex items-center gap-3">
                  {invoice && getStatusBadge(invoice.status)}
                  <span className="text-sm text-muted-foreground">
                    {displayInvoice?.invoice_date && new Date(displayInvoice.invoice_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && invoice?.status === "unpaid" && (
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
                {canDelete && invoice?.status === "unpaid" && (
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
                {canPay && (invoice?.status === "unpaid" || invoice?.status === "partial") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkAsPaid}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t("actions.markAsPaid")}
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

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
                        <TableCell>{displayInvoice.code}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("invoiceDate")}</TableCell>
                        <TableCell>{new Date(displayInvoice.invoice_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>{getStatusBadge(displayInvoice.status)}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("dueDate")}</TableCell>
                        <TableCell>
                          {displayInvoice.due_date 
                            ? new Date(displayInvoice.due_date).toLocaleDateString() 
                            : "-"}
                        </TableCell>
                      </TableRow>
                      {displayInvoice.sales_order_id && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("salesOrder")}</TableCell>
                          <TableCell>
                            {canViewSalesOrder && displayInvoice.sales_order_id ? (
                              <button
                                onClick={() => openSalesOrder(displayInvoice.sales_order_id)}
                                className="text-primary hover:underline cursor-pointer text-left"
                              >
                                  {displayInvoice.sales_order?.code ?? displayInvoice.sales_order_id}
                                </button>
                              ) : (
                                <span>{displayInvoice.sales_order?.code ?? displayInvoice.sales_order_id}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium bg-muted/50">{t("paymentTerms")}</TableCell>
                          <TableCell>{displayInvoice.payment_terms?.name ?? "-"}</TableCell>
                        </TableRow>
                      )}
                      {displayInvoice.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("notes")}</TableCell>
                          <TableCell colSpan={3}>{displayInvoice.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Customer Information Table */}
                {displayInvoice.sales_order && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("customerInfo")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerName")}</TableCell>
                              <TableCell>
                                {canViewCustomer && displayInvoice.sales_order.customer_id ? (
                                  <button
                                    onClick={() => {
                                        setSelectedCustomerId(displayInvoice.sales_order?.customer_id ?? null);
                                        setIsCustomerOpen(true);
                                      }}
                                    className="text-primary hover:underline cursor-pointer text-left"
                                  >
                                    {displayInvoice.sales_order.customer_name ?? displayInvoice.sales_order.customer_id}
                                  </button>
                                ) : (
                                  <span>{displayInvoice.sales_order.customer_name ?? "-"}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium bg-muted/50 w-48">{t("customerPhone")}</TableCell>
                              <TableCell>
                                {displayInvoice.sales_order.customer_phone ? (
                                  <a
                                    href={formatWhatsAppLink(displayInvoice.sales_order.customer_phone)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {displayInvoice.sales_order.customer_phone}
                                  </a>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("customerEmail")}</TableCell>
                              <TableCell>
                                {displayInvoice.sales_order.customer_email ? (
                                  <a href={`mailto:${displayInvoice.sales_order.customer_email}`} className="text-primary hover:underline">
                                    {displayInvoice.sales_order.customer_email}
                                  </a>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="font-medium bg-muted/50"></TableCell>
                              <TableCell></TableCell>
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
                          <TableCell className="text-right">{formatCurrency(displayInvoice.subtotal)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            {t("taxAmount")} ({displayInvoice.tax_rate}%)
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(displayInvoice.tax_amount)}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold bg-muted">{t("totalAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {formatCurrency(displayInvoice.amount)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("paidAmount")}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(displayInvoice.paid_amount ?? 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold bg-muted">{t("remainingAmount")}</TableCell>
                          <TableCell className="text-right font-bold text-lg text-primary">
                            {formatCurrency(displayInvoice.remaining_amount ?? (displayInvoice.amount - (displayInvoice.paid_amount ?? 0)))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Workflow History */}
                {displayInvoice.payment_at && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t("common.workflow")}</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableBody>
                            {displayInvoice.payment_at && (
                              <TableRow>
                                <TableCell className="font-medium bg-muted/50 w-48">{t("paidAt")}</TableCell>
                                <TableCell>{new Date(displayInvoice.payment_at).toLocaleString()}</TableCell>
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
                          paginatedItems.map((item: import("../types").CustomerInvoiceItem) => (
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
        </DialogContent>
      </Dialog>

      {invoice && (
        <InvoiceForm
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
          }}
          invoice={invoice}
        />
      )}

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title={t("delete")}
        description={t("deleteDesc")}
        isLoading={deleteInvoice.isPending}
      />

      <OrderDetailModal
        open={isSalesOrderOpen}
        onClose={() => setIsSalesOrderOpen(false)}
        order={selectedSalesOrderId ? { id: selectedSalesOrderId } as unknown as SalesOrder : null}
      />

      <CustomerDetailModal
        open={isCustomerOpen}
        onOpenChange={setIsCustomerOpen}
        customer={customerProp}
      />

      <QuotationProductDetailModal
        open={isProductOpen}
        onOpenChange={setIsProductOpen}
        productId={selectedProductId}
      />

    </>
  );
}
