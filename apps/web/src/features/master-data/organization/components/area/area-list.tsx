"use client";

import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Shield,
  Users,
} from "lucide-react";
import { useUserPermission } from "@/hooks/use-user-permission";
import { AreaForm } from "./area-form";
import { AreaDetailModal } from "./area-detail-modal";
import { AssignEmployeeDialog } from "./assign-employee-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useAreas,
  useDeleteArea,
  useUpdateArea,
  useAreaDetail,
  useAssignSupervisors,
  useAssignMembers,
} from "../../hooks/use-areas";
import { useDebounce } from "@/hooks/use-debounce";
import type { Area, ListAreasParams } from "../../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

type SupervisorFilter = "all" | "has" | "none";
type MemberFilter = "all" | "has" | "none";

export function AreaList() {
  const t = useTranslations("organization");

  // Search & pagination state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [supervisorFilter, setSupervisorFilter] =
    useState<SupervisorFilter>("all");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  // Dialog/modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailArea, setDetailArea] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    areaId: string;
    areaName: string;
    role: "supervisor" | "member";
  } | null>(null);

  // Build query params with filters
  const queryParams: ListAreasParams = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    has_supervisor:
      supervisorFilter === "has"
        ? true
        : supervisorFilter === "none"
          ? false
          : undefined,
    has_members:
      memberFilter === "has"
        ? true
        : memberFilter === "none"
          ? false
          : undefined,
  };

  const { data, isLoading, isError } = useAreas(queryParams);

  // Permission checks
  const canCreate = useUserPermission("area.create");
  const canUpdate = useUserPermission("area.update");
  const canDelete = useUserPermission("area.delete");
  const canAssignSupervisor = useUserPermission("area.assign_supervisor");
  const canAssignMember = useUserPermission("area.assign_member");

  const deleteArea = useDeleteArea();
  const updateArea = useUpdateArea();
  const assignSupervisors = useAssignSupervisors();
  const assignMembers = useAssignMembers();

  // Fetch detail for assign dialog (to know existing employees)
  const { data: assignAreaDetail } = useAreaDetail(assignDialog?.areaId ?? "");

  const areas = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = useCallback((area: Area) => {
    setEditingArea(area);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      await deleteArea.mutateAsync(deletingId);
      setDeletingId(null);
    }
  }, [deletingId, deleteArea]);

  const handleStatusChange = useCallback(
    async (id: string, currentStatus: boolean, name: string) => {
      try {
        await updateArea.mutateAsync({
          id,
          data: { is_active: !currentStatus },
        });
        toast.success(t("common.success_update", { name }));
      } catch {
        toast.error(t("common.error_update"));
      }
    },
    [updateArea, t]
  );

  const handleRowClick = useCallback((area: Area) => {
    setDetailArea({ id: area.id, name: area.name });
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditingArea(null);
  }, []);

  const handleAssign = useCallback(
    (employeeIds: string[]) => {
      if (!assignDialog) return;

      const { areaId, role } = assignDialog;
      const mutation =
        role === "supervisor" ? assignSupervisors : assignMembers;

      mutation.mutate(
        { areaId, data: { employee_ids: employeeIds } },
        {
          onSuccess: () => {
            toast.success(t("area.assign.assignSuccess"));
            setAssignDialog(null);
          },
        }
      );
    },
    [assignDialog, assignSupervisors, assignMembers, t]
  );

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
            {t("area.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("area.description")}
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 size-4" />
            {t("common.create")}
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
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

        <Select
          value={supervisorFilter}
          onValueChange={(v: SupervisorFilter) => {
            setSupervisorFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder={t("area.filter.supervisorStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("area.filter.all")} — {t("area.detail.supervisors")}
            </SelectItem>
            <SelectItem value="has" className="cursor-pointer">
              {t("area.filter.hasSupervisor")}
            </SelectItem>
            <SelectItem value="none" className="cursor-pointer">
              {t("area.filter.noSupervisor")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={memberFilter}
          onValueChange={(v: MemberFilter) => {
            setMemberFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <SelectValue placeholder={t("area.filter.memberStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {t("area.filter.all")} — {t("area.detail.members")}
            </SelectItem>
            <SelectItem value="has" className="cursor-pointer">
              {t("area.filter.hasMembers")}
            </SelectItem>
            <SelectItem value="none" className="cursor-pointer">
              {t("area.filter.noMembers")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("common.description_field")}
              </TableHead>
              <TableHead>{t("area.detail.supervisors")}</TableHead>
              <TableHead>{t("area.detail.members")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-20">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("area.empty")}
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => (
                <TableRow
                  key={area.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(area)}
                >
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {area.description || "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <SupervisorCell
                      count={area.supervisor_count ?? 0}
                      t={t}
                      canAssign={canAssignSupervisor}
                      onAssign={() =>
                        setAssignDialog({
                          areaId: area.id,
                          areaName: area.name,
                          role: "supervisor",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <MemberCell
                      count={area.member_count ?? 0}
                      t={t}
                      canAssign={canAssignMember}
                      onAssign={() =>
                        setAssignDialog({
                          areaId: area.id,
                          areaName: area.name,
                          role: "member",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={area.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(
                            area.id,
                            area.is_active,
                            area.name
                          )
                        }
                        disabled={updateArea.isPending || !canUpdate}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground hidden lg:inline">
                        {area.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <DropdownMenuItem
                            onClick={() => handleEdit(area)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 size-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeletingId(area.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
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
      <AreaForm
        open={isFormOpen}
        onClose={handleFormClose}
        area={editingArea}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteArea.isPending}
        title={t("area.deleteTitle")}
        description={t("area.deleteConfirm")}
      />

      {/* Area Detail Modal */}
      {detailArea && (
        <AreaDetailModal
          areaId={detailArea.id}
          areaName={detailArea.name}
          open={!!detailArea}
          onOpenChange={(open) => !open && setDetailArea(null)}
          onAssignSupervisor={() =>
            setAssignDialog({
              areaId: detailArea.id,
              areaName: detailArea.name,
              role: "supervisor",
            })
          }
          onAssignMembers={() =>
            setAssignDialog({
              areaId: detailArea.id,
              areaName: detailArea.name,
              role: "member",
            })
          }
        />
      )}

      {/* Assign Employee Dialog */}
      {assignDialog && (
        <AssignEmployeeDialog
          open={!!assignDialog}
          onOpenChange={(open) => !open && setAssignDialog(null)}
          areaName={assignDialog.areaName}
          role={assignDialog.role}
          existingEmployees={
            assignDialog.role === "supervisor"
              ? (assignAreaDetail?.data?.supervisors ?? [])
              : (assignAreaDetail?.data?.members ?? [])
          }
          onAssign={handleAssign}
          isAssigning={
            assignSupervisors.isPending || assignMembers.isPending
          }
        />
      )}
    </div>
  );
}

// -- Cell sub-components for supervisor/member columns --

function SupervisorCell({
  count,
  t,
  canAssign,
  onAssign,
}: {
  count: number;
  t: ReturnType<typeof useTranslations>;
  canAssign: boolean;
  onAssign: () => void;
}) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="warning">
          <AlertTriangle className="size-3 mr-1" />
          {t("area.detail.noSupervisor")}
        </Badge>
        {canAssign && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs cursor-pointer"
            onClick={onAssign}
          >
            +
          </Button>
        )}
      </div>
    );
  }

  return (
    <Badge variant="info" className="gap-1">
      <Shield className="size-3" />
      {count}
    </Badge>
  );
}

function MemberCell({
  count,
  t,
  canAssign,
  onAssign,
}: {
  count: number;
  t: ReturnType<typeof useTranslations>;
  canAssign: boolean;
  onAssign: () => void;
}) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="warning">
          <AlertTriangle className="size-3 mr-1" />
          {t("area.detail.noMembers")}
        </Badge>
        {canAssign && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs cursor-pointer"
            onClick={onAssign}
          >
            +
          </Button>
        )}
      </div>
    );
  }

  return (
    <Badge variant="info" className="gap-1">
      <Users className="size-3" />
      {count}
    </Badge>
  );
}
