"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon } from "lucide-react";
import {
  getQuotationSchema,
  getUpdateQuotationSchema,
  type CreateQuotationFormData,
  type UpdateQuotationFormData,
} from "../schemas/quotation.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, sortOptions } from "@/lib/utils";
import { useCreateQuotation, useUpdateQuotation, useQuotation } from "../hooks/use-quotations";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useBusinessTypes } from "@/features/master-data/organization/hooks/use-business-types";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import type { SalesQuotation } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "quotation_form_cache";

interface QuotationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly quotation?: SalesQuotation | null;
}

export function QuotationForm({ open, onClose, quotation }: QuotationFormProps) {
  const isEdit = !!quotation;
  const t = useTranslations("quotation");
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full quotation data with items when editing
  const { data: fullQuotationData, isLoading: isLoadingQuotation, isFetching: isFetchingQuotation } = useQuotation(
    quotation?.id ?? "",
    { 
      enabled: open && isEdit && !!quotation?.id,
    }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true });
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 });
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 });
  const { data: businessTypesData } = useBusinessTypes({ per_page: 100 });
  const { data: employeesData } = useEmployees({ per_page: 100 });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

  const paymentTerms = useMemo(() => {
    const data = paymentTermsData?.data ?? [];
    return sortOptions(data, (a) => a.code ? `${a.code} - ${a.name}` : a.name);
  }, [paymentTermsData?.data]);

  const businessUnits = useMemo(() => {
    const data = businessUnitsData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [businessUnitsData?.data]);

  const businessTypes = useMemo(() => {
    const data = businessTypesData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [businessTypesData?.data]);

  const employees = useMemo(() => {
    const data = employeesData?.data ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [employeesData?.data]);

  const schema = isEdit ? getUpdateQuotationSchema(t) : getQuotationSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateQuotationFormData | UpdateQuotationFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateQuotationFormData | UpdateQuotationFormData>({
    resolver: formResolver,
    defaultValues: quotation
      ? {
          quotation_date: quotation.quotation_date,
          valid_until: quotation.valid_until ?? undefined,
          payment_terms_id: quotation.payment_terms_id ?? "",
          sales_rep_id: quotation.sales_rep_id ?? "",
          business_unit_id: quotation.business_unit_id ?? "",
          business_type_id: quotation.business_type_id ?? undefined,
          tax_rate: quotation.tax_rate ?? 11,
          delivery_cost: quotation.delivery_cost ?? 0,
          other_cost: quotation.other_cost ?? 0,
          discount_amount: quotation.discount_amount ?? 0,
          notes: quotation.notes ?? "",
          items:
            quotation.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
            })) ?? [],
        }
      : {
          quotation_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch form values for calculations
  const watchedItems = useWatch({ control, name: "items" });
  const taxRate = useWatch({ control, name: "tax_rate" }) ?? 11;
  const deliveryCost = useWatch({ control, name: "delivery_cost" }) ?? 0;
  const otherCost = useWatch({ control, name: "other_cost" }) ?? 0;
  const discountAmount = useWatch({ control, name: "discount_amount" }) ?? 0;

  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    if (watchedItems) {
      watchedItems.forEach((item) => {
        if (item?.product_id && item?.quantity && item?.price) {
          const itemSubtotal = (item.price * item.quantity) - (item.discount ?? 0);
          subtotal += itemSubtotal;
        }
      });
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = subtotalAfterDiscount * ((taxRate ?? 11) / 100);
    const total = subtotalAfterDiscount + taxAmount + deliveryCost + otherCost;

    return {
      subtotal,
      subtotalAfterDiscount,
      taxAmount,
      total,
    };
  }, [watchedItems, discountAmount, taxRate, deliveryCost, otherCost]);

  // Reset form when quotation data changes (for edit mode)
  useEffect(() => {
    // Only run when modal is open
    if (!open) {
      // Clear cache when dialog closes
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // For edit mode: wait until fullQuotationData is available
    if (isEdit) {
      if (fullQuotationData?.data) {
        const quotationData = fullQuotationData.data;
        
        // Small delay to ensure form is mounted
        setTimeout(() => {
          reset({
            quotation_date: quotationData.quotation_date,
            valid_until: quotationData.valid_until ?? undefined,
            payment_terms_id: quotationData.payment_terms_id ?? "",
            sales_rep_id: quotationData.sales_rep_id ?? "",
            business_unit_id: quotationData.business_unit_id ?? "",
            business_type_id: quotationData.business_type_id ?? undefined,
            tax_rate: quotationData.tax_rate ?? 11,
            delivery_cost: quotationData.delivery_cost ?? 0,
            other_cost: quotationData.other_cost ?? 0,
            discount_amount: quotationData.discount_amount ?? 0,
            notes: quotationData.notes ?? "",
            items:
              quotationData.items?.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount ?? 0,
              })) ?? [],
          });
        }, 10);
      }
      return;
    }

    // For create mode: load from localStorage or use defaults
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        // Invalid cache, use defaults
        reset({
          quotation_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        });
      }
    } else {
      reset({
        quotation_date: new Date().toISOString().split("T")[0],
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
      });
    }
  }, [open, isEdit, fullQuotationData, reset]);

  const saveToLocalStorage = (data: CreateQuotationFormData | UpdateQuotationFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "quotation_date",
        "valid_until",
        "payment_terms_id",
        "sales_rep_id",
        "business_unit_id",
        "business_type_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "discount_amount",
        "notes",
      ];

      const isValid = await Promise.all(
        basicFields.map((field) =>
          trigger(field as keyof (CreateQuotationFormData | UpdateQuotationFormData))
        )
      ).then((results) => results.every((result) => result));

      if (isValid) {
        const formData = getValues();
        saveToLocalStorage(formData);
        setActiveTab("items");
      } else {
        toast.error(t("common.validationError") || "Please fill all required fields");
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFormSubmit = async (
    data: CreateQuotationFormData | UpdateQuotationFormData
  ) => {
    // Check if we're on items tab but have errors in basic fields
    if (activeTab === "items") {
      const basicFields = [
        "quotation_date",
        "valid_until",
        "payment_terms_id",
        "sales_rep_id",
        "business_unit_id",
        "business_type_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "discount_amount",
        "notes",
      ];

      // Trigger validation for basic fields first
      const isBasicValid = await trigger(basicFields as (keyof CreateQuotationFormData | keyof UpdateQuotationFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      // Filter out items with empty product_id
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && quotation) {
        await updateQuotation.mutateAsync({
          id: quotation.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createQuotation.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateQuotationFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, product.selling_price, { shouldValidate: true });
    }
  };

  const isLoading = createQuotation.isPending || updateQuotation.isPending;
  const isFormLoading = isEdit && (isLoadingQuotation || isFetchingQuotation) && !fullQuotationData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateQuotationFormData | UpdateQuotationFormData>) => {
    const basicFields = [
      "quotation_date",
      "valid_until",
      "payment_terms_id",
      "sales_rep_id",
      "business_unit_id",
      "business_type_id",
      "tax_rate",
      "delivery_cost",
      "other_cost",
      "discount_amount",
      "notes",
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateQuotationFormData | keyof UpdateQuotationFormData]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit") : t("add")}
          </DialogTitle>
        </DialogHeader>

        {isFormLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "basic" | "items")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">
              {t("common.basicInfo") || "Basic Information"}
            </TabsTrigger>
            <TabsTrigger value="items">
              {t("items")} & {t("summary")}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("common.quotation")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel>{t("quotationDate")} *</FieldLabel>
                <Controller
                  name="quotation_date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(new Date(field.value)) : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date: Date | undefined) => {
                            field.onChange(date ? date.toISOString().split('T')[0] : "");
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.quotation_date && (
                  <FieldError>{errors.quotation_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("validUntil")}</FieldLabel>
                <Controller
                  name="valid_until"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? formatDate(new Date(field.value)) : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date: Date | undefined) => {
                            field.onChange(date ? date.toISOString().split('T')[0] : undefined);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.valid_until && (
                  <FieldError>{errors.valid_until.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("paymentTerms")} *</FieldLabel>
                <Controller
                  name="payment_terms_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("paymentTerms")} />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.code ? `${term.code} - ${term.name}` : term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.payment_terms_id && (
                  <FieldError>{errors.payment_terms_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("salesRep")} *</FieldLabel>
                <Controller
                  name="sales_rep_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesRep")} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.employee_code} - {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sales_rep_id && (
                  <FieldError>{errors.sales_rep_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("businessUnit")} *</FieldLabel>
                <Controller
                  name="business_unit_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("businessUnit")} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.business_unit_id && (
                  <FieldError>{errors.business_unit_id.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("businessType")}</FieldLabel>
                <Controller
                  name="business_type_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.business_type_id && (
                  <FieldError>{errors.business_type_id.message}</FieldError>
                )}
              </Field>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("common.financial")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel>{t("taxRate")}</FieldLabel>
                <Controller
                  name="tax_rate"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                      max={100}
                    />
                  )}
                />
                {errors.tax_rate && (
                  <FieldError>{errors.tax_rate.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("discountAmount")}</FieldLabel>
                <Controller
                  name="discount_amount"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.discount_amount && (
                  <FieldError>{errors.discount_amount.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("deliveryCost")}</FieldLabel>
                <Controller
                  name="delivery_cost"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.delivery_cost && (
                  <FieldError>{errors.delivery_cost.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("otherCost")}</FieldLabel>
                <Controller
                  name="other_cost"
                  control={control}
                  render={({ field }) => (
                    <NumericInput
                      value={field.value}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
                {errors.other_cost && (
                  <FieldError>{errors.other_cost.message}</FieldError>
                )}
              </Field>
            </div>

            <Field orientation="vertical" className="col-span-2">
              <FieldLabel>{t("notes")}</FieldLabel>
              <Textarea {...register("notes")} rows={3} />
              {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
            </Field>
          </div>

          {/* Tab Navigation Buttons for Basic Tab */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="cursor-pointer"
              disabled={isValidating}
            >
              <ButtonLoading loading={isValidating} loadingText={t("common.validating") || "Validating..."}>
                {t("common.next") || "Next"}
              </ButtonLoading>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4 mt-0">
          {/* Items and Summary Grid Layout */}
          <div className="grid grid-cols-3 gap-6">
            {/* Items Section - Left Column (2 cols) */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">{t("items")} ({fields.length})</h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {fields.map((field, index) => {
                  const item = watchedItems?.[index];
                  const itemSubtotal = item
                    ? (item.price ?? 0) * (item.quantity ?? 0) - (item.discount ?? 0)
                    : 0;

                  return (
                    <div
                      key={field.id}
                      className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <Field orientation="vertical" className="col-span-2">
                          <FieldLabel>{t("item.product")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.product_id`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProductChange(index, value);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t("item.selectProduct")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.code} - {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.items?.[index]?.product_id && (
                            <FieldError>
                              {errors.items[index]?.product_id?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.quantity")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0.001}
                              />
                            )}
                          />
                          {errors.items?.[index]?.quantity && (
                            <FieldError>
                              {errors.items[index]?.quantity?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.price")} *</FieldLabel>
                          <Controller
                            name={`items.${index}.price`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0.01}
                              />
                            )}
                          />
                          {errors.items?.[index]?.price && (
                            <FieldError>
                              {errors.items[index]?.price?.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.discount")}</FieldLabel>
                          <Controller
                            name={`items.${index}.discount`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0}
                              />
                            )}
                          />
                          {errors.items?.[index]?.discount && (
                            <FieldError>
                              {errors.items[index]?.discount?.message}
                            </FieldError>
                          )}
                        </Field>

                        <div className="col-span-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{t("item.subtotal")}:</span>
                            <span className="text-base font-bold text-primary">{formatCurrency(itemSubtotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {errors.items && typeof errors.items === "object" && "message" in errors.items && (
                  <FieldError>{errors.items.message}</FieldError>
                )}

                {/* Add Item Button - Positioned below last item */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="w-full cursor-pointer border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addItem")}
                </Button>
              </div>
            </div>

            {/* Totals Summary - Right Column */}
            <div className="col-span-1">
              <div className="sticky space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("summary")}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("subtotal")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(calculations.subtotal)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">
                      {t("taxAmount")} ({taxRate}%):
                    </span>
                    <span className="font-medium ml-auto">{formatCurrency(calculations.taxAmount)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("discountAmount")}:</span>
                    <span className="font-medium text-destructive ml-auto">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("deliveryCost")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(deliveryCost)}</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-1">
                    <span className="text-muted-foreground text-sm">{t("otherCost")}:</span>
                    <span className="font-medium ml-auto">{formatCurrency(otherCost)}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-end gap-1 border-t pt-3 mt-2">
                    <span className="text-lg font-bold">{t("totalAmount")}:</span>
                    <span className="text-lg font-bold text-primary ml-auto">{formatCurrency(calculations.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation Buttons for Items Tab */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab("basic")}
              className="cursor-pointer"
            >
              {t("common.back") || "Back"}
            </Button>
            <div className="flex gap-2">
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
                <ButtonLoading 
                  loading={isLoading} 
                  loadingText={t("common.saving")}
                >
                  {isEdit ? t("common.update") : t("common.create")}
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
