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
import { useCourierAgencyForm } from "../hooks/use-courier-agency-form";
import type { CourierAgency } from "../types";

export interface CourierAgencyDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: CourierAgency | null;
  /** Called after a successful create with id and name of the new item */
  readonly onCreated?: (item: { id: string; name: string }) => void;
}

export function CourierAgencyDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
}: CourierAgencyDialogProps) {
  const { form, t, tCommon, isLoading, onSubmit } = useCourierAgencyForm({
    open,
    onOpenChange,
    editingItem,
    onCreated,
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const trackingUrl = watch("tracking_url");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Field>
              <FieldLabel>{t("form.name")}</FieldLabel>
              <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </div>

          <Field>
            <FieldLabel>{t("form.phone")}</FieldLabel>
            <Input placeholder={t("form.phonePlaceholder")} {...register("phone")} />
            {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>
              {t("form.trackingUrl")}
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Test Link
                </a>
              )}
            </FieldLabel>
            <Input placeholder={t("form.trackingUrlPlaceholder")} {...register("tracking_url")} />
            {errors.tracking_url && <FieldError>{errors.tracking_url.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.address")}</FieldLabel>
            <Textarea placeholder={t("form.addressPlaceholder")} {...register("address")} />
            {errors.address && <FieldError>{errors.address.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
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
