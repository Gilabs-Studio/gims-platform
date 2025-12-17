export interface MerchandiseProduct {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly priceFormatted: string;
  readonly stock: number;
  readonly stockStatus: "healthy" | "low" | "out";
  readonly stockPercentage: number;
  readonly variant?: string;
  readonly iconName: string;
}

export interface MerchandiseInventory {
  readonly products: readonly MerchandiseProduct[];
  readonly totalProducts: number;
  readonly totalStock: number;
  readonly lowStockCount: number;
}
