"use client";

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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EmployeeCertification } from "../../types";
import { useDeleteEmployeeCertification } from "../../hooks/use-employees";

interface DeleteCertificationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly certification: EmployeeCertification | null;
  readonly onSuccess?: () => void;
}

export function DeleteCertificationDialog({
  open,
  onOpenChange,
  employeeId,
  certification,
  onSuccess,
}: DeleteCertificationDialogProps) {
  const t = useTranslations("employee");
  const deleteMutation = useDeleteEmployeeCertification();

  const handleDelete = async () => {
    if (!certification) return;

    try {
      await deleteMutation.mutateAsync({
        employeeId,
        certId: certification.id,
      });
      toast.success(t("certification.success.deleted"));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("certification.error.deleteFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("certification.form.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("certification.form.deleteConfirm")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="cursor-pointer"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {deleteMutation.isPending
              ? t("certification.actions.processing")
              : t("certification.actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
