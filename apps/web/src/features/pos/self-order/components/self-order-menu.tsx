"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart, Plus } from "lucide-react";
import type { POSCatalogItem, CartItem } from "../types";

interface SelfOrderMenuProps {
  catalog: POSCatalogItem[];
  cart: CartItem[];
  currency: string;
  onAdd: (item: POSCatalogItem) => void;
  onOpenCart: () => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function SelfOrderMenu({
  catalog,
  cart,
  currency,
  onAdd,
  onOpenCart,
}: SelfOrderMenuProps) {
  const t = useTranslations("selfOrder");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizedCatalog = useMemo(
    () => catalog.filter((p) => p.product_id && p.product_name),
    [catalog]
  );

  const categories = useMemo(
    () => [
      "all",
      ...new Set(
        normalizedCatalog.map((p) => {
          const category = p.category?.trim();
          return category || t("menu.others");
        })
      ),
    ],
    [normalizedCatalog, t]
  );

  const filteredCatalog = useMemo(() => {
    if (activeCategory === "all") {
      return normalizedCatalog;
    }
    return normalizedCatalog.filter((p) => {
      const category = p.category?.trim() || t("menu.others");
      return category === activeCategory;
    });
  }, [activeCategory, normalizedCatalog, t]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  if (normalizedCatalog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-lg font-bold tracking-tight">{t("menu.emptyTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {t("menu.emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Category tabs */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`shrink-0 text-sm font-semibold px-5 py-2 rounded-full transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "all" ? t("menu.all") : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 px-4 py-6 pb-32 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.map((product) => (
            <div
              key={product.product_id}
              className={`group flex gap-4 p-3 bg-card/50 rounded-3xl border border-border/50 shadow-sm transition-all hover:bg-card hover:shadow-md ${
                !product.is_available ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  className="h-28 w-28 shrink-0 object-cover rounded-2xl bg-muted"
                />
              ) : (
                <div className="h-28 w-28 shrink-0 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">No Image</span>
                </div>
              )}

              <div className="flex flex-1 flex-col justify-between py-1 pr-1">
                <div>
                  <h3 className="font-bold text-base leading-tight line-clamp-2">
                    {product.product_name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {product.description?.trim() || `${product.product_code} • ${product.product_kind}`}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {formatCurrency(product.price, currency)}
                  </span>
                  {!product.is_available ? (
                    <span className="text-xs font-semibold text-destructive">
                      {t("menu.outOfStock")}
                    </span>
                  ) : (
                    <button
                      onClick={() => onAdd(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            onClick={onOpenCart}
            className="flex w-full max-w-md items-center justify-between rounded-full bg-zinc-900/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer pointer-events-auto dark:bg-zinc-100/95 dark:text-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-zinc-900 dark:border-zinc-100">
                  {totalItems}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{t("menu.viewOrder")}</span>
                <span className="text-[11px] text-zinc-300 dark:text-zinc-600 font-medium leading-tight">
                   {cart.length} {t("menu.item", { count: cart.length })}
                </span>
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight">
              {formatCurrency(
                cart.reduce((s, i) => s + i.price * i.quantity, 0),
                currency
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
