export const evaluationEn = {
  evaluation: {
    // Common
    common: {
      status: "Status",
      actions: "Actions",
      search: "Search...",
      filterBy: "Filter by",
      error: "Failed to load data",
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      update: "Update",
      create: "Create",
      edit: "Edit",
      view: "View",
      select: "Select",
      selectDate: "Select date",
      all: "All",
      active: "Active",
      inactive: "Inactive",
    },

    // Page
    title: "Employee Evaluation",
    subtitle: "Manage evaluation groups, criteria, and employee performance evaluations",

    // Tabs
    tabs: {
      evaluations: "Evaluations",
      groups: "Evaluation Groups",
    },

    // Status
    status: {
      draft: "Draft",
      submitted: "Submitted",
      reviewed: "Reviewed",
      finalized: "Finalized",
    },

    // Evaluation Type
    evaluationType: {
      self: "Self Assessment",
      manager: "Manager Review",
    },

    // Actions
    actions: {
      submit: "Submit",
      review: "Mark as Reviewed",
      finalize: "Finalize",
    },

    // Evaluation Group
    group: {
      title: "Evaluation Groups",
      label: "Evaluation Group",
      name: "Name",
      namePlaceholder: "Enter group name",
      description: "Description",
      descriptionPlaceholder: "Enter group description",
      isActive: "Active",
      totalWeight: "Total Weight",
      search: "Search evaluation groups...",
      add: "Add Group",
      edit: "Edit Group",
      delete: "Delete Group",
      deleted: "Evaluation group deleted successfully",
      created: "Evaluation group created successfully",
      updated: "Evaluation group updated successfully",
      notFound: "No evaluation groups found",
      deleteDesc:
        "Are you sure you want to delete this evaluation group? This will also delete all associated criteria. This action cannot be undone.",
    },

    // Evaluation Criteria
    criteria: {
      title: "Criteria",
      label: "Criteria",
      name: "Name",
      namePlaceholder: "Enter criteria name",
      description: "Description",
      descriptionPlaceholder: "Enter criteria description",
      evaluationGroup: "Evaluation Group",
      weight: "Weight",
      maxScore: "Max Score",
      sortOrder: "Order",
      search: "Search criteria...",
      add: "Add Criteria",
      edit: "Edit Criteria",
      delete: "Delete Criteria",
      deleted: "Criteria deleted successfully",
      created: "Criteria created successfully",
      updated: "Criteria updated successfully",
      notFound: "No criteria found",
      unknown: "Unknown Criteria",
      deleteDesc:
        "Are you sure you want to delete this criteria? This action cannot be undone.",
    },

    // Employee Evaluation
    evaluation: {
      title: "Employee Evaluations",
      label: "Evaluation",
      detail: "Evaluation Detail",
      employee: "Employee",
      evaluator: "Evaluator",
      evaluationGroup: "Evaluation Group",
      type: "Type",
      period: "Period",
      periodStart: "Period Start",
      periodEnd: "Period End",
      score: "Score",
      overallScore: "Overall Score",
      weightedScore: "Weighted Score",
      criteriaScores: "Criteria Scores",
      notes: "Notes",
      notesPlaceholder: "Enter notes...",
      scoreNotes: "Score notes...",
      noScores: "No criteria scores recorded",
      search: "Search evaluations...",
      add: "Add Evaluation",
      edit: "Edit Evaluation",
      delete: "Delete Evaluation",
      deleted: "Evaluation deleted successfully",
      created: "Evaluation created successfully",
      updated: "Evaluation updated successfully",
      statusUpdated: "Evaluation status updated successfully",
      notFound: "No evaluations found",
      deleteDesc:
        "Are you sure you want to delete this evaluation? This action cannot be undone. Only draft evaluations can be deleted.",
    },

    // Validation
    validation: {
      required: "This field is required",
      maxLength: "Maximum length exceeded",
      invalidId: "Invalid selection",
      weightPositive: "Weight must be greater than 0",
      weightMax: "Weight cannot exceed 100",
      maxScorePositive: "Max score must be greater than 0",
      scoreMin: "Score cannot be negative",
    },
  },
};
