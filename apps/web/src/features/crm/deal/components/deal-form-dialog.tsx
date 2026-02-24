"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useDealFormData, useCreateDeal, useUpdateDeal } from "../hooks/use-deals";
import {
  createDealSchema,
  type CreateDealFormData,
} from "../schemas/deal.schema";
import type { Deal, DealPipelineStageOption, DealProductOption } from "../types";

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
  const { data: formData } = useDealFormData({ enabled: open });
  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();

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
    reset,
    formState: { errors },
  } = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema) as Resolver<CreateDealFormData>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Reset form when dialog opens with fresh deal data
  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  // Sync probability from selected pipeline stage
  const selectedStageId = watch("pipeline_stage_id");
  const selectedStage = useMemo(
    () =>
      formData?.pipeline_stages?.find(
        (s: DealPipelineStageOption) => s.id === selectedStageId
      ),
    [formData?.pipeline_stages, selectedStageId]
  );

  // Auto-calculate value from product items
  const items = watch("items");
  useEffect(() => {
    if (items && items.length > 0) {
      const total = items.reduce((sum, item) => {
        const lineTotal =
          (item.unit_price ?? 0) * (item.quantity ?? 1);
        const discountAmt = item.discount_percent
          ? lineTotal * (item.discount_percent / 100)
          : item.discount_amount ?? 0;
        return sum + (lineTotal - discountAmt);
      }, 0);
      setValue("value", total);
    }
  }, [items, setValue]);

  // Auto-fill product details when product_id is selected
  const handleProductSelect = (index: number, productId: string) => {
    const product = formData?.products?.find(
      (p: DealProductOption) => p.id === productId
    );
    if (product) {
      setValue(`items.${index}.product_name`, product.name);
      setValue(`items.${index}.product_sku`, product.sku);
      setValue(`items.${index}.unit_price`, product.selling_price);
    }
  };

  // Filter contacts by selected customer
  const selectedCustomerId = watch("customer_id");
  const filteredContacts = useMemo(
    () =>
      formData?.contacts?.filter(
        (c) => !selectedCustomerId || c.customer_id === selectedCustomerId
      ) ?? [],
    [formData?.contacts, selectedCustomerId]
  );

  const handleFormSubmit = (data: CreateDealFormData) => {
    // Clean empty string UUIDs to null/undefined
    const cleaned = {
      ...data,
      customer_id: data.customer_id || undefined,
      contact_id: data.contact_id || undefined,
      assigned_to: data.assigned_to || undefined,
      lead_id: data.lead_id || undefined,
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
    };

    if (deal) {
      updateMutation.mutate(
        { id: deal.id, data: cleaned },
        mutationOptions
      );
    } else {
      createMutation.mutate(cleaned, mutationOptions);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4"
        >
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{t("dealTitle")} *</Label>
              <Input {...register("title")} placeholder={t("dealTitlePlaceholder")} />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label>{t("pipelineStage")} *</Label>
              <Controller
                name="pipeline_stage_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("selectStage")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.pipeline_stages?.map((stage) => (
                        <SelectItem
                          key={stage.id}
                          value={stage.id}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: stage.color || "#6b7280",
                              }}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {t("probability")}: {selectedStage.probability}%
                </p>
              )}
              {errors.pipeline_stage_id && (
                <p className="text-xs text-destructive mt-1">
                  {errors.pipeline_stage_id.message}
                </p>
              )}
            </div>

            <div>
              <Label>{t("expectedCloseDate")}</Label>
              <Input type="date" {...register("expected_close_date")} />
            </div>

            <div>
              <Label>{t("customer")}</Label>
              <Controller
                name="customer_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.customers?.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="cursor-pointer"
                        >
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>{t("contact")}</Label>
              <Controller
                name="contact_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("selectContact")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredContacts.map((c) => (
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
            </div>

            <div>
              <Label>{t("assignedTo")}</Label>
              <Controller
                name="assigned_to"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("selectEmployee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.employees?.map((e) => (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                          className="cursor-pointer"
                        >
                          {e.name} ({e.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>{t("lead")}</Label>
              <Controller
                name="lead_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder={t("selectLead")} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData?.leads
                        ?.filter((l) => !l.is_converted)
                        .map((l) => (
                          <SelectItem
                            key={l.id}
                            value={l.id}
                            className="cursor-pointer"
                          >
                            {l.first_name} {l.last_name} ({l.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>{t("value")}</Label>
              <Input
                type="number"
                {...register("value", { valueAsNumber: true })}
                readOnly={fields.length > 0}
              />
              {fields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("valueAutoCalculated")}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <Label>{t("description")}</Label>
              <Textarea {...register("description")} rows={2} />
            </div>
          </div>

          {/* BANT Section */}
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3">{t("bantTitle")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Controller
                  name="budget_confirmed"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Label className="cursor-pointer">{t("budgetConfirmed")}</Label>
              </div>
              <div>
                <Label>{t("budgetAmount")}</Label>
                <Input
                  type="number"
                  {...register("budget_amount", { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="auth_confirmed"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Label className="cursor-pointer">{t("authConfirmed")}</Label>
              </div>
              <div>
                <Label>{t("authPerson")}</Label>
                <Input {...register("auth_person")} />
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="need_confirmed"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Label className="cursor-pointer">{t("needConfirmed")}</Label>
              </div>
              <div>
                <Label>{t("needDescription")}</Label>
                <Input {...register("need_description")} />
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="time_confirmed"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="cursor-pointer"
                    />
                  )}
                />
                <Label className="cursor-pointer">{t("timeConfirmed")}</Label>
              </div>
            </div>
          </div>

          {/* Product Items */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">{t("productItems")}</h4>
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

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noItems")}
              </p>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-end mb-3 p-3 rounded-lg border bg-muted/20"
              >
                <div className="col-span-4">
                  <Label className="text-xs">{t("product")}</Label>
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
                        <SelectTrigger className="cursor-pointer h-8 text-xs">
                          <SelectValue placeholder={t("selectProduct")} />
                        </SelectTrigger>
                        <SelectContent>
                          {formData?.products?.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              className="cursor-pointer"
                            >
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">{t("unitPrice")}</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    {...register(`items.${index}.unit_price`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">{t("qty")}</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">{t("discountPct")}</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    {...register(`items.${index}.discount_percent`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">{t("itemNotes")}</Label>
                  <Input
                    className="h-8 text-xs"
                    {...register(`items.${index}.notes`)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <Label>{t("notes")}</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading
                ? t("saving")
                : deal
                  ? t("updateDeal")
                  : t("createDeal")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
