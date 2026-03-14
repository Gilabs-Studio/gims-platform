export const financeSalaryEn = {
  title: "Base Salary",
  description: "Manage employee base salaries and track salary history.",
  empty: "No salary data found.",
  searchPlaceholder: "Search by employee name...",

  stats: {
    overview: "Overview",
    salaryStats: "Salary Statistics",
    salaryTrend: "Salary Trend",
    total: "Total",
    active: "Active",
    draft: "Pending Draft",
    inactive: "Inactive",
    average: "Average Salary",
    min: "Min Salary",
    max: "Max Salary",
  },

  fields: {
    employee: "Employee",
    effectiveDate: "Effective Date",
    basicSalary: "Basic Salary",
    notes: "Notes",
    status: "Status",
    historyCount: "Records",
    createdAt: "Created At",
    updatedAt: "Updated At",
  },

  status: {
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
  },

  form: {
    createTitle: "Add New Base Salary",
    editTitle: "Edit Base Salary",
    description: "Add a new base salary record for an employee.",
    editDescription: "Update the base salary information.",
    sections: {
      employee: "Employee Information",
      salary: "Salary Information",
      additional: "Additional Information",
    },
    cancel: "Cancel",
    submit: "Save",
    submitting: "Saving...",
  },

  actions: {
    approve: "Approve",
    add: "Add Salary",
    addSalary: "Add Salary Record",
    refresh: "Refresh",
    clearFilters: "Clear Filters",
    clear: "Clear",
    edit: "Edit",
    delete: "Delete",
    detail: "View Detail",
  },

  approve: {
    title: "Approve Salary",
    description:
      "You are about to approve this salary record. This will activate it and deactivate any currently active salary for this employee.",
    warning:
      "Previous active salary will be marked as inactive. This action cannot be undone.",
    processing: "Approving...",
  },

  delete: {
    title: "Delete Salary Draft",
    description:
      "Are you sure you want to delete this draft salary? Only draft salaries can be deleted.",
    item: "salary draft",
  },

  detail: {
    title: "Salary Detail",
  },

  toast: {
    created: "Salary added successfully",
    updated: "Salary updated successfully",
    deleted: "Salary deleted successfully",
    approved: "Salary approved successfully",
    failed: "Operation failed. Please try again.",
  },

  placeholders: {
    select: "Select...",
    selectEmployee: "Select an employee...",
    notes: "Add optional notes...",
  },
};
