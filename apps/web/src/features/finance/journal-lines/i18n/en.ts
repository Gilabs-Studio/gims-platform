export const journalLinesEn = {
  journalLines: {
    title: "Journal Lines",
    description: "View all journal line entries across accounts with running balance.",
    search: "Search COA code, name, or memo...",
    empty: "No journal lines found. Adjust your filters or date range.",
    error: "Failed to load journal lines. Please try again.",
    totals: "Page Totals",
    runningBalanceInfo:
      "Running balance is shown because a single account is selected. Balance is calculated chronologically.",

    columns: {
      entryDate: "Entry Date",
      journalDescription: "Journal Description",
      refType: "Ref Type",
      coaCode: "COA Code",
      coaName: "Account Name",
      memo: "Memo",
      debit: "Debit",
      credit: "Credit",
      runningBalance: "Running Balance",
      status: "Status",
    },

    filters: {
      selectCoa: "Select Account",
      allAccounts: "All Accounts",
      accountType: "Account Type",
      allTypes: "All Types",
      journalStatus: "Journal Status",
      allStatuses: "All Statuses",
      referenceType: "Reference Type",
      allReferences: "All References",
      startDate: "Start Date",
      endDate: "End Date",
    },

    status: {
      draft: "Draft",
      posted: "Posted",
    },

    actions: {
      export: "Export CSV",
      resetFilters: "Reset Filters",
    },

    toast: {
      exportSuccess: "Journal lines exported successfully",
    },
  },
};
