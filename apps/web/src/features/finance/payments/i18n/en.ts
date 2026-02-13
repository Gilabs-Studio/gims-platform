export const financePaymentsEn = {
  title: "Payments",
  description: "Record payments and allocations.",
  search: "Search payments...",
  fields: {
    paymentDate: "Payment Date",
    description: "Description",
    bankAccount: "Bank Account",
    totalAmount: "Total Amount",
    status: "Status",
    amount: "Amount",
    account: "Chart of Account",
    memo: "Memo",
  },
  status: {
    draft: "Draft",
    posted: "Posted",
  },
  actions: {
    create: "Create",
    edit: "Edit",
    approve: "Approve",
    delete: "Delete",
  },
  form: {
    createTitle: "Create Payment",
    editTitle: "Edit Payment",
    submit: "Save",
    cancel: "Cancel",
    addAllocation: "Add Allocation",
  },
  placeholders: {
    select: "Select...",
  },
  toast: {
    created: "Payment created",
    updated: "Payment updated",
    approved: "Payment approved",
    deleted: "Payment deleted",
    failed: "Action failed",
  },
};
