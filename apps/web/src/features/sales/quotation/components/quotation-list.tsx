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
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Send, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useQuotations, useDeleteQuotation, useUpdateQuotationStatus } from "../hooks/use-quotations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { QuotationForm } from "./quotation-form";
import { QuotationDetailModal } from "./quotation-detail-modal";
import type { SalesQuotation, SalesQuotationStatus } from "../types";
import { formatCurrency } from "@/lib/utils";

import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

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

  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesQuotation["sales_rep"] | null>(null);
  const [isSalesRepDialogOpen, setIsSalesRepDialogOpen] = useState(false);

  const deleteQuotation = useDeleteQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const quotations = data?.data ?? [];
  const pagination = data?.meta?.pagination;

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

  const getStatusBadge = (status: SalesQuotationStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="warning">
            <Send className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      case "converted":
        return (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.converted")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
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
              <TableHead>{t("totalAmount")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.length === 0 ? (
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
                      ? new Date(quotation.quotation_date).toLocaleDateString()
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
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell>{formatCurrency(quotation.total_amount ?? 0)}</TableCell>
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
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.send")}
                            </DropdownMenuItem>
                          )}
                          {quotation.status === "sent" && (
                            <>
                              {canApprove && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quotation.id, "approved")}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(quotation.id, "rejected")}
                                  className="cursor-pointer text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              )}
                            </>
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
    </div>
  );
}
