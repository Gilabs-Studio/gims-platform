"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, Package, Calendar as CalendarIcon, Warehouse } from "lucide-react";
import {
  createGoodsReceiptSchema,
  updateGoodsReceiptSchema,
  type CreateGoodsReceiptFormData,
  type UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGoodsReceiptAddData } from "../hooks/use-goods-receipts";
import type { GoodsReceipt } from "../types";
import { useMemo, useState } from "react";

interface GoodsReceiptFormProps {
  readonly goodsReceipt?: GoodsReceipt;
  readonly onSubmit: (
    data: CreateGoodsReceiptFormData | UpdateGoodsReceiptFormData
  ) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function GoodsReceiptForm({
  goodsReceipt,
  onSubmit,
  onCancel,
  isLoading,
}: GoodsReceiptFormProps) {
  const isEdit = !!goodsReceipt;
  const { data: addData, isLoading: isLoadingAddData } = useGoodsReceiptAddData();
  const t = useTranslations("goodsReceipts.form");

  const warehouses = useMemo(() => addData?.data?.warehouses ?? [], [addData?.data?.warehouses]);
  const purchaseOrders = useMemo(
    () => addData?.data?.purchase_orders ?? [],
    [addData?.data?.purchase_orders]
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateGoodsReceiptFormData | UpdateGoodsReceiptFormData>({
    resolver: zodResolver(isEdit ? updateGoodsReceiptSchema : createGoodsReceiptSchema),
    defaultValues: goodsReceipt
      ? {
          receipt_date: goodsReceipt.receipt_date,
          warehouse_id: goodsReceipt.warehouse.id,
          notes: goodsReceipt.notes ?? "",
          items:
            goodsReceipt.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              lot_number: item.lot_number ?? "",
              expired_date: item.expired_date ?? "",
            })) ?? [],
        }
      : {
          purchase_order_id: 0,
          receipt_date: new Date().toISOString().split("T")[0],
          warehouse_id: 0,
          items: [{ product_id: 0, quantity: 1 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch form values
  const watchedPurchaseOrderId = useWatch({ control, name: "purchase_order_id" });
  const watchedWarehouseId = useWatch({ control, name: "warehouse_id" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedReceiptDate = useWatch({ control, name: "receipt_date" });
  
  // Get selected purchase order items
  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((po) => po.id === watchedPurchaseOrderId),
    [purchaseOrders, watchedPurchaseOrderId]
  );

  // Parse receipt_date string to Date
  const receiptDateValue = useMemo(() => {
    if (!watchedReceiptDate) return undefined;
    try {
      // Try parsing as ISO datetime string or date string (YYYY-MM-DD)
      const date = new Date(watchedReceiptDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
      // Try parsing as date string (YYYY-MM-DD)
      const dateOnly = new Date(watchedReceiptDate + "T00:00:00");
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }, [watchedReceiptDate]);

  const handleFormSubmit = async (
    data: CreateGoodsReceiptFormData | UpdateGoodsReceiptFormData
  ) => {
    // Filter out items with product_id = 0 (empty items)
    const filteredItems = (data.items ?? []).filter((item) => item.product_id > 0);
    // Remove purchase_order_id from update data
    if (isEdit) {
      const { purchase_order_id, ...updateData } = data as CreateGoodsReceiptFormData;
      await onSubmit({ ...updateData, items: filteredItems } as UpdateGoodsReceiptFormData);
    } else {
      await onSubmit({ ...data, items: filteredItems } as CreateGoodsReceiptFormData);
    }
  };

  const handlePurchaseOrderChange = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === parseInt(poId));
    setValue("purchase_order_id", parseInt(poId), { shouldValidate: true });
    if (po && po.items && po.items.length > 0) {
      // Pre-populate items from purchase order
      const poItems = po.items
        .filter((item) => {
          // Only include items that haven't been fully received
          const receivedQty = item.received_quantity ?? 0;
          return item.quantity > receivedQty;
        })
        .map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity - (item.received_quantity ?? 0),
          lot_number: "",
          expired_date: "",
        }));
      if (poItems.length > 0) {
        setValue("items", poItems, { shouldValidate: true });
      }
    }
  };

  const handleAddItem = () => {
    append({ product_id: 0, quantity: 1 });
  };

  if (isLoadingAddData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("basicInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEdit && (
            <Field orientation="vertical">
              <FieldLabel>{t("purchaseOrderLabel")} *</FieldLabel>
              <Select
                value={watchedPurchaseOrderId?.toString() || ""}
                onValueChange={handlePurchaseOrderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("purchaseOrderPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id.toString()}>
                      {po.code} - {po.supplier?.name ?? "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {"purchase_order_id" in errors && errors.purchase_order_id && (
                <FieldError>{errors.purchase_order_id.message}</FieldError>
              )}
            </Field>
          )}

          <Field orientation="vertical">
            <FieldLabel>{t("warehouseLabel")} *</FieldLabel>
            <Select
              value={watchedWarehouseId?.toString() || ""}
              onValueChange={(value) =>
                setValue("warehouse_id", parseInt(value), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("warehousePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouse_id && <FieldError>{errors.warehouse_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("receiptDateLabel")} *</FieldLabel>
            <ReceiptDatePicker
              value={watchedReceiptDate}
              onChange={(dateString) => {
                setValue("receipt_date", dateString || "", { shouldValidate: true });
              }}
              disabled={isLoading}
              placeholder={t("receiptDatePlaceholder")}
            />
            {errors.receipt_date && <FieldError>{errors.receipt_date.message}</FieldError>}
          </Field>

          <Field orientation="vertical" className="md:col-span-2">
            <FieldLabel>{t("notesLabel")}</FieldLabel>
            <Textarea {...register("notes")} placeholder={t("notesPlaceholder")} rows={3} />
            {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">{t("itemsInfo.title")}</h3>
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
            const availableProducts = selectedPurchaseOrder?.items?.map((item) => item.product) ?? [];
            const selectedProductId = watchedItems?.[index]?.product_id;

            return (
              <div
                key={field.id}
                className="border rounded-lg p-4 space-y-4 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Item {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="cursor-pointer text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("removeItem")}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field orientation="vertical">
                    <FieldLabel>{t("productLabel")} *</FieldLabel>
                    <Select
                      value={selectedProductId?.toString() || ""}
                      onValueChange={(value) => {
                        setValue(`items.${index}.product_id`, parseInt(value), {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("productPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.items?.[index]?.product_id && (
                      <FieldError>{errors.items[index]?.product_id?.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("quantityLabel")} *</FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      placeholder={t("quantityPlaceholder")}
                    />
                    {errors.items?.[index]?.quantity && (
                      <FieldError>{errors.items[index]?.quantity?.message}</FieldError>
                    )}
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("lotNumberLabel")}</FieldLabel>
                    <Input
                      {...register(`items.${index}.lot_number`)}
                      placeholder={t("lotNumberPlaceholder")}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel>{t("expiredDateLabel")}</FieldLabel>
                    <ExpiredDatePicker
                      value={watchedItems?.[index]?.expired_date}
                      onChange={(dateString) => {
                        setValue(`items.${index}.expired_date`, dateString || "", {
                          shouldValidate: true,
                        });
                      }}
                      disabled={isLoading}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
          {errors.items && typeof errors.items === "object" && "message" in errors.items && (
            <FieldError>{errors.items.message}</FieldError>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("submitting")}
            </>
          ) : isEdit ? (
            t("submitUpdate")
          ) : (
            t("submitCreate")
          )}
        </Button>
      </div>
    </form>
  );
}

// Helper function to format date as YYYY-MM-DD
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to format date for display
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Date picker component props
interface DatePickerProps {
  readonly value?: string;
  readonly onChange: (dateString: string | null) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}

// Receipt date picker component
function ReceiptDatePicker({ value, onChange, disabled, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? (() => {
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  })() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateForDisplay(date) : <span className="text-muted-foreground">{placeholder || "Select date"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate: Date | undefined) => {
            if (selectedDate) {
              // Format as YYYY-MM-DD
              const dateString = formatDateToString(selectedDate);
              onChange(dateString);
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Expired date picker component
function ExpiredDatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? (() => {
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  })() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDateForDisplay(date) : <span className="text-muted-foreground">Select date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate: Date | undefined) => {
            if (selectedDate) {
              // Format as YYYY-MM-DD
              const dateString = formatDateToString(selectedDate);
              onChange(dateString);
            } else {
              onChange(null);
            }
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

