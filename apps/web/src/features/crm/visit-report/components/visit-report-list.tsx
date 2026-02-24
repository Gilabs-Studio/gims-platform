"use client";

import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Filter,
  Eye,
  MapPin,
  LogIn,
  LogOut,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VisitReportFormDialog } from "./visit-report-form-dialog";
import { useVisitReportList } from "../hooks/use-visit-report-list";
import { formatDate, formatTime } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import type { VisitReportStatus, VisitReportOutcome } from "../types";

const STATUS_VARIANTS: Record<VisitReportStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  submitted: "outline",
  approved: "default",
  rejected: "destructive",
};

const OUTCOME_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  very_positive: "default",
  positive: "default",
  neutral: "secondary",
  negative: "destructive",
};

const STATUSES: VisitReportStatus[] = ["draft", "submitted", "approved", "rejected"];
const OUTCOMES: VisitReportOutcome[] = ["positive", "neutral", "negative", "very_positive"];

export function VisitReportList() {
  const { state, actions, data, permissions, translations } = useVisitReportList();
  const { t, tCommon } = translations;
  const router = useRouter();

  if (data.isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => data.refetch()} className="mt-4 ml-2 cursor-pointer">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        {permissions.canCreate && (
          <Button onClick={actions.handleCreate} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            {t("addVisit")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={state.search}
            onChange={(e) => {
              actions.setSearch(e.target.value);
              actions.setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={state.statusFilter}
          onValueChange={(value) => {
            actions.setStatusFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allStatuses")}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="cursor-pointer">
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.outcomeFilter}
          onValueChange={(value) => {
            actions.setOutcomeFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allOutcomes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allOutcomes")}</SelectItem>
            {OUTCOMES.map((outcome) => (
              <SelectItem key={outcome} value={outcome} className="cursor-pointer">
                {t(`outcome.${outcome}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.code")}</TableHead>
              <TableHead>{t("table.visitDate")}</TableHead>
              <TableHead>{t("table.customer")}</TableHead>
              <TableHead>{t("table.employee")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.outcome")}</TableHead>
              <TableHead>{t("table.checkIn")}</TableHead>
              <TableHead>{t("table.checkOut")}</TableHead>
              {(permissions.canUpdate || permissions.canDelete || permissions.canApprove) && (
                <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: permissions.canUpdate || permissions.canDelete || permissions.canApprove ? 9 : 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={(permissions.canUpdate || permissions.canDelete || permissions.canApprove) ? 9 : 8}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyState")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => {
                const isDraft = item.status === "draft";
                const canCheckIn = isDraft && !item.check_in_at;
                const canCheckOut = !!item.check_in_at && !item.check_out_at;
                const canSubmit = isDraft;

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/crm/visits/${item.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>{formatDate(item.visit_date)}</TableCell>
                    <TableCell>{item.customer?.name ?? "-"}</TableCell>
                    <TableCell>{item.employee?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[item.status as VisitReportStatus] ?? "outline"}>
                        {t(`status.${item.status as VisitReportStatus}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.outcome ? (
                        <Badge variant={OUTCOME_VARIANTS[item.outcome] ?? "secondary"}>
                          {t(`outcome.${item.outcome as VisitReportOutcome}`)}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.check_in_at ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatTime(item.check_in_at)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.check_out_at ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatTime(item.check_out_at)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    {(permissions.canUpdate || permissions.canDelete || permissions.canApprove) && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/crm/visits/${item.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("detailTitle")}
                            </DropdownMenuItem>

                            {permissions.canUpdate && canCheckIn && (
                              <DropdownMenuItem
                                onClick={() => actions.handleCheckIn(item.id)}
                                className="cursor-pointer"
                              >
                                <LogIn className="mr-2 h-4 w-4" />
                                {t("actions.checkIn")}
                              </DropdownMenuItem>
                            )}

                            {permissions.canUpdate && canCheckOut && (
                              <DropdownMenuItem
                                onClick={() => actions.handleCheckOut(item.id)}
                                className="cursor-pointer"
                              >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t("actions.checkOut")}
                              </DropdownMenuItem>
                            )}

                            {permissions.canUpdate && isDraft && (
                              <DropdownMenuItem
                                onClick={() => actions.handleEdit(item)}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                {tCommon("edit")}
                              </DropdownMenuItem>
                            )}

                            {permissions.canUpdate && canSubmit && (
                              <DropdownMenuItem
                                onClick={() => actions.handleSubmit(item.id)}
                                className="cursor-pointer"
                              >
                                <Send className="mr-2 h-4 w-4" />
                                {t("actions.submit")}
                              </DropdownMenuItem>
                            )}

                            {permissions.canDelete && isDraft && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => actions.setDeleteId(item.id)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {tCommon("delete")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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

      {/* Dialogs */}
      {(permissions.canCreate || permissions.canUpdate) && (
        <VisitReportFormDialog
          open={state.dialogOpen}
          onClose={actions.handleDialogClose}
          visit={state.editingItem}
        />
      )}

      {permissions.canDelete && (
        <DeleteDialog
          open={!!state.deleteId}
          onOpenChange={(open) => !open && actions.setDeleteId(null)}
          onConfirm={actions.handleDelete}
          itemName="visit report"
          isLoading={data.isDeleting}
        />
      )}
    </div>
  );
}
