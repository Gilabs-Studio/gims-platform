"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreaForm } from "../../hooks/use-area-form";
import { ButtonLoading } from "@/components/loading";
import { Area } from "../../types";

export interface AreaFormProps {
  open: boolean;
  onClose: () => void;
  area?: Area | null;
  /** When true, the form renders without its own Dialog wrapper */
  embedded?: boolean;
}

// Predefined color palette for area map rendering
const AREA_COLORS = [
  { label: "Blue", value: "var(--color-primary)" },
  { label: "Green", value: "var(--color-success)" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Pink", value: "#ec4899" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Orange", value: "#f97316" },
  { label: "Lime", value: "#84cc16" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Rose", value: "#f43f5e" },
];

function AreaFormContent({ open, onClose, area }: Omit<AreaFormProps, "embedded">) {
  const { form, t, isEditing, isLoading, employees, onSubmit } = useAreaForm({ open, onClose, area });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedColor = watch("color");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.name")}</FieldLabel>
          <Input
            placeholder={t("area.form.namePlaceholder")}
            {...register("name")}
          />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </Field>

        {/* Code */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.code")}</FieldLabel>
          <Input placeholder="e.g. JAWA-BARAT" {...register("code")} />
          {errors.code && <FieldError>{errors.code.message}</FieldError>}
        </Field>
      </div>

      {/* Description */}
      <Field orientation="vertical">
        <FieldLabel>{t("area.form.description")}</FieldLabel>
        <Textarea
          placeholder={t("area.form.descriptionPlaceholder")}
          {...register("description")}
          rows={2}
        />
        {errors.description && (
          <FieldError>{errors.description.message}</FieldError>
        )}
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Province */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.province")}</FieldLabel>
          <Input placeholder="e.g. Jawa Barat" {...register("province")} />
        </Field>

        {/* Regency */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.regency")}</FieldLabel>
          <Input placeholder="e.g. Bandung" {...register("regency")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* District */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.district")}</FieldLabel>
          <Input placeholder="e.g. Coblong" {...register("district")} />
        </Field>

        {/* Manager */}
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.manager")}</FieldLabel>
          <Select
            value={watch("manager_id") ?? ""}
            onValueChange={(val) => setValue("manager_id", val === "none" ? "" : val)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder={t("area.form.selectManager")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("common.none")}</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Color */}
      <Field orientation="vertical">
        <FieldLabel>{t("area.form.color")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {AREA_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setValue("color", c.value)}
              className="w-8 h-8 rounded-lg border-2 cursor-pointer transition-all hover:scale-110"
              style={{
                backgroundColor: c.value,
                borderColor: selectedColor === c.value ? "var(--foreground)" : "transparent",
              }}
              title={c.label}
            />
          ))}
        </div>
      </Field>

      {/* Active toggle */}
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="cursor-pointer"
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading} className="cursor-pointer">
          <ButtonLoading loading={isLoading} loadingText="Saving...">
            {isEditing ? t("common.save") : t("common.create")}
          </ButtonLoading>
        </Button>
      </div>
    </form>
  );
}

export function AreaForm({ open, onClose, area, embedded }: AreaFormProps) {
  // When embedded in a parent Dialog, render form content only
  if (embedded) {
    return <AreaFormContent open={open} onClose={onClose} area={area} />;
  }

  // Standalone usage with its own Dialog wrapper
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {area ? "Edit Area" : "Create Area"}
          </DialogTitle>
        </DialogHeader>
        <AreaFormContent open={open} onClose={onClose} area={area} />
      </DialogContent>
    </Dialog>
  );
}
