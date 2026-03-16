"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ArrowLeft, Clock, Edit, Eye, Home, CheckCircle2, XCircle, Coffee, CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAttendanceRecords } from "../hooks/use-attendance-records";
import type { AttendanceRecord } from "../types";

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

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const part = value.split(" ")[1] ?? value;
  return part.substring(0, 8);
}

function getStatusBadge(t: ReturnType<typeof useTranslations>, status: AttendanceRecord["status"]) {
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

  const records = data?.data ?? [];
  const rawPagination = data?.meta?.pagination;
  const pagination = rawPagination
    ? {
        ...rawPagination,
        has_next: rawPagination.page < rawPagination.total_pages,
        has_prev: rawPagination.page > 1,
      }
    : undefined;

  const columns = useMemo<Column<AttendanceRecord>[]>(
    () => [
      {
        id: "employee",
        header: t("fields.employee"),
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback dataSeed={row.employee_name}>
                {row.employee_name}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {row.employee_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {row.employee_code}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "checkIn",
        header: t("fields.checkInTime"),
        accessor: (row) => <span className="font-medium">{formatTime(row.check_in_time)}</span>,
      },
      {
        id: "checkOut",
        header: t("fields.checkOutTime"),
        accessor: (row) => <span className="font-medium">{formatTime(row.check_out_time)}</span>,
      },
      {
        id: "overtime",
        header: t("fields.overtimeHours"),
        accessor: (row) => <span className="font-medium">{row.overtime_hours || "-"}</span>,
      },
      {
        id: "status",
        header: t("fields.status"),
        accessor: (row) => getStatusBadge(t, row.status),
      },
      {
        id: "actions",
        header: "",
        accessor: () => null,
        actions: [
          {
            label: t("actions.viewDetails"),
            icon: <Eye className="h-4 w-4" />,
            onClick: (row) => onView(row),
          },
          {
            label: t("actions.edit"),
            icon: <Edit className="h-4 w-4" />,
            onClick: (row) => onEdit?.(row),
            show: canEdit,
          },
        ],
      },
    ],
    [canEdit, onEdit, onView, t]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-card px-6 py-4">
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
            <h2 className="text-2xl font-bold tracking-tight">
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
      </div>

      <div className="flex-1 overflow-x-auto">
        {isError ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-destructive">{tCommon("somethingWentWrong")}</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={records}
              isLoading={isLoading}
              emptyMessage={t("noRecords")}
              outerClassName="!border-none !rounded-none"
            />
            {pagination && (
              <div className="mt-4">
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
