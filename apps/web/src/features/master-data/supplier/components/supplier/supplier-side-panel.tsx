"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "../../../geographic/components/location-picker";

import { useCreateSupplier, useUpdateSupplier, useSupplier } from "../../hooks/use-suppliers";
import { useSupplierTypes } from "../../hooks/use-supplier-types";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import type { Supplier, CreateContactData, CreateSupplierBankData } from "../../types";
import { SupplierContactList } from "./supplier-contact-list";
import { SupplierBankList } from "./supplier-bank-list";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  supplier_type_id: z.string().optional(),
  payment_terms_id: z.string().optional(),
  business_unit_id: z.string().optional(),
  address: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  npwp: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  province_id: z.string().optional(),
  city_id: z.string().optional(),
  district_id: z.string().optional(),
  village_name: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  contacts: z.array(z.unknown()).optional(),
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
  const [activeTab, setActiveTab] = useState("general");
  // Hidden submit button ref — triggers real DOM submit so RHF resolver reads live form state
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const { data: detailRes, isLoading: isLoadingDetail, refetch: refetchDetail } = useSupplier(
    supplier?.id ?? "",
    { enabled: false, staleTime: 0 }
  );
  const fullSupplier = detailRes?.data ?? supplier;

  const { data: supplierTypesData } = useSupplierTypes({ per_page: 20 }, { enabled: isOpen });
  const supplierTypes = supplierTypesData?.data ?? [];
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 20 }, { enabled: isOpen });
  const paymentTerms = paymentTermsData?.data ?? [];
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 20 }, { enabled: isOpen });
  const businessUnits = businessUnitsData?.data ?? [];

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
      payment_terms_id: "",
      business_unit_id: "",
      address: "",
      email: "",
      website: "",
      npwp: "",
      notes: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      village_name: "",
      latitude: null,
      longitude: null,
      contacts: [],
      bank_accounts: [],
    },
  });

  const formContacts = (useWatch({ control, name: "contacts" }) as CreateContactData[]) ?? [];
  const formBanks = (useWatch({ control, name: "bank_accounts" }) as CreateSupplierBankData[]) ?? [];

  // Stable ref so the main setup effect can read the latest supplier fallback
  // without adding supplier to its deps (would reset the form on every parent re-render).
  // Declared before the setup effect so it always runs first when supplier changes.
  const supplierRef = useRef(supplier);
  useEffect(() => {
    supplierRef.current = supplier;
  }, [supplier]);

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
          payment_terms_id: entity.payment_terms_id ?? "",
          business_unit_id: entity.business_unit_id ?? "",
          address: entity.address ?? "",
          email: entity.email ?? "",
          website: entity.website ?? "",
          npwp: entity.npwp ?? "",
          notes: entity.notes ?? "",
          province_id: entity.province_id ?? p?.id ?? undefined,
          city_id: entity.city_id ?? c?.id ?? undefined,
          district_id: entity.district_id ?? d?.id ?? undefined,
          village_name: entity.village_name ?? "",
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          contacts: (entity.contacts ?? []).map(ph => ({
            name: ph.name,
            email: ph.email ?? "",
            phone: ph.phone,
            position: ph.position ?? "",
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
        payment_terms_id: "",
        business_unit_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        notes: "",
        village_name: "",
          latitude: null,
          longitude: null,
        contacts: [],
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
            payment_terms_id: data.payment_terms_id ?? "",
            business_unit_id: data.business_unit_id ?? "",
            address: data.address ?? "",
            province_id: data.province_id ?? "",
            city_id: data.city_id ?? "",
            district_id: data.district_id ?? "",
            village_name: data.village_name ?? "",
            email: data.email ?? "",
            website: data.website ?? "",
            npwp: data.npwp ?? "",
            notes: data.notes ?? "",
            latitude: data.latitude,
            longitude: data.longitude,
          },
        });
      } else {
        await createSupplier.mutateAsync({
          name: data.name,
          supplier_type_id: data.supplier_type_id || undefined,
          payment_terms_id: data.payment_terms_id || undefined,
          business_unit_id: data.business_unit_id || undefined,
          address: data.address || undefined,
          province_id: data.province_id || undefined,
          city_id: data.city_id || undefined,
          district_id: data.district_id || undefined,
          village_name: data.village_name || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          npwp: data.npwp || undefined,
          notes: data.notes || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          contacts: data.contacts as CreateContactData[],
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

  // Handlers for nested lists (create mode)
  const handleAddContact = (contact: CreateContactData) => {
    setValue("contacts", [...formContacts, contact]);
  };
  const handleUpdateContact = (index: number, contact: CreateContactData) => {
    const nextContacts = [...formContacts];
    nextContacts[index] = contact;
    setValue("contacts", nextContacts);
  };
  const handleDeleteContact = (index: number) => {
    setValue("contacts", formContacts.filter((_, i) => i !== index));
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
              {/* Supplier Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.basicInfo")}
                </h3>

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
                  <FieldLabel>{t("form.name")} *</FieldLabel>
                  <Input
                    placeholder={t("form.namePlaceholder")}
                    {...register("name")}
                    disabled={isViewing}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.paymentTerms")}</FieldLabel>
                  <Controller
                    control={control}
                    name="payment_terms_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={isViewing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.paymentTermsPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTerms.map((pt) => (
                            <SelectItem key={pt.id} value={pt.id}>
                              {pt.code ? `${pt.code} - ${pt.name}` : pt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.businessUnit")}</FieldLabel>
                  <Controller
                    control={control}
                    name="business_unit_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={isViewing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.businessUnitPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {businessUnits.map((bu) => (
                            <SelectItem key={bu.id} value={bu.id}>
                              {bu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("form.npwp")}</FieldLabel>
                  <Input
                    placeholder={t("form.npwpPlaceholder")}
                    {...register("npwp")}
                    disabled={isViewing}
                  />
                </Field>

              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-medium border-b pb-2">
                  {t("sections.contact")}
                </h3>

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

                <Field orientation="vertical">
                  <FieldLabel>{t("form.notes")}</FieldLabel>
                  <Textarea
                    placeholder={t("form.notesPlaceholder")}
                    {...register("notes")}
                    rows={2}
                    disabled={isViewing}
                  />
                </Field>
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

                <LocationPicker
                  control={control}
                  setValue={setValue}
                  disabled={isViewing}
                  enabled={isOpen}
                />
              </div>
            </TabsContent>

            <TabsContent forceMount value="financial" className="mt-4 space-y-6 p-4 data-[state=inactive]:hidden">
              {/* Contacts Section */}
              <div className="space-y-4">
                <SupplierContactList
                  supplierId={(isEditing || isViewing) ? fullSupplier?.id : undefined}
                  contacts={(isEditing || isViewing) ? (fullSupplier?.contacts ?? []) : formContacts}
                  onAdd={handleAddContact}
                  onUpdate={handleUpdateContact}
                  onDelete={handleDeleteContact}
                  isReadOnly={isViewing}
                />
                {(mode === "create") && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: Contacts added here will be saved when you click
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
  );
}
