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
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { ChefHat, Plus, Trash2 } from "lucide-react";
import { useCreateProduct, useUpdateProduct, useProducts } from "../../hooks/use-products";
import { useProductCategories } from "../../hooks/use-product-categories";
import { useOutlets } from "@/features/master-data/outlet/hooks/use-outlets";
import { ProductIngredientCreateDialog } from "./product-ingredient-create-dialog";
import type { Product, RecipeItemRequest } from "../../types";

interface ProductFnbCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog operates in edit mode */
  editingItem?: Product | null;
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
  editingItem,
}: ProductFnbCreateDialogProps) {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");
  const tValidation = useTranslations("product.validation");

  const isEditing = !!editingItem;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState("");
  const [posScope, setPosScope] = useState<"none" | "global" | "specific">("global");
  const [outletIds, setOutletIds] = useState<string[]>([]);
  const [outletSearch, setOutletSearch] = useState("");
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState("");
  const [ingredientLoadedPages, setIngredientLoadedPages] = useState(1);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);

  // Inline ingredient creation state
  const [ingredientCreateOpen, setIngredientCreateOpen] = useState(false);
  const [ingredientCreateRowId, setIngredientCreateRowId] = useState<string | null>(null);
  const [ingredientCreateInitialName, setIngredientCreateInitialName] = useState("");
  // Options for newly created ingredients before the query refetches
  const [localIngredientOptions, setLocalIngredientOptions] = useState<Array<{ value: string; label: string }>>([])


  const [nameError, setNameError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [outletError, setOutletError] = useState<string | null>(null);

  const fetchOptions = { enabled: open };
  const { data: categoriesData, isLoading: categoriesLoading } = useProductCategories(
    { per_page: 100, sort: "name", active_only: true },
    fetchOptions
  );
  const { data: outletsData } = useOutlets(
    { per_page: 200, sort_by: "name" },
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

  const outlets = useMemo(
    () => [...(outletsData?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [outletsData?.data]
  );
  const filteredOutlets = useMemo(() => {
    const q = outletSearch.trim().toLowerCase();
    if (!q) {
      return outlets;
    }
    return outlets.filter((o) => o.name.toLowerCase().includes(q));
  }, [outlets, outletSearch]);

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

  const ingredientOptionProducts = useMemo(() => ingredientsData?.data ?? [], [ingredientsData?.data]);

  const ingredientComboboxOptions = useMemo(() => {
    const remote = ingredientOptionProducts.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }));
    // Merge locally created ingredients that are not yet in the remote list
    const localOnly = localIngredientOptions.filter((lo) => !remote.some((r) => r.value === lo.value));
    return [...remote, ...localOnly];
  }, [ingredientOptionProducts, localIngredientOptions]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl(null);
    setSellingPrice(0);
    setCategoryId("");
    setPosScope("global");
    setOutletIds([]);
    setOutletSearch("");
    setIngredientPickerOpen(false);
    setIngredientSearchQuery("");
    setIngredientLoadedPages(1);
    setRecipeRows([]);
    setNameError(null);
    setCategoryError(null);
    setRecipeError(null);
    setOutletError(null);
    setLocalIngredientOptions([]);
    setIngredientCreateOpen(false);
    setIngredientCreateRowId(null);
    setIngredientCreateInitialName("");
  };

  const handleOpenChangeInternal = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when dialog is closed. Do this in the event handler
      // to avoid calling setState synchronously from an effect.
      resetForm();
    }

    onOpenChange(isOpen);
  };

  // Pre-fill form when editing an existing recipe product
  useEffect(() => {
    if (open && editingItem) {
      startTransition(() => {
        setName(editingItem.name ?? "");
        setDescription(editingItem.description ?? "");
        setImageUrl(editingItem.image_url ?? null);
        setSellingPrice(editingItem.selling_price ?? 0);
        setCategoryId(editingItem.category_id ?? "");
        setPosScope((editingItem.pos_scope ?? "global") as "none" | "global" | "specific");
        setOutletIds(editingItem.outlet_ids ?? []);
        // Map existing recipe items to rows
        if (editingItem.recipe_items && editingItem.recipe_items.length > 0) {
          setRecipeRows(
            editingItem.recipe_items.map((ri) => ({
              row_id: crypto.randomUUID(),
              ingredient_product_id: ri.ingredient_product_id ?? "",
              ingredient_name: ri.ingredient?.name ?? "",
              ingredient_code: ri.ingredient?.code ?? "",
              quantity: ri.quantity ?? 1,
              uom_id: ri.uom_id ?? null,
              uom_symbol: ri.uom?.symbol ?? ri.uom?.name ?? "",
              ingredient_cost_price: ri.ingredient?.cost_price ?? 0,
            }))
          );
        }
      });
    }
  }, [open, editingItem]);

  const handleCreateIngredientForRow = (rowId: string, query: string) => {
    setIngredientCreateRowId(rowId);
    setIngredientCreateInitialName(query);
    setIngredientCreateOpen(true);
  };

  const handleIngredientCreated = (item: {
    id: string;
    name: string;
    code: string;
    cost_price: number;
    uom_id: string | null;
    uom_symbol: string;
  }) => {
    // Immediately populate the recipe row that triggered the creation
    if (ingredientCreateRowId) {
      setRecipeRows((prev) =>
        prev.map((row) => {
          if (row.row_id !== ingredientCreateRowId) return row;
          return {
            ...row,
            ingredient_product_id: item.id,
            ingredient_name: item.name,
            ingredient_code: item.code,
            uom_id: item.uom_id,
            uom_symbol: item.uom_symbol,
            ingredient_cost_price: item.cost_price,
          };
        })
      );
      setRecipeError(null);
    }
    // Add to local options so the combobox renders the label immediately
    setLocalIngredientOptions((prev) => [
      ...prev.filter((o) => o.value !== item.id),
      { value: item.id, label: `${item.name} (${item.code})` },
    ]);
    setIngredientCreateOpen(false);
    setIngredientCreateRowId(null);
    setIngredientCreateInitialName("");
  };

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

    if (posScope === "specific" && outletIds.length === 0) {
      setOutletError(tValidation("required"));
      hasError = true;
    } else {
      setOutletError(null);
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
      const payload = {
        code: "",
        name: name.trim(),
        description: description.trim() || undefined,
        image_url: isEditing ? (imageUrl && imageUrl.trim() !== "" ? imageUrl : "") : (imageUrl || undefined),
        category_id: categoryId,
        uom_id: null,
        product_kind: "RECIPE" as const,
        is_ingredient: false,
        is_inventory_tracked: true,
        pos_scope: posScope,
        outlet_ids: posScope === "specific" ? outletIds : [],
        purchase_uom_conversion: 1,
        is_tax_inclusive: true,
        lead_time_days: 0,
        cost_price: recipeTotalCost,
        selling_price: Math.max(0, sellingPrice),
        min_stock: 0,
        max_stock: 0,
        recipe_items: recipeItems,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
        toast.success(tCommon("saved", { fallback: "Saved" }));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("created"));
      }
      handleOpenChangeInternal(false);
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
    <>
      <Dialog open={open} onOpenChange={handleOpenChangeInternal}>
      <DialogContent
        size="2xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-success" />
            {isEditing ? tCommon("edit", { fallback: "Edit" }) + " " + t("createRecipe", { fallback: "Recipe" }) : t("createRecipe")}
          </DialogTitle>
          <DialogDescription>{t("createRecipeDesc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <FieldLabel>{t("image")}</FieldLabel>
                <ImageUpload
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  uploadFolder={isEditing && editingItem?.id ? `products/${editingItem.id}` : "products"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field className="col-span-1 md:col-span-2">
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

                {outlets.length > 0 && (
                  <section className="space-y-2 rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("outletAssignment.hint")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["none", "global", "specific"] as const).map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => {
                            setPosScope(scope);
                            if (scope !== "specific") {
                              setOutletIds([]);
                            }
                            setOutletError(null);
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer",
                            posScope === scope
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-muted-foreground/40"
                          )}
                        >
                          <p className={cn("text-xs font-semibold", posScope === scope ? "text-primary" : "text-foreground")}>
                            {t(`outletAssignment.posScope${scope.charAt(0).toUpperCase()}${scope.slice(1)}` as "outletAssignment.posScopeNone")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t(`outletAssignment.posScope${scope.charAt(0).toUpperCase()}${scope.slice(1)}Desc` as "outletAssignment.posScopeNoneDesc")}
                          </p>
                        </button>
                      ))}
                    </div>

                    {posScope === "specific" && (
                      <div className="rounded-md border">
                        <div className="flex items-center gap-2 px-3 py-2 border-b">
                          <Input
                            value={outletSearch}
                            onChange={(e) => setOutletSearch(e.target.value)}
                            placeholder={t("outletAssignment.searchPlaceholder")}
                            className="h-7 text-xs"
                          />
                          <button
                            type="button"
                            className="shrink-0 text-[10px] text-primary hover:underline cursor-pointer"
                            onClick={() => setOutletIds(filteredOutlets.map((o) => o.id))}
                          >
                            {t("outletAssignment.selectAll")}
                          </button>
                          <span className="text-muted-foreground text-[10px]">·</span>
                          <button
                            type="button"
                            className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => setOutletIds([])}
                          >
                            {t("outletAssignment.clearAll")}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredOutlets.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">{t("outletAssignment.noOutlets")}</p>
                          ) : (
                            filteredOutlets.map((outlet) => {
                              const checked = outletIds.includes(outlet.id);
                              return (
                                <label
                                  key={outlet.id}
                                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 select-none border-b last:border-b-0"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const next = v
                                        ? [...outletIds, outlet.id]
                                        : outletIds.filter((id) => id !== outlet.id);
                                      setOutletIds(next);
                                      setOutletError(null);
                                    }}
                                  />
                                  <span className="text-sm">{outlet.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                    {outletError && <FieldError>{outletError}</FieldError>}
                  </section>
                )}
              </div>
            </div>

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
                            createPermission="product.create"
                            createLabel={t("recipe.createIngredient", { query: "{query}" })}
                            onCreateClick={(query) => handleCreateIngredientForRow(row.row_id, query)}
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
              <ButtonLoading
                loading={createMutation.isPending || updateMutation.isPending}
                loadingText={tCommon("saving")}
              >
                {isEditing ? tCommon("save") : t("createRecipe")}
              </ButtonLoading>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>

      <ProductIngredientCreateDialog
        open={ingredientCreateOpen}
        onOpenChange={setIngredientCreateOpen}
        initialName={ingredientCreateInitialName}
        onCreated={handleIngredientCreated}
      />
    </>
  );
}
