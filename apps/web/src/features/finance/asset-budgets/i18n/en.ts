export const assetBudgetEn = {
  title: "Asset Budgets",
  description:
    "Manage capital expenditure (CAPEX) budgets for asset purchases.",

  status: {
    draft: "Draft",
    active: "Active",
    closed: "Closed",
    cancelled: "Cancelled",
  },

  fields: {
    budgetCode: "Budget Code",
    budgetName: "Budget Name",
    description: "Description",
    fiscalYear: "Fiscal Year",
    startDate: "Start Date",
    endDate: "End Date",
    totalBudget: "Total Budget",
    status: "Status",
    category: "Category",
    allocatedAmount: "Allocated Amount",
    usedAmount: "Used Amount",
    committedAmount: "Committed Amount",
    availableAmount: "Available Amount",
    notes: "Notes",
  },

  actions: {
    create: "Create Budget",
    edit: "Edit",
    delete: "Delete",
    activate: "Activate",
    close: "Close Budget",
    view: "View Detail",
    addCategory: "Add Category",
    removeCategory: "Remove Category",
  },

  form: {
    createTitle: "Create New Asset Budget",
    editTitle: "Edit Asset Budget",
    budgetInfo: "Budget Information",
    categories: "Budget Categories",
    summary: "Budget Summary",
    save: "Save",
    cancel: "Cancel",
  },

  summary: {
    totalAllocated: "Total Allocated",
    totalUsed: "Total Used",
    totalCommitted: "Total Committed",
    totalAvailable: "Total Available",
    utilizationRate: "Utilization Rate",
  },

  messages: {
    noBudgets: "No asset budgets found",
    noCategories: "No budget categories added",
    confirmDelete: "Are you sure you want to delete this budget?",
    confirmActivate:
      "Are you sure you want to activate this budget? Active budgets cannot be modified.",
    confirmClose:
      "Are you sure you want to close this budget? Closed budgets cannot be used.",
    insufficientBudget: "Insufficient budget for this purchase",
  },

  toast: {
    created: "Budget created successfully",
    updated: "Budget updated successfully",
    deleted: "Budget deleted successfully",
    statusChanged: "Budget status changed successfully",
    error: "An error occurred",
  },

  placeholders: {
    search: "Search budgets...",
    selectCategory: "Select category",
    enterAmount: "Enter amount",
  },

  common: {
    create: "Create",
    back: "Back",
    next: "Next",
    saving: "Saving...",
  },
};
