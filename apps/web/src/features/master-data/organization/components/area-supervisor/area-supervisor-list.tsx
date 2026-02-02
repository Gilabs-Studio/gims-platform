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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, MapPin } from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { AreaSupervisorForm } from "./area-supervisor-form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAreaSupervisors, useDeleteAreaSupervisor, useUpdateAreaSupervisor } from "../../hooks/use-area-supervisors";
import { useDebounce } from "@/hooks/use-debounce";
import { AreaSupervisor } from "../../types";

import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function AreaSupervisorList() {
  const t = useTranslations("organization");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<AreaSupervisor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAreaSupervisors({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const canCreate = useUserPermission("area_supervisor.create");
  const canUpdate = useUserPermission("area_supervisor.update");
  const canDelete = useUserPermission("area_supervisor.delete");

  const deleteSupervisor = useDeleteAreaSupervisor();
  const updateSupervisor = useUpdateAreaSupervisor();

  const supervisors = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (supervisor: AreaSupervisor) => {
    setEditingSupervisor(supervisor);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteSupervisor.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: boolean,
    name: string,
  ) => {
    try {
      await updateSupervisor.mutateAsync({
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
    setEditingSupervisor(null);
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
            {t("areaSupervisor.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("areaSupervisor.description")}
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>{t("areaSupervisor.assignedAreas")}</TableHead>
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
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : supervisors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("areaSupervisor.empty")}
                </TableCell>
              </TableRow>
            ) : (
              supervisors.map((supervisor) => {
                const areaCount = supervisor.areas?.length ?? 0;
                return (
                  <TableRow key={supervisor.id}>
                    <TableCell className="font-medium">{supervisor.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {supervisor.email || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supervisor.phone || "-"}
                    </TableCell>
                    <TableCell>
                      {areaCount > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {areaCount} {areaCount === 1 ? "area" : "areas"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t("areaSupervisor.noAreas")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={supervisor.is_active}
                          onCheckedChange={() =>
                            handleStatusChange(
                              supervisor.id,
                              supervisor.is_active,
                              supervisor.name,
                            )
                          }
                          disabled={updateSupervisor.isPending || !canUpdate}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">
                          {supervisor.is_active
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
                              onClick={() => handleEdit(supervisor)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(supervisor.id)}
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
                );
              })
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
      <AreaSupervisorForm
        open={isFormOpen}
        onClose={handleFormClose}
        supervisor={editingSupervisor}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteSupervisor.isPending}
        title={t("areaSupervisor.deleteTitle")}
        description={t("areaSupervisor.deleteConfirm")}
      />
    </div>
  );
}
