"use client";

import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MerchandiseProductCard } from "./merchandise-product-card";
import { MerchandiseProduct } from "../types";
import { motion } from "framer-motion";
import { StaggerContainer } from "@/components/motion";

interface MerchandiseInventoryProps {
  readonly products?: readonly MerchandiseProduct[];
  readonly isLoading?: boolean;
  readonly onAddProduct?: () => void;
  readonly onExportCSV?: () => void;
  readonly onProductClick?: (productId: string) => void;
}

export function MerchandiseInventory({
  products = [],
  isLoading = false,
  onAddProduct,
  onExportCSV,
  onProductClick,
}: MerchandiseInventoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-foreground tracking-tight">
            Merchandise Inventory
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border border-border bg-card/30 rounded-lg p-4 animate-pulse"
            >
              <div className="aspect-square bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-2 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex justify-between items-center"
      >
        <h2 className="text-lg font-medium text-foreground tracking-tight">
          Merchandise Inventory
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            className="text-xs px-3 py-1.5"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onAddProduct}
            className="text-xs px-3 py-1.5"
          >
            <Plus className="h-3 w-3" />
            Add Product
          </Button>
        </div>
      </motion.div>
      {products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="border border-border bg-card/30 rounded-lg p-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            No products found. Create one to get started.
          </p>
          <Button variant="outline" size="sm" onClick={onAddProduct}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </motion.div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <MerchandiseProductCard
              key={product.id}
              product={product}
              onClick={onProductClick}
            />
          ))}
        </StaggerContainer>
      )}
    </motion.div>
  );
}
