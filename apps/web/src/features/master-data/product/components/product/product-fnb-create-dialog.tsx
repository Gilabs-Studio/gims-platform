"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ChefHat, Plus, Trash2 } from "lucide-react";
import { useCreateProduct, useProducts } from "../../hooks/use-products";
import { useProductCategories } from "../../hooks/use-product-categories";
import { useUnitsOfMeasure } from "../../hooks/use-units-of-measure";
import type { Product, RecipeItemRequest } from "../../types";

interface ProductFnbCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RecipeRow {
  row_id: string;
  ingredient_product_id: string;
  ingredient_name: string;
  ingredient_code: string;
  quantity: number;
  uom_id?: string | null;
  uom_symbol?: string;
  ingredient_cost_price: number;
}

const MIN_RECIPE_QTY = 0.001;
const INGREDIENT_PAGE_SIZE = 20;

function createRecipeRow(): RecipeRow {
  return {
    row_id: crypto.randomUUID(),
    ingredient_product_id: "",
    ingredient_name: "",
    ingredient_code: "",
    quantity: 1,
    uom_id: null,
    uom_symbol: "",
    ingredient_cost_price: 0,
  };
}

export function ProductFnbCreateDialog({
  open,
  onOpenChange,
}: ProductFnbCreateDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const createMutation = useCreateProduct();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState("");
  const [uomId, setUomId] = useState("");
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState("");
  const [ingredientLoadedPages, setIngredientLoadedPages] = useState(1);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  const fetchOptions = { enabled: open };
  const { data: categoriesData, isLoading: categoriesLoading } = useProductCategories(
    { per_page: 100, sort: "name" },
    fetchOptions
  );
  const { data: uomsData } = useUnitsOfMeasure(
    { per_page: 100, sort: "name" },
    fetchOptions
  );

  const ingredientKeyword = ingredientSearchQuery.trim();
  const ingredientPerPage = ingredientLoadedPages * INGREDIENT_PAGE_SIZE;
  const { data: ingredientsData, isLoading: ingredientLoading, isFetching: ingredientFetching } = useProducts(
    {
      page: 1,
      search: ingredientKeyword || undefined,
      is_ingredient: true,
      per_page: ingredientPerPage,
    },
    { enabled: open && ingredientPickerOpen }
  );

  const fnbCategories = useMemo(
    () =>
      [...(categoriesData?.data ?? [])]
        .filter((item) => item.category_type === "FNB")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoriesData?.data]
  );

  const uomOptions = useMemo(
    () => [...(uomsData?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [uomsData?.data]
  );

  const recipeTotalCost = useMemo(
    () =>
      recipeRows.reduce(
        (sum, item) => sum + item.ingredient_cost_price * item.quantity,
        0
      ),
    [recipeRows]
  );

  const ingredientPagination = ingredientsData?.meta?.pagination;
  const hasMoreIngredients = ingredientPagination?.has_next ?? false;

  const ingredientOptionProducts = ingredientsData?.data ?? [];

  const ingredientComboboxOptions = useMemo(
    () => ingredientOptionProducts.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [ingredientOptionProducts]
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setSellingPrice(0);
    setCategoryId("");
    setUomId("");
    setIngredientPickerOpen(false);
    setIngredientSearchQuery("");
    setIngredientLoadedPages(1);
    setRecipeRows([]);
    setNameError(null);
    setCategoryError(null);
    setRecipeError(null);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleAddIngredientRow = () => {
    setRecipeRows((prev) => [
      ...prev,
      createRecipeRow(),
    ]);
    setRecipeError(null);
  };

  const handleIngredientSelected = (rowId: string, ingredientId: string) => {
    const selectedIngredient = ingredientOptionProducts.find((item) => item.id === ingredientId);

    setRecipeRows((prev) =>
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

    setRecipeError(null);
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

  const handleUpdateQuantity = (index: number, value: number | undefined) => {
    setRecipeRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (value === undefined || Number.isNaN(value)) {
          return { ...row, quantity: MIN_RECIPE_QTY };
        }

        return {
          ...row,
          quantity: Math.max(MIN_RECIPE_QTY, value),
        };
      })
    );
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
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

    if (!categoryId) {
      setCategoryError(tValidation("required"));
      hasError = true;
    } else {
      setCategoryError(null);
    }

    if (recipeRows.length === 0) {
      setRecipeError(t("recipe.requiredForRecipe"));
      hasError = true;
    } else if (recipeRows.some((item) => !item.ingredient_product_id)) {
      setRecipeError(t("recipe.selectIngredient"));
      hasError = true;
    } else {
      setRecipeError(null);
    }

    if (hasError) {
      return;
    }

    const recipeItems: RecipeItemRequest[] = recipeRows.map((item, index) => ({
      ingredient_product_id: item.ingredient_product_id,
      quantity: item.quantity,
      uom_id: item.uom_id,
      sort_order: index,
    }));

    try {
      await createMutation.mutateAsync({
        code: "",
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        uom_id: uomId || null,
        product_kind: "RECIPE",
        is_ingredient: false,
        is_inventory_tracked: true,
        is_pos_available: true,
        purchase_uom_conversion: 1,
        is_tax_inclusive: true,
        lead_time_days: 0,
        cost_price: recipeTotalCost,
        selling_price: Math.max(0, sellingPrice),
        min_stock: 0,
        max_stock: 0,
        recipe_items: recipeItems,
      });

      toast.success(t("created"));
      onOpenChange(false);
    } catch (error) {
      let errorMessage = tCommon("error");

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            data?: {
              error?: {
                message?: string;
                details?: { error_id?: string };
              };
            };
          };
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-success" />
            {t("createRecipe")}
          </DialogTitle>
          <DialogDescription>{t("createRecipeDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="fnb-product-name" className="required">
                  {t("form.name")}
                </FieldLabel>
                <Input
                  id="fnb-product-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError(null);
                  }}
                  placeholder={t("form.name")}
                />
                {nameError && <FieldError>{nameError}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="fnb-product-category" className="required">
                  {t("form.category")}
                </FieldLabel>
                <Select
                  value={categoryId || undefined}
                  onValueChange={(value) => {
                    setCategoryId(value);
                    setCategoryError(null);
                  }}
                >
                  <SelectTrigger id="fnb-product-category" className="cursor-pointer">
                    <SelectValue placeholder={tCommon("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {tCommon("loading")}
                      </div>
                    ) : fnbCategories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {tCommon("noData")}
                      </div>
                    ) : (
                      fnbCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {categoryError && <FieldError>{categoryError}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="fnb-product-selling-price">
                  {t("form.sellingPrice")}
                </FieldLabel>
                <NumericInput
                  id="fnb-product-selling-price"
                  value={sellingPrice}
                  onChange={(value) => setSellingPrice(Math.max(0, value ?? 0))}
                  placeholder="0"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fnb-product-uom">{t("form.uom")}</FieldLabel>
                <Select
                  value={uomId || "none"}
                  onValueChange={(value) => setUomId(value === "none" ? "" : value)}
                >
                  <SelectTrigger id="fnb-product-uom" className="cursor-pointer">
                    <SelectValue placeholder={t("form.uom")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {uomOptions.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name} ({uom.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="fnb-product-description">{t("form.description")}</FieldLabel>
              <Textarea
                id="fnb-product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="resize-none"
                rows={3}
                placeholder={t("form.description")}
              />
            </Field>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("recipe.title")}</h3>
                <span className="text-xs text-muted-foreground">
                  {recipeRows.length} {t("recipe.ingredients")}
                </span>
              </div>

              {recipeRows.length === 0 ? (
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

                  {recipeRows.map((row, index) => {
                    const rowCost = row.ingredient_cost_price * row.quantity;
                    const ingredientOptionsForRow = ingredientComboboxOptions.filter((option) =>
                      !recipeRows.some(
                        (recipeRow, recipeRowIndex) =>
                          recipeRowIndex !== index && recipeRow.ingredient_product_id === option.value
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
                            isLoading={ingredientLoading && ingredientLoadedPages === 1}
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
                            onChange={(value) => handleUpdateQuantity(index, value)}
                            className="h-9 w-24 text-right"
                          />
                          {row.uom_symbol && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {row.uom_symbol}
                            </span>
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
                          onClick={() => handleRemoveIngredient(index)}
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
                onClick={handleAddIngredientRow}
                className="w-full cursor-pointer border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("recipe.addIngredient")}
              </Button>

              {recipeError && <FieldError>{recipeError}</FieldError>}

              <div className="rounded-md border bg-muted/20 px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("recipe.total")}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(recipeTotalCost)}
                </span>
              </div>
            </section>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="cursor-pointer"
            >
              <ButtonLoading
                loading={createMutation.isPending}
                loadingText={tCommon("saving")}
              >
                {t("createRecipe")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
