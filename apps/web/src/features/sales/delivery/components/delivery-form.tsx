"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, CalendarIcon, FileText, ShoppingCart } from "lucide-react";
import {
  getDeliveryOrderSchema,
  getUpdateDeliveryOrderSchema,
  type CreateDeliveryOrderFormData,
  type UpdateDeliveryOrderFormData,
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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatCurrency, sortOptions } from "@/lib/utils";
import { useCreateDeliveryOrder, useUpdateDeliveryOrder, useDeliveryOrder } from "../hooks/use-deliveries";
import { useOrders } from "@/features/sales/order/hooks/use-orders";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useCourierAgencies } from "@/features/master-data/payment-and-couriers/courier-agency/hooks/use-courier-agency";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import type { DeliveryOrder } from "../types";
import { toast } from "sonner";

interface DeliveryFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly delivery?: DeliveryOrder | null;
}

export function DeliveryForm({ open, onClose, delivery }: DeliveryFormProps) {
  const isEdit = !!delivery;
  const t = useTranslations("delivery");
  const createDelivery = useCreateDeliveryOrder();
  const updateDelivery = useUpdateDeliveryOrder();
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full delivery data when editing
  const { data: fullDeliveryData, isLoading: isLoadingDelivery } = useDeliveryOrder(
    delivery?.id ?? "",
    { 
      enabled: open && isEdit && !!delivery?.id,
    }
  );

  // Fetch lookup data
  const { data: salesOrdersData } = useOrders({ per_page: 100, status: "confirmed" });
  const { data: employeesData } = useEmployees({ per_page: 100 });
  const { data: courierAgenciesData } = useCourierAgencies({ per_page: 100 });
  const { data: warehousesData } = useWarehouses({ per_page: 100 });

  const salesOrders = useMemo(() => {
    const data = salesOrdersData?.data ?? [];
    return sortOptions(data, (item) => item.code);
  }, [salesOrdersData?.data]);

  const employees = useMemo(() => {
    const data = employeesData?.data ?? [];
    return sortOptions(data, (item) => `${item.employee_code} - ${item.name}`);
  }, [employeesData?.data]);
  
  const courierAgencies = useMemo(() => {
    const data = courierAgenciesData?.data ?? [];
    return sortOptions(data, (item) => item.name ?? "");
  }, [courierAgenciesData?.data]);

  const warehouses = useMemo(() => {
    const data = warehousesData?.data ?? [];
    return sortOptions(data, (item) => item.code ? `${item.code} - ${item.name}` : item.name);
  }, [warehousesData?.data]);

  const schema = isEdit ? getUpdateDeliveryOrderSchema(t) : getDeliveryOrderSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    formState: { errors },
  } = useForm<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>({
    resolver: formResolver,
    defaultValues: delivery
      ? {
          
          delivery_date: delivery.delivery_date,
          warehouse_id: delivery.warehouse_id ?? "",
          sales_order_id: delivery.sales_order_id,
          delivered_by_id: delivery.delivered_by_id ?? "",
          courier_agency_id: delivery.courier_agency_id ?? "",
          tracking_number: delivery.tracking_number ?? "",
          receiver_name: delivery.receiver_name ?? "",
          receiver_phone: delivery.receiver_phone ?? "",
          delivery_address: delivery.delivery_address ?? "",
          notes: delivery.notes ?? "",
          items:
            delivery.items?.map((item) => ({
              product_id: item.product_id,
              sales_order_item_id: item.sales_order_item_id ?? "",
              inventory_batch_id: item.inventory_batch_id ?? "",
              quantity: item.quantity,
              installation_status: item.installation_status ?? "",
              function_test_status: item.function_test_status ?? "",
            })) ?? [],
        }
      : {
          delivery_date: new Date().toISOString().split("T")[0],
          warehouse_id: "",
          sales_order_id: "",
          items: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedSalesOrderId = useWatch({ control, name: "sales_order_id" });

  // Derive selectedSalesOrderId from watched value
  const selectedSalesOrderId = useMemo(() => {
    return watchedSalesOrderId ?? delivery?.sales_order_id ?? "";
  }, [watchedSalesOrderId, delivery?.sales_order_id]);

  // Get selected sales order items
  const selectedSalesOrder = useMemo(() => {
    return salesOrders.find(so => so.id === selectedSalesOrderId);
  }, [salesOrders, selectedSalesOrderId]);

  // Reset form when delivery data changes
  useEffect(() => {
    if (!open) return;

    if (isEdit && fullDeliveryData?.data) {
      const deliveryData = fullDeliveryData.data;
      setTimeout(() => {
        reset({
          delivery_date: deliveryData.delivery_date,
          warehouse_id: deliveryData.warehouse_id ?? "",
          sales_order_id: deliveryData.sales_order_id,
          delivered_by_id: deliveryData.delivered_by_id ?? "",
          courier_agency_id: deliveryData.courier_agency_id ?? "",
          tracking_number: deliveryData.tracking_number ?? "",
          receiver_name: deliveryData.receiver_name ?? "",
          receiver_phone: deliveryData.receiver_phone ?? "",
          delivery_address: deliveryData.delivery_address ?? "",
          notes: deliveryData.notes ?? "",
          items:
            deliveryData.items?.map((item) => ({
              product_id: item.product_id,
              sales_order_item_id: item.sales_order_item_id ?? "",
              inventory_batch_id: item.inventory_batch_id ?? "",
              quantity: item.quantity,
              installation_status: item.installation_status ?? "",
              function_test_status: item.function_test_status ?? "",
            })) ?? [],
        });
      }, 10);
      return;
    }

    // For create mode: reset to defaults
    reset({
      delivery_date: new Date().toISOString().split("T")[0],
      warehouse_id: "",
      sales_order_id: "",
      items: [],
    });
  }, [open, isEdit, fullDeliveryData, reset]);

  // Auto-populate items when sales order is selected
  useEffect(() => {
    if (!watchedSalesOrderId || isEdit) return;
    
    const salesOrder = salesOrders.find(so => so.id === watchedSalesOrderId);
    if (salesOrder?.items && salesOrder.items.length > 0) {
      const items = salesOrder.items.map(item => ({
        product_id: item.product_id,
        sales_order_item_id: item.id,
        inventory_batch_id: "",
        quantity: item.quantity - (item.delivered_quantity ?? 0), // Remaining quantity
        installation_status: "",
        function_test_status: "",
      }));
      setValue("items", items);
    }
  }, [watchedSalesOrderId, salesOrders, isEdit, setValue]);

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "delivery_date",
        "warehouse_id",
        "sales_order_id",
        "delivered_by_id",
        "courier_agency_id",
        "tracking_number",
        "receiver_name",
        "receiver_phone",
        "delivery_address",
        "notes",
      ];

      const isValid = await trigger(basicFields as (keyof CreateDeliveryOrderFormData | keyof UpdateDeliveryOrderFormData)[]);

      if (isValid) {
        setActiveTab("items");
      } else {
        // Diagnostic field mapping for clearer error messages
        const fieldMapping: Record<string, string> = {
          delivery_date: t("deliveryDate"),
          warehouse_id: t("warehouse"),
          sales_order_id: t("salesOrder"),
          delivered_by_id: t("deliveredBy"),
          courier_agency_id: t("courierAgency"),
          tracking_number: t("trackingNumber"),
          receiver_name: t("receiverName"),
          receiver_phone: t("receiverPhone"),
          delivery_address: t("deliveryAddress"),
          notes: t("notes"),
        };

        // Find which fields are actually failing
        const currentErrors = errors;
        const failingFields = basicFields
          .filter(field => currentErrors[field as keyof typeof currentErrors])
          .map(field => fieldMapping[field] || field);
        
        const errorMessage = failingFields.length > 0 
          ? `${t("validation.required")}: ${failingFields.join(", ")}`
          : t("validation.required") || "Please fill all required fields";

        toast.error(errorMessage);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFormSubmit = async (
    data: CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData
  ) => {
    // Check if we're on items tab but have errors in basic fields
    if (activeTab === "items") {
      const basicFields = [
        "delivery_date",
        "warehouse_id",
        "sales_order_id",
        "delivered_by_id",
        "courier_agency_id",
        "tracking_number",
        "receiver_name",
        "receiver_phone",
        "delivery_address",
        "notes",
      ];

      // Trigger validation for basic fields first
      const isBasicValid = await trigger(basicFields as (keyof CreateDeliveryOrderFormData | keyof UpdateDeliveryOrderFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("validation.required") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && delivery) {
        await updateDelivery.mutateAsync({
          id: delivery.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createDelivery.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateDeliveryOrderFormData);
        toast.success(t("created"));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save delivery order:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({
      product_id: "",
      sales_order_item_id: "",
      inventory_batch_id: "",
      quantity: 1,
      installation_status: "",
      function_test_status: "",
    });
  };

  const isLoading = createDelivery.isPending || updateDelivery.isPending;
  const isFormLoading = isEdit && isLoadingDelivery && !fullDeliveryData;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  const onInvalid = (errors: FieldErrors<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>) => {
    const basicFields = [
      "delivery_date",
      "warehouse_id",
      "sales_order_id",
      "delivered_by_id",
      "courier_agency_id",
      "tracking_number",
      "receiver_name",
      "receiver_phone",
      "delivery_address",
      "notes",
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateDeliveryOrderFormData | keyof UpdateDeliveryOrderFormData]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
          toast.error(t("validation.required") || "Please fill all required fields in General tab");
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
                {t("tabs.general") || "General"}
              </TabsTrigger>
              <TabsTrigger value="items">
                {t("items") || "Items"}
              </TabsTrigger>
            </TabsList>

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

                    <Field orientation="vertical">
                      <FieldLabel>{t("warehouse")} *</FieldLabel>
                      <Controller
                        name="warehouse_id"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isEdit}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("warehouse") || "Select Warehouse"} />
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
                      {errors.warehouse_id && (
                        <FieldError>{errors.warehouse_id.message}</FieldError>
                      )}
                    </Field>

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
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("deliveredBy")} />
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
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("courierAgency")} />
                            </SelectTrigger>
                            <SelectContent>
                              {courierAgencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                  {agency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={!!selectedSalesOrder && !isEdit}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("item.selectProduct")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sortOptions(selectedSalesOrder?.items ?? [], (a) => `${a.product?.code} - ${a.product?.name}`).map((soItem) => (
                                        <SelectItem key={soItem.id} value={soItem.product_id}>
                                          {soItem.product?.code} - {soItem.product?.name} (Qty: {soItem.quantity - (soItem.delivered_quantity ?? 0)})
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
                              <FieldLabel>{t("item.batch")}</FieldLabel>
                              <Controller
                                name={`items.${index}.inventory_batch_id`}
                                control={control}
                                render={({ field }) => (
                                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("item.selectBatch")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* <SelectItem value="">{t("item.noBatchSelected")}</SelectItem> */}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Batch selection will be available in Sprint 9
                              </p>
                            </Field>
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
