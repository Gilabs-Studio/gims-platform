"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { OrderStatusBadge } from "./order-status-badge";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, CheckCircle2, XCircle, FileText, Package, Truck, PieChart, Send } from "lucide-react";
import { useOrders, useDeleteOrder, useUpdateOrderStatus, useApproveOrder } from "../hooks/use-orders";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { OrderForm } from "./order-form";
import { OrderDetailModal } from "./order-detail-modal";
import { QuotationDetailModal } from "../../quotation/components/quotation-detail-modal";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import type { SalesOrder, SalesOrderStatus } from "../types";
import type { SalesQuotation } from "../../quotation/types";
import { formatCurrency } from "@/lib/utils";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function OrderList() {
  const t = useTranslations("order");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<SalesQuotation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useOrders({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("sales_order.create");
  const canUpdate = useUserPermission("sales_order.update");
  const canDelete = useUserPermission("sales_order.delete");
  const canView = useUserPermission("sales_order.read");
  const canApprove = useUserPermission("sales_order.approve");
  const canViewEmployee = useUserPermission("employee.read");
  const canViewSalesQuotation = useUserPermission("sales_quotation.read");

  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [isSalesRepOpen, setIsSalesRepOpen] = useState(false);

  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();
  const approveOrder = useApproveOrder();
  const orders = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleView = (order: SalesOrder) => {
    setViewingOrder(order);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteOrder.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingOrder(null);
  };

  const handleStatusChange = async (
    id: string,
    status: SalesOrderStatus,
    cancellationReason?: string,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status, cancellation_reason: cancellationReason },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
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
            setStatusFilter(v as SalesOrderStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="sent">{t("status.sent")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
            <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
            <SelectItem value="processing">{t("status.processing")}</SelectItem>
            <SelectItem value="partial">{t("status.partial")}</SelectItem>
            <SelectItem value="shipped">{t("status.shipped")}</SelectItem>
            <SelectItem value="delivered">{t("status.delivered")}</SelectItem>
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
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("orderDate")}</TableHead>
              <TableHead>{t("salesQuotations") || "Sales Quotation"}</TableHead>
              <TableHead>{t("salesRep")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("totalAmount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(order)}>
                    {order.code}
                  </TableCell>
                  <TableCell>
                    {order.order_date
                      ? new Date(order.order_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {order.sales_quotation && canViewSalesQuotation ? (
                      <button
                        onClick={() => setViewingQuotation(order.sales_quotation!)}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {order.sales_quotation.code}
                      </button>
                    ) : (
                      <span>{order.sales_quotation?.code ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.sales_rep && canViewEmployee ? (
                      <button
                        onClick={() => {
                          setSelectedSalesRepId(order.sales_rep!.id);
                          setIsSalesRepOpen(true);
                        }}
                        className="text-primary hover:underline cursor-pointer text-left"
                      >
                        {order.sales_rep.name}
                      </button>
                    ) : (
                      <span>{order.sales_rep?.name ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell><OrderStatusBadge status={order.status} className="text-xs font-medium" /></TableCell>
                  <TableCell>{formatCurrency(order.total_amount ?? 0)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(order)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && order.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(order)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && order.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(order.id, "sent")}
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.send")}
                            </DropdownMenuItem>
                          )}
                          {order.status === "sent" && (
                            <>
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() => approveOrder.mutateAsync(order.id).then(() => toast.success(t("statusUpdated"))).catch(() => toast.error(t("common.error")))}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(order.id, "rejected")}
                                  className="cursor-pointer text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {canUpdate && order.status !== "cancelled" && order.status !== "delivered" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                              className="text-destructive cursor-pointer"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.cancel")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && order.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(order.id)}
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
        <OrderForm
          open={isFormOpen}
          onClose={handleFormClose}
          order={editingOrder}
        />
      )}

      {canView && viewingOrder && (
        <OrderDetailModal
          open={!!viewingOrder}
          onClose={() => setViewingOrder(null)}
          order={viewingOrder}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.order")}
          isLoading={deleteOrder.isPending}
        />
      )}

      {viewingQuotation && (
        <QuotationDetailModal
          open={!!viewingQuotation}
          onClose={() => setViewingQuotation(null)}
          quotation={viewingQuotation}
        />
      )}

      <EmployeeDetailModal
        open={isSalesRepOpen}
        onOpenChange={setIsSalesRepOpen}
        employee={selectedSalesRepId ? { id: selectedSalesRepId } as unknown as MdEmployee : null}
      />
    </div>
  );
}
