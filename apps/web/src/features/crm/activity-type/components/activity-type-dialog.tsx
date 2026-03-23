"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { DynamicIcon } from "@/lib/icon-utils";
import { useActivityTypeForm } from "../hooks/use-activity-type-form";
import { LucideIconSelector } from "./lucide-icon-selector";
import type { ActivityType } from "../types";

export function ActivityTypeDialog({
  open,
  onOpenChange,
  editingItem,
  initialData,
  onCreated,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: ActivityType | null;
  readonly initialData?: { name?: string };
  readonly onCreated?: (item: ActivityType) => void;
}) {
  const { form, t, tCommon, isLoading, onSubmit } = useActivityTypeForm({
    open,
    onOpenChange,
    editingItem,
    initialData,
    onCreated,
  });
  const { register, setValue, watch, formState: { errors } } = form;
  const selectedIcon = watch("icon") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          <div className="grid grid-cols-1 gap-4">
            <Field>
              <FieldLabel>{t("form.icon")}</FieldLabel>
              <input type="hidden" {...register("icon")} />
              <div className="space-y-2">
                <LucideIconSelector
                  value={selectedIcon}
                  onChange={(iconName) => setValue("icon", iconName, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                  disabled={isLoading}
                />
              </div>
              {errors.icon && <FieldError>{errors.icon.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>{t("form.badgeColor")}</FieldLabel>
              <Input type="color" {...register("badge_color")} className="h-10 p-1" />
              {errors.badge_color && <FieldError>{errors.badge_color.message}</FieldError>}
            </Field>
          </div>
          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>
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
