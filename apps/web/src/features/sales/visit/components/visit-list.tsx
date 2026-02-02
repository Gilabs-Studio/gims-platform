"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { 
  MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, 
  MapPin, LogIn, LogOut, XCircle, Clock, CheckCircle2, AlertCircle,
  Calendar as CalendarIcon, List as ListIcon
} from "lucide-react";
import { 
  useVisits, 
  useVisitCalendarSummary, 
  useDeleteVisit, 
  useUpdateVisitStatus, 
  useCheckIn, 
  useCheckOut 
} from "../hooks/use-visits";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import type { SalesVisit, SalesVisitStatus } from "../types";
import { useTranslations } from "next-intl";
import { VisitCalendarView } from "./visit-calendar-view";
import { VisitForm } from "./visit-form";
import { VisitDetailModal } from "./visit-detail-modal";
import { DayVisitListDrawer } from "./day-visit-list-drawer";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function VisitList() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SalesVisitStatus | "all">("all");
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SalesVisit | null>(null);
  const [detailVisit, setDetailVisit] = useState<SalesVisit | null>(null);

  // List Query
  const listParams = useMemo(() => ({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  }), [page, debouncedSearch, statusFilter]);

  const { 
    data: listData, 
    isLoading: isListLoading, 
    isError: isListError 
  } = useVisits(listParams);

  // Calendar Summary Query
  const summaryParams = useMemo(() => ({
    date_from: format(startOfMonth(calendarDate), "yyyy-MM-dd"),
    date_to: format(endOfMonth(calendarDate), "yyyy-MM-dd"),
    // filters could extend here e.g. employee_id if added to UI
  }), [calendarDate]); // removing search/status from calendar summary for now as summary is usually holistic

  const { 
    data: summaryData, 
    isLoading: isSummaryLoading 
  } = useVisitCalendarSummary(summaryParams);

  const canCreate = useUserPermission("sales_visit.create");
  const canUpdate = useUserPermission("sales_visit.update");
  const canDelete = useUserPermission("sales_visit.delete");

  const t = useTranslations("visit");
  const canView = useUserPermission("sales_visit.read");

  const deleteVisit = useDeleteVisit();
  const updateStatus = useUpdateVisitStatus();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  
  const visits = listData?.data ?? [];
  const pagination = listData?.meta?.pagination;
  const summary = summaryData?.data?.summary ?? [];

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteVisit.mutateAsync(deletingId);
        toast.success(t("deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error(t("deleteError"));
      }
    }
  };

  const handleEdit = (visit: SalesVisit) => {
    setEditingVisit(visit);
    setIsFormOpen(true);
  };

  const handleCheckIn = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await checkIn.mutateAsync({
              id,
              data: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            });
            toast.success(t("checkInSuccess"));
          },
          async () => {
            await checkIn.mutateAsync({ id, data: {} });
            toast.success(t("checkInSuccess"));
          }
        );
      } else {
        await checkIn.mutateAsync({ id, data: {} });
        toast.success(t("checkInSuccess"));
      }
    } catch {
      toast.error("Check-in failed");
    }
  };

  const handleCheckOut = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await checkOut.mutateAsync({ id, data: {} });
      toast.success(t("checkOutSuccess"));
    } catch {
      toast.error("Check-out failed");
    }
  };

  const handleCancel = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status: "cancelled", notes: "Cancelled by user" },
      });
      toast.success(t("cancelSuccess"));
    } catch {
      toast.error("Failed to cancel visit");
    }
  };

  const getStatusBadge = (status: SalesVisitStatus) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> {t("statusPlanned")}</Badge>;
      case "in_progress":
        return <Badge variant="info"><MapPin className="h-3 w-3 mr-1" /> {t("statusInProgress")}</Badge>;
      case "completed":
        return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" /> {t("statusCompleted")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> {t("statusCancelled")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
          <p className="text-destructive">{t("fetchError")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px] max-w-sm">
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
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as SalesVisitStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="planned">{t("statusPlanned")}</SelectItem>
            <SelectItem value="in_progress">{t("statusInProgress")}</SelectItem>
            <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
            <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => { setEditingVisit(null); setIsFormOpen(true); }} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("create")}
          </Button>
        )}
      </div>

      {viewMode === "list" ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead>{t("visitDate")}</TableHead>
                  <TableHead>{t("employee")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("purpose")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isListLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : visits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  visits.map((visit: SalesVisit) => (
                    <TableRow key={visit.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium cursor-pointer" onClick={() => setDetailVisit(visit)}>
                        {visit.code}
                      </TableCell>
                      <TableCell>{formatDate(visit.visit_date)} <span className="text-xs text-muted-foreground ml-1">{visit.scheduled_time}</span></TableCell>
                      <TableCell>{visit.employee?.name ?? t("unknownEmployee")}</TableCell>
                      <TableCell>{visit.company?.name ?? t("unknownCompany")}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {visit.purpose || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(visit.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canView && (
                              <DropdownMenuItem onClick={() => setDetailVisit(visit)} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                {t("view")}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && visit.status === "planned" && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(visit)} className="cursor-pointer">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => handleCheckIn(visit.id, e)}
                                  className="cursor-pointer"
                                >
                                  <LogIn className="h-4 w-4 mr-2" />
                                  {t("checkIn")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canUpdate && visit.status === "in_progress" && (
                              <DropdownMenuItem 
                                onClick={(e) => handleCheckOut(visit.id, e)}
                                className="cursor-pointer"
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                {t("checkOut")}
                              </DropdownMenuItem>
                            )}
                            {canUpdate && (visit.status === "planned" || visit.status === "in_progress") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => handleCancel(visit.id, e)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t("cancel")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete && visit.status === "planned" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeletingId(visit.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t("delete")}
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

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.has_prev}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.has_next}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <VisitCalendarView
          summary={summary}
          currentDate={calendarDate}
          isLoading={isSummaryLoading}
          onDateChange={setCalendarDate}
          onDateClick={setSelectedDate} 
        />
      )}

      {/* Forms & Dialogs */}
      <VisitForm 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        visit={editingVisit} 
      />

      <VisitDetailModal
        open={!!detailVisit}
        onClose={() => setDetailVisit(null)}
        visit={detailVisit}
      />

      {/* New Drawer for Date Details */}
      <DayVisitListDrawer
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        onVisitClick={(visit) => {
          setDetailVisit(visit);
          // keep drawer open? usually better to close drawer if modal opens, or stack them.
          // Dialog usually sits on top of Drawer (z-index).
          // But maybe we want the drawer to close.
          // setSelectedDate(null); // Optional: close drawer when opening detail
        }}
      />

      <DeleteDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        isLoading={deleteVisit.isPending}
        title={t("deleteTitle")}
        description={t("deleteConfirm")}
      />
    </div>
  );
}
