"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useMaintenanceFormData,
} from "../hooks/use-asset-maintenance";
import type { WorkOrder, WorkOrderType, WorkOrderPriority } from "../types";

interface WorkOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  workOrder?: WorkOrder | null;
}

export function WorkOrderForm({ open, onOpenChange, mode, workOrder }: WorkOrderFormProps) {
  const t = useTranslations("assetMaintenance");
  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();
  const { data: formDataResponse } = useMaintenanceFormData();

  const assets = formDataResponse?.data?.assets || [];
  const employees = formDataResponse?.data?.employees || [];

  const [formData, setFormData] = useState({
    asset_id: "",
    schedule_id: "",
    wo_type: "preventive" as WorkOrderType,
    priority: "medium" as WorkOrderPriority,
    description: "",
    planned_date: new Date(),
    assigned_to: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && mode === "edit" && workOrder) {
      setFormData({
        asset_id: workOrder.asset_id,
        schedule_id: workOrder.schedule_id || "",
        wo_type: workOrder.wo_type,
        priority: workOrder.priority,
        description: workOrder.description,
        planned_date: workOrder.planned_date
          ? new Date(workOrder.planned_date)
          : new Date(),
        assigned_to: workOrder.assigned_to || "",
      });
    } else if (open && mode === "create") {
      setFormData({
        asset_id: "",
        schedule_id: "",
        wo_type: "preventive",
        priority: "medium",
        description: "",
        planned_date: new Date(),
        assigned_to: "",
      });
    }
    setErrors({});
  }, [open, mode, workOrder]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.asset_id) newErrors.asset_id = t("validation.assetRequired");
    if (!formData.description) newErrors.description = t("validation.descriptionRequired");
    if (!formData.planned_date) newErrors.planned_date = t("validation.plannedDateRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      ...formData,
      planned_date: format(formData.planned_date, "yyyy-MM-dd"),
      schedule_id: formData.schedule_id || undefined,
      assigned_to: formData.assigned_to || undefined,
    };

    if (mode === "edit" && workOrder) {
      updateWorkOrder.mutate(
        {
          id: workOrder.id,
          data: {
            description: data.description,
            planned_date: data.planned_date,
            assigned_to: data.assigned_to,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createWorkOrder.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("workOrders.create") : t("workOrders.edit")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_id">{t("workOrders.form.asset")} *</Label>
            <Select
              value={formData.asset_id}
              onValueChange={(v) => setFormData({ ...formData, asset_id: v })}
            >
              <SelectTrigger id="asset_id" className={errors.asset_id ? "border-destructive" : ""}>
                <SelectValue placeholder={t("workOrders.form.selectAsset")} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.code} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.asset_id && <p className="text-sm text-destructive">{errors.asset_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wo_type">{t("workOrders.form.woType")}</Label>
              <Select
                value={formData.wo_type}
                onValueChange={(v) => setFormData({ ...formData, wo_type: v as WorkOrderType })}
              >
                <SelectTrigger id="wo_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">
                    {t("workOrders.types.preventive")}
                  </SelectItem>
                  <SelectItem value="corrective">
                    {t("workOrders.types.corrective")}
                  </SelectItem>
                  <SelectItem value="emergency">
                    {t("workOrders.types.emergency")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t("workOrders.form.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as WorkOrderPriority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("workOrders.priorities.low")}</SelectItem>
                  <SelectItem value="medium">{t("workOrders.priorities.medium")}</SelectItem>
                  <SelectItem value="high">{t("workOrders.priorities.high")}</SelectItem>
                  <SelectItem value="critical">{t("workOrders.priorities.critical")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("workOrders.form.plannedDate")} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.planned_date && "text-muted-foreground",
                    errors.planned_date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.planned_date
                    ? format(formData.planned_date, "PPP")
                    : t("common.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.planned_date}
                  onSelect={(date: Date | undefined) =>
                    setFormData({ ...formData, planned_date: date || new Date() })
                  }
                />
              </PopoverContent>
            </Popover>
            {errors.planned_date && (
              <p className="text-sm text-destructive">{errors.planned_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">{t("workOrders.form.assignedTo")}</Label>
            <Select
              value={formData.assigned_to || "none"}
              onValueChange={(v) => setFormData({ ...formData, assigned_to: v === "none" ? "" : v })}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder={t("workOrders.form.selectEmployee")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.unassigned")}</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("workOrders.form.description")} *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createWorkOrder.isPending || updateWorkOrder.isPending}>
              {createWorkOrder.isPending || updateWorkOrder.isPending
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
