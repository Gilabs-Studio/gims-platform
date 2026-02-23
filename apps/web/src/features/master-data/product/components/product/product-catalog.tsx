"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  PanelLeftClose,
  PanelLeft,
  Pencil,
  Power,
  ImageOff,
  Folder,
  FolderOpen,
  ArrowUpDown,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// ScrollArea intentionally removed — not used in this component
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTree } from "@/components/ui/category-tree";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermission } from "@/hooks/use-user-permission";
// CategoryTreePicker not used here
import { 
  useCategoryTree, 
  useCategoryTreeState, 
  getCategoryPath 
} from "../../hooks/use-category-tree";
import { useProducts, useDeleteProduct, useUpdateProduct } from "../../hooks/use-products";
import type { Product, CategoryTreeNode } from "../../types";
import { ProductDialog } from "./product-dialog";
import { ProductDetailDialog } from "./product-detail-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { toast } from "sonner";
// DropdownMenu components not used here

/**
 * ProductCatalog - Enhanced product list with category tree sidebar
 * 
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  🔍 Search products...                              [Filters] [+]  │
 * ├─────────────────┬───────────────────────────────────────────────────┤
 * │  📂 Categories  │  Products (Filtered by category)                 │
 * │                 │                                                   │
 * │  ▶ Electronics  │  [Product Grid / Table]                          │
 * │  ▼ Food & Bev   │                                                   │
 * │    ├─ Beverages │                                                   │
 * │    └─ Snacks    │                                                   │
 * │  ▶ Fashion      │                                                   │
 * └─────────────────┴───────────────────────────────────────────────────┘
 */

interface CollapsedCategoryViewProps {
  data: CategoryTreeNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isLoading: boolean;
}

