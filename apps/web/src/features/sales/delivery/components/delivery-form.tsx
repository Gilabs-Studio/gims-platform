"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useWatch, useFormContext } from "react-hook-form";
import type { Control } from "react-hook-form";
import { Loader2, Plus, Trash2, CalendarIcon, FileText, ShoppingCart, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

import {
  getDeliveryOrderSchema,
  getUpdateDeliveryOrderSchema,
  type CreateDeliveryOrderFormData,
  type UpdateDeliveryOrderFormData,
  type DeliveryOrderItemFormData,
} from "../schemas/delivery.schema";

import { ButtonLoading } from "@/components/loading";
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
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { useProductBatches } from "@/features/stock/inventory/hooks/use-product-batches";
import type { DeliveryOrder } from "../types";
import { useDeliveryForm } from "../hooks/use-delivery-form";
import type { InventoryBatchItem } from "@/features/stock/inventory/types";
import { EmployeeForm } from "@/features/master-data/employee/components/employee-form";
import { CourierAgencyDialog } from "@/features/master-data/payment-and-couriers/courier-agency/components/courier-agency-dialog";

interface DeliveryFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly delivery?: DeliveryOrder | null;
}

export function DeliveryForm({ open, onClose, delivery }: DeliveryFormProps) {
  const {
    form,
    t,
    isEdit,
    activeTab,
    setActiveTab,
    isValidating,
    isLoading,
    isFormLoading,
    fields,
    remove,
    salesOrders,
    employees,
    courierAgencies,
    warehouses,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleDialogChange,
    onInvalid,
    watchedSalesOrderId,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    handleDeliveredByCreated,
    handleCourierAgencyCreated,
  } = useDeliveryForm({ delivery, open, onClose });

  const { register, handleSubmit, control, formState: { errors }, getValues, setValue } = form;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit") : t("create")}
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
                {t("tabs.general") || "General"}
              </TabsTrigger>
              <TabsTrigger value="items">
                {t("items") || "Items"}
              </TabsTrigger>
            </TabsList>

            <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4 mt-0">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("common.delivery")}</h3>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <Field orientation="vertical">
                      <FieldLabel>{t("deliveryDate")} *</FieldLabel>
                      <Controller
                        name="delivery_date"
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
                      {errors.delivery_date && (
                        <FieldError>{errors.delivery_date.message}</FieldError>
                      )}
                    </Field>

                    {/* Warehouse selection moved to items */}

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("salesOrder")} *</FieldLabel>
                      <Controller
                        name="sales_order_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            disabled={isEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("salesOrder")} />
                            </SelectTrigger>
                            <SelectContent>
                              {salesOrders.map((order) => (
                                <SelectItem key={order.id} value={order.id}>
                                  {order.code} - {formatCurrency(order.total_amount ?? 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.sales_order_id && (
                        <FieldError>{errors.sales_order_id.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("deliveredBy")}</FieldLabel>
                      <Controller
                        name="delivered_by_id"
                        control={control}
                        render={({ field }) => (
                          <CreatableCombobox
                            options={employees.map(emp => ({ value: emp.id, label: `${emp.employee_code} - ${emp.name}` }))}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder={t("deliveredBy")}
                            createPermission="employee.create"
                            onCreateClick={() => openQuickCreate("employee")}
                          />
                        )}
                      />
                      {errors.delivered_by_id && (
                        <FieldError>{errors.delivered_by_id.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("courierAgency")}</FieldLabel>
                      <Controller
                        name="courier_agency_id"
                        control={control}
                        render={({ field }) => (
                          <CreatableCombobox
                            options={courierAgencies.map((a: { id: string; name: string }) => ({ value: a.id, label: a.name }))}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder={t("courierAgency")}
                            createPermission="courier_agency.create"
                            onCreateClick={() => openQuickCreate("courierAgency")}
                          />
                        )}
                      />
                      {errors.courier_agency_id && (
                        <FieldError>{errors.courier_agency_id.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("trackingNumber")}</FieldLabel>
                      <Input {...register("tracking_number")} placeholder={t("trackingNumber")} />
                      {errors.tracking_number && (
                        <FieldError>{errors.tracking_number.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("receiverName")}</FieldLabel>
                      <Input {...register("receiver_name")} placeholder={t("receiverName")} />
                      {errors.receiver_name && (
                        <FieldError>{errors.receiver_name.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical">
                      <FieldLabel>{t("receiverPhone")}</FieldLabel>
                      <Input {...register("receiver_phone")} placeholder={t("receiverPhone")} />
                      {errors.receiver_phone && (
                        <FieldError>{errors.receiver_phone.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("deliveryAddress")}</FieldLabel>
                      <Textarea {...register("delivery_address")} rows={3} placeholder={t("deliveryAddress")} />
                      {errors.delivery_address && (
                        <FieldError>{errors.delivery_address.message}</FieldError>
                      )}
                    </Field>

                    <Field orientation="vertical" className="col-span-2">
                      <FieldLabel>{t("notes")}</FieldLabel>
                      <Textarea {...register("notes")} rows={3} />
                      {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
                    </Field>
                  </div>
                </div>

                {/* Basic Tab Actions */}
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
                {/* Items Section - Single Column Layout */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">{t("items")} ({fields.length})</h3>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {fields.map((field, index) => {
                      // Get product name from helper field or lookup
                      // We can just use a lookup since we have access to SO data if needed, 
                      // but simpler to assume it's pre-populated since we don't have a products list here
                      const items = getValues("items") as Array<DeliveryOrderItemFormData & { product_name?: string }>;
                      const currentItem = items && items[index];
                      const productName = currentItem?.product_name || `Product ID: ${currentItem?.product_id}`;

                      return (
                        <div
                          key={field.id}
                          className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{index + 1}</span>
                            {/* Remove delete button if derived from Sales Order? 
                                Maybe allow deleting if partial delivery of LINES. 
                                Let's keep it but maybe warn? For now keep it consistent with request "automatically from SO".
                            */}
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
                              <FieldLabel>{t("item.product")}</FieldLabel>
                              <div className="p-2 bg-muted rounded-md text-sm font-medium">
                                {productName}
                              </div>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel>{t("warehouse")} *</FieldLabel>
                                <Controller
                                  name={`items.${index}.warehouse_id`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value}
                                      onValueChange={(val) => {
                                        field.onChange(val);
                                        // Reset batch when warehouse changes
                                        setValue(`items.${index}.inventory_batch_id`, "");
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("warehouse")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {warehouses.filter(w => w.is_active).map((w) => (
                                          <SelectItem key={w.id} value={w.id}>
                                            {w.code ? `${w.code} - ${w.name}` : w.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
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

                            <BatchSelectionField 
                              control={control}
                              index={index}
                              open={open}
                              error={errors.items?.[index]?.inventory_batch_id?.message}
                              t={t}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {errors.items && typeof errors.items === "object" && "message" in errors.items && (
                      <FieldError>{errors.items.message}</FieldError>
                    )}

                    {!watchedSalesOrderId && (
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
                     )}
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
            </FormProvider>
          </Tabs>
        )}
      </DialogContent>

      <EmployeeForm
        open={quickCreate.type === "employee"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        onCreated={handleDeliveredByCreated}
      />
      <CourierAgencyDialog
        open={quickCreate.type === "courierAgency"}
        onOpenChange={(o) => { if (!o) closeQuickCreate(); }}
        onCreated={handleCourierAgencyCreated}
      />
    </Dialog>
  );
}

// Separate component to handle batch queries per row to avoid granular re-renders of the main form
function BatchSelectionField({ control, index, error, t, open }: {
  control: Control<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>;
  index: number;
  error?: string | null;
  t: (key: string) => string;
  open: boolean;
}) {
  const warehouseId = useWatch({ control, name: `items.${index}.warehouse_id` });
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` }) as number | undefined;
  const { setValue } = useFormContext();

  const { data: batchesData, isLoading } = useProductBatches(warehouseId ?? "", (productId as string) ?? "", {
    enabled: open && !!warehouseId && !!productId
  });

  const batches = useMemo(() => {
    return (batchesData?.data?.data ?? []) as InventoryBatchItem[];
  }, [batchesData]);

  // Aggregate available stock across all batches in the selected warehouse
  const totalAvailable = batches.reduce((sum: number, b: InventoryBatchItem) => sum + (b.available ?? 0), 0);
  const hasStock = totalAvailable > 0;
  const isInsufficient = hasStock && (quantity ?? 0) > 0 && totalAvailable < (quantity ?? 0);
  const fmt = (n: number) => (n % 1 === 0 ? n.toString() : n.toFixed(2));

  return (
    <Field orientation="vertical">
      <FieldLabel>{t("item.batch")}</FieldLabel>
      <Controller
        name={`items.${index}.inventory_batch_id`}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value || undefined}
            onValueChange={(val) => {
              field.onChange(val);
              // Persist max_quantity from the selected batch for validation
              const batch = batches.find((b: InventoryBatchItem) => b.id === val);
              if (batch) {
                setValue(`items.${index}.max_quantity`, batch.available, { shouldValidate: true });
              }
            }}
            disabled={!warehouseId || !productId || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? t("common.loading") : t("item.selectBatch")} />
            </SelectTrigger>
            <SelectContent>
              {batches.filter((b: InventoryBatchItem) => b.available > 0).map((batch: InventoryBatchItem) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.batch_number} (Qty: {batch.available}, Exp: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : "-"})
                </SelectItem>
              ))}
              {batches.length === 0 && !isLoading && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  {t("item.noBatchesAvailable")}
                </div>
              )}
            </SelectContent>
          </Select>
        )}
      />

      {/* Stock status indicator for the selected warehouse */}
      {warehouseId && productId && !isLoading && (
        <>
          {!hasStock ? (
            <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Out of Stock</span>
              <span className="opacity-75">— no available batches in this warehouse</span>
            </div>
          ) : isInsufficient ? (
            <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Insufficient Stock</span>
              <span className="opacity-75">
                — available: {fmt(totalAvailable)} (need {fmt(quantity ?? 0)})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700 text-xs dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">In Stock</span>
              <span className="opacity-75">— available: {fmt(totalAvailable)} in this warehouse</span>
            </div>
          )}
        </>
      )}

      {error && <FieldError>{error}</FieldError>}
      {!warehouseId && (
        <p className="text-xs text-muted-foreground mt-1">Select warehouse first</p>
      )}
    </Field>
  );
}
