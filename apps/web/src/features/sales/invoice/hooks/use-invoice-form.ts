import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getInvoiceSchema,
  getUpdateInvoiceSchema,
  type CreateInvoiceFormData,
  type UpdateInvoiceFormData,
} from "../schemas/invoice.schema";
import { invoiceService } from "../services/invoice-service";
import { useCreateInvoice, useUpdateInvoice, useInvoice } from "../hooks/use-invoices";
import { useOrder } from "@/features/sales/order/hooks/use-orders";
import { useCustomerInvoiceDPs } from "@/features/sales/customer-invoice-down-payments/hooks/use-customer-invoice-dp";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";
import { productService } from "@/features/master-data/product/services/product-service";
import { paymentTermsService } from "@/features/master-data/payment-and-couriers/payment-terms/services/payment-terms-service";
import { orderService } from "@/features/sales/order/services/order-service";
import type { CreateCustomerInvoiceData, CustomerInvoice, CustomerInvoiceJournalPreviewResponse, UpdateCustomerInvoiceData } from "../types";
import { sortOptions } from "@/lib/utils";
import { getFirstFormErrorMessage, getSalesErrorMessage, toOptionalString } from "../../utils/error-utils";

const STORAGE_KEY = "invoice_form_cache";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuidLike = (value: string | undefined | null): boolean => UUID_REGEX.test((value ?? "").trim());

function getAppliedDownPaymentAmount(dp: { amount?: number; remaining_amount?: number | null }): number {
  const amount = dp.amount ?? 0;
  const remaining = dp.remaining_amount ?? amount;
  return Math.max(0, amount - remaining);
}

export interface UseInvoiceFormProps {
  invoice?: CustomerInvoice | null;
  open: boolean;
  onClose: () => void;
  defaultSalesOrderId?: string;
  defaultDeliveryOrderId?: string;
}

