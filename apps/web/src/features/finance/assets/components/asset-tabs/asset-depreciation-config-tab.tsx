"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  TrendingDown,
  Calendar,
  Calculator,
  AlertCircle,
  Edit2,
  Save,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Asset, AssetDepreciation, AssetCategoryLite } from "../../types";
import { formatDate } from "@/lib/utils";

type DepreciationMethod = "SL" | "DB" | "SYD" | "UOP" | "NONE";

interface AssetDepreciationConfigTabProps {
  asset: Asset | undefined;
  category: AssetCategoryLite | null | undefined;
  isLoading: boolean;
  isCategoryLoading?: boolean;
  onUpdateConfig?: (config: {
    depreciation_method: DepreciationMethod;
    useful_life_months: number;
    salvage_value: number;
    depreciation_start_date?: string;
  }) => Promise<void>;
}

const DEPRECIATION_METHODS: {
  value: DepreciationMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "SL",
    label: "Straight Line (SL)",
    description: "Equal depreciation expense each year",
  },
  {
    value: "DB",
    label: "Declining Balance (DB)",
    description: "Accelerated depreciation with higher early expenses",
  },
  {
    value: "SYD",
    label: "Sum of Years' Digits (SYD)",
    description: "Accelerated method using fractional depreciation",
  },
  {
    value: "UOP",
    label: "Units of Production (UOP)",
    description: "Based on actual usage or output",
  },
  {
    value: "NONE",
    label: "No Depreciation",
    description: "Asset is not depreciated",
  },
];

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateDepreciationProjection(
  asset: Asset,
  method: DepreciationMethod,
  usefulLifeMonths: number,
  salvageValue: number,
): Array<{
  period: string;
  depreciation: number;
  accumulated: number;
  bookValue: number;
}> {
  if (method === "NONE" || usefulLifeMonths <= 0) return [];

  const depreciableBase =
    (asset.total_cost || asset.acquisition_cost) - salvageValue;
  const startDate = asset.depreciation_start_date
    ? new Date(asset.depreciation_start_date)
    : new Date(asset.acquisition_date);

  const projection: Array<{
    period: string;
    depreciation: number;
    accumulated: number;
    bookValue: number;
  }> = [];
  let accumulatedDepreciation = asset.accumulated_depreciation || 0;
  let currentBookValue =
    asset.book_value || asset.total_cost || asset.acquisition_cost;

  // Calculate remaining months for projection
  const remainingMonths = usefulLifeMonths - (asset.age_in_months || 0);
  const monthsToProject = Math.min(remainingMonths, 60); // Project max 5 years ahead

  for (let i = 0; i < monthsToProject; i++) {
    const periodDate = new Date(startDate);
    periodDate.setMonth(periodDate.getMonth() + (asset.age_in_months || 0) + i);
    const period = periodDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });

    let monthlyDepreciation = 0;

    switch (method) {
      case "SL":
        monthlyDepreciation = depreciableBase / usefulLifeMonths;
        break;
      case "DB": {
        // Simplified DB calculation (annual rate / 12)
        const rate = 2 / (usefulLifeMonths / 12); // Double declining
        monthlyDepreciation = (currentBookValue - salvageValue) * (rate / 12);
        break;
      }
      case "SYD": {
        const remainingLife = usefulLifeMonths - (asset.age_in_months || 0) - i;
        const sumOfYears = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;
        monthlyDepreciation = (depreciableBase * remainingLife) / sumOfYears;
        break;
      }
      case "UOP":
        // For UOP, we can't project without usage estimates
        monthlyDepreciation = depreciableBase / usefulLifeMonths; // Fallback to SL
        break;
    }

    // Ensure we don't depreciate below salvage value
    const maxDepreciation = currentBookValue - salvageValue;
    monthlyDepreciation = Math.min(monthlyDepreciation, maxDepreciation);

    if (monthlyDepreciation <= 0) break;

    accumulatedDepreciation += monthlyDepreciation;
    currentBookValue -= monthlyDepreciation;

    projection.push({
      period,
      depreciation: monthlyDepreciation,
      accumulated: accumulatedDepreciation,
      bookValue: Math.max(currentBookValue, salvageValue),
    });
  }

  return projection;
}

