"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ImageOff,
  ChefHat,
  Package,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { cn, formatCurrency, resolveImageUrl } from "@/lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { useProductRecipe, useUpdateProductRecipe, useProducts } from "../../hooks/use-products";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import type { Product, RecipeItemResponse, RecipeItemRequest } from "../../types";

interface ProductFnbDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

interface EditableRecipeRow {
  row_id: string;
  id?: string;
  ingredient_product_id: string;
  ingredient_name: string;
  ingredient_code: string;
  quantity: number;
  uom_id?: string | null;
  uom_symbol?: string;
  ingredient_cost_price: number;
  cost_contribution: number;
  notes: string;
}

type ActiveTab = "overview" | "recipe";
const INGREDIENT_PAGE_SIZE = 20;

export function ProductFnbDetailDialog({
  open,
  onOpenChange,
  product,
}: ProductFnbDetailDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editRows, setEditRows] = useState<EditableRecipeRow[]>([]);
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState("");
  const [ingredientLoadedPages, setIngredientLoadedPages] = useState(1);

  const canEdit = useUserPermission("product.update");

  const { data: recipeData, isLoading: recipeLoading } = useProductRecipe(
    product?.id ?? "",
    { enabled: open && !!product?.id && activeTab === "recipe" }
  );

  const updateRecipeMutation = useUpdateProductRecipe();

  // Fetch ingredients for the recipe builder
  const ingredientKeyword = ingredientSearchQuery.trim();
  const ingredientPerPage = ingredientLoadedPages * INGREDIENT_PAGE_SIZE;
  const { data: ingredientsData, isLoading: ingredientSearchLoading, isFetching: ingredientFetching } = useProducts(
    {
      page: 1,
      search: ingredientKeyword || undefined,
      is_ingredient: true,
      per_page: ingredientPerPage,
    },
    { enabled: isEditingRecipe && ingredientPickerOpen }
  );

  const recipeItems: RecipeItemResponse[] = recipeData?.data ?? [];

  const totalRecipeCost = recipeItems.reduce(
    (sum, item) => sum + (item.cost_contribution ?? 0),
    0
  );

  const ingredientPagination = ingredientsData?.meta?.pagination;
  const hasMoreIngredients = ingredientPagination?.has_next ?? false;

  const ingredientOptionProducts = useMemo(() => ingredientsData?.data ?? [], [ingredientsData?.data]);

  const ingredientComboboxOptions = useMemo(
    () => ingredientOptionProducts.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [ingredientOptionProducts]
  );

  const handleStartEdit = () => {
    setEditRows(
      recipeItems.map((item) => ({
        row_id: item.id || crypto.randomUUID(),
        id: item.id,
        ingredient_product_id: item.ingredient_product_id,
        ingredient_name: item.ingredient?.name ?? "",
        ingredient_code: item.ingredient?.code ?? "",
        quantity: item.quantity,
        uom_id: item.uom_id,
        uom_symbol: item.uom?.symbol ?? item.uom?.name ?? "",
        ingredient_cost_price: item.ingredient?.cost_price ?? 0,
        cost_contribution: item.cost_contribution,
        notes: item.notes ?? "",
      }))
    );
    setIsEditingRecipe(true);
    setIngredientPickerOpen(false);
    setIngredientSearchQuery("");
    setIngredientLoadedPages(1);
  };

  const handleCancelEdit = () => {
    setIsEditingRecipe(false);
    setEditRows([]);
    setIngredientPickerOpen(false);
    setIngredientSearchQuery("");
    setIngredientLoadedPages(1);
  };

  const handleAddIngredientRow = () => {
    setEditRows((prev) => [
      ...prev,
      {
        row_id: crypto.randomUUID(),
        ingredient_product_id: "",
        ingredient_name: "",
        ingredient_code: "",
        quantity: 1,
        uom_id: null,
        uom_symbol: "",
        ingredient_cost_price: 0,
        cost_contribution: 0,
        notes: "",
      },
    ]);
  };

  const handleIngredientSelected = (rowId: string, ingredientId: string) => {
    const selectedIngredient = ingredientOptionProducts.find((item) => item.id === ingredientId);

    setEditRows((prev) =>
      prev.map((row) => {
        if (row.row_id !== rowId) {
          return row;
        }

        if (!selectedIngredient) {
          return {
            ...row,
            ingredient_product_id: "",
            ingredient_name: "",
            ingredient_code: "",
            uom_id: null,
            uom_symbol: "",
            ingredient_cost_price: 0,
          };
        }

        return {
          ...row,
          ingredient_product_id: selectedIngredient.id,
          ingredient_name: selectedIngredient.name,
          ingredient_code: selectedIngredient.code,
          uom_id: selectedIngredient.uom?.id ?? null,
          uom_symbol: selectedIngredient.uom?.symbol ?? selectedIngredient.uom?.name ?? "",
          ingredient_cost_price: selectedIngredient.cost_price ?? 0,
        };
      })
    );
  };

  const handleIngredientSearchChange = (query: string) => {
    setIngredientSearchQuery(query);
    setIngredientLoadedPages(1);
  };

  const handleIngredientLoadMore = () => {
    if (!hasMoreIngredients || ingredientFetching) {
      return;
    }
    setIngredientLoadedPages((prev) => prev + 1);
  };

  const handleUpdateQty = (index: number, qty: number | undefined) => {
    setEditRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) {
          return r;
        }

        if (qty === undefined || Number.isNaN(qty)) {
          return { ...r, quantity: 0.001 };
        }

        return { ...r, quantity: Math.max(0.001, qty) };
      })
    );
  };

  const handleRemoveRow = (index: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!product) return;

    if (editRows.length === 0) {
      toast.error(t("recipe.requiredForRecipe"));
      return;
    }

    if (editRows.some((row) => !row.ingredient_product_id)) {
      toast.error(t("recipe.selectIngredient"));
      return;
    }

    const items: RecipeItemRequest[] = editRows.map((row, idx) => ({
      ingredient_product_id: row.ingredient_product_id,
      quantity: row.quantity,
      uom_id: row.uom_id,
      notes: row.notes || undefined,
      sort_order: idx,
    }));
    try {
      await updateRecipeMutation.mutateAsync({ id: product.id, items });
      toast.success(t("recipeSaved"));
      setIsEditingRecipe(false);
      setEditRows([]);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0 border-b shrink-0">
          <div className="flex items-start gap-4 pb-3">
            {/* Thumbnail */}
            <div className="h-14 w-14 shrink-0 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              {product.image_url ? (
                <Image
                  src={resolveImageUrl(product.image_url) ?? ""}
                  alt={product.name}
                  width={56}
                  height={56}
                  unoptimized
                  loader={({ src }: { src: string }) => src}
                  className="object-cover w-full h-full"
                />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {product.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.code}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="success" className="h-5 text-[10px] gap-1">
                  <ChefHat className="h-2.5 w-2.5" />
                  {t("fnbProduct")}
                </Badge>
                {product.category && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {product.category.name}
                  </Badge>
                )}
                {!product.is_active && (
                  <Badge variant="inactive" className="h-5 text-[10px]">
                    {tCommon("inactive")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Selling price */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-muted-foreground">{t("form.sellingPrice")}</p>
              <p className="text-base font-bold text-primary">
                {product.selling_price > 0
                  ? formatCurrency(product.selling_price)
                  : "-"}
              </p>
              {totalRecipeCost > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  BOM cost: {formatCurrency(totalRecipeCost)}
                </p>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-0 border-t">
            {(["overview", "recipe"] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium cursor-pointer border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "overview" ? tCommon("overview") : t("recipe.title")}
                {tab === "recipe" && recipeItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                    {recipeItems.length}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("section.classification")}
                </p>
                <InfoRow label={t("form.category")} value={product.category?.name} />
                <InfoRow
                  label={t("form.uom")}
                  value={product.uom ? `${product.uom.name} (${product.uom.symbol})` : undefined}
                />
              </div>

              {/* Pricing */}
              <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("section.unitsPackaging")}
                </p>
                <InfoRow
                  label={t("form.sellingPrice")}
                  value={
                    product.selling_price > 0
                      ? <span className="text-primary font-semibold">{formatCurrency(product.selling_price)}</span>
                      : undefined
                  }
                />
                <InfoRow
                  label={t("form.costPrice")}
                  value={product.cost_price > 0 ? formatCurrency(product.cost_price) : undefined}
                />
                <InfoRow
                  label={t("recipe.bomCost")}
                  value={
                    totalRecipeCost > 0
                      ? <span className="text-warning font-medium">{formatCurrency(totalRecipeCost)}</span>
                      : recipeLoading ? "..." : "-"
                  }
                />
                <InfoRow label={t("taxType")} value={product.tax_type} />
              </div>

              {/* Stock */}
              <div className="rounded-md border bg-muted/20 p-3 md:col-span-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("section.supplyChain")}
                </p>
                <InfoRow
                  label={t("recipe.producibleQuantity")}
                  value={
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {Math.floor(product.producible_quantity ?? 0).toLocaleString("id-ID")}
                      {product.uom && ` ${product.uom.symbol ?? product.uom.name}`}
                    </span>
                  }
                />
                {product.description && (
                  <InfoRow label={t("form.description")} value={product.description} />
                )}
              </div>
            </div>
          )}

          {activeTab === "recipe" && (
            <div className="space-y-4">
              {/* Recipe Header toolbar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{t("recipe.bom")}</h3>
                  <p className="text-xs text-muted-foreground">{t("recipe.bomDescription")}</p>
                </div>
                {canEdit && !isEditingRecipe && (
                  <Button size="sm" variant="outline" className="cursor-pointer" onClick={handleStartEdit}>
                    <ChefHat className="h-3.5 w-3.5 mr-1.5" />
                    {t("recipe.editRecipe")}
                  </Button>
                )}
                {isEditingRecipe && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer text-muted-foreground"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={handleSaveRecipe}
                      disabled={updateRecipeMutation.isPending}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {updateRecipeMutation.isPending ? tCommon("saving") : tCommon("save")}
                    </Button>
                  </div>
                )}
              </div>

              {isEditingRecipe ? (
                <div className="space-y-3">
                  {editRows.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>{t("recipe.empty")}</p>
                      <p className="text-xs mt-1">{t("recipe.searchToAdd")}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-[minmax(0,1fr)_120px_96px_40px] gap-3 px-4 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
                        <span>{t("recipe.ingredient")}</span>
                        <span className="text-right">{t("recipe.quantity")}</span>
                        <span className="text-right">{t("recipe.cost")}</span>
                        <span />
                      </div>

                      {editRows.map((row, idx) => {
                        const rowCost = row.ingredient_cost_price * row.quantity;
                        const ingredientOptionsForRow = ingredientComboboxOptions.filter((option) =>
                          !editRows.some(
                            (editRow, editIndex) => editIndex !== idx && editRow.ingredient_product_id === option.value
                          )
                        );

                        return (
                          <div
                            key={row.row_id}
                            className="grid grid-cols-[minmax(0,1fr)_120px_96px_40px] gap-3 items-center px-4 py-2.5 border-b last:border-b-0"
                          >
                            <div className="min-w-0">
                              <CreatableCombobox
                                value={row.ingredient_product_id || undefined}
                                onValueChange={(value) => handleIngredientSelected(row.row_id, value)}
                                options={ingredientOptionsForRow}
                                placeholder={t("recipe.searchIngredient")}
                                searchPlaceholder={t("recipe.searchIngredients")}
                                emptyText={t("recipe.noIngredients")}
                                isLoading={ingredientSearchLoading && ingredientLoadedPages === 1}
                                onOpenChange={(isOpen) => {
                                  setIngredientPickerOpen(isOpen);
                                  if (!isOpen) {
                                    setIngredientSearchQuery("");
                                    setIngredientLoadedPages(1);
                                  }
                                }}
                                onSearchChange={handleIngredientSearchChange}
                                onLoadMore={handleIngredientLoadMore}
                                hasMore={hasMoreIngredients}
                                isLoadingMore={ingredientFetching && ingredientLoadedPages > 1}
                              />
                            </div>

                            <div className="flex items-center gap-1 justify-end">
                              <NumericInput
                                value={row.quantity}
                                onChange={(value) => handleUpdateQty(idx, value)}
                                className="h-9 w-24 text-right"
                              />
                              {row.uom_symbol && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{row.uom_symbol}</span>
                              )}
                            </div>

                            <div className="h-9 px-3 border rounded-md bg-muted/20 flex items-center justify-end text-sm font-medium">
                              {formatCurrency(rowCost)}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveRow(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full cursor-pointer border-dashed"
                    onClick={handleAddIngredientRow}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("recipe.addIngredient")}
                  </Button>

                  {(ingredientSearchLoading || ingredientFetching) && ingredientLoadedPages === 1 && (
                    <div className="px-1 text-xs text-muted-foreground">{tCommon("loading")}</div>
                  )}
                </div>
              ) : recipeLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_80px_auto] gap-3 px-4 py-2 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
                    <span>{t("recipe.ingredient")}</span>
                    <span className="text-right">{t("recipe.quantity")}</span>
                    <span className="text-right">{t("recipe.cost")}</span>
                    <span />
                  </div>

                  {recipeItems.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>{t("recipe.empty")}</p>
                    </div>
                  ) : (
                    recipeItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_100px_80px_auto] gap-3 items-center px-4 py-2.5 border-b last:border-0 hover:bg-muted/20"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.ingredient?.name ?? item.ingredient_product_id}
                          </p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {item.ingredient?.code}
                          </p>
                        </div>
                        <span className="text-sm text-right">
                          {item.quantity.toLocaleString("id-ID")}
                          {item.uom && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {item.uom.symbol ?? item.uom.name}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground text-right">
                          {item.cost_contribution > 0 ? formatCurrency(item.cost_contribution) : "-"}
                        </span>
                        <span />
                      </div>
                    ))
                  )}

                  {recipeItems.length > 0 && (
                    <div className="grid grid-cols-[1fr_100px_80px_auto] gap-3 items-center px-4 py-2 bg-muted/30 border-t">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t("recipe.total")} ({recipeItems.length} {t("recipe.ingredients")})
                      </span>
                      <span />
                      <span className="text-sm font-semibold text-right">
                        {formatCurrency(totalRecipeCost)}
                      </span>
                      <span />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value ?? "-"}</span>
    </div>
  );
}
