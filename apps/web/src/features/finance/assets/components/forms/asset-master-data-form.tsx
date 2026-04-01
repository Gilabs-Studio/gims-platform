"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { QrCode, RefreshCw, Building2, Briefcase, Layers } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useFinanceAssetCategories } from "@/features/finance/asset-categories/hooks/use-finance-asset-categories";
import { useFinanceAssetLocations } from "@/features/finance/asset-locations/hooks/use-finance-asset-locations";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useDivisions } from "@/features/master-data/organization/hooks/use-divisions";

import type { Asset } from "@/features/finance/assets/types";

// Extended schema for master data form
export const assetMasterDataFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
  serial_number: z.string().optional(),
  barcode: z.string().optional(),
  asset_tag: z.string().optional(),
  qr_code: z.string().optional(),
  category_id: z.string().uuid("Category is required"),
  location_id: z.string().uuid("Location is required"),
  company_id: z.string().uuid().optional().or(z.literal("")),
  business_unit_id: z.string().uuid().optional().or(z.literal("")),
  department_id: z.string().uuid().optional().or(z.literal("")),
});

export type AssetMasterDataFormValues = z.infer<
  typeof assetMasterDataFormSchema
>;

interface AssetMasterDataFormProps {
  asset?: Asset | null;
  onSubmit: (values: AssetMasterDataFormValues) => Promise<void>;
  onGenerateQRCode?: () => Promise<string>;
  isSubmitting?: boolean;
  isLoading?: boolean;
}

