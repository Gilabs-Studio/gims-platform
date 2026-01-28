"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useMyOvertimeRequests,
  useOvertimeRequests,
  usePendingOvertimeRequests,
  useCancelOvertimeRequest,
  useDeleteOvertimeRequest,
} from "../hooks/use-overtime";
import type { OvertimeRequest, OvertimeStatus, OvertimeType } from "../types";
import { OvertimeDialog } from "./overtime-dialog";
import { OvertimeApprovalDialog } from "./overtime-approval-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export function OvertimeList() {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");

  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState("my-requests");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>(
    String(currentDate.getMonth() + 1)
  );
  const [yearFilter, setYearFilter] = useState<string>(
    String(currentDate.getFullYear())
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OvertimeRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalItem, setApprovalItem] = useState<OvertimeRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);

  // My Requests data
  const {
    data: myData,
    isLoading: myLoading,
    isError: myError,
    refetch: myRefetch,
  } = useMyOvertimeRequests({
    page,
    per_page: 15,
    month: monthFilter !== "all" ? Number(monthFilter) : undefined,
    year: Number(yearFilter),
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Pending Approvals data (for managers)
  const {
    data: pendingData,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: pendingRefetch,
  } = usePendingOvertimeRequests();

  // All Requests data (for admin)
  const {
    data: allData,
    isLoading: allLoading,
    isError: allError,
    refetch: allRefetch,
  } = useOvertimeRequests({
    page,
    per_page: 15,
    month: monthFilter !== "all" ? Number(monthFilter) : undefined,
    year: Number(yearFilter),
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const cancelMutation = useCancelOvertimeRequest();
  const deleteMutation = useDeleteOvertimeRequest();

  const getActiveData = () => {
    switch (activeTab) {
      case "my-requests":
        return {
          items: myData?.data ?? [],
          pagination: myData?.meta?.pagination,
          isLoading: myLoading,
          isError: myError,
          refetch: myRefetch,
        };
      case "pending":
        return {
          items: pendingData?.data ?? [],
          pagination: undefined,
          isLoading: pendingLoading,
          isError: pendingError,
          refetch: pendingRefetch,
        };
      case "all":
        return {
          items: allData?.data ?? [],
          pagination: allData?.meta?.pagination,
          isLoading: allLoading,
          isError: allError,
          refetch: allRefetch,
        };
      default:
        return {
          items: [],
          pagination: undefined,
          isLoading: false,
          isError: false,
          refetch: () => {},
        };
    }
  };

  const { items, pagination, isLoading, isError, refetch } = getActiveData();

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: OvertimeRequest) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleApprove = (item: OvertimeRequest) => {
    setApprovalItem(item);
    setApprovalAction("approve");
  };

  const handleReject = (item: OvertimeRequest) => {
    setApprovalItem(item);
    setApprovalAction("reject");
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success(t("messages.cancelSuccess"));
    } catch {
      toast.error(tCommon("error"));
    }
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

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleApprovalClose = () => {
    setApprovalItem(null);
    setApprovalAction(null);
  };

  const getStatusBadgeVariant = (status: OvertimeStatus) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "PENDING":
        return "secondary";
      case "REJECTED":
        return "destructive";
      case "CANCELED":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTypeBadgeVariant = (type: OvertimeType) => {
    switch (type) {
      case "AUTO_DETECTED":
        return "default";
      case "MANUAL_CLAIM":
        return "secondary";
      case "PRE_APPROVED":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // HH:mm
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE, dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

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

  const pendingCount = pendingData?.data?.length ?? 0;

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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-requests" className="cursor-pointer gap-2">
            <Clock className="h-4 w-4" />
            {t("tabs.myRequests")}
          </TabsTrigger>
          <TabsTrigger value="pending" className="cursor-pointer gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("tabs.pending")}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="cursor-pointer gap-2">
            <Filter className="h-4 w-4" />
            {t("tabs.all")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {/* Filters */}
          {activeTab !== "pending" && (
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={monthFilter}
                onValueChange={(value) => {
                  setMonthFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] cursor-pointer">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {tCommon("all")}
                  </SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      className="cursor-pointer"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={yearFilter}
                onValueChange={(value) => {
                  setYearFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[100px] cursor-pointer">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem
                      key={year}
                      value={String(year)}
                      className="cursor-pointer"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] cursor-pointer">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {tCommon("all")}
                  </SelectItem>
                  <SelectItem value="PENDING" className="cursor-pointer">
                    {t("status.PENDING")}
                  </SelectItem>
                  <SelectItem value="APPROVED" className="cursor-pointer">
                    {t("status.APPROVED")}
                  </SelectItem>
                  <SelectItem value="REJECTED" className="cursor-pointer">
                    {t("status.REJECTED")}
                  </SelectItem>
                  <SelectItem value="CANCELED" className="cursor-pointer">
                    {t("status.CANCELED")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab !== "my-requests" && (
                    <TableHead>{t("fields.employee")}</TableHead>
                  )}
                  <TableHead>{t("fields.date")}</TableHead>
                  <TableHead>{t("fields.time")}</TableHead>
                  <TableHead>{t("fields.duration")}</TableHead>
                  <TableHead>{t("fields.type")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  <TableHead className="max-w-[200px]">{t("fields.reason")}</TableHead>
                  <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {activeTab !== "my-requests" && (
                        <TableCell>
                          <Skeleton className="h-5 w-32" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab !== "my-requests" ? 8 : 7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {tCommon("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      {activeTab !== "my-requests" && (
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {item.employee_name}
                            </span>
                            {item.employee_code && (
                              <p className="text-xs text-muted-foreground">
                                {item.employee_code}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {formatMinutes(item.requested_minutes)}
                          </div>
                          {item.approved_minutes > 0 &&
                            item.approved_minutes !== item.requested_minutes && (
                              <div className="text-xs text-muted-foreground">
                                Approved: {formatMinutes(item.approved_minutes)}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(item.type)}>
                          {t(`types.${item.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {t(`status.${item.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <span title={item.reason}>{item.reason}</span>
                        {item.rejection_reason && (
                          <p
                            className="text-xs text-destructive truncate"
                            title={item.rejection_reason}
                          >
                            Reason: {item.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {activeTab === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(item)}
                              className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                              title={t("actions.approve")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(item)}
                              className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                              title={t("actions.reject")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
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
                              {item.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(item)}
                                    className="cursor-pointer"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {tCommon("edit")}
                                  </DropdownMenuItem>
                                  {activeTab !== "my-requests" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleApprove(item)}
                                        className="cursor-pointer text-green-600"
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        {t("actions.approve")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleReject(item)}
                                        className="cursor-pointer text-destructive"
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        {t("actions.reject")}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {activeTab === "my-requests" && (
                                    <DropdownMenuItem
                                      onClick={() => handleCancel(item.id)}
                                      className="cursor-pointer text-amber-600"
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      {t("actions.cancel")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {activeTab !== "my-requests" &&
                                item.status !== "PENDING" && (
                                  <DropdownMenuItem
                                    onClick={() => setDeleteId(item.id)}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {tCommon("delete")}
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

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, pagination.total_pages) }).map(
                    (_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink
                          onClick={() => setPage(i + 1)}
                          isActive={page === i + 1}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(pagination.total_pages, p + 1))
                      }
                      className={
                        page >= pagination.total_pages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OvertimeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

      <OvertimeApprovalDialog
        open={!!approvalItem && !!approvalAction}
        onOpenChange={handleApprovalClose}
        item={approvalItem}
        action={approvalAction}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        itemName="overtime request"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
