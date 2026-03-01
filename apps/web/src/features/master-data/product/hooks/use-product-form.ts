import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateProduct, useUpdateProduct } from "./use-products";
import { useProductBrands } from "./use-product-brands";
import { useProductSegments } from "./use-product-segments";
import { useProductTypes } from "./use-product-types";
import { useUnitsOfMeasure } from "./use-units-of-measure";
import { usePackagings } from "./use-packagings";
import { useProcurementTypes } from "./use-procurement-types";
import { productSchema, type ProductFormData } from "../components/product/product.schema";
import type { Product } from "../types";
import { sortOptions } from "@/lib/utils";

export interface UseProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Product | null;
  onCreated?: (item: { id: string; name: string }) => void;
}

export function useProductForm({ open, onOpenChange, editingItem, onCreated }: UseProductFormProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  // Fetch Lookup Data conditionally when form is open
  const fetchOptions = { enabled: open };
  
  const { data: brandsData } = useProductBrands({ per_page: 100, sort: "name" }, fetchOptions);
  const { data: segmentsData } = useProductSegments({ per_page: 100, sort: "name" }, fetchOptions);
  const { data: typesData } = useProductTypes({ per_page: 100, sort: "name" }, fetchOptions);
  const { data: uomsData } = useUnitsOfMeasure({ per_page: 100, sort: "name" }, fetchOptions);
  const { data: packagingsData } = usePackagings({ per_page: 100, sort: "name" }, fetchOptions);
  const { data: procurementTypesData } = useProcurementTypes({ per_page: 100, sort: "name" }, fetchOptions);

  const brands = sortOptions(brandsData?.data ?? [], (i) => i.name);
  const segments = sortOptions(segmentsData?.data ?? [], (i) => i.name);
  const types = sortOptions(typesData?.data ?? [], (i) => i.name);
  const uoms = sortOptions(uomsData?.data ?? [], (i) => i.name);
  const packagings = sortOptions(packagingsData?.data ?? [], (i) => i.name);
  const procurementTypes = sortOptions(procurementTypesData?.data ?? [], (i) => i.name);

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      code: "",
      image_url: null,
      manufacturer_part_number: "",
      description: "",
      category_id: undefined,
      brand_id: undefined,
      segment_id: undefined,
      type_id: undefined,
      uom_id: undefined,
      purchase_uom_id: undefined,
      packaging_id: null,
      purchase_uom_conversion: 1,
      procurement_type_id: undefined,
      supplier_id: undefined,
      business_unit_id: undefined,
      tax_type: "",
      is_tax_inclusive: true,
      lead_time_days: 0,
      cost_price: 0,
      min_stock: 0,
      max_stock: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          code: editingItem.code,
          image_url: editingItem.image_url,
          manufacturer_part_number: editingItem.manufacturer_part_number ?? "",
          description: editingItem.description ?? "",
          category_id: editingItem.category_id ?? "",
          brand_id: editingItem.brand_id ?? "",
          segment_id: editingItem.segment_id ?? "",
          type_id: editingItem.type_id ?? "",
          uom_id: editingItem.uom_id ?? "",
          purchase_uom_id: editingItem.purchase_uom_id ?? "",
          packaging_id: editingItem.packaging_id ?? null,
          purchase_uom_conversion: editingItem.purchase_uom_conversion,
          procurement_type_id: editingItem.procurement_type_id ?? "",
          supplier_id: editingItem.supplier_id ?? "",
          business_unit_id: editingItem.business_unit_id ?? "",
          tax_type: editingItem.tax_type ?? "",
          is_tax_inclusive: editingItem.is_tax_inclusive,
          lead_time_days: editingItem.lead_time_days,
          cost_price: editingItem.cost_price,
          min_stock: editingItem.min_stock,
          max_stock: editingItem.max_stock,
        });
      } else {
        form.reset({
          name: "",
          code: "",
          image_url: null,
          manufacturer_part_number: "",
          description: "",
          category_id: undefined,
          brand_id: undefined, 
          segment_id: undefined, 
          type_id: undefined, 
          uom_id: undefined, 
          purchase_uom_id: undefined, 
          packaging_id: null,
          purchase_uom_conversion: 1,
          procurement_type_id: undefined,
          supplier_id: undefined,
          business_unit_id: undefined,
          tax_type: "",
          is_tax_inclusive: true,
          lead_time_days: 0,
          cost_price: 0,
          min_stock: 0,
          max_stock: 0,
        });
      }
    }
  }, [open, editingItem, form]);

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    try {
      const payload = {
        ...data,
        code: data.code ?? "",
        image_url: data.image_url ?? undefined, 
        category_id: data.category_id || null,
        brand_id: data.brand_id || null,
        segment_id: data.segment_id || null,
        type_id: data.type_id || null,
        uom_id: data.uom_id || null,
        purchase_uom_id: data.purchase_uom_id || null,
        packaging_id: data.packaging_id || null,
        procurement_type_id: data.procurement_type_id || null,
        supplier_id: data.supplier_id || null,
        business_unit_id: data.business_unit_id || null,
        tax_type: data.tax_type || undefined,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        toast.success(t("updated", { fallback: "Product updated successfully" }));
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast.success(t("created", { fallback: "Product created successfully" }));
        onCreated?.({ id: result.data.id, name: result.data.name });
      }
      onOpenChange(false);
    } catch (error) {
      let errorMessage = isEditing ? tCommon("error") : tCommon("error");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { 
          response?: { 
            data?: { 
              error?: { 
                message?: string;
                details?: { error_id?: string };
              } 
            } 
          } 
        };
        const apiMessage = axiosError.response?.data?.error?.message;
        const errorId = axiosError.response?.data?.error?.details?.error_id;
        if (errorId && errorId !== "") {
          errorMessage = errorId;
        } else if (apiMessage) {
          errorMessage = apiMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  return {
    form,
    t,
    tCommon,
    isEditing,
    isSubmitting,
    brands,
    segments,
    types,
    uoms,
    packagings,
    procurementTypes,
    onSubmit: form.handleSubmit(onSubmit),
  };
}
