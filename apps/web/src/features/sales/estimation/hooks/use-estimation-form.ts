import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import type { Resolver, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getEstimationSchema,
  getUpdateEstimationSchema,
  type CreateEstimationFormData,
  type UpdateEstimationFormData,
} from "../schemas/estimation.schema";
import { useCreateEstimation, useUpdateEstimation, useEstimation } from "../hooks/use-estimations";
import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useBusinessTypes } from "@/features/master-data/organization/hooks/use-business-types";
import { useEmployees } from "@/features/master-data/employee/hooks/use-employees";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import type { SalesEstimation } from "../types";
import { sortOptions } from "@/lib/utils";

const STORAGE_KEY = "estimation_form_cache";

export interface UseEstimationFormProps {
  estimation?: SalesEstimation | null;
  open: boolean;
  onClose: () => void;
}

export function useEstimationForm({ estimation, open, onClose }: UseEstimationFormProps) {
  const isEdit = !!estimation;
  const t = useTranslations("estimation");
  const createEstimation = useCreateEstimation();
  const updateEstimation = useUpdateEstimation();
  
  const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
  const [isValidating, setIsValidating] = useState(false);

  // Fetch full estimation data when editing
  const { data: fullEstimationData, isLoading: isLoadingEstimation, isFetching: isFetchingEstimation } = useEstimation(
    estimation?.id ?? "",
    { enabled: open && isEdit && !!estimation?.id }
  );

  // Fetch lookup data
  const { data: productsData } = useProducts({ per_page: 100, is_approved: true }, { enabled: open });
  const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 }, { enabled: open });
  const { data: businessTypesData } = useBusinessTypes({ per_page: 100 }, { enabled: open });
  const { data: employeesData } = useEmployees({ per_page: 100 }, { enabled: open });
  const { data: areasData } = useAreas({ per_page: 100 });

  const products = useMemo(() => {
    const data = productsData?.data ?? [];
    return sortOptions(data, (a) => `${a.code} - ${a.name}`);
  }, [productsData?.data]);

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

  const areas = useMemo(() => {
    const data = areasData?.data ?? [];
    return sortOptions(data, (a) => a.name);
  }, [areasData?.data]);

  const schema = isEdit ? getUpdateEstimationSchema(t) : getEstimationSchema(t);
  const formResolver = zodResolver(schema) as Resolver<CreateEstimationFormData | UpdateEstimationFormData>;

  const form = useForm<CreateEstimationFormData | UpdateEstimationFormData>({
    resolver: formResolver,
    defaultValues: estimation
      ? {
          estimation_date: estimation.estimation_date,
          customer_name: estimation.customer_name,
          customer_contact: estimation.customer_contact ?? "",
          customer_email: estimation.customer_email ?? "",
          customer_phone: estimation.customer_phone ?? "",
          expected_close_date: estimation.expected_close_date ?? undefined,
          probability: estimation.probability ?? 50,
          area_id: estimation.area_id ?? undefined,
          sales_rep_id: estimation.sales_rep_id ?? "",
          business_unit_id: estimation.business_unit_id ?? "",
          business_type_id: estimation.business_type_id ?? undefined,
          tax_rate: estimation.tax_rate ?? 11,
          delivery_cost: estimation.delivery_cost ?? 0,
          other_cost: estimation.other_cost ?? 0,
          discount_amount: estimation.discount_amount ?? 0,
          notes: estimation.notes ?? "",
          items:
            estimation.items?.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              estimated_price: item.estimated_price,
              discount: item.discount ?? 0,
              notes: item.notes ?? "",
            })) ?? [],
        }
      : {
          estimation_date: new Date().toISOString().split("T")[0],
          probability: 50,
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
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
  const discountAmount = useWatch({ control, name: "discount_amount" }) ?? 0;

  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    if (watchedItems) {
      watchedItems.forEach((item) => {
        if (item?.product_id && item?.quantity && item?.estimated_price) {
          const itemSubtotal = (item.estimated_price * item.quantity) - (item.discount ?? 0);
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

  // Reset form when estimation data changes
  useEffect(() => {
    if (!open) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (isEdit) {
      if (fullEstimationData?.data) {
        const estimationData = fullEstimationData.data;
        
        setTimeout(() => {
          reset({
            estimation_date: estimationData.estimation_date,
            customer_name: estimationData.customer_name,
            customer_contact: estimationData.customer_contact ?? "",
            customer_email: estimationData.customer_email ?? "",
            customer_phone: estimationData.customer_phone ?? "",
            expected_close_date: estimationData.expected_close_date ?? undefined,
            probability: estimationData.probability ?? 50,
            area_id: estimationData.area_id ?? undefined,
            sales_rep_id: estimationData.sales_rep_id ?? "",
            business_unit_id: estimationData.business_unit_id ?? "",
            business_type_id: estimationData.business_type_id ?? undefined,
            tax_rate: estimationData.tax_rate ?? 11,
            delivery_cost: estimationData.delivery_cost ?? 0,
            other_cost: estimationData.other_cost ?? 0,
            discount_amount: estimationData.discount_amount ?? 0,
            notes: estimationData.notes ?? "",
            items:
              estimationData.items?.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                estimated_price: item.estimated_price,
                discount: item.discount ?? 0,
                notes: item.notes ?? "",
              })) ?? [],
          });
        }, 10);
      }
      return;
    }

    // For create mode
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        reset(parsedData);
      } catch {
        reset({
          estimation_date: new Date().toISOString().split("T")[0],
          probability: 50,
          tax_rate: 11,
          delivery_cost: 0,
          other_cost: 0,
          discount_amount: 0,
          items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
        });
      }
    } else {
      reset({
        estimation_date: new Date().toISOString().split("T")[0],
        probability: 50,
        tax_rate: 11,
        delivery_cost: 0,
        other_cost: 0,
        discount_amount: 0,
        items: [{ product_id: "", quantity: 1, estimated_price: 0, discount: 0 }],
      });
    }
  }, [open, isEdit, fullEstimationData, reset]);

  const saveToLocalStorage = (data: CreateEstimationFormData | UpdateEstimationFormData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const handleNext = async () => {
    setIsValidating(true);
    try {
      const basicFields = [
        "estimation_date",
        "customer_name",
        "customer_contact",
        "customer_email",
        "customer_phone",
        "expected_close_date",
        "probability",
        "area_id",
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
          trigger(field as keyof (CreateEstimationFormData | UpdateEstimationFormData))
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
    data: CreateEstimationFormData | UpdateEstimationFormData
  ) => {
    if (activeTab === "items") {
      const basicFields = [
        "estimation_date",
        "customer_name",
        "sales_rep_id",
        "business_unit_id",
      ];

      const isBasicValid = await trigger(basicFields as (keyof CreateEstimationFormData)[]);

      if (!isBasicValid) {
        setActiveTab("basic");
        toast.error(t("common.validationError") || "Please fill all required fields in General tab");
        return;
      }
    }

    try {
      const filteredItems = (data.items ?? []).filter((item) => item.product_id);
      
      if (isEdit && estimation) {
        await updateEstimation.mutateAsync({
          id: estimation.id,
          data: { ...data, items: filteredItems },
        });
        toast.success(t("updated"));
      } else {
        await createEstimation.mutateAsync({
          ...data,
          items: filteredItems,
        } as CreateEstimationFormData);
        toast.success(t("created"));
      }
      localStorage.removeItem(STORAGE_KEY);
      onClose();
    } catch (error) {
      console.error("Failed to save estimation:", error);
      toast.error(t("common.error"));
    }
  };

  const handleAddItem = () => {
    append({ product_id: "", quantity: 1, estimated_price: 0, discount: 0 });
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId, { shouldValidate: true });
      setValue(`items.${index}.estimated_price`, product.selling_price, { shouldValidate: true });
    }
  };

  const isLoading = createEstimation.isPending || updateEstimation.isPending;
  const isFormLoading = isEdit && (isLoadingEstimation || isFetchingEstimation) && !fullEstimationData?.data;

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveTab("basic");
    }
    onClose();
  };

  const onInvalid = (errors: FieldErrors<CreateEstimationFormData | UpdateEstimationFormData>) => {
    const basicFields = [
      "estimation_date",
      "customer_name",
      "customer_contact",
      "customer_email",
      "customer_phone",
      "sales_rep_id",
      "business_unit_id",
    ];

    const basicError = basicFields.some((field) => 
      errors[field as keyof CreateEstimationFormData | keyof UpdateEstimationFormData]
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
    businessUnits,
    businessTypes,
    employees,
    areas,
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
    handleDialogChange,
    onInvalid,
  };
}
