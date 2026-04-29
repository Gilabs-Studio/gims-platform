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
import { getTemplateColors } from "@/lib/color-utils";
import { ButtonLoading } from "@/components/loading";
import { Area } from "../../types";

export interface AreaFormProps {
  open: boolean;
  onClose: () => void;
  onCreateSuccess?: () => void;
  area?: Area | null;
  /** When true, the form renders without its own Dialog wrapper */
  embedded?: boolean;
  initialPolygon?: GeoJSON.Geometry | null;
  initialSelectedCities?: string[];
  /** Areas that will lose cities to the new area on create */
  conflictedAreaUpdates?: Array<{ id: string; regency: string }>;
}

function AreaFormContent({ open, onClose, onCreateSuccess, area, initialPolygon, initialSelectedCities, conflictedAreaUpdates }: Omit<AreaFormProps, "embedded">) {
  const { form, t, isEditing, isLoading, employees, onSubmit } = useAreaForm({
    open,
    onClose,
    onCreateSuccess,
    area,
    initialPolygon,
    initialSelectedCities,
    conflictedAreaUpdates,
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedColor = watch("color");
  const templateColors = getTemplateColors();
  const isMapCreateMode = !isEditing && (initialSelectedCities?.length ?? 0) > 0;
  const cities = initialSelectedCities?.length
    ? initialSelectedCities
    : (area?.regency ? area.regency.split(/[,;|]/).map((city) => city.trim()).filter(Boolean) : []);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.root?.message && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      {/* Show selected cities if available (read-only) */}
      {cities.length > 0 && (
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.regency")}</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {cities.map((city) => (
              <span key={city} className="inline-flex items-center rounded-md border px-2 py-1 text-xs">
                {city}
              </span>
            ))}
          </div>
        </Field>
      )}

      {/* Name */}
      <Field orientation="vertical">
        <FieldLabel>{t("area.form.name")}</FieldLabel>
        <Input placeholder={t("area.form.namePlaceholder")} {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      {/* Code (optional in full mode) */}
      {!isMapCreateMode && (
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.code")} (optional)</FieldLabel>
          <Input placeholder="e.g. JAWA-BARAT" {...register("code")} />
          {errors.code && <FieldError>{errors.code.message}</FieldError>}
        </Field>
      )}

      {/* Description (optional in full mode) */}
      {!isMapCreateMode && (
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.description")} (optional)</FieldLabel>
          <Textarea
            placeholder={t("area.form.descriptionPlaceholder")}
            {...register("description")}
            rows={2}
          />
          {errors.description && (
            <FieldError>{errors.description.message}</FieldError>
          )}
        </Field>
      )}

      {/* Province and Regency (optional in full mode) */}
      {!isMapCreateMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("area.form.province")} (optional)</FieldLabel>
            <Input placeholder="e.g. Jawa Barat" {...register("province")} />
            {errors.province && <FieldError>{errors.province.message}</FieldError>}
          </Field>
          <Field orientation="vertical">
            <FieldLabel>{t("area.form.regency")} (optional)</FieldLabel>
            <Input placeholder="e.g. Bandung" {...register("regency")} />
            {errors.regency && <FieldError>{errors.regency.message}</FieldError>}
          </Field>
        </div>
      )}

      {/* District (optional in full mode) */}
      {!isMapCreateMode && (
        <Field orientation="vertical">
          <FieldLabel>{t("area.form.district")} (optional)</FieldLabel>
          <Input placeholder="e.g. Coblong" {...register("district")} />
          {errors.district && <FieldError>{errors.district.message}</FieldError>}
        </Field>
      )}

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

      {/* Color with template + custom input */}
      <Field orientation="vertical">
        <FieldLabel>{t("area.form.color")} (optional)</FieldLabel>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {templateColors.map(({ template, hex }) => (
              <button
                key={template}
                type="button"
                onClick={() => setValue("color", hex, { shouldDirty: true, shouldValidate: true })}
                className="h-7 w-7 rounded border-2 transition-all hover:scale-105"
                style={{
                  backgroundColor: hex,
                  borderColor: selectedColor === hex ? "var(--foreground)" : "transparent",
                }}
                title={template}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-lg border-2"
              style={{
                backgroundColor: selectedColor || "#E5E7EB",
              }}
              title="Color preview"
            />
            <Input
              type="text"
              placeholder="e.g. #ff6b6b or rgb(255, 107, 107)"
              {...register("color")}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click template color or enter any valid CSS color (hex, rgb, hsl, named colors).
          </p>
        </div>
      </Field>

      {/* Action buttons */}
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

export function AreaForm({ open, onClose, onCreateSuccess, area, embedded, initialPolygon, initialSelectedCities, conflictedAreaUpdates }: AreaFormProps) {
  // When embedded in a parent Dialog, render form content only
  if (embedded) {
    return (
      <AreaFormContent
        open={open}
        onClose={onClose}
        onCreateSuccess={onCreateSuccess}
        area={area}
        initialPolygon={initialPolygon}
        initialSelectedCities={initialSelectedCities}
        conflictedAreaUpdates={conflictedAreaUpdates}
      />
    );
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
        <AreaFormContent
          open={open}
          onClose={onClose}
          onCreateSuccess={onCreateSuccess}
          area={area}
          initialPolygon={initialPolygon}
          initialSelectedCities={initialSelectedCities}
          conflictedAreaUpdates={conflictedAreaUpdates}
        />
      </DialogContent>
    </Dialog>
  );
}
