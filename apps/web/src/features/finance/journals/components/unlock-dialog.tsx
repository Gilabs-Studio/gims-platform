"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { Label } from "@/components/ui/label";

import { useUnlockFinanceValuation } from "../hooks/use-finance-journals";

interface UnlockDialogProps {
  valuationRunId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UnlockDialog({
  valuationRunId,
  open,
  onOpenChange,
  onSuccess,
}: UnlockDialogProps) {
  const t = useTranslations("finance.journal");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const { mutateAsync: unlock, isPending } = useUnlockFinanceValuation();

  const handleUnlock = async () => {
    // Validate reason
    if (!reason.trim()) {
      setReasonError(t("unlock_reason_required"));
      return;
    }

    if (reason.trim().length < 3) {
      setReasonError(t("unlock_reason_min_length"));
      return;
    }

    try {
      await unlock({
        id: valuationRunId!,
        reason: reason.trim(),
      });

      toast.success(t("unlock_success"));
      setReason("");
      setReasonError("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("unlock_failed");
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {t("unlock_valuation")}
          </DialogTitle>
          <DialogDescription>
            {t("unlock_confirmation")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
            <p className="font-medium">{t("unlock_warning")}</p>
            <p className="mt-1 text-xs">
              {t("unlock_reason_required_audit")}
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="unlock-reason" className="text-sm font-medium">
              {t("unlock_reason")} *
            </Label>
            <Textarea
              id="unlock-reason"
              placeholder={t("unlock_reason_placeholder")}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError("");
              }}
              disabled={isPending}
              className="min-h-24 resize-none"
            />
            {reasonError && (
              <p className="text-xs text-red-600">{reasonError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {reason.length} {t("characters")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleUnlock}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("unlock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
