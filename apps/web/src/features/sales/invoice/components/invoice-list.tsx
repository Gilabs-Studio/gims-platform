"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, DollarSign, XCircle, CheckCircle2, Clock, AlertTriangle, FileText, Send, CreditCard, Printer } from "lucide-react";
import { useInvoices, useDeleteInvoice, useUpdateInvoiceStatus, useApproveInvoice } from "../hooks/use-invoices";
import { useDebounce } from "@/hooks/use-debounce";
import { InvoicePrintDialog } from "./invoice-print-dialog";
import { InvoiceForm } from "./invoice-form";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { OrderDetailModal } from "../../order/components/order-detail-modal";
import { CustomerInvoiceDPDetailModal } from "../../customer-invoice-down-payments/components/customer-invoice-dp-detail-modal";
import { SalesPaymentForm } from "../../payments/components/sales-payment-form";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import { DeliveryDetailModal } from "../../delivery/components/delivery-detail-modal";
import type { CustomerInvoice, CustomerInvoiceStatus } from "../types";
import type { SalesOrder } from "../../order/types";
import type { DeliveryOrder } from "../../delivery/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

// ─── Due Date Cell ────────────────────────────────────────────────────────────

function DueDateCell({ dueDate, status }: { dueDate?: string; status: string }) {
  const st = (status ?? "").toLowerCase();
  const isSettled = st === "paid" || st === "cancelled" || st === "rejected";

  if (!dueDate) return <span className="text-sm text-muted-foreground">—</span>;

  const formatted = formatDate(dueDate);
  if (isSettled) return <span className="text-sm text-muted-foreground">{formatted}</span>;

  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <div className="flex items-center gap-1 text-destructive">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="text-xs font-semibold">{Math.abs(diffDays)}d overdue</span>
        </div>
      </div>
    );
  }
  if (diffDays === 0) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <span className="text-xs font-semibold text-amber-500">Due today</span>
      </div>
    );
  }
  if (diffDays <= 7) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{formatted}</span>
        <span className="text-xs font-medium text-amber-500">{diffDays}d left</span>
      </div>
    );
  }
  return <span className="text-sm">{formatted}</span>;
}

