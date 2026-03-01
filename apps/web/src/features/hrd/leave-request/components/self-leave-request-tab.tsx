"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore, startOfDay } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarIcon, Pencil, Plus, XCircle } from "lucide-react";
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
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

const formSchema = z
  .object({
    leave_type_id: z.string().min(1, { message: "Leave type is required" }),
    start_date: z.date(),
    end_date: z.date(),
    duration: z.enum(["FULL_DAY", "HALF_DAY", "MULTI_DAY"]),
    reason: z
      .string()
      .min(10, { message: "Reason must be at least 10 characters" })
      .max(500, { message: "Reason must be at most 500 characters" }),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "Invalid date range",
    path: ["end_date"],
  })
  .refine(
    (data) => {
      if (data.duration === "MULTI_DAY") {
        return data.start_date < data.end_date;
      }
      return data.start_date.toDateString() === data.end_date.toDateString();
    },
    {
      message: "Invalid duration/date combination",
      path: ["duration"],
    }
  );

type SelfLeaveFormData = z.infer<typeof formSchema>;

interface SelfLeaveRequestTabProps {
  readonly openCreateSignal?: number;
}

function statusVariant(status: LeaveRequestStatus): "default" | "secondary" | "destructive" | "outline" {
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

export function SelfLeaveRequestTab({ openCreateSignal }: SelfLeaveRequestTabProps) {
  const t = useTranslations("leaveRequest");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Track last-processed signal to prevent re-firing on component remount
  const lastProcessedSignalRef = useRef(0);
  const [cancelNote, setCancelNote] = useState("");

  const { data: listData, isLoading: isListLoading, isError } = useMyLeaveRequests({
    page: 1,
    per_page: 20,
  });
  const { data: formData } = useMyLeaveFormData({ enabled: formOpen });
  const { data: detailData, isLoading: isDetailLoading } = useMyLeaveRequest(editingId ?? "", {
    enabled: formOpen && !!editingId,
  });

  const createMutation = useCreateMyLeaveRequest();
  const updateMutation = useUpdateMyLeaveRequest();
  const cancelMutation = useCancelMyLeaveRequest();
  const { data: balanceData } = useMyLeaveBalance();

  const leaveTypes = useMemo(() => formData?.data?.leave_types ?? [], [formData?.data?.leave_types]);
  const requests = useMemo(() => listData?.data ?? [], [listData?.data]);

  const form = useForm<SelfLeaveFormData>({
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

  // Auto-fill end date when start date changes and start_date > end_date
  const prevStartDateRef = useRef<Date | null>(null);
  useEffect(() => {
    if (!startDate || !endDate) return;
    const prevStart = prevStartDateRef.current;
    prevStartDateRef.current = startDate;
    // Only auto-fill if start date actually changed (not on initial render)
    if (prevStart && prevStart.getTime() !== startDate.getTime() && startDate > endDate) {
      form.setValue("end_date", startDate);
    }
  }, [startDate, endDate, form]);

  const onSubmit = async (values: SelfLeaveFormData) => {
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
    } catch {
      toast.error(editingId ? t("messages.updateError") : t("messages.createError"));
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
    } catch {
      toast.error(t("messages.cancelError"));
    }
  };

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{t("title")}</div>
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
          <div className="text-xs font-medium text-muted-foreground mb-2">{t("balance.title")}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold">{balanceData.data.total_quota ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t("balance.totalQuota")}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{balanceData.data.used_days ?? 0}</div>
              <div className="text-xs text-muted-foreground">{t("balance.used")}</div>
            </div>
            <div>
              <div className={cn(
                "text-lg font-semibold",
                (balanceData.data.remaining_balance ?? 0) <= 3 && (balanceData.data.remaining_balance ?? 0) > 0
                  ? "text-yellow-600"
                  : (balanceData.data.remaining_balance ?? 0) <= 0
                    ? "text-destructive"
                    : "text-emerald-600"
              )}>
                {balanceData.data.remaining_balance ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">{t("balance.remaining")}</div>
            </div>
          </div>
          {(balanceData.data.pending_requests_days ?? 0) > 0 && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {t("balance.pending")}: {balanceData.data.pending_requests_days} {t("days")}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {isListLoading ? (
          Array.from({ length: 3 }).map((_, idx) => <Skeleton key={idx} className="h-20 w-full" />)
        ) : isError ? (
          <p className="text-sm text-destructive">{t("errors.fetchFailed")}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyState.title")}</p>
        ) : (
          requests.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-medium">{item.leave_type}</div>
                <Badge variant={statusVariant(item.status)}>{t(`status.${item.status.toLowerCase()}`)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(item.start_date)} - {formatDate(item.end_date)} ({item.total_days} {t("days")})
              </div>
              <div className="mt-2 line-clamp-2 text-sm">{item.reason}</div>
              <div className="mt-3 flex items-center gap-2">
                {(item.status === "PENDING" || item.status === "REJECTED") && (
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
                {(item.status === "PENDING" || item.status === "APPROVED") && (
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
                        <SelectValue placeholder={t("form.leaveType.placeholder")} />
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
                <FieldError>{form.formState.errors.leave_type_id?.message}</FieldError>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>{t("form.startDate.label")}</FieldLabel>
                  <Controller
                    name="start_date"
                    control={form.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full cursor-pointer justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDate(field.value.toISOString())}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d: Date | undefined) => d && field.onChange(d)}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.endDate.label")}</FieldLabel>
                  <Controller
                    name="end_date"
                    control={form.control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full cursor-pointer justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDate(field.value.toISOString())}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d: Date | undefined) => d && field.onChange(d)}
                            disabled={(d) =>
                              startDate ? isBefore(startOfDay(d), startOfDay(startDate)) : false
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </Field>
              </div>

              <Field>
                <div className="flex items-center gap-2">
                  <input
                    id="half-day-self-leave"
                    type="checkbox"
                    className={cn(
                      "h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary",
                      startDate?.toDateString() !== endDate?.toDateString() && "cursor-not-allowed opacity-50"
                    )}
                    checked={duration === "HALF_DAY"}
                    disabled={startDate?.toDateString() !== endDate?.toDateString()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        form.setValue("duration", "HALF_DAY");
                      } else {
                        const sameDay = startDate?.toDateString() === endDate?.toDateString();
                        form.setValue("duration", sameDay ? "FULL_DAY" : "MULTI_DAY");
                      }
                    }}
                  />
                  <label htmlFor="half-day-self-leave" className="cursor-pointer text-sm">
                    {t("form.duration.halfDay")}
                  </label>
                </div>
              </Field>

              <Field>
                <FieldLabel>{t("form.reason.label")}</FieldLabel>
                <Textarea rows={4} {...form.register("reason")} placeholder={t("form.reason.placeholder")} />
                <FieldError>{form.formState.errors.reason?.message}</FieldError>
              </Field>

              <DialogFooter>
                <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setFormOpen(false)}>
                  {t("actions.close")}
                </Button>
                <Button type="submit" className="cursor-pointer" disabled={createMutation.isPending || updateMutation.isPending}>
                  {t("actions.submit")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("cancelDialog.description")}</p>
            <Textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder={t("form.cancellationNote.placeholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setCancellingId(null)}>
              {t("cancelDialog.cancel")}
            </Button>
            <Button className="cursor-pointer" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {t("cancelDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
