
"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";

import { useFinanceAssetCategories } from "@/features/finance/asset-categories/hooks/use-finance-asset-categories";
import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";

import { assetFormSchema, type AssetFormValues } from "../schemas/asset.schema";
import type { Asset } from "../types";
import {
  useCreateFinanceAsset,
  useUpdateFinanceAsset,
  useUploadAttachment,
} from "../hooks/use-finance-assets";
import { DatePicker } from "./date-picker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Asset | null;
};

export function AssetForm({ open, onOpenChange, mode, initialData }: Props) {
  const t = useTranslations("financeAssets");
  const assetTypeOptions: Array<AssetFormValues["asset_type_id"]> = ["FIXED", "CURRENT", "INTANGIBLE", "OTHER"];
  const depreciationMethodOptions: Array<AssetFormValues["depreciation_method"]> = ["SL", "DB", "SYD", "UOP", "NONE"];

  const { data: categoriesData } = useFinanceAssetCategories({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const { data: locationsData } = useFinanceAssetLocations({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const { data: divisionsData } = useDivisions({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const { data: employeesData } = useEmployees({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  const categoryOptions = categoriesData?.data ?? [];
  const locationOptions = locationsData?.data ?? [];
  const departmentOptions = divisionsData?.data ?? [];
  const custodianOptions = employeesData?.data ?? [];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const createMutation = useCreateFinanceAsset();
  const updateMutation = useUpdateFinanceAsset();
  const uploadAttachment = useUploadAttachment();

  const defaultValues: AssetFormValues = useMemo(
    () => ({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      asset_type_id: (initialData?.asset_type_id ?? "FIXED") as AssetFormValues["asset_type_id"],
      asset_category_id: initialData?.category_id ?? "",
      location_id: initialData?.location_id ?? "",
      acquisition_date: (initialData?.acquisition_date ?? "").slice(0, 10),
      acquisition_cost: initialData?.acquisition_cost ?? 0,
      salvage_value: initialData?.salvage_value ?? 0,
      useful_life_months: initialData?.useful_life_months ?? undefined,
      depreciation_method: (initialData?.depreciation_method ?? "SL") as AssetFormValues["depreciation_method"],
      department_id: initialData?.department_id ?? undefined,
      custodian_user_id: initialData?.assigned_to_employee_id ?? undefined,
      vendor_name: initialData?.acquisition_cost_breakdown?.supplier_name ?? "",
      supplier_invoice_number: initialData?.acquisition_cost_breakdown?.invoice_number ?? "",
      supplier_invoice_image: undefined,
    }),
    [initialData],
  );

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  const categoryId = useWatch({ control: form.control, name: "asset_category_id" });
  const locationId = useWatch({ control: form.control, name: "location_id" });
  const assetTypeId = useWatch({ control: form.control, name: "asset_type_id" });
  const departmentId = useWatch({ control: form.control, name: "department_id" });
  const custodianUserId = useWatch({ control: form.control, name: "custodian_user_id" });
  const acquisitionCost = useWatch({ control: form.control, name: "acquisition_cost" });
  const codeValue = useWatch({ control: form.control, name: "code" });
  const nameValue = useWatch({ control: form.control, name: "name" });

  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.id === categoryId),
    [categoryId, categoryOptions],
  );
  const selectedLocation = useMemo(
    () => locationOptions.find((item) => item.id === locationId),
    [locationId, locationOptions],
  );
  const selectedDepartment = useMemo(
    () => departmentOptions.find((item) => item.id === departmentId),
    [departmentId, departmentOptions],
  );
  const selectedCustodian = useMemo(
    () => custodianOptions.find((item) => item.id === custodianUserId),
    [custodianUserId, custodianOptions],
  );

  const sectionBadgeClass = "inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary";

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: AssetFormValues) => {
    try {
      const payload = {
        code: values.code,
        name: values.name,
        asset_type_id: values.asset_type_id,
        asset_category_id: values.asset_category_id,
        location_id: values.location_id,
        acquisition_date: values.acquisition_date,
        acquisition_cost: values.acquisition_cost,
        salvage_value: values.salvage_value ?? 0,
        useful_life_months: values.useful_life_months,
        depreciation_method: values.depreciation_method,
        department_id: values.department_id,
        custodian_user_id: values.custodian_user_id,
        vendor_id: undefined,
        purchase_invoice_id: undefined,
      };
      if (mode === "create") {
        const created = await createMutation.mutateAsync(payload as any);
        // If user uploaded a supplier invoice image, upload it as attachment
        try {
          const fileInput = (values as any).supplier_invoice_image;
          const file: File | undefined = fileInput
            ? fileInput instanceof File
              ? fileInput
              : fileInput[0]
            : undefined;
          if (file && created?.data?.id) {
            await uploadAttachment.mutateAsync({ assetId: created.data.id, data: { file, file_type: "invoice" } });
          }
        } catch (err) {
          // non-blocking: continue even if upload fails
          console.warn("Invoice upload failed", err);
        }
        toast.success(t("toast.created"));
      } else {
        const id = initialData?.id ?? "";
        if (!id) throw new Error("Missing id");
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t("toast.updated"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="3xl" className="max-h-[92vh] overflow-hidden p-0">
        <div className="flex max-h-[92vh] min-h-0 flex-col">
          <div className="border-b px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle>{mode === "create" ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "create" ? t("form.helper.create") : t("form.helper.edit")}
              </p>
            </DialogHeader>
          </div>

          <form
            className="grid min-h-0 flex-1 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.9fr)]"
            onSubmit={form.handleSubmit(onSubmit)}
          >
          <div className="min-h-0 min-w-0 space-y-6 overflow-y-auto pr-1 pb-1">
            <section className="rounded-2xl border bg-card/50 p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className={sectionBadgeClass}>1</span>
                <div>
                  <div className="text-sm font-semibold">{t("form.sections.basic")}</div>
                  <div className="text-sm text-muted-foreground">{t("form.sectionDescriptions.basic")}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">{t("fields.code")}</Label>
                  <Input id="code" {...form.register("code")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">{t("fields.name")}</Label>
                  <Input id="name" {...form.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.labels.assetType")}</Label>
                  <Controller
                    control={form.control}
                    name="asset_type_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypeOptions.map((value) => (
                            <SelectItem key={value} value={value} className="cursor-pointer">
                              {t(`form.assetTypes.${value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("form.labels.depreciationMethod")}</Label>
                  <Controller
                    control={form.control}
                    name="depreciation_method"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("placeholders.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {depreciationMethodOptions.map((value) => (
                            <SelectItem key={value} value={value} className="cursor-pointer">
                              {t(`form.depreciationMethods.${value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card/50 p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className={sectionBadgeClass}>2</span>
                <div>
                  <div className="text-sm font-semibold">{t("form.sections.assignment")}</div>
                  <div className="text-sm text-muted-foreground">{t("form.sectionDescriptions.assignment")}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.category")}</Label>
                  <Select
                    value={categoryId || ""}
                    onValueChange={(v) =>
                      form.setValue("asset_category_id", v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="cursor-pointer"
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.location")}</Label>
                  <Select
                    value={locationId || ""}
                    onValueChange={(v) =>
                      form.setValue("location_id", v, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("placeholders.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((l) => (
                        <SelectItem
                          key={l.id}
                          value={l.id}
                          className="cursor-pointer"
                        >
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">{t("form.labels.departmentId")}</Label>
                  <Controller
                    control={form.control}
                    name="department_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "none"}
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? undefined : value)
                        }
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("form.placeholders.selectDepartment")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="cursor-pointer">
                            {t("form.placeholders.selectDepartment")}
                          </SelectItem>
                          {departmentOptions.map((division) => (
                            <SelectItem key={division.id} value={division.id} className="cursor-pointer">
                              {division.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custodian_user_id">{t("form.labels.custodianUserId")}</Label>
                  <Controller
                    control={form.control}
                    name="custodian_user_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? "none"}
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? undefined : value)
                        }
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("form.placeholders.selectCustodian")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="cursor-pointer">
                            {t("form.placeholders.selectCustodian")}
                          </SelectItem>
                          {custodianOptions.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id} className="cursor-pointer">
                              {employee.name}
                              {employee.employee_code ? ` • ${employee.employee_code}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-card/50 p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className={sectionBadgeClass}>3</span>
                <div>
                  <div className="text-sm font-semibold">{t("form.sections.acquisition")}</div>
                  <div className="text-sm text-muted-foreground">{t("form.sectionDescriptions.acquisition")}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="acquisition_date">
                    {t("fields.acquisitionDate")}
                  </Label>
                  <Controller
                    name="acquisition_date"
                    control={form.control}
                    render={({ field }) => (
                      <DatePicker
                        id="acquisition_date"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("placeholders.selectDate")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acquisition_cost">
                    {t("fields.acquisitionCost")}
                  </Label>
                  <Controller
                    name="acquisition_cost"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="acquisition_cost"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("form.placeholders.amount")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salvage_value">{t("fields.salvageValue")}</Label>
                  <Controller
                    name="salvage_value"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="salvage_value"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("form.placeholders.amount")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2 md:col-span-2 xl:col-span-1">
                  <Label htmlFor="useful_life_months">{t("form.labels.usefulLifeMonths")}</Label>
                  <Controller
                    name="useful_life_months"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="useful_life_months"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("form.placeholders.amount")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2 md:col-span-2 xl:col-span-3">
                  <Label htmlFor="supplier_invoice_image">{t("form.labels.supplierInvoiceImage")}</Label>
                  <input
                    id="supplier_invoice_image"
                    type="file"
                    accept="image/*,application/pdf"
                    className="block w-full rounded-md border bg-transparent px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-primary/10 file:py-1 file:px-3"
                    {...form.register("supplier_invoice_image")}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="min-h-0 min-w-0 space-y-4 overflow-y-auto rounded-2xl border bg-gradient-to-b from-muted/30 to-background p-5 shadow-sm lg:sticky lg:top-0">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("form.summary.title")}</div>
              <div className="mt-1 text-lg font-semibold">{nameValue || t("form.summary.emptyName")}</div>
              <div className="text-sm text-muted-foreground">{codeValue || t("form.summary.emptyCode")}</div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border bg-background p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("form.summary.cardTitle")}</div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("form.labels.assetType")}</span>
                    <span className="font-medium">{assetTypeId ? t(`form.assetTypes.${assetTypeId}`) : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("fields.category")}</span>
                    <span className="font-medium text-right">{selectedCategory?.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("fields.location")}</span>
                    <span className="font-medium text-right">{selectedLocation?.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("form.labels.departmentId")}</span>
                    <span className="font-medium text-right">{selectedDepartment?.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("form.labels.custodianUserId")}</span>
                    <span className="font-medium text-right">{selectedCustodian ? `${selectedCustodian.name}${selectedCustodian.employee_code ? ` • ${selectedCustodian.employee_code}` : ""}` : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("fields.acquisitionCost")}</span>
                    <span className="font-medium text-right">{formatCurrency(acquisitionCost ?? 0)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
                {t("form.summary.hint")}
              </div>
            </div>
          </aside>

          <div className="border-t px-6 py-4 lg:col-span-2">
            <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {t("form.submit")}
            </Button>
            </DialogFooter>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
