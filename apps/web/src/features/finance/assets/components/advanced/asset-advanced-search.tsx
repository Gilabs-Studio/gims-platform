"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  DollarSign,
  Tag,
  MapPin,
  Building,
  User,
  Bookmark,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AsyncSelect } from "@/components/ui/async-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";

import type {
  AssetStatus,
  AssetLifecycleStage,
  AssetCategoryLite,
  AssetLocationLite,
  DepartmentLite,
  EmployeeLite,
} from "../../types";
import { financeAssetCategoriesService } from "@/features/finance/asset-categories/services/finance-asset-categories-service";
import { financeAssetLocationsService } from "@/features/finance/asset-locations/services/finance-asset-locations-service";

// =============================================================================
// Types
// =============================================================================

export interface AssetAdvancedSearchFilters {
  query?: string;
  status?: AssetStatus[];
  lifecycleStage?: AssetLifecycleStage[];
  categoryIds?: string[];
  locationIds?: string[];
  departmentIds?: string[];
  employeeIds?: string[];
  acquisitionDateRange?: DateRange;
  acquisitionCostMin?: number;
  acquisitionCostMax?: number;
  bookValueMin?: number;
  bookValueMax?: number;
  isCapitalized?: boolean;
  isDepreciable?: boolean;
  isFullyDepreciated?: boolean;
  hasWarranty?: boolean;
  warrantyExpiringSoon?: boolean;
  assignmentFilter?: "all" | "assigned" | "unassigned";
}

interface AssetAdvancedSearchProps {
  filters: AssetAdvancedSearchFilters;
  onFiltersChange: (filters: AssetAdvancedSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  onSaveSearch?: (name: string, filters: AssetAdvancedSearchFilters) => void;
  className?: string;
  disabled?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

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

const LIFECYCLE_STAGES: AssetLifecycleStage[] = [
  "draft",
  "pending_capitalization",
  "active",
  "in_use",
  "under_maintenance",
  "disposed",
  "written_off",
];

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function countActiveFilters(filters: AssetAdvancedSearchFilters): number {
  let count = 0;
  if (filters.query?.trim()) count++;
  if (filters.status?.length) count++;
  if (filters.lifecycleStage?.length) count++;
  if (filters.categoryIds?.length) count++;
  if (filters.locationIds?.length) count++;
  if (filters.departmentIds?.length) count++;
  if (filters.employeeIds?.length) count++;
  if (filters.acquisitionDateRange?.from || filters.acquisitionDateRange?.to)
    count++;
  if (filters.acquisitionCostMin !== undefined) count++;
  if (filters.acquisitionCostMax !== undefined) count++;
  if (filters.bookValueMin !== undefined) count++;
  if (filters.bookValueMax !== undefined) count++;
  if (filters.isCapitalized !== undefined) count++;
  if (filters.isDepreciable !== undefined) count++;
  if (filters.isFullyDepreciated !== undefined) count++;
  if (filters.hasWarranty !== undefined) count++;
  if (filters.warrantyExpiringSoon !== undefined) count++;
  if (filters.assignmentFilter && filters.assignmentFilter !== "all") count++;
  return count;
}

// =============================================================================
// Async Fetchers
// =============================================================================

async function fetchCategories(query: string): Promise<AssetCategoryLite[]> {
  const response = await financeAssetCategoriesService.list({
    search: query,
    per_page: 20,
  });
  return response.data || [];
}

async function fetchLocations(query: string): Promise<AssetLocationLite[]> {
  const response = await financeAssetLocationsService.list({
    search: query,
    per_page: 20,
  });
  // Map to AssetLocationLite format
  return (response.data || []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address,
    latitude: loc.latitude ?? undefined,
    longitude: loc.longitude ?? undefined,
  }));
}

// Placeholder fetchers - replace with actual services when available
async function fetchDepartments(query: string): Promise<DepartmentLite[]> {
  // TODO: Replace with actual department service
  return [
    { id: "dept-1", name: "IT Department", code: "IT" },
    { id: "dept-2", name: "HR Department", code: "HR" },
    { id: "dept-3", name: "Finance Department", code: "FIN" },
    { id: "dept-4", name: "Operations", code: "OPS" },
  ].filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));
}

