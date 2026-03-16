export const financeJournalsEn = {
  title: "Journal Entries",
  description: "Manage journal entries.",
  salesTitle: "Sales Journal",
  salesDescription:
    "Read-only posted and draft journals generated from sales transactions.",
  purchaseTitle: "Purchase Journal",
  purchaseDescription:
    "Read-only journals generated from purchase transactions (Goods Receipt, Supplier Invoice, Purchase Payment).",
  adjustmentTitle: "Adjustment Journal",
  adjustmentDescription:
    "Manual correction journals controlled by Finance. Supports create, post, and reverse.",
  valuationTitle: "Journal Valuation",
  valuationDescription:
    "Journals from valuation processes: inventory valuation, currency revaluation, and cost adjustment.",
  cashBankTitle: "Cash & Bank Journal",
  cashBankDescription:
    "Read-only monitoring view of cash and bank transaction journals.",
  search: "Search description...",
  toast: {
    created: "Journal created",
    updated: "Journal updated",
    deleted: "Journal deleted",
    posted: "Journal posted",
    reversed: "Journal reversed",
    failed: "Something went wrong",
    unbalanced: "Journal must be balanced (debit = credit)",
  },
  actions: {
    create: "Create",
    export: "Export",
    edit: "Edit",
    delete: "Delete",
    post: "Post",
    reverse: "Reverse",
    view: "View",
    trialBalance: "Trial Balance",
  },
  fields: {
    entryDate: "Entry Date",
    description: "Description",
    status: "Status",
    debit: "Debit",
    credit: "Credit",
    memo: "Memo",
    account: "Account",
    startDate: "Start Date",
    endDate: "End Date",
    code: "Code",
    name: "Name",
    balance: "Balance",
    referenceType: "Reference Type",
  },
  status: {
    draft: "Draft",
    posted: "Posted",
    reversed: "Reversed",
  },
  form: {
    createTitle: "Create Journal",
    editTitle: "Edit Journal",
    submit: "Save",
    cancel: "Cancel",
    addLine: "Add line",
  },
  placeholders: {
    select: "Select...",
  },
};
