"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateSparePart,
  useUpdateSparePart,
  useMaintenanceFormData,
} from "../hooks/use-asset-maintenance";
import type { SparePart } from "../types";

interface SparePartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  sparePart?: SparePart | null;
}

export function SparePartForm({ open, onOpenChange, mode, sparePart }: SparePartFormProps) {
  const t = useTranslations("assetMaintenance");
  const createSparePart = useCreateSparePart();
  const updateSparePart = useUpdateSparePart();
  const { data: formDataResponse } = useMaintenanceFormData();

  const uoms = formDataResponse?.data?.uoms || [];
  const warehouses = formDataResponse?.data?.warehouses || [];

  const [formData, setFormData] = useState({
    part_number: "",
    part_name: "",
    description: "",
    unit_of_measure: "pcs",
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_point: 0,
    current_stock: 0,
    unit_cost: 0,
    location: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && mode === "edit" && sparePart) {
      setFormData({
        part_number: sparePart.part_number,
        part_name: sparePart.part_name,
        description: sparePart.description || "",
        unit_of_measure: sparePart.unit_of_measure || "pcs",
        min_stock_level: sparePart.min_stock_level,
        max_stock_level: sparePart.max_stock_level || 0,
        reorder_point: sparePart.reorder_point,
        current_stock: sparePart.current_stock,
        unit_cost: sparePart.unit_cost,
        location: sparePart.location || "",
        is_active: sparePart.is_active,
      });
    } else if (open && mode === "create") {
      setFormData({
        part_number: "",
        part_name: "",
        description: "",
        unit_of_measure: "pcs",
        min_stock_level: 0,
        max_stock_level: 0,
        reorder_point: 0,
        current_stock: 0,
        unit_cost: 0,
        location: "",
        is_active: true,
      });
    }
    setErrors({});
  }, [open, mode, sparePart]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.part_number) newErrors.part_number = t("validation.partNumberRequired");
    if (!formData.part_name) newErrors.part_name = t("validation.partNameRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      ...formData,
      max_stock_level: formData.max_stock_level || undefined,
      location: formData.location || undefined,
    };

    if (mode === "edit" && sparePart) {
      updateSparePart.mutate(
        { id: sparePart.id, data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createSparePart.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("spareParts.create") : t("spareParts.edit")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="part_number">{t("spareParts.form.partNumber")} *</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className={errors.part_number ? "border-destructive" : ""}
              />
              {errors.part_number && (
                <p className="text-sm text-destructive">{errors.part_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="part_name">{t("spareParts.form.partName")} *</Label>
              <Input
                id="part_name"
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                className={errors.part_name ? "border-destructive" : ""}
              />
              {errors.part_name && (
                <p className="text-sm text-destructive">{errors.part_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("spareParts.form.description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">{t("spareParts.form.unitOfMeasure")}</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(v) => setFormData({ ...formData, unit_of_measure: v })}
              >
                <SelectTrigger id="unit_of_measure">
                  <SelectValue placeholder={t("spareParts.form.selectUOM")} />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((uom) => (
                    <SelectItem key={uom.id} value={uom.symbol}>
                      {uom.name} ({uom.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("spareParts.form.location")}</Label>
              <Select
                value={formData.location || "none"}
                onValueChange={(v) => setFormData({ ...formData, location: v === "none" ? "" : v })}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={t("spareParts.form.selectLocation")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.unassigned")}</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.code}>
                      {warehouse.code} - {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_stock">{t("spareParts.form.currentStock")}</Label>
              <Input
                id="current_stock"
                type="number"
                min={0}
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">{t("spareParts.form.unitCost")}</Label>
              <Input
                id="unit_cost"
                type="number"
                min={0}
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">{t("spareParts.form.minStockLevel")}</Label>
              <Input
                id="min_stock_level"
                type="number"
                min={0}
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_stock_level">{t("spareParts.form.maxStockLevel")}</Label>
              <Input
                id="max_stock_level"
                type="number"
                min={0}
                value={formData.max_stock_level}
                onChange={(e) => setFormData({ ...formData, max_stock_level: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_point">{t("spareParts.form.reorderPoint")}</Label>
              <Input
                id="reorder_point"
                type="number"
                min={0}
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="is_active">{t("spareParts.form.isActive")}</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createSparePart.isPending || updateSparePart.isPending}>
              {createSparePart.isPending || updateSparePart.isPending
                ? t("common.saving")
                : mode === "create"
                ? t("common.create")
                : t("common.update")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
