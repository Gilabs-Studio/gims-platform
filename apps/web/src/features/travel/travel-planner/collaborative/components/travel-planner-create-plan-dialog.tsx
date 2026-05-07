"use client";
'use no memo';

import { Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { LocationPicker } from "@/features/master-data/geographic/components/location-picker";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { EmployeeFormOption, EnumOption } from "../types";

interface InitialExpenseItem {
  expense_type: string;
  amount: number;
  description: string;
}

interface TravelPlannerCreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  isSubmitting: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  mode: string;
  onModeChange: (value: string) => void;
  budget: number;
  onBudgetChange: (value: number) => void;
  modeOptions: EnumOption[];
  participantOptions: EmployeeFormOption[];
  selectedParticipantIDs: string[];
  onToggleParticipant: (employeeID: string) => void;
  expenseTypeOptions: EnumOption[];
  initialExpenseItems: InitialExpenseItem[];
  totalExpenseAmount: number;
  onAddExpenseItem: () => void;
  onUpdateExpenseItem: (index: number, field: "expense_type" | "amount" | "description", value: string | number) => void;
  onRemoveExpenseItem: (index: number) => void;
  selectedLocationLat?: number;
  selectedLocationLng?: number;
  onLocationChange: (lat: number, lng: number) => void;
  onCreate: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function TravelPlannerCreatePlanDialog({
  open,
  onOpenChange,
  canCreate,
  isSubmitting,
  title,
  onTitleChange,
  mode,
  onModeChange,
  budget,
  onBudgetChange,
  modeOptions,
  participantOptions,
  selectedParticipantIDs,
  onToggleParticipant,
  expenseTypeOptions,
  initialExpenseItems,
  totalExpenseAmount,
  onAddExpenseItem,
  onUpdateExpenseItem,
  onRemoveExpenseItem,
  selectedLocationLat,
  selectedLocationLng,
  onLocationChange,
  onCreate,
}: TravelPlannerCreatePlanDialogProps) {
  const t = useTranslations("visitPlanner");
  const tCommon = useTranslations("common");

  const { control, setValue, watch } = useForm<{ latitude?: number | null; longitude?: number | null }>({
    defaultValues: { latitude: selectedLocationLat ?? null, longitude: selectedLocationLng ?? null },
  });

  useEffect(() => {
    setValue("latitude", selectedLocationLat ?? null, { shouldDirty: false });
    setValue("longitude", selectedLocationLng ?? null, { shouldDirty: false });
  }, [selectedLocationLat, selectedLocationLng, setValue]);

  const watchedLat = watch("latitude");
  const watchedLng = watch("longitude");

  useEffect(() => {
    if (typeof watchedLat === "number" && typeof watchedLng === "number" && !isNaN(watchedLat) && !isNaN(watchedLng)) {
      onLocationChange(watchedLat, watchedLng);
    }
  // intentionally only react to coordinate changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedLat, watchedLng]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createPlan.title")}</DialogTitle>
          <DialogDescription>{t("createPlan.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("form.title")}</p>
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={t("form.titlePlaceholder")}
              disabled={!canCreate || isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("form.mode")}</p>
            <Select value={mode} onValueChange={onModeChange} disabled={!canCreate || isSubmitting}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder={t("form.selectMode")} />
              </SelectTrigger>
              <SelectContent>
                {modeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="cursor-pointer">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium">{t("form.budget")}</p>
            <NumericInput
              value={budget}
              onChange={(value) => onBudgetChange(value ?? 0)}
              placeholder={t("form.budgetPlaceholder")}
              disabled={!canCreate || isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("participants.title")}</p>
            <Badge variant="outline">{selectedParticipantIDs.length}</Badge>
          </div>
          <div className="rounded-lg border p-2 max-h-44 overflow-auto space-y-2">
            {participantOptions.length === 0 ? <p className="text-xs text-muted-foreground">{t("participants.noActive")}</p> : null}
            {participantOptions.map((employee) => {
              const selected = selectedParticipantIDs.includes(employee.id);
              return (
                <button
                  key={employee.id}
                  type="button"
                  className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    selected ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                  }`}
                  onClick={() => onToggleParticipant(employee.id)}
                  disabled={!canCreate || isSubmitting}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={employee.avatar_url || undefined} alt={employee.name} />
                      <AvatarFallback dataSeed={employee.name}>{employee.name}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{employee.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{employee.employee_code}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("expenses.title")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onAddExpenseItem}
              disabled={!canCreate || isSubmitting}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("expenses.addItem")}
            </Button>
          </div>

          {initialExpenseItems.length > 0 ? (
            <div className="rounded-md bg-muted/50 p-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">{t("expenses.summary.budget")}</p>
                  <p className="font-semibold">{formatCurrency(budget)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("expenses.summary.total")}</p>
                  <p className="font-semibold">{formatCurrency(totalExpenseAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("expenses.summary.remaining")}</p>
                  <p className={`font-semibold ${budget - totalExpenseAmount < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.max(budget - totalExpenseAmount, 0))}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {initialExpenseItems.length === 0 ? <p className="text-xs text-muted-foreground">{t("expenses.noneAdded")}</p> : null}

            {initialExpenseItems.map((item, index) => (
              <div key={`expense-item-${index}`} className="grid gap-2 rounded-md border p-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Select
                    value={item.expense_type}
                    onValueChange={(value) => onUpdateExpenseItem(index, "expense_type", value)}
                    disabled={!canCreate || isSubmitting}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypeOptions.map((expenseType) => (
                        <SelectItem key={expenseType.value} value={expenseType.value} className="cursor-pointer">
                          {expenseType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <NumericInput
                    placeholder={t("expenses.item.amountPlaceholder")}
                    value={item.amount}
                    onChange={(value) => onUpdateExpenseItem(index, "amount", value ?? 0)}
                    disabled={!canCreate || isSubmitting}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    placeholder={t("expenses.item.descriptionPlaceholder")}
                    value={item.description}
                    onChange={(event) => onUpdateExpenseItem(index, "description", event.target.value)}
                    disabled={!canCreate || isSubmitting}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full cursor-pointer"
                    onClick={() => onRemoveExpenseItem(index)}
                    disabled={!canCreate || isSubmitting}
                  >
                    x
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("map.title")}</p>
          <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <LocationPicker
              control={control}
              setValue={setValue}
              disabled={!canCreate || isSubmitting}
              enabled={true}
              labels={{
                pickFromMap: t("map.pickFromMap"),
                useCurrentLocation: t("map.useCurrentLocation"),
                resolvedLocation: t("map.resolvedLocation"),
                advancedMode: t("map.advancedMode"),
                province: t("map.province"),
                city: t("map.city"),
                district: t("map.district"),
                village: t("map.village"),
                selectProvince: t("map.selectProvince"),
                selectCity: t("map.selectCity"),
                selectDistrict: t("map.selectDistrict"),
                villagePlaceholder: t("map.villagePlaceholder"),
                mapPickerTitle: t("map.mapPickerTitle"),
                mapPickerDescription: t("map.mapPickerDescription"),
                noLocation: t("map.noLocation"),
                resolving: t("map.resolving"),
                locationPermissionDenied: t("map.locationPermissionDenied"),
                locationNotSupported: t("map.locationNotSupported"),
                locationFailed: t("map.locationFailed"),
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="button" className="cursor-pointer" onClick={onCreate} disabled={!canCreate || isSubmitting}>
            <Plus className="h-4 w-4 mr-1" />
            {t("createPlan.button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
