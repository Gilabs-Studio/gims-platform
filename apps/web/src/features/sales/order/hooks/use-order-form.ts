import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getOrderSchema,
  getUpdateOrderSchema,
  type CreateOrderFormData,
  type UpdateOrderFormData,
} from "../schemas/order.schema";
import { useCreateOrder, useUpdateOrder, useOrder } from "./use-orders";
import { useQuotation, useQuotationItems } from "../../quotation/hooks/use-quotations";
import { useContacts } from "@/features/crm/contact/hooks/use-contact";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";
import { useCustomer } from "@/features/master-data/customer/hooks/use-customers";
import { paymentTermsService } from "@/features/master-data/payment-and-couriers/payment-terms/services/payment-terms-service";
import { areaService, businessTypeService, businessUnitService } from "@/features/master-data/organization/services/organization-service";
import { quotationService } from "../../quotation/services/quotation-service";
import { customerService } from "@/features/master-data/customer/services/customer-service";
import { employeeService } from "@/features/master-data/employee/services/employee-service";
import { productService } from "@/features/master-data/product/services/product-service";

import type { SalesOrder } from "../types";
import type { Product } from "@/features/master-data/product/types";
import { sortOptions } from "@/lib/utils";
import { getFirstFormErrorMessage, getSalesErrorMessage, toOptionalString } from "../../utils/error-utils";

const STORAGE_KEY = "order_form_cache";

export interface UseOrderFormProps {
  order?: SalesOrder | null;
  open: boolean;
  onClose: () => void;
}

