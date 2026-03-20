"use client";

import { useMemo, useState } from "react";
import { Edit, Trash2, CheckCircle2, XCircle, DollarSign, CreditCard, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "../../order/components/invoice-status-badge";
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
import { SalesPaymentForm } from "@/features/sales/payments/components/sales-payment-form";
import { SalesPaymentsLinkedDialog } from "@/features/sales/payments/components/sales-payments-linked-dialog";
import {
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useInvoice,
  useInvoiceAuditTrail,
} from "../hooks/use-invoices";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency, formatDate, formatWhatsAppLink } from "@/lib/utils";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import type { CustomerInvoice } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useInvoiceDetail } from "../hooks/use-invoice-detail";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import type { SalesOrder } from "../../order/types";
import { QuotationProductDetailModal } from "../../quotation/components/quotation-product-detail-modal";
import type { Customer } from "@/features/master-data/customer/types";
import { buildFallbackAuditTrailEntries, SalesAuditTrailTable } from "../../components/sales-audit-trail-table";

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
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const t = useTranslations("invoice");

  const { data: detailData } = useInvoice(invoice?.id ?? "", {
    enabled: open && !!invoice?.id,
  });
  const { data: auditData, isFetching: auditLoading, isError: auditError } = useInvoiceAuditTrail(
    invoice?.id ?? "",
    { page: auditPage, per_page: auditPageSize },
    { enabled: open && !!invoice?.id },
  );

  const canEdit = useUserPermission("customer_invoice.update");
  const canDelete = useUserPermission("customer_invoice.delete");
  const canPay = useUserPermission("customer_invoice.pay");
  const canCreatePayment = useUserPermission("sales_payment.create") || canPay;
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

  // payment dialog state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInvoiceForPayments, setSelectedInvoiceForPayments] = useState<{ id: string; code: string } | null>(null);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);

  const isPaymentStatus = (status?: string): boolean => {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "waiting_payment" || normalized === "paid" || normalized === "partial";
  };

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

  const displayInvoice = detailData?.data ?? invoice;
  const status = (displayInvoice?.status ?? "").toLowerCase();
  const fallbackAuditEntries = useMemo(
    () => {
      if (!displayInvoice) return [];

      return buildFallbackAuditTrailEntries([
        {
          id: `${displayInvoice.id}-created`,
          action: "customer_invoice.create",
          at: displayInvoice.created_at,
          user: displayInvoice.created_by,
          metadata: {
            details: `Created invoice with amount ${formatCurrency(displayInvoice.amount ?? 0)}`,
          },
        },
        {
          id: `${displayInvoice.id}-updated`,
          action: "customer_invoice.update",
          at: displayInvoice.updated_at,
          metadata:
            displayInvoice.updated_at && displayInvoice.updated_at !== displayInvoice.created_at
              ? { details: "Invoice data updated" }
              : null,
        },
        {
          id: `${displayInvoice.id}-paid`,
          action: "customer_invoice.pay",
          at: displayInvoice.payment_at,
          metadata: {
            status: "paid",
          },
        },
        {
          id: `${displayInvoice.id}-status`,
          action: "customer_invoice.status",
          at: displayInvoice.updated_at,
          metadata: {
            status: displayInvoice.status,
          },
        },
      ]);
    },
    [displayInvoice],
  );
  const useServerAudit = (auditData?.data?.length ?? 0) > 0;
  const auditEntries = useServerAudit ? auditData?.data ?? [] : fallbackAuditEntries;
  const auditPagination = useServerAudit ? auditData?.meta?.pagination : undefined;

  if (!invoice || !displayInvoice) return null;

  const allItems = displayInvoice.items ?? [];
  const totalItems = allItems.length;
  const paginatedItems = allItems.slice(
    (itemsPage - 1) * pageSize,
    itemsPage * pageSize
  );

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

  const handleSubmitInvoice = async () => {
    if (!invoice?.id) return;
    try {
      await updateStatus.mutateAsync({
        id: invoice.id,
        data: { status: "sent" },
      });
      toast.success(t("statusUpdated"));
    } catch (error) {
      console.error("Failed to submit invoice:", error);
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
                  {invoice && (() => {
                    const clickable = isPaymentStatus(invoice.status);
                    if (!clickable) {
                      return <InvoiceStatusBadge status={invoice.status} className="text-xs font-medium" />;
                    }
                    return (
                      <button
                        type="button"
                        className="inline-flex items-center cursor-pointer"
                        title={t("common.view")}
                        onClick={() => {
                          setSelectedInvoiceForPayments({ id: invoice.id, code: invoice.code || invoice.invoice_number || "" });
                          setIsPaymentOpen(true);
                        }}
                      >
                        <InvoiceStatusBadge status={invoice.status} className="text-xs font-medium" />
                      </button>
                    );
                  })()}
                  <span className="text-sm text-muted-foreground">
                    {displayInvoice?.invoice_date && formatDate(displayInvoice.invoice_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canEdit && status === "draft" && (
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
                {canEdit && status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSubmitInvoice}
                    className="cursor-pointer text-primary hover:text-primary/80 hover:bg-primary/5"
                    title={t("actions.submit")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (status === "draft" || status === "unpaid") && (
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
                {canCreatePayment && ["unpaid", "partial", "waiting_payment"].includes(status) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreatePaymentOpen(true)}
                    className="cursor-pointer text-primary hover:text-primary hover:bg-blue-50"
                    title={t("actions.createPayment")}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                )}
                {canPay && ["unpaid", "partial", "waiting_payment"].includes(status) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkAsPaid}
                    disabled={updateStatus.isPending}
                    className="cursor-pointer text-success hover:text-success hover:bg-green-50"
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
                <TabsTrigger value="audit-trail">{t("tabs.auditTrail")}</TabsTrigger>
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
                        <TableCell>{formatDate(displayInvoice.invoice_date)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("common.status")}</TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={displayInvoice.status} className="text-xs font-medium" />
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("dueDate")}</TableCell>
                        <TableCell>
                          {displayInvoice.due_date 
                            ? formatDate(displayInvoice.due_date)
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
                          <TableCell className="text-right text-success font-medium">
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

              <TabsContent value="audit-trail" className="py-4">
                <SalesAuditTrailTable
                  entries={auditEntries}
                  isLoading={auditLoading && auditEntries.length === 0}
                  errorText={auditError && auditEntries.length === 0 ? t("common.error") : undefined}
                  pagination={auditPagination}
                  onPageChange={useServerAudit ? setAuditPage : undefined}
                  onPageSizeChange={
                    useServerAudit
                      ? (newSize) => {
                          setAuditPageSize(newSize);
                          setAuditPage(1);
                        }
                      : undefined
                  }
                  labels={{
                    empty: t("auditTrail.empty"),
                    columns: {
                      action: t("auditTrail.columns.action"),
                      user: t("auditTrail.columns.user"),
                      time: t("auditTrail.columns.time"),
                      details: t("auditTrail.columns.details"),
                    },
                  }}
                />
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

      {isPaymentOpen && selectedInvoiceForPayments && (
        <SalesPaymentsLinkedDialog
          open={isPaymentOpen}
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) {
              setIsPaymentOpen(false);
              setSelectedInvoiceForPayments(null);
            }
          }}
          invoiceId={selectedInvoiceForPayments.id}
          invoiceCode={selectedInvoiceForPayments.code}
        />
      )}

      {isCreatePaymentOpen && invoice?.id && (
        <SalesPaymentForm
          open={isCreatePaymentOpen}
          onClose={() => setIsCreatePaymentOpen(false)}
          defaultInvoiceId={invoice.id}
        />
      )}

    </>
  );
}
