"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Send, CheckCircle2, XCircle, FileText, Printer } from "lucide-react";
import { useQuotations, useDeleteQuotation, useUpdateQuotationStatus } from "../hooks/use-quotations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { usePermissionScope } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { QuotationForm } from "./quotation-form";
import { QuotationDetailModal } from "./quotation-detail-modal";
import type { SalesQuotation, SalesQuotationStatus } from "../types";
import { QuotationPrintDialog } from "./quotation-print-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import { useConvertQuotationToOrder } from "@/features/sales/order/hooks/use-orders";
import type { SalesOrder } from "@/features/sales/order/types";

export function QuotationList() {
  const t = useTranslations("quotation");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<SalesQuotationStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<SalesQuotation | null>(null);
  const [viewingQuotation, setViewingQuotation] = useState<SalesQuotation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printingQuotationId, setPrintingQuotationId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuotations({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("sales_quotation.create");
  const canUpdate = useUserPermission("sales_quotation.update");
  const canDelete = useUserPermission("sales_quotation.delete");
  const canView = useUserPermission("sales_quotation.read");
  const canViewEmployee = useUserPermission("employee.read");
  const canApprove = useUserPermission("sales_quotation.approve");
  const canPrint = useUserPermission("sales_quotation.print");

  // Permission + scope for viewing linked Sales Orders from the Converted badge
  const hasSalesOrderRead = useUserPermission("sales_order.read");
  const salesOrderScope = usePermissionScope("sales_order.read");
  const { user } = useAuthStore();

  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesQuotation["sales_rep"] | null>(null);
  const [isSalesRepDialogOpen, setIsSalesRepDialogOpen] = useState(false);

  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const convertToOrder = useConvertQuotationToOrder();
  const quotations = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const canCreateOrder = useUserPermission("sales_order.create");

  const handleEdit = (quotation: SalesQuotation) => {
    setEditingQuotation(quotation);
    setIsFormOpen(true);
  };

  const handleView = (quotation: SalesQuotation) => {
    setViewingQuotation(quotation);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteQuotation.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingQuotation(null);
  };

  const handleStatusChange = async (
    id: string,
    status: SalesQuotationStatus,
    rejectionReason?: string,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status, rejection_reason: rejectionReason },
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  /**
   * Determines whether the current user can navigate to the linked Sales Order
   * from the "Converted" badge, based on their sales_order.read permission scope.
   * - ALL: always clickable
   * - OWN: only if the quotation was created by the current user
   * - DIVISION / AREA: show hover (server enforces scope filtering on the SO detail fetch)
   */
  const canViewLinkedSalesOrder = (quotation: SalesQuotation): boolean => {
    if (!hasSalesOrderRead || !quotation.converted_to_sales_order_id) return false;
    if (salesOrderScope === "ALL") return true;
    if (salesOrderScope === "OWN") {
      return quotation.created_by === user?.id;
    }
    // DIVISION and AREA: optimistically allow hover — backend enforces access on fetch
    if (salesOrderScope === "DIVISION" || salesOrderScope === "AREA") return true;
    return false;
  };

  const getStatusBadge = (quotation: SalesQuotation) => {
    switch (quotation.status) {
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
      case "converted": {
        const isClickable = canViewLinkedSalesOrder(quotation);
        return (
          <Badge
            variant="outline"
            onClick={
              isClickable
                ? () => setSelectedOrderId(quotation.converted_to_sales_order_id!)
                : undefined
            }
            className={
              (isClickable
                ? "cursor-pointer hover:border-primary hover:text-primary transition-colors "
                : "") + "text-xs font-medium"
            }
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.converted")}
          </Badge>
        );
      }
      default:
        return <Badge>{quotation.status}</Badge>;
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
            setStatusFilter(v as SalesQuotationStatus | "all");
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
            <SelectItem value="converted">{t("status.converted")}</SelectItem>
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
              <TableHead>{t("quotationDate")}</TableHead>
              <TableHead>{t("salesRep")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("totalAmount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : quotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              quotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(quotation)}>
                    {quotation.code}
                  </TableCell>
                  <TableCell>
                    {quotation.quotation_date
                      ? formatDate(quotation.quotation_date)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {quotation.sales_rep && canViewEmployee ? (
                      <button
                        onClick={() => {
                          setSelectedSalesRep(quotation.sales_rep);
                          setIsSalesRepDialogOpen(true);
                        }}
                        className="text-primary hover:underline cursor-pointer text-left"
                      >
                        {quotation.sales_rep.name}
                      </button>
                    ) : (
                      <span>{quotation.sales_rep?.name ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(quotation)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(quotation.total_amount ?? 0)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(quotation)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && quotation.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(quotation)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && quotation.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(quotation.id, "sent")}
                              className="cursor-pointer text-primary focus:text-primary"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}
                          {quotation.status === "sent" && (
                            <>
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quotation.id, "approved")}
                                  className="cursor-pointer text-success focus:text-success"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quotation.id, "rejected")}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {quotation.status === "approved" && canCreateOrder && (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const res = await convertToOrder.mutateAsync({
                                    quotation_id: quotation.id,
                                  });
                                  toast.success(t("status.converted"));
                                  // open the created Sales Order detail modal
                                  setSelectedOrderId(res.data.id);
                                } catch (err: unknown) {
                                  console.error("Failed to convert quotation:", err);
                                  if (isAxiosError(err)) {
                                    const status = err.response?.status;
                                    if (status === 404) {
                                      toast.error(
                                        t("common.error") + " - Convert endpoint not found (404)."
                                      );
                                    } else if (status === 403) {
                                      toast.error(t("common.forbidden") ?? t("common.error"));
                                    } else {
                                      toast.error(t("common.error"));
                                    }
                                  } else {
                                    toast.error(t("common.error"));
                                  }
                                }
                              }}
                              className="cursor-pointer text-primary focus:text-primary"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("convertToOrder")}
                            </DropdownMenuItem>
                          )}
                          {canPrint && (
                            <DropdownMenuItem
                              onClick={() => setPrintingQuotationId(quotation.id)}
                              className="cursor-pointer text-purple focus:text-purple"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              {t("print")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && quotation.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(quotation.id)}
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
        <QuotationForm
          open={isFormOpen}
          onClose={handleFormClose}
          quotation={editingQuotation}
        />
      )}

      {canView && viewingQuotation && (
        <QuotationDetailModal
          open={!!viewingQuotation}
          onClose={() => setViewingQuotation(null)}
          quotation={viewingQuotation}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.quotation")}
          isLoading={deleteQuotation.isPending}
        />
      )}

      <EmployeeDetailModal
        open={isSalesRepDialogOpen}
        onOpenChange={setIsSalesRepDialogOpen}
        employee={selectedSalesRep as unknown as MdEmployee}
      />

      {/* Sales Order detail modal — opened when user clicks a "Converted" badge */}
      <OrderDetailModal
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        order={selectedOrderId ? ({ id: selectedOrderId } as SalesOrder) : null}
      />

      {printingQuotationId && (
        <QuotationPrintDialog
          open={!!printingQuotationId}
          onClose={() => setPrintingQuotationId(null)}
          quotationId={printingQuotationId}
        />
      )}
    </div>
  );
}
