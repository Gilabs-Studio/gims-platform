"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTreePicker } from "@/components/ui/category-tree-picker";
import {
  useCreateProduct,
  useUpdateProduct,
} from "../../hooks/use-products";
import { useProductBrands } from "../../hooks/use-product-brands";
import { useProductSegments } from "../../hooks/use-product-segments";
import { useProductTypes } from "../../hooks/use-product-types";
import { useUnitsOfMeasure } from "../../hooks/use-units-of-measure";
import { usePackagings } from "../../hooks/use-packagings";
import { useProcurementTypes } from "../../hooks/use-procurement-types";

import type { Product } from "../../types";
import { productSchema, type ProductFormData } from "./product.schema";

// Section component for grouping form fields
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Product | null;
}

export function ProductDialog({
  open,
  onOpenChange,
  editingItem,
}: ProductDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  // Fetch Lookup Data (removed categories - now using CategoryTreePicker)
  const { data: brands } = useProductBrands({ per_page: 100, sort: "name" });
  const { data: segments } = useProductSegments({ per_page: 100, sort: "name" });
  const { data: types } = useProductTypes({ per_page: 100, sort: "name" });
  const { data: uoms } = useUnitsOfMeasure({ per_page: 100, sort: "name" });
  const { data: packagings } = usePackagings({ per_page: 100, sort: "name" });
  const { data: procurementTypes } = useProcurementTypes({ per_page: 100, sort: "name" });

  const isEditing = !!editingItem;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      code: "",
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
        reset({
          name: editingItem.name,
          code: editingItem.code,
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
        reset({
          name: "",
          code: "",
          manufacturer_part_number: "",
          description: "",
          category_id: undefined, // Or "" if we prefer controlled empty
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
  }, [open, editingItem, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const payload = {
        ...data,
        code: data.code ?? "",
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

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        toast.success(t("updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("created"));
      }
      onOpenChange(false);
    } catch (error) {
      // Extract error message from API response
      let errorMessage = isEditing ? tCommon("error") : "Failed to create product";
      
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
        // Check both message and details.error_id (where backend puts actual error)
        const apiMessage = axiosError.response?.data?.error?.message;
        const errorId = axiosError.response?.data?.error?.details?.error_id;
        if (errorId && errorId !== "") {
          errorMessage = errorId; // This contains the actual database/validation error
        } else if (apiMessage) {
          errorMessage = apiMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const isTaxInclusive = watch("is_tax_inclusive");

  // Watch IDs for Select values
  const categoryId = watch("category_id");
  const brandId = watch("brand_id");
  const segmentId = watch("segment_id");
  const typeId = watch("type_id");
  const uomId = watch("uom_id");
  const purchaseUomId = watch("purchase_uom_id");
  const packagingId = watch("packaging_id");
  const procurementTypeId = watch("procurement_type_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{isEditing ? t("edit") : t("create")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 space-y-6">
            {/* Basic Information */}
            <Section title="Basic Information">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="required">{t("form.name")}</FieldLabel>
                  <Input placeholder="Product Name" {...register("name")} />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
              </div>
              <Field>
                <FieldLabel>Manufacturer Part Number</FieldLabel>
                <Input
                  placeholder="MPN (optional)"
                  {...register("manufacturer_part_number")}
                />
              </Field>
              <Field>
                <FieldLabel>{t("form.description")}</FieldLabel>
                <Textarea
                  placeholder="Product description"
                  className="resize-none"
                  rows={3}
                  {...register("description")}
                />
              </Field>
            </Section>

            <Separator />

            {/* Classification */}
            <Section title="Classification">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t("form.category")}</FieldLabel>
                  <CategoryTreePicker
                    value={categoryId ?? null}
                    onChange={(id) => setValue("category_id", id ?? undefined)}
                    placeholder="Select Category..."
                    showProductCount
                    clearable
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.brand")}</FieldLabel>
                  <Select
                    value={brandId ?? ""}
                    onValueChange={(val) => setValue("brand_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("form.segment")}</FieldLabel>
                  <Select
                    value={segmentId ?? ""}
                    onValueChange={(val) => setValue("segment_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t("form.type")}</FieldLabel>
                  <Select
                    value={typeId ?? ""}
                    onValueChange={(val) => setValue("type_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Units & Packaging */}
            <Section title="Units & Packaging">
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>{t("form.uom")}</FieldLabel>
                  <Select
                    value={uomId ?? ""}
                    onValueChange={(val) => setValue("uom_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Base Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Purchase UoM</FieldLabel>
                  <Select
                    value={purchaseUomId ?? ""}
                    onValueChange={(val) => setValue("purchase_uom_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Purchase Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Conversion</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    {...register("purchase_uom_conversion", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Units per purchase
                  </p>
                </Field>
              </div>
              <Field>
                <FieldLabel>{t("form.packaging")}</FieldLabel>
                <Select
                  value={packagingId ?? "none"}
                  onValueChange={(val) =>
                    setValue("packaging_id", val === "none" ? null : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {packagings?.data?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Separator />

            {/* Supply Chain */}
            <Section title="Supply Chain">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Procurement Type</FieldLabel>
                  <Select
                    value={procurementTypeId ?? ""}
                    onValueChange={(val) => setValue("procurement_type_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {procurementTypes?.data?.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Lead Time (Days)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("lead_time_days", { valueAsNumber: true })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Tax Type</FieldLabel>
                  <Select
                    value={watch("tax_type")}
                    onValueChange={(val) => setValue("tax_type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Tax" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPN">PPN (11%)</SelectItem>
                      <SelectItem value="PPH">PPH</SelectItem>
                      <SelectItem value="NONE">No Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  orientation="horizontal"
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <FieldLabel className="text-sm">Tax Inclusive</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      Price includes tax
                    </p>
                  </div>
                  <Switch
                    checked={isTaxInclusive}
                    onCheckedChange={(val) => setValue("is_tax_inclusive", val)}
                  />
                </Field>
              </div>
            </Section>

            <Separator />

            {/* Pricing & Stock */}
            <Section title="Pricing & Stock">
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel className="required">{t("form.costPrice")}</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                      Rp
                    </span>
                    <Input
                      className="pl-9"
                      type="number"
                      placeholder="0"
                      {...register("cost_price", { valueAsNumber: true })}
                    />
                  </div>
                  {errors.cost_price && (
                    <FieldError>{errors.cost_price.message}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel>{t("form.minStock")}</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("min_stock", { valueAsNumber: true })}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("form.maxStock")}</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("max_stock", { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </Section>

            <Separator />

          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
