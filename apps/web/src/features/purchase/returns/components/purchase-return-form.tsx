"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { FileText, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useGoodsReceipt, useGoodsReceipts } from "@/features/purchase/goods-receipt/hooks/use-goods-receipts";
import { usePurchaseOrder } from "@/features/purchase/orders/hooks/use-purchase-orders";
import { useCreatePurchaseReturn, usePurchaseReturnFormData, usePurchaseReturns, useWarehouseInventoryAvailability } from "../hooks/use-purchase-returns";
import { purchaseReturnSchema, type PurchaseReturnFormData } from "../schemas/purchase-return.schema";

interface PurchaseReturnFormProps {
  readonly defaultGoodsReceiptId?: string;
  readonly onSuccess?: () => void;
}

type EligibleItem = {
  goodsReceiptItemID: string;
  productId: string;
  productCode: string;
  productName: string;
  receivedQty: number;
  returnedQty: number;
  warehouseAvailableQty: number;
  availableQty: number;
  dealCost: number;
};

const formatQty = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);

export function PurchaseReturnForm({ defaultGoodsReceiptId, onSuccess }: PurchaseReturnFormProps) {
  const t = useTranslations("purchaseReturns");
  const isGoodsReceiptLocked = !!defaultGoodsReceiptId;

  const { data: formDataResponse } = usePurchaseReturnFormData();
  const { data: goodsReceiptsResponse } = useGoodsReceipts({ per_page: 100 });
  const createMutation = useCreatePurchaseReturn();

  const form = useForm<PurchaseReturnFormData>({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: {
      goods_receipt_id: defaultGoodsReceiptId ?? "",
      purchase_order_id: "",
      supplier_id: "",
      warehouse_id: "",
      reason: "OTHER",
      action: "SUPPLIER_CREDIT",
      notes: "",
      items: [
        {
          goods_receipt_item_id: "",
          product_id: "",
          uom_id: "",
          condition: "GOOD",
          notes: "",
          qty: 1,
          unit_cost: 0,
        },
      ],
    },
  });

  const { control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const selectedGoodsReceiptId = useWatch({ control, name: "goods_receipt_id" });
  const selectedWarehouseId = useWatch({ control, name: "warehouse_id" });

  const { data: goodsReceiptResponse, isLoading: isLoadingGoodsReceipt, isError: isGoodsReceiptError } = useGoodsReceipt(
    selectedGoodsReceiptId ?? "",
    { enabled: !!selectedGoodsReceiptId },
  );

  const { data: returnHistoryResponse } = usePurchaseReturns(
    {
      per_page: 100,
      goods_receipt_id: selectedGoodsReceiptId,
    },
    { enabled: !!selectedGoodsReceiptId },
  );

  const { data: warehouseAvailabilityResponse } = useWarehouseInventoryAvailability(selectedWarehouseId);

  const goodsReceipt = goodsReceiptResponse?.data;
  const goodsReceiptWarehouseId = (goodsReceipt as { warehouse_id?: string } | undefined)?.warehouse_id ?? "";
  const goodsReceiptItems = useMemo(() => goodsReceipt?.items ?? [], [goodsReceipt?.items]);
  const goodsReceiptOptions = useMemo(() => goodsReceiptsResponse?.data ?? [], [goodsReceiptsResponse?.data]);
  const returnHistory = useMemo(() => returnHistoryResponse?.data ?? [], [returnHistoryResponse?.data]);
  const warehouseInventoryProducts = useMemo(
    () => warehouseAvailabilityResponse?.data?.data ?? [],
    [warehouseAvailabilityResponse?.data?.data],
  );

  const { data: purchaseOrderResponse } = usePurchaseOrder(goodsReceipt?.purchase_order?.id ?? "", {
    enabled: !!goodsReceipt?.purchase_order?.id,
  });

  const purchaseOrderItems = useMemo(() => purchaseOrderResponse?.data?.items ?? [], [purchaseOrderResponse?.data?.items]);

  const dealCostByProduct = useMemo(() => {
    const map = new Map<string, number>();
    purchaseOrderItems.forEach((item) => {
      const productId = item.product_id?.trim();
      if (!productId) {
        return;
      }
      map.set(productId, item.price ?? 0);
    });
    return map;
  }, [purchaseOrderItems]);

  const returnedQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    const effectiveStatuses = new Set(["SUBMITTED", "APPROVED"]);

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

  const warehouseAvailableQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    warehouseInventoryProducts.forEach((item) => {
      const productID = item.product_id?.trim();
      if (!productID) {
        return;
      }
      map.set(productID, Math.max(0, item.available ?? 0));
    });
    return map;
  }, [warehouseInventoryProducts]);

  const eligibleItems = useMemo<EligibleItem[]>(() => {
    return goodsReceiptItems
      .map((item) => {
        const productId = item.product?.id ?? "";
        const receivedQty = item.quantity_received ?? 0;
        const returnedQty = returnedQtyByProduct.get(productId) ?? 0;
        const sourceAvailableQty = Math.max(0, receivedQty - returnedQty);
        const warehouseAvailableQty = warehouseAvailableQtyByProduct.get(productId) ?? 0;
        const availableQty = Math.max(0, Math.min(sourceAvailableQty, warehouseAvailableQty));

        return {
          goodsReceiptItemID: item.id,
          productId,
          productCode: item.product?.sku ?? "-",
          productName: item.product?.name ?? productId,
          receivedQty,
          returnedQty,
          warehouseAvailableQty,
          availableQty,
          dealCost: dealCostByProduct.get(productId) ?? 0,
        };
      })
      .filter((item) => item.productId && item.availableQty > 0);
  }, [goodsReceiptItems, returnedQtyByProduct, warehouseAvailableQtyByProduct, dealCostByProduct]);

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
    if (!selectedGoodsReceiptId && defaultGoodsReceiptId) {
      form.setValue("goods_receipt_id", defaultGoodsReceiptId);
    }
  }, [selectedGoodsReceiptId, defaultGoodsReceiptId, form]);

  useEffect(() => {
    if (!selectedGoodsReceiptId) {
      return;
    }

    form.reset({
      goods_receipt_id: selectedGoodsReceiptId,
      purchase_order_id: goodsReceipt?.purchase_order?.id ?? "",
      supplier_id: goodsReceipt?.supplier?.id ?? "",
      warehouse_id: goodsReceiptWarehouseId || warehouses[0]?.id || "",
      reason: reasons[0]?.value ?? "OTHER",
      action: actions[0]?.value ?? "SUPPLIER_CREDIT",
      notes: "",
      items: [
        {
          goods_receipt_item_id: eligibleItems[0]?.goodsReceiptItemID ?? "",
          product_id: eligibleItems[0]?.productId ?? "",
          uom_id: "",
          condition: conditions[0]?.value ?? "GOOD",
          notes: "",
          qty: 1,
          unit_cost: eligibleItems[0]?.dealCost ?? 0,
        },
      ],
    });
  }, [
    selectedGoodsReceiptId,
    goodsReceipt?.purchase_order?.id,
    goodsReceipt?.supplier?.id,
    goodsReceiptWarehouseId,
    warehouses,
    reasons,
    actions,
    conditions,
    eligibleItems,
    form,
  ]);

  const handleAddItem = () => {
    append({
      goods_receipt_item_id: "",
      product_id: "",
      uom_id: "",
      condition: conditions[0]?.value ?? "GOOD",
      notes: "",
      qty: 1,
      unit_cost: 0,
    });
  };

  const onSubmit = async (values: PurchaseReturnFormData) => {
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
            received: formatQty(selectedItem?.receivedQty ?? 0),
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
        warehouse_id: values.warehouse_id,
        purchase_order_id: values.purchase_order_id || undefined,
        supplier_id: values.supplier_id || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item) => {
          const matched = eligibleItemMap.get(item.product_id);
          return {
            ...item,
            goods_receipt_item_id: matched?.goodsReceiptItemID ?? item.goods_receipt_item_id,
            unit_cost: matched?.dealCost ?? item.unit_cost,
          };
        }),
      });
    } catch {
      form.setError("items", {
        type: "manual",
        message: "Stock in selected warehouse changed. Please review available quantity and try again.",
      });
      return;
    }

    onSuccess?.();
  };

  if (!selectedGoodsReceiptId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/50 pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Reference</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Field orientation="vertical">
            <FieldLabel>Goods Receipt</FieldLabel>
            <Controller
              name="goods_receipt_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select goods receipt" />
                  </SelectTrigger>
                  <SelectContent>
                    {goodsReceiptOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="cursor-pointer">
                        {option.code} - {option.supplier?.name ?? "-"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.goods_receipt_id && <FieldError>{errors.goods_receipt_id.message}</FieldError>}
          </Field>
        </div>
      </div>
    );
  }

  if (isLoadingGoodsReceipt) {
    return <div className="text-sm text-muted-foreground">Loading goods receipt reference...</div>;
  }

  if (isGoodsReceiptError || !goodsReceipt) {
    return <div className="text-sm text-destructive">Failed to load goods receipt reference.</div>;
  }

  if (eligibleItems.length === 0) {
    return <div className="text-sm text-muted-foreground">No eligible items left for return from this goods receipt.</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-border/50 pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Reference Information</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isGoodsReceiptLocked && (
            <Field orientation="vertical" className="md:col-span-2">
              <FieldLabel>Goods Receipt</FieldLabel>
              <Controller
                name="goods_receipt_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select goods receipt" />
                    </SelectTrigger>
                    <SelectContent>
                      {goodsReceiptOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id} className="cursor-pointer">
                          {option.code} - {option.supplier?.name ?? "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.goods_receipt_id && <FieldError>{errors.goods_receipt_id.message}</FieldError>}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>Warehouse</FieldLabel>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              {warehouses.find((w) => w.id === selectedWarehouseId)?.name || "No warehouse selected"}
            </div>
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
                            const matched = eligibleItemMap.get(value);
                            form.setValue(`items.${index}.goods_receipt_item_id`, matched?.goodsReceiptItemID ?? "");
                            form.setValue(`items.${index}.unit_cost`, matched?.dealCost ?? 0);
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
                                  {item.productCode} - {item.productName} | Rec: {formatQty(item.receivedQty)} | Ret: {formatQty(item.returnedQty)} | Wh Avl: {formatQty(item.warehouseAvailableQty)} | Ret Avl: {formatQty(item.availableQty)} | Deal: {formatCurrency(item.dealCost)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {selectedItem && (
                      <p className="text-xs text-muted-foreground">
                        Received: {formatQty(selectedItem.receivedQty)} | Already returned: {formatQty(selectedItem.returnedQty)} | Warehouse available: {formatQty(selectedItem.warehouseAvailableQty)} | Return available: {formatQty(selectedItem.availableQty)}
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
                    {selectedItem && <p className="text-xs text-muted-foreground">Return available: {formatQty(selectedItem.availableQty)}</p>}
                    {errors.items?.[index]?.qty && <FieldError>{errors.items[index]?.qty?.message}</FieldError>}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>Unit Cost (Deal Price)</FieldLabel>
                    <Controller
                      name={`items.${index}.unit_cost`}
                      control={control}
                      render={({ field: itemField }) => (
                        <NumericInput value={itemField.value} onChange={(value) => itemField.onChange(value ?? 0)} min={0} disabled />
                      )}
                    />
                    {errors.items?.[index]?.unit_cost && <FieldError>{errors.items[index]?.unit_cost?.message}</FieldError>}
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
