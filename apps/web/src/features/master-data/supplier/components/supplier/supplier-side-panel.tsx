"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

import { useCreateSupplier, useUpdateSupplier, useSupplier } from "../../hooks/use-suppliers";
import { useSupplierTypes } from "../../hooks/use-supplier-types";
import { useProvinces } from "../../../geographic/hooks/use-provinces";
import { useCities } from "../../../geographic/hooks/use-cities";
import { useDistricts } from "../../../geographic/hooks/use-districts";
import { useVillages } from "../../../geographic/hooks/use-villages";
import type { Supplier, CreatePhoneNumberData, CreateSupplierBankData } from "../../types";
import { SupplierPhoneList } from "./supplier-phone-list";
import { SupplierBankList } from "./supplier-bank-list";

const formSchema = z.object({
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
  const [activeTab, setActiveTab] = useState("general");
  // Hidden submit button ref — triggers real DOM submit so RHF resolver reads live form state
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const { data: detailRes, isLoading: isLoadingDetail, refetch: refetchDetail } = useSupplier(
    supplier?.id ?? "",
    { enabled: false, staleTime: 0 }
  );
  const fullSupplier = detailRes?.data ?? supplier;

  const { data: supplierTypesData } = useSupplierTypes({ per_page: 100 }, { enabled: isOpen });
  const supplierTypes = supplierTypesData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      latitude: null,
      longitude: null,
      is_active: true,
      phone_numbers: [],
      bank_accounts: [],
    },
  });

  // useWatch is React Compiler-compatible (unlike watch() from useForm)
  const provinceId = useWatch({ control, name: "province_id" });
  const cityId = useWatch({ control, name: "city_id" });
  const districtId = useWatch({ control, name: "district_id" });
  const latitude = useWatch({ control, name: "latitude" });
  const longitude = useWatch({ control, name: "longitude" });
  const formPhones = (useWatch({ control, name: "phone_numbers" }) as CreatePhoneNumberData[]) ?? [];
  const formBanks = (useWatch({ control, name: "bank_accounts" }) as CreateSupplierBankData[]) ?? [];

  // Stable ref so the main setup effect can read the latest supplier fallback
  // without adding supplier to its deps (would reset the form on every parent re-render).
  // Declared before the setup effect so it always runs first when supplier changes.
  const supplierRef = useRef(supplier);
  useEffect(() => {
    supplierRef.current = supplier;
  }, [supplier]);

  const { data: provincesData } = useProvinces({ per_page: 100 }, { enabled: isOpen });
  const { data: citiesData } = useCities(
    provinceId ? { province_id: String(provinceId), per_page: 100 } : undefined,
    { enabled: isOpen && !!provinceId }
  );
  const { data: districtsData } = useDistricts(
    cityId ? { city_id: String(cityId), per_page: 100 } : undefined,
    { enabled: isOpen && !!cityId }
  );
  const { data: villagesData } = useVillages(
    districtId ? { district_id: String(districtId), per_page: 100 } : undefined,
    { enabled: isOpen && !!districtId }
  );

  const provinces = provincesData?.data ?? [];
  const cities = citiesData?.data ?? [];
  const districts = districtsData?.data ?? [];
  const villages = villagesData?.data ?? [];

  // Reset active tab when panel opens — deferred to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => setActiveTab("general"));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // Fetch supplier detail and populate form when panel opens
  useEffect(() => {
    if (!isOpen) return;

    if ((mode === "edit" || mode === "view") && supplier?.id) {
      void refetchDetail().then((result) => {
        const entity = result.status === "success" && result.data?.data
          ? result.data.data
          : supplierRef.current;
        if (!entity) return;

        // Resolve geographic IDs from nested village or direct fields
        const v = entity.village;
        const d = v?.district;
        const c = d?.city;
        const p = c?.province;

        reset({
          name: entity.name,
          supplier_type_id: entity.supplier_type_id ?? "",
          address: entity.address ?? "",
          email: entity.email ?? "",
          website: entity.website ?? "",
          npwp: entity.npwp ?? "",
          contact_person: entity.contact_person ?? "",
          notes: entity.notes ?? "",
          province_id: entity.province_id ?? p?.id ?? undefined,
          city_id: entity.city_id ?? c?.id ?? undefined,
          district_id: entity.district_id ?? d?.id ?? undefined,
          village_id: entity.village_id ?? "",
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          is_active: entity.is_active,
          phone_numbers: entity.phone_numbers?.map(ph => ({
            phone_number: ph.phone_number,
            label: ph.label ?? "",
            is_primary: ph.is_primary,
          })) ?? [],
          bank_accounts: entity.bank_accounts?.map(b => ({
            bank_id: b.bank_id,
            account_number: b.account_number,
            account_name: b.account_name,
            branch: b.branch ?? "",
            is_primary: b.is_primary,
          })) ?? [],
        });
      });
    } else if (mode === "create") {
      reset({
        name: "",
        supplier_type_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        contact_person: "",
        notes: "",
        village_id: "",
          latitude: null,
          longitude: null,
        phone_numbers: [],
        bank_accounts: [],
      });
    }
  }, [isOpen, mode, supplier?.id, refetchDetail, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && fullSupplier) {
        // Send ALL fields as explicit values so backend can update/clear them
        await updateSupplier.mutateAsync({
          id: fullSupplier.id,
          data: {
            name: data.name,
            // Send "" (not null) so backend pointer is non-nil → triggers clear logic
            supplier_type_id: data.supplier_type_id ?? "",
            address: data.address ?? "",
            province_id: data.province_id ?? "",
            city_id: data.city_id ?? "",
            district_id: data.district_id ?? "",
            village_id: data.village_id ?? "",
            email: data.email ?? "",
            website: data.website ?? "",
            npwp: data.npwp ?? "",
            contact_person: data.contact_person ?? "",
            notes: data.notes ?? "",
            latitude: data.latitude,
            longitude: data.longitude,
            is_active: data.is_active,
          },
        });
      } else {
        await createSupplier.mutateAsync({
          name: data.name,
          supplier_type_id: data.supplier_type_id || undefined,
          address: data.address || undefined,
          province_id: data.province_id || undefined,
          city_id: data.city_id || undefined,
          district_id: data.district_id || undefined,
          village_id: data.village_id || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          npwp: data.npwp || undefined,
          contact_person: data.contact_person || undefined,
          notes: data.notes || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          is_active: data.is_active,
          phone_numbers: data.phone_numbers as CreatePhoneNumberData[],
          bank_accounts: data.bank_accounts as CreateSupplierBankData[],
        });
      }
      toast.success(isEditing ? "Supplier updated" : "Supplier created");
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save supplier";
      toast.error(message);
      console.error("Failed to save supplier:", error);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
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

  const isLoading = createSupplier.isPending || updateSupplier.isPending || isLoadingDetail;

  const panelTitle = isViewing
    ? fullSupplier?.name ?? t("title")
    : isEditing
      ? t("editTitle")
      : t("createTitle");

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Drawer
          open={isOpen}
          onOpenChange={(open) => !open && onClose()}
          title={panelTitle}
          side="right"
          defaultWidth={550}
          headerExtra={
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="cursor-pointer">
                {t("sections.general")}
              </TabsTrigger>
              <TabsTrigger value="financial" className="cursor-pointer">
                {t("sections.financial")}
              </TabsTrigger>
            </TabsList>
          }
        >
          {/* onKeyDown guard prevents Enter from accidentally submitting */}
          <form
            id="supplier-form"
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }}
          >
            {/* Hidden submit button — clicked by the Save button outside the form */}
            <button ref={submitBtnRef} type="submit" className="hidden" aria-hidden />

            <TabsContent forceMount value="general" className="mt-4 space-y-6 p-4 data-[state=inactive]:hidden">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.basicInfo")}
                </h3>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.name")} *</FieldLabel>
                  <Input
                    placeholder={t("form.namePlaceholder")}
                    {...register("name")}
                    disabled={isViewing}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("form.supplierType")}</FieldLabel>
                    <Controller
                      control={control}
                      name="supplier_type_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
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
                      )}
                    />
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
                    <Controller
                      control={control}
                      name="is_active"
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                )}
              </div>

              {/* Location Section - flexible: user can fill only what they have */}
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
                    <Controller
                      control={control}
                      name="province_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setValue("city_id", undefined, { shouldDirty: true });
                            setValue("district_id", undefined, { shouldDirty: true });
                            setValue("village_id", undefined, { shouldDirty: true });
                          }}
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
                      )}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.city")}</FieldLabel>
                    <Controller
                      control={control}
                      name="city_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setValue("district_id", undefined, { shouldDirty: true });
                            setValue("village_id", undefined, { shouldDirty: true });
                          }}
                          disabled={isViewing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinceId ? cities.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            )) : (
                              <SelectItem value="_" disabled>
                                Select province first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.district")}</FieldLabel>
                    <Controller
                      control={control}
                      name="district_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                            setValue("village_id", undefined, { shouldDirty: true });
                          }}
                          disabled={isViewing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select District" />
                          </SelectTrigger>
                          <SelectContent>
                            {cityId ? districts.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            )) : (
                              <SelectItem value="_" disabled>
                                Select city first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("form.village")}</FieldLabel>
                    <Controller
                      control={control}
                      name="village_id"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          disabled={isViewing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Village" />
                          </SelectTrigger>
                          <SelectContent>
                            {districtId ? villages.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name}
                              </SelectItem>
                            )) : (
                              <SelectItem value="_" disabled>
                                Select district first
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
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
                            onChange={(e) => {
                              const v = e.target.valueAsNumber;
                              field.onChange(isNaN(v) ? null : v);
                            }}
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
                            onChange={(e) => {
                              const v = e.target.valueAsNumber;
                              field.onChange(isNaN(v) ? null : v);
                            }}
                          />
                        )}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent forceMount value="financial" className="mt-4 space-y-6 p-4 data-[state=inactive]:hidden">
              {/* Phone Numbers Section */}
              <div className="space-y-4">
                <SupplierPhoneList
                  supplierId={(isEditing || isViewing) ? fullSupplier?.id : undefined}
                  phones={(isEditing || isViewing) ? (fullSupplier?.phone_numbers ?? []) : formPhones}
                  onAdd={handleAddPhone}
                  onUpdate={handleUpdatePhone}
                  onDelete={handleDeletePhone}
                  isReadOnly={isViewing}
                />
                {(mode === "create") && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: Phone numbers added here will be saved when you click
                    &quot;{tCommon("create")}&quot;.
                  </p>
                )}
              </div>

              {/* Bank Accounts Section */}
              <div className="space-y-4 pt-4">
                <SupplierBankList
                  supplierId={(isEditing || isViewing) ? fullSupplier?.id : undefined}
                  banks={(isEditing || isViewing) ? (fullSupplier?.bank_accounts ?? []) : formBanks}
                  onAdd={handleAddBank}
                  onUpdate={handleUpdateBank}
                  onDelete={handleDeleteBank}
                  isReadOnly={isViewing}
                />
                {(mode === "create") && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: Bank accounts added here will be saved when you click
                    &quot;{tCommon("create")}&quot;.
                  </p>
                )}
              </div>
            </TabsContent>

          </form>

          {/* Actions — outside the form so Next cannot trigger submit */}
          {!isViewing && (
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t sticky bottom-0 bg-background z-10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                {tCommon("cancel")}
              </Button>
              {activeTab === "general" ? (
                <Button
                  type="button"
                  onClick={() => setActiveTab("financial")}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isLoading}
                  className="cursor-pointer"
                  onClick={() => submitBtnRef.current?.click()}
                >
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
              )}
            </div>
          )}
        </Drawer>
      </Tabs>

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
