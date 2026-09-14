"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  returnAssetSchema,
  type ReturnAssetFormValues,
} from "../schemas/asset-borrowing.schema";
import type { BorrowingRequest } from "../types";
import { toast } from "sonner";

interface ReturnAssetDialogProps {
  open: boolean;
  onClose: () => void;
  request: BorrowingRequest | null;
  onSubmit: (id: string, data: ReturnAssetFormValues) => void;
}

export function ReturnAssetDialog({
  open,
  onClose,
  request,
  onSubmit,
}: ReturnAssetDialogProps) {
  const t = useTranslations("assetBorrowing");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReturnAssetFormValues>({
    resolver: zodResolver(returnAssetSchema),
    defaultValues: {
      return_condition: "good",
      return_notes: "",
    },
  });

  const returnConditionVal = watch("return_condition");

  if (!request) return null;

  const handleFormSubmit = (data: ReturnAssetFormValues) => {
    onSubmit(request.id, data);
    toast.success(t("messages.returnSuccess"));
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.returnTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.returnDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30 my-1">
          <p className="font-semibold text-sm">{request.asset_name}</p>
          <p className="text-muted-foreground">
            {t("table.requestCode")}: <span className="font-medium text-foreground">{request.request_number}</span>
          </p>
          <p className="text-muted-foreground">
            {t("table.borrower")}: <span className="font-medium text-foreground">{request.borrower_name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="return_condition">
                {t("dialogs.returnCondition")}
              </FieldLabel>
              <Select
                value={returnConditionVal}
                onValueChange={(val) =>
                  setValue("return_condition", val as ReturnAssetFormValues["return_condition"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="return_condition" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent" className="cursor-pointer">Sangat Baik (Excellent)</SelectItem>
                  <SelectItem value="good" className="cursor-pointer">Baik (Good)</SelectItem>
                  <SelectItem value="fair" className="cursor-pointer">Cukup (Fair)</SelectItem>
                  <SelectItem value="damaged" className="cursor-pointer text-destructive">Rusak (Damaged)</SelectItem>
                  <SelectItem value="under_repair" className="cursor-pointer text-warning">Butuh Servis (Under Repair)</SelectItem>
                </SelectContent>
              </Select>
              {errors.return_condition && (
                <FieldError>{errors.return_condition.message}</FieldError>
              )}
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="return_notes">{t("dialogs.returnNotes")}</FieldLabel>
              <Textarea
                id="return_notes"
                rows={3}
                placeholder={t("dialogs.returnNotesPlaceholder")}
                {...register("return_notes")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:shadow-lg transition-all duration-300"
            >
              {t("actions.returnAsset")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
