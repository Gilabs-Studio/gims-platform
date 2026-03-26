"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { usePipelineStageForm } from "../hooks/use-pipeline-stage-form";
import type { PipelineStage } from "../types";

export function PipelineStageDialog({ open, onOpenChange, editingItem }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly editingItem?: PipelineStage | null }) {
  const { form, t, tCommon, isLoading, onSubmit } = usePipelineStageForm({ open, onOpenChange, editingItem });
  const { register, setValue, watch, formState: { errors } } = form;

  const isWon = watch("is_won");
  const isLost = watch("is_lost");

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
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>{t("form.probability")}</FieldLabel>
              <Input type="number" min={0} max={100} {...register("probability", { valueAsNumber: true })} />
              {errors.probability && <FieldError>{errors.probability.message}</FieldError>}
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
                <FieldLabel>{t("form.isWon")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{t("form.isWonDescription")}</p>
              </div>
              <Switch checked={isWon} onCheckedChange={(val) => setValue("is_won", val)} className="cursor-pointer" />
            </Field>
            <Field orientation="horizontal" className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FieldLabel>{t("form.isLost")}</FieldLabel>
                <p className="text-sm text-muted-foreground">{t("form.isLostDescription")}</p>
              </div>
              <Switch checked={isLost} onCheckedChange={(val) => setValue("is_lost", val)} className="cursor-pointer" />
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
