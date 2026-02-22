"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText, CalendarIcon } from "lucide-react";
import {
  getInvoiceSchema,
  getUpdateInvoiceSchema,
  type CreateInvoiceFormData,
  type UpdateInvoiceFormData,
} from "../schemas/invoice.schema";
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
import { useCreateInvoice, useUpdateInvoice, useInvoice } from "../hooks/use-invoices";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useOrders } from "@/features/sales/order/hooks/use-orders";
import type { CustomerInvoice } from "../types";
import { toast } from "sonner";
import { ButtonLoading } from "@/components/loading";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "invoice_form_cache";

interface InvoiceFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly invoice?: CustomerInvoice | null;
}

export function InvoiceForm({ open, onClose, invoice }: InvoiceFormProps) {
  const isEdit = !!invoice;
  const t = useTranslations("invoice");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full invoice data with items when editing
  const { data: fullInvoiceData, isLoading: isLoadingInvoice, isFetching: isFetchingInvoice } = useInvoice(
    invoice?.id ?? "",
    { 
      enabled: open && isEdit && !!invoice?.id,
    }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true });
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 });
  const { data: ordersData } = useOrders({ per_page: 100, status: "approved" });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

  const paymentTerms = useMemo(() => {
    const data = paymentTermsData?.data ?? [];
    return sortOptions(data, (a) => a.code ? `${a.code} - ${a.name}` : a.name);
  }, [paymentTermsData?.data]);

  const orders = useMemo(() => {
    const data = ordersData?.data ?? [];
    return sortOptions(data, (a) => a.code);
  }, [ordersData?.data]);

  const schema = isEdit ? getUpdateInvoiceSchema(t) : getInvoiceSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateInvoiceFormData | UpdateInvoiceFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateInvoiceFormData | UpdateInvoiceFormData>({
    resolver: formResolver,
    defaultValues: invoice
      ? {
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date ?? undefined,
          type: invoice.type ?? "regular",
          sales_order_id: invoice.sales_order_id ?? undefined,
          payment_terms_id: invoice.payment_terms_id ?? undefined,
          tax_rate: invoice.tax_rate ?? 11,
          delivery_cost: invoice.delivery_cost ?? 0,
          other_cost: invoice.other_cost ?? 0,
          notes: invoice.notes ?? "",
          items:
            invoice.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
              hpp_amount: item.hpp_amount ?? 0,
            })) ?? [],
        }
      : {
          invoice_date: new Date().toISOString().split("T")[0],
          type: "regular",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
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

  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalHpp = 0;
    if (watchedItems) {
      watchedItems.forEach((item) => {
        if (item?.product_id && item?.quantity && item?.price) {
          const itemSubtotal = (item.price * item.quantity) - (item.discount ?? 0);
          subtotal += itemSubtotal;
          totalHpp += (item.hpp_amount ?? 0) * item.quantity;
        }
      });
    }

    const taxAmount = subtotal * ((taxRate ?? 11) / 100);
    const total = subtotal + taxAmount + deliveryCost + otherCost;
    const grossProfit = subtotal - totalHpp;

    return {
      subtotal,
      taxAmount,
      total,
      totalHpp,
      grossProfit,
    };
  }, [watchedItems, taxRate, deliveryCost, otherCost]);

  // Reset form when invoice data changes (for edit mode)
  useEffect(() => {
    // Only run when modal is open
    if (!open) {
      // Clear cache when dialog closes
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // For edit mode: wait until fullInvoiceData is available
    if (isEdit) {
      if (fullInvoiceData?.data) {
        const invoiceData = fullInvoiceData.data;
        
        // Small delay to ensure form is mounted
        setTimeout(() => {
          reset({
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date ?? undefined,
            type: invoiceData.type ?? "regular",
            sales_order_id: invoiceData.sales_order_id ?? undefined,
            payment_terms_id: invoiceData.payment_terms_id ?? undefined,
            tax_rate: invoiceData.tax_rate ?? 11,
            delivery_cost: invoiceData.delivery_cost ?? 0,
            other_cost: invoiceData.other_cost ?? 0,
            notes: invoiceData.notes ?? "",
            items:
              invoiceData.items?.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount ?? 0,
                hpp_amount: item.hpp_amount ?? 0,
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
          invoice_date: new Date().toISOString().split("T")[0],
          type: "regular",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
        });
      }
    } else {
      reset({
        invoice_date: new Date().toISOString().split("T")[0],
        type: "regular",
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
      });
    }
  }, [open, isEdit, fullInvoiceData, reset]);

  const saveToLocalStorage = (data: CreateInvoiceFormData | UpdateInvoiceFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "invoice_date",
        "due_date",
        "type",
        "sales_order_id",
        "payment_terms_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "notes",
      ];

      const isValid = await Promise.all(
        basicFields.map((field) =>
          trigger(field as keyof (CreateInvoiceFormData | UpdateInvoiceFormData))
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
    data: CreateInvoiceFormData | UpdateInvoiceFormData
  ) => {
    // Check if we're on items tab but have errors in basic fields
    if (activeTab === "items") {
      const basicFields = [
        "invoice_date",
        "due_date",
        "type",
        "sales_order_id",
        "payment_terms_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "notes",
      ];

      // Trigger validation for basic fields first
      const isBasicValid = await trigger(basicFields as (keyof CreateInvoiceFormData | keyof UpdateInvoiceFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      // Filter out items with empty product_id
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && invoice) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createInvoice.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateInvoiceFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, product.selling_price, { shouldValidate: true });
      setValue(`items.${index}.hpp_amount`, product.current_hpp ?? 0, { shouldValidate: true });
    }
  };

  const isLoading = createInvoice.isPending || updateInvoice.isPending;
  const isFormLoading = isEdit && (isLoadingInvoice || isFetchingInvoice) && !fullInvoiceData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateInvoiceFormData | UpdateInvoiceFormData>) => {
    const basicFields = [
      "invoice_date",
      "due_date",
      "type",
      "sales_order_id",
      "payment_terms_id",
      "tax_rate",
      "delivery_cost",
      "other_cost",
      "notes",
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateInvoiceFormData | keyof UpdateInvoiceFormData]
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
                  <h3 className="text-sm font-medium">{t("common.invoice")}</h3>
                </div>
            <div className="grid gap-4 grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel>{t("invoiceDate")} *</FieldLabel>
                <Controller
                  name="invoice_date"
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
                {errors.invoice_date && (
                  <FieldError>{errors.invoice_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("dueDate")}</FieldLabel>
                <Controller
                  name="due_date"
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
                {errors.due_date && (
                  <FieldError>{errors.due_date.message}</FieldError>
                )}
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("invoiceType")}</FieldLabel>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">{t("type.regular")}</SelectItem>
                        <SelectItem value="proforma">{t("type.proforma")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel>{t("paymentTerms")}</FieldLabel>
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
                <FieldLabel>{t("salesOrder")}</FieldLabel>
                <Controller
                  name="sales_order_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("salesOrder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{t("common.financial")}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
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

                        <Field orientation="vertical">
                          <FieldLabel>{t("item.hpp")}</FieldLabel>
                          <Controller
                            name={`items.${index}.hpp_amount`}
                            control={control}
                            render={({ field }) => (
                              <NumericInput
                                value={field.value}
                                onChange={field.onChange}
                                min={0}
                              />
                            )}
                          />
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

                  {/* HPP & Gross Profit breakdown at the bottom of summary */}
                  <div className="border-t pt-3 mt-4 space-y-2 bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">{t("hppAmount")}</span>
                      <span className="font-medium">{formatCurrency(calculations.totalHpp)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground uppercase tracking-wider">{t("grossProfit")}</span>
                      <span className={cn("font-bold", calculations.grossProfit >= 0 ? "text-green-600" : "text-destructive")}>
                        {formatCurrency(calculations.grossProfit)}
                      </span>
                    </div>
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
