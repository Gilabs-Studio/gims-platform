"use client";

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
  Eye,
} from "lucide-react";
import { AreaForm } from "./area-form";
import { AreaDetailModal } from "./area-detail-modal";
import { AssignEmployeeDialog } from "./assign-employee-dialog";
import { Switch } from "@/components/ui/switch";
import { useAreaList } from "../../hooks/use-area-list";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function AreaList() {
  const { state, actions, data, permissions, translations } = useAreaList();
  const { t } = translations;

  if (data.isError) {
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
        {permissions.canCreate && (
          <Button
            onClick={() => actions.setIsFormOpen(true)}
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
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>

        <Select
          value={state.supervisorFilter}
          onValueChange={(v: "all"|"has"|"none") => {
            actions.setSupervisorFilter(v);
            actions.setPage(1);
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
          value={state.memberFilter}
          onValueChange={(v: "all"|"has"|"none") => {
            actions.setMemberFilter(v);
            actions.setPage(1);
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
            {data.isLoading ? (
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
            ) : data.areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("area.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.areas.map((area) => (
                <TableRow
                  key={area.id}
                  className={permissions.canView ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => actions.handleRowClick(area)}
                >
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {area.description || "-"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <SupervisorCell
                      count={area.supervisor_count ?? 0}
                      names={area.supervisor_names ?? []}
                      t={t}
                      canAssign={permissions.canCreate && permissions.canAssignSupervisor}
                      onAssign={() =>
                        actions.setAssignDialog({
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
                      canAssign={permissions.canCreate && permissions.canAssignMember}
                      onAssign={() =>
                        actions.setAssignDialog({
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
                          actions.handleStatusChange(
                            area.id,
                            area.is_active,
                            area.name
                          )
                        }
                        disabled={data.isUpdating || !permissions.canUpdate}
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
                        {permissions.canView && (
                          <DropdownMenuItem
                            onClick={() => actions.handleRowClick(area)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 size-4" />
                            {t("common.view")}
                          </DropdownMenuItem>
                        )}
                        {permissions.canUpdate && (
                          <DropdownMenuItem
                            onClick={() => actions.handleEdit(area)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 size-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        )}
                        {permissions.canDelete && (
                          <DropdownMenuItem
                            onClick={() => actions.setDeletingId(area.id)}
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
      {data.pagination && (
        <DataTablePagination
          pageIndex={data.pagination.page}
          pageSize={data.pagination.per_page}
          rowCount={data.pagination.total}
          onPageChange={actions.setPage}
          onPageSizeChange={(newSize) => {
            actions.setPageSize(newSize);
            actions.setPage(1);
          }}
        />
      )}

      {/* Form Dialog */}
      <AreaForm
        open={state.isFormOpen}
        onClose={actions.handleFormClose}
        area={state.editingArea}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!state.deletingId}
        onOpenChange={(open) => !open && actions.setDeletingId(null)}
        onConfirm={actions.handleDelete}
        isLoading={data.isDeleting}
        title={t("area.deleteTitle")}
        description={t("area.deleteConfirm")}
      />

      {/* Area Detail Modal */}
      {state.detailArea && (
        <AreaDetailModal
          areaId={state.detailArea.id}
          areaName={state.detailArea.name}
          open={!!state.detailArea}
          onOpenChange={(open) => !open && actions.setDetailArea(null)}
          onAssignSupervisor={() =>
            actions.setAssignDialog({
              areaId: state.detailArea!.id,
              areaName: state.detailArea!.name,
              role: "supervisor",
            })
          }
          onAssignMembers={() =>
            actions.setAssignDialog({
              areaId: state.detailArea!.id,
              areaName: state.detailArea!.name,
              role: "member",
            })
          }
        />
      )}

      {/* Assign Employee Dialog */}
      {state.assignDialog && (
        <AssignEmployeeDialog
          open={!!state.assignDialog}
          onOpenChange={(open) => !open && actions.setAssignDialog(null)}
          areaName={state.assignDialog.areaName}
          role={state.assignDialog.role}
          existingEmployees={
            state.assignDialog.role === "supervisor"
              ? (data.assignAreaDetail?.data?.supervisors ?? [])
              : (data.assignAreaDetail?.data?.members ?? [])
          }
          onAssign={actions.handleAssign}
          isAssigning={data.isAssigning}
        />
      )}
    </div>
  );
}

// -- Cell sub-components for supervisor/member columns --

function SupervisorCell({
  count,
  names,
  t,
  canAssign,
  onAssign,
}: {
  count: number;
  names: string[];
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
            className="h-6 w-6 p-0 cursor-pointer"
            onClick={onAssign}
            aria-label={t("common.create")}
            title={t("common.create")}
          >
            <Plus className="size-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="info" className="gap-1">
        <Shield className="size-3" />
        {names.join(", ")}
      </Badge>
      {canAssign && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 cursor-pointer"
          onClick={onAssign}
          aria-label={t("common.create")}
          title={t("common.create")}
        >
          <Plus className="size-3" />
        </Button>
      )}
    </div>
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
            className="h-6 w-6 p-0 cursor-pointer"
            onClick={onAssign}
            aria-label={t("common.create")}
            title={t("common.create")}
          >
            <Plus className="size-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="info" className="gap-1">
        <Users className="size-3" />
        {count}
      </Badge>
      {canAssign && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 cursor-pointer"
          onClick={onAssign}
          aria-label={t("common.create")}
          title={t("common.create")}
        >
          <Plus className="size-3" />
        </Button>
      )}
    </div>
  );
}
