"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  Edit3,
  FileDown,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  Truck,
  Calculator,
  X,
  AlertCircle,
  CheckCircle2,
  Building,
  Tag,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "../date-picker";
import { NumericInput } from "@/components/ui/numeric-input";
import { AsyncSelect } from "@/components/ui/async-select";
import { cn } from "@/lib/utils";

import type {
  Asset,
  AssetStatus,
  AssetLocationLite,
  AssetCategoryLite,
  DepartmentLite,
} from "../../types";
import { financeAssetLocationsService } from "@/features/finance/asset-locations/services/finance-asset-locations-service";
import { financeAssetCategoriesService } from "@/features/finance/asset-categories/services/finance-asset-categories-service";

// =============================================================================
// Types
// =============================================================================

export type BulkOperationType =
  | "update"
  | "transfer"
  | "depreciate"
  | "dispose";

export interface BulkUpdatePayload {
  field: "status" | "location_id" | "category_id" | "department_id";
  value: string;
}

export interface BulkTransferPayload {
  locationId: string;
  transferDate: Date;
  description?: string;
}

export interface BulkDepreciatePayload {
  depreciationDate: Date;
  methodOverride?: "SL" | "DB" | "SYD" | "UOP";
}

export type DisposalReason = "sold" | "damaged" | "obsolete" | "other";

export interface BulkDisposePayload {
  disposalDate: Date;
  reason: DisposalReason;
  saleAmount?: number;
  confirmed: boolean;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    assetId: string;
    assetName: string;
    error: string;
  }>;
  reportUrl?: string;
}

interface AssetBulkOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: Asset[];
  onOperationComplete?: (result: BulkOperationResult) => void;
  onDownloadReport?: (result: BulkOperationResult) => void;
}

interface OperationState {
  isRunning: boolean;
  progress: number;
  currentAsset?: string;
  result?: BulkOperationResult;
}

// =============================================================================
// Constants
// =============================================================================

const DISPOSAL_REASONS: DisposalReason[] = [
  "sold",
  "damaged",
  "obsolete",
  "other",
];

const ASSET_STATUSES: AssetStatus[] = [
  "draft",
  "pending_capitalization",
  "active",
  "in_use",
  "under_maintenance",
  "idle",
  "disposed",
  "sold",
  "written_off",
  "transferred",
];

const DEPRECIATION_METHODS = [
  { value: "SL", label: "Straight Line" },
  { value: "DB", label: "Declining Balance" },
  { value: "SYD", label: "Sum of Years Digits" },
  { value: "UOP", label: "Units of Production" },
];

// =============================================================================
// Async Fetchers
// =============================================================================

async function fetchLocations(query: string): Promise<AssetLocationLite[]> {
  const response = await financeAssetLocationsService.list({
    search: query,
    per_page: 20,
  });
  return (response.data || []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    latitude: loc.latitude ?? undefined,
    longitude: loc.longitude ?? undefined,
  }));
}

async function fetchCategories(query: string): Promise<AssetCategoryLite[]> {
  const response = await financeAssetCategoriesService.list({
    search: query,
    per_page: 20,
  });
  return response.data || [];
}

async function fetchDepartments(query: string): Promise<DepartmentLite[]> {
  // TODO: Replace with actual department service
  return [
    { id: "dept-1", name: "IT Department", code: "IT" },
    { id: "dept-2", name: "HR Department", code: "HR" },
    { id: "dept-3", name: "Finance Department", code: "FIN" },
    { id: "dept-4", name: "Operations", code: "OPS" },
  ].filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));
}

// =============================================================================
// Main Component
// =============================================================================

