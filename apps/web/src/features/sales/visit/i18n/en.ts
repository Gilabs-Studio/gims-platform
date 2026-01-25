export const visitI18nEn = {
  visit: {
    title: "Sales Visits",
    description: "Manage customer visit schedules and reports",

    // Table headers
    code: "Code",
    visitDate: "Visit Date",
    scheduledTime: "Scheduled Time",
    employee: "Sales Rep",
    company: "Company",
    contactPerson: "Contact Person",
    purpose: "Purpose",
    status: "Status",
    actions: "Actions",

    // Status
    statusPlanned: "Planned",
    statusInProgress: "In Progress",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",

    // Actions
    create: "New Visit",
    edit: "Edit",
    delete: "Delete",
    view: "View Details",
    cancel: "Cancel Visit",
    checkIn: "Check In",
    checkOut: "Check Out",

    // Form labels
    form: {
      visitDate: "Visit Date",
      scheduledTime: "Scheduled Time",
      employee: "Sales Representative",
      company: "Company",
      contactPerson: "Contact Person",
      contactPhone: "Contact Phone",
      address: "Visit Address",
      village: "Village",
      purpose: "Purpose",
      notes: "Notes",
      result: "Result",
      products: "Products Discussed",
      interestLevel: "Interest Level",
      quantity: "Quantity",
      price: "Price",
      interestSurvey: "Interest Survey",
      noInterestSurvey: "No screening questions available.",
      calculatedFromSurvey: "Calculated from survey",
    },

    // Dialogs
    createTitle: "Create New Visit",
    editTitle: "Edit Visit",
    deleteTitle: "Delete Visit",
    deleteConfirm: "Are you sure you want to delete this visit?",
    deleteDescription: "This action cannot be undone.",
    cancelTitle: "Cancel Visit",
    cancelConfirm: "Are you sure you want to cancel this visit?",
    cancelNotes: "Cancellation Notes",
    checkInTitle: "Check In",
    checkInConfirm: "Confirm check in to this visit location?",
    checkOutTitle: "Check Out",
    checkOutResult: "Visit Result Summary",

    // Detail modal
    detailTitle: "Visit Details",
    tabOverview: "Overview",
    tabProducts: "Products",
    tabHistory: "Progress History",
    noProducts: "No products discussed yet",
    noHistory: "No history available",

    // Empty state
    empty: "No visits found",
    emptyDescription: "Create a new visit to get started",

    // Filters
    filterByStatus: "Filter by status",
    filterByEmployee: "Filter by sales rep",
    filterByCompany: "Filter by company",
    filterByDate: "Filter by date range",
    allStatuses: "All statuses",
    search: "Search visits...",

    // Validation
    validation: {
      required: "This field is required",
      invalidId: "Invalid ID",
      interestLevelMin: "Interest level cannot be negative",
      interestLevelMax: "Interest level cannot exceed 5",
      quantityMin: "Quantity cannot be negative",
      priceMin: "Price cannot be negative",
    },

    // Success messages
    createSuccess: "Visit created successfully",
    updateSuccess: "Visit updated successfully",
    deleteSuccess: "Visit deleted successfully",
    cancelSuccess: "Visit cancelled successfully",
    checkInSuccess: "Checked in successfully",
    checkOutSuccess: "Checked out successfully",

    // Error messages
    fetchError: "Failed to fetch visits",
    createError: "Failed to create visit",
    updateError: "Failed to update visit",
    deleteError: "Failed to delete visit",

    // Calendar
    moreVisits: "{count} more",
    newVisit: "New Visit",
    noVisitsToday: "No visits",
  },
};
