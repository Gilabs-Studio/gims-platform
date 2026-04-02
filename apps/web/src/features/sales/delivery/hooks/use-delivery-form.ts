import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getDeliveryOrderSchema,
  getUpdateDeliveryOrderSchema,
  type CreateDeliveryOrderFormData,
  type UpdateDeliveryOrderFormData,
  type DeliveryOrderItemFormData,
} from "../schemas/delivery.schema";
import type { CreateDeliveryOrderData, UpdateDeliveryOrderData, DeliveryOrder } from "../types";
import { useCreateDeliveryOrder, useUpdateDeliveryOrder, useDeliveryOrder } from "../hooks/use-deliveries";
import { useOrder } from "@/features/sales/order/hooks/use-orders";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";
import { orderService } from "@/features/sales/order/services/order-service";
import { employeeService } from "@/features/master-data/employee/services/employee-service";
import { courierAgencyService } from "@/features/master-data/payment-and-couriers/courier-agency/services/courier-agency-service";
import { warehouseService } from "@/features/master-data/warehouse/services/warehouse-service";
import type { SalesOrderItem } from "../../order/types";
import { sortOptions } from "@/lib/utils";
import { getFirstFormErrorMessage, getSalesErrorMessage, toOptionalString } from "../../utils/error-utils";

export interface UseDeliveryFormProps {
  delivery?: DeliveryOrder | null;
  open: boolean;
  onClose: () => void;
  defaultSalesOrderId?: string;
}

