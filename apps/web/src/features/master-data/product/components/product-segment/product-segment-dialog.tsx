"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { useProductSegmentForm } from "../../hooks/use-product-segment-form";
import type { ProductSegment } from "../../types";

export interface ProductSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProductSegment | null;
  onCreated?: (id: string) => void;
}

export function ProductSegmentDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
}: ProductSegmentDialogProps) {
  const {
    form,
    t,
    tValidation,
    isEditing,
    isSubmitting,
    onSubmit,
  } = useProductSegmentForm({ open, onOpenChange, editingItem, onCreated });

  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("edit") : t("create")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>{t("form.name")}</FieldLabel>
            <Input placeholder={t("form.name")} {...register("name")} />
            {errors.name && <FieldError>{tValidation("required")}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea
              placeholder={t("form.description")}
              className="resize-none"
              {...register("description")}
            />
            {errors.description && <FieldError>{tValidation("maxLength")}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              <ButtonLoading loading={isSubmitting} loadingText="Saving...">
                {isEditing ? "Save" : "Create"}
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
