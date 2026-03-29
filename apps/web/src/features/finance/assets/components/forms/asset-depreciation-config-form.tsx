"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  Settings,
  TrendingDown,
  Calculator,
  Calendar,
  AlertCircle,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NumericInput } from "@/components/ui/numeric-input";

import { useFinanceAssetCategory } from "@/features/finance/asset-categories/hooks/use-finance-asset-categories";
import type { Asset, AssetCategoryLite } from "@/features/finance/assets/types";
import { DatePicker } from "../date-picker";

export type DepreciationMethod = "SL" | "DB" | "SYD" | "UOP" | "NONE";

// Depreciation method definitions with descriptions
const DEPRECIATION_METHODS: {
  value: DepreciationMethod;
  label: string;
  description: string;
  shortDesc: string;
}[] = [
  {
    value: "SL",
    label: "Straight Line (SL)",
    description:
      "Equal depreciation expense each year over the asset's useful life",
    shortDesc: "Equal annual depreciation",
  },
  {
    value: "DB",
    label: "Declining Balance (DB)",
    description: "Accelerated depreciation with higher expenses in early years",
    shortDesc: "Accelerated - higher early expenses",
  },
  {
    value: "SYD",
    label: "Sum of Years' Digits (SYD)",
    description: "Accelerated method using fractional depreciation calculation",
    shortDesc: "Accelerated - sum of years method",
  },
  {
    value: "UOP",
    label: "Units of Production (UOP)",
    description: "Depreciation based on actual usage, output, or production",
    shortDesc: "Based on actual usage/output",
  },
  {
    value: "NONE",
    label: "No Depreciation",
    description: "Asset is not depreciated (for land, artwork, etc.)",
    shortDesc: "No depreciation applied",
  },
];

// Schema for depreciation config form
export const assetDepreciationConfigFormSchema = z.object({
  use_category_defaults: z.boolean(),
  depreciation_method: z.enum(["SL", "DB", "SYD", "UOP", "NONE"]),
  useful_life_months: z
    .number()
    .int()
    .min(1, "Useful life must be at least 1 month"),
  useful_life_years: z
    .number()
    .min(0.1, "Useful life must be at least 0.1 years"),
  salvage_value: z.number().min(0).optional(),
  depreciation_rate: z.number().min(0).max(100).optional(),
  depreciation_start_date: z.string().min(1, "Start date is required"),
});

export type AssetDepreciationConfigFormValues = z.infer<
  typeof assetDepreciationConfigFormSchema
>;

interface AssetDepreciationConfigFormProps {
  asset?: Asset | null;
  onSubmit: (values: AssetDepreciationConfigFormValues) => Promise<void>;
  onPreviewCalculation?: (
    values: AssetDepreciationConfigFormValues,
  ) => Promise<void>;
  isSubmitting?: boolean;
  isLoading?: boolean;
}

