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
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Star,
} from "lucide-react";
import {
  useEmployeeEvaluations,
  useDeleteEmployeeEvaluation,
} from "../hooks/use-evaluations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EmployeeEvaluationForm } from "./employee-evaluation-form";
import { EmployeeEvaluationDetailModal } from "./employee-evaluation-detail-modal";
import type { EmployeeEvaluation } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { formatDate } from "@/lib/utils";

export function EmployeeEvaluationList() {
  const t = useTranslations("evaluation");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] =
    useState<EmployeeEvaluation | null>(null);
  const [viewingEvaluation, setViewingEvaluation] =
    useState<EmployeeEvaluation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEmployeeEvaluations({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
  });

  const canCreate = useUserPermission("evaluation.create");
  const canUpdate = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");
  const canView = useUserPermission("evaluation.read");

  const deleteEvaluation = useDeleteEmployeeEvaluation();
  const evaluations = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (evaluation: EmployeeEvaluation) => {
    setEditingEvaluation(evaluation);
    setIsFormOpen(true);
  };

  const handleView = (evaluation: EmployeeEvaluation) => {
    setViewingEvaluation(evaluation);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteEvaluation.mutateAsync(deletingId);
        toast.success(t("evaluation.deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEvaluation(null);
  };

  const getTypeBadge = (type: string) => {
    return type === "SELF" ? (
      <Badge variant="outline">{t("evaluationType.self")}</Badge>
    ) : (
      <Badge variant="outline">{t("evaluationType.manager")}</Badge>
    );
  };

  const formatScore = (score: number) => {
    return score > 0 ? score.toFixed(1) : "-";
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
            placeholder={t("evaluation.search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        {canCreate && (
          <Button
            onClick={() => setIsFormOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("evaluation.add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("evaluation.employee")}</TableHead>
              <TableHead>{t("evaluation.evaluationGroup")}</TableHead>
              <TableHead>{t("evaluation.type")}</TableHead>
              <TableHead>{t("evaluation.period")}</TableHead>
              <TableHead>{t("evaluation.score")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-8 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : evaluations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("evaluation.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              evaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell>
                    {canView ? (
                      <button
                        type="button"
                        className="flex cursor-pointer items-center gap-3 text-left text-primary hover:underline"
                        onClick={() => handleView(evaluation)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            dataSeed={
                              evaluation.employee?.employee_code ??
                              evaluation.employee?.name ??
                              "employee"
                            }
                          >
                            {evaluation.employee?.name ?? "-"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {evaluation.employee?.name ?? "-"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {evaluation.employee?.employee_code ?? "-"}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            dataSeed={
                              evaluation.employee?.employee_code ??
                              evaluation.employee?.name ??
                              "employee"
                            }
                          >
                            {evaluation.employee?.name ?? "-"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {evaluation.employee?.name ?? "-"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {evaluation.employee?.employee_code ?? "-"}
                          </p>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {evaluation.evaluation_group?.name ?? "-"}
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(evaluation.evaluation_type)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {evaluation.period_start
                      ? formatDate(evaluation.period_start)
                      : "-"}
                    {" - "}
                    {evaluation.period_end
                      ? formatDate(evaluation.period_end)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning" />
                      <span className="font-medium">
                        {formatScore(evaluation.overall_score)}
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
                              onClick={() => handleView(evaluation)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(evaluation)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(evaluation.id)}
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
        <EmployeeEvaluationForm
          open={isFormOpen}
          onClose={handleFormClose}
          evaluation={editingEvaluation}
        />
      )}

      {canView && viewingEvaluation && (
        <EmployeeEvaluationDetailModal
          open={!!viewingEvaluation}
          onClose={() => setViewingEvaluation(null)}
          evaluation={viewingEvaluation}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("evaluation.delete")}
          description={t("evaluation.deleteDesc")}
          itemName={t("evaluation.label")}
          isLoading={deleteEvaluation.isPending}
        />
      )}
    </div>
  );
}
