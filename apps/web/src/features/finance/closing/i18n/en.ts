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
    runWizard: "Run Closing Wizard",
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
    back: "Back",
    next: "Next",
    close: "Close",
  },
  snapshot: {
    title: "Snapshot",
    netProfit: "Net Profit",
    retainedEarnings: "Retained Earnings",
  },
  validation: {
    title: "Validation",
  },
  wizard: {
    title: "Financial Closing Wizard",
    steps: {
      precheck: "Pre-Check",
      review: "Review",
      execute: "Execute",
      complete: "Complete",
    },
    precheck: {
      title: "Pre-Check Validation",
      description: "Verify all data is correct before proceeding",
      accountCount: "Accounts Included",
      totalClosingBalance: "Total Closing Balance",
      totalDifference: "Total Difference",
      warning: "Warning",
      differenceWarning:
        "There are differences between opening and closing balances. Please review the trial balance.",
    },
    review: {
      title: "Trial Balance Review",
      description: "Review account balances for the period",
    },
    execute: {
      title: "Ready to Close?",
      description: "Click approve to lock the financial closing period",
      warning: "Important",
      warningText:
        "Once approved, this period will be locked. No further adjustments can be made.",
      processing: "Processing...",
    },
    complete: {
      title: "Closing Approved",
      description: "The financial closing period has been successfully locked",
      runYearEnd: "Also run year-end close",
      yearEndInfo:
        "This will close the accounts and prepare for the next fiscal year",
    },
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
