export const inventoryEn = {
  inventory: {
    title: "Inventory Stock",
    subtitle: "Monitor real-time stock levels across all warehouses",
    searchPlaceholder: "Search by product name or code...",
    status: {
      ok: "OK",
      lowStock: "Low Stock",
      outOfStock: "Out of Stock",
      overstock: "Overstock"
    },
    filter: {
      warehouse: "Warehouse",
      allWarehouses: "All Warehouses",
      showLowStockOnly: "Show Low Stock",
      showAll: "Show All"
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
    common: {
      loading: "Loading inventory...",
      noData: "No inventory items found matching your criteria",
      error: "Failed to load inventory data",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      noWarehouse: "No Warehouse"
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
