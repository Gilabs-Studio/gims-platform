"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { useLeadSourceForm } from "../hooks/use-lead-source-form";
import type { LeadSource } from "../types";

export function LeadSourceDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
  initialData,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingItem?: LeadSource | null;
  readonly onCreated?: (item: { id: string; name: string }) => void;
  readonly initialData?: { name?: string };
}) {
  const { form, t, tCommon, isLoading, onSubmit } = useLeadSourceForm({
    open,
    onOpenChange,
    editingItem,
    onCreated,
    initialData,
  });
  const { register, formState: { errors } } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{editingItem ? t("edit") : t("create")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field><FieldLabel>{t("form.name")}</FieldLabel><Input placeholder={t("form.namePlaceholder")} {...register("name")} />{errors.name && <FieldError>{errors.name.message}</FieldError>}</Field>
          <Field><FieldLabel>{t("form.description")}</FieldLabel><Textarea placeholder={t("form.descriptionPlaceholder")} {...register("description")} />{errors.description && <FieldError>{errors.description.message}</FieldError>}</Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">{tCommon("cancel")}</Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer"><ButtonLoading loading={isLoading} loadingText={tCommon("saving")}>{tCommon("save")}</ButtonLoading></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
