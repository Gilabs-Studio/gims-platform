"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomerContactsTab } from "@/features/crm/contact/components/customer-contacts-tab";
import { LocationPicker } from "../../../geographic/components/location-picker";
import { CustomerTypeDialog } from "../customer-type/customer-type-dialog";
import { BusinessTypeForm } from "../../../organization/components/business-type/business-type-form";
import { EmployeeForm } from "../../../employee/components/employee-form";
import { PaymentTermsDialog } from "../../../payment-and-couriers/payment-terms/components/payment-terms-dialog";

import {
  useCreateCustomer,
  useUpdateCustomer,
  useCustomerFormData,
  useCustomer,
} from "../../hooks/use-customers";
import { getCustomerSchema, type CustomerFormData } from "../../schemas/customer.schema";
import type { Customer } from "../../types";

type PanelMode = "create" | "edit" | "view";

interface CustomerSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly customer?: Customer | null;
  readonly onSuccess?: () => void;
  readonly onCreated?: (item: { id: string; name: string }) => void;
}

export function CustomerSidePanel({
  isOpen,
  onClose,
  mode,
  customer,
  onSuccess,
  onCreated,
}: CustomerSidePanelProps) {
  const t = useTranslations("customer");
  const tContact = useTranslations("crmContact");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [activeTab, setActiveTab] = useState("details");

  type QuickCreateType = "customerType" | "businessType" | "employee" | "paymentTerm" | null;
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType; query: string }>({ type: null, query: "" });

  const openQuickCreate = (type: QuickCreateType, query: string) => {
    setQuickCreate({ type, query });
  };

  const closeQuickCreate = () => {
    setQuickCreate({ type: null, query: "" });
  };





  const handlePaymentTermCreated = (id: string) => {
    setValue("default_payment_terms_id", id, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    closeQuickCreate();
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(getCustomerSchema(t)) as unknown as Resolver<CustomerFormData>,
    defaultValues: {
      name: "",
      customer_type_id: "",
      address: "",
      email: "",
      website: "",
      npwp: "",
      contact_person: "",
      notes: "",
      village_name: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      latitude: null,
      longitude: null,
      is_active: true,
      default_business_type_id: "",
      default_area_id: "",
      default_sales_rep_id: "",
      default_payment_terms_id: "",
      default_tax_rate: null,
    },
  });

  const {
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useCustomer(customer?.id ?? "", { enabled: false, staleTime: 0 });

  // Stable ref so the setup effect can read the latest customer fallback
  // without adding customer to its deps (would reset the form on every parent re-render).
  const customerRef = useRef(customer);
  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  const { data: formDataRes } = useCustomerFormData({ enabled: isOpen });
  const customerTypes = formDataRes?.data?.customer_types ?? [];
  const businessTypes = formDataRes?.data?.business_types ?? [];
  const areas = formDataRes?.data?.areas ?? [];
  const salesReps = formDataRes?.data?.sales_reps ?? [];
  const paymentTermsList = formDataRes?.data?.payment_terms ?? [];

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("details");

    if ((mode === "edit" || mode === "view") && customer?.id) {
      void refetchDetail().then((result) => {
        const entity =
          result.status === "success" && result.data?.data
            ? result.data.data
            : customerRef.current;
        if (!entity) return;

        const v = entity.village;
        const d = v?.district;
        const c = d?.city;
        const p = c?.province;

        reset({
          name: entity.name ?? "",
          customer_type_id: entity.customer_type_id ?? "",
          address: entity.address ?? "",
          email: entity.email ?? "",
          website: entity.website ?? "",
          npwp: entity.npwp ?? "",
          contact_person: entity.contact_person ?? "",
          notes: entity.notes ?? "",
          village_name: entity.village_name ?? "",
          province_id: entity.province_id ?? p?.id ?? undefined,
          city_id: entity.city_id ?? c?.id ?? undefined,
          district_id: entity.district_id ?? d?.id ?? undefined,
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          is_active: entity.is_active,
          default_business_type_id: entity.default_business_type_id ?? "",
          default_area_id: entity.default_area_id ?? "",
          default_sales_rep_id: entity.default_sales_rep_id ?? "",
          default_payment_terms_id: entity.default_payment_terms_id ?? "",
          default_tax_rate: entity.default_tax_rate ?? null,
        });
      });
    } else if (mode === "create") {
      reset({
        name: "",
        customer_type_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        contact_person: "",
        notes: "",
        village_name: "",
        province_id: undefined,
        city_id: undefined,
        district_id: undefined,
        latitude: null,
        longitude: null,
        is_active: true,
        default_business_type_id: "",
        default_area_id: "",
        default_sales_rep_id: "",
        default_payment_terms_id: "",
        default_tax_rate: null,
      });
    }
  }, [isOpen, mode, customer?.id, refetchDetail, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (isEditing && customer) {
        // Always send geographic fields with `|| null` so the backend clears columns
        // when the user removes a selection (null → Go nil pointer → DB NULL).
        await updateCustomer.mutateAsync({
          id: customer.id,
          data: {
            name: data.name,
            customer_type_id: data.customer_type_id || null,
            address: data.address || null,
            email: data.email || null,
            website: data.website || null,
            npwp: data.npwp || null,
            contact_person: data.contact_person || null,
            notes: data.notes || null,
            province_id: data.province_id || null,
            city_id: data.city_id || null,
            district_id: data.district_id || null,
            village_name: data.village_name || null,
            latitude: data.latitude,
            longitude: data.longitude,
            is_active: data.is_active,
            default_business_type_id: data.default_business_type_id || null,
            default_area_id: data.default_area_id || null,
            default_sales_rep_id: data.default_sales_rep_id || null,
            default_payment_terms_id: data.default_payment_terms_id || null,
            default_tax_rate: data.default_tax_rate ?? null,
          },
        });
        toast.success(t("customer.updateSuccess"));
      } else {
        // For creation, omit empty optional fields entirely.
        const result = await createCustomer.mutateAsync({
          name: data.name,
          customer_type_id: data.customer_type_id || undefined,
          address: data.address || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          npwp: data.npwp || undefined,
          contact_person: data.contact_person || undefined,
          notes: data.notes || undefined,
          province_id: data.province_id || undefined,
          city_id: data.city_id || undefined,
          district_id: data.district_id || undefined,
          village_name: data.village_name || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          is_active: data.is_active,
          default_business_type_id: data.default_business_type_id || undefined,
          default_area_id: data.default_area_id || undefined,
          default_sales_rep_id: data.default_sales_rep_id || undefined,
          default_payment_terms_id: data.default_payment_terms_id || undefined,
          default_tax_rate: data.default_tax_rate ?? undefined,
        });
        toast.success(t("customer.createSuccess"));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save customer";
      toast.error(message);
      console.error("Failed to save customer:", error);
    }
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending || isLoadingDetail;

  const panelTitle = isViewing
    ? customer?.name ?? t("customer.title")
    : isEditing
      ? t("customer.editTitle")
      : t("customer.createTitle");

  return (
    <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={panelTitle}
        side="right"
        defaultWidth={550}
      >
        {/* Tab navigation for view mode */}
        {isViewing && customer?.id && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-0">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="cursor-pointer">{t("common.viewDetails")}</TabsTrigger>
              <TabsTrigger value="contacts" className="cursor-pointer">{tContact("tab")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Contacts tab content */}
        {isViewing && activeTab === "contacts" && customer?.id && (
          <div className="p-4">
            <CustomerContactsTab customerId={customer.id} />
          </div>
        )}

        {/* Details form (shown in create/edit, or view details tab) */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={`space-y-6 pb-20 p-4 ${isViewing && activeTab !== "details" ? "hidden" : ""}`}
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.basicInfo")}
            </h3>

            <Field orientation="vertical">
                <FieldLabel>{t("customer.form.customerType")}</FieldLabel>
                <Controller
                  control={control}
                  name="customer_type_id"
                  render={({ field }) => (
                    <CreatableCombobox
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={isViewing}
                      options={customerTypes.map((ct) => ({
                        value: ct.id,
                        label: ct.name,
                      }))}
                      placeholder={t("customer.form.customerTypePlaceholder")}
                      createPermission="customer_type.create"
                      createLabel={`${t("common.create")} "{query}"`}
                      onCreateClick={(q) => openQuickCreate("customerType", q)}
                    />
                  )}
                />
              </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.name")} *</FieldLabel>
              <Input
                placeholder={t("customer.form.namePlaceholder")}
                {...register("name")}
                disabled={isViewing}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.contactPerson")}</FieldLabel>
              <Input
                placeholder={t("customer.form.contactPersonPlaceholder")}
                {...register("contact_person")}
                disabled={isViewing}
              />
            </Field>

            {!isViewing && (
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <FieldLabel>{t("customer.form.isActive")}</FieldLabel>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            )}
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.contact")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.email")}</FieldLabel>
              <Input
                type="email"
                placeholder={t("customer.form.emailPlaceholder")}
                {...register("email")}
                disabled={isViewing}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.website")}</FieldLabel>
              <Input
                placeholder={t("customer.form.websitePlaceholder")}
                {...register("website")}
                disabled={isViewing}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.npwp")}</FieldLabel>
              <Input
                placeholder={t("customer.form.npwpPlaceholder")}
                {...register("npwp")}
                disabled={isViewing}
              />
            </Field>
          </div>

          {/* Location */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.address")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.address")}</FieldLabel>
              <Textarea
                placeholder={t("customer.form.addressPlaceholder")}
                {...register("address")}
                rows={2}
                disabled={isViewing}
              />
              {errors.address && <FieldError>{errors.address.message}</FieldError>}
            </Field>

            <LocationPicker
              control={control}
              setValue={setValue}
              disabled={isViewing}
              enabled={isOpen}
              onProvinceChange={(_id, name) => {
                if (!name || isViewing) return;
                const matched = areas.find(
                  (a) => a.province && a.province.toLowerCase() === name.toLowerCase()
                );
                if (matched) {
                  setValue("default_area_id", matched.id, { shouldDirty: true });
                }
              }}
            />
          </div>

          {/* Sales Defaults */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium border-b pb-2">
              {t("customer.sections.salesDefaults")}
            </h3>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultBusinessType")}</FieldLabel>
              <Controller
                control={control}
                name="default_business_type_id"
                render={({ field }) => (
                  <CreatableCombobox
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isViewing}
                    options={businessTypes.map((bt) => ({
                      value: bt.id,
                      label: bt.name,
                    }))}
                    placeholder={t("customer.form.defaultBusinessTypePlaceholder")}
                    createPermission="business_type.create"
                    createLabel={`${t("common.create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("businessType", q)}
                  />
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultArea")}</FieldLabel>
              <Controller
                control={control}
                name="default_area_id"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isViewing}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("customer.form.defaultAreaPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id} className="cursor-pointer">
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultSalesRep")}</FieldLabel>
              <Controller
                control={control}
                name="default_sales_rep_id"
                render={({ field }) => (
                  <CreatableCombobox
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isViewing}
                    options={salesReps.map((rep) => ({
                      value: rep.id,
                      label: `${rep.name} (${rep.employee_code})`,
                    }))}
                    placeholder={t("customer.form.defaultSalesRepPlaceholder")}
                    createPermission="employee.create"
                    createLabel={`${t("common.create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("employee", q)}
                  />
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultPaymentTerms")}</FieldLabel>
              <Controller
                control={control}
                name="default_payment_terms_id"
                render={({ field }) => (
                  <CreatableCombobox
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    disabled={isViewing}
                    options={paymentTermsList.map((pt) => ({
                      value: pt.id,
                      label: `${pt.name} (${pt.days} days)`,
                    }))}
                    placeholder={t("customer.form.defaultPaymentTermsPlaceholder")}
                    createPermission="payment_term.create"
                    createLabel={`${t("common.create")} "{query}"`}
                    onCreateClick={(q) => openQuickCreate("paymentTerm", q)}
                  />
                )}
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.defaultTaxRate")}</FieldLabel>
              <Controller
                control={control}
                name="default_tax_rate"
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    placeholder={t("customer.form.defaultTaxRatePlaceholder")}
                    disabled={isViewing}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || null)}
                  />
                )}
              />
            </Field>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <Field orientation="vertical">
              <FieldLabel>{t("customer.form.notes")}</FieldLabel>
              <Textarea
                placeholder={t("customer.form.notesPlaceholder")}
                {...register("notes")}
                rows={3}
                disabled={isViewing}
              />
            </Field>
          </div>

          {/* Actions */}
          {!isViewing && (
            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  t("common.save")
                ) : (
                  t("common.create")
                )}
              </Button>
            </div>
          )}
        </form>

      <CustomerTypeDialog
        open={quickCreate.type === "customerType"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        editingItem={null}
      />
      
      <BusinessTypeForm
        open={quickCreate.type === "businessType"}
        onClose={closeQuickCreate}
      />
      
      <EmployeeForm
        open={quickCreate.type === "employee"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
      />
      
      <PaymentTermsDialog
        open={quickCreate.type === "paymentTerm"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        onCreated={(item) => handlePaymentTermCreated(item.id)}
      />
      </Drawer>
  );
}
