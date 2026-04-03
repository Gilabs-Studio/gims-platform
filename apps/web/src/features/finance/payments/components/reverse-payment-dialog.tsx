"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function ReversePaymentDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: Props) {
  const t = useTranslations("financePayments");
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    await onConfirm(reason);
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.reverse")}</DialogTitle>
          <DialogDescription>
            {t("reverse.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("reverse.warningTitle")}</AlertTitle>
            <AlertDescription>
              {t("reverse.warningDescription")}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">{t("fields.reason")}</Label>
            <Textarea
              id="reason"
              placeholder={t("placeholders.reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("form.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? t("actions.reversing") : t("actions.reverse")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
