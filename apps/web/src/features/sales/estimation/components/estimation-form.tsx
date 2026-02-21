"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon,User } from "lucide-react";
import {
  getEstimationSchema,
  getUpdateEstimationSchema,
  type CreateEstimationFormData,
  type UpdateEstimationFormData,
} from "../schemas/estimation.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCreateEstimation, useUpdateEstimation, useEstimation } from "../hooks/use-estimations";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useBusinessTypes } from "@/features/master-data/organization/hooks/use-business-types";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import type { SalesEstimation } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "estimation_form_cache";

interface EstimationFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly estimation?: SalesEstimation | null;
}

export function EstimationForm({ open, onClose, estimation }: EstimationFormProps) {
  const isEdit = !!estimation;
  const t = useTranslations("estimation");
  const createEstimation = useCreateEstimation();
  const updateEstimation = useUpdateEstimation();
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full estimation data when editing
  const { data: fullEstimationData, isLoading: isLoadingEstimation, isFetching: isFetchingEstimation } = useEstimation(
    estimation?.id ?? "",
    { 
      enabled: open && isEdit && !!estimation?.id,
    }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true }, { enabled: open });
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 }, { enabled: open });
  const { data: businessTypesData } = useBusinessTypes({ per_page: 100 }, { enabled: open });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
  const { data: areasData } = useAreas({ per_page: 100 });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

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

  const areas = useMemo(() => {
    const data = areasData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [areasData?.data]);

  const schema = isEdit ? getUpdateEstimationSchema(t) : getEstimationSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateEstimationFormData | UpdateEstimationFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateEstimationFormData | UpdateEstimationFormData>({
    resolver: formResolver,
    defaultValues: estimation
      ? {
          estimation_date: estimation.estimation_date,
          customer_name: estimation.customer_name,
          customer_contact: estimation.customer_contact ?? "",
          customer_email: estimation.customer_email ?? "",
          customer_phone: estimation.customer_phone ?? "",
          expected_close_date: estimation.expected_close_date ?? undefined,
          probability: estimation.probability ?? 50,
          area_id: estimation.area_id ?? undefined,
          sales_rep_id: estimation.sales_rep_id ?? "",
          business_unit_id: estimation.business_unit_id ?? "",
          business_type_id: estimation.business_type_id ?? undefined,
          tax_rate: estimation.tax_rate ?? 11,
          delivery_cost: estimation.delivery_cost ?? 0,
          other_cost: estimation.other_cost ?? 0,
          discount_amount: estimation.discount_amount ?? 0,
          notes: estimation.notes ?? "",
          items:
            estimation.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              estimated_price: item.estimated_price,
              discount: item.discount ?? 0,
              notes: item.notes ?? "",
            })) ?? [],
        }
      : {
          estimation_date: new Date().toISOString().split("T")[0],
          probability: 50,
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
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
        if (item?.product_id && item?.quantity && item?.estimated_price) {
          const itemSubtotal = (item.estimated_price * item.quantity) - (item.discount ?? 0);
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

  // Reset form when estimation data changes
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullEstimationData?.data) {
        const estimationData = fullEstimationData.data;
        
        setTimeout(() => {
          reset({
            estimation_date: estimationData.estimation_date,
            customer_name: estimationData.customer_name,
            customer_contact: estimationData.customer_contact ?? "",
            customer_email: estimationData.customer_email ?? "",
            customer_phone: estimationData.customer_phone ?? "",
            expected_close_date: estimationData.expected_close_date ?? undefined,
            probability: estimationData.probability ?? 50,
            area_id: estimationData.area_id ?? undefined,
            sales_rep_id: estimationData.sales_rep_id ?? "",
            business_unit_id: estimationData.business_unit_id ?? "",
            business_type_id: estimationData.business_type_id ?? undefined,
            tax_rate: estimationData.tax_rate ?? 11,
            delivery_cost: estimationData.delivery_cost ?? 0,
            other_cost: estimationData.other_cost ?? 0,
            discount_amount: estimationData.discount_amount ?? 0,
            notes: estimationData.notes ?? "",
            items:
              estimationData.items?.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                estimated_price: item.estimated_price,
                discount: item.discount ?? 0,
                notes: item.notes ?? "",
              })) ?? [],
          });
        }, 10);
      }
      return;
    }

    // For create mode
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        reset({
          estimation_date: new Date().toISOString().split("T")[0],
          probability: 50,
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
        });
      }
    } else {
      reset({
        estimation_date: new Date().toISOString().split("T")[0],
        probability: 50,
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
      });
    }
  }, [open, isEdit, fullEstimationData, reset]);

  const saveToLocalStorage = (data: CreateEstimationFormData | UpdateEstimationFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "estimation_date",
        "customer_name",
        "customer_contact",
        "customer_email",
        "customer_phone",
        "expected_close_date",
        "probability",
        "area_id",
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
          trigger(field as keyof (CreateEstimationFormData | UpdateEstimationFormData))
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
    data: CreateEstimationFormData | UpdateEstimationFormData
  ) => {
    if (activeTab === "items") {
      const basicFields = [
        "estimation_date",
        "customer_name",
        "sales_rep_id",
        "business_unit_id",
      ];

      const isBasicValid = await trigger(basicFields as (keyof CreateEstimationFormData | keyof UpdateEstimationFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && estimation) {
        await updateEstimation.mutateAsync({
          id: estimation.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createEstimation.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateEstimationFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save estimation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, estimated_price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.estimated_price`, product.selling_price, { shouldValidate: true });
    }
  };

  const isLoading = createEstimation.isPending || updateEstimation.isPending;
  const isFormLoading = isEdit && (isLoadingEstimation || isFetchingEstimation) && !fullEstimationData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateEstimationFormData | UpdateEstimationFormData>) => {
    const basicFields = [
      "estimation_date",
      "customer_name",
      "customer_contact",
      "customer_email",
      "customer_phone",
      "sales_rep_id",
      "business_unit_id",
    ];

    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateEstimationFormData | keyof UpdateEstimationFormData]
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
              {/* Customer Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("customerInfo")}</h3>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("customerName")} *</FieldLabel>
                    <Input {...register("customer_name")} />
                    {errors.customer_name && (
                      <FieldError>{errors.customer_name.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("customerContact")}</FieldLabel>
                    <Input {...register("customer_contact")} />
                    {errors.customer_contact && (
                      <FieldError>{errors.customer_contact.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("customerPhone")}</FieldLabel>
                    <Input {...register("customer_phone")} />
                    {errors.customer_phone && (
                      <FieldError>{errors.customer_phone.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical" className="col-span-2">
                    <FieldLabel>{t("customerEmail")}</FieldLabel>
                    <Input {...register("customer_email")} type="email" />
                    {errors.customer_email && (
                      <FieldError>{errors.customer_email.message}</FieldError>
                    )}
                  </Field>
                </div>
              </div>

              {/* Estimation Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("common.estimation")}</h3>
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <Field orientation="vertical">
                    <FieldLabel>{t("estimationDate")} *</FieldLabel>
                    <Controller
                      name="estimation_date"
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
                    {errors.estimation_date && (
                      <FieldError>{errors.estimation_date.message}</FieldError>
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
                    {errors.expected_close_date && (
                      <FieldError>{errors.expected_close_date.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("probabilityPercent")}</FieldLabel>
                    <Controller
                      name="probability"
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
                    {errors.probability && (
                      <FieldError>{errors.probability.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("area")}</FieldLabel>
                    <Controller
                      name="area_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("common.select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.area_id && (
                      <FieldError>{errors.area_id.message}</FieldError>
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
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
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

              {/* Financial Information */}
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

              {/* Tab Navigation */}
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
              {/* Items Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Items Section */}
                <div className="col-span-2 space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("items")} ({fields.length})</h3>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {fields.map((field, index) => {
                      const item = watchedItems?.[index];
                      const itemSubtotal = item
                        ? (item.estimated_price ?? 0) * (item.quantity ?? 0) - (item.discount ?? 0)
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
                              <FieldLabel>{t("item.estimatedPrice")} *</FieldLabel>
                              <Controller
                                name={`items.${index}.estimated_price`}
                                control={control}
                                render={({ field }) => (
                                  <NumericInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    min={0.01}
                                  />
                                )}
                              />
                              {errors.items?.[index]?.estimated_price && (
                                <FieldError>
                                  {errors.items[index]?.estimated_price?.message}
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

                            <Field orientation="vertical">
                              <FieldLabel>{t("item.subtotal")}</FieldLabel>
                              <Input
                                value={formatCurrency(itemSubtotal)}
                                disabled
                                className="bg-muted"
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>

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

                {/* Summary Section */}
                <div className="space-y-4">
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

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("basic")}
                  className="cursor-pointer"
                >
                  {t("common.back")}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="cursor-pointer"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    <ButtonLoading loading={isLoading} loadingText={isEdit ? t("common.saving") : t("common.saving")}>
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
