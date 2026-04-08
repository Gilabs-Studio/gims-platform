"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProductCategoryForm } from "../../hooks/use-product-category-form";
import type { ProductCategory } from "../../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProductCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProductCategory | null;
  onCreated?: (id: string) => void;
}

export function ProductCategoryDialog({
  open,
  onOpenChange,
  editingItem,
  onCreated,
}: ProductCategoryDialogProps) {
  const {
    form,
    t,
    isEditing,
    isSubmitting,
    parentOptions,
    onSubmit,
  } = useProductCategoryForm({ open, onOpenChange, editingItem, onCreated });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const parentId = watch("parent_id");
  const categoryType = watch("category_type");

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
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>

          {/* Category Type Toggle */}
          <Field>
            <FieldLabel>{t("form.categoryType")}</FieldLabel>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setValue("category_type", "GOODS", { shouldValidate: true })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border py-2 px-3 text-sm font-medium cursor-pointer transition-all",
                  categoryType === "GOODS"
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-border bg-transparent text-muted-foreground hover:border-warning/50"
                )}
              >
                <Badge variant="warning" className="text-[10px] py-0 px-1.5">GOODS</Badge>
                <span>{t("categoryTypes.goods")}</span>
              </button>
              <button
                type="button"
                onClick={() => setValue("category_type", "FNB", { shouldValidate: true })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border py-2 px-3 text-sm font-medium cursor-pointer transition-all",
                  categoryType === "FNB"
                    ? "border-success bg-success/10 text-success"
                    : "border-border bg-transparent text-muted-foreground hover:border-success/50"
                )}
              >
                <Badge variant="success" className="text-[10px] py-0 px-1.5">F&B</Badge>
                <span>{t("categoryTypes.fnb")}</span>
              </button>
            </div>
          </Field>

          <Field>
            <FieldLabel>{t("form.parent")}</FieldLabel>
            <Select
              value={parentId ?? "none"}
              onValueChange={(val) => setValue("parent_id", val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root Category)</SelectItem>
                {parentOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t("form.description")}</FieldLabel>
            <Textarea
              placeholder={t("form.description")}
              className="resize-none"
              {...register("description")}
            />
            {errors.description && <span className="text-xs text-destructive">{errors.description.message}</span>}
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