export function AssetDepreciationConfigTab({
  asset,
  category,
  isLoading,
  isCategoryLoading,
  onUpdateConfig,
}: AssetDepreciationConfigTabProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable state
  const [editMethod, setEditMethod] = useState<DepreciationMethod>("SL");
  const [editUsefulLife, setEditUsefulLife] = useState(0);
  const [editSalvageValue, setEditSalvageValue] = useState(0);
  const [editStartDate, setEditStartDate] = useState("");

  // Current config from asset or category defaults
  const currentConfig = useMemo(() => {
    const method =
      (asset?.depreciation_method as DepreciationMethod) ||
      (category?.depreciation_method as DepreciationMethod) ||
      "SL";
    const usefulLife =
      asset?.useful_life_months || category?.useful_life_months || 0;
    const salvageValue = asset?.salvage_value || 0;
    const startDate = asset?.depreciation_start_date || asset?.acquisition_date;

    return {
      method,
      usefulLifeMonths: usefulLife,
      usefulLifeYears: Math.round((usefulLife / 12) * 10) / 10,
      salvageValue,
      startDate,
      isUsingCategoryDefaults:
        !asset?.depreciation_method && !!category?.depreciation_method,
    };
  }, [asset, category]);

  // Initialize edit state when entering edit mode
  const handleStartEdit = () => {
    setEditMethod(currentConfig.method);
    setEditUsefulLife(currentConfig.usefulLifeMonths);
    setEditSalvageValue(currentConfig.salvageValue);
    setEditStartDate(currentConfig.startDate?.split("T")[0] || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdateConfig) return;

    setIsSaving(true);
    try {
      await onUpdateConfig({
        depreciation_method: editMethod,
        useful_life_months: editUsefulLife,
        salvage_value: editSalvageValue,
        depreciation_start_date: editStartDate || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate depreciation projection
  const projection = useMemo(() => {
    if (!asset) return [];
    return calculateDepreciationProjection(
      asset,
      isEditing ? editMethod : currentConfig.method,
      isEditing ? editUsefulLife : currentConfig.usefulLifeMonths,
      isEditing ? editSalvageValue : currentConfig.salvageValue,
    );
  }, [
    asset,
    currentConfig,
    isEditing,
    editMethod,
    editUsefulLife,
    editSalvageValue,
  ]);

  const getMethodLabel = (method: DepreciationMethod) => {
    return (
      DEPRECIATION_METHODS.find((m) => m.value === method)?.label || method
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon("noData")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("detail.sections.depreciationConfig") ||
                "Depreciation Configuration"}
            </CardTitle>
            <CardDescription>
              {currentConfig.isUsingCategoryDefaults
                ? t("detail.fields.usingCategoryDefaults") ||
                  "Using category defaults"
                : t("detail.fields.assetSpecificConfig") ||
                  "Asset-specific configuration"}
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {tCommon("edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                {tCommon("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {tCommon("save")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {currentConfig.isUsingCategoryDefaults && (
            <Alert className="mb-4" variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("detail.fields.inheritedFromCategory") ||
                  "Settings inherited from category"}
                :
                <span className="font-medium ml-1">
                  {category?.name || "—"}
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Depreciation Method */}
            <div className="space-y-2">
              <Label>{t("detail.fields.depreciationMethod")}</Label>
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {getMethodLabel(currentConfig.method)}
                  </span>
                </div>
              ) : (
                <Select
                  value={editMethod}
                  onValueChange={(v) => setEditMethod(v as DepreciationMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPRECIATION_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex flex-col">
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
            </div>

            {/* Useful Life */}
            <div className="space-y-2">
              <Label>{t("detail.fields.usefulLifeMonths")}</Label>
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {currentConfig.usefulLifeMonths}{" "}
                    {tCommon("months") || "months"}
                    <span className="text-muted-foreground text-sm ml-1">
                      ({currentConfig.usefulLifeYears}{" "}
                      {tCommon("years") || "years"})
                    </span>
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={editUsefulLife}
                    onChange={(e) =>
                      setEditUsefulLife(parseInt(e.target.value) || 0)
                    }
                    min={1}
                    max={600}
                  />
                  <p className="text-xs text-muted-foreground">
                    ≈ {Math.round((editUsefulLife / 12) * 10) / 10}{" "}
                    {tCommon("years") || "years"}
                  </p>
                </div>
              )}
            </div>

            {/* Salvage Value */}
            <div className="space-y-2">
              <Label>{t("fields.salvageValue")}</Label>
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatNumber(currentConfig.salvageValue)}
                  </span>
                </div>
              ) : (
                <Input
                  type="number"
                  value={editSalvageValue}
                  onChange={(e) =>
                    setEditSalvageValue(parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  step="0.01"
                />
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>{t("detail.fields.depreciationStartDate")}</Label>
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatDate(currentConfig.startDate)}
                  </span>
                </div>
              ) : (
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Category Defaults Comparison */}
          {category && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">
                {t("detail.fields.categoryDefaults") || "Category Defaults"}
              </h4>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">
                    {t("detail.fields.depreciationMethod")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {getMethodLabel(
                        (category.depreciation_method as DepreciationMethod) ||
                          "SL",
                      )}
                    </span>
                    {currentConfig.method === category.depreciation_method ? (
                      <Badge variant="outline" className="text-xs">
                        {tCommon("match") || "Match"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("override") || "Override"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">
                    {t("detail.fields.usefulLife") || "Useful Life"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      {category.useful_life_months}{" "}
                      {tCommon("months") || "months"}
                    </span>
                    {currentConfig.usefulLifeMonths ===
                    category.useful_life_months ? (
                      <Badge variant="outline" className="text-xs">
                        {tCommon("match") || "Match"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("override") || "Override"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">
                    {t("detail.fields.isDepreciable")}
                  </span>
                  <Switch
                    checked={category.is_depreciable}
                    disabled
                    className="scale-75"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t("detail.sections.currentStatus") ||
              "Current Depreciation Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("fields.accumulatedDepreciation")}
              </p>
              <p className="text-lg font-semibold">
                {formatNumber(asset.accumulated_depreciation)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("fields.bookValue")}
              </p>
              <p className="text-lg font-semibold">
                {formatNumber(asset.book_value)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.ageInMonths")}
              </p>
              <p className="text-lg font-semibold">
                {asset.age_in_months || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("detail.fields.depreciationProgress")}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {asset.depreciation_progress?.toFixed(1) || 0}%
                </p>
                {asset.is_fully_deprecated && (
                  <Badge variant="success">
                    {tCommon("complete") || "Complete"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Projection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t("detail.sections.depreciationProjection") ||
              "Depreciation Projection"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? t("detail.fields.projectedWithChanges") ||
                "Projected with your changes"
              : t("detail.fields.futureProjection") ||
                "Future depreciation schedule"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projection.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {currentConfig.method === "NONE"
                ? t("detail.fields.noDepreciationMethod") ||
                  "No depreciation method selected"
                : t("detail.fields.fullyDepreciated") ||
                  "Asset is fully depreciated"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("detail.depreciation.period")}</TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.amount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.accumulated")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("detail.depreciation.bookValue")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projection.slice(0, 12).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.depreciation)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.accumulated)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(row.bookValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {projection.length > 12 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-2"
                      >
                        {t("detail.fields.morePeriods", {
                          count: projection.length - 12,
                        }) || `... and ${projection.length - 12} more periods`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
