export const financeClosingEn = {
  title: "Closing",
  description: "Create and approve period closing.",
  fields: {
    periodEndDate: "Period end date",
    status: "Status",
    notes: "Notes",
    approvedAt: "Approved at",
    fiscalYear: "Fiscal Year",
  },
  status: {
    draft: "Draft",
    approved: "Approved",
  },
  actions: {
    create: "Create",
    approve: "Approve",
    reopen: "Reopen",
    yearEndClose: "Year-End Close",
    view: "View Detail",
    delete: "Delete",
  },
  detail_title: "Closing Analysis Detail",
  analysis: {
    account_name: "Account Name",
    closing_balance: "Closing Balance",
    opening_balance: "Opening Balance (YTD)",
    difference: "Difference",
  },
  form: {
    createTitle: "Create Closing",
    submit: "Save",
    cancel: "Cancel",
  },
  snapshot: {
    title: "Snapshot",
    netProfit: "Net Profit",
    retainedEarnings: "Retained Earnings",
  },
  validation: {
    title: "Validation",
  },
  toast: {
    created: "Closing created",
    approved: "Closing approved",
    reopened: "Closing reopened",
    yearEndClosed: "Year-end closing completed",
    deleted: "Closing deleted",
    failed: "Action failed",
  },
};
