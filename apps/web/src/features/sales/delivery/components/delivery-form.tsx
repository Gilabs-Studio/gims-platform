"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller, useFormContext, FormProvider } from "react-hook-form";
import type { Resolver, FieldErrors, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, CalendarIcon, FileText, ShoppingCart, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import {
  getDeliveryOrderSchema,
  getUpdateDeliveryOrderSchema,
  type CreateDeliveryOrderFormData,
  type UpdateDeliveryOrderFormData,
  type DeliveryOrderItemFormData,
} from "../schemas/delivery.schema";
import type { CreateDeliveryOrderData, UpdateDeliveryOrderData } from "../types";

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
import { useOrders, useOrder } from "@/features/sales/order/hooks/use-orders";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useCourierAgencies } from "@/features/master-data/payment-and-couriers/courier-agency/hooks/use-courier-agency";
import { useWarehouses } from "@/features/master-data/warehouse/hooks/use-warehouses";
import { useProductBatches } from "@/features/stock/inventory/hooks/use-product-batches";
import type { DeliveryOrder } from "../types";
import type { SalesOrderItem } from "../../order/types";
import type { InventoryBatchItem } from "@/features/stock/inventory/types";
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
  const { data: salesOrdersData } = useOrders({ per_page: 100, status: "confirmed,processing,partial" });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
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

  const form = useForm<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>({
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

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });


  const watchedSalesOrderId = useWatch({ control, name: "sales_order_id" });

  // Fetch sales order details when selected to ensure we have items
  const { data: selectedSalesOrderData } = useOrder(
    watchedSalesOrderId ?? "",
    { enabled: !!watchedSalesOrderId }
  );

  // Auto-populate items when sales order is selected
  useEffect(() => {
    if (!watchedSalesOrderId || isEdit) return;
    
    // Use the detailed data if available
    const salesOrder = selectedSalesOrderData?.data;
    
    if (salesOrder?.items && salesOrder.items.length > 0) {
      // Create items map to preserve existing inputs if re-populating (optional, but good UX)
      // For now, simpler approach: just overwrite to ensure correctness
      
      type LocalDeliveryItem = DeliveryOrderItemFormData & { product_name?: string };

      const newItems = salesOrder.items.map((item: SalesOrderItem) => {
        const remainingQty = item.quantity - (item.delivered_quantity ?? 0);
        
        // Skip fully delivered items? Maybe user wants to deliver 0 of them? 
        // Better to include them but maybe with 0 qty or disabled?
        // Let's include them if > 0 remaining
        if (remainingQty <= 0) return null;

        return {
          product_id: item.product_id,
          sales_order_item_id: item.id,
          inventory_batch_id: "",
          quantity: remainingQty,
          price: item.price || 0,
          installation_status: "",
          function_test_status: "",
          product_name: `${item.product?.code} - ${item.product?.name}`, // Helper for display
        };
      }).filter(Boolean) as LocalDeliveryItem[];

      if (newItems.length > 0) {
         setValue("items", newItems);
      } else {
         toast.info("All items in this Sales Order have been delivered.");
         setValue("items", []);
      }
    }

    // Auto-populate receiver info from sales order customer
    if (salesOrder?.customer_name && !getValues("receiver_name")) {
      setValue("receiver_name", salesOrder.customer_name);
    }
    if (salesOrder?.customer_phone && !getValues("receiver_phone")) {
      setValue("receiver_phone", salesOrder.customer_phone);
    }
  }, [selectedSalesOrderData, watchedSalesOrderId, isEdit, setValue, getValues]);

  // Derive selectedSalesOrderId from watched value
  // const selectedSalesOrderId = useMemo(() => {
  //   return watchedSalesOrderId ?? delivery?.sales_order_id ?? "";
  // }, [watchedSalesOrderId, delivery?.sales_order_id]);

  // Get selected sales order items
  // const selectedSalesOrder = useMemo(() => {
  //   return salesOrders.find(so => so.id === selectedSalesOrderId);
  // }, [salesOrders, selectedSalesOrderId]);

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
              price: item.price || 0,
              installation_status: item.installation_status ?? "",
              function_test_status: item.function_test_status ?? "",
              product_name: `${item.product?.code} - ${item.product?.name}`, // Helper for display
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
  // useEffect(() => {
  //   if (!watchedSalesOrderId || isEdit) return;
    
  //   const salesOrder = salesOrders.find(so => so.id === watchedSalesOrderId);
  //   if (salesOrder?.items && salesOrder.items.length > 0) {
  //     const items = salesOrder.items.map(item => ({
  //       product_id: item.product_id,
  //       sales_order_item_id: item.id,
  //       inventory_batch_id: "",
  //       quantity: item.quantity - (item.delivered_quantity ?? 0), // Remaining quantity
  //       installation_status: "",
  //       function_test_status: "",
  //     }));
  //     setValue("items", items);
  //   }
  // }, [watchedSalesOrderId, salesOrders, isEdit, setValue]);

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "delivery_date",
        // "warehouse_id",
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
      
      // Validate Warehouses
      if (filteredItems.length === 0) {
        toast.error(t("validation.itemsMin") || "At least one item is required");
        return;
      }

      const uniqueWarehouses = new Set(filteredItems.map(i => i.warehouse_id).filter(Boolean));
      
      if (uniqueWarehouses.size === 0) {
        toast.error(t("validation.required") + ": " + t("warehouse"));
        return;
      }

      if (uniqueWarehouses.size > 1) {
        toast.error("All items must be from the same warehouse for a single Delivery Order.");
        return;
      }

      const warehouseId = Array.from(uniqueWarehouses)[0] as string;

      // Prepare payload - strip warehouse_id from items as backend doesn't expect it there
      // and ensure header warehouse_id is set
      const itemsPayload = filteredItems.map((item) => ({
        product_id: item.product_id,
        sales_order_item_id: item.sales_order_item_id || undefined,
        inventory_batch_id: item.inventory_batch_id || undefined,
        quantity: item.quantity,
        price: item.price || 0,
        installation_status: item.installation_status || undefined,
        function_test_status: item.function_test_status || undefined,
      }));

      if (isEdit && delivery) {
        const updatePayload: UpdateDeliveryOrderData = {
          delivery_date: (data as UpdateDeliveryOrderFormData).delivery_date,
          warehouse_id: warehouseId,
          delivered_by_id: (data as UpdateDeliveryOrderFormData).delivered_by_id,
          courier_agency_id: (data as UpdateDeliveryOrderFormData).courier_agency_id,
          tracking_number: (data as UpdateDeliveryOrderFormData).tracking_number,
          receiver_name: (data as UpdateDeliveryOrderFormData).receiver_name,
          receiver_phone: (data as UpdateDeliveryOrderFormData).receiver_phone,
          delivery_address: (data as UpdateDeliveryOrderFormData).delivery_address,
          notes: (data as UpdateDeliveryOrderFormData).notes,
          items: itemsPayload,
        };

        await updateDelivery.mutateAsync({
          id: delivery.id,
          data: updatePayload,
        });
        toast.success(t("updated"));
      } else {
        const createPayload: CreateDeliveryOrderData = {
          delivery_date: (data as CreateDeliveryOrderFormData).delivery_date!,
          warehouse_id: warehouseId,
          sales_order_id: (data as CreateDeliveryOrderFormData).sales_order_id ?? "",
          delivered_by_id: (data as CreateDeliveryOrderFormData).delivered_by_id,
          courier_agency_id: (data as CreateDeliveryOrderFormData).courier_agency_id,
          tracking_number: (data as CreateDeliveryOrderFormData).tracking_number,
          receiver_name: (data as CreateDeliveryOrderFormData).receiver_name,
          receiver_phone: (data as CreateDeliveryOrderFormData).receiver_phone,
          delivery_address: (data as CreateDeliveryOrderFormData).delivery_address,
          notes: (data as CreateDeliveryOrderFormData).notes,
          items: itemsPayload,
        };

        await createDelivery.mutateAsync(createPayload);
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
      price: 0,
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
      // "warehouse_id", // Validated in items
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
    </Dialog>
  );
}

// Separate component to handle batch queries per row to avoid granular re-renders of the main form
function BatchSelectionField({ control, index, error, t }: {
  control: Control<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>;
  index: number;
  error?: string | null;
  t: (key: string) => string;
}) {
  const warehouseId = useWatch({ control, name: `items.${index}.warehouse_id` });
  const productId = useWatch({ control, name: `items.${index}.product_id` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` }) as number | undefined;
  const { setValue } = useFormContext();

  const { data: batchesData, isLoading } = useProductBatches(warehouseId ?? "", (productId as string) ?? "", {
    enabled: !!warehouseId && !!productId
  });

  const batches = useMemo(() => {
    return (batchesData?.data?.data ?? []) as InventoryBatchItem[];
  }, [batchesData]);

  // Aggregate available stock across all batches in the selected warehouse
  const totalAvailable = batches.reduce((sum, b) => sum + (b.available ?? 0), 0);
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
              const batch = batches.find((b) => b.id === val);
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
              {batches.filter((b) => b.available > 0).map((batch) => (
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
