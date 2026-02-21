"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Send, CheckCircle2, XCircle, FileText, BarChart3 } from "lucide-react";
import { useEstimations, useDeleteEstimation, useUpdateEstimationStatus } from "../hooks/use-estimations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EstimationForm } from "./estimation-form";
import { EstimationDetailModal } from "./estimation-detail-modal";
import { ConvertToQuotationDialog } from "./convert-to-quotation-dialog";
import { EmployeeDetailModal } from "@/features/master-data/employee/components/employee-detail-modal";
import type { Employee as MdEmployee } from "@/features/master-data/employee/types";
import type { SalesEstimation, SalesEstimationStatus } from "../types";
import { formatCurrency } from "@/lib/utils";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function EstimationList() {
  const t = useTranslations("estimation");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<SalesEstimationStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEstimation, setEditingEstimation] = useState<SalesEstimation | null>(null);
  const [viewingEstimation, setViewingEstimation] = useState<SalesEstimation | null>(null);
  const [convertingEstimation, setConvertingEstimation] = useState<SalesEstimation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEstimations({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("sales_estimation.create");
  const canUpdate = useUserPermission("sales_estimation.update");
  const canDelete = useUserPermission("sales_estimation.delete");
  const canView = useUserPermission("sales_estimation.read");
  const canApprove = useUserPermission("sales_estimation.approve");
  const canViewEmployee = useUserPermission("employee.read");

  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [isSalesRepOpen, setIsSalesRepOpen] = useState(false);

  const deleteEstimation = useDeleteEstimation();
  const updateStatus = useUpdateEstimationStatus();
  const estimations = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (estimation: SalesEstimation) => {
    setEditingEstimation(estimation);
    setIsFormOpen(true);
  };

  const handleView = (estimation: SalesEstimation) => {
    setViewingEstimation(estimation);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteEstimation.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEstimation(null);
  };

  const handleStatusChange = async (
    id: string,
    status: SalesEstimationStatus,
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

  const getStatusBadge = (status: SalesEstimationStatus) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="info">
            <Send className="h-3 w-3 mr-1" />
            {t("status.submitted")}
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
            <BarChart3 className="h-3 w-3 mr-1" />
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
            setStatusFilter(v as SalesEstimationStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.filterBy")} {t("common.status")}</SelectItem>
            <SelectItem value="draft">{t("status.draft")}</SelectItem>
            <SelectItem value="submitted">{t("status.submitted")}</SelectItem>
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
              <TableHead>{t("estimationDate")}</TableHead>
              <TableHead>{t("customerName")}</TableHead>
              <TableHead>{t("salesRep")}</TableHead>
              <TableHead>{t("probability")}</TableHead>
              <TableHead>{t("totalAmount")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {isLoading ? t("common.loading") : t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              estimations.map((estimation) => (
                <TableRow key={estimation.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(estimation)}>
                    {estimation.code}
                  </TableCell>
                  <TableCell>
                    {estimation.estimation_date
                      ? new Date(estimation.estimation_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>{estimation.customer_name ?? "-"}</TableCell>
                  <TableCell>
                    {estimation.sales_rep && canViewEmployee ? (
                      <button
                        onClick={() => {
                          setSelectedSalesRepId(estimation.sales_rep!.id);
                          setIsSalesRepOpen(true);
                        }}
                        className="text-primary hover:underline cursor-pointer text-left"
                      >
                        {estimation.sales_rep.name}
                      </button>
                    ) : (
                      <span>{estimation.sales_rep?.name ?? "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>{getProbabilityBadge(estimation.probability ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(estimation.total_amount ?? 0)}</TableCell>
                  <TableCell>{getStatusBadge(estimation.status)}</TableCell>
                  <TableCell>
                    {(canUpdate || canDelete || canView || canApprove) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem onClick={() => handleView(estimation)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && estimation.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(estimation)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && estimation.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(estimation.id, "submitted")}
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}
                          {canApprove && estimation.status === "submitted" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(estimation.id, "approved")}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.approve")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(estimation.id, "rejected")}
                                className="cursor-pointer text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.reject")}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canUpdate && estimation.status === "approved" && (
                            <DropdownMenuItem
                              onClick={() => setConvertingEstimation(estimation)}
                              className="cursor-pointer"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              {t("actions.convert")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && estimation.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(estimation.id)}
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
        <EstimationForm
          open={isFormOpen}
          onClose={handleFormClose}
          estimation={editingEstimation}
        />
      )}

      {canView && viewingEstimation && (
        <EstimationDetailModal
          open={!!viewingEstimation}
          onClose={() => setViewingEstimation(null)}
          estimation={viewingEstimation}
        />
      )}

      {canUpdate && convertingEstimation && (
        <ConvertToQuotationDialog
          open={!!convertingEstimation}
          onClose={() => setConvertingEstimation(null)}
          estimation={convertingEstimation}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.estimation")}
          isLoading={deleteEstimation.isPending}
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
