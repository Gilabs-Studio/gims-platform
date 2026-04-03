"use client";

import { Drawer } from "@/components/ui/drawer";
import { useEffect, useState, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { NumericInput } from "@/components/ui/numeric-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationPicker } from "../../../geographic/components/location-picker";
import { CustomerTypeDialog } from "../customer-type/customer-type-dialog";
import { BusinessTypeForm } from "../../../organization/components/business-type/business-type-form";
import { EmployeeForm } from "../../../employee/components/employee-form";
import { PaymentTermsDialog } from "../../../payment-and-couriers/payment-terms/components/payment-terms-dialog";
import { CustomerBankList } from "./customer-bank-list";
import { CustomerContactsTab } from "@/features/crm/contact/components/customer-contacts-tab";

import {
  useCreateCustomer,
  useUpdateCustomer,
  useCustomerFormData,
  useCustomer,
} from "../../hooks/use-customers";
import { getCustomerSchema, type CustomerFormData } from "../../schemas/customer.schema";
import type { Customer, CreateCustomerBankData } from "../../types";

type PanelMode = "create" | "edit" | "view";

interface CustomerSidePanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly mode: PanelMode;
  readonly customer?: Customer | null;
  readonly initialData?: { name?: string };
  readonly onSuccess?: () => void;
  readonly onCreated?: (item: { id: string; name: string }) => void;
  readonly closeOnSuccess?: boolean; // false: keep drawer open after create/update
}

