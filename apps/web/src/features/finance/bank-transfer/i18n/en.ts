export const financeBankTransferEn = {
  title: "Bank Transfers",
  description: "Manage inter-bank transfers and posting status.",
  search: "Search transfers...",
  fields: {
    transferNumber: "Transfer Number",
    date: "Date",
    amount: "Amount",
    status: "Status",
    journal: "Journal",
    fromBankAccount: "From Bank Account",
    toBankAccount: "To Bank Account",
    company: "Company",
    reference: "Reference",
    description: "Description",
    reason: "Reason",
  },
  status: {
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  actions: {
    create: "Create",
    complete: "Complete",
    cancel: "Cancel",
  },
  form: {
    createTitle: "Create Bank Transfer",
    submit: "Save",
    cancel: "Cancel",
  },
  toast: {
    created: "Transfer created",
    completed: "Transfer completed",
    cancelled: "Transfer cancelled",
    failed: "Action failed",
  },
};
