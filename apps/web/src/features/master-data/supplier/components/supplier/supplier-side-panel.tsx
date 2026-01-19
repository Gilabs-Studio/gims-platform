"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPickerModal } from "@/components/ui/map/map-picker-modal";

import { useCreateSupplier, useUpdateSupplier } from "../../hooks/use-suppliers";
import { useSupplierTypes } from "../../hooks/use-supplier-types";
import { useProvinces } from "../../../geographic/hooks/use-provinces";
import { useCities } from "../../../geographic/hooks/use-cities";
import { useDistricts } from "../../../geographic/hooks/use-districts";
import { useVillages } from "../../../geographic/hooks/use-villages";
import type { Supplier, CreatePhoneNumberData, CreateSupplierBankData } from "../../types";
import { SupplierPhoneList } from "./supplier-phone-list";
import { SupplierBankList } from "./supplier-bank-list";

const formSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  supplier_type_id: z.string().optional(),
  address: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  npwp: z.string().max(30).optional(),
  contact_person: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  village_id: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_active: z.boolean(),
  phone_numbers: z.array(z.unknown()).optional(),
  bank_accounts: z.array(z.unknown()).optional(),
});

type FormData = z.infer<typeof formSchema>;
type PanelMode = "create" | "edit" | "view";

interface SupplierSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly supplier?: Supplier | null;
  readonly onSuccess?: () => void;
}