export function AssetDepreciationConfigForm({
  asset,
  onSubmit,
  onPreviewCalculation,
  isSubmitting = false,
  isLoading = false,
}: AssetDepreciationConfigFormProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    annualDepreciation: number;
    monthlyDepreciation: number;
    totalDepreciableAmount: number;
  } | null>(null);

  // Fetch category to get defaults
  const { data: categoryData, isLoading: isCategoryLoading } =
    useFinanceAssetCategory(asset?.category_id ?? "", {
      enabled: !!asset?.category_id,
    });
  const category = categoryData?.data;

  const defaultValues: AssetDepreciationConfigFormValues = useMemo(
    () => ({
      use_category_defaults:
        !asset?.depreciation_method && !!category?.depreciation_method,
      depreciation_method:
        (asset?.depreciation_method as DepreciationMethod) ||
        (category?.depreciation_method as DepreciationMethod) ||
        "SL",
      useful_life_months:
        asset?.useful_life_months || category?.useful_life_months || 60,
      useful_life_years:
        Math.round(
          ((asset?.useful_life_months || category?.useful_life_months || 60) /
            12) *
            10,
        ) / 10,
      salvage_value: asset?.salvage_value ?? 0,
      depreciation_rate: category?.depreciation_rate ?? 20,
      depreciation_start_date: asset?.depreciation_start_date
        ? asset.depreciation_start_date.slice(0, 10)
        : asset?.acquisition_date
          ? asset.acquisition_date.slice(0, 10)
          : "",
    }),
    [asset, category],
  );

  const form = useForm<AssetDepreciationConfigFormValues>({
    resolver: zodResolver(assetDepreciationConfigFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const useCategoryDefaults = form.watch("use_category_defaults");
  const selectedMethod = form.watch("depreciation_method");
  const usefulLifeMonths = form.watch("useful_life_months");
  const usefulLifeYears = form.watch("useful_life_years");
  const salvageValue = form.watch("salvage_value") || 0;

  // Auto-sync months and years
  useEffect(() => {
    const calculatedYears = Math.round((usefulLifeMonths / 12) * 10) / 10;
    if (calculatedYears !== usefulLifeYears) {
      form.setValue("useful_life_years", calculatedYears, {
        shouldValidate: false,
      });
    }
  }, [usefulLifeMonths, form]);

  // Handle years change
  const handleYearsChange = (years: number) => {
    const months = Math.round(years * 12);
    form.setValue("useful_life_years", years);
    form.setValue("useful_life_months", months);
  };

  // Apply category defaults when toggle is on
  useEffect(() => {
    if (useCategoryDefaults && category) {
      form.setValue(
        "depreciation_method",
        category.depreciation_method as DepreciationMethod,
      );
      form.setValue("useful_life_months", category.useful_life_months);
      form.setValue(
        "useful_life_years",
        Math.round((category.useful_life_months / 12) * 10) / 10,
      );
      if (category.depreciation_rate) {
        form.setValue("depreciation_rate", category.depreciation_rate);
      }
    }
  }, [useCategoryDefaults, category, form]);

  const handlePreviewCalculation = () => {
    const values = form.getValues();
    const acquisitionCost = asset?.acquisition_cost || 0;
    const depreciableAmount = Math.max(
      0,
      acquisitionCost - (values.salvage_value || 0),
    );

    let annualDepreciation = 0;
    let monthlyDepreciation = 0;

    if (
      values.useful_life_months > 0 &&
      values.depreciation_method !== "NONE"
    ) {
      switch (values.depreciation_method) {
        case "SL":
          annualDepreciation =
            depreciableAmount / (values.useful_life_months / 12);
          monthlyDepreciation = depreciableAmount / values.useful_life_months;
          break;
        case "DB": {
          const rate = (values.depreciation_rate || 20) / 100;
          annualDepreciation = acquisitionCost * rate;
          monthlyDepreciation = annualDepreciation / 12;
          break;
        }
        case "SYD": {
          // First year depreciation (highest)
          const sumOfYears =
            (values.useful_life_months * (values.useful_life_months + 1)) / 2;
          const firstMonthFactor = values.useful_life_months / sumOfYears;
          monthlyDepreciation = depreciableAmount * firstMonthFactor;
          annualDepreciation = monthlyDepreciation * 12;
          break;
        }
        case "UOP":
          // Cannot calculate without production estimates
          annualDepreciation =
            depreciableAmount / (values.useful_life_months / 12);
          monthlyDepreciation = depreciableAmount / values.useful_life_months;
          break;
      }
    }

    setPreviewData({
      annualDepreciation,
      monthlyDepreciation,
      totalDepreciableAmount: depreciableAmount,
    });
    setShowPreview(true);

    if (onPreviewCalculation) {
      onPreviewCalculation(values);
    }
  };

  const handleSubmit = async (values: AssetDepreciationConfigFormValues) => {
    try {
      await onSubmit(values);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading || isCategoryLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Category Defaults Toggle */}
      <Card
        className={useCategoryDefaults ? "border-primary/30 bg-primary/5" : ""}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("fields.useCategoryDefaults") || "Use Category Defaults"}
              </label>
              <p className="text-xs text-muted-foreground">
                {category
                  ? `${t("fields.inheritFrom") || "Inherit from"} "${category.name}"`
                  : t("fields.noCategoryDefaults") ||
                    "No category defaults available"}
              </p>
            </div>
            <Controller
              name="use_category_defaults"
              control={form.control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!category}
                />
              )}
            />
          </div>

          {useCategoryDefaults && category && (
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("fields.method")}:
                </span>
                <span className="ml-2 font-medium">
                  {DEPRECIATION_METHODS.find(
                    (m) => m.value === category.depreciation_method,
                  )?.label || category.depreciation_method}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("fields.usefulLife")}:
                </span>
                <span className="ml-2 font-medium">
                  {category.useful_life_months} {tCommon("months")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("fields.depreciable")}:
                </span>
                <span className="ml-2 font-medium">
                  {category.is_depreciable ? tCommon("yes") : tCommon("no")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Depreciation Method */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          {t("fields.depreciationMethod")}
        </h3>

        <Controller
          name="depreciation_method"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) =>
                field.onChange(value as DepreciationMethod)
              }
              disabled={useCategoryDefaults}
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue
                  placeholder={
                    t("placeholders.selectMethod") ||
                    "Select depreciation method"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {DEPRECIATION_METHODS.map((method) => (
                  <SelectItem
                    key={method.value}
                    value={method.value}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col py-1">
                      <span>{method.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {method.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        {selectedMethod !== "NONE" && (
          <Alert variant="default" className="bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {
                DEPRECIATION_METHODS.find((m) => m.value === selectedMethod)
                  ?.description
              }
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Useful Life */}
      {selectedMethod !== "NONE" && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("fields.usefulLife")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Months */}
            <Field>
              <FieldLabel>{t("fields.usefulLifeMonths")} *</FieldLabel>
              <Controller
                name="useful_life_months"
                control={form.control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="60"
                    min={1}
                    max={600}
                    disabled={useCategoryDefaults}
                  />
                )}
              />
              {form.formState.errors.useful_life_months && (
                <FieldError>
                  {form.formState.errors.useful_life_months.message}
                </FieldError>
              )}
            </Field>

            {/* Years */}
            <Field>
              <FieldLabel>{t("fields.usefulLifeYears")} *</FieldLabel>
              <Input
                type="number"
                value={usefulLifeYears}
                onChange={(e) =>
                  handleYearsChange(parseFloat(e.target.value) || 0)
                }
                placeholder="5"
                min={0.1}
                max={50}
                step={0.1}
                disabled={useCategoryDefaults}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Salvage Value & Depreciation Rate */}
      {selectedMethod !== "NONE" && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("fields.valuation") || "Valuation"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Salvage Value */}
            <Field>
              <FieldLabel>{t("fields.salvageValue")}</FieldLabel>
              <Controller
                name="salvage_value"
                control={form.control}
                render={({ field }) => (
                  <NumericInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    placeholder="0.00"
                    min={0}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("fields.estimatedResidualValue") ||
                  "Estimated residual value at end of useful life"}
              </p>
            </Field>

            {/* Depreciation Rate (for DB method) */}
            {selectedMethod === "DB" && (
              <Field>
                <FieldLabel>{t("fields.depreciationRate")} (%)</FieldLabel>
                <Controller
                  name="depreciation_rate"
                  control={form.control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value ?? 20}
                      onChange={field.onChange}
                      placeholder="20"
                      min={0}
                      max={100}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("fields.decliningBalanceRate") ||
                    "Annual depreciation rate percentage"}
                </p>
              </Field>
            )}
          </div>
        </div>
      )}

      {/* Start Date */}
      {selectedMethod !== "NONE" && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("fields.depreciationPeriod")}
          </h3>

          <Field>
            <FieldLabel>{t("fields.depreciationStartDate")} *</FieldLabel>
            <Controller
              name="depreciation_start_date"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={
                    t("placeholders.selectDate") || "Select start date"
                  }
                />
              )}
            />
            {form.formState.errors.depreciation_start_date && (
              <FieldError>
                {form.formState.errors.depreciation_start_date.message}
              </FieldError>
            )}
          </Field>
        </div>
      )}

      {/* Preview Calculation Button */}
      {selectedMethod !== "NONE" && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreviewCalculation}
            className="w-full sm:w-auto gap-2"
          >
            <Calculator className="h-4 w-4" />
            {t("actions.previewCalculation") || "Preview Calculation"}
          </Button>
        </div>
      )}

      {/* Preview Results */}
      {showPreview && previewData && selectedMethod !== "NONE" && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t("sections.calculationPreview") || "Calculation Preview"}
            </CardTitle>
            <CardDescription>
              {t("fields.basedOnAcquisitionCost") ||
                "Based on acquisition cost of"}{" "}
              {formatCurrency(asset?.acquisition_cost || 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t("fields.depreciableAmount")}
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(previewData.totalDepreciableAmount)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t("fields.annualDepreciation")}
                </p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(previewData.annualDepreciation)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t("fields.monthlyDepreciation")}
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(previewData.monthlyDepreciation)}
                </p>
              </div>
            </div>

            <Alert variant="default" className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t("messages.depreciationCalculationReady") ||
                  "Depreciation calculation is ready to be applied"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          className="cursor-pointer"
        >
          {isSubmitting ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
