"use client";

import { useState } from "react";
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
import { Loader2, Check, X, Clock, User, Calendar } from "lucide-react";
import { useApproveOvertime, useRejectOvertime } from "../hooks/use-overtime";
import type { OvertimeRequest } from "../types";
import { format } from "date-fns";

interface OvertimeApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OvertimeRequest | null;
  action: "approve" | "reject" | null;
}

export function OvertimeApprovalDialog({
  open,
  onOpenChange,
  item,
  action,
}: OvertimeApprovalDialogProps) {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");

  const [approvedMinutes, setApprovedMinutes] = useState<number | undefined>(
    item?.requested_minutes
  );
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  const handleApprove = async () => {
    if (!item) return;
    try {
      await approveMutation.mutateAsync({
        id: item.id,
        data: approvedMinutes !== item.requested_minutes 
          ? { approved_minutes: approvedMinutes }
          : undefined,
      });
      toast.success(t("messages.approveSuccess"));
      onOpenChange(false);
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
        data: { rejection_reason: rejectionReason },
      });
      toast.success(t("messages.rejectSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!item || !action) return null;

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
              <p className="font-medium">{item.employee_name}</p>
              {item.employee_code && (
                <p className="text-xs text-muted-foreground">
                  {item.employee_code}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(item.date), "EEEE, dd MMMM yyyy")}</span>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(item.start_time)} - {formatTime(item.end_time)}
            </span>
            <Badge variant="secondary">
              {formatMinutes(item.requested_minutes)}
            </Badge>
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
                  max={item.requested_minutes}
                  value={approvedMinutes ?? item.requested_minutes}
                  onChange={(e) =>
                    setApprovedMinutes(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
                {approvedMinutes && (
                  <Badge variant="outline">
                    {formatMinutes(approvedMinutes)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                You can adjust the approved overtime duration if needed
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
              className="cursor-pointer bg-green-600 hover:bg-green-700"
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <X className="mr-2 h-4 w-4" />
              {t("actions.reject")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
