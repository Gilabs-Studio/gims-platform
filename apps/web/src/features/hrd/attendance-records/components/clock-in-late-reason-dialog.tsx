"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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

interface ClockInLateReasonDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly lateMinutes: number;
  readonly isPending: boolean;
  readonly onConfirm: (reason: string) => void;
}

export function ClockInLateReasonDialog({
  open,
  onOpenChange,
  lateMinutes,
  isPending,
  onConfirm,
}: ClockInLateReasonDialogProps) {
  const t = useTranslations("hrd.attendance");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lateDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("lateDialog.description", { minutes: lateMinutes })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="late-reason">{t("lateDialog.reasonLabel")}</Label>
          <Textarea
            id="late-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("lateDialog.reasonPlaceholder")}
            maxLength={500}
            rows={3}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/500
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="cursor-pointer"
          >
            {t("lateDialog.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isPending}
            className="cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t("lateDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
