"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  Tag,
  DollarSign,
  Info,
  X,
  Loader2,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { CreatableCombobox, ComboboxOption } from "@/components/ui/creatable-combobox";
import { DatePicker } from "./date-picker";
import { PageMotion } from "@/components/motion";

import { useFinanceAssetCategories } from "@/features/finance/asset-categories/hooks/use-finance-asset-categories";
import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useSuppliers } from "@/features/master-data/supplier/hooks/use-suppliers";
import { apiClient } from "@/lib/api-client";
import { compressImageToWebP } from "@/lib/image-optimizer";

import { assetFormSchema, type AssetFormValues } from "../schemas/asset.schema";
import { useCreateFinanceAsset, useUploadAttachment } from "../hooks/use-finance-assets";
import type { AssetInput } from "../types";

export function AssetCreatePage() {
  const t = useTranslations("financeAssets");
  const router = useRouter();

  const assetTypeOptions: Array<AssetFormValues["asset_type_id"]> = [
    "FIXED",
    "CURRENT",
    "INTANGIBLE",
    "OTHER",
  ];
  const depreciationMethodOptions: Array<AssetFormValues["depreciation_method"]> = [
    "SL",
    "DB",
    "SYD",
    "UOP",
    "NONE",
  ];

  // Upload & Photo State
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; name: string }>>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Queries for Dropdown Data
  const { data: settingsData } = useQuery({
    queryKey: ["finance-settings", "raw"],
    queryFn: async () => (await apiClient.get("/finance/settings")).data,
  });

  const { data: categoriesData, refetch: refetchCategories } = useFinanceAssetCategories({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });

  const { data: locationsData, refetch: refetchLocations } = useFinanceAssetLocations({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });

  const { data: divisionsData, refetch: refetchDivisions } = useDivisions({
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

  const { data: suppliersData, refetch: refetchSuppliers } = useSuppliers({
    page: 1,
    per_page: 100,
  });

  // Options Mapping for Comboboxes
  const categoryComboboxOptions: ComboboxOption[] = useMemo(
    () => (categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData]
  );

  const locationComboboxOptions: ComboboxOption[] = useMemo(
    () => (locationsData?.data ?? []).map((l) => ({ value: l.id, label: l.name })),
    [locationsData]
  );

  const departmentComboboxOptions: ComboboxOption[] = useMemo(
    () => (divisionsData?.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    [divisionsData]
  );

  const supplierComboboxOptions: ComboboxOption[] = useMemo(
    () => (suppliersData?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliersData]
  );

  const custodianOptions = useMemo(() => employeesData?.data ?? [], [employeesData]);

  // Inline Creation Handlers for CreatableComboboxes
  const handleCreateCategory = async (query: string): Promise<string | void> => {
    try {
      const res = await apiClient.post("/finance/fixed-assets/categories", {
        name: query,
        code: query.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10),
        depreciation_method: "SL",
        useful_life_months: 60,
      });
      await refetchCategories();
      toast.success(t("toast.categoryCreated", { name: query }));
      return res.data?.data?.id ?? res.data?.id;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.categoryCreateFailed", { name: query });
      toast.error(errorMsg);
    }
  };

  const handleCreateLocation = async (query: string): Promise<string | void> => {
    try {
      const res = await apiClient.post("/finance/fixed-assets/locations", {
        name: query,
        code: query.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10),
      });
      await refetchLocations();
      toast.success(t("toast.locationCreated", { name: query }));
      return res.data?.data?.id ?? res.data?.id;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.locationCreateFailed", { name: query });
      toast.error(errorMsg);
    }
  };

  const handleCreateDepartment = async (query: string): Promise<string | void> => {
    try {
      const res = await apiClient.post("/master-data/divisions", {
        name: query,
        code: query.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10),
      });
      await refetchDivisions();
      toast.success(t("toast.departmentCreated", { name: query }));
      return res.data?.data?.id ?? res.data?.id;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.departmentCreateFailed", { name: query });
      toast.error(errorMsg);
    }
  };

  const handleCreateSupplier = async (query: string): Promise<string | void> => {
    try {
      const res = await apiClient.post("/supplier/suppliers", {
        name: query,
        code: query.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10),
      });
      await refetchSuppliers();
      toast.success(t("toast.supplierCreated", { name: query }));
      return res.data?.data?.id ?? res.data?.id;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.supplierCreateFailed", { name: query });
      toast.error(errorMsg);
    }
  };

  // Form Setup
  const createMutation = useCreateFinanceAsset();
  const uploadAttachment = useUploadAttachment();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      code: "",
      name: "",
      asset_type_id: "FIXED",
      asset_category_id: "",
      location_id: "",
      acquisition_date: new Date().toISOString().slice(0, 10),
      purchase_price: 0,
      acquisition_cost: 0,
      salvage_value: 0,
      useful_life_months: 60,
      depreciation_method: "SL",
      department_id: undefined,
      custodian_user_id: undefined,
      assigned_to_employee_id: undefined,
      shipping_cost: 0,
      installation_cost: 0,
      tax_amount: 0,
      other_costs: 0,
    },
  });

  // Watched Values for Dynamic Computations
  const categoryId = useWatch({ control: form.control, name: "asset_category_id" });
  const locationId = useWatch({ control: form.control, name: "location_id" });
  const departmentId = useWatch({ control: form.control, name: "department_id" });
  const supplierId = useWatch({ control: form.control, name: "vendor_id" });
  const custodianUserId = useWatch({ control: form.control, name: "custodian_user_id" });
  const purchasePrice = useWatch({ control: form.control, name: "purchase_price" });
  const shippingCost = useWatch({ control: form.control, name: "shipping_cost" });
  const installationCost = useWatch({ control: form.control, name: "installation_cost" });
  const taxAmount = useWatch({ control: form.control, name: "tax_amount" });
  const otherCosts = useWatch({ control: form.control, name: "other_costs" });
  const codeValue = useWatch({ control: form.control, name: "code" });
  const nameValue = useWatch({ control: form.control, name: "name" });
  const assetTypeId = useWatch({ control: form.control, name: "asset_type_id" });

  const acquisitionTotal = useMemo(
    () =>
      Number(purchasePrice ?? 0) +
      Number(shippingCost ?? 0) +
      Number(installationCost ?? 0) +
      Number(taxAmount ?? 0) +
      Number(otherCosts ?? 0),
    [purchasePrice, shippingCost, installationCost, taxAmount, otherCosts]
  );

  React.useEffect(() => {
    form.setValue("acquisition_cost", acquisitionTotal, { shouldDirty: true, shouldValidate: true });
  }, [acquisitionTotal, form]);

  const capitalizationThreshold = useMemo(() => {
    const settings = (settingsData?.data ?? []) as Array<{ setting_key: string; value: string }>;
    const setting = settings.find((item) => item.setting_key === "fixed_assets.capitalization_threshold");
    if (!setting?.value) return 0;
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [settingsData]);

  const capitalizationWarning =
    capitalizationThreshold > 0 && acquisitionTotal > 0 && acquisitionTotal < capitalizationThreshold;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);

  // Photo Upload Handler with Client-side WebP Optimization & Cloudflare R2
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i];

        // 1. Optimize raw photo into WebP client-side
        const webpFile = await compressImageToWebP(rawFile, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
        });

        // 2. Upload via standard API endpoint to Cloudflare R2
        const formData = new FormData();
        formData.append("file", webpFile);

        const uploadRes = await apiClient.post("/upload/image?folder=fixed-assets", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const uploadedUrl = uploadRes.data?.data?.url ?? uploadRes.data?.url;
        if (uploadedUrl) {
          setUploadedPhotos((prev) => [...prev, { url: uploadedUrl, name: webpFile.name }]);
        }
      }
      toast.success(t("toast.photoUploaded"));
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.photoUploadFailed");
      toast.error(errorMsg);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const onSubmit = async (values: AssetFormValues) => {
    try {
      const primaryPhotoUrl = uploadedPhotos.length > 0 ? uploadedPhotos[0].url : undefined;

      const payload: AssetInput = {
        code: values.code ? values.code : undefined,
        name: values.name,
        asset_type_id: values.asset_type_id,
        asset_category_id: values.asset_category_id,
        location_id: values.location_id,
        acquisition_date: values.acquisition_date,
        purchase_price: values.purchase_price ?? 0,
        acquisition_cost: values.acquisition_cost,
        salvage_value: values.salvage_value ?? 0,
        useful_life_months: values.useful_life_months,
        depreciation_method: values.depreciation_method,
        department_id: values.department_id,
        custodian_user_id: values.custodian_user_id,
        assigned_to_employee_id: values.assigned_to_employee_id,
        parent_asset_id: values.parent_asset_id,
        warranty_terms: values.warranty_terms,
        warranty_start: values.warranty_start,
        warranty_end: values.warranty_end,
        warranty_provider: values.warranty_provider,
        insurance_policy_number: values.insurance_policy_number,
        insurance_provider: values.insurance_provider,
        insurance_start: values.insurance_start,
        insurance_end: values.insurance_end,
        insurance_value: values.insurance_value,
        shipping_cost: values.shipping_cost,
        installation_cost: values.installation_cost,
        tax_amount: values.tax_amount,
        other_costs: values.other_costs,
        vendor_id: values.vendor_id,
        image_url: primaryPhotoUrl,
      };

      const created = await createMutation.mutateAsync(payload);
      const assetId = (created as { data?: { id?: string }; id?: string })?.data?.id ?? (created as { id?: string })?.id;

      // Upload remaining photos as asset attachments if any
      if (assetId && uploadedPhotos.length > 0) {
        for (const photo of uploadedPhotos) {
          try {
            await apiClient.post(`/finance/fixed-assets/assets/${assetId}/attachments`, {
              file_type: "photo",
              file_name: photo.name,
              file_url: photo.url,
              file_path: photo.url,
              description: "Asset Photo",
            });
          } catch {
            // non-blocking
          }
        }
      }

      toast.success(t("toast.created"));
      router.push(`/finance/assets/${assetId}`);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string })?.response?.data?.error?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t("toast.failed");
      toast.error(errorMsg);
    }
  };

  const selectedCategoryLabel = categoryComboboxOptions.find((c) => c.value === categoryId)?.label;
  const selectedLocationLabel = locationComboboxOptions.find((l) => l.value === locationId)?.label;
  const selectedDeptLabel = departmentComboboxOptions.find((d) => d.value === departmentId)?.label;
  const selectedSupplierLabel = supplierComboboxOptions.find((s) => s.value === supplierId)?.label;

  return (
    <PageMotion className="space-y-6 pb-12">
      {/* Top Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Asset</h1>
            <p className="text-sm text-muted-foreground">
              Add a new fixed asset to company registry with R2 photo storage & capitalization checks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-asset-form"
            disabled={createMutation.isPending}
            className="cursor-pointer gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save Asset
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form
        id="create-asset-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column (2/3): Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <h2 className="text-base font-semibold">Basic Information & Identifiers</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t("fields.code")}</Label>
                <Input
                  id="code"
                  placeholder="Auto-generated if empty"
                  {...form.register("code")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                  {t("fields.name")}
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. MacBook Pro M3 Max 16 inch"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
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
                        {assetTypeOptions.map((val) => (
                          <SelectItem key={val} value={val} className="cursor-pointer">
                            {t(`form.assetTypes.${val}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input id="serial_number" placeholder="e.g. C02G1234MD6R" {...form.register("serial_number")} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description & Notes</Label>
                <Input
                  id="description"
                  placeholder="Additional specs, condition, or physical attributes"
                  {...form.register("description")}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Category, Location & Organization (Using CreatableCombobox) */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <div>
                <h2 className="text-base font-semibold">Category & Location Assignment</h2>
                <p className="text-xs text-muted-foreground">
                  Select existing options or create new ones inline if permitted
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Category CreatableCombobox */}
              <div className="space-y-2">
                <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                  {t("fields.category")}
                </Label>
                <Controller
                  control={form.control}
                  name="asset_category_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      options={categoryComboboxOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select Category..."
                      searchPlaceholder="Search category..."
                      createPermission="asset_category.create"
                      createLabel="Create Category &quot;{query}&quot;"
                      onCreateClick={handleCreateCategory}
                    />
                  )}
                />
              </div>

              {/* Asset Location CreatableCombobox */}
              <div className="space-y-2">
                <Label className="after:content-['*'] after:ml-0.5 after:text-destructive">
                  {t("fields.location")}
                </Label>
                <Controller
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      options={locationComboboxOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select Location..."
                      searchPlaceholder="Search location..."
                      createPermission="asset_location.create"
                      createLabel="Create Location &quot;{query}&quot;"
                      onCreateClick={handleCreateLocation}
                    />
                  )}
                />
              </div>

              {/* Department / Division CreatableCombobox */}
              <div className="space-y-2">
                <Label>{t("form.labels.departmentId")}</Label>
                <Controller
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      options={departmentComboboxOptions}
                      value={field.value ?? ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                      placeholder="Select Department..."
                      searchPlaceholder="Search department..."
                      createPermission="division.create"
                      createLabel="Create Department &quot;{query}&quot;"
                      onCreateClick={handleCreateDepartment}
                    />
                  )}
                />
              </div>

              {/* Supplier / Vendor CreatableCombobox */}
              <div className="space-y-2">
                <Label>Supplier / Vendor</Label>
                <Controller
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      options={supplierComboboxOptions}
                      value={field.value ?? ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                      placeholder="Select Supplier..."
                      searchPlaceholder="Search supplier..."
                      createPermission="supplier.create"
                      createLabel="Create Supplier &quot;{query}&quot;"
                      onCreateClick={handleCreateSupplier}
                    />
                  )}
                />
              </div>

              {/* Custodian Employee Select */}
              <div className="space-y-2 md:col-span-2">
                <Label>{t("form.labels.custodianUserId")}</Label>
                <Controller
                  control={form.control}
                  name="custodian_user_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(val) => field.onChange(val === "none" ? undefined : val)}
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Select Custodian Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="cursor-pointer">
                          No Custodian Assigned
                        </SelectItem>
                        {custodianOptions.map((e) => (
                          <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                            {e.name} {e.employee_code ? `• ${e.employee_code}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Cost Breakdown & Depreciation */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <div>
                <h2 className="text-base font-semibold">Acquisition Cost & Depreciation Settings</h2>
                <p className="text-xs text-muted-foreground">
                  Specify acquisition pricing, sub-cost components, and depreciation parameters
                </p>
              </div>
            </div>

            {/* Row 1: Primary Acquisition Date & Base Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acquisition_date" className="after:content-['*'] after:ml-0.5 after:text-destructive">
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
                <Label htmlFor="purchase_price" className="after:content-['*'] after:ml-0.5 after:text-destructive">
                  Purchase Base Price
                </Label>
                <Controller
                  name="purchase_price"
                  control={form.control}
                  render={({ field }) => (
                    <NumericInput
                      id="purchase_price"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="0"
                    />
                  )}
                />
              </div>
            </div>

            {/* Row 2: Additional Cost Components Sub-grid */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Additional Cost Components (Capitalized into Total Asset Cost)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="shipping_cost" className="text-xs">Shipping Cost</Label>
                  <Controller
                    name="shipping_cost"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="shipping_cost"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="installation_cost" className="text-xs">Installation Cost</Label>
                  <Controller
                    name="installation_cost"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="installation_cost"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tax_amount" className="text-xs">Tax & Duties</Label>
                  <Controller
                    name="tax_amount"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="tax_amount"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="other_costs" className="text-xs">Other Costs</Label>
                  <Controller
                    name="other_costs"
                    control={form.control}
                    render={({ field }) => (
                      <NumericInput
                        id="other_costs"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Depreciation Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                        {depreciationMethodOptions.map((val) => (
                          <SelectItem key={val} value={val} className="cursor-pointer">
                            {t(`form.depreciationMethods.${val}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="useful_life_months">{t("form.labels.usefulLifeMonths")}</Label>
                <Controller
                  name="useful_life_months"
                  control={form.control}
                  render={({ field }) => (
                    <NumericInput
                      id="useful_life_months"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="60"
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
                      placeholder="0"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Photo Upload with WebP Optimization & Cloudflare R2 */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                4
              </span>
              <div>
                <h2 className="text-base font-semibold">Asset Photos & Media Storage</h2>
                <p className="text-xs text-muted-foreground">
                  Photos are automatically converted to optimized WebP format and stored in Cloudflare R2
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-muted/20">
              <input
                type="file"
                id="photo-upload-input"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
              />
              <label htmlFor="photo-upload-input" className="cursor-pointer space-y-2 block">
                {isUploadingPhoto ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm font-medium">Optimizing WebP & Uploading to R2...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">
                      Click to upload photos or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WebP supported • Automatic ultra-low size conversion
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Photo Previews */}
            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {uploadedPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg border overflow-hidden bg-background aspect-square shadow-xs"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full text-muted-foreground transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-sm">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 Sidebar): Financial Summary Panel */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Financial Calculation</h2>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Asset Identity Preview
              </p>
              <div className="mt-1 text-lg font-bold truncate">
                {nameValue || "Untitled Asset"}
              </div>
              <div className="text-xs text-muted-foreground">
                Code: <span className="font-mono">{codeValue || "Auto"}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base Purchase Price</span>
                <span className="font-medium">{formatCurrency(Number(purchasePrice || 0))}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                <span>Shipping Cost</span>
                <span>+ {formatCurrency(Number(shippingCost || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                <span>Installation Cost</span>
                <span>+ {formatCurrency(Number(installationCost || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                <span>Taxes & Duties</span>
                <span>+ {formatCurrency(Number(taxAmount || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
                <span>Other Costs</span>
                <span>+ {formatCurrency(Number(otherCosts || 0))}</span>
              </div>

              <div className="border-t pt-3 flex items-center justify-between text-base font-bold">
                <span>Total Cost</span>
                <span className="text-primary">{formatCurrency(acquisitionTotal)}</span>
              </div>
            </div>

            {capitalizationWarning && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Info className="h-4 w-4 shrink-0" />
                  Below Capitalization Threshold
                </div>
                <p>
                  Total cost is below the company threshold ({formatCurrency(capitalizationThreshold)}). This item will be expensed.
                </p>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{selectedCategoryLabel || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{selectedLocationLabel || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{selectedDeptLabel || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium">{selectedSupplierLabel || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </PageMotion>
  );
}
