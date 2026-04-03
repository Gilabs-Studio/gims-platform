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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import {
  useEvaluationGroups,
  useDeleteEvaluationGroup,
  useUpdateEvaluationGroup,
} from "../hooks/use-evaluations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EvaluationGroupForm } from "./evaluation-group-form";
import { EvaluationGroupDetailModal } from "./evaluation-group-detail-modal";
import type { EvaluationGroup } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function EvaluationGroupList() {
  const t = useTranslations("evaluation");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EvaluationGroup | null>(
    null,
  );
  const [viewingGroup, setViewingGroup] = useState<EvaluationGroup | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEvaluationGroups({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    is_active: activeFilter !== "all" ? activeFilter === "true" : undefined,
  });

  const canCreate = useUserPermission("evaluation.create");
  const canUpdate = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");
  const canView = useUserPermission("evaluation.read");

  const deleteGroup = useDeleteEvaluationGroup();
  const updateGroup = useUpdateEvaluationGroup();
  const groups = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (group: EvaluationGroup) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const handleView = (group: EvaluationGroup) => {
    setViewingGroup(group);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteGroup.mutateAsync(deletingId);
        toast.success(t("group.deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingGroup(null);
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    try {
      await updateGroup.mutateAsync({
        id,
        data: { is_active: !currentStatus },
      });
      toast.success(t("group.updated"));
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("group.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as "all" | "true" | "false");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="true">{t("common.active")}</SelectItem>
            <SelectItem value="false">{t("common.inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("group.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("group.name")}</TableHead>
              <TableHead>{t("group.description")}</TableHead>
              <TableHead>{t("group.totalWeight")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-8 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("group.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(group)}
                  >
                    {group.name}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {group.description ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        group.total_weight === 100 ? "success" : "secondary"
                      }
                    >
                      {group.total_weight}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={group.is_active}
                        onCheckedChange={() =>
                          handleStatusChange(group.id, group.is_active)
                        }
                        disabled={!canUpdate || updateGroup.isPending}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {group.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(canUpdate || canDelete || canView) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canView && (
                            <DropdownMenuItem
                              onClick={() => handleView(group)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(group)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(group.id)}
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
        <EvaluationGroupForm
          open={isFormOpen}
          onClose={handleFormClose}
          group={editingGroup}
        />
      )}

      {canView && viewingGroup && (
        <EvaluationGroupDetailModal
          open={!!viewingGroup}
          onClose={() => setViewingGroup(null)}
          group={viewingGroup}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("group.delete")}
          description={t("group.deleteDesc")}
          itemName={t("group.label")}
          isLoading={deleteGroup.isPending}
        />
      )}
    </div>
  );
}
