"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { BusinessTypeForm } from "./business-type-form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBusinessTypes, useDeleteBusinessType, useUpdateBusinessType } from "../../hooks/use-business-types";
import { useDebounce } from "@/hooks/use-debounce";
import { BusinessType } from "../../types";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function BusinessTypeList() {
  const t = useTranslations("organization");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBusinessType, setEditingBusinessType] = useState<BusinessType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useBusinessTypes({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const canCreate = useUserPermission("business_type.create");
  const canUpdate = useUserPermission("business_type.update");
  const canDelete = useUserPermission("business_type.delete");

  const deleteBusinessType = useDeleteBusinessType();
  const updateBusinessType = useUpdateBusinessType();

  const businessTypes = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (businessType: BusinessType) => {
    setEditingBusinessType(businessType);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteBusinessType.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateBusinessType.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("common.success_update", { name: name }));
    } catch (error) {
      toast.error(t("common.error_update"));
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBusinessType(null);
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("businessType.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("businessType.description")}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("common.create")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.description_field")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : businessTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {t("businessType.empty")}
                </TableCell>
              </TableRow>
            ) : (
              businessTypes.map((businessType) => (
                <TableRow key={businessType.id}>
                  <TableCell className="font-medium">{businessType.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {businessType.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={businessType.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            businessType.id,
                            businessType.is_active,
                            businessType.name,
                          )
                        }
                        disabled={updateBusinessType.isPending || !canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {businessType.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(businessType)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeletingId(businessType.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
      <BusinessTypeForm
        open={isFormOpen}
        onClose={handleFormClose}
        businessType={editingBusinessType}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteBusinessType.isPending}
        title={t("businessType.deleteTitle")}
        description={t("businessType.deleteConfirm")}
      />
    </div>
  );
}
