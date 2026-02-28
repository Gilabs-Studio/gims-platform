"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
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
  Pencil,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar as CalendarIcon,
  List as ListIcon,
  Coffee,
  Home,
  MapPin,
} from "lucide-react";
import {
  useAttendanceRecords,
  useDeleteAttendanceRecord,
  useCreateManualAttendance,
  useUpdateAttendanceRecord,
} from "../hooks/use-attendance-records";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { AttendanceRecord, AttendanceStatus } from "../types";
import type { CalendarEvent } from "../types";
import { useTranslations } from "next-intl";
import { AttendanceCalendar } from "./attendance-calendar";
import { AttendanceDayView } from "./attendance-day-view";
import { AttendanceDetailModal } from "./attendance-detail-modal";
import { AttendanceRecordForm } from "./attendance-record-form";
import { useAttendanceCalendar } from "../hooks/use-attendance-calendar";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Build a minimal AttendanceRecord from a calendar day-view event for detail modal and edit form. */
function calendarEventToAttendanceRecord(event: CalendarEvent): AttendanceRecord {
  const dateStr =
    event.date instanceof Date
      ? format(event.date, "yyyy-MM-dd")
      : String(event.date);
  return {
    id: event.id,
    employee_id: event.employeeId,
    employee_name: event.employeeName,
    employee_code: event.employeeCode,
    division_name: event.divisionName,
    date: dateStr,
    check_in_time: event.checkInTime,
    check_in_type: event.checkInType,
    check_in_latitude: null,
    check_in_longitude: null,
    check_in_address: "",
    check_in_note: "",
    check_out_time: event.checkOutTime,
    check_out_latitude: null,
    check_out_longitude: null,
    check_out_address: "",
    check_out_note: "",
    status: event.status,
    working_minutes: 0,
    working_hours: event.workingHours ?? "0",
    overtime_minutes: 0,
    overtime_hours: "0",
    late_minutes: event.lateMinutes ?? 0,
    early_leave_minutes: 0,
    work_schedule_id: "",
    leave_request_id: null,
    notes: event.notes ?? "",
    is_manual_entry: event.isManualEntry ?? false,
    manual_entry_reason: "",
    approved_by: null,
    created_at: "",
    updated_at: "",
  };
}

