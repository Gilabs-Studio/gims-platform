export const inventoryEn = {
  inventory: {
    title: "Inventory Stock",
    subtitle: "Monitor real-time stock levels across all warehouses",
    searchPlaceholder: "Search by product name or code...",
    status: {
      ok: "OK",
      lowStock: "Low Stock",
      outOfStock: "Out of Stock",
      overstock: "Overstock",
      expiring: "Expiring",
      expired: "Expired"
    },
    filter: {
      warehouse: "Warehouse",
      allWarehouses: "All Warehouses",
      showLowStockOnly: "Show Low Stock",
      showAll: "Show All"
    },
    actions: {
      openLedger: "Open Stock Ledger",
      ledgerHint: "Jump to the product stock ledger from here.",
    },
    table: {
      product: "Product",
      warehouse: "Warehouse",
      onHand: "On Hand",
      reserved: "Reserved",
      available: "Available",
      range: "Min - Max",
      status: "Status"
    },
    tabs: {
      all: "All",
      ingredient: "Ingredient"
    },
    badge: {
      ingredient: "Ingredient"
    },
    common: {
      loading: "Loading inventory...",
      noData: "No inventory items found matching your criteria",
      error: "Failed to load inventory data",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      noWarehouse: "No Warehouse"
    },
    metrics: {
      totalSku: "Total SKU",
      totalOnHand: "Total On Hand",
      healthyStock: "Healthy Stock",
      expiring30d: "Expiring (30d)",
      expiredBatches: "Expired Batches"
    },
    labels: {
      filtered: "Filtered:"
    },
    view: {
      tree: "Tree",
      list: "List"
    },
    negativeStock: {
      summary: "{count} products",
      detail: "have negative stock on this page - likely from offline transactions that have not been reconciled yet.",
      tooltip: "Negative stock - likely from offline transactions that have not been reconciled yet"
    }
  },
  stock_movement: {
    title: "Stock Movements",
    description: "Central ledger for all inventory changes (GR, DO, Adjustments)",
    filters: {
      warehouse: "All Warehouses",
      product: "All Products",
      type: "All Types",
      search: "Search reference number..."
    },
    table: {
      date: "Date",
      type: "Type",
      ref_no: "Ref No",
      source: "Source / Destination",
      in: "IN",
      out: "OUT",
      balance: "Balance",
      cost: "Cost",
      user: "User"
    },
    dialog: {
      title: "Movement Details",
      refInfo: "Reference Information",
      productInfo: "Product Information",
      movementInfo: "Movement Information",
      financials: "Financials",
      qtyIn: "Quantity In",
      qtyOut: "Quantity Out",
      balanceAfter: "Balance After",
      unitCost: "Unit Cost",
      totalValue: "Total Value"
    }
  }
};