function CollapsedCategoryView({ data, selectedId, onSelect, isLoading }: CollapsedCategoryViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 p-2 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
    );
  }

  // Helper to check if a node is active or an ancestor of selected node
  const isActive = (node: CategoryTreeNode) => {
    if (!selectedId) return false;
    if (selectedId === node.id) return true;
    
    // Check children recursively if needed, but getCategoryPath is better if we had access to full tree context easily
    // For visual simplicity in collapsed view, we just highlight if exact match or if it's a known parent
    // But without full path lookup here, exact match is safest or broad check
    // Let's stick to exact match or checking if node contains selectedId in its subtree
    const containsSelected = (n: CategoryTreeNode): boolean => {
       if (n.id === selectedId) return true;
       return n.children?.some(containsSelected) ?? false;
    };
    return containsSelected(node);
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4 overflow-y-auto w-full">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-md mb-2 cursor-pointer",
                selectedId === null && "bg-accent text-accent-foreground"
              )}
              onClick={() => onSelect(null)}
            >
              <span className="text-xs font-bold">ALL</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span className="font-medium">All Products</span>
          </TooltipContent>
        </Tooltip>

        {data.map((node) => {
          const active = isActive(node);
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-md cursor-pointer relative",
                    active && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:text-primary-foreground"
                  )}
                  onClick={() => onSelect(node.id)}
                >
                  {active ? (
                    <FolderOpen className="h-5 w-5 fill-current" />
                  ) : (
                    <Folder className="h-5 w-5 fill-current/20" />
                  )}
                  {/* Dot indicator if selected is deeper in this tree but not this exact node */}
                  {active && node.id !== selectedId && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full ring-1 ring-background" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{node.name}</p>
                {node.product_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {node.product_count.toLocaleString()} products
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

export function ProductCatalog() {
  const t = useTranslations("product.transaction");
  const tCommon = useTranslations("product.common");

  // Permissions
  const canCreate = useUserPermission("product.create");
  const canEdit = useUserPermission("product.update");

  // Search & sort state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const [sortOption, setSortOption] = useState<string>("name_asc");

  // Derive sort_by / sort_dir from sortOption
  const SORT_MAP: Record<string, { sort_by: string; sort_dir: string }> = {
    name_asc:    { sort_by: "name",          sort_dir: "asc" },
    name_desc:   { sort_by: "name",          sort_dir: "desc" },
    price_asc:   { sort_by: "selling_price", sort_dir: "asc" },
    price_desc:  { sort_by: "selling_price", sort_dir: "desc" },
    stock_asc:   { sort_by: "current_stock", sort_dir: "asc" },
    stock_desc:  { sort_by: "current_stock", sort_dir: "desc" },
  };
  const { sort_by, sort_dir } = SORT_MAP[sortOption] ?? SORT_MAP.name_asc;

  // Category tree state
  const { data: treeData, isLoading: treeLoading } = useCategoryTree({ include_count: true });
  const {
    expandedIds,
    selectedId: selectedCategoryId,
    toggleExpanded,
    selectCategory,
    prefetchChildren,
  } = useCategoryTreeState();

  // Sidebar visibility state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mutations
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();

  // Fetch products with server-side sort + filters
  const { data: productsData, isLoading: productsLoading, isError, refetch } = useProducts({
    page,
    per_page: 20,
    search: debouncedSearch || undefined,
    category_id: selectedCategoryId ?? undefined,
    sort_by,
    sort_dir,
  });

  const pagination = productsData?.meta?.pagination;
  const products = productsData?.data ?? [];

  // Derives a stock status for visual badge on card
  const getStockStatus = (product: Product): "ok" | "low" | "out" | "over" => {
    const qty = product.current_stock ?? 0;
    const min = product.min_stock ?? 0;
    const max = product.max_stock ?? 0;
    if (qty <= 0)           return "out";
    if (min > 0 && qty < min) return "low";
    if (max > 0 && qty > max) return "over";
    return "ok";
  };

  // Handlers
  const handleToggleActive = async (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        data: { is_active: !product.is_active },
      });
      toast.success(product.is_active ? t("productDeactivated") : t("productActivated"));
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleView = (item: Product) => {
    setViewingItem(item);
    setDetailDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t("deleted"));
      setDeleteId(null);
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  // Open create dialog when linked with #create-product — schedule to avoid setState inside effect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#create-product") return;
    const id = window.setTimeout(() => {
      handleCreate();
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, [handleCreate]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    selectCategory(categoryId);
    setPage(1);
  }, [selectCategory]);

  // Get category breadcrumb for header
  const categoryBreadcrumb = selectedCategoryId && treeData?.data
    ? getCategoryPath(treeData.data, selectedCategoryId)?.map((c) => c.name).join(" / ")
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Main Content with Flex Layout */}
      <div className="flex-1 pt-4 min-h-0 flex gap-4">
        {/* Category Tree Sidebar */}
        <div
          className={cn(
            "flex flex-col border rounded-lg transition-all duration-300 overflow-hidden shrink-0 bg-card",
            sidebarCollapsed ? "w-16" : "w-72"
          )}
        >
          {/* Sidebar Header */}
          <div
            className={cn(
              "flex items-center px-3 py-2 border-b bg-muted/30",
              sidebarCollapsed ? "justify-center px-1" : "justify-between"
            )}
          >
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">{t("categories")}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 cursor-pointer", sidebarCollapsed && "transform-none")}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Category Tree */}
          {!sidebarCollapsed ? (
            <div className="flex-1 overflow-hidden">
              <CategoryTree
                data={treeData?.data ?? []}
                selectedId={selectedCategoryId}
                onSelect={handleCategorySelect}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpanded}
                showProductCount
                searchable
                isLoading={treeLoading}
                height="100%"
                onNodeHover={prefetchChildren}
                className="border-0 rounded-none bg-transparent"
                labels={{
                  searchPlaceholder: tCommon("searchCategories"),
                  noCategoriesFound: tCommon("noCategoriesFound"),
                  noCategories: tCommon("noCategories"),
                  category: tCommon("categoryRes"),
                  categories: tCommon("categoriesRes"),
                  selected: tCommon("selectedRes"),
                  inactive: tCommon("inactiveRes"),
                }}
              />
            </div>
          ) : (
            <CollapsedCategoryView 
              data={treeData?.data ?? []}
              selectedId={selectedCategoryId}
              onSelect={handleCategorySelect}
              isLoading={treeLoading}
            />
          )}
        </div>

        {/* Product List Panel */}
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden min-w-0">
          {/* Panel Header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
            <div className="flex-1 flex items-center gap-4">
              <div>
                {categoryBreadcrumb ? (
                  <span className="text-sm text-muted-foreground">
                    <span className="text-sm text-muted-foreground">{t("showingProductsIn")} <span className="font-medium text-foreground">{categoryBreadcrumb}</span></span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("allProducts")}</span>
                )}
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs ml-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* Sort */}
              <Select
                value={sortOption}
                onValueChange={(v) => { setSortOption(v); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-44 text-xs gap-1 cursor-pointer">
                  <ArrowUpDown className="h-3 w-3 mr-1 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name A → Z</SelectItem>
                  <SelectItem value="name_desc">Name Z → A</SelectItem>
                  <SelectItem value="price_asc">Price Low → High</SelectItem>
                  <SelectItem value="price_desc">Price High → Low</SelectItem>
                  <SelectItem value="stock_asc">Stock Low → High</SelectItem>
                  <SelectItem value="stock_desc">Stock High → Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create button */}
            <div className="ml-2">
              {canCreate && (
                <Button size="sm" onClick={handleCreate} className="cursor-pointer h-8">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("create")}
                </Button>
              )}
            </div>
            {pagination && (
              <span className="text-xs text-muted-foreground">
                {((page - 1) * (pagination.per_page ?? 20)) + 1}-
                {Math.min(page * (pagination.per_page ?? 20), pagination.total ?? 0)} of {pagination.total?.toLocaleString() ?? 0}
              </span>
            )}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isError ? (
              <div className="text-center py-8 text-destructive">
                {tCommon("noData")}
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4 ml-2 cursor-pointer"
                >
                  {tCommon("retry") ?? "Retry"}
                </Button>
              </div>
            ) : productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">{t("empty")}</p>
                {selectedCategoryId && (
                  <p className="text-sm mt-2">
                     {t("noProductsByCategory")}{" "}
                    <button
                      onClick={() => selectCategory(null)}
                      className="text-primary hover:underline cursor-pointer"
                    >
                       {t("viewAll")}
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group relative bg-card",
                      !product.is_active && "opacity-60 grayscale bg-muted/50 border-dashed"
                    )}
                    onClick={() => handleView(product)}
                  >
                    {/* Product Image */}
                    <div className="relative aspect-4/3 w-full bg-muted border-b">
                      {product.image_url ? (
                        <img 
                          src={resolveImageUrl(product.image_url)} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30 bg-muted/50">
                          <ImageOff className="h-10 w-10 mb-2" />
                          <span className="text-xs">{t("noImage")}</span>
                        </div>
                      )}
                      
                      {/* Status Badge Over Image */}
                      {!product.is_active && (
                        <div className="absolute top-2 right-2">
                           <Badge variant="secondary" className="text-xs shadow-sm">
                            {tCommon("inactive")}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {/* Product Code */}
                      <div className="text-xs font-mono text-muted-foreground mb-1">
                        {product.code}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors pr-0 mb-1">
                        {product.name}
                      </h3>

                      {/* Category & Brand */}
                      <div className="text-xs text-muted-foreground truncate mb-2">
                        {product.category?.name ?? t("noCategory")}
                        {product.brand?.name && ` • ${product.brand.name}`}
                      </div>

                      {/* Price */}
                      <div className="text-sm font-semibold text-primary mb-2">
                        {product.selling_price > 0
                          ? `Rp ${product.selling_price.toLocaleString("id-ID")}`
                          : product.cost_price > 0
                            ? `Rp ${product.cost_price.toLocaleString("id-ID")}`
                            : "-"}
                      </div>

                      {/* Stock + UoM row */}
                      <div className="flex items-center justify-between gap-1">
                        {(() => {
                          const s = getStockStatus(product);
                          const qty = product.current_stock ?? 0;
                          const colors = {
                            ok:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                            low:  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                            out:  "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                            over: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
                          }[s];
                          return (
                            <span className={cn("inline-flex items-center gap-1 rounded text-[10px] font-medium px-1.5 py-0.5", colors)}>
                              <Package className="h-2.5 w-2.5" />
                              {qty.toLocaleString("id-ID")}
                              {product.uom && ` ${product.uom.symbol ?? product.uom.name}`}
                            </span>
                          );
                        })()}
                        {product.uom && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                            {product.uom.symbol ?? product.uom.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (Hover) */}
                    {canEdit && (
                      <div 
                        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex bg-white/95 shadow-lg border rounded-full p-1 backdrop-blur-sm items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-blue-50 text-muted-foreground hover:text-blue-600 cursor-pointer transition-colors"
                              onClick={(e) => handleEdit(product, e)}
                              title={t("edit")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          
                          {/* Toggle Active Button */}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 rounded-full cursor-pointer transition-colors",
                                product.is_active 
                                  ? "text-muted-foreground hover:text-orange-600 hover:bg-orange-50" 
                                  : "text-muted-foreground hover:text-green-600 hover:bg-green-50"
                              )}
                              onClick={(e) => handleToggleActive(product, e)}
                              title={product.is_active ? t("deactivate") : t("activate")}
                            >
                              <Power className={cn("h-3.5 w-3.5", !product.is_active && "text-green-600")} />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <a id="create-product" />

      {/* Dialogs */}
      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingItem={editingItem}
      />

      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        product={viewingItem}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t("delete")}
        description={t("confirmDelete")}
        isLoading={deleteMutation.isPending}
        itemName="product"
      />
    </div>
  );
}
