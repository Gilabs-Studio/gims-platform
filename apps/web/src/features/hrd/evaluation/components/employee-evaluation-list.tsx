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
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
  FileText,
  ClipboardCheck,
  Star,
} from "lucide-react";
import {
  useEmployeeEvaluations,
  useDeleteEmployeeEvaluation,
  useUpdateEmployeeEvaluationStatus,
} from "../hooks/use-evaluations";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { EmployeeEvaluationForm } from "./employee-evaluation-form";
import { EmployeeEvaluationDetailModal } from "./employee-evaluation-detail-modal";
import type { EmployeeEvaluation, EmployeeEvaluationStatus } from "../types";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

export function EmployeeEvaluationList() {
  const t = useTranslations("evaluation");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<EmployeeEvaluationStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<EmployeeEvaluation | null>(null);
  const [viewingEvaluation, setViewingEvaluation] = useState<EmployeeEvaluation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useEmployeeEvaluations({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const canCreate = useUserPermission("evaluation.create");
  const canUpdate = useUserPermission("evaluation.update");
  const canDelete = useUserPermission("evaluation.delete");
  const canView = useUserPermission("evaluation.read");

  const deleteEvaluation = useDeleteEmployeeEvaluation();
  const updateStatus = useUpdateEmployeeEvaluationStatus();
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

  const handleStatusChange = async (id: string, status: EmployeeEvaluationStatus) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      toast.success(t("evaluation.statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: EmployeeEvaluationStatus) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            {t("status.draft")}
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge variant="info">
            <Send className="h-3 w-3 mr-1" />
            {t("status.submitted")}
          </Badge>
        );
      case "REVIEWED":
        return (
          <Badge variant="warning">
            <ClipboardCheck className="h-3 w-3 mr-1" />
            {t("status.reviewed")}
          </Badge>
        );
      case "FINALIZED":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.finalized")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
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
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as EmployeeEvaluationStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("common.filterBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="DRAFT">{t("status.draft")}</SelectItem>
            <SelectItem value="SUBMITTED">{t("status.submitted")}</SelectItem>
            <SelectItem value="REVIEWED">{t("status.reviewed")}</SelectItem>
            <SelectItem value="FINALIZED">{t("status.finalized")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
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
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <div className="h-8 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : evaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("evaluation.notFound")}
                </TableCell>
              </TableRow>
            ) : (
              evaluations.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => canView && handleView(evaluation)}
                  >
                    {evaluation.employee?.name ?? "-"}
                  </TableCell>
                  <TableCell>{evaluation.evaluation_group?.name ?? "-"}</TableCell>
                  <TableCell>{getTypeBadge(evaluation.evaluation_type)}</TableCell>
                  <TableCell className="text-sm">
                    {evaluation.period_start
                      ? new Date(evaluation.period_start).toLocaleDateString()
                      : "-"}
                    {" - "}
                    {evaluation.period_end
                      ? new Date(evaluation.period_end).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="font-medium">{formatScore(evaluation.overall_score)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(evaluation)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && evaluation.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => handleEdit(evaluation)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && evaluation.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(evaluation.id, "SUBMITTED")}
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && evaluation.status === "SUBMITTED" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(evaluation.id, "REVIEWED")}
                              className="cursor-pointer"
                            >
                              <ClipboardCheck className="h-4 w-4 mr-2" />
                              {t("actions.review")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && evaluation.status === "REVIEWED" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(evaluation.id, "FINALIZED")}
                              className="cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.finalize")}
                            </DropdownMenuItem>
                          )}
                          {canDelete && evaluation.status === "DRAFT" && (
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
