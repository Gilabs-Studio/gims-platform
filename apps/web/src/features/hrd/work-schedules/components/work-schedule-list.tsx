"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Clock,
  MapPin,
  Eye,
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
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useWorkSchedules,
  useDeleteWorkSchedule,
  useSetDefaultWorkSchedule,
} from "../hooks/use-work-schedules";
import type { WorkSchedule } from "../types";
import { WorkScheduleDialog } from "./work-schedule-dialog";
import { WorkScheduleDetailDialog } from "./work-schedule-detail-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WorkScheduleList() {
  const t = useTranslations("hrd.workSchedule");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<WorkSchedule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useWorkSchedules({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const deleteMutation = useDeleteWorkSchedule();
  const setDefaultMutation = useSetDefaultWorkSchedule();

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: WorkSchedule) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleViewDetail = (item: WorkSchedule) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("messages.deleteSuccess"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id);
      toast.success(t("messages.setDefaultSuccess"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const formatTime = (time: string) => {
    return time?.slice(0, 5) || "-";
  };

  const formatWorkingDays = (days: number | string[]) => {
    if (Array.isArray(days)) {
      return days.join(", ");
    }
    // Bitmask: 31 = Mon-Fri, 63 = Mon-Sat, 127 = All days
    if (days === 31) return t("workingDaysOptions.weekdays");
    if (days === 63) return t("workingDaysOptions.weekdaysSaturday");
    if (days === 127) return t("workingDaysOptions.everyDay");
    return `${days} days`;
  };

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="mt-4 ml-2 cursor-pointer"
        >
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
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleCreate} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          {t("actions.create")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] cursor-pointer">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              {tCommon("all")}
            </SelectItem>
            <SelectItem value="active" className="cursor-pointer">
              {tCommon("active")}
            </SelectItem>
            <SelectItem value="inactive" className="cursor-pointer">
              {tCommon("inactive")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.name")}</TableHead>
              <TableHead>{t("fields.startTime")}</TableHead>
              <TableHead>{t("fields.endTime")}</TableHead>
              <TableHead>{t("fields.workingDays")}</TableHead>
              <TableHead>{t("fields.requireGPS")}</TableHead>
              <TableHead>{t("fields.isActive")}</TableHead>
              <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {tCommon("noData")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium cursor-pointer hover:text-primary hover:underline"
                        onClick={() => handleViewDetail(item)}
                      >
                        {item.name}
                      </span>
                      {item.is_default && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          {t("default")}
                        </Badge>
                      )}
                      {item.is_flexible && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Flexible
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                        {item.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatTime(item.start_time)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatTime(item.end_time)}
                  </TableCell>
                  <TableCell>
                    {item.working_days_display?.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {item.working_days_display.map((day) => (
                          <Badge
                            key={day}
                            variant="outline"
                            className="text-xs"
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      formatWorkingDays(item.working_days)
                    )}
                  </TableCell>
                  <TableCell>
                    {item.require_gps ? (
                      <div className="flex items-center gap-1 text-primary">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs">
                          {item.gps_radius_meter}m
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? tCommon("active") : tCommon("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem
                          onClick={() => handleViewDetail(item)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {tCommon("view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(item)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        {!item.is_default && !item.division_id && (
                          <DropdownMenuItem
                            onClick={() => handleSetDefault(item.id)}
                            className="cursor-pointer"
                            disabled={setDefaultMutation.isPending}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            {t("setAsDefault")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(item.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                          disabled={item.is_default}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon("delete")}
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
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Dialogs */}
      <WorkScheduleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="work schedule"
        isLoading={deleteMutation.isPending}
      />

      <WorkScheduleDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
      />
    </div>
  );
}
