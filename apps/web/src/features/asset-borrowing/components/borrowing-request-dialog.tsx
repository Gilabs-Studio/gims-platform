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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  createBorrowingSchema,
  type CreateBorrowingFormValues,
} from "../schemas/asset-borrowing.schema";
import type { AssetItem } from "../types";
import { toast } from "sonner";

interface BorrowingRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBorrowingFormValues) => void;
  availableAssets: AssetItem[];
  selectedAssetId?: string;
}

export function BorrowingRequestDialog({
  open,
  onClose,
  onSubmit,
  availableAssets,
  selectedAssetId,
}: BorrowingRequestDialogProps) {
  const t = useTranslations("assetBorrowing");

  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBorrowingFormValues>({
    resolver: zodResolver(createBorrowingSchema),
    defaultValues: {
      asset_id: selectedAssetId ?? "",
      borrow_date: today,
      expected_return_date: nextWeek,
      purpose: "",
      initial_condition_notes: "",
    },
  });

  const selectedAssetVal = watch("asset_id");

  const handleFormSubmit = (data: CreateBorrowingFormValues) => {
    onSubmit(data);
    toast.success(t("messages.requestSuccess"));
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.requestTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.requestDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-4">
            {/* Asset Selection */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="asset_id">{t("dialogs.selectAsset")}</FieldLabel>
              <Select
                value={selectedAssetVal}
                onValueChange={(val) => setValue("asset_id", val, { shouldValidate: true })}
              >
                <SelectTrigger id="asset_id" className="w-full cursor-pointer">
                  <SelectValue placeholder={t("dialogs.selectAsset")} />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets
                    .filter((a) => a.status === "available" || a.id === selectedAssetId)
                    .map((asset) => (
                      <SelectItem key={asset.id} value={asset.id} className="cursor-pointer">
                        {asset.code} - {asset.name} ({asset.location})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.asset_id && <FieldError>{errors.asset_id.message}</FieldError>}
            </Field>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="borrow_date">{t("dialogs.borrowDate")}</FieldLabel>
                <Input id="borrow_date" type="date" {...register("borrow_date")} />
                {errors.borrow_date && (
                  <FieldError>{errors.borrow_date.message}</FieldError>
                )}
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="expected_return_date">
                  {t("dialogs.expectedReturn")}
                </FieldLabel>
                <Input
                  id="expected_return_date"
                  type="date"
                  {...register("expected_return_date")}
                />
                {errors.expected_return_date && (
                  <FieldError>{errors.expected_return_date.message}</FieldError>
                )}
              </Field>
            </div>

            {/* Purpose */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="purpose">{t("dialogs.purposeLabel")}</FieldLabel>
              <Textarea
                id="purpose"
                rows={3}
                placeholder={t("dialogs.purposePlaceholder")}
                {...register("purpose")}
              />
              <FieldDescription>
                {t("dialogs.purposePlaceholder")}
              </FieldDescription>
              {errors.purpose && <FieldError>{errors.purpose.message}</FieldError>}
            </Field>

            {/* Initial Notes */}
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="initial_condition_notes">
                {t("dialogs.initialNotesLabel")}
              </FieldLabel>
              <Input
                id="initial_condition_notes"
                placeholder={t("dialogs.initialNotesPlaceholder")}
                {...register("initial_condition_notes")}
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
              {t("actions.requestBorrowing")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
