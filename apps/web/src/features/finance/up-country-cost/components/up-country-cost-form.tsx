"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { upCountryCostFormSchema, type UpCountryCostFormValues } from "../schemas/up-country-cost.schema";
import type { UpCountryCost } from "../types";
import { useCreateFinanceUpCountryCost, useUpdateFinanceUpCountryCost } from "../hooks/use-finance-up-country-cost";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: UpCountryCost | null;
};

const COST_TYPES = ["TRANSPORT", "ACCOMMODATION", "MEAL", "FUEL", "OTHER"];

export function UpCountryCostForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeUpCountryCost");

  const createMutation = useCreateFinanceUpCountryCost();
  const updateMutation = useUpdateFinanceUpCountryCost();

  const defaultValues: UpCountryCostFormValues = useMemo(
    () => ({
      purpose: initialData?.purpose ?? "",
      location: initialData?.location ?? "",
      start_date: (initialData?.start_date ?? new Date().toISOString()).slice(0, 10),
      end_date: (initialData?.end_date ?? new Date().toISOString()).slice(0, 10),
      notes: initialData?.notes ?? "",
      employees: initialData?.employees?.map((e) => ({ employee_id: e.employee_id })) ?? [{ employee_id: "" }],
      items: initialData?.items?.map((i) => ({
        cost_type: i.cost_type,
        description: i.description ?? "",
        amount: i.amount,
      })) ?? [{ cost_type: "TRANSPORT", description: "", amount: 0 }],
    }),
    [initialData],
  );

  const form = useForm<UpCountryCostFormValues>({
    resolver: zodResolver(upCountryCostFormSchema),
    defaultValues,
  });

  const employeesField = useFieldArray({ control: form.control, name: "employees" });
  const itemsField = useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: UpCountryCostFormValues) => {
    try {
      if (mode === "create") {
        await createMutation.mutateAsync(values);
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: values });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="purpose">{t("fields.purpose")}</Label>
            <Input id="purpose" {...form.register("purpose")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location")}</Label>
              <Input id="location" {...form.register("location")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("fields.startDate")}</Label>
              <Input id="start_date" type="date" {...form.register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">{t("fields.endDate")}</Label>
              <Input id="end_date" type="date" {...form.register("end_date")} />
            </div>
          </div>

          {/* Employees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("fields.employees")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => employeesField.append({ employee_id: "" })}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("form.addEmployee")}
              </Button>
            </div>
            {employeesField.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <Input
                  placeholder={t("fields.employeeId")}
                  {...form.register(`employees.${index}.employee_id`)}
                  className="flex-1"
                />
                {employeesField.fields.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={() => employeesField.remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Cost Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("fields.items")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => itemsField.append({ cost_type: "OTHER", description: "", amount: 0 })}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("form.addItem")}
              </Button>
            </div>
            {itemsField.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">{t("fields.costType")}</Label>
                  <Select
                    value={form.watch(`items.${index}.cost_type`) || ""}
                    onValueChange={(v) => form.setValue(`items.${index}.cost_type`, v)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct} className="cursor-pointer">
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">{t("fields.costDescription")}</Label>
                  <Input {...form.register(`items.${index}.description`)} />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">{t("fields.costAmount")}</Label>
                  <Input type="number" step="0.01" {...form.register(`items.${index}.amount`, { valueAsNumber: true })} />
                </div>
                <div className="col-span-1">
                  {itemsField.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="cursor-pointer" onClick={() => itemsField.remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("fields.notes")}</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer" disabled={isSubmitting}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
