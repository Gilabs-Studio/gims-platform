"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useDeliveryOrder, useDeliveryOrders } from "@/features/sales/delivery/hooks/use-deliveries";
import { useOrder } from "@/features/sales/order/hooks/use-orders";
import { useCreateSalesReturn, useSalesReturnFormData, useSalesReturns } from "../hooks/use-sales-returns";
import { salesReturnSchema, type SalesReturnFormData } from "../schemas/sales-return.schema";
import { getFirstFormErrorMessage, getSalesErrorMessage } from "@/features/sales/utils/error-utils";

interface SalesReturnFormProps {
  readonly defaultInvoiceId?: string;
  readonly defaultDeliveryId?: string;
  readonly onSuccess?: () => void;
}

type EligibleItem = {
  productId: string;
  productCode: string;
  productName: string;
  deliveredQty: number;
  returnedQty: number;
  availableQty: number;
  dealPrice: number;
};

const formatQty = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

export function SalesReturnForm({ defaultInvoiceId, defaultDeliveryId, onSuccess }: SalesReturnFormProps) {
  const t = useTranslations("salesReturns");
  const isDeliveryLocked = !!defaultDeliveryId;
  const [shouldLoadDeliveryOptions, setShouldLoadDeliveryOptions] = useState(true);
  const [shouldLoadReferenceData, setShouldLoadReferenceData] = useState(!!defaultDeliveryId);

  const form = useForm<SalesReturnFormData>({
    resolver: zodResolver(salesReturnSchema),
    defaultValues: {
      invoice_id: defaultInvoiceId ?? "",
      delivery_id: defaultDeliveryId ?? "",
      warehouse_id: "",
      customer_id: "",
      reason: "OTHER",
      action: "CREDIT_NOTE",
      notes: "",
      items: [
        {
          invoice_item_id: "",
          product_id: "",
          uom_id: "",
          condition: "GOOD",
          notes: "",
          qty: 1,
          unit_price: 0,
        },
      ],
    },
  });

  const { control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const selectedDeliveryId = useWatch({ control, name: "delivery_id" });

  const shouldLoadReferenceDataEnabled = shouldLoadReferenceData || !!selectedDeliveryId;
  const { data: formDataResponse } = useSalesReturnFormData({
    enabled: shouldLoadReferenceDataEnabled,
  });
  const { data: deliveryOptionsResponse } = useDeliveryOrders(
    { per_page: 20, status: "delivered" },
    { enabled: !isDeliveryLocked && shouldLoadDeliveryOptions },
  );
  const createMutation = useCreateSalesReturn();

  const { data: deliveryResponse, isLoading: isLoadingDelivery, isError: isDeliveryError } = useDeliveryOrder(
    selectedDeliveryId ?? "",
    { enabled: !!selectedDeliveryId },
  );

  const { data: returnHistoryResponse } = useSalesReturns(
    {
      per_page: 20,
      delivery_id: selectedDeliveryId,
    },
    { enabled: !!selectedDeliveryId },
  );

  const delivery = deliveryResponse?.data;
  const deliveryWarehouseId = delivery?.warehouse_id ?? "";
  const deliveryItems = useMemo(() => delivery?.items ?? [], [delivery?.items]);
  const deliveryOptions = useMemo(() => deliveryOptionsResponse?.data ?? [], [deliveryOptionsResponse?.data]);
  const returnHistory = useMemo(() => returnHistoryResponse?.data ?? [], [returnHistoryResponse?.data]);

  const { data: orderResponse } = useOrder(delivery?.sales_order_id ?? "", {
    enabled: !!delivery?.sales_order_id,
  });

  const orderItems = useMemo(() => orderResponse?.data?.items ?? [], [orderResponse?.data?.items]);

  const dealPriceByProduct = useMemo(() => {
    const map = new Map<string, number>();
    orderItems.forEach((item) => {
      const productId = item.product_id?.trim();
      if (!productId) {
        return;
      }
      map.set(productId, item.price ?? 0);
    });
    return map;
  }, [orderItems]);

  const returnedQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    const effectiveStatuses = new Set(["SUBMITTED", "PROCESSED"]);

    returnHistory.forEach((history) => {
      if (!effectiveStatuses.has((history.status ?? "").toUpperCase())) {
        return;
      }

      (history.items ?? []).forEach((item) => {
        const productId = item.product_id ?? "";
        if (!productId) {
          return;
        }
        const current = map.get(productId) ?? 0;
        map.set(productId, current + (item.qty ?? 0));
      });
    });

    return map;
  }, [returnHistory]);

  const eligibleItems = useMemo<EligibleItem[]>(() => {
    return deliveryItems
      .map((item) => {
        const productId = item.product_id ?? "";
        const deliveredQty = item.quantity ?? 0;
        const returnedQty = returnedQtyByProduct.get(productId) ?? 0;
        const availableQty = Math.max(0, deliveredQty - returnedQty);
        const dealPrice = dealPriceByProduct.get(productId) ?? item.price ?? 0;

        return {
          productId,
          productCode: item.product?.code ?? "-",
          productName: item.product?.name ?? productId,
          deliveredQty,
          returnedQty,
          availableQty,
          dealPrice,
        };
      })
      .filter((item) => item.productId && item.availableQty > 0);
  }, [deliveryItems, returnedQtyByProduct, dealPriceByProduct]);

  const eligibleItemMap = useMemo(() => {
    const map = new Map<string, EligibleItem>();
    eligibleItems.forEach((item) => map.set(item.productId, item));
    return map;
  }, [eligibleItems]);

  const warehouses = useMemo(() => formDataResponse?.data?.warehouses ?? [], [formDataResponse?.data?.warehouses]);
  const reasons = useMemo(() => formDataResponse?.data?.return_reasons ?? [], [formDataResponse?.data?.return_reasons]);
  const actions = useMemo(() => formDataResponse?.data?.actions ?? [], [formDataResponse?.data?.actions]);
  const conditions = useMemo(() => formDataResponse?.data?.item_conditions ?? [], [formDataResponse?.data?.item_conditions]);
  const watchedItems = useWatch({ control, name: "items" });

  useEffect(() => {
    if (!selectedDeliveryId && defaultDeliveryId) {
      form.setValue("delivery_id", defaultDeliveryId);
    }
  }, [selectedDeliveryId, defaultDeliveryId, form]);

  useEffect(() => {
    if (!selectedDeliveryId) {
      return;
    }

    form.reset({
      invoice_id: defaultInvoiceId ?? "",
      delivery_id: selectedDeliveryId,
      warehouse_id: deliveryWarehouseId || warehouses[0]?.id || "",
      customer_id: "",
      reason: reasons[0]?.value ?? "OTHER",
      action: actions[0]?.value ?? "CREDIT_NOTE",
      notes: "",
      items: [
        {
          invoice_item_id: "",
          product_id: eligibleItems[0]?.productId ?? "",
          uom_id: "",
          condition: conditions[0]?.value ?? "GOOD",
          notes: "",
          qty: 1,
          unit_price: eligibleItems[0]?.dealPrice ?? 0,
        },
      ],
    });
  }, [
    selectedDeliveryId,
    defaultInvoiceId,
    deliveryWarehouseId,
    warehouses,
    reasons,
    actions,
    conditions,
    eligibleItems,
    form,
  ]);

  const handleAddItem = () => {
    append({
      invoice_item_id: "",
      product_id: "",
      uom_id: "",
      condition: conditions[0]?.value ?? "GOOD",
      notes: "",
      qty: 1,
      unit_price: 0,
    });
  };

  const onSubmit = async (values: SalesReturnFormData) => {
    if (!selectedDeliveryId) {
      return;
    }

    form.clearErrors("items");

    const selectedProducts = values.items
      .map((item) => item.product_id)
      .filter((productId): productId is string => !!productId);

    const uniqueSelectedProducts = new Set(selectedProducts);
    if (uniqueSelectedProducts.size !== selectedProducts.length) {
      form.setError("items", {
        type: "manual",
        message: t("validation.duplicateItem"),
      });
      return;
    }

    const requestedQtyByProduct = new Map<string, number>();

    for (const item of values.items) {
      const productId = item.product_id;
      if (!productId) {
        continue;
      }

      const current = requestedQtyByProduct.get(productId) ?? 0;
      requestedQtyByProduct.set(productId, current + (item.qty ?? 0));
    }

    for (const [productId, requestedQty] of requestedQtyByProduct.entries()) {
      const selectedItem = eligibleItemMap.get(productId);
      const availableQty = selectedItem?.availableQty ?? 0;
      if (requestedQty > availableQty) {
        form.setError("items", {
          type: "manual",
          message: t("validation.qtyExceeds", {
            product: selectedItem?.productCode ?? productId,
            requested: formatQty(requestedQty),
            delivered: formatQty(selectedItem?.deliveredQty ?? 0),
            returned: formatQty(selectedItem?.returnedQty ?? 0),
            available: formatQty(availableQty),
          }),
        });
        return;
      }
    }

    try {
      await createMutation.mutateAsync({
        ...values,
        delivery_id: selectedDeliveryId,
        warehouse_id: values.warehouse_id,
        invoice_id: values.invoice_id || undefined,
        customer_id: values.customer_id || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item) => ({
          ...item,
          unit_price: eligibleItemMap.get(item.product_id)?.dealPrice ?? item.unit_price,
        })),
      });

      onSuccess?.();
    } catch (error) {
      toast.error(getSalesErrorMessage(error, t("common.error") || "Failed to create sales return"));
    }
  };

  if (!selectedDeliveryId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/50 pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Reference</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Field orientation="vertical">
            <FieldLabel>Delivery Order</FieldLabel>
            <Controller
              name="delivery_id"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      setShouldLoadDeliveryOptions(true);
                      setShouldLoadReferenceData(true);
                    }
                  }}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select delivery order" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="cursor-pointer">
                        {option.code} - {option.sales_order?.code ?? "-"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.delivery_id && <FieldError>{errors.delivery_id.message}</FieldError>}
          </Field>
        </div>
      </div>
    );
  }

  if (isLoadingDelivery) {
    return <div className="text-sm text-muted-foreground">Loading delivery reference...</div>;
  }

  if (isDeliveryError || !delivery) {
    return <div className="text-sm text-destructive">Failed to load delivery reference.</div>;
  }

  if (eligibleItems.length === 0) {
    return <div className="text-sm text-muted-foreground">No eligible items left for return from this delivery order.</div>;
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, (formErrors) => {
        toast.error(
          getFirstFormErrorMessage(formErrors) ||
          t("common.error") ||
          "Please complete all required fields.",
        );
      })}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/50 pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Reference Information</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isDeliveryLocked && (
            <Field orientation="vertical" className="md:col-span-2">
              <FieldLabel>Delivery Order</FieldLabel>
              <Controller
                name="delivery_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setShouldLoadDeliveryOptions(true);
                        setShouldLoadReferenceData(true);
                      }
                    }}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select delivery order" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id} className="cursor-pointer">
                          {option.code} - {option.sales_order?.code ?? "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.delivery_id && <FieldError>{errors.delivery_id.message}</FieldError>}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>Invoice Reference</FieldLabel>
            <Controller
              name="invoice_id"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className="cursor-text"
                  placeholder="Auto-derived from delivery (optional override)"
                />
              )}
            />
            {errors.invoice_id && <FieldError>{errors.invoice_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Warehouse</FieldLabel>
            <Controller
              name="warehouse_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id} className="cursor-pointer">
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {deliveryWarehouseId && (
              <p className="text-xs text-muted-foreground">
                Defaulted from delivery order. Override requires warehouse override permission.
              </p>
            )}
            {errors.warehouse_id && <FieldError>{errors.warehouse_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Reason</FieldLabel>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value} className="cursor-pointer">
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.reason && <FieldError>{errors.reason.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Action</FieldLabel>
            <Controller
              name="action"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((action) => (
                      <SelectItem key={action.value} value={action.value} className="cursor-pointer">
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.action && <FieldError>{errors.action.message}</FieldError>}
          </Field>

          <Field orientation="vertical" className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <Textarea {...field} value={field.value ?? ""} rows={3} />}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/50 pb-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Return Items ({fields.length})</h3>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const selectedProductId = watchedItems?.[index]?.product_id;
            const selectedItem = selectedProductId ? eligibleItemMap.get(selectedProductId) : null;
            const selectedProductIdsInOtherRows = new Set(
              (watchedItems ?? [])
                .filter((_, itemIndex) => itemIndex !== index)
                .map((item) => item?.product_id)
                .filter((productId): productId is string => !!productId),
            );

            return (
              <div key={field.id} className="space-y-4 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Item #{index + 1}</p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field orientation="vertical" className="md:col-span-2">
                    <FieldLabel>Product</FieldLabel>
                    <Controller
                      name={`items.${index}.product_id`}
                      control={control}
                      render={({ field: itemField }) => (
                        <Select
                          value={itemField.value}
                          onValueChange={(value) => {
                            itemField.onChange(value);
                            form.setValue(`items.${index}.unit_price`, eligibleItemMap.get(value)?.dealPrice ?? 0);
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Select eligible product" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleItems
                              .filter((item) => {
                                if (item.productId === itemField.value) {
                                  return true;
                                }
                                return !selectedProductIdsInOtherRows.has(item.productId);
                              })
                              .map((item) => (
                                <SelectItem key={item.productId} value={item.productId} className="cursor-pointer">
                                  {item.productCode} - {item.productName} | Del: {formatQty(item.deliveredQty)} | Ret: {formatQty(item.returnedQty)} | Avl: {formatQty(item.availableQty)} | Deal: {formatCurrency(item.dealPrice)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {selectedItem && (
                      <p className="text-xs text-muted-foreground">
                        Delivered: {formatQty(selectedItem.deliveredQty)} | Already returned: {formatQty(selectedItem.returnedQty)} | Available: {formatQty(selectedItem.availableQty)}
                      </p>
                    )}
                    {errors.items?.[index]?.product_id && <FieldError>{errors.items[index]?.product_id?.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Qty</FieldLabel>
                    <Controller
                      name={`items.${index}.qty`}
                      control={control}
                      render={({ field: itemField }) => (
                        <NumericInput
                          value={itemField.value}
                          onChange={(value) => {
                            const normalized = Math.max(0, value ?? 0);
                            const maxQty = selectedItem?.availableQty;
                            itemField.onChange(maxQty !== undefined ? Math.min(normalized, maxQty) : normalized);
                          }}
                          min={0}
                          max={selectedItem?.availableQty ?? undefined}
                        />
                      )}
                    />
                    {selectedItem && <p className="text-xs text-muted-foreground">Available: {formatQty(selectedItem.availableQty)}</p>}
                    {errors.items?.[index]?.qty && <FieldError>{errors.items[index]?.qty?.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Unit Price (Deal Price)</FieldLabel>
                    <Controller
                      name={`items.${index}.unit_price`}
                      control={control}
                      render={({ field: itemField }) => (
                        <NumericInput value={itemField.value} onChange={(value) => itemField.onChange(value ?? 0)} min={0} disabled />
                      )}
                    />
                    {errors.items?.[index]?.unit_price && <FieldError>{errors.items[index]?.unit_price?.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Item Condition</FieldLabel>
                    <Controller
                      name={`items.${index}.condition`}
                      control={control}
                      render={({ field: itemField }) => (
                        <Select onValueChange={itemField.onChange} value={itemField.value}>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {conditions.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value} className="cursor-pointer">
                                {condition.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.items?.[index]?.condition && <FieldError>{errors.items[index]?.condition?.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical" className="md:col-span-2">
                    <FieldLabel>Item Memo</FieldLabel>
                    <Controller
                      name={`items.${index}.notes`}
                      control={control}
                      render={({ field: itemField }) => <Textarea {...itemField} value={itemField.value ?? ""} rows={2} />}
                    />
                  </Field>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" className="w-full cursor-pointer border-dashed" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>

          {errors.items?.message && <FieldError>{errors.items.message}</FieldError>}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="cursor-pointer" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Saving..." : t("add")}
        </Button>
      </div>
    </form>
  );
}
