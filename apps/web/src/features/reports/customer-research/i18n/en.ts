export const customerResearchReportEn = {
  customerResearchReport: {
    title: "Customer Research",
    description:
      "Analyze customer activity, revenue patterns, and relationship quality over time.",
    kpis: {
      total_customers: "Total Customers",
      active_customers: "Active Customers",
      inactive_customers: "Inactive Customers",
      total_revenue: "Total Revenue",
      average_order_value: "Average Order Value",
    },
    chart: {
      title: "Revenue Trend Over Time",
      description: "Revenue trend by selected interval and date range.",
      total_revenue: "Total Revenue",
      revenue_by_customer: "Revenue by Customer",
      revenue_by_customer_desc: "Top customers by total revenue.",
      purchase_frequency: "Customer Purchase Frequency",
      purchase_frequency_desc: "Top customers by total orders.",
      no_data: "No trend data found for the selected period.",
      interval: {
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
      },
    },
    table: {
      title: "Customer Insights Table",
      description: "Top, inactive, and payment behavior customer data.",
      search_placeholder: "Search customer by name or code...",
      tabs: {
        top: "Top Customers",
        inactive: "Inactive Customers",
        payment_behavior: "Payment Behavior",
      },
      columns: {
        customer: "Customer",
        total_revenue: "Total Revenue",
        total_orders: "Total Orders",
        average_order_value: "Average Order Value",
        last_order_date: "Last Order Date",
      },
      empty: {
        default: "No customer data found for the selected filters.",
        payment_behavior: "No payment behavior data found for the selected filters.",
      },
    },
    detail: {
      title: "Customer Detail",
      description: "Detailed customer metrics for the selected period.",
      not_found: "Customer detail not found.",
      total_revenue: "Total Revenue",
      total_orders: "Total Orders",
      average_order_value: "Average Order Value",
      last_order_date: "Last Order Date"
    },
  },
};
