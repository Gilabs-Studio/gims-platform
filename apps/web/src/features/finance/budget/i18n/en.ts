export const financeBudgetEn = {
  title: "Budget",
  description: "Manage and approve budgets.",
  search: "Search budgets...",
  fields: {
    name: "Name",
    description: "Description",
    startDate: "Start Date",
    endDate: "End Date",
    period: "Period",
    totalAmount: "Total Amount",
    status: "Status",
    amount: "Amount",
    account: "Chart of Account",
    memo: "Memo",
  },
  status: {
    draft: "Draft",
    approved: "Approved",
  },
  actions: {
    create: "Create",
    edit: "Edit",
    approve: "Approve",
    delete: "Delete",
  },
  form: {
    createTitle: "Create Budget",
    editTitle: "Edit Budget",
    submit: "Save",
    cancel: "Cancel",
    addItem: "Add Item",
  },
  placeholders: {
    select: "Select...",
  },
  toast: {
    created: "Budget created",
    updated: "Budget updated",
    approved: "Budget approved",
    deleted: "Budget deleted",
    failed: "Action failed",
  },
};
