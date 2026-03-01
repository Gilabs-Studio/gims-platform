export const geoPerformanceReportEn = {
  geoPerformanceReport: {
    title: "Geo Performance Report",
    description:
      "Visualize revenue and order distribution across geographic areas using interactive choropleth maps.",
    filters: {
      dateRange: "Date Range",
      startDate: "Start Date",
      endDate: "End Date",
      mode: "Data Source",
      modeOptions: {
        sales_order: "Sales Orders (Demand)",
        paid_invoice: "Paid Invoices (Revenue)",
      },
      level: "Aggregation Level",
      levelOptions: {
        province: "Province",
        city: "City / Regency",
      },
      salesRep: "Sales Representative",
      allSalesReps: "All Sales Reps",
      metric: "Color By",
      metricOptions: {
        revenue: "Revenue",
        frequency: "Order Frequency",
      },
      apply: "Apply Filters",
      reset: "Reset",
    },
    map: {
      loading: "Loading map data...",
      noData: "No data available for the selected filters.",
      noDataHint:
        "Try adjusting the date range, data source, or sales representative filter.",
    },
    tooltip: {
      areaName: "Area",
      totalRevenue: "Total Revenue",
      totalOrders: "Total Orders",
      avgOrderValue: "Avg. Order Value",
      province: "Province",
    },
    summary: {
      totalRevenue: "Total Revenue",
      totalOrders: "Total Orders",
      avgOrderValue: "Avg. Order Value",
      areasWithData: "Active Areas",
    },
    table: {
      title: "Area Performance Ranking",
      rank: "#",
      areaName: "Area",
      totalRevenue: "Revenue",
      totalOrders: "Orders",
      avgOrderValue: "Avg. Order",
      noData: "No area data found.",
    },
    mapStyle: {
      auto: "Auto",
      light: "Light",
      dark: "Dark",
      satellite: "Satellite",
    },
  },
};