export function SupplierSidePanel({
  isOpen,
  onClose,
  mode,
  supplier,
  onSuccess,
}: SupplierSidePanelProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const { data: supplierTypesData } = useSupplierTypes({ per_page: 100 });
  const supplierTypes = supplierTypesData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      supplier_type_id: "",
      address: "",
      email: "",
      website: "",
      npwp: "",
      contact_person: "",
      notes: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      village_id: "",
      latitude: -6.2088,
      longitude: 106.8456,
      is_active: true,
      phone_numbers: [],
      bank_accounts: [],
    },
  });

  const provinceId = watch("province_id");
  const cityId = watch("city_id");
  const districtId = watch("district_id");
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const supplierTypeId = watch("supplier_type_id");
  const isActive = watch("is_active");
  const formPhones = (watch("phone_numbers") as CreatePhoneNumberData[]) ?? [];
  const formBanks = (watch("bank_accounts") as CreateSupplierBankData[]) ?? [];

  const { data: provincesData } = useProvinces({ per_page: 100 });
  const { data: citiesData } = useCities(
    provinceId ? { province_id: String(provinceId), per_page: 100 } : undefined
  );
  const { data: districtsData } = useDistricts(
    cityId ? { city_id: String(cityId), per_page: 100 } : undefined
  );
  const { data: villagesData } = useVillages(
    districtId ? { district_id: String(districtId), per_page: 100 } : undefined
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];
  const villages = villagesData?.data ?? [];

  useEffect(() => {
    if (supplier && (mode === "edit" || mode === "view")) {
      const v = supplier.village;
      const d = v?.district;
      const c = d?.city;
      const p = c?.province;

      reset({
        code: supplier.code,
        name: supplier.name,
        supplier_type_id: supplier.supplier_type_id ?? "",
        address: supplier.address ?? "",
        email: supplier.email ?? "",
        website: supplier.website ?? "",
        npwp: supplier.npwp ?? "",
        contact_person: supplier.contact_person ?? "",
        notes: supplier.notes ?? "",
        province_id: p?.id,
        city_id: c?.id,
        district_id: d?.id,
        village_id: supplier.village_id ?? "",
        latitude: supplier.latitude ?? -6.2088,
        longitude: supplier.longitude ?? 106.8456,
        is_active: supplier.is_active,
        phone_numbers: [],
        bank_accounts: [],
      });
    } else if (mode === "create") {
      reset({
        code: "",
        name: "",
        supplier_type_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        contact_person: "",
        notes: "",
        village_id: "",
        latitude: -6.2088,
        longitude: 106.8456,
        is_active: true,
        phone_numbers: [],
        bank_accounts: [],
      });
    }
  }, [supplier, mode, reset, isOpen]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        code: data.code,
        name: data.name,
        supplier_type_id: data.supplier_type_id || undefined,
        address: data.address || undefined,
        village_id: data.village_id || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        npwp: data.npwp || undefined,
        contact_person: data.contact_person || undefined,
        notes: data.notes || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active,
        phone_numbers: !isEditing ? (data.phone_numbers as CreatePhoneNumberData[]) : undefined,
        bank_accounts: !isEditing ? (data.bank_accounts as CreateSupplierBankData[]) : undefined,
      };

      if (isEditing && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, data: payload });
      } else {
        await createSupplier.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to save supplier:", error);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
  };

  const handleProvinceChange = (val: string) => {
    setValue("province_id", val);
    setValue("city_id", undefined);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };

  const handleCityChange = (val: string) => {
    setValue("city_id", val);
    setValue("district_id", undefined);
    setValue("village_id", undefined);
  };

  const handleDistrictChange = (val: string) => {
    setValue("district_id", val);
    setValue("village_id", undefined);
  };

  // Handlers for nested lists (create mode)
  const handleAddPhone = (phone: CreatePhoneNumberData) => {
    setValue("phone_numbers", [...formPhones, phone]);
  };
  const handleUpdatePhone = (index: number, phone: CreatePhoneNumberData) => {
    const newPhones = [...formPhones];
    newPhones[index] = phone;
    setValue("phone_numbers", newPhones);
  };
  const handleDeletePhone = (index: number) => {
    setValue("phone_numbers", formPhones.filter((_, i) => i !== index));
  };

  const handleAddBank = (bank: CreateSupplierBankData) => {
    setValue("bank_accounts", [...formBanks, bank]);
  };
  const handleUpdateBank = (index: number, bank: CreateSupplierBankData) => {
    const newBanks = [...formBanks];
    newBanks[index] = bank;
    setValue("bank_accounts", newBanks);
  };
  const handleDeleteBank = (index: number) => {
    setValue("bank_accounts", formBanks.filter((_, i) => i !== index));
  };

  const isLoading = createSupplier.isPending || updateSupplier.isPending;

  const panelTitle = isViewing
    ? supplier?.name ?? t("title")
    : isEditing
      ? t("editTitle")
      : t("createTitle");

  return (
    <>
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={panelTitle}
        side="right"
        defaultWidth={550}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="cursor-pointer">
                {t("sections.general")}
              </TabsTrigger>
              <TabsTrigger value="financial" className="cursor-pointer">
                {t("sections.financial")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.basicInfo")}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.code")} *</FieldLabel>
                    <Input
                      placeholder={t("form.codePlaceholder")}
                      {...register("code")}
                      disabled={isViewing}
                    />
                    {errors.code && <FieldError>{errors.code.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.name")} *</FieldLabel>
                    <Input
                      placeholder={t("form.namePlaceholder")}
                      {...register("name")}
                      disabled={isViewing}
                    />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.supplierType")}</FieldLabel>
                    <Select
                      value={supplierTypeId}
                      onValueChange={(val) => setValue("supplier_type_id", val)}
                      disabled={isViewing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("form.supplierTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.contactPerson")}</FieldLabel>
                    <Input
                      placeholder={t("form.contactPersonPlaceholder")}
                      {...register("contact_person")}
                      disabled={isViewing}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.email")}</FieldLabel>
                    <Input
                      type="email"
                      placeholder={t("form.emailPlaceholder")}
                      {...register("email")}
                      disabled={isViewing}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.website")}</FieldLabel>
                    <Input
                      placeholder={t("form.websitePlaceholder")}
                      {...register("website")}
                      disabled={isViewing}
                    />
                  </Field>
                </div>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.npwp")}</FieldLabel>
                  <Input
                    placeholder={t("form.npwpPlaceholder")}
                    {...register("npwp")}
                    disabled={isViewing}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.notes")}</FieldLabel>
                  <Textarea
                    placeholder={t("form.notesPlaceholder")}
                    {...register("notes")}
                    rows={2}
                    disabled={isViewing}
                  />
                </Field>

                {!isViewing && (
                  <Field
                    orientation="horizontal"
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <FieldLabel>{t("form.isActive")}</FieldLabel>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(val) => setValue("is_active", val)}
                    />
                  </Field>
                )}
              </div>

              {/* Location Section */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.location")}
                </h3>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.address")}</FieldLabel>
                  <Textarea
                    placeholder={t("form.addressPlaceholder")}
                    {...register("address")}
                    rows={2}
                    disabled={isViewing}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.province")}</FieldLabel>
                    <Select
                      value={String(provinceId || "")}
                      onValueChange={handleProvinceChange}
                      disabled={isViewing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Province" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.city")}</FieldLabel>
                    <Select
                      value={String(cityId || "")}
                      onValueChange={handleCityChange}
                      disabled={!provinceId || isViewing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.district")}</FieldLabel>
                    <Select
                      value={String(districtId || "")}
                      onValueChange={handleDistrictChange}
                      disabled={!cityId || isViewing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.village")}</FieldLabel>
                    <Select
                      value={String(watch("village_id") || "")}
                      onValueChange={(val) => setValue("village_id", val)}
                      disabled={!districtId || isViewing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Village" />
                      </SelectTrigger>
                      <SelectContent>
                        {villages.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* Coordinates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      <h3 className="text-sm font-medium">{t("sections.coordinates")}</h3>
                    </div>
                    {!isViewing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMapPickerOpen(true)}
                        className="cursor-pointer"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {t("pickFromMap")}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field orientation="vertical">
                      <FieldLabel>{t("form.latitude")}</FieldLabel>
                      <Controller
                        control={control}
                        name="latitude"
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="any"
                            placeholder="-6.2088"
                            disabled={isViewing}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        )}
                      />
                    </Field>
                    <Field orientation="vertical">
                      <FieldLabel>{t("form.longitude")}</FieldLabel>
                      <Controller
                        control={control}
                        name="longitude"
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="any"
                            placeholder="106.8456"
                            disabled={isViewing}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        )}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="mt-4 space-y-6">
              {/* Phone Numbers Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.phoneNumbers")}
                </h3>
                
                <SupplierPhoneList
                  supplierId={isEditing ? supplier?.id : undefined}
                  phones={isEditing ? (supplier?.phone_numbers ?? []) : formPhones}
                  onAdd={handleAddPhone}
                  onUpdate={handleUpdatePhone}
                  onDelete={handleDeletePhone}
                />
                {!isEditing && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: Phone numbers added here will be saved when you click
                    &quot;{tCommon("create")}&quot;.
                  </p>
                )}
              </div>

              {/* Bank Accounts Section */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.bankAccounts")}
                </h3>

                <SupplierBankList
                  supplierId={isEditing ? supplier?.id : undefined}
                  banks={isEditing ? (supplier?.bank_accounts ?? []) : formBanks}
                  onAdd={handleAddBank}
                  onUpdate={handleUpdateBank}
                  onDelete={handleDeleteBank}
                />
                {!isEditing && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: Bank accounts added here will be saved when you click
                    &quot;{tCommon("create")}&quot;.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          {!isViewing && (
            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  tCommon("save")
                ) : (
                  tCommon("create")
                )}
              </Button>
            </div>
          )}
        </form>
      </Drawer>

      <MapPickerModal
        open={isMapPickerOpen}
        onOpenChange={setIsMapPickerOpen}
        latitude={latitude ?? -6.2088}
        longitude={longitude ?? 106.8456}
        onCoordinateSelect={handleCoordinateSelect}
        title={t("mapPicker.title")}
        description={t("mapPicker.description")}
      />
    </>
  );
}
