"use client";

import { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar as CalendarIcon,
  List as ListIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { OvertimeRequest, OvertimeStatus, OvertimeType } from "../types";
import { useLocale, useTranslations } from "next-intl";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useOvertimeRequests,
  useCancelOvertimeRequest,
} from "../hooks/use-overtime";
import { useOvertimeCalendar } from "../hooks/use-overtime-calendar";
import { OvertimeDialog } from "./overtime-dialog";
import { OvertimeApprovalDialog } from "./overtime-approval-dialog";
import { OvertimeCalendar } from "./overtime-calendar";
import { OvertimeDayView } from "./overtime-day-view";
import { format } from "date-fns";

export function OvertimeList() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | "all">(
    "all",
  );
  const [monthFilter, setMonthFilter] = useState<string>(
    String(new Date().getMonth() + 1),
  );
  const [yearFilter, setYearFilter] = useState<string>(
    String(new Date().getFullYear()),
  );

  // Calendar pagination for Day View
  const [dayPage, setDayPage] = useState(1);
  const [dayPerPage, setDayPerPage] = useState(20);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OvertimeRequest | null>(null);
  const [detailItem, setDetailItem] = useState<OvertimeRequest | null>(null);
  const [approvalItem, setApprovalItem] = useState<OvertimeRequest | null>(
    null,
  );
  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null);

  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Calculate date range based on month/year filters for list view
  const dateFrom = `${yearFilter}-${String(monthFilter).padStart(2, "0")}-01`;
  const dateTo = `${yearFilter}-${String(monthFilter).padStart(2, "0")}-${String(new Date(Number(yearFilter), Number(monthFilter), 0).getDate()).padStart(2, "0")}`;

  // List query params
  const listParams = {
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    date_from: dateFrom,
    date_to: dateTo,
  };

  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
  } = useOvertimeRequests(viewMode === "list" ? listParams : undefined);

  // Calendar hook
  const calendar = useOvertimeCalendar();

  const canCreate = useUserPermission("overtime.create");
  const canUpdate = useUserPermission("overtime.update");
  const canDelete = useUserPermission("overtime.delete");
  const canView = useUserPermission("overtime.read");
  const canApprove = useUserPermission("overtime.approve");

  const cancelMutation = useCancelOvertimeRequest();

  const records = listData?.data ?? [];
  const pagination = listData?.meta?.pagination;

  const handleCancel = async () => {
    if (cancellingId) {
      try {
        await cancelMutation.mutateAsync(cancellingId);
        toast.success(t("messages.cancelSuccess"));
        setCancellingId(null);
        calendar.refetch();
      } catch {
        // Error handled by api-client
      }
    }
  };

  const handleEdit = (record: OvertimeRequest) => {
    // Auto-detected overtime cannot be edited manually
    if (record.request_type === "AUTO_DETECTED") {
      toast.info(t("messages.autoDetectedInfo"));
      return;
    }
    setEditingItem(record);
    setIsFormOpen(true);
  };

  const handleView = (record: OvertimeRequest) => {
    setDetailItem(record);
  };

  const handleApprove = (record: OvertimeRequest) => {
    setApprovalItem(record);
    setApprovalAction("approve");
  };

  const handleReject = (record: OvertimeRequest) => {
    setApprovalItem(record);
    setApprovalAction("reject");
  };

  const getStatusBadge = (status: OvertimeStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" /> {t("status.PENDING")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {t("status.APPROVED")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {t("status.REJECTED")}
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge variant="secondary">
            <X className="h-3 w-3 mr-1" /> {t("status.CANCELED")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: OvertimeType) => {
    switch (type) {
      case "AUTO_DETECTED":
        return (
          <Badge variant="outline" className="text-blue-600">
            {t("types.AUTO_DETECTED")}
          </Badge>
        );
      case "MANUAL_CLAIM":
        return (
          <Badge variant="outline" className="text-orange-600">
            {t("types.MANUAL_CLAIM")}
          </Badge>
        );
      case "PRE_APPROVED":
        return (
          <Badge variant="outline" className="text-green-600">
            {t("types.PRE_APPROVED")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const canEditRecord = (record: OvertimeRequest) => {
    return record.status === "PENDING" && canUpdate;
  };

  const canDeleteRecord = (record: OvertimeRequest) => {
    return record.status === "PENDING" && canDelete;
  };

  const canApproveRecord = (record: OvertimeRequest) => {
    return record.status === "PENDING" && canApprove;
  };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2024, i, 1), "MMMM"),
  }));

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  if (viewMode === "list" && isListError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">{tCommon("somethingWentWrong")}</p>
          <Button variant="outline" onClick={() => {}} className="mt-4">
            {tCommon("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with title and view toggle */}
      <div className="rounded-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-1">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="cursor-pointer"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {t("calendarView")}
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="cursor-pointer"
            >
              <ListIcon className="mr-2 h-4 w-4" />
              {t("listView")}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {viewMode === "list" ? (
          <>
            <div className="relative flex-1 min-w-[300px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("filters.search")}
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
                setStatusFilter(v as OvertimeStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
                <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
                <SelectItem value="APPROVED">{t("status.APPROVED")}</SelectItem>
                <SelectItem value="REJECTED">{t("status.REJECTED")}</SelectItem>
                <SelectItem value="CANCELED">{t("status.CANCELED")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("filters.month")} />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder={t("filters.year")} />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            {/* Calendar Navigation */}
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {format(calendar.currentDate, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={calendar.handleToday}
                className="h-8 cursor-pointer"
              >
                {t("today")}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={calendar.handlePreviousMonth}
                className="h-8 w-8 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={calendar.handleNextMonth}
                className="h-8 w-8 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        <div className="flex-1" />
      </div>

      {/* Content: List or Calendar View */}
      {viewMode === "list" ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.date")}</TableHead>
                  <TableHead>{t("fields.employee")}</TableHead>
                  <TableHead>{t("fields.duration")}</TableHead>
                  <TableHead>{t("fields.type")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  <TableHead>{t("fields.reason")}</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isListLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>{t("empty.noRecords")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {format(new Date(record.date), "dd MMM yyyy")}
                        <div className="text-sm text-muted-foreground">
                          {record.start_time.substring(0, 5)} -{" "}
                          {record.end_time.substring(0, 5)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {record.employee_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.employee_code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{record.planned_hours}</div>
                        {record.actual_hours && (
                          <div className="text-sm text-muted-foreground">
                            {t("fields.actual")}: {record.actual_hours}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(record.request_type)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div
                          className="max-w-[200px] truncate"
                          title={record.reason}
                        >
                          {record.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem
                                onClick={() => handleView(record)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {tCommon("view")}
                              </DropdownMenuItem>
                            )}
                            {canApproveRecord(record) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleApprove(record)}
                                  className="cursor-pointer"
                                >
                                  <Check className="h-4 w-4 mr-2 text-green-600" />
                                  {t("actions.approve")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleReject(record)}
                                  className="cursor-pointer"
                                >
                                  <X className="h-4 w-4 mr-2 text-red-600" />
                                  {t("actions.reject")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDeleteRecord(record) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setCancellingId(record.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  {t("actions.cancel")}
                                </DropdownMenuItem>
                              </>
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

          {pagination && (
            <DataTablePagination
              pageIndex={page}
              pageSize={pageSize}
              rowCount={pagination.total}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          )}
        </>
      ) : (
        /* Calendar View */
        <div>
          {calendar.selectedDate ? (
            <OvertimeDayView
              selectedDate={calendar.selectedDate}
              events={calendar.selectedDateEvents}
              onBack={calendar.handleBackToMonth}
              onView={(event) => {
                const record = records.find((r) => r.id === event.id);
                if (record) handleView(record);
              }}
              onEdit={(event) => {
                const record = records.find((r) => r.id === event.id);
                if (record) handleEdit(record);
              }}
              onApprove={(event) => {
                const record = records.find((r) => r.id === event.id);
                if (record) handleApprove(record);
              }}
              onReject={(event) => {
                const record = records.find((r) => r.id === event.id);
                if (record) handleReject(record);
              }}
              onDelete={(id) => setCancellingId(id)}
              page={dayPage}
              perPage={dayPerPage}
              onPageChange={setDayPage}
              onPerPageChange={(value) => {
                setDayPerPage(value);
                setDayPage(1);
              }}
            />
          ) : (
            <OvertimeCalendar
              currentDate={calendar.currentDate}
              events={calendar.events}
              holidays={calendar.holidays}
              onPreviousMonth={calendar.handlePreviousMonth}
              onNextMonth={calendar.handleNextMonth}
              onToday={calendar.handleToday}
              onDateClick={(date) => {
                setDayPage(1);
                calendar.handleDateClick(date);
              }}
            />
          )}
        </div>
      )}

      {/* Form Dialog */}
      <OvertimeDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingItem={editingItem}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingItem(null);
          calendar.refetch();
        }}
      />

      {/* Approval Dialog */}
      {approvalItem && (
        <OvertimeApprovalDialog
          open={!!approvalItem}
          onOpenChange={(open) => {
            if (!open) {
              setApprovalItem(null);
              setApprovalAction(null);
            }
          }}
          item={approvalItem}
          action={approvalAction || "approve"}
          onSuccess={() => {
            setApprovalItem(null);
            setApprovalAction(null);
            calendar.refetch();
          }}
        />
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.employee")}
                  </label>
                  <p className="font-medium">{detailItem.employee_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {detailItem.employee_code}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.division")}
                  </label>
                  <p>{detailItem.division_name || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.date")}
                  </label>
                  <p>{format(new Date(detailItem.date), "dd MMMM yyyy")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.duration")}
                  </label>
                  <p>
                    {detailItem.start_time.substring(0, 5)} -{" "}
                    {detailItem.end_time.substring(0, 5)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("fields.planned")}: {detailItem.planned_hours}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.type")}
                  </label>
                  <div className="mt-1">
                    {getTypeBadge(detailItem.request_type)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.status")}
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(detailItem.status)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("fields.reason")}
                </label>
                <p className="mt-1">{detailItem.reason}</p>
              </div>

              {detailItem.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.description")}
                  </label>
                  <p className="mt-1">{detailItem.description}</p>
                </div>
              )}

              {detailItem.task_details && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("fields.taskDetails")}
                  </label>
                  <p className="mt-1">{detailItem.task_details}</p>
                </div>
              )}

              {detailItem.approved_by && (
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("fields.approvedBy")}
                      </label>
                      <p>
                        {detailItem.approved_by_name || detailItem.approved_by}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {detailItem.approved_at &&
                          format(
                            new Date(detailItem.approved_at),
                            "dd MMM yyyy HH:mm",
                          )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("fields.approvedMinutes")}
                      </label>
                      <p>
                        {detailItem.approved_minutes} {t("fields.minutes")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {detailItem.rejected_by && (
                <div className="pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("fields.rejectedBy")}
                    </label>
                    <p>
                      {detailItem.rejected_by_name || detailItem.rejected_by}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {detailItem.rejected_at &&
                        format(
                          new Date(detailItem.rejected_at),
                          "dd MMM yyyy HH:mm",
                        )}
                    </p>
                  </div>
                  {detailItem.reject_reason && (
                    <div className="mt-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        {t("fields.rejectReason")}
                      </label>
                      <p className="mt-1">{detailItem.reject_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <DeleteDialog
        open={!!cancellingId}
        onOpenChange={(open) => !open && setCancellingId(null)}
        onConfirm={handleCancel}
        title={t("cancelDialog.title")}
        description={t("cancelDialog.description")}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
