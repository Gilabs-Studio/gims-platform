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
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { useEmployeeContracts, useDeleteEmployeeContract } from "../hooks/use-employee-contracts";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EmployeeContractForm } from "./employee-contract-form";
import { EmployeeContractDetailModal } from "./employee-contract-detail-modal";
import type { EmployeeContractListItem, ContractStatus, ContractType } from "../types";
import { formatCurrency } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function EmployeeContractList() {
  const t = useTranslations("employeeContract");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ContractType | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEmployeeContracts({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    contract_type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const canCreate = useUserPermission("employee_contract.create");
  const canUpdate = useUserPermission("employee_contract.update");
  const canDelete = useUserPermission("employee_contract.delete");
  const canView = useUserPermission("employee_contract.read");

  const deleteContract = useDeleteEmployeeContract();
  const contracts = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (contract: EmployeeContractListItem) => {
    setEditingId(contract.id);
    setIsFormOpen(true);
  };

  const handleView = (contract: EmployeeContractListItem) => {
    setViewingId(contract.id);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteContract.mutateAsync(deletingId);
        toast.success(t("messages.deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error(t("messages.deleteError"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.ACTIVE")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.EXPIRED")}
          </Badge>
        );
      case "TERMINATED":
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.TERMINATED")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: ContractType) => {
    switch (type) {
      case "PERMANENT":
        return (
          <Badge variant="default">
            <FileText className="h-3 w-3 mr-1" />
            {t(`contractType.${type}`)}
          </Badge>
        );
      case "CONTRACT":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t(`contractType.${type}`)}
          </Badge>
        );
      case "INTERNSHIP":
        return (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            {t(`contractType.${type}`)}
          </Badge>
        );
      case "PROBATION":
        return (
          <Badge variant="info">
            <Clock className="h-3 w-3 mr-1" />
            {t(`contractType.${type}`)}
          </Badge>
        );
      default:
        return <Badge>{type}</Badge>;
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
        <h1 className="text-3xl font-bold tracking-tight">{t("titles.list")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
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
            setStatusFilter(v as ContractStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.byStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.byStatus")}</SelectItem>
            <SelectItem value="ACTIVE">{t("status.ACTIVE")}</SelectItem>
            <SelectItem value="EXPIRED">{t("status.EXPIRED")}</SelectItem>
            <SelectItem value="TERMINATED">{t("status.TERMINATED")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as ContractType | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.byType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.byType")}</SelectItem>
            <SelectItem value="PERMANENT">{t("contractType.PERMANENT")}</SelectItem>
            <SelectItem value="CONTRACT">{t("contractType.CONTRACT")}</SelectItem>
            <SelectItem value="INTERNSHIP">{t("contractType.INTERNSHIP")}</SelectItem>
            <SelectItem value="PROBATION">{t("contractType.PROBATION")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.contractNumber")}</TableHead>
              <TableHead>{t("common.employee")}</TableHead>
              <TableHead>{t("common.jobTitle")}</TableHead>
              <TableHead>{t("common.contractType")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.salary")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("common.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(contract)}
                  >
                    {contract.contract_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{contract.employee_name ?? "-"}</span>
                      <span className="text-xs text-muted-foreground">{contract.employee_code ?? ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>{contract.job_title}</TableCell>
                  <TableCell>{getTypeBadge(contract.contract_type)}</TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell>{formatCurrency(contract.salary)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(contract)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleEdit(contract)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(contract.id)}
                              className="cursor-pointer text-destructive"
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
          pageIndex={page}
          pageSize={pageSize}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {isFormOpen && (
        <EmployeeContractForm
          contractId={editingId}
          onClose={handleFormClose}
        />
      )}

      {viewingId && (
        <EmployeeContractDetailModal
          contractId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={canUpdate ? (id: string) => {
            setViewingId(null);
            setEditingId(id);
            setIsFormOpen(true);
          } : undefined}
        />
      )}

      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open: boolean) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("common.deleteWarning")}
        isLoading={deleteContract.isPending}
      />
    </div>
  );
}
