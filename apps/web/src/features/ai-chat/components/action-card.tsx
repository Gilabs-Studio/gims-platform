"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useConfirmAction } from "../hooks/use-ai-chat";
import type { AIActionPreview } from "../types";

interface ActionCardProps {
  action: AIActionPreview;
  sessionId: string;
}

export function ActionCard({ action, sessionId }: ActionCardProps) {
  const t = useTranslations("aiChat");
  const confirmAction = useConfirmAction();

  const isPending = action.status === "PENDING_CONFIRMATION";
  const isSuccess = action.status === "SUCCESS";
  const isFailed = action.status === "FAILED";
  const isCancelled = action.status === "CANCELLED";

  const handleConfirm = () => {
    confirmAction.mutate({
      action_id: action.id,
      confirmed: true,
    });
  };

  const handleCancel = () => {
    confirmAction.mutate({
      action_id: action.id,
      confirmed: false,
    });
  };

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border p-3",
        isPending && "border-warning/40 bg-warning/5",
        isSuccess && "border-success/40 bg-success/5",
        isFailed && "border-destructive/40 bg-destructive/5",
        isCancelled && "border-muted bg-muted/30"
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        {isPending && (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
        {isSuccess && (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
        {isFailed && (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        {isCancelled && (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {isPending ? t("action.title") : t(`action.${action.status?.toLowerCase() ?? "pending"}`)}
        </span>
        <Badge
          variant="outline"
          className="ml-auto text-xs"
        >
          {action.intent}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-muted-foreground">
        {action.entity_type && (
          <p>
            <span className="font-medium">Entity:</span> {action.entity_type}
            {action.entity_id ? ` (${action.entity_id})` : ""}
          </p>
        )}
        {action.payload_preview && (
          <p className="truncate">
            <span className="font-medium">Payload:</span>{" "}
            {action.payload_preview}
          </p>
        )}
      </div>

      {/* Confirm/Cancel Buttons */}
      {isPending && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 cursor-pointer text-xs"
            onClick={handleConfirm}
            disabled={confirmAction.isPending}
          >
            {confirmAction.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            )}
            {t("action.confirm")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 cursor-pointer text-xs"
            onClick={handleCancel}
            disabled={confirmAction.isPending}
          >
            <XCircle className="mr-1 h-3 w-3" />
            {t("action.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
