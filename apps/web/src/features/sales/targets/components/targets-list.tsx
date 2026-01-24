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
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, Send, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useYearlyTargets, useDeleteYearlyTarget, useUpdateTargetStatus } from "../hooks/use-targets";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { TargetForm } from "./target-form";
import { TargetDetailModal } from "./target-detail-modal";
import type { YearlyTarget, YearlyTargetStatus } from "../types";
import { formatCurrency } from "@/lib/utils";

export function TargetsList() {
  const t = useTranslations("targets");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<YearlyTargetStatus | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<YearlyTarget | null>(null);
  const [viewingTarget, setViewingTarget] = useState<YearlyTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useYearlyTargets({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
  });

  const canCreate = useUserPermission("yearly_target.create");
  const canUpdate = useUserPermission("yearly_target.update");
  const canDelete = useUserPermission("yearly_target.delete");
  const canView = useUserPermission("yearly_target.read");

  const deleteTarget = useDeleteYearlyTarget();
  const updateStatus = useUpdateTargetStatus();
  const targets = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleEdit = (target: YearlyTarget) => {
    setEditingTarget(target);
    setIsFormOpen(true);
  };

  const handleView = (target: YearlyTarget) => {
    setViewingTarget(target);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteTarget.mutateAsync(deletingId);
        toast.success(t("deleted"));
        setDeletingId(null);
      } catch {
        toast.error(t("common.error"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTarget(null);
  };

  const handleStatusChange = async (
    id: string,
    status: YearlyTargetStatus,
    rejectionReason?: string,
  ) => {
    try {
      await updateStatus.mutateAsync({
        id,
        status,
        rejection_reason: rejectionReason,
      });
      toast.success(t("statusUpdated"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const getStatusBadge = (status: YearlyTargetStatus) => {
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
          <Badge variant="default">
            <Send className="h-3 w-3 mr-1" />
            {t("status.submitted")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
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
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("common.error")}: {(error as Error)?.message}
      </div>
    );
  }

  // Generate last 5 years + next year for filter
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i).reverse();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
          value={yearFilter}
          onValueChange={(v) => {
            setYearFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("year")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allYears")}</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as YearlyTargetStatus | "all");
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
              <TableHead>{t("year")}</TableHead>
              <TableHead>{t("area")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("totalTarget")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : targets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("notFound")}
                </TableCell>
              </TableRow>
            ) : (
              targets.map((target: YearlyTarget) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(target)}>
                    {target.code}
                  </TableCell>
                  <TableCell>{target.year}</TableCell>
                  <TableCell>{target.area?.name ?? "-"}</TableCell>
                  <TableCell>{getStatusBadge(target.status)}</TableCell>
                  <TableCell>{formatCurrency(target.total_target)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleView(target)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && target.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleEdit(target)} className="cursor-pointer">
                              <Pencil className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && target.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(target.id, "submitted")}
                              className="cursor-pointer"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t("actions.submit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && target.status === "submitted" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(target.id, "approved")}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t("actions.approve")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(target.id, "rejected")}
                                className="cursor-pointer text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                {t("actions.reject")}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && target.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(target.id)}
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

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage(page - 1)}
              className="cursor-pointer"
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage(page + 1)}
              className="cursor-pointer"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}

      {canCreate && (
        <TargetForm
          open={isFormOpen}
          onClose={handleFormClose}
          target={editingTarget}
        />
      )}

      {canView && viewingTarget && (
        <TargetDetailModal
          open={!!viewingTarget}
          onClose={() => setViewingTarget(null)}
          target={viewingTarget}
        />
      )}

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("delete")}
          description={t("deleteDesc")}
          itemName={t("common.yearlyTarget")}
          isLoading={deleteTarget.isPending}
        />
      )}
    </div>
  );
}
