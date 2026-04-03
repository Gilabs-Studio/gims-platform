"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Edit,
  Eye,
  Home,
  CheckCircle2,
  XCircle,
  Coffee,
  CalendarIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttendanceRecords } from "../hooks/use-attendance-records";
import type { AttendanceRecord } from "../types";
import { formatAttendanceTime, getUserTimezone } from "@/lib/utils";

interface AttendanceDayViewProps {
  readonly selectedDate: Date;
  readonly onBack: () => void;
  readonly onView: (record: AttendanceRecord) => void;
  readonly onEdit?: (record: AttendanceRecord) => void;
  readonly canEdit?: boolean;
  readonly page: number;
  readonly perPage: number;
  readonly onPageChange: (page: number) => void;
  readonly onPerPageChange: (perPage: number) => void;
}

function formatTime(value: string | null | undefined, date?: string) {
  return formatAttendanceTime(value, date, getUserTimezone());
}

function getStatusBadge(
  t: ReturnType<typeof useTranslations>,
  status: AttendanceRecord["status"],
) {
  const label = t(`status.${status}`) ?? status;

  switch (status) {
    case "PRESENT":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "LATE":
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "ABSENT":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "HALF_DAY":
      return (
        <Badge variant="secondary">
          <Coffee className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "HOLIDAY":
      return (
        <Badge variant="info">
          <CalendarIcon className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "LEAVE":
      return (
        <Badge variant="outline">
          <CalendarIcon className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "WFH":
      return (
        <Badge variant="info">
          <Home className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    case "OFF_DAY":
      return (
        <Badge variant="secondary">
          <Coffee className="h-3 w-3 mr-1" /> {label}
        </Badge>
      );
    default:
      return <Badge>{label}</Badge>;
  }
}

export function AttendanceDayView({
  selectedDate,
  onBack,
  onView,
  onEdit,
  canEdit = false,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: AttendanceDayViewProps) {
  const t = useTranslations("hrd.attendance");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  const { data, isLoading, isError } = useAttendanceRecords({
    date_from: dateKey,
    date_to: dateKey,
    page,
    per_page: perPage,
  });

  const records = useMemo(() => data?.data ?? [], [data?.data]);
  const rawPagination = data?.meta?.pagination;
  const pagination = rawPagination
    ? {
        ...rawPagination,
        has_next: rawPagination.page < rawPagination.total_pages,
        has_prev: rawPagination.page > 1,
      }
    : undefined;

  const dayStats = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        if (record.status === "PRESENT" || record.status === "WFH") {
          acc.present += 1;
        } else if (record.status === "LATE") {
          acc.late += 1;
        } else if (record.status === "ABSENT") {
          acc.absent += 1;
        }
        return acc;
      },
      { total: records.length, present: 0, late: 0, absent: 0 },
    );
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {new Date(selectedDate).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("fields.date")}: {dateKey}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-semibold">{dayStats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("status.PRESENT")}</p>
          <p className="mt-1 text-xl font-semibold text-success">
            {dayStats.present}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("status.LATE")}</p>
          <p className="mt-1 text-xl font-semibold text-warning">
            {dayStats.late}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{t("status.ABSENT")}</p>
          <p className="mt-1 text-xl font-semibold text-destructive">
            {dayStats.absent}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isError ? (
          <div className="p-6 text-center">
            <p className="text-destructive">{tCommon("somethingWentWrong")}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.employee")}</TableHead>
                  <TableHead>{t("fields.checkInTime")}</TableHead>
                  <TableHead>{t("fields.checkOutTime")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t("noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback dataSeed={row.employee_name}>
                              {row.employee_name}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {row.employee_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.employee_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatTime(row.check_in_time, row.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatTime(row.check_out_time, row.date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(t, row.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            onClick={() => onView(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && onEdit && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer"
                              onClick={() => onEdit(row)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {pagination && (
              <div className="border-t border-border px-3 py-3">
                <DataTablePagination
                  pageIndex={pagination.page}
                  pageSize={pagination.per_page}
                  rowCount={pagination.total}
                  onPageChange={onPageChange}
                  onPageSizeChange={(newPerPage: number) => {
                    onPerPageChange(newPerPage);
                    onPageChange(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
