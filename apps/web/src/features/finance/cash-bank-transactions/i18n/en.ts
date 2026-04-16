export const financeCashBankTransactionsEn = {
  title: "Cash-Bank Transactions",
  description: "Create, monitor, and reverse cash-bank transactions with auto-journal posting.",
  search: "Search transactions...",
  fields: {
    referenceNumber: "Reference Number",
    company: "Company",
    bankAccount: "Bank Account",
    type: "Type",
    date: "Date",
    amount: "Amount",
    status: "Status",
    journal: "Journal",
    reference: "Reference",
    description: "Description",
    contraAccount: "Contra Account",
    reason: "Reason",
  },
  status: {
    draft: "Draft",
    posted: "Posted",
    reversed: "Reversed",
  },
  types: {
    payment_in: "Payment In",
    payment_out: "Payment Out",
  },
  actions: {
    create: "Create",
    reverse: "Reverse",
    reversing: "Reversing...",
  },
  form: {
    createTitle: "Create Cash-Bank Transaction",
    submit: "Save",
    cancel: "Cancel",
  },
  reverse: {
    title: "Reverse Transaction",
    description: "Create reversal journal for selected transaction.",
  },
  toast: {
    created: "Transaction created",
    reversed: "Transaction reversed",
    failed: "Action failed",
  },
};
