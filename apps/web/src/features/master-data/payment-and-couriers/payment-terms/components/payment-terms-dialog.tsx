"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { usePaymentTermsForm } from "../hooks/use-payment-terms-form";
import type { PaymentTerms } from "../types";

export interface PaymentTermsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: PaymentTerms | null;
  readonly initialData?: { name?: string };
  /** Called after a successful create with id and name of the new item */
  readonly onCreated?: (item: { id: string; name: string }) => void;
}

export function PaymentTermsDialog({
  open,
  onOpenChange,
  editingItem,
  initialData,
  onCreated,
}: PaymentTermsDialogProps) {
  const { form, t, tCommon, isLoading, onSubmit } = usePaymentTermsForm({
    open,
    onOpenChange,
    editingItem,
    initialData,
    onCreated,
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input
              placeholder={t("form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.days")}</FieldLabel>
            <Input
              type="number"
              min={0}
              placeholder={t("form.daysPlaceholder")}
              {...register("days", { valueAsNumber: true })}
            />
            {errors.days && <FieldError>{errors.days.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea
              placeholder={t("form.descriptionPlaceholder")}
              {...register("description")}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              <ButtonLoading loading={isLoading} loadingText={tCommon("saving")}>
                {tCommon("save")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
