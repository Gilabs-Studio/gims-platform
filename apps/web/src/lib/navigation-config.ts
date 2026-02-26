export interface NavItem {
  id?: string;
  name: string;
  icon: string; // string key for lib/menu-icons.tsx
  url: string;
  permission?: string;
  children?: NavItem[];
}

export const navigationConfig: NavItem[] = [
  {
    name: "Dashboard",
    icon: "dashboard",
    url: "/dashboard",
    permission: "dashboard.view",
  },
  {
    name: "Master Data",
    icon: "database",
    url: "/master-data",
    children: [
      {
        name: "Geographic",
        url: "/master-data/geographic",
        icon: "globe",
        permission: "geographic.read",
      },
      {
        name: "Organization",
        url: "/master-data/organization",
        icon: "building",
        children: [
          { name: "Company", url: "/master-data/company", icon: "building", permission: "company.read" },
          { name: "Divisions", url: "/master-data/divisions", icon: "layers", permission: "division.read" },
          { name: "Job Positions", url: "/master-data/job-positions", icon: "user-cog", permission: "job_position.read" },
          { name: "Business Units", url: "/master-data/business-units", icon: "layout-list", permission: "business_unit.read" },
          { name: "Business Types", url: "/master-data/business-types", icon: "tag", permission: "business_type.read" },
          { name: "Areas", url: "/master-data/areas", icon: "map", permission: "area.read" },
        ],
      },
      { name: "Employees", url: "/master-data/employees", icon: "users", permission: "employee.read" },
      {
        name: "Supplier",
        url: "/master-data/supplier",
        icon: "truck",
        children: [
          { name: "Suppliers", url: "/master-data/suppliers", icon: "truck", permission: "supplier.read" },
          { name: "Supplier Types", url: "/master-data/supplier-types", icon: "tag", permission: "supplier_type.read" },
          { name: "Banks", url: "/master-data/banks", icon: "landmark", permission: "bank.read" },
        ],
      },
      {
        name: "Customer",
        url: "/master-data/customer",
        icon: "user",
        children: [
          { name: "Customers", url: "/master-data/customers", icon: "user-check", permission: "customer.read" },
          { name: "Customer Types", url: "/master-data/customer-types", icon: "tag", permission: "customer_type.read" },
        ],
      },
      {
        name: "Product",
        url: "/master-data/product",
        icon: "package",
        children: [
          { name: "Products", url: "/master-data/products", icon: "package", permission: "product.read" },
          { name: "Categories", url: "/master-data/product-categories", icon: "folder-tree", permission: "product_category.read" },
          { name: "Brands", url: "/master-data/product-brands", icon: "tag", permission: "product_brand.read" },
          { name: "Segments", url: "/master-data/product-segments", icon: "percent", permission: "product_segment.read" },
          { name: "Types", url: "/master-data/product-types", icon: "tag", permission: "product_type.read" },
          { name: "Packaging", url: "/master-data/packaging", icon: "box", permission: "packaging.read" },
          { name: "Unit of Measure", url: "/master-data/uom", icon: "hammer", permission: "uom.read" },
          { name: "Procurement Types", url: "/master-data/procurement-types", icon: "shopping-cart", permission: "procurement_type.read" },
        ],
      },
      { name: "Warehouses", url: "/master-data/warehouses", icon: "warehouse", permission: "warehouse.read" },
      {
        name: "Payment & Courier",
        url: "/master-data/payment-courier",
        icon: "credit-card",
        children: [
          { name: "Payment Terms", url: "/master-data/payment-terms", icon: "clock", permission: "payment_term.read" },
          { name: "Courier Agencies", url: "/master-data/courier-agencies", icon: "truck", permission: "courier_agency.read" },
          { name: "SO Sources", url: "/master-data/so-sources", icon: "file-text", permission: "so_source.read" },
        ],
      },
      { name: "Leave Types", url: "/master-data/leave-types", icon: "calendar", permission: "leave_type.read" },
      { name: "Users", url: "/master-data/users", icon: "users", permission: "user.read" },
    ],
  },
  {
    name: "Sales",
    icon: "shopping-cart",
    url: "/sales",
    children: [
      { name: "Quotations", url: "/sales/quotations", icon: "file-text", permission: "sales_quotation.read" },
      { name: "Sales Orders", url: "/sales/orders", icon: "shopping-cart", permission: "sales_order.read" },
      { name: "Delivery Orders", url: "/sales/delivery-orders", icon: "truck", permission: "delivery_order.read" },
      { name: "Customer Invoices", url: "/sales/invoices", icon: "receipt", permission: "customer_invoice.read" },
      { name: "Down Payments", url: "/sales/customer-invoice-down-payments", icon: "banknote", permission: "customer_invoice_dp.read" },
      { name: "Payments", url: "/sales/payments", icon: "credit-card", permission: "sales_payment.read" },
      { name: "Receivables Recap", url: "/sales/receivables-recap", icon: "bar-chart-3", permission: "sales_payment.read" },
      { name: "Visit Reports", url: "/sales/visits", icon: "map-pin", permission: "sales_visit.read" },
      { name: "Sales Target", url: "/sales/targets", icon: "check-square", permission: "sales_target.read" },
    ],
  },
  {
    name: "Purchase",
    icon: "truck",
    url: "/purchase",
    children: [
      { name: "Requisitions", url: "/purchase/purchase-requisitions", icon: "clipboard-list", permission: "purchase_requisition.read" },
      { name: "Purchase Orders", url: "/purchase/purchase-orders", icon: "shopping-cart", permission: "purchase_order.read" },
      { name: "Goods Receipt", url: "/purchase/goods-receipt", icon: "package", permission: "goods_receipt.read" },
      { name: "Supplier Invoices", url: "/purchase/supplier-invoices", icon: "receipt", permission: "supplier_invoice.read" },
      { name: "Down Payments", url: "/purchase/supplier-invoice-down-payments", icon: "banknote", permission: "supplier_invoice_dp.read" },
      { name: "Payments", url: "/purchase/payments", icon: "credit-card", permission: "purchase_payment.read" },
    ],
  },
  {
    name: "Stock",
    icon: "warehouse",
    url: "/stock",
    children: [
      { name: "Inventory", url: "/stock/inventory", icon: "box", permission: "inventory.read" },
      { name: "Stock Movement", url: "/stock/movements", icon: "arrow-right-left", permission: "stock_movement.read" },
      { name: "Stock Opname", url: "/stock/opname", icon: "clipboard-list", permission: "stock_opname.read" },
    ],
  },
  {
    name: "Finance",
    icon: "credit-card",
    url: "/finance",
    children: [
      { name: "Chart of Accounts", url: "/finance/coa", icon: "book-open", permission: "coa.read" },
      { name: "Journal Entries", url: "/finance/journals", icon: "file-text", permission: "journal.read" },
      { name: "Bank Accounts", url: "/finance/bank-accounts", icon: "landmark", permission: "bank_account.read" },
      { name: "Payments", url: "/finance/payments", icon: "credit-card", permission: "payment.read" },
      { name: "Tax Invoices", url: "/finance/tax-invoices", icon: "receipt", permission: "tax_invoice.read" },
      { name: "Non-Trade Payables", url: "/finance/non-trade-payables", icon: "file-text", permission: "non_trade_payable.read" },
      { name: "Budget", url: "/finance/budget", icon: "percent", permission: "budget.read" },
      { name: "Cash Bank Journal", url: "/finance/cash-bank", icon: "banknote", permission: "cash_bank.read" },
      { name: "Financial Closing", url: "/finance/closing", icon: "shield-check", permission: "financial_closing.read" },
      { name: "Asset Management", url: "/finance/assets", icon: "building-2", permission: "asset.read" },
      { name: "Asset Categories", url: "/finance/asset-categories", icon: "folder-tree", permission: "asset_category.read" },
      { name: "Asset Locations", url: "/finance/asset-locations", icon: "map-pin", permission: "asset_location.read" },
      { name: "Up Country Cost", url: "/finance/up-country-cost", icon: "map-pin", permission: "up_country_cost.read" },
      { name: "Salary", url: "/finance/salary", icon: "coins", permission: "salary.read" },
      {
        name: "Reports",
        url: "/finance/reports",
        icon: "bar-chart-3",
        children: [
          { name: "General Ledger", url: "/finance/reports/general-ledger", icon: "book-open", permission: "finance_report.gl" },
          { name: "Balance Sheet", url: "/finance/reports/balance-sheet", icon: "scale", permission: "finance_report.bs" },
          { name: "Profit & Loss", url: "/finance/reports/profit-loss", icon: "trending-up", permission: "finance_report.pl" },
          { name: "Aging Reports", url: "/finance/aging-reports", icon: "clock", permission: "journal.read" },
        ],
      },
    ],
  },
  {
    name: "HRD",
    icon: "users",
    url: "/hrd",
    children: [
      { name: "Attendance", url: "/hrd/attendance", icon: "clock", permission: "attendance.read" },
      { name: "Leave Requests", url: "/hrd/leave-requests", icon: "calendar", permission: "leave_request.read" },
      {
        name: "Employee Documents",
        url: "/hrd/documents",
        icon: "folder",
        children: [
          { name: "Contracts", url: "/hrd/contracts", icon: "file-text", permission: "employee_contract.read" },
          { name: "Education History", url: "/hrd/education", icon: "graduation-cap", permission: "education_history.read" },
          { name: "Certifications", url: "/hrd/certifications", icon: "file-check", permission: "certification.read" },
          { name: "Employee Assets", url: "/hrd/employee-assets", icon: "box", permission: "employee_asset.read" },
        ],
      },
      { name: "Evaluation", url: "/hrd/evaluation", icon: "check-square", permission: "evaluation.read" },
      { name: "Recruitment", url: "/hrd/recruitment", icon: "user-plus", permission: "recruitment.read" },
      { name: "Work Schedule", url: "/hrd/work-schedule", icon: "calendar-check", permission: "work_schedule.read" },
      { name: "Holidays", url: "/hrd/holidays", icon: "calendar", permission: "holiday.read" },
    ],
  },
  {
    name: "CRM",
    icon: "handshake",
    url: "/crm",
    children: [
      { name: "Leads", url: "/crm/leads", icon: "users", permission: "crm_lead.read" },
      { name: "Pipeline", url: "/crm/pipeline", icon: "kanban", permission: "crm_deal.read" },
      { name: "Activities", url: "/crm/activities", icon: "activity", permission: "crm_activity.read" },
      { name: "Tasks", url: "/crm/tasks", icon: "check-square", permission: "crm_task.read" },
      { name: "Schedules", url: "/crm/schedules", icon: "calendar", permission: "crm_schedule.read" },
      { name: "Visit Reports", url: "/crm/visits", icon: "map-pin", permission: "crm_visit.read" },
      { name: "Area Mapping", url: "/crm/area-mapping", icon: "map", permission: "crm_area_mapping.read" },
      { name: "Route Optimization", url: "/crm/routes", icon: "route", permission: "crm_route.read" },
      { name: "Sales Performance", url: "/crm/sales-performance", icon: "bar-chart-3", permission: "crm_sales_performance.read" },
      { name: "Product Analytics", url: "/crm/product-analytics", icon: "pie-chart", permission: "crm_product_analytics.read" },
      { name: "CRM Targets", url: "/crm/targets", icon: "target", permission: "crm_target.read" },
      {
        name: "CRM Settings",
        url: "/crm/settings",
        icon: "settings",
        children: [
          { name: "Pipeline Stages", url: "/crm/settings/pipeline-stages", icon: "layers", permission: "crm_pipeline_stage.read" },
          { name: "Lead Sources", url: "/crm/settings/lead-sources", icon: "funnel", permission: "crm_lead_source.read" },
          { name: "Lead Statuses", url: "/crm/settings/lead-statuses", icon: "tag", permission: "crm_lead_status.read" },
          { name: "Contact Roles", url: "/crm/settings/contact-roles", icon: "user-cog", permission: "crm_contact_role.read" },
          { name: "Activity Types", url: "/crm/settings/activity-types", icon: "zap", permission: "crm_activity_type.read" },
        ],
      },
    ],
  },
  {
    name: "Reports",
    icon: "bar-chart-3",
    url: "/reports",
    permission: "report.view",
    children: [
      {
        name: "Sales Overview",
        url: "/reports/sales-overview",
        icon: "trending-up",
        permission: "report_sales_overview.read",
      },
    ],
  },
  {
    name: "AI Assistant",
    icon: "bot",
    url: "/ai-assistant",
    children: [
      { name: "Chatbot", url: "/ai-chatbot", icon: "bot", permission: "ai_chatbot.view" },
      { name: "Settings", url: "/ai-settings", icon: "settings", permission: "ai_settings.view" },
    ],
  },
];