export function AssetMasterDataForm({
  asset,
  onSubmit,
  onGenerateQRCode,
  isSubmitting = false,
  isLoading = false,
}: AssetMasterDataFormProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  // Fetch dropdown data
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useFinanceAssetCategories({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });
  const { data: locationsData, isLoading: isLocationsLoading } =
    useFinanceAssetLocations({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });
  const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({
    page: 1,
    per_page: 100,
    sort_by: "name",
    sort_dir: "asc",
  });
  const { data: businessUnitsData, isLoading: isBusinessUnitsLoading } =
    useBusinessUnits({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });
  const { data: departmentsData, isLoading: isDepartmentsLoading } =
    useDivisions({
      page: 1,
      per_page: 100,
      sort_by: "name",
      sort_dir: "asc",
    });

  const categories = categoriesData?.data ?? [];
  const locations = locationsData?.data ?? [];
  const companies = companiesData?.data ?? [];
  const businessUnits = businessUnitsData?.data ?? [];
  const departments = departmentsData?.data ?? [];

  const defaultValues: AssetMasterDataFormValues = useMemo(
    () => ({
      name: asset?.name ?? "",
      description: asset?.description ?? "",
      serial_number: asset?.serial_number ?? "",
      barcode: asset?.barcode ?? "",
      asset_tag: asset?.asset_tag ?? "",
      qr_code: asset?.qr_code ?? "",
      category_id: asset?.category_id ?? "",
      location_id: asset?.location_id ?? "",
      company_id: asset?.company_id ?? "",
      business_unit_id: asset?.business_unit_id ?? "",
      department_id: asset?.department_id ?? "",
    }),
    [asset],
  );

  const form = useForm<AssetMasterDataFormValues>({
    resolver: zodResolver(assetMasterDataFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleGenerateQRCode = async () => {
    if (!onGenerateQRCode) return;
    try {
      const qrCode = await onGenerateQRCode();
      form.setValue("qr_code", qrCode, { shouldDirty: true });
      toast.success(t("toast.qrGenerated"));
    } catch {
      toast.error(t("toast.qrFailed"));
    }
  };

  const handleSubmit = async (values: AssetMasterDataFormValues) => {
    try {
      await onSubmit(values);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failed"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
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
      {/* Identity Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.identity") || "Asset Identity"}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {/* Name */}
          <Field>
            <FieldLabel htmlFor="name">{t("fields.name")} *</FieldLabel>
            <Input
              id="name"
              {...form.register("name")}
              placeholder={t("placeholders.assetName") || "Enter asset name"}
            />
            {form.formState.errors.name && (
              <FieldError>{form.formState.errors.name.message}</FieldError>
            )}
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel htmlFor="description">
              {t("fields.description")}
            </FieldLabel>
            <Input
              id="description"
              {...form.register("description")}
              placeholder={t("placeholders.description") || "Enter description"}
            />
          </Field>
        </div>

        {/* Identification Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field>
            <FieldLabel htmlFor="serial_number">
              {t("fields.serialNumber")}
            </FieldLabel>
            <Input
              id="serial_number"
              {...form.register("serial_number")}
              placeholder={t("placeholders.serialNumber") || "Serial number"}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="barcode">{t("fields.barcode")}</FieldLabel>
            <Input
              id="barcode"
              {...form.register("barcode")}
              placeholder={t("placeholders.barcode") || "Barcode"}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="asset_tag">{t("fields.assetTag")}</FieldLabel>
            <Input
              id="asset_tag"
              {...form.register("asset_tag")}
              placeholder={t("placeholders.assetTag") || "Asset tag"}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="qr_code">{t("fields.qrCode")}</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="qr_code"
                {...form.register("qr_code")}
                placeholder={t("placeholders.qrCode") || "QR code"}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateQRCode}
                disabled={!onGenerateQRCode}
                title={t("actions.generateQR") || "Generate QR Code"}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>

        {/* QR Code Preview */}
        {form.watch("qr_code") && (
          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-white p-3 rounded-lg">
                <QrCode className="h-16 w-16 text-black" />
              </div>
              <div>
                <p className="font-medium">{t("fields.qrCode")}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {form.watch("qr_code")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Classification Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.classification") || "Classification"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <Field>
            <FieldLabel>
              <Layers className="h-4 w-4 inline mr-1" />
              {t("fields.category")} *
            </FieldLabel>
            <Controller
              name="category_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isCategoriesLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectCategory") || "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
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
              )}
            />
            {form.formState.errors.category_id && (
              <FieldError>
                {form.formState.errors.category_id.message}
              </FieldError>
            )}
          </Field>

          {/* Location */}
          <Field>
            <FieldLabel>{t("fields.location")} *</FieldLabel>
            <Controller
              name="location_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLocationsLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectLocation") || "Select location"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
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
              )}
            />
            {form.formState.errors.location_id && (
              <FieldError>
                {form.formState.errors.location_id.message}
              </FieldError>
            )}
          </Field>
        </div>
      </div>

      {/* Organization Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("sections.organization") || "Organization"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Company */}
          <Field>
            <FieldLabel>
              <Building2 className="h-4 w-4 inline mr-1" />
              {t("fields.company")}
            </FieldLabel>
            <Controller
              name="company_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                  disabled={isCompaniesLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectCompany") || "Select company"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">
                      {tCommon("none") || "None"}
                    </SelectItem>
                    {companies.map((c) => (
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
              )}
            />
          </Field>

          {/* Business Unit */}
          <Field>
            <FieldLabel>
              <Briefcase className="h-4 w-4 inline mr-1" />
              {t("fields.businessUnit")}
            </FieldLabel>
            <Controller
              name="business_unit_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                  disabled={isBusinessUnitsLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectBusinessUnit") ||
                        "Select business unit"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">
                      {tCommon("none") || "None"}
                    </SelectItem>
                    {businessUnits.map((bu) => (
                      <SelectItem
                        key={bu.id}
                        value={bu.id}
                        className="cursor-pointer"
                      >
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          {/* Department */}
          <Field>
            <FieldLabel>{t("fields.department")}</FieldLabel>
            <Controller
              name="department_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                  disabled={isDepartmentsLoading}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue
                      placeholder={
                        t("placeholders.selectDepartment") ||
                        "Select department"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">
                      {tCommon("none") || "None"}
                    </SelectItem>
                    {departments.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="cursor-pointer"
                      >
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </div>

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
