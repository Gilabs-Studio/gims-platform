"use client";

import dynamic from "next/dynamic";
import { MerchandiseProduct } from "@/features/motion-example/types";

const MerchandiseInventory = dynamic(
  () =>
    import("@/features/motion-example/components/merchandise-inventory").then(
      (mod) => ({ default: mod.MerchandiseInventory }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

// Mock data - will be replaced with actual API data
const mockProducts: readonly MerchandiseProduct[] = [
  {
    id: "merch-1",
    name: "Event Hoodie",
    variant: "Black / Cotton",
    price: 55,
    priceFormatted: "$55",
    stock: 142,
    stockStatus: "healthy",
    stockPercentage: 75,
    iconName: "Shirt",
  },
  {
    id: "merch-2",
    name: "Tote Bag",
    variant: "Canvas",
    price: 25,
    priceFormatted: "$25",
    stock: 310,
    stockStatus: "healthy",
    stockPercentage: 88,
    iconName: "ShoppingBag",
  },
  {
    id: "merch-3",
    name: "Tumbler",
    variant: "Matte Black",
    price: 30,
    priceFormatted: "$30",
    stock: 12,
    stockStatus: "low",
    stockPercentage: 15,
    iconName: "Coffee",
  },
] as const;

export function MerchandisePageClient() {
  const handleAddProduct = () => {
    // TODO: Implement add product functionality
    console.log("Add product clicked");
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export functionality
    console.log("Export CSV clicked");
  };

  const handleProductClick = (productId: string) => {
    // TODO: Navigate to product detail or open edit dialog
    console.log("Product clicked:", productId);
  };

  return (
    <MerchandiseInventory
      products={mockProducts}
      onAddProduct={handleAddProduct}
      onExportCSV={handleExportCSV}
      onProductClick={handleProductClick}
    />
  );
}