export function AssetBulkOperations({
  open,
  onOpenChange,
  selectedAssets,
  onOperationComplete,
  onDownloadReport,
}: AssetBulkOperationsProps) {
  const t = useTranslations("financeAssets.bulkOperations");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = React.useState<BulkOperationType>("update");
  const [operationState, setOperationState] = React.useState<OperationState>({
    isRunning: false,
    progress: 0,
  });

  // Form States
  const [updatePayload, setUpdatePayload] = React.useState<
    Partial<BulkUpdatePayload>
  >({});
  const [transferPayload, setTransferPayload] = React.useState<
    Partial<BulkTransferPayload>
  >({});
  const [depreciatePayload, setDepreciatePayload] = React.useState<
    Partial<BulkDepreciatePayload>
  >({});
  const [disposePayload, setDisposePayload] = React.useState<
    Partial<BulkDisposePayload>
  >({});

  // Validation States
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setOperationState({ isRunning: false, progress: 0 });
      setUpdatePayload({});
      setTransferPayload({});
      setDepreciatePayload({});
      setDisposePayload({});
      setErrors({});
      setActiveTab("update");
    }
  }, [open]);

  // =============================================================================
  // Validation
  // =============================================================================

  const validateUpdate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!updatePayload.field) {
      newErrors.updateField = t("errors.selectField");
    }
    if (!updatePayload.value) {
      newErrors.updateValue = t("errors.enterValue");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTransfer = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!transferPayload.locationId) {
      newErrors.transferLocation = t("errors.selectLocation");
    }
    if (!transferPayload.transferDate) {
      newErrors.transferDate = t("errors.selectDate");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDepreciate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!depreciatePayload.depreciationDate) {
      newErrors.depreciationDate = t("errors.selectDate");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDispose = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!disposePayload.disposalDate) {
      newErrors.disposalDate = t("errors.selectDate");
    }
    if (!disposePayload.reason) {
      newErrors.disposalReason = t("errors.selectReason");
    }
    if (disposePayload.reason === "sold" && !disposePayload.saleAmount) {
      newErrors.saleAmount = t("errors.enterSaleAmount");
    }
    if (!disposePayload.confirmed) {
      newErrors.confirmation = t("errors.confirmDisposal");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // Operation Handlers
  // =============================================================================

  const simulateBulkOperation = async (): Promise<BulkOperationResult> => {
    // Simulate API call with progress updates
    const totalAssets = selectedAssets.length;
    let processedCount = 0;
    const errors: BulkOperationResult["errors"] = [];

    for (const asset of selectedAssets) {
      // Update progress
      processedCount++;
      const progress = Math.round((processedCount / totalAssets) * 100);
      setOperationState((prev) => ({
        ...prev,
        progress,
        currentAsset: asset.name,
      }));

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Simulate random errors (10% chance)
      if (Math.random() < 0.1) {
        errors.push({
          assetId: asset.id,
          assetName: asset.name,
          error: t("errors.simulatedError"),
        });
      }
    }

    return {
      success: errors.length === 0,
      processedCount,
      successCount: processedCount - errors.length,
      errorCount: errors.length,
      errors,
      reportUrl: `/api/reports/bulk-operation-${Date.now()}.pdf`,
    };
  };

  const handleExecute = async () => {
    let isValid = false;

    switch (activeTab) {
      case "update":
        isValid = validateUpdate();
        break;
      case "transfer":
        isValid = validateTransfer();
        break;
      case "depreciate":
        isValid = validateDepreciate();
        break;
      case "dispose":
        isValid = validateDispose();
        break;
    }

    if (!isValid) return;

    setOperationState({ isRunning: true, progress: 0 });

    try {
      const result = await simulateBulkOperation();
      setOperationState((prev) => ({ ...prev, isRunning: false, result }));
      onOperationComplete?.(result);
    } catch (error) {
      setOperationState((prev) => ({
        ...prev,
        isRunning: false,
        result: {
          success: false,
          processedCount: 0,
          successCount: 0,
          errorCount: selectedAssets.length,
          errors: selectedAssets.map((a) => ({
            assetId: a.id,
            assetName: a.name,
            error: error instanceof Error ? error.message : t("errors.unknown"),
          })),
        },
      }));
    }
  };

  const handleClose = () => {
    if (operationState.isRunning) return;
    onOpenChange(false);
  };

  const handleReset = () => {
    setOperationState({ isRunning: false, progress: 0 });
    setUpdatePayload({});
    setTransferPayload({});
    setDepreciatePayload({});
    setDisposePayload({});
    setErrors({});
  };

  const handleDownloadReport = () => {
    if (operationState.result) {
      onDownloadReport?.(operationState.result);
    }
  };

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderUpdateFieldValue = () => {
    if (!updatePayload.field) return null;

    switch (updatePayload.field) {
      case "status":
        return (
          <Select
            value={updatePayload.value}
            onValueChange={(value) =>
              setUpdatePayload({ ...updatePayload, value })
            }
          >
            <SelectTrigger
              className={cn(errors.updateValue && "border-destructive")}
            >
              <SelectValue placeholder={t("placeholders.selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "location_id":
        return (
          <AsyncSelect
            fetcher={fetchLocations}
            renderOption={(item) => <span>{item.name}</span>}
            getLabel={(item) => item.name}
            getValue={(item) => item.id}
            value={updatePayload.value}
            onChange={(value) => setUpdatePayload({ ...updatePayload, value })}
            label={t("fields.location")}
            placeholder={t("placeholders.selectLocation")}
          />
        );

      case "category_id":
        return (
          <AsyncSelect
            fetcher={fetchCategories}
            renderOption={(item) => <span>{item.name}</span>}
            getLabel={(item) => item.name}
            getValue={(item) => item.id}
            value={updatePayload.value}
            onChange={(value) => setUpdatePayload({ ...updatePayload, value })}
            label={t("fields.category")}
            placeholder={t("placeholders.selectCategory")}
          />
        );

      case "department_id":
        return (
          <AsyncSelect
            fetcher={fetchDepartments}
            renderOption={(item) => (
              <span>
                {item.name}{" "}
                {item.code && (
                  <span className="text-muted-foreground">({item.code})</span>
                )}
              </span>
            )}
            getLabel={(item) => item.name}
            getValue={(item) => item.id}
            value={updatePayload.value}
            onChange={(value) => setUpdatePayload({ ...updatePayload, value })}
            label={t("fields.department")}
            placeholder={t("placeholders.selectDepartment")}
          />
        );

      default:
        return null;
    }
  };

  const renderProgressStep = (
    step: number,
    label: string,
    isActive: boolean,
    isComplete: boolean,
  ) => (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
          isComplete && "bg-success text-success-foreground",
          isActive && !isComplete && "bg-primary text-primary-foreground",
          !isActive && !isComplete && "bg-muted text-muted-foreground",
        )}
      >
        {isComplete ? <Check className="h-4 w-4" /> : step}
      </div>
      <span
        className={cn(
          "text-sm",
          isActive && !isComplete && "font-medium text-foreground",
          isComplete && "text-success",
          !isActive && !isComplete && "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );

  // =============================================================================
  // Render
  // =============================================================================

  if (selectedAssets.length === 0 && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("errors.noAssets")}</AlertTitle>
            <AlertDescription>{t("errors.selectAssetsFirst")}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("title")}
            <Badge variant="secondary">
              {selectedAssets.length} {t("assetsSelected")}
            </Badge>
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {operationState.result ? (
          // Results View
          <div className="space-y-6">
            <Alert
              variant={
                operationState.result.success ? "default" : "destructive"
              }
              className={cn(
                operationState.result.success &&
                  "border-success bg-success/10 text-success-foreground",
              )}
            >
              <div className="flex items-center gap-2">
                {operationState.result.success ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <AlertTitle>
                  {operationState.result.success
                    ? t("results.success")
                    : t("results.partial")}
                </AlertTitle>
              </div>
              <AlertDescription className="mt-2">
                {t("results.summary", {
                  success: operationState.result.successCount,
                  total: operationState.result.processedCount,
                  errors: operationState.result.errorCount,
                })}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <ResultStat
                label={t("results.processed")}
                value={operationState.result.processedCount}
                icon={Check}
              />
              <ResultStat
                label={t("results.successful")}
                value={operationState.result.successCount}
                icon={CheckCircle2}
                variant="success"
              />
              <ResultStat
                label={t("results.failed")}
                value={operationState.result.errorCount}
                icon={X}
                variant={
                  operationState.result.errorCount > 0
                    ? "destructive"
                    : "default"
                }
              />
            </div>

            {operationState.result.errors.length > 0 && (
              <div className="space-y-2">
                <Label>{t("results.errors")}</Label>
                <ScrollArea className="h-40 rounded-md border">
                  <div className="p-4 space-y-2">
                    {operationState.result.errors.map((error) => (
                      <div
                        key={error.assetId}
                        className="flex items-start gap-2 p-2 rounded-md bg-destructive/10"
                      >
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {error.assetName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {error.error}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("actions.newOperation")}
              </Button>
              {onDownloadReport && (
                <Button variant="outline" onClick={handleDownloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("actions.downloadReport")}
                </Button>
              )}
              <Button onClick={handleClose}>{tCommon("close")}</Button>
            </DialogFooter>
          </div>
        ) : operationState.isRunning ? (
          // Progress View
          <div className="space-y-8 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-lg font-medium">
                {operationState.currentAsset}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("progress.processing", {
                  current: Math.round(
                    (operationState.progress / 100) * selectedAssets.length,
                  ),
                  total: selectedAssets.length,
                })}
              </p>
            </div>

            <Progress value={operationState.progress} className="h-2" />

            <div className="flex justify-center gap-8">
              {renderProgressStep(
                1,
                t("progress.steps.preparing"),
                true,
                operationState.progress >= 20,
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              {renderProgressStep(
                2,
                t("progress.steps.processing"),
                operationState.progress >= 20,
                operationState.progress >= 80,
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              {renderProgressStep(
                3,
                t("progress.steps.finishing"),
                operationState.progress >= 80,
                operationState.progress >= 100,
              )}
            </div>
          </div>
        ) : (
          // Form View
          <>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as BulkOperationType)}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="update" className="gap-1">
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabs.update")}</span>
                </TabsTrigger>
                <TabsTrigger value="transfer" className="gap-1">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabs.transfer")}</span>
                </TabsTrigger>
                <TabsTrigger value="depreciate" className="gap-1">
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {t("tabs.depreciate")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="dispose" className="gap-1">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tabs.dispose")}</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <div className="pr-4 space-y-6">
                  {/* Update Tab */}
                  <TabsContent value="update" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label>{t("update.field")}</Label>
                      <Select
                        value={updatePayload.field}
                        onValueChange={(value: BulkUpdatePayload["field"]) =>
                          setUpdatePayload({ field: value, value: undefined })
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            errors.updateField && "border-destructive",
                          )}
                        >
                          <SelectValue
                            placeholder={t("placeholders.selectField")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="status">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              {t("fields.status")}
                            </div>
                          </SelectItem>
                          <SelectItem value="location_id">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {t("fields.location")}
                            </div>
                          </SelectItem>
                          <SelectItem value="category_id">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              {t("fields.category")}
                            </div>
                          </SelectItem>
                          <SelectItem value="department_id">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {t("fields.department")}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.updateField && (
                        <p className="text-sm text-destructive">
                          {errors.updateField}
                        </p>
                      )}
                    </div>

                    {updatePayload.field && (
                      <div className="space-y-2">
                        <Label>{t("update.newValue")}</Label>
                        {renderUpdateFieldValue()}
                        {errors.updateValue && (
                          <p className="text-sm text-destructive">
                            {errors.updateValue}
                          </p>
                        )}
                      </div>
                    )}

                    <Alert>
                      <RefreshCw className="h-4 w-4" />
                      <AlertTitle>{t("update.preview.title")}</AlertTitle>
                      <AlertDescription>
                        {t("update.preview.description", {
                          count: selectedAssets.length,
                        })}
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  {/* Transfer Tab */}
                  <TabsContent value="transfer" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t("transfer.newLocation")}
                      </Label>
                      <AsyncSelect
                        fetcher={fetchLocations}
                        renderOption={(item) => <span>{item.name}</span>}
                        getLabel={(item) => item.name}
                        getValue={(item) => item.id}
                        value={transferPayload.locationId}
                        onChange={(value) =>
                          setTransferPayload({
                            ...transferPayload,
                            locationId: value,
                          })
                        }
                        label={t("fields.location")}
                        placeholder={t("placeholders.selectLocation")}
                      />
                      {errors.transferLocation && (
                        <p className="text-sm text-destructive">
                          {errors.transferLocation}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t("transfer.date")}
                      </Label>
                      <DatePicker
                        value={
                          transferPayload.transferDate
                            ? transferPayload.transferDate
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(value) =>
                          setTransferPayload({
                            ...transferPayload,
                            transferDate: value ? new Date(value) : undefined,
                          })
                        }
                        placeholder={t("placeholders.selectDate")}
                      />
                      {errors.transferDate && (
                        <p className="text-sm text-destructive">
                          {errors.transferDate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t("transfer.description")}
                      </Label>
                      <Textarea
                        value={transferPayload.description || ""}
                        onChange={(e) =>
                          setTransferPayload({
                            ...transferPayload,
                            description: e.target.value,
                          })
                        }
                        placeholder={t("placeholders.transferDescription")}
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Depreciate Tab */}
                  <TabsContent value="depreciate" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t("depreciate.date")}
                      </Label>
                      <DatePicker
                        value={
                          depreciatePayload.depreciationDate
                            ? depreciatePayload.depreciationDate
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(value) =>
                          setDepreciatePayload({
                            ...depreciatePayload,
                            depreciationDate: value
                              ? new Date(value)
                              : undefined,
                          })
                        }
                        placeholder={t("placeholders.selectDate")}
                      />
                      {errors.depreciationDate && (
                        <p className="text-sm text-destructive">
                          {errors.depreciationDate}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        {t("depreciate.methodOverride")}
                      </Label>
                      <Select
                        value={depreciatePayload.methodOverride}
                        onValueChange={(value: "SL" | "DB" | "SYD" | "UOP") =>
                          setDepreciatePayload({
                            ...depreciatePayload,
                            methodOverride: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("placeholders.optional")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPRECIATION_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertTitle>{t("depreciate.preview.title")}</AlertTitle>
                      <AlertDescription>
                        {t("depreciate.preview.description", {
                          count: selectedAssets.length,
                        })}
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  {/* Dispose Tab */}
                  <TabsContent value="dispose" className="space-y-4 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t("dispose.date")}
                        </Label>
                        <DatePicker
                          value={
                            disposePayload.disposalDate
                              ? disposePayload.disposalDate
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(value) =>
                            setDisposePayload({
                              ...disposePayload,
                              disposalDate: value ? new Date(value) : undefined,
                            })
                          }
                          placeholder={t("placeholders.selectDate")}
                        />
                        {errors.disposalDate && (
                          <p className="text-sm text-destructive">
                            {errors.disposalDate}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {t("dispose.reason")}
                        </Label>
                        <Select
                          value={disposePayload.reason}
                          onValueChange={(value: DisposalReason) =>
                            setDisposePayload({
                              ...disposePayload,
                              reason: value,
                            })
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              errors.disposalReason && "border-destructive",
                            )}
                          >
                            <SelectValue
                              placeholder={t("placeholders.selectReason")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {DISPOSAL_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {t(`dispose.reasons.${reason}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.disposalReason && (
                          <p className="text-sm text-destructive">
                            {errors.disposalReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {disposePayload.reason === "sold" && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {t("dispose.saleAmount")}
                        </Label>
                        <NumericInput
                          value={disposePayload.saleAmount}
                          onChange={(value) =>
                            setDisposePayload({
                              ...disposePayload,
                              saleAmount: value,
                            })
                          }
                          placeholder={t("placeholders.enterAmount")}
                          className={cn(
                            errors.saleAmount && "border-destructive",
                          )}
                        />
                        {errors.saleAmount && (
                          <p className="text-sm text-destructive">
                            {errors.saleAmount}
                          </p>
                        )}
                      </div>
                    )}

                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{t("dispose.warning.title")}</AlertTitle>
                      <AlertDescription>
                        {t("dispose.warning.description")}
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox
                        id="confirm-disposal"
                        checked={disposePayload.confirmed}
                        onCheckedChange={(checked) =>
                          setDisposePayload({
                            ...disposePayload,
                            confirmed: checked as boolean,
                          })
                        }
                        className={cn(
                          errors.confirmation && "border-destructive",
                        )}
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="confirm-disposal"
                          className="font-medium cursor-pointer"
                        >
                          {t("dispose.confirmation")}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t("dispose.confirmationDescription", {
                            count: selectedAssets.length,
                          })}
                        </p>
                      </div>
                    </div>
                    {errors.confirmation && (
                      <p className="text-sm text-destructive">
                        {errors.confirmation}
                      </p>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <Separator />

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleExecute} className="gap-2">
                {activeTab === "dispose" ? (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t("actions.confirmDispose")}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t("actions.execute")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface ResultStatProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "destructive";
}

function ResultStat({
  label,
  value,
  icon: Icon,
  variant = "default",
}: ResultStatProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg border",
        variant === "success" && "border-success bg-success/10",
        variant === "destructive" &&
          value > 0 &&
          "border-destructive bg-destructive/10",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 mb-2",
          variant === "success" && "text-success",
          variant === "destructive" && value > 0 && "text-destructive",
        )}
      />
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default AssetBulkOperations;
