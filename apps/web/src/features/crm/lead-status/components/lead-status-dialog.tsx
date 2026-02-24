"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { useLeadStatusForm } from "../hooks/use-lead-status-form";
import type { LeadStatus } from "../types";

export function LeadStatusDialog({ open, onOpenChange, editingItem }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly editingItem?: LeadStatus | null }) {
  const { form, t, tCommon, isLoading, onSubmit } = useLeadStatusForm({ open, onOpenChange, editingItem });
  const { register, setValue, watch, formState: { errors } } = form;

  const isActive = watch("is_active");
  const isDefault = watch("is_default");
  const isConverted = watch("is_converted");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("form.name")}</FieldLabel>
              <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("form.code")}</FieldLabel>
              <Input placeholder={t("form.codePlaceholder")} {...register("code")} />
              {errors.code && <FieldError>{errors.code.message}</FieldError>}
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel>{t("form.score")}</FieldLabel>
              <Input type="number" min={0} max={100} {...register("score", { valueAsNumber: true })} />
              {errors.score && <FieldError>{errors.score.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("form.order")}</FieldLabel>
              <Input type="number" min={0} {...register("order", { valueAsNumber: true })} />
              {errors.order && <FieldError>{errors.order.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("form.color")}</FieldLabel>
              <Input type="color" {...register("color")} className="h-10 p-1" />
              {errors.color && <FieldError>{errors.color.message}</FieldError>}
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isDefault")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{t("form.isDefaultDescription")}</p>
              </div>
              <Switch checked={isDefault} onCheckedChange={(val) => setValue("is_default", val)} className="cursor-pointer" />
            </Field>
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isConverted")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{t("form.isConvertedDescription")}</p>
              </div>
              <Switch checked={isConverted} onCheckedChange={(val) => setValue("is_converted", val)} className="cursor-pointer" />
            </Field>
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isActive")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{isActive ? tCommon("active") : tCommon("inactive")} status</p>
              </div>
              <Switch checked={isActive} onCheckedChange={(val) => setValue("is_active", val)} className="cursor-pointer" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">{tCommon("cancel")}</Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              <ButtonLoading loading={isLoading} loadingText={tCommon("saving")}>{tCommon("save")}</ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
