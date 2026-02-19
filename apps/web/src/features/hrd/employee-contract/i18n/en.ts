export const employeeContractEn = {
  employeeContract: {
    // Common
    common: {
      contract: "Contract",
      contracts: "Contracts",
      employeeContract: "Employee Contract",
      employeeContracts: "Employee Contracts",
      status: "Status",
      contractNumber: "Contract Number",
      contractType: "Contract Type",
      employee: "Employee",
      startDate: "Start Date",
      endDate: "End Date",
      salary: "Salary",
      jobTitle: "Job Title",
      department: "Department",
      terms: "Terms & Conditions",
      document: "Document",
      actions: "Actions",
      search: "Search contracts...",
      filterBy: "Filter by",
      noResults: "No contracts found",
      error: "Failed to load data",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      update: "Update",
      create: "Create",
      saving: "Saving...",
      edit: "Edit",
      view: "View",
      confirmDelete: "Are you sure you want to delete this contract?",
      deleteWarning: "This action cannot be undone.",
      page: "Page",
      of: "of",
      total: "total",
      previous: "Previous",
      next: "Next",
      back: "Back",
      validationError: "Please correct the highlighted fields",
      basicInfo: "Basic Information",
      financialInfo: "Financial Information",
      additionalInfo: "Additional Information",
      select: "Select",
      selectEmployee: "Select employee",
      selectContractType: "Select contract type",
      selectDate: "Select date",
      validating: "Validating...",
      expiringContracts: "Expiring Contracts",
      daysUntilExpiry: "Days Until Expiry",
      expiringSoon: "Expiring Soon",
      noEndDate: "No End Date",
      employeeCode: "Employee Code",
      name: "Name",
      perMonth: "month",
    },

    // Status labels
    status: {
      ACTIVE: "Active",
      EXPIRED: "Expired",
      TERMINATED: "Terminated",
    },

    // Contract type labels
    contractType: {
      PERMANENT: "Permanent",
      CONTRACT: "Contract",
      INTERNSHIP: "Internship",
      PROBATION: "Probation",
    },

    // Page titles
    titles: {
      list: "Employee Contracts",
      create: "Create Employee Contract",
      edit: "Edit Employee Contract",
      detail: "Contract Details",
      expiring: "Expiring Contracts",
    },

    // Subtitle
    subtitle: "Manage employee contracts with expiry tracking and status management",

    // Tabs
    tabs: {
      overview: "Overview",
      employee: "Employee",
      audit: "Audit",
    },

    // Actions (list/page level)
    actions: {
      add: "Add Contract",
    },

    // Filters
    filters: {
      all: "All Contracts",
      byStatus: "Filter by status",
      byType: "Filter by type",
    },

    // Form fields
    fields: {
      employee: "Employee",
      employeePlaceholder: "Select employee",
      contractNumber: "Contract Number",
      contractNumberPlaceholder: "e.g., EMP-2024-001",
      contractType: "Contract Type",
      contractTypePlaceholder: "Select contract type",
      startDate: "Start Date",
      startDatePlaceholder: "Select start date",
      endDate: "End Date",
      endDatePlaceholder: "Select end date (leave empty for permanent)",
      salary: "Salary",
      salaryPlaceholder: "Enter salary amount",
      jobTitle: "Job Title",
      jobTitlePlaceholder: "e.g., Senior Developer",
      department: "Department",
      departmentPlaceholder: "e.g., Engineering",
      terms: "Terms & Conditions",
      termsPlaceholder: "Enter contract terms and conditions",
      document: "Contract Document",
      documentPlaceholder: "Upload contract document (PDF)",
      status: "Status",
      statusPlaceholder: "Select status",
    },

    // Buttons
    buttons: {
      addContract: "Add Contract",
      saveContract: "Save Contract",
      updateContract: "Update Contract",
      deleteContract: "Delete Contract",
      cancelEdit: "Cancel",
      viewDetails: "View Details",
      editContract: "Edit",
      uploadDocument: "Upload Document",
      downloadDocument: "Download Document",
      viewExpiring: "View Expiring Contracts",
      viewProfile: "View Profile",
    },

    // Messages
    messages: {
      createSuccess: "Contract created successfully",
      updateSuccess: "Contract updated successfully",
      deleteSuccess: "Contract deleted successfully",
      createError: "Failed to create contract",
      updateError: "Failed to update contract",
      deleteError: "Failed to delete contract",
      loadError: "Failed to load contracts",
      permanentInfo: "Permanent contracts do not have an end date",
      contractExpiryWarning: "This contract is expiring in {days} days",
      contractExpired: "This contract has expired",
      terminatedWarning: "This contract has been terminated",
      noEmployeeData: "No employee data available",
    },

    // Validation messages
    validation: {
      required: "This field is required",
      invalidId: "Invalid ID format",
      contractNumberMax: "Contract number must not exceed 50 characters",
      invalidContractType: "Invalid contract type",
      salaryPositive: "Salary must be greater than 0",
      salaryMin: "Salary must be at least 0.01",
      jobTitleMax: "Job title must not exceed 100 characters",
      departmentMax: "Department must not exceed 100 characters",
      documentPathMax: "Document path must not exceed 255 characters",
      invalidStatus: "Invalid status",
      permanentNoEndDate: "Permanent contracts cannot have an end date",
      contractNeedsEndDate: "Non-permanent contracts must have an end date",
      endDateAfterStart: "End date must be after start date",
      quantityPositive: "Quantity must be greater than 0",
      quantityMin: "Quantity must be at least 0.001",
      pricePositive: "Price must be greater than 0",
      priceMin: "Price must be at least 0.01",
    },

    // Info
    info: {
      contractDetails: "Contract Details",
      employeeInfo: "Employee Information",
      employeeInformation: "Employee Information",
      contractInfo: "Contract Information",
      contractInformation: "Contract Information",
      jobInformation: "Job Information",
      contractPeriod: "Contract Period",
      financialDetails: "Financial Details",
      documentInfo: "Document Information",
      statusInfo: "Status Information",
      expiryInfo: "Expiry Information",
      createdBy: "Created by",
      updatedBy: "Updated by",
      createdAt: "Created at",
      updatedAt: "Updated at",
      created: "Created",
      lastUpdated: "Last Updated",
    },

    // Employee
    employee: {
      employeeCode: "Employee Code",
      email: "Email",
      phone: "Phone",
      position: "Position",
      department: "Department",
      hireDate: "Hire Date",
    },
  },
};
