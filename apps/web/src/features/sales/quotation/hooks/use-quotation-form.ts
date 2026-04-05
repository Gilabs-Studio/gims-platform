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
import { useContacts } from "@/features/crm/contact/hooks/use-contact";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";
import { useCustomer } from "@/features/master-data/customer/hooks/use-customers";
import { customerService } from "@/features/master-data/customer/services/customer-service";
import { paymentTermsService } from "@/features/master-data/payment-and-couriers/payment-terms/services/payment-terms-service";
import { businessTypeService, businessUnitService } from "@/features/master-data/organization/services/organization-service";
import { employeeService } from "@/features/master-data/employee/services/employee-service";
import { productService } from "@/features/master-data/product/services/product-service";
import type { SalesQuotation } from "../types";
import { sortOptions } from "@/lib/utils";
import { getFirstFormErrorMessage, getSalesErrorMessage, toOptionalString } from "../../utils/error-utils";

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
  const [selectedContactId, setSelectedContactId] = useState("");
  const [customerDefaultPins, setCustomerDefaultPins] = useState<{
    paymentTerm: { value: string; label: string } | null;
    businessType: { value: string; label: string } | null;
    salesRep: { value: string; label: string } | null;
  }>({
    paymentTerm: null,
    businessType: null,
    salesRep: null,
  });
  const [shouldLoadReferenceOptions, setShouldLoadReferenceOptions] = useState(true);
  const [shouldLoadProductOptions, setShouldLoadProductOptions] = useState(true);

  const enableReferenceOptionsFetch = useCallback(() => {
    setShouldLoadReferenceOptions(true);
  }, []);

  const enableProductOptionsFetch = useCallback(() => {
    setShouldLoadProductOptions(true);
  }, []);

  // Fetch full quotation data with items when editing
  const { data: fullQuotationData, isLoading: isLoadingQuotation, isFetching: isFetchingQuotation } = useQuotation(
    quotation?.id ?? "",
    { enabled: open && isEdit && !!quotation?.id }
  );

  const selectedQuotation = fullQuotationData?.data ?? quotation ?? null;
  const referenceOptionsEnabled = open && shouldLoadReferenceOptions;
  const productOptionsEnabled = open && shouldLoadProductOptions;

  const customerCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "customers"],
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
      selectedQuotation?.customer?.id && selectedQuotation.customer.name
        ? [
            {
              value: selectedQuotation.customer.id,
              label: selectedQuotation.customer.code
                ? `${selectedQuotation.customer.code} - ${selectedQuotation.customer.name}`
                : selectedQuotation.customer.name,
            },
          ]
        : undefined,
  });

  const paymentTermsCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "payment-terms"],
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
      selectedQuotation?.payment_terms?.id && selectedQuotation.payment_terms.name
        ? {
            value: selectedQuotation.payment_terms.id,
            label: selectedQuotation.payment_terms.name,
          }
        : null,
      customerDefaultPins.paymentTerm,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const businessUnitCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "business-units"],
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
      selectedQuotation?.business_unit?.id && selectedQuotation.business_unit.name
        ? [{ value: selectedQuotation.business_unit.id, label: selectedQuotation.business_unit.name }]
        : undefined,
  });

  const businessTypeCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "business-types"],
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
      selectedQuotation?.business_type?.id && selectedQuotation.business_type.name
        ? { value: selectedQuotation.business_type.id, label: selectedQuotation.business_type.name }
        : null,
      customerDefaultPins.businessType,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const employeeCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "employees"],
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
      selectedQuotation?.sales_rep?.id && selectedQuotation.sales_rep.name
        ? {
            value: selectedQuotation.sales_rep.id,
            label: `${selectedQuotation.sales_rep.employee_code} - ${selectedQuotation.sales_rep.name}`,
          }
        : null,
      customerDefaultPins.salesRep,
    ].filter((option): option is { value: string; label: string } => option !== null),
  });

  const productCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "quotation", "products"],
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
      selectedQuotation?.items?.length
        ? selectedQuotation.items
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
    () => sortOptions(productCombobox.items, (a) => (a.code ? `${a.code} - ${a.name}` : a.name)),
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

  const employees = useMemo(
    () => sortOptions(employeeCombobox.items, (a) => `${a.employee_code} - ${a.name}`),
    [employeeCombobox.items],
  );

  const customers = useMemo(
    () => sortOptions(customerCombobox.items, (a) => `${a.code} - ${a.name}`),
    [customerCombobox.items],
  );

  const schema = isEdit ? getUpdateQuotationSchema(t) : getQuotationSchema(t);
  const formResolver = zodResolver(schema as any) as Resolver<CreateQuotationFormData | UpdateQuotationFormData>;

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
          customer_contact_id: quotation.customer_contact_id ?? undefined,
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
          customer_id: "",
          payment_terms_id: "",
          sales_rep_id: "",
          business_unit_id: "",
          customer_contact_id: "",
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
    { enabled: open && shouldLoadReferenceOptions && !!watchedCustomerId }
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
  } | null) => {
    if (!customer) {
      setValue("customer_name", "", { shouldValidate: true });
      setValue("customer_contact_id", "", { shouldValidate: true });
      setValue("customer_contact", "", { shouldValidate: true });
      setValue("customer_email", "", { shouldValidate: true });
      setValue("customer_phone", "", { shouldValidate: true });
      return;
    }

    // Do not overwrite values already chosen by user (e.g. contact selected from combobox).
    // Only populate defaults for empty fields.
    const currentCustomerName = (getValues("customer_name") ?? "").trim();
    const currentCustomerContact = (getValues("customer_contact") ?? "").trim();
    const currentCustomerEmail = (getValues("customer_email") ?? "").trim();
    const currentCustomerPhone = (getValues("customer_phone") ?? "").trim();

    if (!currentCustomerName) {
      setValue("customer_name", customer.name ?? "", { shouldValidate: true });
    }
    if (!currentCustomerContact) {
      setValue("customer_contact", customer.contact_person ?? "", { shouldValidate: true });
    }
    if (!currentCustomerEmail) {
      setValue("customer_email", customer.email ?? "", { shouldValidate: true });
    }
    if (!currentCustomerPhone) {
      setValue("customer_phone", customer.phone_numbers?.[0]?.phone_number ?? "", { shouldValidate: true });
    }

    if (!(getValues("business_type_id") ?? "") && customer.default_business_type_id) {
      setValue("business_type_id", customer.default_business_type_id, { shouldValidate: true });
    }
    if (!(getValues("payment_terms_id") ?? "") && customer.default_payment_terms_id) {
      setValue("payment_terms_id", customer.default_payment_terms_id, { shouldValidate: true });
    }
    if (!(getValues("sales_rep_id") ?? "") && customer.default_sales_rep_id) {
      setValue("sales_rep_id", customer.default_sales_rep_id, { shouldValidate: true });
    }
    if (getValues("tax_rate") == null && customer.default_tax_rate != null) {
      setValue("tax_rate", customer.default_tax_rate, { shouldValidate: true });
    }
  }, [getValues, setValue]);

  useEffect(() => {
    if (!watchedCustomerId) {
      setCustomerDefaultPins({ paymentTerm: null, businessType: null, salesRep: null });
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
      salesRep: detailCustomer.default_sales_rep?.id
        ? {
            value: detailCustomer.default_sales_rep.id,
            label: `${detailCustomer.default_sales_rep.employee_code} - ${detailCustomer.default_sales_rep.name}`,
          }
        : null,
    });

    applyCustomerDefaults(detailCustomer);
  }, [watchedCustomerId, selectedCustomerData?.data, applyCustomerDefaults]);

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
      setSelectedContactId("");
      return;
    }

    // For edit mode: wait until fullQuotationData is available
    if (isEdit) {
      if (fullQuotationData?.data) {
        const quotationData = fullQuotationData.data;
        setSelectedContactId(quotationData.customer_contact_id ?? "");
        
        // Small delay to ensure form is mounted
        setTimeout(() => {
          reset({
            quotation_date: quotationData.quotation_date,
            valid_until: quotationData.valid_until ?? undefined,
            customer_id: quotationData.customer_id ?? "",
            payment_terms_id: quotationData.payment_terms_id ?? "",
            sales_rep_id: quotationData.sales_rep_id ?? "",
            business_unit_id: quotationData.business_unit_id ?? "",
            business_type_id: quotationData.business_type_id ?? undefined,
            customer_name: quotationData.customer_name ?? "",
            customer_contact_id: quotationData.customer_contact_id ?? undefined,
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
        setSelectedContactId("");
      } catch {
        // Invalid cache, use defaults
        reset({
          quotation_date: new Date().toISOString().split("T")[0],
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          customer_id: "",
          payment_terms_id: "",
          sales_rep_id: "",
          business_unit_id: "",
          customer_contact_id: "",
          customer_name: "",
          customer_contact: "",
          customer_phone: "",
          customer_email: "",
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
        });
        setSelectedContactId("");
      }
    } else {
      reset({
        quotation_date: new Date().toISOString().split("T")[0],
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        customer_id: "",
        payment_terms_id: "",
        sales_rep_id: "",
        business_unit_id: "",
        customer_contact_id: "",
        customer_name: "",
        customer_contact: "",
        customer_phone: "",
        customer_email: "",
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0 }],
      });
      setSelectedContactId("");
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
          data: {
            ...data,
            customer_id: toOptionalString(data.customer_id),
            valid_until: toOptionalString(data.valid_until),
            payment_terms_id: toOptionalString(data.payment_terms_id),
            sales_rep_id: toOptionalString(data.sales_rep_id),
            business_unit_id: toOptionalString(data.business_unit_id),
            business_type_id: toOptionalString(data.business_type_id),
            customer_contact_id: toOptionalString(data.customer_contact_id),
            customer_name: toOptionalString(data.customer_name),
            customer_contact: toOptionalString(data.customer_contact),
            customer_phone: toOptionalString(data.customer_phone),
            customer_email: toOptionalString(data.customer_email),
            notes: toOptionalString(data.notes),
            items: filteredItems,
          },
        });
        toast.success(t("updated"));
      } else {
        await createQuotation.mutateAsync({
          ...data,
          customer_id: toOptionalString(data.customer_id),
          valid_until: toOptionalString(data.valid_until),
          payment_terms_id: toOptionalString(data.payment_terms_id) || "",
          sales_rep_id: toOptionalString(data.sales_rep_id) || "",
          business_unit_id: toOptionalString(data.business_unit_id) || "",
          business_type_id: toOptionalString(data.business_type_id),
          customer_contact_id: toOptionalString(data.customer_contact_id),
          customer_name: toOptionalString(data.customer_name),
          customer_contact: toOptionalString(data.customer_contact),
          customer_phone: toOptionalString(data.customer_phone),
          customer_email: toOptionalString(data.customer_email),
          notes: toOptionalString(data.notes),
          items: filteredItems,
        } as CreateQuotationFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save quotation:", error);
      toast.error(getSalesErrorMessage(error, t("common.error")));
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
    setCustomerDefaultPins({ paymentTerm: null, businessType: null, salesRep: null });
    setSelectedContactId("");

    // Customer changed manually by user: reset snapshot fields first so
    // defaults from the newly selected customer can be applied.
    setValue("customer_contact_id", "", { shouldValidate: true });
    setValue("customer_name", "", { shouldValidate: true });
    setValue("customer_contact", "", { shouldValidate: true });
    setValue("customer_phone", "", { shouldValidate: true });
    setValue("customer_email", "", { shouldValidate: true });

    const customer = customers.find((c) => c.id === customerId);
    applyCustomerDefaults(customer ?? null);
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);
    setValue("customer_contact_id", contactId, { shouldValidate: true });

    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) {
      return;
    }

    setValue("customer_contact", contact.name, { shouldValidate: true });
    setValue("customer_phone", contact.phone ?? "", { shouldValidate: true });
    setValue("customer_email", contact.email ?? "", { shouldValidate: true });
  };

  const isLoading = createQuotation.isPending || updateQuotation.isPending;
  const isFormLoading = isEdit && (isLoadingQuotation || isFetchingQuotation) && !fullQuotationData?.data;

  // ─── Quick-create (Odoo-style inline creation from combobox) ───────────────
  type QuickCreateType =
    | "paymentTerm"
    | "businessUnit"
    | "businessType"
    | "customer"
    | "contact"
    | "product"
    | "employee"
    | null;

  const [quickCreate, setQuickCreate] = useState<{
    type: QuickCreateType;
    query: string;
    itemIndex?: number;
  }>({ type: null, query: "" });

  const openQuickCreate = useCallback(
    (type: QuickCreateType, initialName?: string, itemIndex?: number) =>
      setQuickCreate({ type, query: initialName?.trim() ?? "", itemIndex }),
    [],
  );

  const closeQuickCreate = useCallback(
    () => setQuickCreate({ type: null, query: "" }),
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
      setValue("customer_contact_id", "", { shouldValidate: true });
      setValue("customer_contact", "", { shouldValidate: true });
      setValue("customer_phone", "", { shouldValidate: true });
      setValue("customer_email", "", { shouldValidate: true });
      setSelectedContactId("");
      closeQuickCreate();
    },
    [setValue, closeQuickCreate],
  );

  const handleContactCreated = useCallback(
    (item: { id: string; name: string; phone?: string; email?: string }) => {
      setSelectedContactId(item.id);
      setValue("customer_contact_id", item.id, { shouldValidate: true });
      setValue("customer_contact", item.name, { shouldValidate: true });
      setValue("customer_phone", item.phone ?? "", { shouldValidate: true });
      setValue("customer_email", item.email ?? "", { shouldValidate: true });
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
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateQuotationFormData | keyof UpdateQuotationFormData]
    );

    if (basicError) {
      setActiveTab("basic");
      setTimeout(() => {
        toast.error(
          getFirstFormErrorMessage(errors) ||
          t("common.validationError") ||
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
    products,
    paymentTerms,
    businessUnits,
    businessTypes,
    employees,
    customers,
    contacts,
    selectedContactId,
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
    handleContactChange,
    handleDialogChange,
    onInvalid,
    // Quick-create state & handlers
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
    handleProductCreated,
    handleEmployeeCreated,
    customerCombobox,
    paymentTermsCombobox,
    employeeCombobox,
    businessUnitCombobox,
    businessTypeCombobox,
    productCombobox,
  };
}