export function useOrderForm({ order, open, onClose }: UseOrderFormProps) {
  const isEdit = !!order;
  const t = useTranslations("order");
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [customerDefaultPins, setCustomerDefaultPins] = useState<{
    paymentTerm: { value: string; label: string } | null;
    businessType: { value: string; label: string } | null;
    area: { value: string; label: string } | null;
    salesRep: { value: string; label: string } | null;
  }>({
    paymentTerm: null,
    businessType: null,
    area: null,
    salesRep: null,
  });
  const [shouldLoadReferenceOptions, setShouldLoadReferenceOptions] = useState(true);
  const [shouldLoadProductOptions, setShouldLoadProductOptions] = useState(true);

  type QuickCreateType = "paymentTerm" | "businessUnit" | "businessType" | "customer" | "contact" | "employee" | null;
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType; itemIndex?: number }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const enableReferenceOptionsFetch = useCallback(() => {
    setShouldLoadReferenceOptions(true);
  }, []);

  const enableProductOptionsFetch = useCallback(() => {
    setShouldLoadProductOptions(true);
  }, []);

  // Fetch full order data with items when editing
  const { data: fullOrderData, isLoading: isLoadingOrder, isFetching: isFetchingOrder } = useOrder(
    order?.id ?? "",
    { enabled: open && isEdit && !!order?.id }
  );

  const selectedOrder = fullOrderData?.data ?? order ?? null;
  const referenceOptionsEnabled = open && shouldLoadReferenceOptions;
  const productOptionsEnabled = open && shouldLoadProductOptions;

  const paymentTermsCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "payment-terms"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      paymentTermsService.list({
        ...params,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions: [
      selectedOrder?.payment_terms?.id
        ? {
            value: selectedOrder.payment_terms.id,
            label: selectedOrder.payment_terms.name,
          }
        : null,
      customerDefaultPins.paymentTerm,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const businessUnitCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "business-units"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      businessUnitService.list({
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
      selectedOrder?.business_unit?.id
        ? [{ value: selectedOrder.business_unit.id, label: selectedOrder.business_unit.name }]
        : undefined,
  });

  const businessTypeCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "business-types"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      businessTypeService.list({
        ...params,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.name,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions: [
      selectedOrder?.business_type?.id
        ? { value: selectedOrder.business_type.id, label: selectedOrder.business_type.name }
        : null,
      customerDefaultPins.businessType,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const quotationCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "quotations"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      quotationService.list({
        ...params,
        status: "approved",
        sort_by: "code",
        sort_dir: "desc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.code,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedOrder?.sales_quotation?.id
        ? [{ value: selectedOrder.sales_quotation.id, label: selectedOrder.sales_quotation.code }]
        : undefined,
  });

  const customerCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "customers"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      customerService.list({
        ...params,
        is_approved: true,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: `${item.code} - ${item.name}`,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedOrder?.customer?.id
        ? [
            {
              value: selectedOrder.customer.id,
              label: selectedOrder.customer.code
                ? `${selectedOrder.customer.code} - ${selectedOrder.customer.name}`
                : selectedOrder.customer.name,
            },
          ]
        : undefined,
  });

  const employeeCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "employees"],
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
    pinnedOptions: [
      selectedOrder?.sales_rep?.id
        ? {
            value: selectedOrder.sales_rep.id,
            label: `${selectedOrder.sales_rep.employee_code} - ${selectedOrder.sales_rep.name}`,
          }
        : null,
      customerDefaultPins.salesRep,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const productCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "order", "products"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      productService.list({
        ...params,
        is_approved: true,
        sort_by: "name",
        sort_dir: "asc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: `${item.code} - ${item.name}`,
    }),
    enabled: productOptionsEnabled,
    pinnedOptions:
      selectedOrder?.items?.length
        ? selectedOrder.items
            .filter((item) => item.product?.id)
            .map((item) => ({
              value: item.product_id,
              label: item.product?.code
                ? `${item.product.code} - ${item.product.name}`
                : item.product?.name ?? item.product_id,
            }))
        : undefined,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setShouldLoadReferenceOptions(true);
    setShouldLoadProductOptions(true);
  }, [open]);

  const products = useMemo(
    () => sortOptions(productCombobox.items, (a) => `${a.code} - ${a.name}`),
    [productCombobox.items],
  );
  
  const paymentTerms = useMemo(
    () => sortOptions(paymentTermsCombobox.items, (a) => (a.code ? `${a.code} - ${a.name}` : a.name)),
    [paymentTermsCombobox.items],
  );

  const businessUnits = useMemo(
    () => sortOptions(businessUnitCombobox.items, (a) => a.name),
    [businessUnitCombobox.items],
  );

  const businessTypes = useMemo(
    () => sortOptions(businessTypeCombobox.items, (a) => a.name),
    [businessTypeCombobox.items],
  );

  const quotations = useMemo(
    () => sortOptions(quotationCombobox.items, (a) => a.code),
    [quotationCombobox.items],
  );

  const customers = useMemo(
    () => sortOptions(customerCombobox.items, (a) => `${a.code} - ${a.name}`),
    [customerCombobox.items],
  );

  const employees = useMemo(
    () => sortOptions(employeeCombobox.items, (a) => `${a.employee_code} - ${a.name}`),
    [employeeCombobox.items],
  );

  const schema = isEdit ? getUpdateOrderSchema(t) : getOrderSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateOrderFormData | UpdateOrderFormData>;

  const form = useForm<CreateOrderFormData | UpdateOrderFormData>({
    resolver: formResolver,
    defaultValues: order
      ? {
          order_date: order.order_date,
          payment_terms_id: order.payment_terms_id ?? "",
          sales_rep_id: order.sales_rep_id ?? "",
          business_unit_id: order.business_unit_id ?? "",
          business_type_id: order.business_type_id ?? undefined,
          customer_id: order.customer_id ?? "",
          customer_contact_id: order.customer_contact_id ?? "",
          customer_name: order.customer_name ?? "",
          customer_contact: order.customer_contact ?? "",
          customer_phone: order.customer_phone ?? "",
          customer_email: order.customer_email ?? "",
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
          customer_contact_id: "",
          customer_name: "",
          customer_contact: "",
          customer_phone: "",
          customer_email: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
          sales_quotation_id: undefined,
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

  // Watch for validation
  const watchedQuotationId = useWatch({ control, name: "sales_quotation_id" });
  const watchedCustomerId = (useWatch({ control, name: "customer_id" }) as string | undefined) ?? "";
  const { data: selectedCustomerData } = useCustomer(watchedCustomerId, {
    enabled: open && !!watchedCustomerId,
  });

  const { data: contactsData } = useContacts(
    watchedCustomerId
      ? {
          customer_id: watchedCustomerId,
          per_page: 20,
          sort_by: "name",
          sort_dir: "asc",
        }
      : undefined,
    { enabled: open && !!watchedCustomerId }
  );

  const contacts = useMemo(() => {
    const data = contactsData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [contactsData?.data]);

  const applyCustomerDefaults = useCallback((customer: {
    name?: string;
    contact_person?: string | null;
    email?: string | null;
    phone_numbers?: Array<{ phone_number?: string | null }>;
    default_business_type_id?: string | null;
    default_payment_terms_id?: string | null;
    default_sales_rep_id?: string | null;
    default_tax_rate?: number | null;
    default_business_type?: { id: string; name: string } | null;
    default_payment_terms?: { id: string; name: string } | null;
    default_sales_rep?: { id: string; employee_code: string; name: string } | null;
  } | null) => {
    if (!customer) {
      setValue("customer_name", "", { shouldValidate: true, shouldDirty: true });
      setValue("customer_contact_id", "", { shouldValidate: true, shouldDirty: true });
      setValue("customer_contact", "", { shouldValidate: true, shouldDirty: true });
      setValue("customer_email", "", { shouldValidate: true, shouldDirty: true });
      setValue("customer_phone", "", { shouldValidate: true, shouldDirty: true });
      setValue("business_type_id", "", { shouldValidate: true, shouldDirty: true });
      setValue("payment_terms_id", "", { shouldValidate: true, shouldDirty: true });
      setValue("sales_rep_id", "", { shouldValidate: true, shouldDirty: true });
      return;
    }

    setValue("customer_name", customer.name ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("customer_contact", customer.contact_person ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("customer_email", customer.email ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("customer_phone", customer.phone_numbers?.[0]?.phone_number ?? "", { shouldValidate: true, shouldDirty: true });
    const defaultBusinessTypeId = customer.default_business_type_id ?? customer.default_business_type?.id;
    const defaultPaymentTermsId = customer.default_payment_terms_id ?? customer.default_payment_terms?.id;
    const defaultSalesRepId = customer.default_sales_rep_id ?? customer.default_sales_rep?.id;

    if (defaultBusinessTypeId) setValue("business_type_id", defaultBusinessTypeId, { shouldValidate: true, shouldDirty: true });
    if (defaultPaymentTermsId) setValue("payment_terms_id", defaultPaymentTermsId, { shouldValidate: true, shouldDirty: true });
    if (defaultSalesRepId) setValue("sales_rep_id", defaultSalesRepId, { shouldValidate: true, shouldDirty: true });
    if (customer.default_tax_rate != null) setValue("tax_rate", customer.default_tax_rate, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  useEffect(() => {
    if (!watchedCustomerId || selectedContactId || contacts.length === 0) {
      return;
    }

    const primaryContactName = (selectedCustomerData?.data?.contact_person ?? "").trim().toLowerCase();
    const matchedPrimaryContact = primaryContactName
      ? contacts.find((item) => item.name.trim().toLowerCase() === primaryContactName)
      : undefined;
    const selectedMainContact = matchedPrimaryContact ?? contacts[0];

    if (!selectedMainContact) {
      return;
    }

    setSelectedContactId(selectedMainContact.id);
    setValue("customer_contact_id", selectedMainContact.id, { shouldValidate: true, shouldDirty: true });
    setValue("customer_contact", selectedMainContact.name, { shouldValidate: true, shouldDirty: true });
    setValue("customer_phone", selectedMainContact.phone ?? "", { shouldValidate: true, shouldDirty: true });
    setValue("customer_email", selectedMainContact.email ?? "", { shouldValidate: true, shouldDirty: true });
  }, [watchedCustomerId, selectedContactId, contacts, selectedCustomerData?.data?.contact_person, setValue]);

  useEffect(() => {
    if (!watchedCustomerId) {
      setCustomerDefaultPins({
        paymentTerm: null,
        businessType: null,
        area: null,
        salesRep: null,
      });
      return;
    }
    const detailCustomer = selectedCustomerData?.data;
    if (!detailCustomer) return;

    setCustomerDefaultPins({
      paymentTerm: detailCustomer.default_payment_terms?.id
        ? {
            value: detailCustomer.default_payment_terms.id,
            label: detailCustomer.default_payment_terms.name,
          }
        : null,
      businessType: detailCustomer.default_business_type?.id
        ? {
            value: detailCustomer.default_business_type.id,
            label: detailCustomer.default_business_type.name,
          }
        : null,
      area: detailCustomer.default_area?.id
        ? {
            value: detailCustomer.default_area.id,
            label: detailCustomer.default_area.name,
          }
        : null,
      salesRep: detailCustomer.default_sales_rep?.id
        ? {
            value: detailCustomer.default_sales_rep.id,
            label: `${detailCustomer.default_sales_rep.employee_code} - ${detailCustomer.default_sales_rep.name}`,
          }
        : null,
    });

    applyCustomerDefaults(detailCustomer);
  }, [watchedCustomerId, selectedCustomerData?.data, applyCustomerDefaults]);
  
  // Fetch quotation details when selected
  const { data: quotationData } = useQuotation(watchedQuotationId ?? "", {
    enabled: !!watchedQuotationId && open,
  });

  // Fetch quotation items when selected
  const { data: quotationItemsData } = useQuotationItems(watchedQuotationId ?? "", {
      per_page: 20 
  }, {
    enabled: !!watchedQuotationId && !isEdit && open,
  });

  // Auto-populate form from selected Sales Quotation (create mode only)
  useEffect(() => {
    if (quotationData?.data && !isEdit && watchedQuotationId) {
      const q = quotationData.data;

      // --- General / order fields ---
      setValue("payment_terms_id", q.payment_terms_id ?? "", { shouldValidate: true });
      setValue("sales_rep_id", q.sales_rep_id ?? "", { shouldValidate: true });
      setValue("business_unit_id", q.business_unit_id ?? "", { shouldValidate: true });
      setValue("business_type_id", q.business_type_id ?? undefined, { shouldValidate: true });

      // --- Customer information ---
      setValue("customer_id", q.customer_id ?? "", { shouldValidate: true });
      setValue("customer_contact_id", q.customer_contact_id ?? "", { shouldValidate: true });
      setValue("customer_name", q.customer_name ?? "", { shouldValidate: true });
      setValue("customer_contact", q.customer_contact ?? "", { shouldValidate: true });
      setValue("customer_phone", q.customer_phone ?? "", { shouldValidate: true });
      setValue("customer_email", q.customer_email ?? "", { shouldValidate: true });
      setSelectedContactId(q.customer_contact_id ?? "");

      // --- Financial summary ---
      setValue("tax_rate", q.tax_rate ?? 11, { shouldValidate: true });
      setValue("delivery_cost", q.delivery_cost ?? 0, { shouldValidate: true });
      setValue("other_cost", q.other_cost ?? 0, { shouldValidate: true });
      setValue("discount_amount", q.discount_amount ?? 0, { shouldValidate: true });
      setValue("notes", q.notes ?? "", { shouldValidate: true });

      // --- Items ---
      const sourceItems = quotationItemsData?.data?.length
        ? quotationItemsData.data
        : (q.items ?? []);

      if (sourceItems.length > 0) {
        const newItems = sourceItems.map((item) => ({
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
      setSelectedContactId("");
      return;
    }

    if (isEdit) {
      if (fullOrderData?.data) {
        const orderData = fullOrderData.data;
        setSelectedContactId(orderData.customer_contact_id ?? "");
        
        setTimeout(() => {
          reset({
            order_date: orderData.order_date,
            customer_id: orderData.customer_id ?? "",
            customer_contact_id: orderData.customer_contact_id ?? "",
            payment_terms_id: orderData.payment_terms_id ?? "",
            sales_rep_id: orderData.sales_rep_id ?? "",
            business_unit_id: orderData.business_unit_id ?? "",
            business_type_id: orderData.business_type_id ?? undefined,
            customer_name: orderData.customer_name ?? "",
            customer_contact: orderData.customer_contact ?? "",
            customer_phone: orderData.customer_phone ?? "",
            customer_email: orderData.customer_email ?? "",
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
        setSelectedContactId("");
      } catch {
        reset({
          order_date: new Date().toISOString().split("T")[0],
          sales_quotation_id: "",
          payment_terms_id: "",
          sales_rep_id: "",
          business_unit_id: "",
          business_type_id: "",
          customer_contact_id: "",
          customer_name: "",
          customer_contact: "",
          customer_phone: "",
          customer_email: "",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          notes: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        });
        setSelectedContactId("");
      }
    } else {
      reset({
        order_date: new Date().toISOString().split("T")[0],
        sales_quotation_id: "",
        payment_terms_id: "",
        sales_rep_id: "",
        business_unit_id: "",
        business_type_id: "",
        customer_contact_id: "",
        customer_name: "",
        customer_contact: "",
        customer_phone: "",
        customer_email: "",
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        notes: "",
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
      });
      setSelectedContactId("");
    }
  }, [open, isEdit, fullOrderData, reset]);

  const saveToLocalStorage = (data: CreateOrderFormData | UpdateOrderFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const basicFieldsList = [
    "order_date",
    "sales_quotation_id",
    "customer_id",
    "payment_terms_id",
    "sales_rep_id",
    "business_unit_id",
    "business_type_id",
    "tax_rate",
    "delivery_cost",
    "other_cost",
    "discount_amount",
    "notes",
  ] as (keyof CreateOrderFormData | keyof UpdateOrderFormData)[];

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const isValid = await trigger(basicFieldsList);

      if (isValid) {
        const formData = getValues();
        saveToLocalStorage(formData);
        setActiveTab("items");
      } else {
        const fieldMapping: Record<string, string> = {
          order_date: t("orderDate"),
          sales_quotation_id: t("salesQuotation"),
          customer_id: t("common.customer") || "Customer",
          payment_terms_id: t("paymentTerms"),
          sales_rep_id: t("salesRep"),
          business_unit_id: t("businessUnit"),
          business_type_id: t("businessType"),
          tax_rate: t("taxRate"),
          delivery_cost: t("deliveryCost"),
          other_cost: t("otherCost"),
          discount_amount: t("discountAmount"),
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
    data: CreateOrderFormData | UpdateOrderFormData
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
      
      const payload = {
        ...data,
        sales_quotation_id: toOptionalString(data.sales_quotation_id),
        customer_id: toOptionalString(data.customer_id),
        customer_contact_id: toOptionalString((data as { customer_contact_id?: string }).customer_contact_id ?? selectedContactId),
        payment_terms_id: toOptionalString(data.payment_terms_id),
        sales_rep_id: toOptionalString(data.sales_rep_id),
        business_unit_id: toOptionalString(data.business_unit_id),
        business_type_id: toOptionalString(data.business_type_id),
        customer_name: toOptionalString(data.customer_name),
        customer_contact: toOptionalString(data.customer_contact),
        customer_phone: toOptionalString(data.customer_phone),
        customer_email: toOptionalString(data.customer_email),
        notes: toOptionalString(data.notes),
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
      toast.error(getSalesErrorMessage(error, t("common.error")));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string, product?: Product) => {
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, product.selling_price, { shouldValidate: true });
      return;
    }

    const selectedProduct = products.find((item) => item.id === productId);
    if (selectedProduct) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, selectedProduct.selling_price, { shouldValidate: true });
    }
  };

  // Auto-fill customer snapshot fields when selecting from master data dropdown
  const handleCustomerChange = (customerId: string) => {
    setValue("customer_id", customerId, { shouldValidate: true, shouldDirty: true });
    setCustomerDefaultPins({
      paymentTerm: null,
      businessType: null,
      area: null,
      salesRep: null,
    });
    setValue("customer_contact_id", "", { shouldValidate: true, shouldDirty: true });
    setSelectedContactId("");
    const customer = customers.find((c) => c.id === customerId);
    applyCustomerDefaults(customer ?? null);
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);

    if (!contactId) {
      setValue("customer_contact_id", "", { shouldValidate: true });
      return;
    }

    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) {
      return;
    }

    setValue("customer_contact_id", contact.id, { shouldValidate: true });
    setValue("customer_contact", contact.name, { shouldValidate: true });
    setValue("customer_phone", contact.phone ?? "", { shouldValidate: true });
    setValue("customer_email", contact.email ?? "", { shouldValidate: true });
  };

  const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
    setValue("payment_terms_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const handleBusinessUnitCreated = useCallback((item: { id: string; name: string }) => {
    setValue("business_unit_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const handleBusinessTypeCreated = useCallback((item: { id: string; name: string }) => {
    setValue("business_type_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const handleCustomerCreated = useCallback((item: { id: string; name: string }) => {
    setValue("customer_id", item.id, { shouldValidate: true });
    setValue("customer_contact_id", "", { shouldValidate: true });
    setValue("customer_name", item.name, { shouldValidate: true });
    setValue("customer_contact", "", { shouldValidate: true });
    setValue("customer_phone", "", { shouldValidate: true });
    setValue("customer_email", "", { shouldValidate: true });
    setSelectedContactId("");
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const handleContactCreated = useCallback((item: { id: string; name: string; phone?: string; email?: string }) => {
    setSelectedContactId(item.id);
    setValue("customer_contact_id", item.id, { shouldValidate: true });
    setValue("customer_contact", item.name, { shouldValidate: true });
    setValue("customer_phone", item.phone ?? "", { shouldValidate: true });
    setValue("customer_email", item.email ?? "", { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const handleSalesRepCreated = useCallback((item: { id: string; name: string }) => {
    setValue("sales_rep_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, setValue]);

  const isLoading = createOrder.isPending || updateOrder.isPending;
  const isProductsLoading = productCombobox.isLoading || productCombobox.isFetching;
  const isFormLoading = isEdit && (isLoadingOrder || isFetchingOrder) && !fullOrderData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateOrderFormData | UpdateOrderFormData>) => {
    const basicError = basicFieldsList.some((field) => 
      errors[field as keyof CreateOrderFormData | keyof UpdateOrderFormData]
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
    paymentTerms,
    businessUnits,
    businessTypes,
    quotations,
    customers,
    contacts,
    employees,
    products,
    isProductsLoading,
    selectedContactId,
    calculations,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleCustomerChange,
    handleContactChange,
    handleDialogChange,
    onInvalid,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    discountAmount,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    enableReferenceOptionsFetch,
    enableProductOptionsFetch,
    handlePaymentTermCreated,
    handleBusinessUnitCreated,
    handleBusinessTypeCreated,
    handleCustomerCreated,
    handleContactCreated,
    handleSalesRepCreated,
    customerCombobox,
    paymentTermsCombobox,
    employeeCombobox,
    businessUnitCombobox,
    businessTypeCombobox,
    quotationCombobox,
    productCombobox,
  };
}
