"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Clock, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useMyOvertimeRequests,
  useCancelOvertimeRequest,
} from "../hooks/use-overtime";
import type { OvertimeRequest, OvertimeStatus } from "../types";
import { cn } from "@/lib/utils";

function statusVariant(
  status: OvertimeStatus,
): "default" | "secondary" | "destructive" | "outline" {
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
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  } catch {
    return `${startTime} - ${endTime}`;
  }
}

export function SelfOvertimeTab() {
  const t = useTranslations("hrd.overtime");
  const tCommon = useTranslations("common");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const {
    data: listData,
    isLoading,
    isError,
    error,
  } = useMyOvertimeRequests({
    per_page: 50,
  });

  const cancelMutation = useCancelOvertimeRequest();

  const requests = listData?.data ?? [];

  // Debug logging
  useEffect(() => {
    console.log("[SelfOvertimeTab] Data:", listData);
    console.log("[SelfOvertimeTab] Requests:", requests);
    console.log("[SelfOvertimeTab] isLoading:", isLoading);
    console.log("[SelfOvertimeTab] isError:", isError);
    if (error) {
      console.error("[SelfOvertimeTab] Error:", error);
    }
  }, [listData, requests, isLoading, isError, error]);

  const handleCancel = async () => {
    if (!cancellingId) return;
    try {
      await cancelMutation.mutateAsync(cancellingId);
      toast.success(t("messages.cancelSuccess"));
      setCancellingId(null);
    } catch {
      toast.error(t("messages.cancelError"));
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "AUTO_DETECTED":
        return t("requestTypes.autoDetected");
      case "MANUAL_CLAIM":
        return t("requestTypes.manualClaim");
      case "PRE_APPROVED":
        return t("requestTypes.preApproved");
      default:
        return type;
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        {t("emptyState.noOvertime")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        {t("emptyState.autoDetectInfo")}
      </p>
    </div>
  );

  const renderOvertimeCard = (item: OvertimeRequest) => (
    <div key={item.id} className="rounded-md border p-3">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">
            {format(parseISO(item.date), "EEEE, d MMMM yyyy")}
          </div>
          <div className="text-xs text-muted-foreground">
            {getRequestTypeLabel(item.request_type)}
          </div>
        </div>
        <Badge variant={statusVariant(item.status)}>
          {t(`status.${item.status.toLowerCase()}`)}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatTimeRange(item.start_time, item.end_time)}</span>
          <span className="text-muted-foreground">
            ({formatDuration(item.actual_minutes)})
          </span>
        </div>

        {item.approved_by_name && (
          <div className="text-xs text-muted-foreground">
            {t("approvedBy")}: {item.approved_by_name}
          </div>
        )}

        {item.rejected_by_name && (
          <div className="text-xs text-muted-foreground">
            {t("fields.rejectedBy")}: {item.rejected_by_name}
          </div>
        )}

        {item.reject_reason && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {t("fields.rejectReason")}:
            </div>
            <div className="flex items-start gap-1 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3" />
              <span>{item.reject_reason}</span>
            </div>
          </div>
        )}
      </div>

      {item.status === "PENDING" && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-destructive"
            onClick={() => setCancellingId(item.id)}
          >
            <XCircle className="mr-1 h-4 w-4" />
            {tCommon("cancel")}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 p-1">
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full" />
          ))
        ) : isError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">
              {t("errors.fetchFailed")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        ) : requests.length === 0 ? (
          renderEmptyState()
        ) : (
          requests.map(renderOvertimeCard)
        )}
      </div>

      <Dialog
        open={!!cancellingId}
        onOpenChange={(open) => !open && setCancellingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("cancelDialog.description")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCancellingId(null)}
            >
              {tCommon("no")}
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {tCommon("yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
