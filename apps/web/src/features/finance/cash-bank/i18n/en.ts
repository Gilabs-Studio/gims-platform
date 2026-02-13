export const financeCashBankEn = {
  title: "Cash/Bank Journal",
  description: "Manage cash and bank journal entries.",
  search: "Search entries...",
  fields: {
    transactionDate: "Transaction Date",
    type: "Type",
    description: "Description",
    bankAccount: "Bank Account",
    totalAmount: "Total Amount",
    status: "Status",
    amount: "Amount",
    account: "Chart of Account",
    memo: "Memo",
  },
  type: {
    cash_in: "Cash In",
    cash_out: "Cash Out",
  },
  status: {
    draft: "Draft",
    posted: "Posted",
  },
  actions: {
    create: "Create",
    edit: "Edit",
    post: "Post",
    delete: "Delete",
  },
  form: {
    createTitle: "Create Entry",
    editTitle: "Edit Entry",
    submit: "Save",
    cancel: "Cancel",
    addLine: "Add Line",
  },
  placeholders: {
    select: "Select...",
  },
  toast: {
    created: "Entry created",
    updated: "Entry updated",
    posted: "Entry posted",
    deleted: "Entry deleted",
    failed: "Action failed",
  },
};
