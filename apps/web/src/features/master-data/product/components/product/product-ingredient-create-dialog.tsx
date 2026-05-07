"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/loading";
import { ImageUpload } from "@/components/ui/image-upload";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Separator } from "@/components/ui/separator";
import { Wheat } from "lucide-react";
import { useCreateProduct, useUpdateProduct } from "../../hooks/use-products";
import type { Product } from "../../types";
import { useProductCategories } from "../../hooks/use-product-categories";

import { useUnitsOfMeasure } from "../../hooks/use-units-of-measure";

interface CreatedIngredient {
  id: string;
  name: string;
  code: string;
  cost_price: number;
  uom_id: string | null;
  uom_symbol: string;
}

interface ProductIngredientCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the name field when opening inline from a recipe row */
  initialName?: string;
  /** When provided, the dialog operates in edit mode */
  editingItem?: Product | null;
  onCreated?: (item: CreatedIngredient) => void;
}

export function ProductIngredientCreateDialog({
  open,
  onOpenChange,
  initialName,
  editingItem,
  onCreated,
}: ProductIngredientCreateDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const isEditing = !!editingItem;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [uomId, setUomId] = useState("");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [maxStock, setMaxStock] = useState<number>(0);

  const [nameError, setNameError] = useState<string | null>(null);
  const [uomError, setUomError] = useState<string | null>(null);

  // Sync from editingItem or initialName when dialog opens
  useEffect(() => {
    if (open) {
      startTransition(() => {
        if (editingItem) {
          setName(editingItem.name ?? "");
          setDescription(editingItem.description ?? "");
          setImageUrl(editingItem.image_url ?? null);
          setCategoryId(editingItem.category_id ?? "");
          setUomId(editingItem.uom_id ?? "");
          setCostPrice(editingItem.cost_price ?? 0);
          setMinStock(editingItem.min_stock ?? 0);
          setMaxStock(editingItem.max_stock ?? 0);
        } else if (initialName) {
          setName(initialName);
        }
      });
    }
  }, [open, editingItem, initialName]);

  const fetchOptions = { enabled: open };

  const { data: categoriesData, isLoading: categoriesLoading } = useProductCategories(
    { per_page: 200, sort: "name", active_only: true },
    fetchOptions
  );
  const { data: uomsData } = useUnitsOfMeasure(
    { per_page: 100, sort: "name" },
    fetchOptions
  );

  const categoryOptions = useMemo(
    () =>
      [...(categoriesData?.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [categoriesData?.data]
  );

  const uomOptions = useMemo(
    () => [...(uomsData?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [uomsData?.data]
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl(null);
    setCategoryId("");
    setUomId("");
    setCostPrice(0);
    setMinStock(0);
    setMaxStock(0);
    setNameError(null);
    setUomError(null);
  };

  const handleOpenChangeInternal = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let hasError = false;

    if (!name.trim()) {
      setNameError(tValidation("required"));
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!uomId) {
      setUomError(tValidation("required"));
      hasError = true;
    } else {
      setUomError(null);
    }

    if (hasError) return;

    try {
      let result;
      const payload = {
        code: "",
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl || undefined,
        category_id: categoryId || null,
        uom_id: uomId,
        product_kind: "STOCK" as const,
        is_ingredient: true,
        is_inventory_tracked: true,
        pos_scope: "none" as const,
        purchase_uom_conversion: 1,
        is_tax_inclusive: false,
        lead_time_days: 0,
        cost_price: Math.max(0, costPrice),
        selling_price: 0,
        min_stock: Math.max(0, minStock),
        max_stock: Math.max(0, maxStock),
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        const updated = { ...editingItem, ...payload };
        toast.success(tCommon("saved", { fallback: "Saved" }));
        onCreated?.({
          id: editingItem.id,
          name: updated.name,
          code: updated.code,
          cost_price: updated.cost_price,
          uom_id: updated.uom_id ?? null,
          uom_symbol: updated.uom?.symbol ?? updated.uom?.name ?? "",
        });
      } else {
        result = await createMutation.mutateAsync(payload);
        toast.success(t("created"));
        onCreated?.({
          id: result.data.id,
          name: result.data.name,
          code: result.data.code,
          cost_price: result.data.cost_price,
          uom_id: result.data.uom_id ?? null,
          uom_symbol: result.data.uom?.symbol ?? result.data.uom?.name ?? "",
        });
      }
      handleOpenChangeInternal(false);
    } catch (error) {
      let errorMessage = tCommon("error");

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: { error?: { message?: string; details?: { error_id?: string } } };
          };
        };
        const apiMessage = axiosError.response?.data?.error?.message;
        const errorId = axiosError.response?.data?.error?.details?.error_id;

        if (errorId) {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeInternal}>
      <DialogContent
        size="2xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wheat className="h-4 w-4 text-warning" />
            {isEditing ? tCommon("edit", { fallback: "Edit" }) + " " + t("createIngredient", { fallback: "Ingredient" }) : t("createIngredient")}
          </DialogTitle>
          <DialogDescription>{t("createIngredientDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Basic Info */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <FieldLabel>{t("image")}</FieldLabel>
                <ImageUpload
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  disabled={createMutation.isPending}
                  enableUrlInput
                  enableImageSearch
                  initialSearchQuery={name}
                  labels={{
                    dragActive: tCommon("dragActive"),
                    dragInactive: tCommon("dragInactive"),
                    uploadSuccess: tCommon("uploadSuccess"),
                    uploadFailed: tCommon("uploadFailed"),
                    invalidFile: tCommon("invalidFile"),
                    removeImage: tCommon("removeImage"),
                    pasteImageUrl: t("imageAssist.pasteImageUrl"),
                    imageUrlPlaceholder: t("imageAssist.imageUrlPlaceholder"),
                    applyUrl: t("imageAssist.applyUrl"),
                    searchImage: t("imageAssist.searchImage"),
                    searchPlaceholder: t("imageAssist.searchPlaceholder"),
                    searchButton: t("imageAssist.searchButton"),
                    searchNoResults: t("imageAssist.searchNoResults"),
                    searchFailed: t("imageAssist.searchFailed"),
                    selectFromResults: t("imageAssist.selectFromResults"),
                    attributionPrefix: t("imageAssist.attributionPrefix"),
                    onUnsplash: t("imageAssist.onUnsplash"),
                    termsNotice: t("imageAssist.termsNotice"),
                  }}
                />
              </div>

              <div className="flex-1 space-y-4">
                <Field>
                  <FieldLabel htmlFor="ingredient-name" className="required">
                    {t("form.name")}
                  </FieldLabel>
                  <Input
                    id="ingredient-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder={t("form.name")}
                    disabled={createMutation.isPending}
                  />
                  {nameError && <FieldError>{nameError}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="ingredient-category">
                    {t("form.category")}
                  </FieldLabel>
                  <CreatableCombobox
                    value={categoryId}
                    onValueChange={setCategoryId}
                    options={
                      categoriesLoading
                        ? []
                        : categoryOptions.map((c) => ({ value: c.id, label: c.name }))
                    }
                    placeholder={t("selectCategory")}
                    isLoading={categoriesLoading}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="ingredient-description">
                    {t("form.description")}
                  </FieldLabel>
                  <Textarea
                    id="ingredient-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none"
                    rows={3}
                    placeholder={t("form.description")}
                    disabled={createMutation.isPending}
                  />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Unit & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ingredient-uom" className="required">
                  {t("form.uom")}
                </FieldLabel>
                <CreatableCombobox
                  value={uomId}
                  onValueChange={(val) => {
                    setUomId(val);
                    setUomError(null);
                  }}
                  options={uomOptions.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.symbol})`,
                  }))}
                  placeholder={t("form.uom")}
                />
                {uomError && <FieldError>{uomError}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="ingredient-cost-price">
                  {t("form.costPrice")}
                </FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm z-10">
                    Rp
                  </span>
                  <NumericInput
                    id="ingredient-cost-price"
                    className="pl-9"
                    value={costPrice}
                    onChange={(val) => setCostPrice(Math.max(0, val ?? 0))}
                    disabled={createMutation.isPending}
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="ingredient-min-stock">
                  {t("form.minStock")}
                </FieldLabel>
                <NumericInput
                  id="ingredient-min-stock"
                  value={minStock}
                  onChange={(val) => setMinStock(Math.max(0, val ?? 0))}
                  disabled={createMutation.isPending}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="ingredient-max-stock">
                  {t("form.maxStock")}
                </FieldLabel>
                <NumericInput
                  id="ingredient-max-stock"
                  value={maxStock}
                  onChange={(val) => setMaxStock(Math.max(0, val ?? 0))}
                  disabled={createMutation.isPending}
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChangeInternal(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="cursor-pointer"
            >
              <ButtonLoading loading={createMutation.isPending || updateMutation.isPending} loadingText={tCommon("saving")}>
                {isEditing ? tCommon("save") : t("createIngredient")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
