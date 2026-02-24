"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { useLeaveTypeForm } from "../hooks/use-leave-type-form";
import type { LeaveType } from "../types";

export function LeaveTypeDialog({ open, onOpenChange, editingItem }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly editingItem?: LeaveType | null }) {
  const { form, t, tCommon, isLoading, onSubmit } = useLeaveTypeForm({ open, onOpenChange, editingItem });
  
  const { register, setValue, watch, formState: { errors } } = form;

  const isActive = watch("is_active");
  const isPaid = watch("is_paid");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Field>
              <FieldLabel>{t("form.name")}</FieldLabel>
              <Input placeholder={t("form.namePlaceholder")} {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("form.maxDays")}</FieldLabel>
            <Input type="number" min={0} placeholder={t("form.maxDaysPlaceholder")} {...register("max_days", { valueAsNumber: true })} />
            {errors.max_days && <FieldError>{errors.max_days.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5"><FieldLabel>{t("form.isPaid")}</FieldLabel><p className="text-sm text-muted-foreground">{isPaid ? "Paid Leave" : "Unpaid Leave"}</p></div>
              <Switch checked={isPaid} onCheckedChange={(val) => setValue("is_paid", val)} className="cursor-pointer" />
            </Field>
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5"><FieldLabel>{t("form.isActive")}</FieldLabel><p className="text-sm text-muted-foreground">{isActive ? tCommon("active") : tCommon("inactive")} status</p></div>
              <Switch checked={isActive} onCheckedChange={(val) => setValue("is_active", val)} className="cursor-pointer" />
            </Field>
          </div>
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
