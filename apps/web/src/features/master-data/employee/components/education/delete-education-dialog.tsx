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
import type { EmployeeEducationHistory } from "../../types";
import { useDeleteEmployeeEducationHistory } from "../../hooks/use-employees";

interface DeleteEducationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly education: EmployeeEducationHistory | null;
  readonly onSuccess?: () => void;
}

export function DeleteEducationDialog({
  open,
  onOpenChange,
  employeeId,
  education,
  onSuccess,
}: DeleteEducationDialogProps) {
  const t = useTranslations("employee");
  const deleteMutation = useDeleteEmployeeEducationHistory();

  const handleDelete = async () => {
    if (!education) return;

    try {
      await deleteMutation.mutateAsync({
        employeeId,
        educationId: education.id,
      });
      toast.success(t("education.success.deleted"));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("education.error.deleteFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("education.form.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("education.form.deleteConfirm")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="cursor-pointer"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {deleteMutation.isPending
              ? t("education.actions.processing")
              : t("education.actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
