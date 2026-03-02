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
import type { EmployeeAsset } from "../../types";
import { useDeleteEmployeeAsset } from "../../hooks/use-employees";

interface DeleteAssetDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employeeId: string;
  readonly asset: EmployeeAsset | null;
  readonly onSuccess?: () => void;
}

export function DeleteAssetDialog({
  open,
  onOpenChange,
  employeeId,
  asset,
  onSuccess,
}: DeleteAssetDialogProps) {
  const t = useTranslations("employee");
  const deleteMutation = useDeleteEmployeeAsset();

  const handleDelete = async () => {
    if (!asset) return;

    try {
      await deleteMutation.mutateAsync({
        employeeId,
        assetId: asset.id,
      });
      toast.success(t("asset.success.deleted"));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("asset.error.deleteFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("asset.form.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("asset.form.deleteConfirm")}
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
              ? t("asset.actions.processing")
              : t("asset.actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
