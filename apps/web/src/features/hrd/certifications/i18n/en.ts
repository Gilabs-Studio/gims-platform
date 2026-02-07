export const certificationEn = {
  certification: {
    // Meta tags
    meta: {
      title: "Employee Certifications",
      description: "Manage employee professional certifications and expiry tracking",
    },

    title: "Employee Certifications",
    subtitle: "Manage employee professional certifications and expiry tracking",
    add: "Add Certification",
    edit: "Edit Certification",
    // detail: "Certification Detail",
    search: "Search by certificate name or issued by...",
    delete_confirm_title: "Delete Certification",
    delete_confirm_description:
      "Are you sure you want to delete this certification? This action cannot be undone.",
    search_placeholder: "Search by certificate name or issued by...",
    filter_by_employee: "Filter by Employee",
    all_employees: "All Employees",
    expiring_soon: "Expiring Soon",
    expired: "Expired",
    valid: "Valid",
    no_expiry: "No Expiry",

    // Table columns
    columns: {
      employee: "Employee",
      certificate_name: "Certificate Name",
      issued_by: "Issued By",
      issue_date: "Issue Date",
      expiry_date: "Expiry Date",
      status: "Status",
      certificate_number: "Certificate Number",
      days_remaining: "Days Remaining",
      actions: "Actions",
    },

    // Field labels (alias for columns)
    field: {
      employee: "Employee",
      certificate_name: "Certificate Name",
      issued_by: "Issued By",
      issue_date: "Issue Date",
      expiry_date: "Expiry Date",
      status: "Status",
      certificate_number: "Certificate Number",
      certificate_file: "Certificate File",
      description: "Description",
      employee_code: "Employee Code",
      employee_name: "Employee Name",
      created_at: "Created At",
      updated_at: "Last Updated",
    },

    // Common labels
    common: {
      status: "Status",
      loading: "Loading...",
      certification: "Certification",
      view: "View",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      create: "Create",
      update: "Update",
    },

    // Days remaining messages
    days_remaining: "{days} days remaining",
    expired_days_ago: "Expired {days} days ago",

    // Detail modal
    detail: {
      title: "Certification Details",
      description: "View detailed information about this certification",
      employee_info: "Employee Information",
      certification_info: "Certification Details",
    },

    // Actions
    action: {
      download_certificate: "Download Certificate",
    },

    // Delete confirmation
    delete: {
      title: "Delete Certification",
      confirm_message:
        "Are you sure you want to delete this certification? This action cannot be undone.",
    },

    // Form labels
    form: {
      create_title: "Create Certification",
      edit_title: "Edit Certification",
      select_employee: "Select employee",
      pick_date: "Pick a date",
      employee_label: "Employee",
      employee_placeholder: "Select employee",
      certificate_name_label: "Certificate Name",
      certificate_name_placeholder: "e.g., AWS Certified Solutions Architect",
      issued_by_label: "Issued By",
      issued_by_placeholder: "e.g., Amazon Web Services",
      issue_date_label: "Issue Date",
      expiry_date_label: "Expiry Date (Optional)",
      expiry_date_help: "Leave empty if certification does not expire",
      expiry_date_description: "Leave empty if certification does not expire",
      certificate_number_label: "Certificate Number (Optional)",
      certificate_number_placeholder: "e.g., AWS-CSA-12345",
      certificate_file_label: "Certificate File (Optional)",
      certificate_file_placeholder: "Enter certificate file path or URL",
      certificate_file_description: "Optional: Path or URL to the certificate document",
      description_label: "Description (Optional)",
      description_placeholder: "Additional notes or certification details...",
      submit_create: "Create Certification",
      submit_update: "Update Certification",
      cancel: "Cancel",
    },

    // Detail view
    detail_view: {
      employee_info: "Employee Information",
      employee_code: "Employee Code",
      employee_name: "Name",
      certification_info: "Certification Details",
      certificate_name: "Certificate Name",
      issued_by: "Issued By",
      issue_date: "Issue Date",
      expiry_date: "Expiry Date",
      never_expires: "Never Expires",
      certificate_number: "Certificate Number",
      status: "Status",
      days_until_expiry: "Days Until Expiry",
      days_remaining: "{{count}} days remaining",
      expired_days_ago: "Expired {{count}} days ago",
      additional_info: "Additional Information",
      description: "Description",
      no_description: "No description provided",
      certificate_file: "Certificate File",
      download_certificate: "Download Certificate",
      created_at: "Created At",
      updated_at: "Last Updated",
      actions: "Actions",
      edit_button: "Edit",
      delete_button: "Delete",
      back_to_list: "Back to List",
    },

    // Status badges
    status: {
      expired: "Expired",
      expiring_soon: "Expiring Soon",
      valid: "Valid",
      no_expiry: "No Expiry",
    },

    // Empty states
    empty: {
      no_certifications: "No certifications found",
      no_certifications_description:
        "Start by adding your first employee certification.",
      no_results: "No results found",
      no_results_description: "Try adjusting your search or filter criteria.",
    },

    // Validation messages
    validation: {
      invalid_employee: "Please select a valid employee",
      certificate_name_required: "Certificate name is required",
      certificate_name_max: "Certificate name must not exceed 200 characters",
      issued_by_required: "Issuing organization is required",
      issued_by_max: "Issuing organization must not exceed 200 characters",
      issue_date_required: "Issue date is required",
      expiry_after_issue: "Expiry date must be after issue date",
      certificate_number_max:
        "Certificate number must not exceed 100 characters",
      description_max: "Description must not exceed 1000 characters",
    },

    // Toast messages
    toast: {
      create_success: "Certification created successfully",
      create_error: "Failed to create certification",
      update_success: "Certification updated successfully",
      update_error: "Failed to update certification",
      delete_success: "Certification deleted successfully",
      delete_error: "Failed to delete certification",
    },

    // Alert/Dashboard
    alert: {
      expiring_title: "Certifications Expiring Soon",
      expiring_description: "The following certifications will expire within 30 days",
      expired_title: "Expired Certifications",
      expired_description: "These certifications have already expired",
      view_all: "View All",
    },
  },
};
