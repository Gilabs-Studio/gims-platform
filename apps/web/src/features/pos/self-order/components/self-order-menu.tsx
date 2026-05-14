"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const categories = useMemo(
    () => [...new Set(catalog.map((p) => p.category ?? t("menu.others")))],
    [catalog, t]
  );

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            className="shrink-0 text-xs font-medium px-3 py-1 rounded-full border bg-background hover:bg-muted transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {catalog.map((product) => (
            <Card
              key={product.product_id}
              className={`overflow-hidden transition-opacity ${
                !product.is_available ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-28 object-cover"
                />
              )}
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium leading-tight line-clamp-2">
                  {product.name}
                </p>
                <p className="text-xs font-bold text-primary">
                  {formatCurrency(product.price, currency)}
                </p>
                {!product.is_available ? (
                  <p className="text-[10px] text-muted-foreground">
                    {t("menu.outOfStock")}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => onAdd(product)}
                  >
                    {t("menu.add")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
          <Button
            size="lg"
            className="w-full max-w-md shadow-lg relative"
            onClick={onOpenCart}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {t("menu.viewOrder")}
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalItems}
            </Badge>
          </Button>
        </div>
      )}
    </div>
  );
}