async function fetchEmployees(query: string): Promise<EmployeeLite[]> {
  // TODO: Replace with actual employee service
  return [
    {
      id: "emp-1",
      name: "John Doe",
      employee_code: "EMP001",
      position: "Manager",
    },
    {
      id: "emp-2",
      name: "Jane Smith",
      employee_code: "EMP002",
      position: "Developer",
    },
    {
      id: "emp-3",
      name: "Bob Johnson",
      employee_code: "EMP003",
      position: "Analyst",
    },
  ].filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.employee_code?.toLowerCase().includes(query.toLowerCase()),
  );
}

// =============================================================================
// Components
// =============================================================================

export function AssetAdvancedSearch({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  onSaveSearch,
  className,
  disabled = false,
}: AssetAdvancedSearchProps) {
  const t = useTranslations("financeAssets.advancedSearch");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveSearchName, setSaveSearchName] = React.useState("");
  const activeFilterCount = countActiveFilters(filters);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleQueryChange = (value: string) => {
    onFiltersChange({ ...filters, query: value });
  };

  const handleStatusToggle = (status: AssetStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleLifecycleToggle = (stage: AssetLifecycleStage) => {
    const currentStages = filters.lifecycleStage || [];
    const newStages = currentStages.includes(stage)
      ? currentStages.filter((s) => s !== stage)
      : [...currentStages, stage];
    onFiltersChange({ ...filters, lifecycleStage: newStages });
  };

  const handleCategorySelect = (
    categoryId: string,
    category?: AssetCategoryLite,
  ) => {
    if (!categoryId) {
      onFiltersChange({ ...filters, categoryIds: [] });
      return;
    }
    const currentIds = filters.categoryIds || [];
    if (!currentIds.includes(categoryId)) {
      onFiltersChange({ ...filters, categoryIds: [...currentIds, categoryId] });
    }
  };

  const handleLocationSelect = (
    locationId: string,
    location?: AssetLocationLite,
  ) => {
    if (!locationId) {
      onFiltersChange({ ...filters, locationIds: [] });
      return;
    }
    const currentIds = filters.locationIds || [];
    if (!currentIds.includes(locationId)) {
      onFiltersChange({ ...filters, locationIds: [...currentIds, locationId] });
    }
  };

  const handleDepartmentSelect = (deptId: string, dept?: DepartmentLite) => {
    if (!deptId) {
      onFiltersChange({ ...filters, departmentIds: [] });
      return;
    }
    const currentIds = filters.departmentIds || [];
    if (!currentIds.includes(deptId)) {
      onFiltersChange({ ...filters, departmentIds: [...currentIds, deptId] });
    }
  };

  const handleEmployeeSelect = (empId: string, emp?: EmployeeLite) => {
    if (!empId) {
      onFiltersChange({ ...filters, employeeIds: [] });
      return;
    }
    const currentIds = filters.employeeIds || [];
    if (!currentIds.includes(empId)) {
      onFiltersChange({ ...filters, employeeIds: [...currentIds, empId] });
    }
  };

  const handleRemoveFilter = (key: keyof AssetAdvancedSearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const handleRemoveArrayFilter = (
    key:
      | "status"
      | "lifecycleStage"
      | "categoryIds"
      | "locationIds"
      | "departmentIds"
      | "employeeIds",
    value: string,
  ) => {
    const current = filters[key] || [];
    onFiltersChange({
      ...filters,
      [key]: current.filter((v) => v !== value),
    });
  };

  const handleSaveSearch = () => {
    if (onSaveSearch && saveSearchName.trim()) {
      onSaveSearch(saveSearchName.trim(), filters);
      setSaveSearchName("");
      setSaveDialogOpen(false);
    }
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderActiveFilters = () => {
    const items: React.ReactNode[] = [];

    if (filters.query?.trim()) {
      items.push(
        <ActiveFilterBadge
          key="query"
          label={`${t("filters.query")}: ${filters.query}`}
          onRemove={() => handleRemoveFilter("query")}
        />,
      );
    }

    filters.status?.forEach((status) => {
      items.push(
        <ActiveFilterBadge
          key={`status-${status}`}
          label={t(`status.${status}`)}
          onRemove={() => handleRemoveArrayFilter("status", status)}
          variant="secondary"
        />,
      );
    });

    filters.lifecycleStage?.forEach((stage) => {
      items.push(
        <ActiveFilterBadge
          key={`lifecycle-${stage}`}
          label={t(`lifecycle.${stage}`)}
          onRemove={() => handleRemoveArrayFilter("lifecycleStage", stage)}
          variant="secondary"
        />,
      );
    });

    filters.categoryIds?.forEach((id, idx) => {
      items.push(
        <ActiveFilterBadge
          key={`category-${id}`}
          label={`${t("filters.category")} #${idx + 1}`}
          onRemove={() => handleRemoveArrayFilter("categoryIds", id)}
          variant="outline"
        />,
      );
    });

    filters.locationIds?.forEach((id, idx) => {
      items.push(
        <ActiveFilterBadge
          key={`location-${id}`}
          label={`${t("filters.location")} #${idx + 1}`}
          onRemove={() => handleRemoveArrayFilter("locationIds", id)}
          variant="outline"
        />,
      );
    });

    filters.departmentIds?.forEach((id, idx) => {
      items.push(
        <ActiveFilterBadge
          key={`dept-${id}`}
          label={`${t("filters.department")} #${idx + 1}`}
          onRemove={() => handleRemoveArrayFilter("departmentIds", id)}
          variant="outline"
        />,
      );
    });

    filters.employeeIds?.forEach((id, idx) => {
      items.push(
        <ActiveFilterBadge
          key={`emp-${id}`}
          label={`${t("filters.employee")} #${idx + 1}`}
          onRemove={() => handleRemoveArrayFilter("employeeIds", id)}
          variant="outline"
        />,
      );
    });

    if (
      filters.acquisitionDateRange?.from ||
      filters.acquisitionDateRange?.to
    ) {
      const from = filters.acquisitionDateRange?.from
        ? format(filters.acquisitionDateRange.from, "dd/MM/yyyy", {
            locale: id,
          })
        : "...";
      const to = filters.acquisitionDateRange?.to
        ? format(filters.acquisitionDateRange.to, "dd/MM/yyyy", { locale: id })
        : "...";
      items.push(
        <ActiveFilterBadge
          key="acquisition-date"
          label={`${t("filters.acquisitionDate")}: ${from} - ${to}`}
          onRemove={() => handleRemoveFilter("acquisitionDateRange")}
          variant="outline"
        />,
      );
    }

    if (
      filters.acquisitionCostMin !== undefined ||
      filters.acquisitionCostMax !== undefined
    ) {
      const min =
        filters.acquisitionCostMin !== undefined
          ? formatCurrency(filters.acquisitionCostMin)
          : "0";
      const max =
        filters.acquisitionCostMax !== undefined
          ? formatCurrency(filters.acquisitionCostMax)
          : "∞";
      items.push(
        <ActiveFilterBadge
          key="acquisition-cost"
          label={`${t("filters.acquisitionCost")}: ${min} - ${max}`}
          onRemove={() => {
            const newFilters = { ...filters };
            delete newFilters.acquisitionCostMin;
            delete newFilters.acquisitionCostMax;
            onFiltersChange(newFilters);
          }}
          variant="outline"
        />,
      );
    }

    if (
      filters.bookValueMin !== undefined ||
      filters.bookValueMax !== undefined
    ) {
      const min =
        filters.bookValueMin !== undefined
          ? formatCurrency(filters.bookValueMin)
          : "0";
      const max =
        filters.bookValueMax !== undefined
          ? formatCurrency(filters.bookValueMax)
          : "∞";
      items.push(
        <ActiveFilterBadge
          key="book-value"
          label={`${t("filters.bookValue")}: ${min} - ${max}`}
          onRemove={() => {
            const newFilters = { ...filters };
            delete newFilters.bookValueMin;
            delete newFilters.bookValueMax;
            onFiltersChange(newFilters);
          }}
          variant="outline"
        />,
      );
    }

    if (filters.isCapitalized !== undefined) {
      items.push(
        <ActiveFilterBadge
          key="capitalized"
          label={t("filters.isCapitalized")}
          onRemove={() => handleRemoveFilter("isCapitalized")}
          variant={filters.isCapitalized ? "default" : "secondary"}
        />,
      );
    }

    if (filters.isDepreciable !== undefined) {
      items.push(
        <ActiveFilterBadge
          key="depreciable"
          label={t("filters.isDepreciable")}
          onRemove={() => handleRemoveFilter("isDepreciable")}
          variant={filters.isDepreciable ? "default" : "secondary"}
        />,
      );
    }

    if (filters.isFullyDepreciated !== undefined) {
      items.push(
        <ActiveFilterBadge
          key="fully-depreciated"
          label={t("filters.isFullyDepreciated")}
          onRemove={() => handleRemoveFilter("isFullyDepreciated")}
          variant={filters.isFullyDepreciated ? "default" : "secondary"}
        />,
      );
    }

    if (filters.hasWarranty !== undefined) {
      items.push(
        <ActiveFilterBadge
          key="has-warranty"
          label={t("filters.hasWarranty")}
          onRemove={() => handleRemoveFilter("hasWarranty")}
          variant={filters.hasWarranty ? "default" : "secondary"}
        />,
      );
    }

    if (filters.warrantyExpiringSoon !== undefined) {
      items.push(
        <ActiveFilterBadge
          key="warranty-expiring"
          label={t("filters.warrantyExpiringSoon")}
          onRemove={() => handleRemoveFilter("warrantyExpiringSoon")}
          variant="warning"
        />,
      );
    }

    if (filters.assignmentFilter && filters.assignmentFilter !== "all") {
      items.push(
        <ActiveFilterBadge
          key="assignment"
          label={t(`assignment.${filters.assignmentFilter}`)}
          onRemove={() => handleRemoveFilter("assignmentFilter")}
          variant="outline"
        />,
      );
    }

    return items;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("quickSearchPlaceholder")}
            value={filters.query || ""}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="sm:w-auto"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2"
              disabled={disabled}
            >
              <Filter className="h-4 w-4" />
              {t("advancedFilters")}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {activeFilterCount}
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
        <Button onClick={onSearch} disabled={disabled} className="gap-2">
          <Search className="h-4 w-4" />
          {tCommon("search")}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="rounded-lg border bg-card p-4 space-y-6">
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-6 pr-4">
                {/* Row 1: Status & Lifecycle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Multi-Select */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {t("filters.status")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ASSET_STATUSES.map((status) => (
                        <StatusBadge
                          key={status}
                          status={status}
                          selected={filters.status?.includes(status) || false}
                          onClick={() => handleStatusToggle(status)}
                          label={t(`status.${status}`)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Lifecycle Stage Multi-Select */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      {t("filters.lifecycleStage")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {LIFECYCLE_STAGES.map((stage) => (
                        <StatusBadge
                          key={stage}
                          status={stage}
                          selected={
                            filters.lifecycleStage?.includes(stage) || false
                          }
                          onClick={() => handleLifecycleToggle(stage)}
                          label={t(`lifecycle.${stage}`)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Row 2: Async Selects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categories */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {t("filters.category")}
                    </Label>
                    <AsyncSelect
                      fetcher={fetchCategories}
                      renderOption={(item) => <span>{item.name}</span>}
                      getLabel={(item) => item.name}
                      getValue={(item) => item.id}
                      value={filters.categoryIds?.[0] || ""}
                      onChange={handleCategorySelect}
                      label={t("filters.category")}
                      placeholder={t("placeholders.selectCategory")}
                    />
                    {filters.categoryIds && filters.categoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filters.categoryIds.map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {id.slice(0, 8)}...
                            <button
                              onClick={() =>
                                handleRemoveArrayFilter("categoryIds", id)
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Locations */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {t("filters.location")}
                    </Label>
                    <AsyncSelect
                      fetcher={fetchLocations}
                      renderOption={(item) => <span>{item.name}</span>}
                      getLabel={(item) => item.name}
                      getValue={(item) => item.id}
                      value={filters.locationIds?.[0] || ""}
                      onChange={handleLocationSelect}
                      label={t("filters.location")}
                      placeholder={t("placeholders.selectLocation")}
                    />
                    {filters.locationIds && filters.locationIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filters.locationIds.map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {id.slice(0, 8)}...
                            <button
                              onClick={() =>
                                handleRemoveArrayFilter("locationIds", id)
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Departments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {t("filters.department")}
                    </Label>
                    <AsyncSelect
                      fetcher={fetchDepartments}
                      renderOption={(item) => (
                        <span>
                          {item.name}{" "}
                          {item.code && (
                            <span className="text-muted-foreground">
                              ({item.code})
                            </span>
                          )}
                        </span>
                      )}
                      getLabel={(item) => item.name}
                      getValue={(item) => item.id}
                      value={filters.departmentIds?.[0] || ""}
                      onChange={handleDepartmentSelect}
                      label={t("filters.department")}
                      placeholder={t("placeholders.selectDepartment")}
                    />
                    {filters.departmentIds &&
                      filters.departmentIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {filters.departmentIds.map((id) => (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {id.slice(0, 8)}...
                              <button
                                onClick={() =>
                                  handleRemoveArrayFilter("departmentIds", id)
                                }
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Employees */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {t("filters.employee")}
                    </Label>
                    <AsyncSelect
                      fetcher={fetchEmployees}
                      renderOption={(item) => (
                        <span>
                          {item.name}{" "}
                          {item.employee_code && (
                            <span className="text-muted-foreground">
                              ({item.employee_code})
                            </span>
                          )}
                        </span>
                      )}
                      getLabel={(item) => item.name}
                      getValue={(item) => item.id}
                      value={filters.employeeIds?.[0] || ""}
                      onChange={handleEmployeeSelect}
                      label={t("filters.employee")}
                      placeholder={t("placeholders.selectEmployee")}
                    />
                    {filters.employeeIds && filters.employeeIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filters.employeeIds.map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {id.slice(0, 8)}...
                            <button
                              onClick={() =>
                                handleRemoveArrayFilter("employeeIds", id)
                              }
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Row 3: Date & Value Ranges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Acquisition Date Range */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {t("filters.acquisitionDate")}
                    </Label>
                    <DateRangePicker
                      dateRange={filters.acquisitionDateRange}
                      onDateChange={(range) =>
                        onFiltersChange({
                          ...filters,
                          acquisitionDateRange: range || undefined,
                        })
                      }
                    />
                  </div>

                  {/* Assignment Filter */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {t("filters.assignment")}
                    </Label>
                    <Select
                      value={filters.assignmentFilter || "all"}
                      onValueChange={(
                        value: "all" | "assigned" | "unassigned",
                      ) =>
                        onFiltersChange({ ...filters, assignmentFilter: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("placeholders.selectAssignment")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("assignment.all")}
                        </SelectItem>
                        <SelectItem value="assigned">
                          {t("assignment.assigned")}
                        </SelectItem>
                        <SelectItem value="unassigned">
                          {t("assignment.unassigned")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Value Ranges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Acquisition Cost Range */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {t("filters.acquisitionCost")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <NumericInput
                        placeholder={t("placeholders.min")}
                        value={filters.acquisitionCostMin}
                        onChange={(value) =>
                          onFiltersChange({
                            ...filters,
                            acquisitionCostMin: value,
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">-</span>
                      <NumericInput
                        placeholder={t("placeholders.max")}
                        value={filters.acquisitionCostMax}
                        onChange={(value) =>
                          onFiltersChange({
                            ...filters,
                            acquisitionCostMax: value,
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Book Value Range */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {t("filters.bookValue")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <NumericInput
                        placeholder={t("placeholders.min")}
                        value={filters.bookValueMin}
                        onChange={(value) =>
                          onFiltersChange({ ...filters, bookValueMin: value })
                        }
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">-</span>
                      <NumericInput
                        placeholder={t("placeholders.max")}
                        value={filters.bookValueMax}
                        onChange={(value) =>
                          onFiltersChange({ ...filters, bookValueMax: value })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Row 4: Boolean Toggles */}
                <div className="space-y-3">
                  <Label>{t("filters.booleanFilters")}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ToggleFilter
                      label={t("filters.isCapitalized")}
                      checked={filters.isCapitalized}
                      onCheckedChange={(checked) =>
                        onFiltersChange({
                          ...filters,
                          isCapitalized:
                            checked === filters.isCapitalized
                              ? undefined
                              : checked,
                        })
                      }
                    />
                    <ToggleFilter
                      label={t("filters.isDepreciable")}
                      checked={filters.isDepreciable}
                      onCheckedChange={(checked) =>
                        onFiltersChange({
                          ...filters,
                          isDepreciable:
                            checked === filters.isDepreciable
                              ? undefined
                              : checked,
                        })
                      }
                    />
                    <ToggleFilter
                      label={t("filters.isFullyDepreciated")}
                      checked={filters.isFullyDepreciated}
                      onCheckedChange={(checked) =>
                        onFiltersChange({
                          ...filters,
                          isFullyDepreciated:
                            checked === filters.isFullyDepreciated
                              ? undefined
                              : checked,
                        })
                      }
                    />
                    <ToggleFilter
                      label={t("filters.hasWarranty")}
                      checked={filters.hasWarranty}
                      onCheckedChange={(checked) =>
                        onFiltersChange({
                          ...filters,
                          hasWarranty:
                            checked === filters.hasWarranty
                              ? undefined
                              : checked,
                        })
                      }
                    />
                    <ToggleFilter
                      label={t("filters.warrantyExpiringSoon")}
                      checked={filters.warrantyExpiringSoon}
                      onCheckedChange={(checked) =>
                        onFiltersChange({
                          ...filters,
                          warrantyExpiringSoon:
                            checked === filters.warrantyExpiringSoon
                              ? undefined
                              : checked,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={disabled}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {tCommon("reset")}
                    </Button>
                    {onSaveSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSaveDialogOpen(true)}
                        disabled={disabled || activeFilterCount === 0}
                      >
                        <Bookmark className="h-4 w-4 mr-1" />
                        {t("saveSearch")}
                      </Button>
                    )}
                  </div>
                  <Button onClick={onSearch} disabled={disabled} size="sm">
                    <Search className="h-4 w-4 mr-1" />
                    {tCommon("search")}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("activeFilters")}:
          </span>
          {renderActiveFilters()}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleReset}
          >
            {tCommon("clearAll")}
          </Button>
        </div>
      )}

      {/* Save Search Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {t("saveSearchTitle")}
            </h3>
            <Input
              placeholder={t("saveSearchPlaceholder")}
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              className="mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
              >
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatusBadgeProps {
  status: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}

function StatusBadge({ selected, onClick, label }: StatusBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
        "border hover:scale-105 active:scale-95",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-foreground border-input hover:border-primary/50",
      )}
    >
      {selected && <span className="mr-1">✓</span>}
      {label}
    </button>
  );
}

interface ToggleFilterProps {
  label: string;
  checked: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleFilter({ label, checked, onCheckedChange }: ToggleFilterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200",
        checked === true
          ? "bg-primary/5 border-primary/30"
          : checked === false
            ? "bg-muted/50 border-muted"
            : "bg-background border-input hover:border-primary/30",
      )}
      onClick={() => onCheckedChange(checked !== true)}
    >
      <span className="text-sm font-medium">{label}</span>
      <Switch
        checked={checked === true}
        onCheckedChange={onCheckedChange}
        className="pointer-events-none"
      />
    </div>
  );
}

interface ActiveFilterBadgeProps {
  label: string;
  onRemove: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning";
}

function ActiveFilterBadge({
  label,
  onRemove,
  variant = "default",
}: ActiveFilterBadgeProps) {
  return (
    <Badge
      variant={variant === "warning" ? "default" : variant}
      className="gap-1 pr-1"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export default AssetAdvancedSearch;
