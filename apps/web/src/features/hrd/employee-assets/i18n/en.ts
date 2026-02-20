export const employeeAssetsEn = {
  employeeAssets: {
    title: "Employee Assets",
    description: "Manage company assets borrowed by employees",
    
    // Actions
    addAsset: "Borrow Asset",
    editAsset: "Edit Asset",
    returnAsset: "Return Asset",
    viewDetail: "View Detail",
    delete: "Delete Asset",
    
    // Filters
    searchPlaceholder: "Search by asset name, code, or category...",
    filterByEmployee: "Filter by Employee",
    filterByStatus: "Filter by Status",
    allEmployees: "All Employees",
    allStatuses: "All Statuses",
    
    // Status
    status: {
      BORROWED: "Borrowed",
      RETURNED: "Returned",
    },
    
    // Condition
    condition: {
      NEW: "New",
      GOOD: "Good",
      FAIR: "Fair",
      POOR: "Poor",
      DAMAGED: "Damaged",
    },
    
    // Table columns
    columns: {
      assetCode: "Asset Code",
      assetName: "Asset Name",
      category: "Category",
      employee: "Employee",
      borrowDate: "Borrow Date",
      returnDate: "Return Date",
      borrowCondition: "Borrow Condition",
      returnCondition: "Return Condition",
      daysBorrowed: "Days Borrowed",
      status: "Status",
      actions: "Actions",
    },
    
    // Form fields
    form: {
      employee: "Employee",
      employeePlaceholder: "Select employee",
      assetName: "Asset Name",
      assetNamePlaceholder: "e.g., MacBook Pro 14-inch",
      assetCode: "Asset Code",
      assetCodePlaceholder: "e.g., LAP-001",
      assetCategory: "Asset Category",
      assetCategoryPlaceholder: "e.g., Laptop, Phone, Vehicle",
      borrowDate: "Borrow Date",
      borrowCondition: "Borrow Condition",
      borrowConditionPlaceholder: "Select condition",
      returnDate: "Return Date",
      returnCondition: "Return Condition",
      returnConditionPlaceholder: "Select return condition",
      notes: "Notes",
      notesPlaceholder: "Additional notes (optional)",
      submit: "Submit",
      cancel: "Cancel",
      saving: "Saving...",
    },
    
    // Detail modal
    detail: {
      title: "Asset Detail",
      assetInfo: "Asset Information",
      borrowInfo: "Borrow Information",
      returnInfo: "Return Information",
      notReturned: "Not returned yet",
      daysBorrowedLabel: "Days borrowed:",
      daysTotal: "{days} days",
    },
    
    // Return modal
    returnModal: {
      title: "Return Asset",
      description: "Record the return of this asset",
      confirmReturn: "Confirm Return",
      returning: "Returning...",
    },
    
    // Messages
    messages: {
      createSuccess: "Asset borrowed successfully",
      updateSuccess: "Asset updated successfully",
      returnSuccess: "Asset returned successfully",
      deleteSuccess: "Asset deleted successfully",
      createError: "Failed to borrow asset",
      updateError: "Failed to update asset",
      returnError: "Failed to return asset",
      deleteError: "Failed to delete asset",
      confirmDelete: "Are you sure you want to delete this asset?",
      cannotUpdateReturned: "Cannot update asset that has been returned",
      assetAlreadyReturned: "This asset has already been returned",
    },
    
    // Empty state
    empty: {
      title: "No assets found",
      description: "No employee assets match your filters",
      action: "Borrow first asset",
    },
    
    // Validation
    validation: {
      required: "This field is required",
      invalid_uuid: "Invalid employee selection",
      invalid_date: "Invalid date format",
      invalid_condition: "Invalid condition selection",
      max_length: "Maximum {max} characters",
    },
  },
};
