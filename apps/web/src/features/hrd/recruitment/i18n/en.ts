export const recruitmentEn = {
  recruitment: {
    // Common
    common: {
      status: "Status",
      actions: "Actions",
      search: "Search...",
      filterBy: "Filter by",
      noResults: "No results found",
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
      select: "Select",
      selectDate: "Select date",
      all: "All",
      confirmDelete: "Are you sure you want to delete this recruitment request?",
      deleteWarning: "This action cannot be undone.",
      page: "Page",
      of: "of",
      total: "total",
      previous: "Previous",
      next: "Next",
      basicInfo: "Basic Information",
      requirements: "Requirements",
      workflow: "Workflow",
    },

    // Page
    title: "Recruitment Requests",
    subtitle: "Manage recruitment requests and track hiring progress",

    // Status
    status: {
      draft: "Draft",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      open: "Open",
      closed: "Closed",
      cancelled: "Cancelled",
    },

    // Priority
    priority: {
      label: "Priority",
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent",
    },

    // Employment Type
    employmentType: {
      label: "Employment Type",
      fullTime: "Full Time",
      partTime: "Part Time",
      contract: "Contract",
      intern: "Intern",
    },

    // Fields
    requestCode: "Request Code",
    requestDate: "Request Date",
    requestedBy: "Requested By",
    division: "Division",
    position: "Position",
    requiredCount: "Required Count",
    filledCount: "Filled Count",
    openPositions: "Open Positions",
    expectedStartDate: "Expected Start Date",
    salaryRange: "Salary Range",
    salaryRangeMin: "Min Salary",
    salaryRangeMax: "Max Salary",
    jobDescription: "Job Description",
    qualifications: "Qualifications",
    notes: "Notes",
    approvedBy: "Approved By",
    approvedAt: "Approved At",
    rejectedAt: "Rejected At",
    rejectionNotes: "Rejection Notes",
    closedAt: "Closed At",

    // Search
    search: "Search recruitment requests...",

    // CRUD
    add: "Add Request",
    edit: "Edit Request",
    delete: "Delete Request",
    detail: "Request Detail",
    notFound: "No recruitment requests found",
    created: "Recruitment request created successfully",
    updated: "Recruitment request updated successfully",
    deleted: "Recruitment request deleted successfully",
    statusUpdated: "Recruitment request status updated successfully",
    filledCountUpdated: "Filled count updated successfully",
    deleteDesc:
      "Are you sure you want to delete this recruitment request? This action cannot be undone. Only draft requests can be deleted.",

    // Actions
    actions: {
      submit: "Submit for Approval",
      resubmit: "Resubmit for Approval",
      approve: "Approve",
      reject: "Reject",
      open: "Open for Hiring",
      close: "Close",
      cancelRequest: "Cancel Request",
      updateFilled: "Update Filled Count",
    },

    // Tabs
    tabs: {
      general: "General",
      requirements: "Requirements",
      workflow: "Workflow",
    },

    // Validation
    validation: {
      required: "This field is required",
      invalidId: "Invalid selection",
      requiredCountPositive: "Required count must be greater than 0",
      requiredCountMin: "At least 1 position required",
      mustBeInteger: "Must be a whole number",
      salaryMin: "Salary cannot be negative",
      maxLength: "Maximum length exceeded",
    },
  },
};

export type RecruitmentTranslations = typeof recruitmentEn;
