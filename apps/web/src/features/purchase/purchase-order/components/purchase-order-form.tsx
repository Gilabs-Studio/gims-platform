"use client";

import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, ShoppingCart, DollarSign, FileText } from "lucide-react";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  type CreatePurchaseOrderFormData,
  type UpdatePurchaseOrderFormData,
} from "../schemas/purchase-order.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { usePurchaseOrderAddData } from "../hooks/use-purchase-orders";
import { sortOptions } from "@/lib/utils";
import type { PurchaseOrder } from "../types";
import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

interface PurchaseOrderFormProps {
  readonly order?: PurchaseOrder;
  readonly onSubmit: (
    data: CreatePurchaseOrderFormData | UpdatePurchaseOrderFormData
  ) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function PurchaseOrderForm({
  order,
  onSubmit,
  onCancel,
  isLoading,
}: PurchaseOrderFormProps) {
  const isEdit = !!order;
  const { data: addData, isLoading: isLoadingAddData } = usePurchaseOrderAddData();
  const { user } = useAuthStore();
  const t = useTranslations("purchaseOrders.form");

  const suppliers = useMemo(
    () => sortOptions(addData?.data?.suppliers ?? [], (s) => s.name),
    [addData?.data?.suppliers]
  );
  const paymentTerms = useMemo(
    () => sortOptions(addData?.data?.payment_terms ?? [], (t) => t.name),
    [addData?.data?.payment_terms]
  );
  const businessUnits = useMemo(
    () => sortOptions(addData?.data?.business_units ?? [], (bu) => bu.name),
    [addData?.data?.business_units]
  );
  const products = useMemo(
    () => sortOptions(addData?.data?.products ?? [], (p) => `${p.code} - ${p.name}`),
    [addData?.data?.products]
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreatePurchaseOrderFormData | UpdatePurchaseOrderFormData>({
    resolver: zodResolver(isEdit ? updatePurchaseOrderSchema : createPurchaseOrderSchema),
    defaultValues: order
      ? {
          supplier_id: order.supplier.id,
          payment_terms_id: order.payment_terms_id,
          business_unit_id: order.business_unit_id,
          order_date: order.order_date,
          is_indent: order.is_indent ?? false,
          tax_rate: order.tax_rate ?? 0,
          delivery_cost: order.delivery_cost ?? 0,
          other_cost: order.other_cost ?? 0,
          notes: order.notes ?? "",
          address: order.address ?? "",
          due_date: order.due_date ?? "",
          items:
            order.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
            })) ?? [],
        }
      : {
          tax_rate: 0,
          delivery_cost: 0,
          other_cost: 0,
          is_indent: false,
          items: [{ product_id: 0, quantity: 1, price: 0, discount: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch form values using useWatch (React Compiler friendly)
  const supplierId = useWatch({ control, name: "supplier_id" });
  const paymentTermsId = useWatch({ control, name: "payment_terms_id" });
  const businessUnitId = useWatch({ control, name: "business_unit_id" });
  const watchedItems = useWatch({ control, name: "items" });

  const handleFormSubmit = async (
    data: CreatePurchaseOrderFormData | UpdatePurchaseOrderFormData
  ) => {
    // Filter out items with product_id = 0 (empty items)
    const filteredItems = (data.items ?? []).filter((item) => item.product_id > 0);
    await onSubmit({ ...data, items: filteredItems });
  };

  const handleAddItem = () => {
    append({ product_id: 0, quantity: 1, price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) {
      setValue(`items.${index}.product_id`, parseInt(productId), { shouldValidate: true });
      setValue(`items.${index}.price`, product.cost_price, { shouldValidate: true });
    }
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
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("basicInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("supplierLabel")} *</FieldLabel>
            <Select
              value={supplierId?.toString() || ""}
              onValueChange={(value) =>
                setValue("supplier_id", parseInt(value), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("supplierPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplier_id && <FieldError>{errors.supplier_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("paymentTermsLabel")} *</FieldLabel>
            <Select
              value={paymentTermsId?.toString() || ""}
              onValueChange={(value) =>
                setValue("payment_terms_id", parseInt(value), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("paymentTermsPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {paymentTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id.toString()}>
                    {term.name} {term.description ? `(${term.description})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_terms_id && <FieldError>{errors.payment_terms_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("businessUnitLabel")} *</FieldLabel>
            <Select
              value={businessUnitId?.toString() || ""}
              onValueChange={(value) =>
                setValue("business_unit_id", parseInt(value), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("businessUnitPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id.toString()}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.business_unit_id && <FieldError>{errors.business_unit_id.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("orderDateLabel")} *</FieldLabel>
            <Input
              type="date"
              {...register("order_date")}
              placeholder={t("orderDatePlaceholder")}
            />
            {errors.order_date && <FieldError>{errors.order_date.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("dueDateLabel")}</FieldLabel>
            <Input
              type="date"
              {...register("due_date")}
              placeholder={t("dueDatePlaceholder")}
            />
            {errors.due_date && <FieldError>{errors.due_date.message}</FieldError>}
          </Field>
        </div>
      </div>

      {/* Financial Information Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("financialInfo.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field orientation="vertical">
            <FieldLabel>{t("taxRateLabel")}</FieldLabel>
            <Controller
              name="tax_rate"
              control={control}
              render={({ field }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  min={0}
                  max={100}
                  placeholder={t("taxRatePlaceholder")}
                />
              )}
            />
            {errors.tax_rate && <FieldError>{errors.tax_rate.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("deliveryCostLabel")}</FieldLabel>
            <Controller
              name="delivery_cost"
              control={control}
              render={({ field }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  min={0}
                  placeholder={t("deliveryCostPlaceholder")}
                />
              )}
            />
            {errors.delivery_cost && <FieldError>{errors.delivery_cost.message}</FieldError>}
          </Field>

          <Field orientation="vertical">
            <FieldLabel>{t("otherCostLabel")}</FieldLabel>
            <Controller
              name="other_cost"
              control={control}
              render={({ field }) => (
                <NumericInput
                  value={field.value}
                  onChange={field.onChange}
                  min={0}
                  placeholder={t("otherCostPlaceholder")}
                />
              )}
            />
            {errors.other_cost && <FieldError>{errors.other_cost.message}</FieldError>}
          </Field>
        </div>

        <Field orientation="vertical">
          <FieldLabel>{t("addressLabel")}</FieldLabel>
          <Textarea {...register("address")} placeholder={t("addressPlaceholder")} rows={3} />
          {errors.address && <FieldError>{errors.address.message}</FieldError>}
        </Field>

        <Field orientation="vertical">
          <FieldLabel>{t("notesLabel")}</FieldLabel>
          <Textarea {...register("notes")} placeholder={t("notesPlaceholder")} rows={3} />
          {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
        </Field>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
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
          {fields.map((field, index) => (
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
                    value={watchedItems?.[index]?.product_id?.toString() || ""}
                    onValueChange={(value) => handleProductChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("productPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.code} - {product.name}
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
                  <Controller
                      name={`items.${index}.quantity`}
                      control={control}
                      render={({ field }) => (
                        <NumericInput
                          value={field.value}
                          onChange={field.onChange}
                          min={1}
                          placeholder={t("quantityPlaceholder")}
                        />
                      )}
                    />
                  {errors.items?.[index]?.quantity && (
                    <FieldError>{errors.items[index]?.quantity?.message}</FieldError>
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("priceLabel")} *</FieldLabel>
                  <Controller
                    name={`items.${index}.price`}
                    control={control}
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        placeholder={t("pricePlaceholder")}
                      />
                    )}
                  />
                  {errors.items?.[index]?.price && (
                    <FieldError>{errors.items[index]?.price?.message}</FieldError>
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel>{t("discountLabel")}</FieldLabel>
                  <Controller
                    name={`items.${index}.discount`}
                    control={control}
                    render={({ field }) => (
                      <NumericInput
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        max={100}
                        placeholder={t("discountPlaceholder")}
                      />
                    )}
                  />
                  {errors.items?.[index]?.discount && (
                    <FieldError>{errors.items[index]?.discount?.message}</FieldError>
                  )}
                </Field>
              </div>
            </div>
          ))}
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