export function useDeliveryForm({ delivery, open, onClose, defaultSalesOrderId }: UseDeliveryFormProps) {
  const isEdit = !!delivery;
  const t = useTranslations("delivery");
  const createDelivery = useCreateDeliveryOrder();
  const updateDelivery = useUpdateDeliveryOrder();
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);
  const [shouldLoadReferenceOptions, setShouldLoadReferenceOptions] = useState(true);

  type QuickCreateType = "employee" | "courierAgency" | null;
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const enableReferenceOptionsFetch = useCallback(() => {
    setShouldLoadReferenceOptions(true);
  }, []);

  // Fetch full delivery data when editing
  const { data: fullDeliveryData, isLoading: isLoadingDelivery } = useDeliveryOrder(
    delivery?.id ?? "",
    { enabled: open && isEdit && !!delivery?.id }
  );

  const selectedDelivery = fullDeliveryData?.data ?? delivery ?? null;
  const referenceOptionsEnabled = open && shouldLoadReferenceOptions;

  const salesOrdersCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "delivery", "orders"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      orderService.list({
        ...params,
        status: "approved",
        unfulfilled_only: true,
        sort_by: "order_date",
        sort_dir: "desc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.code,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedDelivery?.sales_order?.id
        ? [{ value: selectedDelivery.sales_order.id, label: selectedDelivery.sales_order.code }]
        : undefined,
  });

  const employeesCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "delivery", "employees"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      employeeService.list({
        ...params,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: `${item.employee_code} - ${item.name}`,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedDelivery?.delivered_by?.id
        ? [
            {
              value: selectedDelivery.delivered_by.id,
              label: selectedDelivery.delivered_by.employee_code
                ? `${selectedDelivery.delivered_by.employee_code} - ${selectedDelivery.delivered_by.name}`
                : selectedDelivery.delivered_by.name,
            },
          ]
        : undefined,
  });

  const courierAgenciesCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "delivery", "courier-agencies"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      courierAgencyService.list({
        ...params,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedDelivery?.courier_agency?.id
        ? [{ value: selectedDelivery.courier_agency.id, label: selectedDelivery.courier_agency.name }]
        : undefined,
  });

  const warehousesCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "delivery", "warehouses"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      warehouseService.list({
        ...params,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.code ? `${item.code} - ${item.name}` : item.name,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedDelivery?.warehouse?.id
        ? [
            {
              value: selectedDelivery.warehouse.id,
              label: selectedDelivery.warehouse.code
                ? `${selectedDelivery.warehouse.code} - ${selectedDelivery.warehouse.name}`
                : selectedDelivery.warehouse.name,
            },
          ]
        : undefined,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setShouldLoadReferenceOptions(true);
  }, [open]);

  const salesOrders = useMemo(
    () => sortOptions(salesOrdersCombobox.items, (item) => item.code),
    [salesOrdersCombobox.items],
  );

  const employees = useMemo(
    () => sortOptions(employeesCombobox.items, (item) => `${item.employee_code} - ${item.name}`),
    [employeesCombobox.items],
  );
  
  const courierAgencies = useMemo(
    () => sortOptions(courierAgenciesCombobox.items, (item) => item.name ?? ""),
    [courierAgenciesCombobox.items],
  );

  const warehouses = useMemo(
    () => sortOptions(warehousesCombobox.items, (item) => (item.code ? `${item.code} - ${item.name}` : item.name)),
    [warehousesCombobox.items],
  );

  const schema = isEdit ? getUpdateDeliveryOrderSchema(t) : getDeliveryOrderSchema(t);
  const formResolver = zodResolver(schema as any) as Resolver<CreateDeliveryOrderFormData | UpdateDeliveryOrderFormData>;

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
          sales_order_id: defaultSalesOrderId ?? "",
          items: [],
        },
  });

  const {
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
    { enabled: !!watchedSalesOrderId && open }
  );

  // Auto-populate items when sales order is selected
  useEffect(() => {
    if (!watchedSalesOrderId || isEdit) return;
    
    const salesOrder = selectedSalesOrderData?.data;
    
    if (salesOrder?.items && salesOrder.items.length > 0) {
      type LocalDeliveryItem = DeliveryOrderItemFormData & { product_name?: string };

      const newItems = salesOrder.items.map((item: SalesOrderItem) => {
        const remainingQty = item.quantity - (item.delivered_quantity ?? 0) - (item.pending_delivery_quantity ?? 0);
        
        if (remainingQty <= 0) return null;

        return {
          product_id: item.product_id,
          sales_order_item_id: item.id,
          inventory_batch_id: "",
          quantity: remainingQty,
          price: item.price || 0,
          installation_status: "",
          function_test_status: "",
          product_name: `${item.product?.code} - ${item.product?.name}`,
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
              product_name: `${item.product?.code} - ${item.product?.name}`,
            })) ?? [],
        });
      }, 10);
      return;
    }

    reset({
      delivery_date: new Date().toISOString().split("T")[0],
      warehouse_id: "",
      sales_order_id: defaultSalesOrderId ?? "",
      items: [],
    });
  }, [open, isEdit, fullDeliveryData, reset, defaultSalesOrderId]);

  const basicFieldsList = [
    "delivery_date",
    "sales_order_id",
    "delivered_by_id",
    "courier_agency_id",
    "tracking_number",
    "receiver_name",
    "receiver_phone",
    "delivery_address",
    "notes",
  ] as (keyof CreateDeliveryOrderFormData | keyof UpdateDeliveryOrderFormData)[];

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const isValid = await trigger(basicFieldsList);

      if (isValid) {
        setActiveTab("items");
      } else {
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

        const currentErrors = errors;
        const failingFields = basicFieldsList
          .filter(field => currentErrors[field as keyof typeof currentErrors])
          .map(field => fieldMapping[field as string] || field);
        
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
    if (activeTab === "items") {
      const isBasicValid = await trigger(basicFieldsList);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("validation.required") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
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
          delivered_by_id: toOptionalString((data as UpdateDeliveryOrderFormData).delivered_by_id),
          courier_agency_id: toOptionalString((data as UpdateDeliveryOrderFormData).courier_agency_id),
          tracking_number: toOptionalString((data as UpdateDeliveryOrderFormData).tracking_number),
          receiver_name: toOptionalString((data as UpdateDeliveryOrderFormData).receiver_name),
          receiver_phone: toOptionalString((data as UpdateDeliveryOrderFormData).receiver_phone),
          delivery_address: toOptionalString((data as UpdateDeliveryOrderFormData).delivery_address),
          notes: toOptionalString((data as UpdateDeliveryOrderFormData).notes),
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
          sales_order_id: toOptionalString((data as CreateDeliveryOrderFormData).sales_order_id) ?? "",
          delivered_by_id: toOptionalString((data as CreateDeliveryOrderFormData).delivered_by_id),
          courier_agency_id: toOptionalString((data as CreateDeliveryOrderFormData).courier_agency_id),
          tracking_number: toOptionalString((data as CreateDeliveryOrderFormData).tracking_number),
          receiver_name: toOptionalString((data as CreateDeliveryOrderFormData).receiver_name),
          receiver_phone: toOptionalString((data as CreateDeliveryOrderFormData).receiver_phone),
          delivery_address: toOptionalString((data as CreateDeliveryOrderFormData).delivery_address),
          notes: toOptionalString((data as CreateDeliveryOrderFormData).notes),
          items: itemsPayload,
        };

        await createDelivery.mutateAsync(createPayload);
        toast.success(t("created"));
      }
      onClose();
    } catch (error) {
      console.error("Failed to save delivery order:", error);
      toast.error(getSalesErrorMessage(error, t("common.error")));
    }
  };

  const handleDeliveredByCreated = useCallback((item: { id: string; name: string }) => {
    form.setValue("delivered_by_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, form]);

  const handleCourierAgencyCreated = useCallback((item: { id: string; name: string }) => {
    form.setValue("courier_agency_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, form]);

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
    const basicError = basicFieldsList.some((field) => 
      errors[field as keyof CreateDeliveryOrderFormData | keyof UpdateDeliveryOrderFormData]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
        toast.error(
          getFirstFormErrorMessage(errors) ||
          t("validation.required") ||
          "Please fill all required fields in General tab",
        );
      }, 100);
      return;
    }

    toast.error(
      getFirstFormErrorMessage(errors) ||
      t("validation.itemsMin") ||
      "Please complete all required item fields.",
    );
  };

  return {
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
    enableReferenceOptionsFetch,
    handleDeliveredByCreated,
    handleCourierAgencyCreated,
    salesOrdersCombobox,
    employeesCombobox,
    courierAgenciesCombobox,
    warehousesCombobox,
  };
}