export function useInvoiceForm({ invoice, open, onClose, defaultSalesOrderId, defaultDeliveryOrderId }: UseInvoiceFormProps) {
  const isEdit = !!invoice;
  const t = useTranslations("invoice");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const [journalPreview, setJournalPreview] = useState<CustomerInvoiceJournalPreviewResponse["data"] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);
  const [shouldLoadReferenceOptions, setShouldLoadReferenceOptions] = useState(true);
  const [shouldLoadProductOptions, setShouldLoadProductOptions] = useState(true);
  const [isDefaultSalesOrderPrefillReady, setIsDefaultSalesOrderPrefillReady] = useState(!defaultSalesOrderId);

  type QuickCreateType = "paymentTerm" | null;
  const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
  const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
  const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

  const enableReferenceOptionsFetch = useCallback(() => {
    setShouldLoadReferenceOptions(true);
  }, []);

  const enableProductOptionsFetch = useCallback(() => {
    setShouldLoadProductOptions(true);
  }, []);

  // Fetch full invoice data with items when editing
  const { data: fullInvoiceData, isLoading: isLoadingInvoice, isFetching: isFetchingInvoice } = useInvoice(
    invoice?.id ?? "",
    { enabled: open && isEdit && !!invoice?.id }
  );

  const selectedInvoice = fullInvoiceData?.data ?? invoice ?? null;
  const referenceOptionsEnabled = open && shouldLoadReferenceOptions;
  const productOptionsEnabled = open && shouldLoadProductOptions;

  const productsCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "invoice", "products"],
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
      selectedInvoice?.items?.length
        ? selectedInvoice.items
            .filter((item) => item.product?.id)
            .map((item) => ({
              value: item.product_id,
              label: item.product?.code
                ? `${item.product.code} - ${item.product.name}`
                : item.product?.name ?? item.product_id,
            }))
        : undefined,
  });

  const paymentTermsCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "invoice", "payment-terms"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      paymentTermsService.list({
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
      selectedInvoice?.payment_terms?.id
        ? [
            {
              value: selectedInvoice.payment_terms.id,
              label: selectedInvoice.payment_terms.code
                ? `${selectedInvoice.payment_terms.code} - ${selectedInvoice.payment_terms.name}`
                : selectedInvoice.payment_terms.name,
            },
          ]
        : undefined,
  });

  const ordersCombobox = usePaginatedComboboxOptions({
    queryKey: ["sales", "invoice", "orders"],
    queryFn: (params: { page: number; per_page: number; search?: string }) =>
      orderService.list({
        ...params,
        status: "approved",
        available_for_invoice: true,
        sort_by: "order_date",
        sort_dir: "desc",
      }),
    mapOption: (item) => ({
      value: item.id,
      label: item.code,
    }),
    enabled: referenceOptionsEnabled,
    pinnedOptions:
      selectedInvoice?.sales_order?.id
        ? [{ value: selectedInvoice.sales_order.id, label: selectedInvoice.sales_order.code }]
        : undefined,
  });

  useEffect(() => {
    if (!open) {
      setIsDefaultSalesOrderPrefillReady(!defaultSalesOrderId);
      return;
    }

    setIsDefaultSalesOrderPrefillReady(!defaultSalesOrderId);
    setShouldLoadReferenceOptions(true);
    setShouldLoadProductOptions(true);
  }, [open, defaultSalesOrderId]);

  const products = useMemo(
    () => sortOptions(productsCombobox.items, (a) => `${a.code} - ${a.name}`),
    [productsCombobox.items],
  );

  const paymentTerms = useMemo(
    () => sortOptions(paymentTermsCombobox.items, (a) => a.name),
    [paymentTermsCombobox.items],
  );

  const orders = useMemo(
    () => sortOptions(ordersCombobox.items, (a) => a.code),
    [ordersCombobox.items],
  );


  const schema = isEdit ? getUpdateInvoiceSchema(t) : getInvoiceSchema(t);
  const formResolver = zodResolver(schema) as unknown as Resolver<CreateInvoiceFormData | UpdateInvoiceFormData>;

  const form = useForm<CreateInvoiceFormData | UpdateInvoiceFormData>({
    resolver: formResolver,
    defaultValues: invoice
      ? {
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date ?? undefined,
          type: invoice.type ?? "regular",
          sales_order_id: invoice.sales_order_id ?? undefined,
          payment_terms_id: invoice.payment_terms_id ?? "",
          tax_rate: invoice.tax_rate ?? 11,
          delivery_cost: invoice.delivery_cost ?? 0,
          other_cost: invoice.other_cost ?? 0,
          notes: invoice.notes ?? "",
          items:
            invoice.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount ?? 0,
              hpp_amount: item.hpp_amount ?? 0,
            })) ?? [],
        }
      : {
          invoice_date: new Date().toISOString().split("T")[0],
          type: "regular",
          sales_order_id: defaultSalesOrderId ?? "",
          delivery_order_id: defaultDeliveryOrderId ?? undefined,
          due_date: "",
          payment_terms_id: "",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: defaultSalesOrderId
            ? []
            : [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
        },
  });

  const {
    setValue,
    control,
    reset,
    trigger,
    getValues,
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  // Watch sales_order_id to auto-fill related fields (create mode only)
  const watchedSalesOrderId = useWatch({ control, name: "sales_order_id" });
  const lastAutoFilledSORef = useRef<string | undefined>(undefined);
  const hasAutoPopulatedRef = useRef(false);

  const {
    data: selectedOrderData,
    isLoading: isLoadingSelectedOrder,
    isFetching: isFetchingSelectedOrder,
    isFetched: isSelectedOrderFetched,
    isError: isSelectedOrderError,
  } = useOrder(watchedSalesOrderId ?? "", {
    enabled: !isEdit && open && !!watchedSalesOrderId,
  });

  // Fetch DP invoices linked to the selected SO for DP detection
  const { data: dpInvoicesData } = useCustomerInvoiceDPs(
    { sales_order_id: watchedSalesOrderId ?? "", per_page: 100 },
    { enabled: open && !!watchedSalesOrderId },
  );

  // Compute detected down payments and financial summary
  const detectedDownPayments = useMemo(() => {
    const list = dpInvoicesData?.data ?? [];
    // Only include paid/partial DPs with collected amount.
    return list.filter((dp) => {
      const status = (dp.status ?? "").toLowerCase();
      const paidAmount = getAppliedDownPaymentAmount(dp);
      return (status === "paid" || status === "partial") && paidAmount > 0;
    });
  }, [dpInvoicesData?.data]);

  const dpSummary = useMemo(() => {
    const totalDP = detectedDownPayments.reduce((sum, dp) => sum + getAppliedDownPaymentAmount(dp), 0);
    const orderTotal = selectedOrderData?.data?.total_amount ?? 0;
    const amountDue = Math.max(0, orderTotal - totalDP);
    return { totalDP, orderTotal, amountDue };
  }, [detectedDownPayments, selectedOrderData?.data?.total_amount]);

  const selectedDownPaymentInvoiceID = useMemo(() => {
    if (detectedDownPayments.length === 0) {
      return undefined;
    }

    const sorted = [...detectedDownPayments].sort((a, b) => {
      const dateA = new Date(a.invoice_date ?? "").getTime();
      const dateB = new Date(b.invoice_date ?? "").getTime();

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return getAppliedDownPaymentAmount(b) - getAppliedDownPaymentAmount(a);
    });

    return sorted[0]?.id;
  }, [detectedDownPayments]);

  const buildCreatePayload = useCallback(
    (data: CreateInvoiceFormData | UpdateInvoiceFormData): CreateCustomerInvoiceData => ({
      ...data,
      invoice_date: data.invoice_date ?? new Date().toISOString().split("T")[0],
      due_date: toOptionalString(data.due_date),
      sales_order_id: toOptionalString(data.sales_order_id),
      delivery_order_id: toOptionalString(data.delivery_order_id),
      payment_terms_id: toOptionalString(data.payment_terms_id),
      down_payment_invoice_id: data.type === "regular" ? selectedDownPaymentInvoiceID : undefined,
      notes: toOptionalString(data.notes),
      items: (data.items ?? []).filter((item) => item.product_id),
    }),
    [selectedDownPaymentInvoiceID]
  );

  const buildUpdatePayload = useCallback(
    (data: CreateInvoiceFormData | UpdateInvoiceFormData): UpdateCustomerInvoiceData => ({
      invoice_date: data.invoice_date,
      due_date: toOptionalString(data.due_date),
      type: data.type,
      payment_terms_id: toOptionalString(data.payment_terms_id),
      tax_rate: data.tax_rate,
      delivery_cost: data.delivery_cost,
      other_cost: data.other_cost,
      notes: toOptionalString(data.notes),
      items: (data.items ?? []).filter((item) => item.product_id),
    }),
    []
  );

  // Auto-fill payment terms + items from selected SO
  useEffect(() => {
    if (isEdit || !open || !watchedSalesOrderId) return;
    if (lastAutoFilledSORef.current === watchedSalesOrderId) return;
    if (!selectedOrderData?.data) return;

    const order = selectedOrderData.data;
    lastAutoFilledSORef.current = watchedSalesOrderId;

    if (order.payment_terms_id) {
      setValue("payment_terms_id", order.payment_terms_id);
    }
    if (order.tax_rate != null) {
      setValue("tax_rate", order.tax_rate);
    }
    if (order.delivery_cost != null) {
      setValue("delivery_cost", order.delivery_cost);
    }
    if (order.items && order.items.length > 0) {
      const normalizedItems = order.items.map((item) => {
        const candidate = (item.product_id ?? "").trim();
        const fallback = (item.product?.id ?? "").trim();
        const resolvedProductId: string = isUuidLike(candidate) ? candidate : (isUuidLike(fallback) ? fallback : "");

        return {
          product_id: resolvedProductId,
          sales_order_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount ?? 0,
          hpp_amount: 0,
        };
      });

      replace(normalizedItems);

      hasAutoPopulatedRef.current = true;
    }

    if (defaultSalesOrderId && watchedSalesOrderId === defaultSalesOrderId) {
      setIsDefaultSalesOrderPrefillReady(true);
    }
  }, [isEdit, open, watchedSalesOrderId, selectedOrderData, setValue, replace, defaultSalesOrderId]);

  useEffect(() => {
    if (isEdit || !open || !defaultSalesOrderId) return;
    if ((watchedSalesOrderId ?? "") !== defaultSalesOrderId) return;

    if (selectedOrderData?.data || isSelectedOrderError || isSelectedOrderFetched) {
      setIsDefaultSalesOrderPrefillReady(true);
    }
  }, [
    defaultSalesOrderId,
    isEdit,
    isSelectedOrderError,
    isSelectedOrderFetched,
    open,
    selectedOrderData?.data,
    watchedSalesOrderId,
  ]);

  // Watch form values for calculations
  const watchedItems = useWatch({ control, name: "items" });
  const taxRate = useWatch({ control, name: "tax_rate" }) ?? 11;
  const deliveryCost = useWatch({ control, name: "delivery_cost" }) ?? 0;
  const otherCost = useWatch({ control, name: "other_cost" }) ?? 0;

  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalHpp = 0;
    if (watchedItems) {
      watchedItems.forEach((item) => {
        if (item?.product_id && item?.quantity && item?.price) {
          const itemSubtotal = (item.price * item.quantity) - (item.discount ?? 0);
          subtotal += itemSubtotal;
          totalHpp += (item.hpp_amount ?? 0) * item.quantity;
        }
      });
    }

    const taxAmount = subtotal * ((taxRate ?? 11) / 100);
    const total = subtotal + taxAmount + deliveryCost + otherCost;
    const grossProfit = subtotal - totalHpp;

    return {
      subtotal,
      taxAmount,
      total,
      totalHpp,
      grossProfit,
    };
  }, [watchedItems, taxRate, deliveryCost, otherCost]);

  // Reset form when invoice data changes (for edit mode)
  useEffect(() => {
    // Only run when modal is open
    if (!open) {
      // Clear cache when dialog closes
      localStorage.removeItem(STORAGE_KEY);
      lastAutoFilledSORef.current = undefined;
      hasAutoPopulatedRef.current = false;
      return;
    }

    // Avoid overwriting auto-populated data with defaults in create mode
    if (!isEdit && hasAutoPopulatedRef.current) {
      return;
    }

    // For edit mode: wait until fullInvoiceData is available
    if (isEdit) {
      if (fullInvoiceData?.data) {
        const invoiceData = fullInvoiceData.data;
        
        // Small delay to ensure form is mounted
        setTimeout(() => {
          reset({
            invoice_date: invoiceData.invoice_date,
            due_date: invoiceData.due_date ?? undefined,
            type: invoiceData.type ?? "regular",
            sales_order_id: invoiceData.sales_order_id ?? "",
            payment_terms_id: invoiceData.payment_terms_id ?? "",
            tax_rate: invoiceData.tax_rate ?? 11,
            delivery_cost: invoiceData.delivery_cost ?? 0,
            other_cost: invoiceData.other_cost ?? 0,
            notes: invoiceData.notes ?? "",
            items:
              invoiceData.items?.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount ?? 0,
                hpp_amount: item.hpp_amount ?? 0,
              })) ?? [],
          });
        }, 10);
      }
      return;
    }

    // For create mode: load from localStorage or use defaults
    const cached = !defaultSalesOrderId ? localStorage.getItem(STORAGE_KEY) : null;
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        // Invalid cache, use defaults
        reset({
          invoice_date: new Date().toISOString().split("T")[0],
          type: "regular",
          sales_order_id: defaultSalesOrderId ?? "",
          due_date: "",
          payment_terms_id: "",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: defaultSalesOrderId
            ? []
            : [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
        });
      }
    } else {
      reset({
        invoice_date: new Date().toISOString().split("T")[0],
        type: "regular",
        sales_order_id: defaultSalesOrderId ?? "",
        delivery_order_id: defaultDeliveryOrderId ?? undefined,
        due_date: "",
        payment_terms_id: "",
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        items: defaultSalesOrderId
          ? []
          : [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
      });
    }
  }, [open, isEdit, fullInvoiceData, reset, defaultSalesOrderId, defaultDeliveryOrderId]);

  const saveToLocalStorage = (data: CreateInvoiceFormData | UpdateInvoiceFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "invoice_date",
        "due_date",
        "type",
        "sales_order_id",
        "payment_terms_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "notes",
      ];

      const isValid = await Promise.all(
        basicFields.map((field) =>
          trigger(field as keyof CreateInvoiceFormData)
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
    data: CreateInvoiceFormData | UpdateInvoiceFormData
  ) => {
    if (!isEdit && defaultSalesOrderId && !isDefaultSalesOrderPrefillReady) {
      toast.error("Sales order is still loading. Please wait a moment.");
      return;
    }

    const invalidItemProductIds = (data.items ?? [])
      .map((item, index) => ({ index, product_id: item.product_id }))
      .filter((item) => !isUuidLike(item.product_id));

    if (invalidItemProductIds.length > 0) {
      toast.error("Invalid product ID detected in invoice items. Check browser console for details.");
      return;
    }

    // Check if we're on items tab but have errors in basic fields
    if (activeTab === "items") {
      const basicFields = [
        "invoice_date",
        "due_date",
        "type",
        "sales_order_id",
        "payment_terms_id",
        "tax_rate",
        "delivery_cost",
        "other_cost",
        "notes",
      ];

      // Trigger validation for basic fields first
      const isBasicValid = await trigger(basicFields as Extract<keyof CreateInvoiceFormData, string>[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      if (isEdit && invoice) {
        const updatePayload = buildUpdatePayload(data);
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: updatePayload,
        });
        toast.success(t("updated"));
      } else {
        const createPayload = buildCreatePayload(data);
        await createInvoice.mutateAsync(createPayload);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(getSalesErrorMessage(error, t("common.error")));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 });
  };

  const handlePreviewJournal = async () => {
    if (isEdit) {
      toast.error("Journal preview is available for new invoices only.");
      return;
    }

    try {
      setIsPreviewing(true);
      const previewResponse = await invoiceService.preview(buildCreatePayload(getValues() as CreateInvoiceFormData));
      setJournalPreview(previewResponse.data);
      toast.success("Journal preview generated.");
    } catch (error) {
      toast.error(getSalesErrorMessage(error, t("common.error")));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.price`, product.selling_price, { shouldValidate: true });
      setValue(`items.${index}.hpp_amount`, product.current_hpp ?? 0, { shouldValidate: true });
    }
  };

  const isLoading = createInvoice.isPending || updateInvoice.isPending;
  const isWaitingDefaultSalesOrderPrefill =
    !isEdit &&
    !!defaultSalesOrderId &&
    !isDefaultSalesOrderPrefillReady &&
    (isLoadingSelectedOrder || isFetchingSelectedOrder);
  const isFormLoading = (
    isEdit && (isLoadingInvoice || isFetchingInvoice) && !fullInvoiceData?.data
  ) || isWaitingDefaultSalesOrderPrefill;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateInvoiceFormData | UpdateInvoiceFormData>) => {
    const basicFields = [
      "invoice_date",
      "due_date",
      "type",
      "sales_order_id",
      "payment_terms_id",
      "tax_rate",
      "delivery_cost",
      "other_cost",
      "notes",
    ];

    // Check if any basic field has an error
    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateInvoiceFormData | keyof UpdateInvoiceFormData]
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

  const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
    form.setValue("payment_terms_id", item.id, { shouldValidate: true });
    closeQuickCreate();
  }, [closeQuickCreate, form]);

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
    orders,
    calculations,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handlePreviewJournal,
    handleProductChange,
    handleDialogChange,
    onInvalid,
    quickCreate,
    openQuickCreate,
    closeQuickCreate,
    enableReferenceOptionsFetch,
    enableProductOptionsFetch,
    handlePaymentTermCreated,
    detectedDownPayments,
    dpSummary,
    productsCombobox,
    paymentTermsCombobox,
    ordersCombobox,
    journalPreview,
    isPreviewing,
  };
}
