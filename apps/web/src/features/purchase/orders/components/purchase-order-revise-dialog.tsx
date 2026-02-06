"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { useRevisePurchaseOrder } from "../hooks/use-purchase-orders";

interface PurchaseOrderReviseDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly purchaseOrderId?: string | null;
}

export function PurchaseOrderReviseDialog({
  open,
  onClose,
  purchaseOrderId,
}: PurchaseOrderReviseDialogProps) {
  const t = useTranslations("purchaseOrder");
  const mutate = useRevisePurchaseOrder();

  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setComment("");
    setTouched(false);
  }, [open]);

  const isInvalid = touched && comment.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t("revise.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("revise.comment")}</FieldLabel>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setTouched(true);
              }}
            />
            {isInvalid ? <FieldError>{t("validation.required")}</FieldError> : null}
          </Field>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={mutate.isPending || comment.trim().length === 0 || !purchaseOrderId}
              onClick={async () => {
                if (!purchaseOrderId) return;
                try {
                  await mutate.mutateAsync({
                    id: purchaseOrderId,
                    data: { revision_comment: comment.trim() },
                  });
                  toast.success(t("toast.revised"));
                  onClose();
                } catch {
                  toast.error(t("toast.failed"));
                }
              }}
            >
              {mutate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("actions.revise")}
                </>
              ) : (
                t("actions.revise")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
