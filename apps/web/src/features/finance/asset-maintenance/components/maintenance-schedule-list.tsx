"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Pencil, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useMaintenanceSchedules,
  useDeleteMaintenanceSchedule,
} from "../hooks/use-asset-maintenance";
import type { MaintenanceSchedule, MaintenanceScheduleType } from "../types";

interface MaintenanceScheduleListProps {
  onCreate: () => void;
  onEdit: (schedule: MaintenanceSchedule) => void;
}

export function MaintenanceScheduleList({
  onCreate,
  onEdit,
}: MaintenanceScheduleListProps) {
  const t = useTranslations("assetMaintenance");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [scheduleType, setScheduleType] = useState<MaintenanceScheduleType | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<MaintenanceSchedule | null>(null);

  const { data: schedulesData, isLoading } = useMaintenanceSchedules({
    search: debouncedSearch || undefined,
    schedule_type: scheduleType === "all" ? undefined : scheduleType,
    is_active: status === "all" ? undefined : status === "active",
  });

  const deleteSchedule = useDeleteMaintenanceSchedule();

  const schedules = schedulesData?.data || [];

  const handleDeleteClick = (schedule: MaintenanceSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (scheduleToDelete) {
      deleteSchedule.mutate(scheduleToDelete.id);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const getScheduleTypeBadge = (type: MaintenanceScheduleType) => {
    switch (type) {
      case "preventive":
        return <Badge variant="secondary">{t("schedules.types.preventive")}</Badge>;
      case "corrective":
        return <Badge variant="outline">{t("schedules.types.corrective")}</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    if (schedule.is_overdue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t("schedules.status.overdue")}
        </Badge>
      );
    }
    if (schedule.days_until_due <= 7) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t("schedules.status.dueSoon")}
        </Badge>
      );
    }
    if (schedule.is_active) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t("schedules.status.active")}
        </Badge>
      );
    }
    return <Badge variant="secondary">{t("schedules.status.inactive")}</Badge>;
  };

  const getFrequencyLabel = (frequency: string, value: number) => {
    const freqLabel = t(`schedules.frequencies.${frequency}`);
    return value > 1 ? `${value} ${freqLabel}` : freqLabel;
  };

  if (isLoading) {
    return <ScheduleListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t("schedules.title")}</CardTitle>
            <Button onClick={onCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("schedules.create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("schedules.title")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as MaintenanceScheduleType | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("schedules.form.scheduleType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="preventive">{t("schedules.types.preventive")}</SelectItem>
                <SelectItem value="corrective">{t("schedules.types.corrective")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">{t("schedules.status.active")}</SelectItem>
                <SelectItem value="inactive">{t("schedules.status.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No maintenance schedules found
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div className="font-medium">{schedule.asset?.name}</div>
                        <div className="text-sm text-muted-foreground">{schedule.asset?.code}</div>
                      </TableCell>
                      <TableCell>{getScheduleTypeBadge(schedule.schedule_type)}</TableCell>
                      <TableCell>
                        {getFrequencyLabel(schedule.frequency, schedule.frequency_value)}
                      </TableCell>
                      <TableCell>
                        {schedule.next_maintenance_date
                          ? formatDate(schedule.next_maintenance_date)
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule)}</TableCell>
                      <TableCell>{formatCurrency(schedule.estimated_cost, "IDR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(schedule)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(schedule)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedules.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.deleteSchedule")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setScheduleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScheduleListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