export function CustomerSidePanel({
  isOpen,
  onClose,
  mode,
  customer,
  initialData,
  onSuccess,
  onCreated,
  closeOnSuccess = false,
}: CustomerSidePanelProps) {
  const t = useTranslations("customer");
  const isEditing = mode === "edit";
  const isViewing = mode === "view";

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [activeTab, setActiveTab] = useState("general");

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
      notes: "",
      village_name: "",
      province_id: undefined,
      city_id: undefined,
      district_id: undefined,
      latitude: null,
      longitude: null,
      bank_accounts: [],
      default_business_type_id: "",
      default_sales_rep_id: "",
      default_payment_terms_id: "",
      default_tax_rate: null,
      credit_limit: 0,
      credit_is_active: false,
    },
  });

  const formBanks = (useWatch({ control, name: "bank_accounts" }) as CreateCustomerBankData[]) ?? [];
  const creditIsActive = useWatch({ control, name: "credit_is_active" });

  const {
    data: detailRes,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useCustomer(customer?.id ?? "", { enabled: false, staleTime: 0 });
  const fullCustomer = detailRes?.data ?? customer;

  // Stable ref so the setup effect can read the latest customer fallback
  // without adding customer to its deps (would reset the form on every parent re-render).
  const customerRef = useRef(customer);
  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  const { data: formDataRes } = useCustomerFormData({ enabled: isOpen });
  const customerTypes = formDataRes?.data?.customer_types ?? [];
  const businessTypes = formDataRes?.data?.business_types ?? [];
  const salesReps = formDataRes?.data?.sales_reps ?? [];
  const paymentTermsList = formDataRes?.data?.payment_terms ?? [];

  // Single effect: fetch first, then reset — eliminates race condition on re-open
  useEffect(() => {
    if (!isOpen) return;
    const _timer = window.setTimeout(() => setActiveTab("general"), 0);

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
          notes: entity.notes ?? "",
          village_name: entity.village_name ?? "",
          province_id: entity.province_id ?? p?.id ?? undefined,
          city_id: entity.city_id ?? c?.id ?? undefined,
          district_id: entity.district_id ?? d?.id ?? undefined,
          latitude: entity.latitude ?? null,
          longitude: entity.longitude ?? null,
          bank_accounts: entity.bank_accounts?.map((bank) => ({
            bank_id: bank.bank_id,
            currency_id: bank.currency_id ?? "",
            account_number: bank.account_number,
            account_name: bank.account_name,
            branch: bank.branch ?? "",
            is_primary: bank.is_primary,
          })) ?? [],
          default_business_type_id: entity.default_business_type_id ?? "",
          default_sales_rep_id: entity.default_sales_rep_id ?? "",
          default_payment_terms_id: entity.default_payment_terms_id ?? "",
          default_tax_rate: entity.default_tax_rate ?? null,
          credit_limit: entity.credit_limit ?? 0,
          credit_is_active: entity.credit_is_active ?? false,
        });
      });
    } else if (mode === "create") {
      reset({
        name: initialData?.name ?? "",
        customer_type_id: "",
        address: "",
        email: "",
        website: "",
        npwp: "",
        notes: "",
        village_name: "",
        province_id: undefined,
        city_id: undefined,
        district_id: undefined,
        latitude: null,
        longitude: null,
        bank_accounts: [],
        default_business_type_id: "",
        default_sales_rep_id: "",
        default_payment_terms_id: "",
        default_tax_rate: null,
        credit_limit: 0,
        credit_is_active: false,
      });
    }
    return () => clearTimeout(_timer);
  }, [isOpen, mode, customer?.id, refetchDetail, reset, initialData?.name]);

  useEffect(() => {
    if (!creditIsActive) {
      setValue("credit_limit", 0);
    }
  }, [creditIsActive, setValue]);

  const handleAddBank = (bank: CreateCustomerBankData) => {
    setValue("bank_accounts", [...formBanks, bank]);
  };

  const handleUpdateBank = (index: number, bank: CreateCustomerBankData) => {
    const newBanks = [...formBanks];
    newBanks[index] = bank;
    setValue("bank_accounts", newBanks);
  };

  const handleDeleteBank = (index: number) => {
    setValue("bank_accounts", formBanks.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (isEditing && fullCustomer) {
        // Always send geographic fields with `|| null` so the backend clears columns
        // when the user removes a selection (null → Go nil pointer → DB NULL).
        await updateCustomer.mutateAsync({
          id: fullCustomer.id,
          data: {
            name: data.name,
            customer_type_id: data.customer_type_id || null,
            address: data.address || null,
            email: data.email || null,
            website: data.website || null,
            npwp: data.npwp || null,
            notes: data.notes || null,
            province_id: data.province_id || null,
            city_id: data.city_id || null,
            district_id: data.district_id || null,
            village_name: data.village_name || null,
            latitude: data.latitude,
            longitude: data.longitude,
            default_business_type_id: data.default_business_type_id || null,
            default_sales_rep_id: data.default_sales_rep_id || null,
            default_payment_terms_id: data.default_payment_terms_id || null,
            default_tax_rate: data.default_tax_rate ?? null,
            credit_limit: data.credit_limit ?? 0,
            credit_is_active: data.credit_is_active ?? false,
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
          notes: data.notes || undefined,
          province_id: data.province_id || undefined,
          city_id: data.city_id || undefined,
          district_id: data.district_id || undefined,
          village_name: data.village_name || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          default_business_type_id: data.default_business_type_id || undefined,
          default_sales_rep_id: data.default_sales_rep_id || undefined,
          default_payment_terms_id: data.default_payment_terms_id || undefined,
          default_tax_rate: data.default_tax_rate ?? undefined,
          credit_limit: data.credit_limit ?? 0,
          credit_is_active: data.credit_is_active ?? false,
          bank_accounts: data.bank_accounts as CreateCustomerBankData[],
        });

        toast.success(t("customer.createSuccess"));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onSuccess?.();
      if (closeOnSuccess) {
        onClose();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save customer";
      toast.error(message);
      console.error("Failed to save customer:", error);
    }
  };

  const isLoading =
    createCustomer.isPending ||
    updateCustomer.isPending ||
    isLoadingDetail;

  const panelTitle = isViewing
    ? fullCustomer?.name ?? t("customer.title")
    : isEditing
      ? t("customer.editTitle")
      : t("customer.createTitle");

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
            <TabsTrigger value="general" className="cursor-pointer">{t("customer.sections.general")}</TabsTrigger>
            <TabsTrigger value="financial" className="cursor-pointer">{t("customer.sections.financial")}</TabsTrigger>
          </TabsList>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-20 p-4">
          <TabsContent forceMount value="general" className="space-y-6 data-[state=inactive]:hidden">
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

            </div>

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
                onProvinceChange={() => {}}
              />
            </div>

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
          </TabsContent>

          <TabsContent forceMount value="financial" className="space-y-4 data-[state=inactive]:hidden">
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">
                {t("customer.sections.creditControl")}
              </h3>

              <Field orientation="horizontal" className="justify-between">
                <FieldLabel>{t("customer.form.creditIsActive")}</FieldLabel>
                <Controller
                  control={control}
                  name="credit_is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isViewing}
                    />
                  )}
                />
              </Field>

              {creditIsActive && (
                <Field orientation="vertical">
                  <FieldLabel>{t("customer.form.creditLimit")}</FieldLabel>
                  <Controller
                    control={control}
                    name="credit_limit"
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("customer.form.creditLimitPlaceholder")}
                        disabled={isViewing}
                        min={0}
                      />
                    )}
                  />
                  {errors.credit_limit && <FieldError>{errors.credit_limit.message}</FieldError>}
                </Field>
              )}
            </div>

            {fullCustomer?.id ? (
              <CustomerContactsTab customerId={fullCustomer.id} />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Contact dapat ditambahkan setelah customer dibuat.
              </div>
            )}

            <CustomerBankList
              customerId={(isEditing || isViewing) ? fullCustomer?.id : undefined}
              banks={(isEditing || isViewing) ? (fullCustomer?.bank_accounts ?? []) : formBanks}
              onAdd={handleAddBank}
              onUpdate={handleUpdateBank}
              onDelete={handleDeleteBank}
              isReadOnly={isViewing}
            />
          </TabsContent>

          {!isViewing && (
            <div className="flex items-center justify-end gap-3 px-1 pt-4 border-t sticky bottom-0 bg-background z-10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
              {activeTab !== "financial" ? (
                <Button
                  type="button"
                  onClick={() => setActiveTab("financial")}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              ) : (
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
              )}
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
    </Tabs>
  );
}
