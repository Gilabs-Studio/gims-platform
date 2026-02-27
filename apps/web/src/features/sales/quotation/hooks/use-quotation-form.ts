import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getQuotationSchema,
  getUpdateQuotationSchema,
  type CreateQuotationFormData,
  type UpdateQuotationFormData,
} from "../schemas/quotation.schema";
import { useCreateQuotation, useUpdateQuotation, useQuotation } from "../hooks/use-quotations";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useBusinessTypes } from "@/features/master-data/organization/hooks/use-business-types";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useCustomers } from "@/features/master-data/customer/hooks/use-customers";
import type { SalesQuotation } from "../types";
import { sortOptions } from "@/lib/utils";

const STORAGE_KEY = "quotation_form_cache";

export interface UseQuotationFormProps {
  quotation?: SalesQuotation | null;
  open: boolean;
  onClose: () => void;
}

export function useQuotationForm({ quotation, open, onClose }: UseQuotationFormProps) {
  const isEdit = !!quotation;
  const t = useTranslations("quotation");
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full quotation data with items when editing
  const { data: fullQuotationData, isLoading: isLoadingQuotation, isFetching: isFetchingQuotation } = useQuotation(
    quotation?.id ?? "",
    { enabled: open && isEdit && !!quotation?.id }
  );

  // Fetch lookup data — only when the form is actually open to avoid eager API calls
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true }, { enabled: open });
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 }, { enabled: open });
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 }, { enabled: open });
  const { data: businessTypesData } = useBusinessTypes({ per_page: 100 }, { enabled: open });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
  const { data: customersData } = useCustomers({ per_page: 100, is_approved: true });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

  const paymentTerms = useMemo(() => {
    const data = paymentTermsData?.data ?? [];
    return sortOptions(data, (a) => a.code ? `${a.code} - ${a.name}` : a.name);
  }, [paymentTermsData?.data]);

  const businessUnits = useMemo(() => {
    const data = businessUnitsData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [businessUnitsData?.data]);

  const businessTypes = useMemo(() => {
    const data = businessTypesData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [businessTypesData?.data]);

  const employees = useMemo(() => {
    const data = employeesData?.data ?? [];
    return sortOptions(data, (a) => `${a.employee_code} - ${a.name}`);
  }, [employeesData?.data]);

  const customers = useMemo(() => {
    const data = customersData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [customersData?.data]);

  const schema = isEdit ? getUpdateQuotationSchema(t) : getQuotationSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateQuotationFormData | UpdateQuotationFormData>;

  const form = useForm<CreateQuotationFormData | UpdateQuotationFormData>({
    resolver: formResolver,
    defaultValues: quotation
      ? {
          quotation_date: quotation.quotation_date,
          valid_until: quotation.valid_until ?? undefined,
          payment_terms_id: quotation.payment_terms_id ?? "",
          sales_rep_id: quotation.sales_rep_id ?? "",
          business_unit_id: quotation.business_unit_id ?? "",
          business_type_id: quotation.business_type_id ?? undefined,
          customer_id: quotation.customer_id ?? "",
          customer_name: quotation.customer_name ?? "",
          customer_contact: quotation.customer_contact ?? "",
          customer_phone: quotation.customer_phone ?? "",
          customer_email: quotation.customer_email ?? "",
          tax_rate: quotation.tax_rate ?? 11,
          delivery_cost: quotation.delivery_cost ?? 0,
          other_cost: quotation.other_cost ?? 0,
          discount_amount: quotation.discount_amount ?? 0,
          notes: quotation.notes ?? "",
          items:
            quotation.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
            })) ?? [],
        }
      : {
          quotation_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          customer_name: "",
          customer_contact: "",
          customer_phone: "",
          customer_email: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        },
  });

  const {
    setValue,
    control,
    reset,
    trigger,
    getValues,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

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

  // Reset form when quotation data changes (for edit mode)
  useEffect(() => {
    // Only run when modal is open
    if (!open) {
      // Clear cache when dialog closes
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // For edit mode: wait until fullQuotationData is available
    if (isEdit) {
      if (fullQuotationData?.data) {
        const quotationData = fullQuotationData.data;
        
        // Small delay to ensure form is mounted
        setTimeout(() => {
          reset({
            quotation_date: quotationData.quotation_date,
            valid_until: quotationData.valid_until ?? undefined,
            payment_terms_id: quotationData.payment_terms_id ?? "",
            sales_rep_id: quotationData.sales_rep_id ?? "",
            business_unit_id: quotationData.business_unit_id ?? "",
            business_type_id: quotationData.business_type_id ?? undefined,
            customer_name: quotationData.customer_name ?? "",
            customer_contact: quotationData.customer_contact ?? "",
            customer_phone: quotationData.customer_phone ?? "",
            customer_email: quotationData.customer_email ?? "",
            tax_rate: quotationData.tax_rate ?? 11,
            delivery_cost: quotationData.delivery_cost ?? 0,
            other_cost: quotationData.other_cost ?? 0,
            discount_amount: quotationData.discount_amount ?? 0,
            notes: quotationData.notes ?? "",
            items:
              quotationData.items?.map((item) => ({
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
      } catch {
        // Invalid cache, use defaults
        reset({
          quotation_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          customer_name: "",
          customer_contact: "",
          customer_phone: "",
          customer_email: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        });
      }
    } else {
      reset({
        quotation_date: new Date().toISOString().split("T")[0],
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        customer_name: "",
        customer_contact: "",
        customer_phone: "",
        customer_email: "",
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
      });
    }
  }, [open, isEdit, fullQuotationData, reset]);

  const saveToLocalStorage = (data: CreateQuotationFormData | UpdateQuotationFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "quotation_date",
        "valid_until",
        "payment_terms_id",
        "sales_rep_id",
        "business_unit_id",
        "business_type_id",
        "customer_name",
        "customer_contact",
        "customer_phone",
        "customer_email",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "discount_amount",
        "notes",
      ];

      const isValid = await Promise.all(
        basicFields.map((field) =>
          trigger(field as keyof CreateQuotationFormData)
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
    data: CreateQuotationFormData | UpdateQuotationFormData
  ) => {
    // Check if we're on items tab but have errors in basic fields
    if (activeTab === "items") {
      const basicFields = [
        "quotation_date",
        "valid_until",
        "payment_terms_id",
        "sales_rep_id",
        "business_unit_id",
        "business_type_id",
        "customer_name",
        "customer_contact",
        "customer_phone",
        "customer_email",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "discount_amount",
        "notes",
      ];

      // Trigger validation for basic fields first
      const isBasicValid = await trigger(basicFields as (keyof CreateQuotationFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      // Filter out items with empty product_id
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && quotation) {
        await updateQuotation.mutateAsync({
          id: quotation.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createQuotation.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateQuotationFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save quotation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, product.selling_price, { shouldValidate: true });
    }
  };

  // Auto-fill customer snapshot fields when selecting from master data dropdown
  const handleCustomerChange = (customerId: string) => {
    setValue("customer_id", customerId, { shouldValidate: true });
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setValue("customer_name", customer.name, { shouldValidate: true });
      setValue("customer_contact", customer.contact_person ?? "");
      setValue("customer_email", customer.email ?? "");
      setValue("customer_phone", customer.phone_numbers?.[0]?.phone_number ?? "");
      // Auto-fill sales defaults from customer master data
      if (customer.default_business_type_id) setValue("business_type_id", customer.default_business_type_id);
      if (customer.default_payment_terms_id) setValue("payment_terms_id", customer.default_payment_terms_id);
      if (customer.default_sales_rep_id) setValue("sales_rep_id", customer.default_sales_rep_id);
      if (customer.default_tax_rate != null) setValue("tax_rate", customer.default_tax_rate);
    }
  };

  const isLoading = createQuotation.isPending || updateQuotation.isPending;
  const isFormLoading = isEdit && (isLoadingQuotation || isFetchingQuotation) && !fullQuotationData?.data;

  // ─── Quick-create (Odoo-style inline creation from combobox) ───────────────
  type QuickCreateType =
    | "paymentTerm"
    | "businessUnit"
    | "businessType"
    | "customer"
    | "product"
    | "employee"
    | null;

  const [quickCreate, setQuickCreate] = useState<{
    type: QuickCreateType;
    itemIndex?: number;
  }>({ type: null });

  const openQuickCreate = useCallback(
    (type: QuickCreateType, _initialName?: string, itemIndex?: number) =>
      setQuickCreate({ type, itemIndex }),
    [],
  );

  const closeQuickCreate = useCallback(
    () => setQuickCreate({ type: null }),
    [],
  );

  const handlePaymentTermCreated = useCallback(
    (item: { id: string; name: string }) => {
      setValue("payment_terms_id", item.id, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleBusinessUnitCreated = useCallback(
    (item: { id: string; name: string }) => {
      setValue("business_unit_id", item.id, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleBusinessTypeCreated = useCallback(
    (item: { id: string; name: string }) => {
      setValue("business_type_id", item.id, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleCustomerCreated = useCallback(
    (item: { id: string; name: string }) => {
      setValue("customer_id", item.id, { shouldValidate: true });
      setValue("customer_name", item.name, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleProductCreated = useCallback(
    (item: { id: string; name: string }) => {
      const idx = quickCreate.itemIndex ?? 0;
      setValue(`items.${idx}.product_id`, item.id, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate, quickCreate.itemIndex],
  );

  const handleEmployeeCreated = useCallback(
    (item: { id: string; name: string }) => {
      setValue("sales_rep_id", item.id, { shouldValidate: true });
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateQuotationFormData | UpdateQuotationFormData>) => {
    const basicFields = [
      "quotation_date",
      "valid_until",
      "payment_terms_id",
      "sales_rep_id",
      "business_unit_id",
      "business_type_id",
      "customer_name",
      "customer_contact",
      "customer_phone",
      "customer_email",
      "tax_rate",
      "delivery_cost",
      "other_cost",
      "discount_amount",
      "notes",
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateQuotationFormData | keyof UpdateQuotationFormData]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
      }, 100);
    }
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
    products,
    paymentTerms,
    businessUnits,
    businessTypes,
    employees,
    customers,
    calculations,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    discountAmount,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleCustomerChange,
    handleDialogChange,
    onInvalid,
    // Quick-create state & handlers
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    handlePaymentTermCreated,
    handleBusinessUnitCreated,
    handleBusinessTypeCreated,
    handleCustomerCreated,
    handleProductCreated,
    handleEmployeeCreated,
  };
}
