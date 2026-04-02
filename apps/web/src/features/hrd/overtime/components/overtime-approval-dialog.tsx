"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Clock,
  User,
  Calendar,
  Building2,
} from "lucide-react";
import { useApproveOvertime, useRejectOvertime } from "../hooks/use-overtime";
import type { OvertimeRequest } from "../types";
import { format } from "date-fns";

interface OvertimeApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OvertimeRequest | null;
  action: "approve" | "reject" | null;
  onSuccess?: () => void;
}

export function OvertimeApprovalDialog({
  open,
  onOpenChange,
  item,
  action,
  onSuccess,
}: OvertimeApprovalDialogProps) {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");

  const [approvedMinutes, setApprovedMinutes] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && item) {
      // Set default approved minutes to planned_minutes (or actual_minutes if planned is 0)
      const defaultMinutes =
        item.planned_minutes > 0 ? item.planned_minutes : item.actual_minutes;
      setApprovedMinutes(defaultMinutes);
      setRejectionReason("");
    } else if (!open) {
      // Clear state when dialog closes
      setApprovedMinutes(0);
      setRejectionReason("");
    }
  }, [open, item]);

  const handleApprove = async () => {
    if (!item) return;
    try {
      await approveMutation.mutateAsync({
        id: item.id,
        data: { approved_minutes: approvedMinutes },
      });
      toast.success(t("messages.approveSuccess"));
      // Reset state after successful action
      setApprovedMinutes(0);
      setRejectionReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleReject = async () => {
    if (!item) return;
    if (!rejectionReason.trim()) {
      toast.error(t("validation.rejectionReasonRequired"));
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        id: item.id,
        data: { reason: rejectionReason },
      });
      toast.success(t("messages.rejectSuccess"));
      // Reset state after successful action
      setApprovedMinutes(0);
      setRejectionReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes || minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  // Calculate duration from start and end time for display
  const calculateDuration = (startTime: string, endTime: string) => {
    const start = startTime.substring(0, 5);
    const end = endTime.substring(0, 5);
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // If end time is before start time, assume it's next day
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const duration = endMinutes - startMinutes;
    return duration;
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!item || !action) return null;

  // Calculate actual duration from time range
  const calculatedDuration = calculateDuration(item.start_time, item.end_time);
  const displayMinutes =
    item.planned_minutes > 0 ? item.planned_minutes : calculatedDuration;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "approve" ? t("actions.approve") : t("actions.reject")}{" "}
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            Review the overtime request details below
          </DialogDescription>
        </DialogHeader>

        {/* Request Details */}
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{item.employee_name || "-"}</p>
              {item.employee_code && (
                <p className="text-xs text-muted-foreground">
                  {item.employee_code}
                </p>
              )}
            </div>
          </div>

          {item.division_name && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {item.division_name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(item.date), "EEEE, dd MMMM yyyy")}</span>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(item.start_time)} - {formatTime(item.end_time)}
            </span>
            <Badge variant="secondary">{formatMinutes(displayMinutes)}</Badge>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Reason:</p>
            <p className="text-sm">{item.reason}</p>
          </div>
        </div>

        {/* Action Form */}
        {action === "approve" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approved-minutes">
                {t("fields.approvedMinutes")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="approved-minutes"
                  type="number"
                  min={1}
                  max={displayMinutes}
                  value={approvedMinutes}
                  onChange={(e) =>
                    setApprovedMinutes(Number(e.target.value) || 0)
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
                <Badge variant="outline">
                  {formatMinutes(approvedMinutes)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Default set to planned duration: {formatMinutes(displayMinutes)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              {t("fields.rejectionReason")} *
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {tCommon("cancel")}
          </Button>
          {action === "approve" ? (
            <Button
              onClick={handleApprove}
              disabled={isPending}
              className="cursor-pointer bg-success hover:bg-success"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="mr-2 h-4 w-4" />
              {t("actions.approve")}
            </Button>
          ) : (
            <Button
              onClick={handleReject}
              disabled={isPending || !rejectionReason.trim()}
              variant="destructive"
              className="cursor-pointer"
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 h-4 w-4 animate-spin" />
              )}
              <X className="mr-2 h-4 w-4" />
              {t("actions.reject")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
