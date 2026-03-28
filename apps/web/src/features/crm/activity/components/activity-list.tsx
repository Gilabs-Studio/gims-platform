"use client";

import { MoreHorizontal, Plus, Search, Eye, Filter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogActivityDialog } from "./log-activity-dialog";
import { ActivityDetailDialog } from "./activity-detail-dialog";
import { useActivityList } from "../hooks/use-activity-list";
import { useActivities } from "../hooks/use-activities";
import { useActivityTypes } from "@/features/crm/activity-type/hooks/use-activity-type";
import { useLeadFormData } from "@/features/crm/lead/hooks/use-leads";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { formatDate } from "@/lib/utils";
import type { Activity } from "../types";
import { useState } from "react";

const ACTIVITY_TYPE_OPTIONS = [
  "visit", "call", "email", "meeting", "follow_up", "task", "deal", "lead",
] as const;

const TYPE_VARIANT_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  visit: "default",
  call: "secondary",
  email: "outline",
  meeting: "default",
  follow_up: "secondary",
  task: "outline",
  deal: "default",
  lead: "secondary",
};

export function ActivityList() {
  const { state, actions, permissions, translations } = useActivityList();
  const { t, tCommon } = translations;

  const { data: formDataRes } = useLeadFormData({ enabled: permissions.canCreate });
  const { data: activityTypesData } = useActivityTypes({ per_page: 20, sort_by: "order", sort_dir: "asc" });
  const activityTypes = activityTypesData?.data?.filter((at) => at.is_active) ?? [];
  const employees = formDataRes?.data?.employees ?? [];
  const authUser = useAuthStore((state) => state.user);

  const { data: activitiesRes, isLoading, isError, refetch } = useActivities({
    page: state.page,
    per_page: state.pageSize,
    search: state.debouncedSearch,
    type: state.typeFilter || undefined,
  });

  const items = activitiesRes?.data ?? [];
  const pagination = activitiesRes?.meta?.pagination;

  const [detailItem, setDetailItem] = useState<Activity | null>(null);

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button variant="outline" onClick={() => refetch()} className="mt-4 ml-2 cursor-pointer">
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
        <div className="flex items-center gap-2">
          {permissions.canCreate && (
            <Button onClick={actions.handleCreate} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              {t("addActivity")}
            </Button>
          )}
        </div>
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
          value={state.typeFilter || "all"}
          onValueChange={(value) => {
            actions.setTypeFilter(value === "all" ? "" : value);
            actions.setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">{t("allTypes")}</SelectItem>
            {ACTIVITY_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type} className="cursor-pointer">
                {t(`types.${type}`)}
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
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.description")}</TableHead>
              <TableHead>{t("table.employee")}</TableHead>
              <TableHead>{t("table.customer")}</TableHead>
              <TableHead>{t("table.contact")}</TableHead>
              <TableHead>{t("table.timestamp")}</TableHead>
              <TableHead className="w-20">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("emptyState")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailItem(item)}>
                  <TableCell>
                    <Badge variant={TYPE_VARIANT_MAP[item.type] ?? "outline"}>
                      {t(`types.${item.type}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>{item.employee?.name ?? "-"}</TableCell>
                  <TableCell>{item.customer?.name ?? "-"}</TableCell>
                  <TableCell>{item.contact?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailItem(item)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          {t("detailTitle")}
                        </DropdownMenuItem>
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
          onPageChange={actions.setPage}
          onPageSizeChange={(newSize) => {
            actions.setPageSize(newSize);
            actions.setPage(1);
          }}
        />
      )}

      {/* Create Dialog */}
      {permissions.canCreate && (
        <LogActivityDialog
          open={state.dialogOpen}
          onClose={actions.handleDialogClose}
          defaultEmployeeId={authUser?.employee_id}
          employees={employees}
          activityTypes={activityTypes}
          onSuccess={() => {
            actions.handleDialogClose();
            refetch();
          }}
        />
      )}

      {/* Detail Dialog */}
      {detailItem && (
        <ActivityDetailDialog
          open={!!detailItem}
          onClose={() => setDetailItem(null)}
          activity={detailItem}
        />
      )}
    </div>
  );
}