export function AttendanceList() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">(
    "all"
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(
    null
  );

  const t = useTranslations("hrd.attendance");

  // List query params
  const listParams = useMemo(
    () => ({
      page,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      status:
        statusFilter !== "all" ? (statusFilter as AttendanceStatus) : undefined,
    }),
    [page, pageSize, debouncedSearch, statusFilter]
  );

  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
  } = useAttendanceRecords(listParams);

  const canCreate = useUserPermission("attendance.create");
  const canUpdate = useUserPermission("attendance.update");
  const canDelete = useUserPermission("attendance.delete");
  const canView = useUserPermission("attendance.read");

  const deleteRecord = useDeleteAttendanceRecord();
  const createMutation = useCreateManualAttendance();
  const updateMutation = useUpdateAttendanceRecord();

  const records = listData?.data ?? [];
  const pagination = listData?.meta?.pagination;

  // Calendar state
  const calendar = useAttendanceCalendar();

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteRecord.mutateAsync(deletingId);
        toast.success(t("messages.deleteSuccess"));
        setDeletingId(null);
      } catch {
        // Error handled by api-client
      }
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> {t("status.PRESENT")}
          </Badge>
        );
      case "LATE":
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" /> {t("status.LATE")}
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {t("status.ABSENT")}
          </Badge>
        );
      case "HALF_DAY":
        return (
          <Badge variant="secondary">
            <Coffee className="h-3 w-3 mr-1" /> {t("status.HALF_DAY")}
          </Badge>
        );
      case "HOLIDAY":
        return (
          <Badge variant="info">
            <CalendarIcon className="h-3 w-3 mr-1" /> {t("status.HOLIDAY")}
          </Badge>
        );
      case "LEAVE":
        return (
          <Badge variant="outline">
            <CalendarIcon className="h-3 w-3 mr-1" /> {t("status.LEAVE")}
          </Badge>
        );
      case "WFH":
        return (
          <Badge variant="info">
            <Home className="h-3 w-3 mr-1" /> WFH
          </Badge>
        );
      case "OFF_DAY":
        return (
          <Badge variant="secondary">
            <Coffee className="h-3 w-3 mr-1" /> Off Day
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCheckInTypeBadge = (type: string) => {
    switch (type) {
      case "NORMAL":
        return (
          <Badge variant="outline">
            <MapPin className="h-3 w-3 mr-1" /> Office
          </Badge>
        );
      case "WFH":
        return (
          <Badge variant="outline">
            <Home className="h-3 w-3 mr-1" /> WFH
          </Badge>
        );
      case "FIELD_WORK":
        return (
          <Badge variant="outline">
            <MapPin className="h-3 w-3 mr-1" /> Field
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (viewMode === "list" && isListError) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive">Failed to load attendance records</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="cursor-pointer"
          >
            <ListIcon className="h-4 w-4 mr-2" /> List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="cursor-pointer"
          >
            <CalendarIcon className="h-4 w-4 mr-2" /> Calendar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {viewMode === "list" && (
          <>
            <div className="relative flex-1 min-w-[300px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("actions.search")}
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
                setStatusFilter(v as AttendanceStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("fields.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PRESENT">{t("status.PRESENT")}</SelectItem>
                <SelectItem value="LATE">{t("status.LATE")}</SelectItem>
                <SelectItem value="ABSENT">{t("status.ABSENT")}</SelectItem>
                <SelectItem value="HALF_DAY">{t("status.HALF_DAY")}</SelectItem>
                <SelectItem value="LEAVE">{t("status.LEAVE")}</SelectItem>
                <SelectItem value="HOLIDAY">{t("status.HOLIDAY")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        <div className="flex-1" />
        {canCreate && (
          <Button
            onClick={() => {
              setEditingRecord(null);
              setIsFormOpen(true);
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("actions.manualEntry")}
          </Button>
        )}
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
                  <TableHead>{t("fields.division")}</TableHead>
                  <TableHead>{t("fields.checkInTime")}</TableHead>
                  <TableHead>{t("fields.checkOutTime")}</TableHead>
                  <TableHead>{t("fields.workingMinutes")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
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
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record: AttendanceRecord) => (
                    <TableRow
                      key={record.id}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell
                        className="font-medium cursor-pointer"
                        onClick={() => setDetailRecord(record)}
                      >
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {record.employee_name}
                          </span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {record.employee_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.division_name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{record.check_in_time ?? "-"}</span>
                          {record.check_in_type &&
                            getCheckInTypeBadge(record.check_in_type)}
                        </div>
                      </TableCell>
                      <TableCell>{record.check_out_time ?? "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span>{record.working_hours || "-"}</span>
                          {record.late_minutes > 0 && (
                            <span className="text-destructive text-xs ml-2">
                              +{record.late_minutes}m late
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
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
                                onClick={() => setDetailRecord(record)}
                                className="cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t("actions.viewDetails")}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && (
                              <DropdownMenuItem
                                onClick={() => handleEdit(record)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t("actions.edit")}
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingId(record.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t("actions.delete")}
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
        </>
      ) : (
        <Card className="overflow-hidden">
          {calendar.selectedDate ? (
            <AttendanceDayView
              selectedDate={calendar.selectedDate}
              events={calendar.selectedDateEvents}
              onBack={calendar.handleBackToMonth}
              onEventClick={(event) =>
                setDetailRecord(calendarEventToAttendanceRecord(event))
              }
              onEdit={(event) =>
                handleEdit(calendarEventToAttendanceRecord(event))
              }
              canEdit={canUpdate}
              onCreateNew={() => setIsFormOpen(true)}
            />
          ) : (
            <AttendanceCalendar
              currentDate={calendar.currentDate}
              events={calendar.events}
              onPreviousMonth={calendar.handlePreviousMonth}
              onNextMonth={calendar.handleNextMonth}
              onToday={calendar.handleToday}
              onDateClick={calendar.handleDateClick}
            />
          )}
        </Card>
      )}

      {/* Manual Entry Form Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(val) => {
          if (!val) {
            setIsFormOpen(false);
            setEditingRecord(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t("actions.edit")
                : t("actions.manualEntry")}
            </DialogTitle>
          </DialogHeader>
          <AttendanceRecordForm
            event={
              editingRecord
                ? {
                    id: editingRecord.id,
                    employeeId: editingRecord.employee_id,
                    employeeName: editingRecord.employee_name,
                    employeeCode: editingRecord.employee_code,
                    divisionName: editingRecord.division_name,
                    date: new Date(editingRecord.date),
                    checkInTime: editingRecord.check_in_time,
                    checkOutTime: editingRecord.check_out_time,
                    checkInType: editingRecord.check_in_type,
                    status: editingRecord.status,
                    lateMinutes: editingRecord.late_minutes,
                    workingHours: editingRecord.working_hours,
                    notes: editingRecord.notes,
                    isManualEntry: editingRecord.is_manual_entry,
                  }
                : undefined
            }
            onSubmit={async (data) => {
              try {
                if (editingRecord) {
                  await updateMutation.mutateAsync({
                    id: editingRecord.id,
                    data: {
                      check_in_time: data.check_in_time,
                      check_out_time: data.check_out_time,
                      check_in_type: data.check_in_type,
                      status: data.status,
                      notes: data.notes,
                      manual_entry_reason: data.reason,
                    },
                  });
                  toast.success(t("messages.updateSuccess"));
                } else {
                  await createMutation.mutateAsync(data);
                  toast.success(t("messages.createSuccess"));
                }
                setIsFormOpen(false);
                setEditingRecord(null);
              } catch {
                // Error handled by api-client
              }
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingRecord(null);
            }}
            isLoading={editingRecord ? updateMutation.isPending : createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <AttendanceDetailModal
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        record={detailRecord}
        onEdit={(record) => {
          setDetailRecord(null);
          handleEdit(record);
        }}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteRecord.isPending}
        title={t("actions.delete")}
        description={t("messages.deleteConfirm")}
      />
    </div>
  );
}
