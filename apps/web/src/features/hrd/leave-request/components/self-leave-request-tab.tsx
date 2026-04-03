"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, XCircle, AlertCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  useMyLeaveRequests,
  useMyLeaveFormData,
  useCreateMyLeaveRequest,
  useUpdateMyLeaveRequest,
  useCancelMyLeaveRequest,
  useMyLeaveRequest,
  useMyLeaveBalance,
} from "../hooks/use-leave-requests";
import type { LeaveRequestStatus, LeaveDuration } from "../types";
import { cn, formatDate } from "@/lib/utils";
import {
  getSelfLeaveRequestSchema,
  type SelfLeaveRequestFormData,
} from "../schemas/leave-request.schema";

interface SelfLeaveRequestTabProps {
  readonly openCreateSignal?: number;
}

// Helper function to calculate inclusive calendar days
// 2-3 = 2 days (inclusive count)
function calculateInclusiveDays(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 for inclusive
}

function statusVariant(
  status: LeaveRequestStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "PENDING":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

export function SelfLeaveRequestTab({
  openCreateSignal,
}: SelfLeaveRequestTabProps) {
  const t = useTranslations("leaveRequest");
  const formSchema = useMemo(() => getSelfLeaveRequestSchema(t), [t]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Track last-processed signal to prevent re-firing on component remount
  const lastProcessedSignalRef = useRef(0);
  const [cancelNote, setCancelNote] = useState("");

  const {
    data: listData,
    isLoading: isListLoading,
    isError,
  } = useMyLeaveRequests({
    page: 1,
    per_page: 20,
  });
  const { data: formData } = useMyLeaveFormData({ enabled: formOpen });
  const { data: detailData, isLoading: isDetailLoading } = useMyLeaveRequest(
    editingId ?? "",
    {
      enabled: formOpen && !!editingId,
    },
  );

  const createMutation = useCreateMyLeaveRequest();
  const updateMutation = useUpdateMyLeaveRequest();
  const cancelMutation = useCancelMyLeaveRequest();
  const { data: balanceData } = useMyLeaveBalance();

  const leaveTypes = useMemo(
    () => formData?.data?.leave_types ?? [],
    [formData?.data?.leave_types],
  );
  const requests = useMemo(() => listData?.data ?? [], [listData?.data]);

  const form = useForm<SelfLeaveRequestFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: new Date(),
      end_date: new Date(),
      duration: "FULL_DAY",
      reason: "",
    },
  });

  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");
  const duration = form.watch("duration");

  // Create date range object for DateRangePicker
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!startDate || !endDate) return undefined;
    return {
      from: startDate,
      to: endDate,
    };
  }, [startDate, endDate]);

  // Handle date range change from DateRangePicker
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      form.setValue("start_date", range.from);
      form.setValue("end_date", range.to || range.from);
    }
  };

  // Calculate total days (inclusive calendar days)
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;

    const isSameDate = startDate.toDateString() === endDate.toDateString();

    if (duration === "HALF_DAY") {
      return 0.5;
    }

    if (duration === "FULL_DAY" && isSameDate) {
      return 1;
    }

    // For MULTI_DAY or fallback: use inclusive calendar days
    return calculateInclusiveDays(startDate, endDate);
  }, [startDate, endDate, duration]);

  useEffect(() => {
    if (!openCreateSignal) return;
    // Only open form if this is a genuinely new signal (not a remount with stale signal)
    if (openCreateSignal === lastProcessedSignalRef.current) return;
    lastProcessedSignalRef.current = openCreateSignal;
    setEditingId(null);
    setFormOpen(true);
  }, [openCreateSignal]);

  useEffect(() => {
    if (!formOpen) return;

    if (!editingId) {
      form.reset({
        leave_type_id: "",
        start_date: new Date(),
        end_date: new Date(),
        duration: "FULL_DAY",
        reason: "",
      });
      return;
    }

    const data = detailData?.data;
    if (!data) return;

    form.reset({
      leave_type_id: data.leave_type?.id ?? "",
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      duration: data.duration as LeaveDuration,
      reason: data.reason,
    });
  }, [formOpen, editingId, detailData?.data, form]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    if (!isSameDay && duration !== "MULTI_DAY") {
      form.setValue("duration", "MULTI_DAY");
    }
    if (isSameDay && duration === "MULTI_DAY") {
      form.setValue("duration", "FULL_DAY");
    }
  }, [startDate, endDate, duration, form]);

  const onSubmit = async (values: SelfLeaveRequestFormData) => {
    const payload = {
      leave_type_id: values.leave_type_id,
      start_date: format(values.start_date, "yyyy-MM-dd"),
      end_date: format(values.end_date, "yyyy-MM-dd"),
      duration: values.duration,
      reason: values.reason,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast.success(t("messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("messages.createSuccess"));
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      // Extract specific error message from backend response
      const axiosError = error as {
        response?: {
          data?: {
            error?: {
              message?: string;
              code?: string;
              details?: { message?: string };
            };
          };
        };
      };
      let errorMessage =
        axiosError?.response?.data?.error?.details?.message ||
        axiosError?.response?.data?.error?.message;

      // Get error code for specific error handling
      const errorCode = axiosError?.response?.data?.error?.code || "";

      // Handle specific error codes with translated messages
      if (errorCode === "INVALID_START_DATE") {
        toast.error(t("messages.invalidStartDate"));
        return;
      }
      if (errorCode === "INVALID_END_DATE") {
        toast.error(t("messages.invalidEndDate"));
        return;
      }

      // Strip error code prefix (e.g., "OVERLAPPING_LEAVE_REQUEST: " -> "")
      if (errorMessage) {
        const colonIndex = errorMessage.indexOf(":");
        if (
          colonIndex !== -1 &&
          errorMessage.substring(0, colonIndex).match(/^[A-Z_]+$/)
        ) {
          errorMessage = errorMessage.substring(colonIndex + 1).trim();
        }
        toast.error(errorMessage);
      } else {
        toast.error(
          editingId ? t("messages.updateError") : t("messages.createError"),
        );
      }
    }
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    try {
      await cancelMutation.mutateAsync({
        id: cancellingId,
        data: {
          cancellation_note: cancelNote.trim() ? cancelNote.trim() : undefined,
        },
      });
      toast.success(t("messages.cancelSuccess"));
      setCancellingId(null);
      setCancelNote("");
    } catch (error) {
      // Extract specific error message from backend response
      const axiosError = error as {
        response?: {
          data?: {
            error?: {
              message?: string;
              code?: string;
              details?: { message?: string };
            };
          };
        };
      };
      let errorMessage =
        axiosError?.response?.data?.error?.details?.message ||
        axiosError?.response?.data?.error?.message;

      // Strip error code prefix (e.g., "OVERLAPPING_LEAVE_REQUEST: " -> "")
      if (errorMessage) {
        const colonIndex = errorMessage.indexOf(":");
        if (
          colonIndex !== -1 &&
          errorMessage.substring(0, colonIndex).match(/^[A-Z_]+$/)
        ) {
          errorMessage = errorMessage.substring(colonIndex + 1).trim();
        }
        toast.error(errorMessage);
      } else {
        toast.error(t("messages.cancelError"));
      }
    }
  };

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={() => {
            setEditingId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      {balanceData?.data && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t("balance.title")}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">
                {balanceData.data.total_quota ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("balance.totalQuota")}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {balanceData.data.used_days ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("balance.used")}
              </div>
            </div>
            <div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  (balanceData.data.remaining_balance ?? 0) <= 3 &&
                    (balanceData.data.remaining_balance ?? 0) > 0
                    ? "text-warning"
                    : (balanceData.data.remaining_balance ?? 0) <= 0
                      ? "text-destructive"
                      : "text-success",
                )}
              >
                {balanceData.data.remaining_balance ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("balance.remaining")}
              </div>
            </div>
          </div>
          {(balanceData.data.pending_requests_days ?? 0) > 0 && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {t("balance.pending")}: {balanceData.data.pending_requests_days}{" "}
              {t("days")}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {isListLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full" />
          ))
        ) : isError ? (
          <p className="text-sm text-destructive">{t("errors.fetchFailed")}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("emptyState.title")}
          </p>
        ) : (
          requests.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-medium">{item.leave_type}</div>
                <Badge variant={statusVariant(item.status)}>
                  {t(`status.${item.status.toLowerCase()}`)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(item.start_date)} - {formatDate(item.end_date)} (
                {item.total_days} {t("days")})
              </div>
              <div className="mt-2 line-clamp-2 text-sm">{item.reason}</div>

              {/* Rejected by and reason */}
              {item.status === "REJECTED" && (
                <div className="mt-2 space-y-1">
                  {item.rejected_by_name && (
                    <div className="text-xs text-muted-foreground">
                      {t("fields.rejectedBy")}: {item.rejected_by_name}
                    </div>
                  )}
                  {item.rejection_note && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {t("fields.rejectReason")}:
                      </div>
                      <div className="flex items-start gap-1 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3" />
                        <span>{item.rejection_note}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                {/* Only PENDING can be edited */}
                {item.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingId(item.id);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    {t("actions.edit")}
                  </Button>
                )}
                {(item.status === "PENDING" || item.status === "APPROVED") &&
                  new Date() < new Date(item.start_date) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-destructive"
                      onClick={() => setCancellingId(item.id)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      {t("actions.cancel")}
                    </Button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("edit") : t("add")}</DialogTitle>
          </DialogHeader>

          {editingId && isDetailLoading ? (
            <div className="space-y-2 py-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Field>
                <FieldLabel>{t("form.leaveType.label")}</FieldLabel>
                <Controller
                  name="leave_type_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("form.leaveType.placeholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((lt) => (
                          <SelectItem key={lt.id} value={lt.id}>
                            {lt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>
                  {form.formState.errors.leave_type_id?.message}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel>{t("form.dateRange.label")}</FieldLabel>
                <Controller
                  name="start_date"
                  control={form.control}
                  render={() => (
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateChange={handleDateRangeChange}
                      disabledDays={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  )}
                />
                <FieldError>
                  {form.formState.errors.start_date?.message ||
                    form.formState.errors.end_date?.message}
                </FieldError>
              </Field>

              <Field>
                <div className="flex items-center gap-2">
                  <input
                    id="half-day-self-leave"
                    type="checkbox"
                    className={cn(
                      "h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary",
                      startDate?.toDateString() !== endDate?.toDateString() &&
                        "cursor-not-allowed opacity-50",
                    )}
                    checked={duration === "HALF_DAY"}
                    disabled={
                      startDate?.toDateString() !== endDate?.toDateString()
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        form.setValue("duration", "HALF_DAY");
                      } else {
                        const sameDay =
                          startDate?.toDateString() === endDate?.toDateString();
                        form.setValue(
                          "duration",
                          sameDay ? "FULL_DAY" : "MULTI_DAY",
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor="half-day-self-leave"
                    className="cursor-pointer text-sm"
                  >
                    {t("form.duration.halfDay")}
                  </label>
                </div>
              </Field>

              {totalDays > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-sm font-medium">
                    {t("form.daysRequested")}:{" "}
                    <span className="text-primary">
                      {totalDays} {t("days")}
                    </span>
                  </p>
                </div>
              )}

              <Field>
                <FieldLabel>{t("form.reason.label")}</FieldLabel>
                <Textarea
                  rows={4}
                  {...form.register("reason")}
                  placeholder={t("form.reason.placeholder")}
                />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setFormOpen(false)}
                >
                  {t("actions.close")}
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {t("actions.submit")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!cancellingId}
        onOpenChange={(open) => !open && setCancellingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("cancelDialog.description")}
            </p>
            <Textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder={t("form.cancellationNote.placeholder")}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCancellingId(null)}
            >
              {t("cancelDialog.cancel")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {t("cancelDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
