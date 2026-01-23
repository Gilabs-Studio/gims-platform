"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon } from "lucide-react";
import {
  getOrderSchema,
  getUpdateOrderSchema,
  type CreateOrderFormData,
  type UpdateOrderFormData,
} from "../schemas/order.schema";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { cn, formatDate } from "@/lib/utils";
import { useCreateOrder, useUpdateOrder, useOrder } from "../hooks/use-orders";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useBusinessTypes } from "@/features/master-data/organization/hooks/use-business-types";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import type { SalesOrder } from "../types";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useQuotations, useQuotation, useQuotationItems } from "../../quotation/hooks/use-quotations";

const STORAGE_KEY = "order_form_cache";

interface OrderFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly order?: SalesOrder | null;
}

export function OrderForm({ open, onClose, order }: OrderFormProps) {
  const isEdit = !!order;
  const t = useTranslations("order");
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");

  // Fetch full order data with items when editing
  const { data: fullOrderData, isLoading: isLoadingOrder, isFetching: isFetchingOrder } = useOrder(
    order?.id ?? "",
    { 
      enabled: open && isEdit && !!order?.id,
    }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true });
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 });
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 });
  const { data: businessTypesData } = useBusinessTypes({ per_page: 100 });
  const { data: employeesData } = useEmployees({ per_page: 100 });
  const { data: areasData } = useAreas({ per_page: 100 });
  
  // Sales Quotation integration
  const { data: quotationsData } = useQuotations({ per_page: 100, status: "approved" });

  const products = useMemo(() => productsData?.data ?? [], [productsData?.data]);
  const paymentTerms = useMemo(() => paymentTermsData?.data ?? [], [paymentTermsData?.data]);
  const businessUnits = useMemo(() => businessUnitsData?.data ?? [], [businessUnitsData?.data]);
  const businessTypes = useMemo(() => businessTypesData?.data ?? [], [businessTypesData?.data]);
  const employees = useMemo(() => employeesData?.data ?? [], [employeesData?.data]);
  const areas = useMemo(() => areasData?.data ?? [], [areasData?.data]);
  const quotations = useMemo(() => quotationsData?.data ?? [], [quotationsData?.data]);

  const schema = isEdit ? getUpdateOrderSchema(t) : getOrderSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateOrderFormData | UpdateOrderFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateOrderFormData | UpdateOrderFormData>({
    resolver: formResolver,
    defaultValues: order
      ? {
          order_date: order.order_date,
          payment_terms_id: order.payment_terms_id ?? "",
          sales_rep_id: order.sales_rep_id ?? "",
          business_unit_id: order.business_unit_id ?? "",
          business_type_id: order.business_type_id ?? undefined,
          delivery_area_id: order.delivery_area_id ?? undefined,
          tax_rate: order.tax_rate ?? 11,
          delivery_cost: order.delivery_cost ?? 0,
          other_cost: order.other_cost ?? 0,
          discount_amount: order.discount_amount ?? 0,
          notes: order.notes ?? "",
          items:
            order.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
            })) ?? [],
          sales_quotation_id: order.sales_quotation_id ?? undefined,
        }
      : {
          order_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
          sales_quotation_id: undefined,
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });



  // Watch for validation
  const watchedQuotationId = useWatch({ control, name: "sales_quotation_id" });
  
  // Fetch quotation details when selected
  const { data: quotationData } = useQuotation(watchedQuotationId ?? "", {
    enabled: !!watchedQuotationId, // Allow fetching even in edit mode for display
  });
  
  const selectedQuotationDetails = quotationData?.data;
  const salesQuotationId = watchedQuotationId;

  // Fetch quotation items when selected
  const { data: quotationItemsData } = useQuotationItems(watchedQuotationId ?? "", {
     per_page: 100 
  }, {
    enabled: !!watchedQuotationId && !isEdit,
  });

  // Auto-populate form from Quotation
  useEffect(() => {
    if (quotationData?.data && !isEdit && watchedQuotationId) {
      const q = quotationData.data;
      
      setValue("payment_terms_id", q.payment_terms_id ?? "", { shouldValidate: true });
      setValue("sales_rep_id", q.sales_rep_id ?? "", { shouldValidate: true });
      setValue("business_unit_id", q.business_unit_id ?? "", { shouldValidate: true });
      setValue("business_type_id", q.business_type_id ?? undefined, { shouldValidate: true });
      // setValue("delivery_area_id", q.delivery_area_id ?? undefined); // Quotation might not have it or different field
      
      setValue("tax_rate", q.tax_rate ?? 11, { shouldValidate: true });
      setValue("delivery_cost", q.delivery_cost ?? 0, { shouldValidate: true });
      setValue("other_cost", q.other_cost ?? 0, { shouldValidate: true });
      setValue("discount_amount", q.discount_amount ?? 0, { shouldValidate: true });
      setValue("notes", q.notes ?? "", { shouldValidate: true });
      
      // Items are handled separately via useQuotationItems or if they are in q.items
      // Assuming useQuotationItems returns the items list
      if (quotationItemsData?.data) {
        const newItems = quotationItemsData.data.map(item => ({
           product_id: item.product_id,
           quantity: item.quantity,
           price: item.price,
           discount: item.discount ?? 0,
        }));
        
        // Replace existing items
        setValue("items", newItems, { shouldValidate: true });
      } else if (q.items && q.items.length > 0) {
         // Fallback if items are in the detail response
         const newItems = q.items.map(item => ({
           product_id: item.product_id,
           quantity: item.quantity,
           price: item.price,
           discount: item.discount ?? 0,
        }));
        setValue("items", newItems, { shouldValidate: true });
      }
    }
  }, [quotationData, quotationItemsData, isEdit, setValue, watchedQuotationId]);

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

  // Reset form when order data changes (for edit mode)
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullOrderData?.data) {
        const orderData = fullOrderData.data;
        
        setTimeout(() => {
          reset({
            order_date: orderData.order_date,
            payment_terms_id: orderData.payment_terms_id ?? "",
            sales_rep_id: orderData.sales_rep_id ?? "",
            business_unit_id: orderData.business_unit_id ?? "",
            business_type_id: orderData.business_type_id ?? undefined,
            delivery_area_id: orderData.delivery_area_id ?? undefined,
            tax_rate: orderData.tax_rate ?? 11,
            delivery_cost: orderData.delivery_cost ?? 0,
            other_cost: orderData.other_cost ?? 0,
            discount_amount: orderData.discount_amount ?? 0,
            notes: orderData.notes ?? "",
            items:
              orderData.items?.map((item) => ({
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
        reset({
          order_date: new Date().toISOString().split("T")[0],
          sales_quotation_id: "",
          payment_terms_id: "",
          sales_rep_id: "",
          business_unit_id: "",
          business_type_id: "",
          delivery_area_id: "",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          notes: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        });
      }
    } else {
      reset({
        order_date: new Date().toISOString().split("T")[0],
        sales_quotation_id: "",
        payment_terms_id: "",
        sales_rep_id: "",
        business_unit_id: "",
        business_type_id: "",
        delivery_area_id: "",
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        notes: "",
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
      });
    }
  }, [open, isEdit, fullOrderData, reset]);

  const saveToLocalStorage = (data: CreateOrderFormData | UpdateOrderFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    const basicFields = [
      "order_date",
      "sales_quotation_id",
      "payment_terms_id",
      "sales_rep_id",
      "business_unit_id",
      "business_type_id",
      "delivery_area_id",
      "tax_rate",
      "delivery_cost",
      "other_cost",
      "discount_amount",
      "notes",
    ];

    const isValid = await trigger(basicFields as any);

    if (isValid) {
      const formData = getValues();
      saveToLocalStorage(formData);
      setActiveTab("items");
    } else {
      // Diagnostic field mapping for clearer error messages
      const fieldMapping: Record<string, string> = {
        order_date: t("orderDate"),
        sales_quotation_id: t("salesQuotation"),
        payment_terms_id: t("paymentTerms"),
        sales_rep_id: t("salesRep"),
        business_unit_id: t("businessUnit"),
        business_type_id: t("businessType"),
        delivery_area_id: t("deliveryArea"),
        tax_rate: t("taxRate"),
        delivery_cost: t("deliveryCost"),
        other_cost: t("otherCost"),
        discount_amount: t("discountAmount"),
        notes: t("notes"),
      };

      // Find which fields are actually failing to help debugging
      const currentErrors = control._formState.errors;
      const failingFields = basicFields
        .filter(field => currentErrors[field as keyof typeof currentErrors])
        .map(field => fieldMapping[field] || field);
      
      const errorMessage = failingFields.length > 0 
        ? `${t("validation.required")}: ${failingFields.join(", ")}`
        : t("validation.required") || "Please fill all required fields";

      toast.error(errorMessage);

    }
  };

  const handleFormSubmit = async (
    data: CreateOrderFormData | UpdateOrderFormData
  ) => {
    try {
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      const payload = {
        ...data,
        sales_quotation_id: data.sales_quotation_id || undefined,
        business_type_id: data.business_type_id || undefined,
        delivery_area_id: data.delivery_area_id || undefined,
        items: filteredItems,
      } as CreateOrderFormData;

      if (isEdit && order) {
        await updateOrder.mutateAsync({
          id: order.id,
          data: payload,
        });
        toast.success(t("updated"));
      } else {
        await createOrder.mutateAsync(payload);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save order:", error);
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

  const isLoading = createOrder.isPending || updateOrder.isPending;
  const isFormLoading = isEdit && (isLoadingOrder || isFetchingOrder) && !fullOrderData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
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
            <TabsTrigger value="basic" disabled={activeTab === "items" && !isEdit}>
              {t("tabs.general")}
            </TabsTrigger>
            <TabsTrigger value="items" disabled={activeTab === "basic"}>
              {t("items")} & {t("summary")}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("common.order")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("salesQuotation")}</FieldLabel>
                <Controller
                  name="sales_quotation_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={isEdit} 
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesQuotation")} />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sales_quotation_id && (
                  <FieldError>{errors.sales_quotation_id.message}</FieldError>
                )}
              </Field>

              {/* Quotation Summary Card */}

              
              <Field orientation="vertical">
                <FieldLabel>{t("orderDate")} *</FieldLabel>
                <Controller
                  name="order_date"
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
                {errors.order_date && (
                  <FieldError>{errors.order_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("paymentTerms")} *</FieldLabel>
                <Controller
                  name="payment_terms_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("paymentTerms")} />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
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
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesRep")} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_code})
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

              <Field orientation="vertical" className="col-span-2">
                <FieldLabel>{t("deliveryArea")}</FieldLabel>
                <Controller
                  name="delivery_area_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("deliveryArea")} />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.filter(a => a.is_active).map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.delivery_area_id && (
                  <FieldError>{errors.delivery_area_id.message}</FieldError>
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
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("tax_rate", { valueAsNumber: true })}
                  defaultValue={11}
                />
                {errors.tax_rate && (
                  <FieldError>{errors.tax_rate.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("discountAmount")}</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("discount_amount", { valueAsNumber: true })}
                  defaultValue={0}
                />
                {errors.discount_amount && (
                  <FieldError>{errors.discount_amount.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("deliveryCost")}</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("delivery_cost", { valueAsNumber: true })}
                  defaultValue={0}
                />
                {errors.delivery_cost && (
                  <FieldError>{errors.delivery_cost.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("otherCost")}</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("other_cost", { valueAsNumber: true })}
                  defaultValue={0}
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
            >
              {t("common.next") || "Next"}
            </Button>
          </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 mt-0">
              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("items")}</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addItem")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const item = watchedItems?.[index];
                    const product = products.find((p) => p.id === item?.product_id);
                    const itemSubtotal = item?.product_id && item?.quantity && item?.price
                      ? (item.price * item.quantity) - (item.discount ?? 0)
                      : 0;

                    return (
                      <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium">
                            {t("item.product")} {index + 1}
                          </h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Field orientation="vertical" className="col-span-2">
                            <FieldLabel>{t("item.product")} *</FieldLabel>
                            <Controller
                              name={`items.${index}.product_id`}
                              control={control}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    handleProductChange(index, value);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("item.selectProduct")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((prod) => (
                                      <SelectItem key={prod.id} value={prod.id}>
                                        {prod.code} - {prod.name}
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
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              {...register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                            />
                            {errors.items?.[index]?.quantity && (
                              <FieldError>
                                {errors.items[index]?.quantity?.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field orientation="vertical">
                            <FieldLabel>{t("item.price")} *</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              {...register(`items.${index}.price`, {
                                valueAsNumber: true,
                              })}
                            />
                            {errors.items?.[index]?.price && (
                              <FieldError>
                                {errors.items[index]?.price?.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field orientation="vertical">
                            <FieldLabel>{t("item.discount")}</FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${index}.discount`, {
                                valueAsNumber: true,
                              })}
                              defaultValue={0}
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
                              type="text"
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
              </div>

              {/* Summary Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{t("summary")}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">{t("subtotal")}:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(calculations.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("discountAmount")}:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">
                      {t("taxRate")} ({taxRate}%):
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(calculations.taxAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("deliveryCost")}:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(deliveryCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t("otherCost")}:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(otherCost)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-base font-semibold">{t("totalAmount")}:</span>
                    <span className="text-base font-semibold">
                      {formatCurrency(calculations.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("basic")}
                  className="cursor-pointer"
                >
                  {t("common.previous")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading} className="cursor-pointer">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </div>
            </TabsContent>
          </form>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
