"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MoreHorizontal, Plus, Search, Pencil, Trash2, Eye, CheckCircle2, XCircle, Clock, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLeaveRequests, useDeleteLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest, useCancelLeaveRequest, useReapproveLeaveRequest } from "../hooks/use-leave-requests";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
import { LeaveRequestForm } from "./leave-request-form";
import { LeaveRequestDetailModal } from "./leave-request-detail-modal";
import type { LeaveRequest, LeaveRequestStatus } from "../types";
import { formatDate } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRejectLeaveRequestSchema } from "../schemas/leave-request.schema";
import { ButtonLoading } from "@/components/loading";

export function LeaveRequestList() {
  const t = useTranslations("leaveRequest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | "all">("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [viewingLeave, setViewingLeave] = useState<LeaveRequest | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingLeave, setApprovingLeave] = useState<LeaveRequest | null>(null);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [cancellingLeave, setCancellingLeave] = useState<LeaveRequest | null>(null);

  const { data, isLoading, isError } = useLeaveRequests({
    page,
    per_page: pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
  });

  const canCreate = useUserPermission("leave_request.create");
  const canUpdate = useUserPermission("leave_request.update");
  const canDelete = useUserPermission("leave_request.delete");
  const canView = useUserPermission("leave_request.read");
  const canApprove = useUserPermission("leave_request.approve");

  const deleteLeave = useDeleteLeaveRequest();
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const cancelMutation = useCancelLeaveRequest();
  const reapproveMutation = useReapproveLeaveRequest();
  
  const leaves = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const rejectForm = useForm({
    resolver: zodResolver(getRejectLeaveRequestSchema(t)),
    defaultValues: { rejection_note: "" },
  });

  const cancelForm = useForm({
    defaultValues: { cancellation_note: "" },
  });

  const handleEdit = (leave: LeaveRequest) => {
    setEditingLeave(leave);
    setIsFormOpen(true);
  };

  const handleView = (leave: LeaveRequest) => {
    setViewingLeave(leave);
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await deleteLeave.mutateAsync(deletingId);
        toast.success(t("messages.deleteSuccess"));
        setDeletingId(null);
      } catch {
        toast.error(t("messages.deleteError"));
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingLeave(null);
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync({ id, data: {} });
      toast.success(t("messages.approveSuccess"));
      setApprovingLeave(null);
    } catch {
      toast.error(t("messages.approveError"));
    }
  };

  const handleReject = async (data: { rejection_note: string }) => {
    if (!rejectingLeave) return;
    
    try {
      await rejectMutation.mutateAsync({
        id: rejectingLeave.id,
        data: { rejection_note: data.rejection_note },
      });
      toast.success(t("messages.rejectSuccess"));
      setRejectingLeave(null);
      rejectForm.reset();
    } catch {
      toast.error(t("messages.rejectError"));
    }
  };

  const handleCancel = async (data: { cancellation_note?: string }) => {
    if (!cancellingLeave) return;
    
    try {
      await cancelMutation.mutateAsync({
        id: cancellingLeave.id,
        data: { cancellation_note: data.cancellation_note || undefined },
      });
      toast.success(t("messages.cancelSuccess"));
      setCancellingLeave(null);
      cancelForm.reset();
    } catch {
      toast.error(t("messages.cancelError"));
    }
  };

  const handleReapprove = async (id: string) => {
    try {
      await reapproveMutation.mutateAsync({ id, data: {} });
      toast.success(t("messages.approveSuccess"));
    } catch {
      toast.error(t("messages.approveError"));
    }
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.rejected")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("status.cancelled")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        {t("errors.fetchFailed")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
            setStatusFilter(v as LeaveRequestStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filters.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-60 justify-start text-left font-normal cursor-pointer",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : t("filters.startDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date: Date | undefined) => {
                setStartDate(date);
                setPage(1);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        {startDate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 cursor-pointer"
            onClick={() => {
              setStartDate(undefined);
              setPage(1);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-60 justify-start text-left font-normal cursor-pointer",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP") : t("filters.endDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date: Date | undefined) => {
                setEndDate(date);
                setPage(1);
              }}
              initialFocus
              disabled={(date) => startDate ? date < startDate : false}
            />
          </PopoverContent>
        </Popover>
        
        {endDate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 cursor-pointer"
            onClick={() => {
              setEndDate(undefined);
              setPage(1);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex-1" />
        {canCreate && (
          <Button onClick={() => setIsFormOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("employee")}</TableHead>
              <TableHead>{t("leaveType")}</TableHead>
              <TableHead>{t("startDate")}</TableHead>
              <TableHead>{t("endDate")}</TableHead>
              <TableHead>{t("totalDays")}</TableHead>
              <TableHead>{t("status.label")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : leaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("emptyState.title")}
                </TableCell>
              </TableRow>
            ) : (
              leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium text-primary hover:underline cursor-pointer" onClick={() => canView && handleView(leave)}>
                    {leave.employee_name || "-"}
                  </TableCell>
                  <TableCell>{leave.leave_type || "-"}</TableCell>
                  <TableCell>{formatDate(leave.start_date)}</TableCell>
                  <TableCell>{formatDate(leave.end_date)}</TableCell>
                  <TableCell>
                    {leave.total_days} {t("days")}
                  </TableCell>
                  <TableCell>{getStatusBadge(leave.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canView && (
                          <DropdownMenuItem onClick={() => handleView(leave)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            {t("actions.view")}
                          </DropdownMenuItem>
                        )}
                        {canUpdate && leave.status === "PENDING" && (
                          <DropdownMenuItem onClick={() => handleEdit(leave)} className="cursor-pointer">
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        {canApprove && leave.status === "PENDING" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setApprovingLeave(leave)}
                              className="cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {t("actions.approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRejectingLeave(leave)}
                              className="cursor-pointer text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t("actions.reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {canApprove && (leave.status === "APPROVED" || leave.status === "PENDING") && (
                          <DropdownMenuItem
                            onClick={() => setCancellingLeave(leave)}
                            className="cursor-pointer text-warning"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t("actions.cancel")}
                          </DropdownMenuItem>
                        )}
                        {canApprove && (leave.status === "CANCELLED" || leave.status === "REJECTED") && (
                          <DropdownMenuItem
                            onClick={() => handleReapprove(leave.id)}
                            className="cursor-pointer text-success"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t("actions.reapprove")}
                          </DropdownMenuItem>
                        )}
                        {canDelete && leave.status === "PENDING" && (
                          <DropdownMenuItem
                            onClick={() => setDeletingId(leave.id)}
                            className="text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
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

      {canCreate && (
        <LeaveRequestForm
          open={isFormOpen}
          onClose={handleFormClose}
          leaveRequest={editingLeave}
        />
      )}

      {approvingLeave && (
        <Dialog open={!!approvingLeave} onOpenChange={(open) => !open && setApprovingLeave(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("approveDialog.title")}</DialogTitle>
              <DialogDescription>{t("approveDialog.description")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovingLeave(null)}>
                {t("approveDialog.cancel")}
              </Button>
              <Button
                onClick={() => handleApprove(approvingLeave.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <ButtonLoading loading>{t("approveDialog.confirm")}</ButtonLoading>
                ) : (
                  t("approveDialog.confirm")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {rejectingLeave && (
        <Dialog open={!!rejectingLeave} onOpenChange={(open) => {
          if (!open) {
            setRejectingLeave(null);
            rejectForm.reset();
          }
        }}>
          <DialogContent>
            <form onSubmit={rejectForm.handleSubmit(handleReject)}>
              <DialogHeader>
                <DialogTitle>{t("rejectDialog.title")}</DialogTitle>
                <DialogDescription>{t("rejectDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Field>
                  <FieldLabel>{t("form.rejectionNote.label")}</FieldLabel>
                  <Textarea
                    {...rejectForm.register("rejection_note")}
                    placeholder={t("form.rejectionNote.placeholder")}
                    rows={4}
                  />
                  <FieldError>{rejectForm.formState.errors.rejection_note?.message}</FieldError>
                </Field>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectingLeave(null);
                    rejectForm.reset();
                  }}
                >
                  {t("rejectDialog.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <ButtonLoading loading>{t("rejectDialog.confirm")}</ButtonLoading>
                  ) : (
                    t("rejectDialog.confirm")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {cancellingLeave && (
        <Dialog open={!!cancellingLeave} onOpenChange={(open) => {
          if (!open) {
            setCancellingLeave(null);
            cancelForm.reset();
          }
        }}>
          <DialogContent>
            <form onSubmit={cancelForm.handleSubmit(handleCancel)}>
              <DialogHeader>
                <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
                <DialogDescription>{t("cancelDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Field>
                  <FieldLabel>{t("form.cancellationNote.label")}</FieldLabel>
                  <Textarea
                    {...cancelForm.register("cancellation_note")}
                    placeholder={t("form.cancellationNote.placeholder")}
                    rows={4}
                  />
                  <FieldError>{cancelForm.formState.errors.cancellation_note?.message}</FieldError>
                </Field>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCancellingLeave(null);
                    cancelForm.reset();
                  }}
                >
                  {t("cancelDialog.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <ButtonLoading loading>{t("cancelDialog.confirm")}</ButtonLoading>
                  ) : (
                    t("cancelDialog.confirm")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <LeaveRequestDetailModal
        open={!!viewingLeave}
        onClose={() => setViewingLeave(null)}
        leaveRequest={viewingLeave}
      />

      {canDelete && (
        <DeleteDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          title={t("deleteDialog.title")}
          description={t("deleteDialog.description")}
          isLoading={deleteLeave.isPending}
        />
      )}
    </div>
  );
}
