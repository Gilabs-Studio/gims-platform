"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Plus,
  Search,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/use-debounce";

import {
  useCreateEmployeeAsset,
  useDeleteEmployeeAsset,
  useEmployeeAssetFormData,
  useEmployeeAssets,
  useReturnAsset,
  useUpdateEmployeeAsset,
} from "@/features/hrd/employee-assets/hooks/use-employee-assets";
import { EmployeeAssetForm } from "./employee-asset-form";
import { ReturnAssetModal } from "./return-asset-modal";
import { EmployeeAssetDetailModal } from "./employee-asset-detail-modal";
import type {
  AssetStatus,
  AssetCondition,
  CreateEmployeeAssetRequest,
  EmployeeAsset,
  EmployeeAssetFilters,
  ReturnAssetRequest,
  UpdateEmployeeAssetRequest,
} from "../types";
import type { EmployeeAssetFormValues } from "../schemas/employee-asset.schema";

export function EmployeeAssetList() {
  const t = useTranslations("employeeAssets");

  // State
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const debouncedSearch = useDebounce(search, 500);

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<EmployeeAsset | null>(null);

  // Filters
  const filters: EmployeeAssetFilters = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    employee_id: employeeFilter === "ALL" ? undefined : employeeFilter,
    status: statusFilter === "ALL" ? undefined : (statusFilter as AssetStatus),
  };

  // Queries
  const { data, isLoading, error } = useEmployeeAssets(filters);
  const { data: formData } = useEmployeeAssetFormData();
  const employees = formData?.data?.employees ?? [];
  const pagination = data?.meta?.pagination;

  // Mutations
  const createMutation = useCreateEmployeeAsset();
  const updateMutation = useUpdateEmployeeAsset();
  const returnMutation = useReturnAsset();
  const deleteMutation = useDeleteEmployeeAsset();

  // Handlers
  const handleCreate = () => {
    setSelectedAsset(null);
    setFormOpen(true);
  };

  const handleEdit = (asset: EmployeeAsset) => {
    if (asset.status === "RETURNED") return;
    setSelectedAsset(asset);
    setFormOpen(true);
  };

  const handleReturn = (asset: EmployeeAsset) => {
    setSelectedAsset(asset);
    setReturnOpen(true);
  };

  const handleDelete = (asset: EmployeeAsset) => {
    setSelectedAsset(asset);
    setDeleteOpen(true);
  };

  const handleViewDetail = (asset: EmployeeAsset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  const handleFormSubmit = async (data: EmployeeAssetFormValues) => {
    if (selectedAsset) {
      // Update
      const updateData: UpdateEmployeeAssetRequest = {
        asset_name: data.asset_name,
        asset_code: data.asset_code,
        asset_category: data.asset_category,
        borrow_date: data.borrow_date,
        borrow_condition: data.borrow_condition,
        notes: data.notes,
      };
      await updateMutation.mutateAsync(
        { id: selectedAsset.id, data: updateData },
        {
          onSuccess: () => {
            setFormOpen(false);
            setSelectedAsset(null);
          },
        }
      );
    } else {
      // Create
      const createData: CreateEmployeeAssetRequest = {
        employee_id: data.employee_id,
        asset_name: data.asset_name,
        asset_code: data.asset_code,
        asset_category: data.asset_category,
        borrow_date: data.borrow_date,
        borrow_condition: data.borrow_condition,
        notes: data.notes,
      };
      await createMutation.mutateAsync(createData, {
        onSuccess: () => {
          setFormOpen(false);
        },
      });
    }
  };

  const handleReturnSubmit = async (data: ReturnAssetRequest) => {
    if (!selectedAsset) return;
    await returnMutation.mutateAsync(
      { id: selectedAsset.id, data },
      {
        onSuccess: () => {
          setReturnOpen(false);
          setSelectedAsset(null);
        },
      }
    );
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAsset) return;
    await deleteMutation.mutateAsync(selectedAsset.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedAsset(null);
      },
    });
  };

  // Badge variants
  const getStatusBadge = (status: AssetStatus) => {
    const variants: Record<AssetStatus, "warning" | "info"> = {
      BORROWED: "warning",
      RETURNED: "info",
    };
    return (
      <Badge variant={variants[status]}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const getConditionBadge = (condition: AssetCondition) => {
    const variants: Record<AssetCondition, "info" | "secondary" | "destructive"> = {
      NEW: "info",
      GOOD: "info",
      FAIR: "secondary",
      POOR: "secondary",
      DAMAGED: "destructive",
    };
    return (
      <Badge variant={variants[condition]}>
        {t(`condition.${condition}`)}
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error?.message || "Failed to load assets"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleCreate} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("addAsset")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("filterByEmployee")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allEmployees")}</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.employee_code} - {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as AssetStatus | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
            <SelectItem value="BORROWED">{t("status.BORROWED")}</SelectItem>
            <SelectItem value="RETURNED">{t("status.RETURNED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border border-dashed">
          <p className="text-sm text-muted-foreground">{t("empty.description") || "No assets found"}</p>
          <Button variant="link" onClick={handleCreate} className="mt-2 text-primary">
            {t("addAsset")}
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.assetCode")}</TableHead>
                <TableHead>{t("columns.assetName")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead>{t("columns.borrowDate")}</TableHead>
                <TableHead>{t("columns.daysBorrowed")}</TableHead>
                <TableHead>{t("columns.borrowCondition")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.asset_code}</TableCell>
                  <TableCell>{asset.asset_name}</TableCell>
                  <TableCell>{asset.asset_category}</TableCell>
                  <TableCell>
                    {asset.employee ? (
                      <div>
                        <div className="font-medium">{asset.employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {asset.employee.employee_code}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(asset.borrow_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {t("detail.daysTotal", { days: asset.days_borrowed })}
                    </span>
                  </TableCell>
                  <TableCell>{getConditionBadge(asset.borrow_condition)}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("columns.actions")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleViewDetail(asset)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("viewDetail")}
                        </DropdownMenuItem>
                        {asset.status === "BORROWED" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEdit(asset)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("editAsset")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleReturn(asset)}
                              className="cursor-pointer"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              {t("returnAsset")}
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(asset)}
                          className="cursor-pointer text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAsset ? t("editAsset") : t("addAsset")}
            </DialogTitle>
            <DialogDescription>
              {selectedAsset
                ? "Update asset information"
                : "Record a new asset borrow"}
            </DialogDescription>
          </DialogHeader>
          <EmployeeAssetForm
            asset={selectedAsset}
            employees={employees}
            onSubmit={handleFormSubmit}
            onCancel={() => setFormOpen(false)}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <ReturnAssetModal
        asset={selectedAsset}
        open={returnOpen}
        onOpenChange={setReturnOpen}
        onConfirm={handleReturnSubmit}
        isSubmitting={returnMutation.isPending}
      />

      {/* Detail Modal */}
      <EmployeeAssetDetailModal
        asset={selectedAsset}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title={t("delete")}
        description={t("messages.confirmDelete")}
        itemName={selectedAsset?.asset_name}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
