export const financeAssetCategoriesEn = {
  title: "Asset Categories",
  description: "Manage depreciation rules per category.",
  search: "Search categories...",
  fields: {
    name: "Name",
    method: "Method",
    usefulLifeMonths: "Useful life (months)",
    depreciationRate: "Depreciation rate",
    isActive: "Active",
    assetAccount: "Asset account",
    accumulatedAccount: "Accumulated depreciation account",
    expenseAccount: "Depreciation expense account",
  },
  methods: {
    SL: "Straight Line",
    DB: "Declining Balance",
  },
  actions: {
    create: "Create",
    edit: "Edit",
    delete: "Delete",
  },
  form: {
    createTitle: "Create Category",
    editTitle: "Edit Category",
    submit: "Save",
    cancel: "Cancel",
  },
  placeholders: {
    select: "Select...",
  },
  toast: {
    created: "Category created",
    updated: "Category updated",
    deleted: "Category deleted",
    failed: "Action failed",
  },
};
