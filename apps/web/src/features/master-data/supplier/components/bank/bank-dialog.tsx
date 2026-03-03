"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { useBankForm } from "../../hooks/use-bank-form";
import type { Bank } from "../../types";

export interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Bank | null;
}

export function BankDialog({
  open,
  onOpenChange,
  editingItem,
}: BankDialogProps) {
  const {
    form,
    t,
    tCommon,
    tValidation,
    isEditing,
    isSubmitting,
    onSubmit,
  } = useBankForm({ open, onOpenChange, editingItem });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;


  const isActive = watch("is_active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
            {errors.name && <FieldError>{tValidation("nameRequired")}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.code")}</FieldLabel>
            <Input
              placeholder={t("form.codePlaceholder")}
              {...register("code")}
            />
            {errors.code && <FieldError>{tValidation("codeRequired")}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.swiftCode")}</FieldLabel>
            <Input
              placeholder={t("form.swiftCodePlaceholder")}
              {...register("swift_code")}
            />
            {errors.swift_code && <FieldError>{errors.swift_code.message}</FieldError>}
          </Field>

          <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FieldLabel>{t("form.isActive")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {tCommon("active")} / {tCommon("inactive")} status
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(val) => setValue("is_active", val)}
              className="cursor-pointer"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                {isEditing ? tCommon("save") : tCommon("create")}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
