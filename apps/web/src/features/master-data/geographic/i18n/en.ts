export const geographicEn = {
  geographic: {
    // Common
    common: {
      geographic: "Geographic",
      countries: "Countries",
      provinces: "Provinces",
      cities: "Cities",
      districts: "Districts",
      villages: "Villages",
      status: "Status",
      code: "Code",
      name: "Name",
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
      active: "Active",
      inactive: "Inactive",
      edit: "Edit",
      confirmDelete: "Are you sure you want to delete this item?",
      deleteWarning: "This action cannot be undone.",
      page: "Page",
      of: "of",
      total: "total",
      previous: "Previous",
      next: "Next",
      select: "Select",
      statusUpdated: "Status updated successfully",
    },

    // Map page
    map: {
      title: "Geographic Map",
      subtitle: "Explore provinces, cities, and districts on an interactive map",
      filters: "Map Filters",
      selectProvince: "Select Province",
      selectCity: "Select City",
      selectDistrict: "Select District",
      resetFilters: "Reset",
      noData: "No geographic data available for this selection",
      featureCount: "features",
    },

    // Location selector
    location: {
      province: "Province",
      city: "City",
      district: "District",
      village: "Village",
      selectProvince: "Select Province",
      selectCity: "Select City",
      selectDistrict: "Select District",
      selectVillage: "Select Village",
      selectProvinceFirst: "Select province first",
      selectCityFirst: "Select city first",
      selectDistrictFirst: "Select district first",
    },

    // Validation
    validation: {
      nameMin: "Name must be at least 2 characters",
      nameMax: "Name cannot exceed 100 characters",
      codeMin: "Code must be at least 2 characters",
      codeMax: "Code cannot exceed 20 characters",
      countryCodeMax: "Country code cannot exceed 10 characters",
      phoneCodeMax: "Phone code cannot exceed 10 characters",
      postalCodeMax: "Postal code cannot exceed 10 characters",
      required: "This field is required",
    },
  },
};

export type GeographicTranslations = typeof geographicEn;