export function InvoiceList() {
  const t = useTranslations("invoice");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<CustomerInvoiceStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<CustomerInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<CustomerInvoice | null>(null);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(null);
  const [isSalesOrderOpen, setIsSalesOrderOpen] = useState(false);
  const [selectedDPId, setSelectedDPId] = useState<string | null>(null);
  const [isDPOpen, setIsDPOpen] = useState(false);
  const [selectedDOId, setSelectedDOId] = useState<string | null>(null);
  const [isDOOpen, setIsDOOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useInvoices({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    type: "regular", // ONLY fetch regular invoices
  });

  const canCreate = useUserPermission("customer_invoice.create");
  const canUpdate = useUserPermission("customer_invoice.update");
  const canDelete = useUserPermission("customer_invoice.delete");
  const canView = useUserPermission("customer_invoice.read");
  const canApprove = useUserPermission("customer_invoice.approve");
  const canViewSalesOrder = useUserPermission("sales_order.read");
  const canViewCustomer = useUserPermission("customer.read");
  const canCreatePayment = useUserPermission("sales_payment.create");
  const canPrint = useUserPermission("customer_invoice.print");

  const [createPaymentForInvoiceId, setCreatePaymentForInvoiceId] = useState<string | null>(null);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);

  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const approveInvoice = useApproveInvoice();
  const invoices = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (invoice: CustomerInvoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleView = (invoice: CustomerInvoice) => {
    setViewingInvoice(invoice);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteInvoice.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingInvoice(null);
  };

  const handleStatusChange = async (
    id: string,
    status: CustomerInvoiceStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const isOverdue = (invoice: CustomerInvoice) => {
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  const getStatusBadge = (invoice: CustomerInvoice) => {
    const status = invoice.status;
    const overdue = isOverdue(invoice);

    if (overdue && status !== "paid" && status !== "cancelled") {
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t("overdue")}
        </Badge>
      );
    }

    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="info" className="text-xs font-medium">
            <Send className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="outline" className="text-xs font-medium">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.unpaid")}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="warning" className="text-xs font-medium">
            <DollarSign className="h-3 w-3 mr-1" />
            {t("status.partial")}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="success" className="text-xs font-medium">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.paid")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="text-xs font-medium">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs font-medium">{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as CustomerInvoiceStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="sent">{t("status.pending")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
            <SelectItem value="unpaid">{t("status.unpaid")}</SelectItem>
            <SelectItem value="partial">{t("status.partial")}</SelectItem>
            <SelectItem value="paid">{t("status.paid")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">{t("code")}</TableHead>
              <TableHead>{t("invoiceDate")}</TableHead>
              <TableHead>{t("dueDate")}</TableHead>
              <TableHead>{t("salesOrder")}</TableHead>
              <TableHead>{t("dpCode")}</TableHead>
              <TableHead>{t("customer")}</TableHead>
              <TableHead className="text-right">{t("totalAmount")}</TableHead>
              <TableHead className="text-right">{t("paidAmount")}</TableHead>
              <TableHead className="text-right">{t("remainingAmount")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(invoice)}>
                    {invoice.code}
                  </TableCell>
                  <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                  <TableCell>
                    <DueDateCell dueDate={invoice.due_date} status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    {invoice.sales_order && canViewSalesOrder ? (
                      <button
                        onClick={() => {
                          setSelectedSalesOrderId(invoice.sales_order!.id);
                          setIsSalesOrderOpen(true);
                        }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {invoice.sales_order.code}
                      </button>
                    ) : (
                      <span>{invoice.sales_order?.code ?? "-"}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {invoice.down_payment_invoice_code && invoice.down_payment_invoice_id ? (
                      <button
                        onClick={() => {
                          setSelectedDPId(invoice.down_payment_invoice_id!);
                          setIsDPOpen(true);
                        }}
                        className="text-xs font-mono font-medium text-primary hover:underline cursor-pointer"
                      >
                        {invoice.down_payment_invoice_code}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {invoice.sales_order?.customer ? (
                      canViewCustomer ? (
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline cursor-pointer text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer({ id: invoice.sales_order!.customer!.id, name: invoice.sales_order!.customer!.name });
                            setIsCustomerOpen(true);
                          }}
                        >
                          {invoice.sales_order.customer.name}
                        </button>
                      ) : (
                        <span className="text-sm">{invoice.sales_order.customer.name}</span>
                      )
                    ) : invoice.sales_order?.customer_id ? (
                      canViewCustomer ? (
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline cursor-pointer text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer({ id: invoice.sales_order!.customer_id as string, name: invoice.sales_order!.customer_name ?? "" });
                            setIsCustomerOpen(true);
                          }}
                        >
                          {invoice.sales_order.customer_name}
                        </button>
                      ) : (
                        <span className="text-sm">{invoice.sales_order.customer_name}</span>
                      )
                    ) : invoice.sales_order?.customer_name ? (
                      <span className="text-sm">{invoice.sales_order.customer_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(invoice.amount ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.paid_amount ?? 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.remaining_amount ?? invoice.amount ?? 0)}</TableCell>
                  <TableCell>{getStatusBadge(invoice)}</TableCell>
                  <TableCell>
                    {(canUpdate || canDelete || canView) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem onClick={() => handleView(invoice)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && invoice.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(invoice)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && invoice.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(invoice.id, "sent")}
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "sent" && (
                            <>
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() => approveInvoice.mutateAsync(invoice.id).then(() => toast.success(t("statusUpdated"))).catch(() => toast.error(t("common.error")))}
                                  className="cursor-pointer text-green-600 focus:text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(invoice.id, "rejected")}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {canUpdate && (invoice.status === "unpaid" || invoice.status === "partial") && (
                            <DropdownMenuItem
                              onClick={() => handleView(invoice)}
                              className="cursor-pointer text-green-600 focus:text-green-600"
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {t("actions.pay")}
                            </DropdownMenuItem>
                          )}
                          {canCreatePayment && (invoice.status === "unpaid" || invoice.status === "partial") && (
                            <DropdownMenuItem
                              onClick={() => setCreatePaymentForInvoiceId(invoice.id)}
                              className="cursor-pointer text-blue-600 focus:text-blue-600"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              {t("actions.createPayment")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && invoice.status === "unpaid" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(invoice.id, "cancelled")}
                              className="cursor-pointer text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.cancel")}
                            </DropdownMenuItem>
                          )}
                          {canPrint && (
                            <DropdownMenuItem
                              onClick={() => setPrintingInvoiceId(invoice.id)}
                              className="cursor-pointer text-violet-600 focus:text-violet-600"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              {t("print")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (invoice.status === "draft" || invoice.status === "unpaid") && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(invoice.id)}
                              className="text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={pagination.page}
          pageSize={pagination.per_page}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {canCreate && (
        <InvoiceForm
          open={isFormOpen}
          onClose={handleFormClose}
          invoice={editingInvoice}
        />
      )}

      {canView && viewingInvoice && (
        <InvoiceDetailModal
          open={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
        />
      )}

      {selectedSalesOrderId && (
        <OrderDetailModal
          open={isSalesOrderOpen}
          onClose={() => setIsSalesOrderOpen(false)}
          order={{ id: selectedSalesOrderId } as unknown as SalesOrder}
        />
      )}

      {selectedDPId && (
        <CustomerInvoiceDPDetailModal
          open={isDPOpen}
          onOpenChange={setIsDPOpen}
          id={selectedDPId}
        />
      )}

      {selectedDOId && (
        <DeliveryDetailModal
          open={isDOOpen}
          onClose={() => {
            setIsDOOpen(false);
            setSelectedDOId(null);
          }}
          delivery={{ id: selectedDOId } as unknown as DeliveryOrder}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailModal
          open={isCustomerOpen}
          onOpenChange={(open) => {
            setIsCustomerOpen(open);
            if (!open) setSelectedCustomer(null);
          }}
          customer={selectedCustomer as never}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.invoice")}
          isLoading={deleteInvoice.isPending}
        />
      )}

      {/* Create Payment from unpaid/partial invoice */}
      {createPaymentForInvoiceId && (
        <SalesPaymentForm
          open={!!createPaymentForInvoiceId}
          onClose={() => setCreatePaymentForInvoiceId(null)}
          defaultInvoiceId={createPaymentForInvoiceId}
        />
      )}

      {printingInvoiceId && (
        <InvoicePrintDialog
          open={!!printingInvoiceId}
          onClose={() => setPrintingInvoiceId(null)}
          invoiceId={printingInvoiceId}
        />
      )}
    </div>
  );
}
