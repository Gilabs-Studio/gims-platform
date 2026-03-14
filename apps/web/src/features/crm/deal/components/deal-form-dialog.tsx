"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray, useWatch, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Briefcase, CalendarIcon, DollarSign, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ButtonLoading } from "@/components/loading";
import { toast } from "sonner";
import { useFinanceBankAccounts } from "@/features/finance/bank-accounts/hooks/use-finance-bank-accounts";
import { useDealFormData, useCreateDeal, useUpdateDeal } from "../hooks/use-deals";
import { createDealSchema, type CreateDealFormData } from "../schemas/deal.schema";
import type { Deal, DealPipelineStageOption, DealProductOption } from "../types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId?: string;
  deal?: Deal | null;
  onSuccess?: () => void;
}

export function DealFormDialog({
  open,
  onOpenChange,
  defaultStageId,
  deal,
  onSuccess,
}: DealFormDialogProps) {
  const t = useTranslations("crmDeal");
  const { data: formData, isLoading: isFormLoading } = useDealFormData({ enabled: open });
  const { data: bankAccountsRes } = useFinanceBankAccounts({ per_page: 100, sort_by: "name", sort_dir: "asc" });
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const isEdit = !!deal;
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");

  const defaultValues: CreateDealFormData = useMemo(
    () => ({
      title: deal?.title ?? "",
      description: deal?.description ?? "",
      pipeline_stage_id: deal?.pipeline_stage_id ?? defaultStageId ?? "",
      value: deal?.value ?? 0,
      expected_close_date: deal?.expected_close_date?.split("T")[0] ?? "",
      customer_id: deal?.customer_id ?? "",
      contact_id: deal?.contact_id ?? "",
      assigned_to: deal?.assigned_to ?? "",
      lead_id: deal?.lead_id ?? "",
      bank_account_id: deal?.bank_account_id ?? "",
      bank_account_reference: deal?.bank_account_reference ?? "",
      budget_confirmed: deal?.budget_confirmed ?? false,
      budget_amount: deal?.budget_amount ?? 0,
      auth_confirmed: deal?.auth_confirmed ?? false,
      auth_person: deal?.auth_person ?? "",
      need_confirmed: deal?.need_confirmed ?? false,
      need_description: deal?.need_description ?? "",
      time_confirmed: deal?.time_confirmed ?? false,
      notes: deal?.notes ?? "",
      items:
        deal?.items?.map((item) => ({
          product_id: item.product_id ?? "",
          product_name: item.product_name,
          product_sku: item.product_sku,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          notes: item.notes,
        })) ?? [],
    }),
    [deal, defaultStageId]
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema) as Resolver<CreateDealFormData>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Reset form and tab state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("basic");
      reset(defaultValues);
    }
  // defaultValues is intentionally excluded — reset should only fire on open toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  // Ensure pipeline_stage_id is applied once formData is available.
  // Handles the race condition where formData loads after the initial reset.
  // For new deals with no defaultStageId, auto-select the first (lowest-order) stage.
  useEffect(() => {
    if (!open || !formData?.pipeline_stages?.length) return;
    const current = getValues("pipeline_stage_id");
    if (!current) {
      const target = deal?.pipeline_stage_id ?? defaultStageId ?? formData.pipeline_stages[0]?.id;
      if (target) setValue("pipeline_stage_id", target, { shouldValidate: false });
    }
  }, [open, formData?.pipeline_stages, deal?.pipeline_stage_id, defaultStageId, getValues, setValue]);

  const selectedStageId = watch("pipeline_stage_id");
  const selectedStage = useMemo(
    () => formData?.pipeline_stages?.find((s: DealPipelineStageOption) => s.id === selectedStageId),
    [formData?.pipeline_stages, selectedStageId]
  );

  // useWatch provides deep subscription on nested field changes (price, qty, discount)
  // unlike watch() which may not re-render on nested mutations
  const watchedItems = useWatch({ control, name: "items" });
  const itemsSubtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce((sum, item) => {
        const lineTotal = (item.unit_price ?? 0) * (item.quantity ?? 1);
        const discountAmt = item.discount_percent
          ? lineTotal * (item.discount_percent / 100)
          : (item.discount_amount ?? 0);
        return sum + (lineTotal - discountAmt);
      }, 0),
    [watchedItems]
  );

  // Keep the "value" field in sync whenever items change
  useEffect(() => {
    if (!watchedItems?.length) return;
    setValue("value", itemsSubtotal, { shouldDirty: true });
  }, [itemsSubtotal, watchedItems?.length, setValue]);

  const handleProductSelect = (index: number, productId: string) => {
    const product = formData?.products?.find((p: DealProductOption) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_name`, product.name);
      setValue(`items.${index}.product_sku`, product.sku);
      setValue(`items.${index}.unit_price`, product.selling_price);
    }
  };

  const selectedCustomerId = watch("customer_id");
  const filteredContacts = useMemo(
    () =>
      formData?.contacts?.filter(
        (c) => !selectedCustomerId || c.customer_id === selectedCustomerId
      ) ?? [],
    [formData?.contacts, selectedCustomerId]
  );

  const dealValue = watch("value");
  const bankAccounts = bankAccountsRes?.data ?? [];

  const handleFormSubmit = (data: CreateDealFormData) => {
    const cleaned = {
      ...data,
      customer_id: data.customer_id || undefined,
      contact_id: data.contact_id || undefined,
      assigned_to: data.assigned_to || undefined,
      lead_id: data.lead_id || undefined,
      bank_account_id: data.bank_account_id || undefined,
      bank_account_reference: data.bank_account_reference || undefined,
      expected_close_date: data.expected_close_date || undefined,
      items: data.items?.map((item) => ({
        ...item,
        product_id: item.product_id || undefined,
      })),
    };

    const mutationOptions = {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const code = error?.response?.data?.error?.code ?? error?.message ?? "";
        if (code === "DEAL_ALREADY_CLOSED") {
          toast.error(t("errorAlreadyClosed"));
        } else {
          toast.error(t(isEdit ? "updated" : "created").replace("successfully", "") + " failed");
        }
      },
    };

    if (isEdit) {
      updateMutation.mutate({ id: deal!.id, data: cleaned }, mutationOptions);
    } else {
      createMutation.mutate(cleaned, mutationOptions);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>

        {/* Warn when editing a closed deal */}
        {isEdit && deal?.status !== "open" && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t("dealAlreadyClosed")}</span>
          </div>
        )}

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "basic" | "items")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t("tabBasic")}</TabsTrigger>
              <TabsTrigger value="items">{t("tabItems")}</TabsTrigger>
            </TabsList>

            <form
              onSubmit={handleSubmit(handleFormSubmit, (fieldErrors) => {
                // If Tab 1 fields have errors but the user is on Tab 2, switch back
                const tab1Fields = ["title", "pipeline_stage_id"] as const;
                if (tab1Fields.some((f) => fieldErrors[f])) setActiveTab("basic");
              })}
              className="space-y-6 mt-4"
            >
              {/* ─── TAB 1: BASIC INFO ─────────────────────────── */}
              <TabsContent value="basic" className="space-y-6 mt-0">

                {/* Deal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("sectionDealInfo")}</h3>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("dealTitle")} *</FieldLabel>
                      <Input {...register("title")} placeholder={t("dealTitlePlaceholder")} />
                      {errors.title && <FieldError>{errors.title.message}</FieldError>}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("pipelineStage")} *</FieldLabel>
                      <Controller
                        name="pipeline_stage_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("selectStage")} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData?.pipeline_stages?.map((stage: DealPipelineStageOption) => (
                                <SelectItem key={stage.id} value={stage.id} className="cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: stage.color || "#6b7280" }}
                                    />
                                    {stage.name} ({stage.probability}%)
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {selectedStage && (
                        <p className="text-xs text-muted-foreground">
                          {t("probability")}: {selectedStage.probability}%
                        </p>
                      )}
                      {errors.pipeline_stage_id && (
                        <FieldError>{errors.pipeline_stage_id.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("expectedCloseDate")}</FieldLabel>
                      <Controller
                        name="expected_close_date"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal cursor-pointer",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? formatDate(new Date(field.value))
                                  : t("selectDate")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date: Date | undefined) => {
                                  if (date) {
                                    const y = date.getFullYear();
                                    const m = String(date.getMonth() + 1).padStart(2, "0");
                                    const d = String(date.getDate()).padStart(2, "0");
                                    field.onChange(`${y}-${m}-${d}`);
                                  } else {
                                    field.onChange("");
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </Field>
                  </div>
                </div>

                {/* Customer & Assignment */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("sectionCustomerInfo")}</h3>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <Field orientation="vertical">
                      <FieldLabel>{t("customer")}</FieldLabel>
                      <Controller
                        name="customer_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("selectCustomer")} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData?.customers?.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                  {c.name} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("contact")}</FieldLabel>
                      <Controller
                        name="contact_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("selectContact")} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredContacts.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("assignedTo")}</FieldLabel>
                      <Controller
                        name="assigned_to"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("selectEmployee")} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData?.employees?.map((e) => (
                                <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                                  {e.name} ({e.employee_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("lead")}</FieldLabel>
                      <Controller
                        name="lead_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value ?? ""} onValueChange={field.onChange}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("selectLead")} />
                            </SelectTrigger>
                            <SelectContent>
                              {formData?.leads
                                ?.filter((l) => !l.is_converted)
                                .map((l) => (
                                  <SelectItem key={l.id} value={l.id} className="cursor-pointer">
                                    {l.first_name} {l.last_name} ({l.code})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("bankAccount")}</FieldLabel>
                      <Controller
                        name="bank_account_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                            <SelectTrigger className="cursor-pointer">
                              <SelectValue placeholder={t("bankAccountPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="cursor-pointer">-</SelectItem>
                              {bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id} className="cursor-pointer">
                                  {account.name} - {account.account_number} ({account.currency}) [{t(`bankAccountOwnerType.${account.owner_type}`)}: {account.owner_name}]
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("bankAccountReference")}</FieldLabel>
                      <Input
                        {...register("bank_account_reference")}
                        placeholder={t("bankAccountReferencePlaceholder")}
                      />
                      {errors.bank_account_reference && <FieldError>{errors.bank_account_reference.message}</FieldError>}
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("description")}</FieldLabel>
                      <Textarea {...register("description")} rows={3} />
                    </Field>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => setActiveTab("items")}
                  >
                    {t("btnNext")}
                  </Button>
                </div>
              </TabsContent>

              {/* ─── TAB 2: PRODUCTS & BANT ────────────────────── */}
              <TabsContent value="items" className="space-y-6 mt-0">
                <div className="grid grid-cols-3 gap-6">

                  {/* Left column: products + BANT */}
                  <div className="col-span-2 space-y-6">

                    {/* Product Items */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-medium">
                            {t("productItems")} ({fields.length})
                          </h3>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            append({
                              product_id: "",
                              product_name: "",
                              product_sku: "",
                              unit_price: 0,
                              quantity: 1,
                              discount_percent: 0,
                              discount_amount: 0,
                              notes: "",
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t("addItem")}
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {fields.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                            {t("noItems")}
                          </p>
                        )}

                        {fields.map((field, index) => {
                          const item = watchedItems?.[index];
                          const lineTotal = (item?.unit_price ?? 0) * (item?.quantity ?? 1);
                          const discountAmt = item?.discount_percent
                            ? lineTotal * (item.discount_percent / 100)
                            : (item?.discount_amount ?? 0);
                          const subtotal = lineTotal - discountAmt;

                          return (
                            <div
                              key={field.id}
                              className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="absolute top-2 right-2 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">
                                  #{index + 1}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-6">
                                <Field orientation="vertical" className="col-span-2">
                                  <FieldLabel>{t("product")}</FieldLabel>
                                  <Controller
                                    name={`items.${index}.product_id`}
                                    control={control}
                                    render={({ field: f }) => (
                                      <Select
                                        value={f.value ?? ""}
                                        onValueChange={(val) => {
                                          f.onChange(val);
                                          handleProductSelect(index, val);
                                        }}
                                      >
                                        <SelectTrigger className="cursor-pointer">
                                          <SelectValue placeholder={t("selectProduct")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {formData?.products?.map((p: DealProductOption) => (
                                            <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                              {p.name} ({p.sku})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </Field>

                                <Field orientation="vertical">
                                  <FieldLabel>{t("unitPrice")}</FieldLabel>
                                  <Controller
                                    name={`items.${index}.unit_price`}
                                    control={control}
                                    render={({ field }) => (
                                      <NumericInput
                                        currency
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    )}
                                  />
                                </Field>

                                <Field orientation="vertical">
                                  <FieldLabel>{t("qty")}</FieldLabel>
                                  <Controller
                                    name={`items.${index}.quantity`}
                                    control={control}
                                    render={({ field }) => (
                                      <NumericInput
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    )}
                                  />
                                </Field>

                                <Field orientation="vertical">
                                  <FieldLabel>{t("discountPct")} (%)</FieldLabel>
                                  <Controller
                                    name={`items.${index}.discount_percent`}
                                    control={control}
                                    render={({ field }) => (
                                      <NumericInput
                                        value={field.value}
                                        onChange={field.onChange}
                                      />
                                    )}
                                  />
                                </Field>

                                <Field orientation="vertical">
                                  <FieldLabel>{t("itemNotes")}</FieldLabel>
                                  <Input {...register(`items.${index}.notes`)} />
                                </Field>

                                <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border/50">
                                  <span className="text-sm text-muted-foreground">{t("subtotal")}:</span>
                                  <span className="text-base font-bold text-primary">{formatCurrency(subtotal)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* BANT */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium">{t("bantTitle")}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Controller
                            name="budget_confirmed"
                            control={control}
                            render={({ field }) => (
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                            )}
                          />
                          <FieldLabel className="cursor-pointer">{t("budgetConfirmed")}</FieldLabel>
                        </div>
                        <Field orientation="vertical">
                          <FieldLabel>{t("budgetAmount")}</FieldLabel>
                          <Controller
                            name="budget_amount"
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                currency
                                value={field.value}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        </Field>

                        <div className="flex items-center gap-2">
                          <Controller
                            name="auth_confirmed"
                            control={control}
                            render={({ field }) => (
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                            )}
                          />
                          <FieldLabel className="cursor-pointer">{t("authConfirmed")}</FieldLabel>
                        </div>
                        <Field orientation="vertical">
                          <FieldLabel>{t("authPerson")}</FieldLabel>
                          <Input {...register("auth_person")} />
                        </Field>

                        <div className="flex items-center gap-2">
                          <Controller
                            name="need_confirmed"
                            control={control}
                            render={({ field }) => (
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                            )}
                          />
                          <FieldLabel className="cursor-pointer">{t("needConfirmed")}</FieldLabel>
                        </div>
                        <Field orientation="vertical">
                          <FieldLabel>{t("needDescription")}</FieldLabel>
                          <Input {...register("need_description")} />
                        </Field>

                        <div className="flex items-center gap-2">
                          <Controller
                            name="time_confirmed"
                            control={control}
                            render={({ field }) => (
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="cursor-pointer" />
                            )}
                          />
                          <FieldLabel className="cursor-pointer">{t("timeConfirmed")}</FieldLabel>
                        </div>
                        <Field orientation="vertical">
                          <FieldLabel>{t("expectedCloseDate")}</FieldLabel>
                          <Controller
                            name="expected_close_date"
                            control={control}
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal cursor-pointer",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value
                                      ? formatDate(new Date(field.value))
                                      : t("selectDate")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date: Date | undefined) => {
                                      if (date) {
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, "0");
                                        const d = String(date.getDate()).padStart(2, "0");
                                        field.onChange(`${y}-${m}-${d}`);
                                      } else {
                                        field.onChange("");
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        </Field>
                      </div>
                    </div>

                    {/* Notes */}
                    <Field orientation="vertical">
                      <FieldLabel>{t("notes")}</FieldLabel>
                      <Textarea {...register("notes")} rows={2} />
                    </Field>
                  </div>

                  {/* Right column: summary */}
                  <div className="col-span-1">
                    <div className="sticky top-0 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium">{t("summary")}</h3>
                      </div>

                      <div className="space-y-3 rounded-lg bg-muted/30 p-4">
                        {fields.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{t("subtotal")}:</span>
                              <span className="font-medium">{formatCurrency(itemsSubtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm font-bold">{t("value")}:</span>
                              <span className="text-lg font-bold text-primary">{formatCurrency(dealValue ?? 0)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{t("valueAutoCalculated")}</p>
                          </>
                        ) : (
                          <Field orientation="vertical">
                            <FieldLabel>{t("value")}</FieldLabel>
                            <Controller
                              name="value"
                              control={control}
                              render={({ field }) => (
                                <NumericInput
                                  currency
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </Field>
                        )}

                        {selectedStage && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: selectedStage.color || "#6b7280" }}
                              />
                              <span className="text-sm font-medium">{selectedStage.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t("probability")}: {selectedStage.probability}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setActiveTab("basic")}
                  >
                    {t("btnBack")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={isLoading}
                      onClick={() => onOpenChange(false)}
                    >
                      {t("cancel")}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="cursor-pointer">
                      <ButtonLoading loading={isLoading} loadingText={t("saving")}>
                        {isEdit ? t("updateDeal") : t("createDeal")}
                      </ButtonLoading>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
