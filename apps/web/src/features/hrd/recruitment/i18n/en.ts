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
      confirmDelete:
        "Are you sure you want to delete this recruitment request?",
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

    // Detail Page
    detailInfo: "Detail Information",

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
      // Uppercase variants (from backend enum)
      FULL_TIME: "Full Time",
      PART_TIME: "Part Time",
      CONTRACT: "Contract",
      INTERN: "Intern",
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
    progressLabel: "Progress",
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
      info: "Information",
      applicants: "Applicants",
    },

    // Views
    views: {
      card: "Card",
      list: "List",
    },

    // Card
    card: {
      clickToView: "Click to view details",
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
      invalidEmail: "Invalid email address",
      invalidUrl: "Invalid URL",
    },

    // Navigation
    backToList: "Back to List",
    requestNotFound: "The requested recruitment request could not be found",

    // Applicants
    applicants: {
      title: "Applicants",
      add: "Add Applicant",
      edit: "Edit Applicant",
      delete: "Delete Applicant",
      detail: "Applicant Detail",
      empty: "No applicants in this stage",
      noStages: "No pipeline stages configured",
      singular: "Applicant",
      dragHelp: "Drag applicants to move between stages",
      noResume: "No CV",
      hasResume: "CV",
      contactInfo: "Contact Information",
      applicationDetails: "Application Details",
      activityHistory: "Activity History",
      noActivities: "No activities recorded yet",
      viewResume: "View Resume",
      appliedAt: "Applied",
      notes: "Notes",
      addDescription: "Add a new applicant to this recruitment request",
      editDescription: "Update applicant information",
      deleteDesc:
        "Are you sure you want to delete this applicant? This action cannot be undone.",
      created: "Applicant added successfully",
      updated: "Applicant updated successfully",
      deleted: "Applicant deleted successfully",

      fields: {
        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        resume: "Resume/CV URL",
        linkedin: "LinkedIn Profile",
        source: "Source",
        rating: "Rating",
        appliedAt: "Applied Date",
        stage: "Stage",
        notes: "Notes",
        name: "Name",
        nik: "NIK (National ID)",
        dateOfBirth: "Date of Birth",
        placeOfBirth: "Place of Birth",
        gender: "Gender",
        religion: "Religion",
        address: "Address",
        contractType: "Contract Type",
        contractNumber: "Contract Number",
        startDate: "Start Date",
        endDate: "End Date",
        selectGender: "Select gender",
        selectContractType: "Select contract type",
        genderMale: "Male",
        genderFemale: "Female",
      },

      placeholders: {
        fullName: "Enter full name",
        email: "Enter email address",
        phone: "Enter phone number",
        resume: "Upload CV/Resume (PDF, DOC, DOCX)",
        linkedin: "https://linkedin.com/in/username",
        notes: "Add notes about the applicant...",
      },

      errors: {
        alreadyConverted:
          "Cannot change stage. This applicant has already been converted to an employee.",
        invalidLinkedIn: "Please enter a valid LinkedIn profile URL",
      },

      sources: {
        linkedin: "LinkedIn",
        jobstreet: "JobStreet",
        glints: "Glints",
        referral: "Referral",
        direct: "Direct Application",
        other: "Other",
      },
      selectSource: "Select source",

      actions: {
        moveStage: "Move Stage",
        scheduleInterview: "Schedule Interview",
        sendOffer: "Send Offer",
        hire: "Hire",
        reject: "Reject",
      },

      moveStage: {
        title: "Move Applicant",
        description: "Move {name} to {stage}?",
        fromStage: "Current Stage",
        toStage: "Target Stage",
        reason: "Reason",
        reasonPlaceholder:
          "Enter reason for stage change (required for rejection)...",
        notes: "Additional Notes",
        notesPlaceholder: "Add any additional notes...",
        confirm: "Move Applicant",
      },

      // Convert to Employee
      convertToEmployee: "Convert to Employee",
      converting: "Converting...",
      convertTitle: "Convert Applicant to Employee",
      convertDescription: "Confirm to convert this applicant to an employee.",
      convertInfo:
        "Employee data will be created using the applicant's information. You can complete additional details in Master Data > Employees after conversion.",
      employeeInfo: "Employee Information",
      employeeCode: "Employee Code",
      viewEmployee: "View Employee Profile",
      alreadyConverted: "Already converted to employee",
      canConvertOnlyWhenHired: "Can only convert when applicant is hired",
      converted: "Converted",

      sections: {
        basicInfo: "Basic Information",
        identity: "Identity Documents",
        address: "Address",
        contract: "Employment Contract",
      },

      contractTypes: {
        PKWTT: "Permanent (PKWTT)",
        PKWT: "Contract (PKWT)",
        Intern: "Internship",
      },
    },
  },
};

export type RecruitmentTranslations = typeof recruitmentEn;
