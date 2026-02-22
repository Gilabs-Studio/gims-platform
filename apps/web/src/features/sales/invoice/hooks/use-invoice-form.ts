import { useState, useEffect, useMemo } from "react";
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
import { useCreateInvoice, useUpdateInvoice, useInvoice } from "../hooks/use-invoices";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useOrders } from "@/features/sales/order/hooks/use-orders";
import type { CustomerInvoice } from "../types";
import { sortOptions } from "@/lib/utils";

const STORAGE_KEY = "invoice_form_cache";

export interface UseInvoiceFormProps {
  invoice?: CustomerInvoice | null;
  open: boolean;
  onClose: () => void;
}

export function useInvoiceForm({ invoice, open, onClose }: UseInvoiceFormProps) {
  const isEdit = !!invoice;
  const t = useTranslations("invoice");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full invoice data with items when editing
  const { data: fullInvoiceData, isLoading: isLoadingInvoice, isFetching: isFetchingInvoice } = useInvoice(
    invoice?.id ?? "",
    { enabled: open && isEdit && !!invoice?.id }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true }, { enabled: open });
  const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 }, { enabled: open });
  const { data: ordersData } = useOrders({ per_page: 100, status: "approved" }, { enabled: open });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

  const paymentTerms = useMemo(() => {
    const data = paymentTermsData?.data ?? [];
    return sortOptions(data, (a) => a.code ? `${a.code} - ${a.name}` : a.name);
  }, [paymentTermsData?.data]);

  const orders = useMemo(() => {
    const data = ordersData?.data ?? [];
    return sortOptions(data, (a) => a.code);
  }, [ordersData?.data]);

  const schema = isEdit ? getUpdateInvoiceSchema(t) : getInvoiceSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateInvoiceFormData | UpdateInvoiceFormData>;

  const form = useForm<CreateInvoiceFormData | UpdateInvoiceFormData>({
    resolver: formResolver,
    defaultValues: invoice
      ? {
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date ?? undefined,
          type: invoice.type ?? "regular",
          sales_order_id: invoice.sales_order_id ?? undefined,
          payment_terms_id: invoice.payment_terms_id ?? undefined,
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
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
        },
  });

  const {
    handleSubmit,
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
            sales_order_id: invoiceData.sales_order_id ?? undefined,
            payment_terms_id: invoiceData.payment_terms_id ?? undefined,
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
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        // Invalid cache, use defaults
        reset({
          invoice_date: new Date().toISOString().split("T")[0],
          type: "regular",
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
        });
      }
    } else {
      reset({
        invoice_date: new Date().toISOString().split("T")[0],
        type: "regular",
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        items: [{ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 }],
      });
    }
  }, [open, isEdit, fullInvoiceData, reset]);

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
      // Filter out items with empty product_id
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && invoice) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createInvoice.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateInvoiceFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, price: 0, discount: 0, hpp_amount: 0 });
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
  const isFormLoading = isEdit && (isLoadingInvoice || isFetchingInvoice) && !fullInvoiceData?.data;

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
    orders,
    calculations,
    watchedItems,
    taxRate,
    deliveryCost,
    otherCost,
    handleNext,
    handleFormSubmit,
    handleAddItem,
    handleProductChange,
    handleDialogChange,
    onInvalid,
  };
}
