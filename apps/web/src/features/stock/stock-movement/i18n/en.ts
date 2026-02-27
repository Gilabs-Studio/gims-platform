export const stockMovementEn = {
  stock_movement: {
    title: "Stock Movement",
    description: "Track all inventory movements across warehouses",
    filters: {
      warehouse: "All Warehouses",
      product: "All Products",
      type: "All Types",
      search: "Search by reference number...",
    },
    table: {
      date: "Date",
      type: "Type",
      ref_no: "Ref. No.",
      source: "Source",
      in: "Qty In",
      out: "Qty Out",
      balance: "Balance",
      cost: "Unit Cost",
      user: "User",
    },
    dialog: {
      title: "Movement Detail",
      refInfo: "Reference Info",
      movementInfo: "Movement Info",
      qtyIn: "Qty In",
      qtyOut: "Qty Out",
      balanceAfter: "Balance After",
      unitCost: "Unit Cost",
      totalValue: "Total Value",
    },
  },
};
