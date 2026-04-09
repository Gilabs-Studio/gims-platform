package seeders

import (
	"context"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	permission "github.com/gilabs/gims/api/internal/permission/data/models"
	role "github.com/gilabs/gims/api/internal/role/data/models"
	"gorm.io/gorm"
)

// permissionDef defines a permission with its menu URL, code, name, action, and resource
type permissionDef struct {
	menuURL  string
	code     string
	name     string
	action   string
	resource string
}

// SeedPermissions seeds initial permissions for all ERP menus
func SeedPermissions() error {

	log.Println("Seeding ERP permissions...")

	// Define all permissions grouped by module
	permissions := []permissionDef{
		// Dashboard
		{"/dashboard", "dashboard.view", "View Dashboard", "VIEW", "dashboard"},

		// Master Data - Geographic (read-only map page)
		{"/master-data/geographic", "geographic.read", "View Geographic Map", "VIEW", "geographic"},

		// Master Data - Organization
		{"/master-data/company", "company.read", "View Company", "VIEW", "company"},
		{"/master-data/company", "company.create", "Create Company", "CREATE", "company"},
		{"/master-data/company", "company.update", "Edit Company", "EDIT", "company"},
		{"/master-data/company", "company.delete", "Delete Company", "DELETE", "company"},
		{"/master-data/company", "company.approve", "Approve Company", "APPROVE", "company"},

		{"/master-data/divisions", "division.read", "View Divisions", "VIEW", "division"},
		{"/master-data/divisions", "division.create", "Create Divisions", "CREATE", "division"},
		{"/master-data/divisions", "division.update", "Edit Divisions", "EDIT", "division"},
		{"/master-data/divisions", "division.delete", "Delete Divisions", "DELETE", "division"},

		{"/master-data/job-positions", "job_position.read", "View Job Positions", "VIEW", "job_position"},
		{"/master-data/job-positions", "job_position.create", "Create Job Positions", "CREATE", "job_position"},
		{"/master-data/job-positions", "job_position.update", "Edit Job Positions", "EDIT", "job_position"},
		{"/master-data/job-positions", "job_position.delete", "Delete Job Positions", "DELETE", "job_position"},

		{"/master-data/business-units", "business_unit.read", "View Business Units", "VIEW", "business_unit"},
		{"/master-data/business-units", "business_unit.create", "Create Business Units", "CREATE", "business_unit"},
		{"/master-data/business-units", "business_unit.update", "Edit Business Units", "EDIT", "business_unit"},
		{"/master-data/business-units", "business_unit.delete", "Delete Business Units", "DELETE", "business_unit"},

		{"/master-data/business-types", "business_type.read", "View Business Types", "VIEW", "business_type"},
		{"/master-data/business-types", "business_type.create", "Create Business Types", "CREATE", "business_type"},
		{"/master-data/business-types", "business_type.update", "Edit Business Types", "EDIT", "business_type"},
		{"/master-data/business-types", "business_type.delete", "Delete Business Types", "DELETE", "business_type"},

		{"/master-data/areas", "area.read", "View Areas", "VIEW", "area"},
		{"/master-data/areas", "area.create", "Create Areas", "CREATE", "area"},
		{"/master-data/areas", "area.update", "Edit Areas", "EDIT", "area"},
		{"/master-data/areas", "area.delete", "Delete Areas", "DELETE", "area"},
		// Sprint 17: supervisor/member assignment now lives on employee_areas
		{"/master-data/areas", "area.assign_supervisor", "Assign Area Supervisors", "EDIT", "area"},
		{"/master-data/areas", "area.assign_member", "Assign Area Members", "EDIT", "area"},
		// Employees can be marked as supervisor of an area from the employee side
		{"/master-data/employees", "employee.assign_area", "Assign Employee to Area", "EDIT", "employee"},

		// Master Data - Employee
		{"/master-data/employees", "employee.read", "View Employees", "VIEW", "employee"},
		{"/master-data/employees", "employee.create", "Create Employees", "CREATE", "employee"},
		{"/master-data/employees", "employee.update", "Edit Employees", "EDIT", "employee"},
		{"/master-data/employees", "employee.delete", "Delete Employees", "DELETE", "employee"},
		{"/master-data/employees", "employee.approve", "Approve Employees", "APPROVE", "employee"},

		// Master Data - Supplier
		{"/master-data/suppliers", "supplier.read", "View Suppliers", "VIEW", "supplier"},
		{"/master-data/suppliers", "supplier.create", "Create Suppliers", "CREATE", "supplier"},
		{"/master-data/suppliers", "supplier.update", "Edit Suppliers", "EDIT", "supplier"},
		{"/master-data/suppliers", "supplier.delete", "Delete Suppliers", "DELETE", "supplier"},
		{"/master-data/suppliers", "supplier.approve", "Approve Suppliers", "APPROVE", "supplier"},

		{"/master-data/supplier-types", "supplier_type.read", "View Supplier Types", "VIEW", "supplier_type"},
		{"/master-data/supplier-types", "supplier_type.create", "Create Supplier Types", "CREATE", "supplier_type"},
		{"/master-data/supplier-types", "supplier_type.update", "Edit Supplier Types", "EDIT", "supplier_type"},
		{"/master-data/supplier-types", "supplier_type.delete", "Delete Supplier Types", "DELETE", "supplier_type"},

		{"/master-data/banks", "bank.read", "View Banks", "VIEW", "bank"},
		{"/master-data/banks", "bank.create", "Create Banks", "CREATE", "bank"},
		{"/master-data/banks", "bank.update", "Edit Banks", "EDIT", "bank"},
		{"/master-data/banks", "bank.delete", "Delete Banks", "DELETE", "bank"},

		// Master Data - Customer
		{"/master-data/customers", "customer.read", "View Customers", "VIEW", "customer"},
		{"/master-data/customers", "customer.create", "Create Customers", "CREATE", "customer"},
		{"/master-data/customers", "customer.update", "Edit Customers", "EDIT", "customer"},
		{"/master-data/customers", "customer.delete", "Delete Customers", "DELETE", "customer"},
		{"/master-data/customers", "customer.submit", "Submit Customers", "SUBMIT", "customer"},
		{"/master-data/customers", "customer.approve", "Approve Customers", "APPROVE", "customer"},
		{"/master-data/customer", "customer_menu.read", "View Customer Menu", "VIEW", "customer"}, // Mapping for parent/aliased menu

		{"/master-data/customer-types", "customer_type.read", "View Customer Types", "VIEW", "customer_type"},
		{"/master-data/customer-types", "customer_type.create", "Create Customer Types", "CREATE", "customer_type"},
		{"/master-data/customer-types", "customer_type.update", "Edit Customer Types", "EDIT", "customer_type"},
		{"/master-data/customer-types", "customer_type.delete", "Delete Customer Types", "DELETE", "customer_type"},

		// Master Data - Product
		{"/master-data/products", "product.read", "View Products", "VIEW", "product"},
		{"/master-data/products", "product.create", "Create Products", "CREATE", "product"},
		{"/master-data/products", "product.update", "Edit Products", "EDIT", "product"},
		{"/master-data/products", "product.delete", "Delete Products", "DELETE", "product"},
		{"/master-data/products", "product.approve", "Approve Products", "APPROVE", "product"},

		{"/master-data/product-categories", "product_category.read", "View Product Categories", "VIEW", "product_category"},
		{"/master-data/product-categories", "product_category.create", "Create Product Categories", "CREATE", "product_category"},
		{"/master-data/product-categories", "product_category.update", "Edit Product Categories", "EDIT", "product_category"},
		{"/master-data/product-categories", "product_category.delete", "Delete Product Categories", "DELETE", "product_category"},

		{"/master-data/product-brands", "product_brand.read", "View Product Brands", "VIEW", "product_brand"},
		{"/master-data/product-brands", "product_brand.create", "Create Product Brands", "CREATE", "product_brand"},
		{"/master-data/product-brands", "product_brand.update", "Edit Product Brands", "EDIT", "product_brand"},
		{"/master-data/product-brands", "product_brand.delete", "Delete Product Brands", "DELETE", "product_brand"},

		{"/master-data/product-segments", "product_segment.read", "View Product Segments", "VIEW", "product_segment"},
		{"/master-data/product-segments", "product_segment.create", "Create Product Segments", "CREATE", "product_segment"},
		{"/master-data/product-segments", "product_segment.update", "Edit Product Segments", "EDIT", "product_segment"},
		{"/master-data/product-segments", "product_segment.delete", "Delete Product Segments", "DELETE", "product_segment"},

		{"/master-data/product-types", "product_type.read", "View Product Types", "VIEW", "product_type"},
		{"/master-data/product-types", "product_type.create", "Create Product Types", "CREATE", "product_type"},
		{"/master-data/product-types", "product_type.update", "Edit Product Types", "EDIT", "product_type"},
		{"/master-data/product-types", "product_type.delete", "Delete Product Types", "DELETE", "product_type"},

		{"/master-data/packaging", "packaging.read", "View Packaging", "VIEW", "packaging"},
		{"/master-data/packaging", "packaging.create", "Create Packaging", "CREATE", "packaging"},
		{"/master-data/packaging", "packaging.update", "Edit Packaging", "EDIT", "packaging"},
		{"/master-data/packaging", "packaging.delete", "Delete Packaging", "DELETE", "packaging"},

		{"/master-data/uom", "uom.read", "View Units of Measure", "VIEW", "uom"},
		{"/master-data/uom", "uom.create", "Create Units of Measure", "CREATE", "uom"},
		{"/master-data/uom", "uom.update", "Edit Units of Measure", "EDIT", "uom"},
		{"/master-data/uom", "uom.delete", "Delete Units of Measure", "DELETE", "uom"},

		{"/master-data/procurement-types", "procurement_type.read", "View Procurement Types", "VIEW", "procurement_type"},
		{"/master-data/procurement-types", "procurement_type.create", "Create Procurement Types", "CREATE", "procurement_type"},
		{"/master-data/procurement-types", "procurement_type.update", "Edit Procurement Types", "EDIT", "procurement_type"},
		{"/master-data/procurement-types", "procurement_type.delete", "Delete Procurement Types", "DELETE", "procurement_type"},

		// Master Data - Warehouse
		{"/master-data/warehouses", "warehouse.read", "View Warehouses", "VIEW", "warehouse"},
		{"/master-data/warehouses", "warehouse.create", "Create Warehouses", "CREATE", "warehouse"},
		{"/master-data/warehouses", "warehouse.update", "Edit Warehouses", "EDIT", "warehouse"},
		{"/master-data/warehouses", "warehouse.delete", "Delete Warehouses", "DELETE", "warehouse"},

		// Master Data - Payment & Courier
		{"/master-data/currencies", "currency.read", "View Currencies", "VIEW", "currency"},
		{"/master-data/currencies", "currency.create", "Create Currencies", "CREATE", "currency"},
		{"/master-data/currencies", "currency.update", "Edit Currencies", "EDIT", "currency"},
		{"/master-data/currencies", "currency.delete", "Delete Currencies", "DELETE", "currency"},

		{"/master-data/payment-terms", "payment_term.read", "View Payment Terms", "VIEW", "payment_term"},
		{"/master-data/payment-terms", "payment_term.create", "Create Payment Terms", "CREATE", "payment_term"},
		{"/master-data/payment-terms", "payment_term.update", "Edit Payment Terms", "EDIT", "payment_term"},
		{"/master-data/payment-terms", "payment_term.delete", "Delete Payment Terms", "DELETE", "payment_term"},

		{"/master-data/courier-agencies", "courier_agency.read", "View Courier Agencies", "VIEW", "courier_agency"},
		{"/master-data/courier-agencies", "courier_agency.create", "Create Courier Agencies", "CREATE", "courier_agency"},
		{"/master-data/courier-agencies", "courier_agency.update", "Edit Courier Agencies", "EDIT", "courier_agency"},
		{"/master-data/courier-agencies", "courier_agency.delete", "Delete Courier Agencies", "DELETE", "courier_agency"},

		{"/master-data/so-sources", "so_source.read", "View SO Sources", "VIEW", "so_source"},
		{"/master-data/so-sources", "so_source.create", "Create SO Sources", "CREATE", "so_source"},
		{"/master-data/so-sources", "so_source.update", "Edit SO Sources", "EDIT", "so_source"},
		{"/master-data/so-sources", "so_source.delete", "Delete SO Sources", "DELETE", "so_source"},

		// Master Data - Leave Types
		{"/master-data/leave-types", "leave_type.read", "View Leave Types", "VIEW", "leave_type"},
		{"/master-data/leave-types", "leave_type.create", "Create Leave Types", "CREATE", "leave_type"},
		{"/master-data/leave-types", "leave_type.update", "Edit Leave Types", "EDIT", "leave_type"},
		{"/master-data/leave-types", "leave_type.delete", "Delete Leave Types", "DELETE", "leave_type"},

		// Master Data - Users (RBAC)
		{"/master-data/users", "user.read", "View Users", "VIEW", "user"},
		{"/master-data/users", "user.create", "Create Users", "CREATE", "user"},
		{"/master-data/users", "user.update", "Edit Users", "EDIT", "user"},
		{"/master-data/users", "user.delete", "Delete Users", "DELETE", "user"},
		{"/master-data/users", "role.read", "View Roles", "VIEW", "role"},
		{"/master-data/users", "role.create", "Create Roles", "CREATE", "role"},
		{"/master-data/users", "role.update", "Update Roles", "EDIT", "role"},
		{"/master-data/users", "role.delete", "Delete Roles", "DELETE", "role"},
		{"/master-data/users", "role.assign_permissions", "Assign Permissions", "ASSIGN", "role"},
		{"/master-data/users", "permission.read", "View Permissions", "VIEW", "permission"},

		// Sales
		{"/sales/quotations", "sales_quotation.read", "View Sales Quotations", "VIEW", "sales_quotation"},
		{"/sales/quotations", "sales_quotation.create", "Create Sales Quotations", "CREATE", "sales_quotation"},
		{"/sales/quotations", "sales_quotation.update", "Edit Sales Quotations", "EDIT", "sales_quotation"},
		{"/sales/quotations", "sales_quotation.delete", "Delete Sales Quotations", "DELETE", "sales_quotation"},
		{"/sales/quotations", "sales_quotation.approve", "Approve Sales Quotations", "APPROVE", "sales_quotation"},
		{"/sales/quotations", "sales_quotation.print", "Print Sales Quotations", "PRINT", "sales_quotation"},

		{"/sales/orders", "sales_order.read", "View Sales Orders", "VIEW", "sales_order"},
		{"/sales/orders", "sales_order.create", "Create Sales Orders", "CREATE", "sales_order"},
		{"/sales/orders", "sales_order.update", "Edit Sales Orders", "EDIT", "sales_order"},
		{"/sales/orders", "sales_order.delete", "Delete Sales Orders", "DELETE", "sales_order"},
		{"/sales/orders", "sales_order.approve", "Approve Sales Orders", "APPROVE", "sales_order"},
		{"/sales/orders", "sales_order.print", "Print Sales Orders", "PRINT", "sales_order"},
		{"/sales/orders", "sales_order.submit", "Submit Sales Orders", "SUBMIT", "sales_order"},
		{"/sales/orders", "sales_order.credit_override", "Override Credit Limit on Sales Orders", "OVERRIDE", "sales_order"},

		{"/sales/delivery-orders", "delivery_order.read", "View Delivery Orders", "VIEW", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.create", "Create Delivery Orders", "CREATE", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.update", "Edit Delivery Orders", "EDIT", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.delete", "Delete Delivery Orders", "DELETE", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.approve", "Approve Delivery Orders", "APPROVE", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.ship", "Ship Delivery Orders", "SHIP", "delivery_order"},
		{"/sales/delivery-orders", "delivery_order.deliver", "Deliver Delivery Orders", "DELIVER", "delivery_order"},

		{"/sales/invoices", "customer_invoice.read", "View Customer Invoices", "VIEW", "customer_invoice"},
		{"/sales/invoices", "customer_invoice.create", "Create Customer Invoices", "CREATE", "customer_invoice"},
		{"/sales/invoices", "customer_invoice.update", "Edit Customer Invoices", "EDIT", "customer_invoice"},
		{"/sales/invoices", "customer_invoice.delete", "Delete Customer Invoices", "DELETE", "customer_invoice"},
		{"/sales/invoices", "customer_invoice.approve", "Approve Customer Invoices", "APPROVE", "customer_invoice"},
		{"/sales/invoices", "customer_invoice.print", "Print Customer Invoices", "PRINT", "customer_invoice"},

		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.read", "View Down Payments", "VIEW", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.create", "Create Down Payments", "CREATE", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.update", "Edit Down Payments", "EDIT", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.delete", "Delete Down Payments", "DELETE", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.pending", "Pending Down Payments", "PENDING", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.submit", "Submit Down Payments", "SUBMIT", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.approve", "Approve Down Payments", "APPROVE", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.export", "Export Down Payments", "EXPORT", "customer_invoice_dp"},
		{"/sales/customer-invoice-down-payments", "customer_invoice_dp.print", "Print Down Payment Invoices", "PRINT", "customer_invoice_dp"},

		{"/sales/returns", "sales_return.read", "View Sales Returns", "VIEW", "sales_return"},
		{"/sales/returns", "sales_return.create", "Create Sales Returns", "CREATE", "sales_return"},
		{"/sales/returns", "sales_return.update", "Edit Sales Returns", "EDIT", "sales_return"},
		{"/sales/returns", "sales_return.delete", "Delete Sales Returns", "DELETE", "sales_return"},

		{"/sales/estimations", "sales_estimation.read", "View Sales Estimations", "VIEW", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.create", "Create Sales Estimations", "CREATE", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.update", "Edit Sales Estimations", "EDIT", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.delete", "Delete Sales Estimations", "DELETE", "sales_estimation"},
		{"/sales/receivables-recap", "receivables_recap.read", "View Receivables Recap", "VIEW", "receivables_recap"},

		{"/crm/targets", "sales_target.read", "View Sales Targets", "VIEW", "sales_target"},
		{"/crm/targets", "sales_target.create", "Create Sales Targets", "CREATE", "sales_target"},
		{"/crm/targets", "sales_target.update", "Edit Sales Targets", "EDIT", "sales_target"},
		{"/crm/targets", "sales_target.delete", "Delete Sales Targets", "DELETE", "sales_target"},

		// Backwards-compatible yearly target permissions (used by yearly-targets routes/pages)
		{"/crm/targets", "yearly_target.read", "View Yearly Targets", "VIEW", "yearly_target"},
		{"/crm/targets", "yearly_target.create", "Create Yearly Targets", "CREATE", "yearly_target"},
		{"/crm/targets", "yearly_target.update", "Edit Yearly Targets", "EDIT", "yearly_target"},
		{"/crm/targets", "yearly_target.delete", "Delete Yearly Targets", "DELETE", "yearly_target"},

		// Sales Payments
		{"/sales/payments", "sales_payment.read", "View Sales Payments", "VIEW", "sales_payment"},
		{"/sales/payments", "sales_payment.create", "Create Sales Payments", "CREATE", "sales_payment"},
		{"/sales/payments", "sales_payment.delete", "Delete Sales Payments", "DELETE", "sales_payment"},
		{"/sales/payments", "sales_payment.confirm", "Confirm Sales Payments", "APPROVE", "sales_payment"},
		{"/sales/payments", "sales_payment.export", "Export Sales Payments", "EXPORT", "sales_payment"},
		{"/sales/payments", "sales_payment.print", "Print Sales Payments", "PRINT", "sales_payment"},

		// Purchase
		{"/purchase/purchase-requisitions", "purchase_requisition.read", "View Purchase Requisitions", "VIEW", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.create", "Create Purchase Requisitions", "CREATE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.update", "Edit Purchase Requisitions", "EDIT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.delete", "Delete Purchase Requisitions", "DELETE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.submit", "Submit Purchase Requisitions", "SUBMIT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.approve", "Approve Purchase Requisitions", "APPROVE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.reject", "Reject Purchase Requisitions", "REJECT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.convert", "Convert Purchase Requisitions", "CONVERT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.export", "Export Purchase Requisitions", "EXPORT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.print", "Print Purchase Requisitions", "PRINT", "purchase_requisition"},

		{"/purchase/purchase-orders", "purchase_order.read", "View Purchase Orders", "VIEW", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.create", "Create Purchase Orders", "CREATE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.update", "Edit Purchase Orders", "EDIT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.delete", "Delete Purchase Orders", "DELETE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.confirm", "Confirm Purchase Orders", "APPROVE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.submit", "Submit Purchase Orders", "SUBMIT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.approve", "Approve Purchase Orders", "APPROVE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.reject", "Reject Purchase Orders", "REJECT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.close", "Close Purchase Orders", "CLOSE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.revise", "Revise Purchase Orders", "EDIT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.export", "Export Purchase Orders", "EXPORT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.print", "Print Purchase Orders", "PRINT", "purchase_order"},

		{"/purchase/goods-receipt", "goods_receipt.read", "View Goods Receipts", "VIEW", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.create", "Create Goods Receipts", "CREATE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.update", "Edit Goods Receipts", "EDIT", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.delete", "Delete Goods Receipts", "DELETE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.confirm", "Confirm Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.submit", "Submit Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.approve", "Approve Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.reject", "Reject Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.close", "Close Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.convert", "Convert Goods Receipts to Supplier Invoice", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.export", "Export Goods Receipts", "EXPORT", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.print", "Print Goods Receipts", "PRINT", "goods_receipt"},

		{"/purchase/supplier-invoices", "supplier_invoice.read", "View Supplier Invoices", "VIEW", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.create", "Create Supplier Invoices", "CREATE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.update", "Edit Supplier Invoices", "EDIT", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.delete", "Delete Supplier Invoices", "DELETE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.pending", "Pending Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.submit", "Submit Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.approve", "Approve Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.reject", "Reject Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.cancel", "Cancel Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.export", "Export Supplier Invoices", "EXPORT", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.print", "Print Supplier Invoices", "PRINT", "supplier_invoice"},

		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.read", "View Supplier Invoice Down Payments", "VIEW", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.create", "Create Supplier Invoice Down Payments", "CREATE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.update", "Edit Supplier Invoice Down Payments", "EDIT", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.delete", "Delete Supplier Invoice Down Payments", "DELETE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.pending", "Pending Supplier Invoice Down Payments", "APPROVE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.submit", "Submit Supplier Invoice Down Payments", "APPROVE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.approve", "Approve Supplier Invoice Down Payments", "APPROVE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.reject", "Reject Supplier Invoice Down Payments", "REJECT", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.cancel", "Cancel Supplier Invoice Down Payments", "APPROVE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.export", "Export Supplier Invoice Down Payments", "EXPORT", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.print", "Print Supplier Invoice Down Payments", "PRINT", "supplier_invoice_dp"},

		{"/purchase/returns", "purchase_return.read", "View Purchase Returns", "VIEW", "purchase_return"},
		{"/purchase/returns", "purchase_return.create", "Create Purchase Returns", "CREATE", "purchase_return"},
		{"/purchase/returns", "purchase_return.update", "Edit Purchase Returns", "EDIT", "purchase_return"},
		{"/purchase/returns", "purchase_return.delete", "Delete Purchase Returns", "DELETE", "purchase_return"},

		// Purchase Payments
		{"/purchase/payments", "purchase_payment.read", "View Purchase Payments", "VIEW", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.create", "Create Purchase Payments", "CREATE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.delete", "Delete Purchase Payments", "DELETE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.confirm", "Confirm Purchase Payments", "APPROVE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.export", "Export Purchase Payments", "EXPORT", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.print", "Print Purchase Payments", "PRINT", "purchase_payment"},
		{"/purchase/payable-recap", "payable_recap.read", "View Payable Recap", "VIEW", "payable_recap"},

		// Stock
		{"/stock/inventory", "inventory.read", "View Inventory", "VIEW", "inventory"},
		{"/stock/inventory", "inventory.create", "Create Inventory", "CREATE", "inventory"},
		{"/stock/inventory", "inventory.update", "Edit Inventory", "EDIT", "inventory"},
		{"/stock/inventory", "inventory.delete", "Delete Inventory", "DELETE", "inventory"},

		{"/stock/movements", "stock_movement.read", "View Stock Movements", "VIEW", "stock_movement"},
		{"/stock/movements", "stock_movement.create", "Create Stock Movements", "CREATE", "stock_movement"},
		{"/stock/movements", "stock_movement.update", "Edit Stock Movements", "EDIT", "stock_movement"},

		{"/stock/opname", "stock_opname.read", "View Stock Opname", "VIEW", "stock_opname"},
		{"/stock/opname", "stock_opname.create", "Create Stock Opname", "CREATE", "stock_opname"},
		{"/stock/opname", "stock_opname.update", "Edit Stock Opname", "EDIT", "stock_opname"},
		{"/stock/opname", "stock_opname.delete", "Delete Stock Opname", "DELETE", "stock_opname"},
		{"/stock/opname", "stock_opname.approve", "Approve Stock Opname", "APPROVE", "stock_opname"},
		{"/stock/opname", "stock_opname.reject", "Reject Stock Opname", "REJECT", "stock_opname"},
		{"/stock/opname", "stock_opname.post", "Post Stock Opname", "POST", "stock_opname"},

		// Finance
		{"/finance/coa", "coa.read", "View Chart of Accounts", "VIEW", "coa"},
		{"/finance/coa", "coa.create", "Create Chart of Accounts", "CREATE", "coa"},
		{"/finance/coa", "coa.update", "Edit Chart of Accounts", "EDIT", "coa"},
		{"/finance/coa", "coa.delete", "Delete Chart of Accounts", "DELETE", "coa"},

		{"/finance/journals", "journal.read", "View Journal Entries", "VIEW", "journal"},
		{"/finance/journals", "sales_journal.read", "View Sales Journal", "VIEW", "sales_journal"},
		{"/finance/journals", "sales_journal.export", "Export Sales Journal", "EXPORT", "sales_journal"},
		{"/finance/journals", "journal.create", "Create Journal Entries", "CREATE", "journal"},
		{"/finance/journals", "journal.update", "Edit Journal Entries", "EDIT", "journal"},
		{"/finance/journals", "journal.delete", "Delete Journal Entries", "DELETE", "journal"},
		{"/finance/journals", "journal.post", "Post Journal Entries", "POST", "journal"},
		{"/finance/journals", "journal.reverse", "Reverse Journal Entries", "REVERSE", "journal"},

		// Purchase Journal — read-only monitoring for purchase transactions
		{"/finance/journals/purchase", "purchase_journal.read", "View Purchase Journal", "VIEW", "purchase_journal"},
		{"/finance/journals/purchase", "purchase_journal.export", "Export Purchase Journal", "EXPORT", "purchase_journal"},

		// Adjustment Journal — operational Finance correction journal
		{"/finance/journals/adjustment", "adjustment_journal.read", "View Adjustment Journal", "VIEW", "adjustment_journal"},
		{"/finance/journals/adjustment", "adjustment_journal.create", "Create Adjustment Journal", "CREATE", "adjustment_journal"},
		{"/finance/journals/adjustment", "adjustment_journal.update", "Edit Adjustment Journal", "EDIT", "adjustment_journal"},
		{"/finance/journals/adjustment", "adjustment_journal.post", "Post Adjustment Journal", "POST", "adjustment_journal"},
		{"/finance/journals/adjustment", "adjustment_journal.reverse", "Reverse Adjustment Journal", "REVERSE", "adjustment_journal"},

		// Journal Valuation — valuation process (inventory, currency revaluation, cost adjustment)
		{"/finance/journals/valuation", "journal_valuation.read", "View Journal Valuation", "VIEW", "journal_valuation"},
		{"/finance/journals/valuation", "journal_valuation.run", "Run Journal Valuation Process", "RUN", "journal_valuation"},
		{"/finance/journals/valuation", "journal_valuation.approve", "Approve Journal Valuation", "APPROVE", "journal_valuation"},
		{"/finance/journals/valuation", "journal_valuation.export", "Export Journal Valuation", "EXPORT", "journal_valuation"},

		// Cash & Bank Journal — read-only monitoring for cash/bank transactions
		{"/finance/journals/cash-bank", "cash_bank_journal.read", "View Cash & Bank Journal", "VIEW", "cash_bank_journal"},
		{"/finance/journals/cash-bank", "cash_bank_journal.export", "Export Cash & Bank Journal", "EXPORT", "cash_bank_journal"},

		{"/finance/bank-accounts", "bank_account.read", "View Bank Accounts", "VIEW", "bank_account"},
		{"/finance/bank-accounts", "bank_account.create", "Create Bank Accounts", "CREATE", "bank_account"},
		{"/finance/bank-accounts", "bank_account.update", "Edit Bank Accounts", "EDIT", "bank_account"},
		{"/finance/bank-accounts", "bank_account.delete", "Delete Bank Accounts", "DELETE", "bank_account"},

		{"/finance/payments", "payment.read", "View Payments", "VIEW", "payment"},
		{"/finance/payments", "payment.create", "Create Payments", "CREATE", "payment"},
		{"/finance/payments", "payment.update", "Edit Payments", "EDIT", "payment"},
		{"/finance/payments", "payment.delete", "Delete Payments", "DELETE", "payment"},
		{"/finance/payments", "payment.approve", "Approve Payments", "APPROVE", "payment"},

		{"/finance/settings", "finance_settings.read", "View Finance Settings", "VIEW", "finance_settings"},
		{"/finance/settings", "finance_settings.update", "Edit Finance Settings", "EDIT", "finance_settings"},
		{"/finance/settings/accounting-mapping", "account_mappings.read", "View Account Mappings", "VIEW", "account_mappings"},
		{"/finance/settings/accounting-mapping", "account_mappings.update", "Edit Account Mappings", "EDIT", "account_mappings"},
		{"/finance/settings/accounting-mapping", "account_mappings.delete", "Delete Account Mappings", "DELETE", "account_mappings"},

		{"/finance/tax-invoices", "tax_invoice.read", "View Tax Invoices", "VIEW", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.create", "Create Tax Invoices", "CREATE", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.update", "Edit Tax Invoices", "EDIT", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.delete", "Delete Tax Invoices", "DELETE", "tax_invoice"},

		{"/finance/non-trade-payables", "non_trade_payable.read", "View Non-Trade Payables", "VIEW", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.create", "Create Non-Trade Payables", "CREATE", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.update", "Edit Non-Trade Payables", "EDIT", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.submit", "Submit Non-Trade Payables", "SUBMIT", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.approve", "Approve Non-Trade Payables", "APPROVE", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.reject", "Reject Non-Trade Payables", "REJECT", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.pay", "Pay Non-Trade Payables", "PAY", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.delete", "Delete Non-Trade Payables", "DELETE", "non_trade_payable"},

		{"/finance/budget", "budget.read", "View Budget", "VIEW", "budget"},
		{"/finance/budget", "budget.create", "Create Budget", "CREATE", "budget"},
		{"/finance/budget", "budget.update", "Edit Budget", "EDIT", "budget"},
		{"/finance/budget", "budget.delete", "Delete Budget", "DELETE", "budget"},
		{"/finance/budget", "budget.approve", "Approve Budget", "APPROVE", "budget"},

		{"/finance/cash-bank", "cash_bank.read", "View Cash Bank Journal", "VIEW", "cash_bank"},
		{"/finance/cash-bank", "cash_bank.create", "Create Cash Bank Journal", "CREATE", "cash_bank"},
		{"/finance/cash-bank", "cash_bank.update", "Edit Cash Bank Journal", "EDIT", "cash_bank"},
		{"/finance/cash-bank", "cash_bank.delete", "Delete Cash Bank Journal", "DELETE", "cash_bank"},

		{"/finance/closing", "financial_closing.read", "View Financial Closing", "VIEW", "financial_closing"},
		{"/finance/closing", "financial_closing.create", "Create Financial Closing", "CREATE", "financial_closing"},
		{"/finance/closing", "financial_closing.approve", "Approve Financial Closing", "APPROVE", "financial_closing"},
		{"/finance/closing", "financial_closing.reopen", "Reopen Financial Closing", "REOPEN", "financial_closing"},
		{"/finance/closing", "financial_closing.year_end", "Year-End Closing", "YEAR_END", "financial_closing"},
		{"/finance/closing", "financial_closing.delete", "Delete Financial Closing", "DELETE", "financial_closing"},

		{"/finance/assets", "asset.read", "View Assets", "VIEW", "asset"},
		{"/finance/assets", "asset.create", "Create Assets", "CREATE", "asset"},
		{"/finance/assets", "asset.update", "Edit Assets", "EDIT", "asset"},
		{"/finance/assets", "asset.delete", "Delete Assets", "DELETE", "asset"},
		{"/finance/assets", "asset.depreciate", "Depreciate Assets", "DEPRECIATE", "asset"},

		// Asset Maintenance
		{"/finance/asset-maintenance", "asset_maintenance.read", "View Asset Maintenance", "VIEW", "asset_maintenance"},
		{"/finance/asset-maintenance", "asset_maintenance.create", "Create Asset Maintenance", "CREATE", "asset_maintenance"},
		{"/finance/asset-maintenance", "asset_maintenance.update", "Edit Asset Maintenance", "EDIT", "asset_maintenance"},
		{"/finance/asset-maintenance", "asset_maintenance.delete", "Delete Asset Maintenance", "DELETE", "asset_maintenance"},
		{"/finance/asset-maintenance", "asset_maintenance.approve", "Approve Asset Maintenance", "APPROVE", "asset_maintenance"},

		// Travel Planner
		{"/travel/travel-planner", "travel_planner.read", "View Travel Planner", "VIEW", "travel_planner"},
		{"/travel/travel-planner", "travel_planner.create", "Create Travel Planner", "CREATE", "travel_planner"},
		{"/travel/travel-planner", "travel_planner.update", "Edit Travel Planner", "EDIT", "travel_planner"},
		{"/travel/travel-planner", "travel_planner.delete", "Delete Travel Planner", "DELETE", "travel_planner"},
		{"/travel/visit-planner", "travel.visit.read", "View Visit Planner", "VIEW", "travel_visit"},
		{"/travel/visit-planner", "travel.visit.create", "Create Visit Planner Logs", "CREATE", "travel_visit"},
		{"/travel/visit-planner", "travel.visit.admin", "Admin Visit Planner", "ADMIN", "travel_visit"},

		{"/finance/salary", "salary.read", "View Salary", "VIEW", "salary"},
		{"/finance/salary", "salary.create", "Create Salary", "CREATE", "salary"},
		{"/finance/salary", "salary.update", "Edit Salary", "EDIT", "salary"},
		{"/finance/salary", "salary.delete", "Delete Salary", "DELETE", "salary"},
		{"/finance/salary", "salary.approve", "Approve Salary", "APPROVE", "salary"},

		// Finance Reports
		{"/finance/reports/general-ledger", "general_ledger_report.read", "View General Ledger Report", "VIEW", "general_ledger_report"},
		{"/finance/reports/general-ledger", "general_ledger_report.export", "Export General Ledger Report", "EXPORT", "general_ledger_report"},
		{"/finance/reports/balance-sheet", "balance_sheet_report.read", "View Balance Sheet Report", "VIEW", "balance_sheet_report"},
		{"/finance/reports/balance-sheet", "balance_sheet_report.export", "Export Balance Sheet Report", "EXPORT", "balance_sheet_report"},
		{"/finance/reports/profit-loss", "profit_loss_report.read", "View Profit & Loss Report", "VIEW", "profit_loss_report"},
		{"/finance/reports/profit-loss", "profit_loss_report.export", "Export Profit & Loss Report", "EXPORT", "profit_loss_report"},
		{"/finance/reports/trial-balance", "trial_balance_report.read", "View Trial Balance Report", "VIEW", "trial_balance_report"},
		{"/finance/reports/trial-balance", "trial_balance_report.export", "Export Trial Balance Report", "EXPORT", "trial_balance_report"},

		{"/finance/journals/sales", "sales_journal.read", "View Sales Journal", "VIEW", "sales_journal"},
		{"/finance/aging-reports", "aging_report.read", "View Aging Reports", "VIEW", "aging_report"},
		{"/finance/reports", "finance_reports_menu.read", "View Finance Reports Menu", "VIEW", "finance_report"},
		{"/finance/reconciliation/arap", "arap_reconciliation.read", "View AR/AP Reconciliation", "VIEW", "arap_reconciliation"},

		// Asset Categories
		{"/finance/asset-categories", "asset_category.read", "View Asset Categories", "VIEW", "asset_category"},
		{"/finance/asset-categories", "asset_category.create", "Create Asset Categories", "CREATE", "asset_category"},
		{"/finance/asset-categories", "asset_category.update", "Edit Asset Categories", "EDIT", "asset_category"},
		{"/finance/asset-categories", "asset_category.delete", "Delete Asset Categories", "DELETE", "asset_category"},

		// Asset Locations
		{"/finance/asset-locations", "asset_location.read", "View Asset Locations", "VIEW", "asset_location"},
		{"/finance/asset-locations", "asset_location.create", "Create Asset Locations", "CREATE", "asset_location"},
		{"/finance/asset-locations", "asset_location.update", "Edit Asset Locations", "EDIT", "asset_location"},
		{"/finance/asset-locations", "asset_location.delete", "Delete Asset Locations", "DELETE", "asset_location"},

		// Asset Budgets
		{"/finance/asset-budgets", "asset_budget.read", "View Asset Budgets", "VIEW", "asset_budget"},
		{"/finance/asset-budgets", "asset_budget.create", "Create Asset Budgets", "CREATE", "asset_budget"},
		{"/finance/asset-budgets", "asset_budget.update", "Edit Asset Budgets", "EDIT", "asset_budget"},
		{"/finance/asset-budgets", "asset_budget.delete", "Delete Asset Budgets", "DELETE", "asset_budget"},

		// HRD
		{"/hrd/attendance", "attendance.read", "View Attendance", "VIEW", "attendance"},
		{"/hrd/attendance", "attendance.create", "Create Attendance", "CREATE", "attendance"},
		{"/hrd/attendance", "attendance.update", "Edit Attendance", "EDIT", "attendance"},
		{"/hrd/attendance", "attendance.delete", "Delete Attendance", "DELETE", "attendance"},

		{"/hrd/leave-requests", "leave_request.read", "View Leave Requests", "VIEW", "leave_request"},
		{"/hrd/leave-requests", "leave_request.create", "Create Leave Requests", "CREATE", "leave_request"},
		{"/hrd/leave-requests", "leave_request.update", "Edit Leave Requests", "EDIT", "leave_request"},
		{"/hrd/leave-requests", "leave_request.delete", "Delete Leave Requests", "DELETE", "leave_request"},
		{"/hrd/leave-requests", "leave_request.approve", "Approve Leave Requests", "APPROVE", "leave_request"},
		{"/hrd/leave-requests", "leave_request.reject", "Reject Leave Requests", "REJECT", "leave_request"},

		{"/hrd/evaluation", "evaluation.read", "View Evaluations", "VIEW", "evaluation"},
		{"/hrd/evaluation", "evaluation.create", "Create Evaluations", "CREATE", "evaluation"},
		{"/hrd/evaluation", "evaluation.update", "Edit Evaluations", "EDIT", "evaluation"},
		{"/hrd/evaluation", "evaluation.delete", "Delete Evaluations", "DELETE", "evaluation"},

		{"/hrd/recruitment", "recruitment.read", "View Recruitment", "VIEW", "recruitment"},
		{"/hrd/recruitment", "recruitment.create", "Create Recruitment", "CREATE", "recruitment"},
		{"/hrd/recruitment", "recruitment.update", "Edit Recruitment", "EDIT", "recruitment"},
		{"/hrd/recruitment", "recruitment.delete", "Delete Recruitment", "DELETE", "recruitment"},
		{"/hrd/recruitment", "recruitment.approve", "Approve Recruitment", "APPROVE", "recruitment"},

		{"/hrd/work-schedule", "work_schedule.read", "View Work Schedule", "VIEW", "work_schedule"},
		{"/hrd/work-schedule", "work_schedule.create", "Create Work Schedule", "CREATE", "work_schedule"},
		{"/hrd/work-schedule", "work_schedule.update", "Edit Work Schedule", "EDIT", "work_schedule"},
		{"/hrd/work-schedule", "work_schedule.delete", "Delete Work Schedule", "DELETE", "work_schedule"},

		{"/hrd/holidays", "holiday.read", "View Holidays", "VIEW", "holiday"},
		{"/hrd/holidays", "holiday.create", "Create Holidays", "CREATE", "holiday"},
		{"/hrd/holidays", "holiday.update", "Edit Holidays", "EDIT", "holiday"},
		{"/hrd/holidays", "holiday.delete", "Delete Holidays", "DELETE", "holiday"},

		{"/hrd/overtime", "overtime.read", "View Overtime Requests", "VIEW", "overtime"},
		{"/hrd/overtime", "overtime.create", "Create Overtime Requests", "CREATE", "overtime"},
		{"/hrd/overtime", "overtime.update", "Edit Overtime Requests", "EDIT", "overtime"},
		{"/hrd/overtime", "overtime.delete", "Delete Overtime Requests", "DELETE", "overtime"},
		{"/hrd/overtime", "overtime.approve", "Approve Overtime Requests", "APPROVE", "overtime"},
		{"/hrd/overtime", "overtime.reject", "Reject Overtime Requests", "REJECT", "overtime"},
		{"/hrd/education", "employee_education.read", "View Education History", "VIEW", "employee_education"},
		{"/hrd/contracts", "employee_contract.read", "View Contracts", "VIEW", "employee_contract"},
		{"/hrd/certifications", "employee_certification.read", "View Certifications", "VIEW", "employee_certification"},
		{"/hrd/documents", "employee_document.read", "View Employee Documents", "VIEW", "employee_document"},

		// Reports
		{"/reports", "report.view", "View Reports", "VIEW", "report"},
		{"/reports", "report.generate", "Generate Reports", "CREATE", "report"},
		{"/reports", "report.export", "Export Reports", "EXPORT", "report"},

		// Reports - Sales Overview
		{"/reports/sales-overview", "report_sales_overview.read", "View Sales Overview Report", "VIEW", "report_sales_overview"},
		{"/reports/sales-overview", "report_sales_overview.export", "Export Sales Overview Report", "EXPORT", "report_sales_overview"},

		// Reports - Top Product
		{"/reports/product-analysis", "report_product_analysis.read", "View Top Product Report", "VIEW", "report_product_analysis"},
		{"/reports/product-analysis", "report_product_analysis.export", "Export Top Product Report", "EXPORT", "report_product_analysis"},

		// Reports - Geo Performance
		{"/reports/geo-performance", "report_geo_performance.read", "View Geo Performance Report", "VIEW", "report_geo_performance"},
		{"/reports/geo-performance", "report_geo_performance.export", "Export Geo Performance Report", "EXPORT", "report_geo_performance"},

		// Reports - Customer Research
		{"/reports/customer-research", "report_customer_research.read", "View Customer Research Report", "VIEW", "report_customer_research"},
		{"/reports/customer-research", "report_customer_research.export", "Export Customer Research Report", "EXPORT", "report_customer_research"},

		// Reports - Supplier Research
		{"/reports/supplier-research", "report_supplier_research.read", "View Supplier Research Report", "VIEW", "report_supplier_research"},
		{"/reports/supplier-research", "report_supplier_research.export", "Export Supplier Research Report", "EXPORT", "report_supplier_research"},

		// AI Assistant
		{"/ai-chatbot", "ai_chatbot.view", "View AI Chatbot", "VIEW", "ai_chatbot"},
		{"/ai-settings", "ai_settings.view", "View AI Settings", "VIEW", "ai_settings"},
		{"/ai-settings", "ai_settings.edit", "Edit AI Settings", "EDIT", "ai_settings"},
		{"/crm/settings", "crm_settings.read", "View CRM Settings", "VIEW", "crm_settings"},
		{"/master-data/product", "product_menu.read", "View Product Menu", "VIEW", "product"},
		{"/master-data/organization", "organization_menu.read", "View Organization Menu", "VIEW", "organization"},
		{"/master-data/supplier", "supplier_menu.read", "View Supplier Menu", "VIEW", "supplier"},
		{"/master-data/payment-courier", "payment_courier_menu.read", "View Payment & Courier Menu", "VIEW", "payment_courier"},
		{"/master-data/area-supervisors", "area_supervisor_menu.read", "View Area Supervisors Menu", "VIEW", "area_supervisor"},

		// CRM Settings - Pipeline Stages
		{"/crm/settings/pipeline-stages", "crm_pipeline_stage.read", "View Pipeline Stages", "VIEW", "crm_pipeline_stage"},
		{"/crm/settings/pipeline-stages", "crm_pipeline_stage.create", "Create Pipeline Stages", "CREATE", "crm_pipeline_stage"},
		{"/crm/settings/pipeline-stages", "crm_pipeline_stage.update", "Edit Pipeline Stages", "EDIT", "crm_pipeline_stage"},
		{"/crm/settings/pipeline-stages", "crm_pipeline_stage.delete", "Delete Pipeline Stages", "DELETE", "crm_pipeline_stage"},

		// CRM Settings - Lead Sources
		{"/crm/settings/lead-sources", "crm_lead_source.read", "View Lead Sources", "VIEW", "crm_lead_source"},
		{"/crm/settings/lead-sources", "crm_lead_source.create", "Create Lead Sources", "CREATE", "crm_lead_source"},
		{"/crm/settings/lead-sources", "crm_lead_source.update", "Edit Lead Sources", "EDIT", "crm_lead_source"},
		{"/crm/settings/lead-sources", "crm_lead_source.delete", "Delete Lead Sources", "DELETE", "crm_lead_source"},

		// CRM Settings - Lead Statuses
		{"/crm/settings/lead-statuses", "crm_lead_status.read", "View Lead Statuses", "VIEW", "crm_lead_status"},
		{"/crm/settings/lead-statuses", "crm_lead_status.create", "Create Lead Statuses", "CREATE", "crm_lead_status"},
		{"/crm/settings/lead-statuses", "crm_lead_status.update", "Edit Lead Statuses", "EDIT", "crm_lead_status"},
		{"/crm/settings/lead-statuses", "crm_lead_status.delete", "Delete Lead Statuses", "DELETE", "crm_lead_status"},

		// CRM Settings - Contact Roles
		{"/crm/settings/contact-roles", "crm_contact_role.read", "View Contact Roles", "VIEW", "crm_contact_role"},
		{"/crm/settings/contact-roles", "crm_contact_role.create", "Create Contact Roles", "CREATE", "crm_contact_role"},
		{"/crm/settings/contact-roles", "crm_contact_role.update", "Edit Contact Roles", "EDIT", "crm_contact_role"},
		{"/crm/settings/contact-roles", "crm_contact_role.delete", "Delete Contact Roles", "DELETE", "crm_contact_role"},

		// CRM Settings - Activity Types
		{"/crm/settings/activity-types", "crm_activity_type.read", "View Activity Types", "VIEW", "crm_activity_type"},
		{"/crm/settings/activity-types", "crm_activity_type.create", "Create Activity Types", "CREATE", "crm_activity_type"},
		{"/crm/settings/activity-types", "crm_activity_type.update", "Edit Activity Types", "EDIT", "crm_activity_type"},
		{"/crm/settings/activity-types", "crm_activity_type.delete", "Delete Activity Types", "DELETE", "crm_activity_type"},

		// CRM Leads (Sprint 19)
		{"/crm/leads", "crm_lead.read", "View Leads", "VIEW", "crm_lead"},
		{"/crm/leads", "crm_lead.create", "Create Leads", "CREATE", "crm_lead"},
		{"/crm/leads", "crm_lead.update", "Edit Leads", "EDIT", "crm_lead"},
		{"/crm/leads", "crm_lead.delete", "Delete Leads", "DELETE", "crm_lead"},
		{"/crm/leads", "crm_lead.convert", "Convert Leads", "CONVERT", "crm_lead"},

		// CRM Deals (Sprint 20)
		{"/crm/pipeline", "crm_deal.read", "View Deals", "VIEW", "crm_deal"},
		{"/crm/pipeline", "crm_deal.create", "Create Deals", "CREATE", "crm_deal"},
		{"/crm/pipeline", "crm_deal.update", "Edit Deals", "EDIT", "crm_deal"},
		{"/crm/pipeline", "crm_deal.delete", "Delete Deals", "DELETE", "crm_deal"},
		{"/crm/pipeline", "crm_deal.move_stage", "Move Deal Stage", "MOVE_STAGE", "crm_deal"},

		// CRM Visit Reports (Sprint 22)
		{"/crm/visits", "crm_visit.read", "View Visit Reports", "VIEW", "crm_visit"},
		{"/crm/visits", "crm_visit.create", "Create Visit Reports", "CREATE", "crm_visit"},
		{"/crm/visits", "crm_visit.update", "Edit Visit Reports", "EDIT", "crm_visit"},
		{"/crm/visits", "crm_visit.delete", "Delete Visit Reports", "DELETE", "crm_visit"},
		{"/crm/visits", "crm_visit.approve", "Approve/Reject Visit Reports", "APPROVE", "crm_visit"},

		// CRM Activities (Sprint 23) — crm_activity.create kept for embedded forms in lead/deal detail
		{"/crm/activities", "crm_activity.read", "View Activities", "VIEW", "crm_activity"},
		{"/crm/activities", "crm_activity.create", "Create Activities", "CREATE", "crm_activity"},

		// CRM Tasks (Sprint 23)
		{"/crm/tasks", "crm_task.read", "View Tasks", "VIEW", "crm_task"},
		{"/crm/tasks", "crm_task.create", "Create Tasks", "CREATE", "crm_task"},
		{"/crm/tasks", "crm_task.update", "Edit Tasks", "EDIT", "crm_task"},
		{"/crm/tasks", "crm_task.delete", "Delete Tasks", "DELETE", "crm_task"},
		{"/crm/tasks", "crm_task.assign", "Assign Tasks", "ASSIGN", "crm_task"},

		// CRM Schedules (Sprint 23)
		{"/crm/schedules", "crm_schedule.read", "View Schedules", "VIEW", "crm_schedule"},
		{"/crm/schedules", "crm_schedule.create", "Create Schedules", "CREATE", "crm_schedule"},
		{"/crm/schedules", "crm_schedule.update", "Edit Schedules", "EDIT", "crm_schedule"},
		{"/crm/schedules", "crm_schedule.delete", "Delete Schedules", "DELETE", "crm_schedule"},

		// CRM Area Mapping (Sprint 24)
		{"/crm/area-mapping", "crm_area_mapping.read", "View Area Mapping", "VIEW", "crm_area_mapping"},
		{"/crm/area-mapping", "crm_area_mapping.create", "Capture Area Location", "CREATE", "crm_area_mapping"},
	}

	// Build menu URL to ID map
	menuMap := make(map[string]string)
	var allMenus []permission.Menu
	if err := database.DB.Find(&allMenus).Error; err != nil {
		return err
	}
	for _, m := range allMenus {
		menuMap[m.URL] = m.ID
	}

	// Create permissions in a transaction to speed up seeding
	var permissionIDs []string
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		for _, p := range permissions {
			menuID, exists := menuMap[p.menuURL]
			if !exists {
				log.Printf("Warning: Menu not found for URL %s, skipping permission %s", p.menuURL, p.code)
				continue
			}

			// Check if permission already exists
			var existingPerm permission.Permission
			if err := tx.Where("code = ?", p.code).First(&existingPerm).Error; err == nil {
				// Permission exists: ensure it matches the latest definition.
				updates := map[string]interface{}{
					"name":     p.name,
					"action":   p.action,
					"resource": p.resource,
					"menu_id":  &menuID,
				}
				if err := tx.Model(&existingPerm).Updates(updates).Error; err != nil {
					log.Printf("Warning: Failed to update permission %s: %v", p.code, err)
				}
				permissionIDs = append(permissionIDs, existingPerm.ID)
				continue
			}

			perm := permission.Permission{
				Name:     p.name,
				Code:     p.code,
				MenuID:   &menuID,
				Action:   p.action,
				Resource: p.resource,
			}
			if err := tx.Create(&perm).Error; err != nil {
				log.Printf("Warning: Failed to create permission %s: %v", p.code, err)
				continue
			}
			permissionIDs = append(permissionIDs, perm.ID)
		}
		return nil
	}); err != nil {
		return err
	}

	log.Printf("Ensured existence of %d permissions", len(permissionIDs))

	// Remove legacy permissions whose pages were removed from dashboard.
	removeDeprecatedPermissions([]string{
		"sales_estimation.read",
		"sales_estimation.create",
		"sales_estimation.update",
		"sales_estimation.delete",
		"journal_line.read",
		"trial_balance_report.read",
		"trial_balance_report.export",
		"ai_settings.view",
		"ai_settings.edit",
	})

	// Assign all permissions to admin role with ALL scope
	var adminRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		log.Printf("Warning: Admin role not found: %v", err)
	} else {
		database.DB.Transaction(func(tx *gorm.DB) error {
			for _, permID := range permissionIDs {
				if err := tx.Exec(
					"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'ALL') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL'",
					adminRole.ID, permID,
				).Error; err != nil {
					log.Printf("Warning: Failed to assign permission to admin: %v", err)
				}
			}
			return nil
		})
		log.Printf("Assigned %d permissions to admin role (scope=ALL)", len(permissionIDs))
	}

	// Sync all permissions to admin role
	if err := SyncAdminPermissions(); err != nil {
		log.Printf("Warning: Failed to sync admin permissions: %v", err)
	}

	// Assign VIEW permissions to viewer role with OWN scope
	var viewerRole role.Role
	if err := database.DB.Where("code = ?", "viewer").First(&viewerRole).Error; err == nil {
		var viewPermissions []permission.Permission
		if err := database.DB.Where("action = ?", "VIEW").Find(&viewPermissions).Error; err == nil {
			viewerCount := 0
			database.DB.Transaction(func(tx *gorm.DB) error {
				for _, perm := range viewPermissions {
					if err := tx.Exec(
						"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'OWN') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'OWN'",
						viewerRole.ID, perm.ID,
					).Error; err != nil {
						log.Printf("Warning: Failed to assign permission %s to viewer: %v", perm.Code, err)
					} else {
						viewerCount++
					}
				}
				return nil
			})
			log.Printf("Assigned %d VIEW permissions to viewer role (scope=OWN)", viewerCount)
		}
	}

	// Assign scoped permissions to manager role (DIVISION for operational, ALL for master data)
	assignScopedPermissionsToRole("manager", map[string]string{
		"sales":             "DIVISION",
		"purchase":          "DIVISION",
		"hrd":               "DIVISION",
		"finance":           "DIVISION",
		"account_mappings":  "DIVISION",
		"non_trade_payable": "DIVISION",
		"travel_visit":      "DIVISION",
		"stock":             "ALL",
	}, "ALL")

	// Assign scoped permissions to staff role (OWN for operational, ALL for master data read)
	assignScopedPermissionsToRole("staff", map[string]string{
		"sales":             "OWN",
		"purchase":          "OWN",
		"hrd":               "OWN",
		"finance":           "OWN",
		"account_mappings":  "OWN",
		"non_trade_payable": "OWN",
		"travel_visit":      "OWN",
		"stock":             "OWN",
	}, "ALL")

	// Assign scoped permissions to area_supervisor role (AREA for sales, DIVISION for others)
	assignScopedPermissionsToRole("area_supervisor", map[string]string{
		"sales":        "AREA",
		"purchase":     "DIVISION",
		"hrd":          "OWN",
		"finance":      "OWN",
		"account_mappings": "OWN",
		"travel_visit": "DIVISION",
		"stock":        "AREA",
	}, "ALL")

	// Assign scoped permissions to sales_director role (ALL for sales, DIVISION for others)
	assignScopedPermissionsToRole("sales_director", map[string]string{
		"sales":        "ALL",
		"purchase":     "DIVISION",
		"hrd":          "OWN",
		"finance":      "OWN",
		"account_mappings": "OWN",
		"travel_visit": "ALL",
		"stock":        "ALL",
	}, "ALL")

	// Assign scoped permissions to finance_manager role (DIVISION for finance, OWN for others)
	assignScopedPermissionsToRole("finance_manager", map[string]string{
		"finance":           "DIVISION",
		"account_mappings":  "DIVISION",
		"non_trade_payable": "DIVISION",
		"sales":             "OWN",
		"purchase":          "OWN",
		"hrd":               "OWN",
		"travel_visit":      "OWN",
		"stock":             "OWN",
		// Finance journal domain pages — explicit DIVISION scope
		// (adjustment_journal, journal_valuation, cash_bank_journal do not share a
		//  standard module prefix, so they must be mapped explicitly)
		"adjustment_journal": "DIVISION",
		"journal_valuation":  "DIVISION",
		"cash_bank_journal":  "DIVISION",
	}, "ALL")

	assignScopedPermissionsToRole("accountant", map[string]string{
		"finance":           "DIVISION",
		"account_mappings":  "DIVISION",
		"non_trade_payable": "DIVISION",
		"sales":             "OWN",
		"purchase":          "OWN",
		"hrd":               "OWN",
		"travel_visit":      "OWN",
		"stock":             "OWN",
		// Finance journal domain pages — Accountant operates at DIVISION level
		"adjustment_journal": "DIVISION",
		"journal_valuation":  "DIVISION",
		"cash_bank_journal":  "DIVISION",
	}, "OWN")

	assignViewPermissionsToRole("auditor", "ALL")

	// Invalidate Redis permission cache to ensure fresh permissions are loaded
	invalidatePermissionCache()

	log.Println("ERP permissions seeded successfully")
	return nil
}

// invalidatePermissionCache clears all cached permission entries from Redis
// to prevent stale permission data after seeding
func invalidatePermissionCache() {
	redisClient := redis.GetClient()
	if redisClient == nil {
		return
	}

	ctx := context.Background()
	patterns := []string{"permissions:*", "permissions_scope:*"}

	for _, pattern := range patterns {
		keys, err := redisClient.Keys(ctx, pattern).Result()
		if err != nil {
			log.Printf("Warning: Failed to scan Redis keys for pattern '%s': %v", pattern, err)
			continue
		}
		if len(keys) > 0 {
			if err := redisClient.Del(ctx, keys...).Err(); err != nil {
				log.Printf("Warning: Failed to delete Redis keys for pattern '%s': %v", pattern, err)
			} else {
				log.Printf("Invalidated %d cached permission entries (pattern: %s)", len(keys), pattern)
			}
		}
	}
}

// assignScopedPermissionsToRole assigns all permissions to a role with module-aware scopes.
// moduleScopes maps a module prefix (from permission resource) to a scope value.
// defaultScope is used for permissions that don't match any module prefix (e.g., master data).
func assignScopedPermissionsToRole(roleCode string, moduleScopes map[string]string, defaultScope string) {
	var r role.Role
	if err := database.DB.Where("code = ?", roleCode).First(&r).Error; err != nil {
		log.Printf("Warning: Role %s not found, skipping scoped assignment: %v", roleCode, err)
		return
	}

	var allPerms []permission.Permission
	if err := database.DB.Find(&allPerms).Error; err != nil {
		log.Printf("Warning: Failed to load permissions for %s: %v", roleCode, err)
		return
	}

	count := 0
	database.DB.Transaction(func(tx *gorm.DB) error {
		for _, perm := range allPerms {
			scope := defaultScope
			for module, moduleScope := range moduleScopes {
				if matchesModule(perm.Resource, module) {
					scope = moduleScope
					break
				}
			}

			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, ?) ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope",
				r.ID, perm.ID, scope,
			).Error; err != nil {
				log.Printf("Warning: Failed to assign %s to %s: %v", perm.Code, roleCode, err)
			} else {
				count++
			}
		}
		return nil
	})
	log.Printf("Assigned %d permissions to %s role with module-aware scopes", count, roleCode)
}

func assignViewPermissionsToRole(roleCode, scope string) {
	var r role.Role
	if err := database.DB.Where("code = ?", roleCode).First(&r).Error; err != nil {
		log.Printf("Warning: Role %s not found, skipping view-only assignment: %v", roleCode, err)
		return
	}

	var viewPerms []permission.Permission
	if err := database.DB.Where("action = ?", "VIEW").Find(&viewPerms).Error; err != nil {
		log.Printf("Warning: Failed loading VIEW permissions for %s: %v", roleCode, err)
		return
	}

	count := 0
	database.DB.Transaction(func(tx *gorm.DB) error {
		for _, perm := range viewPerms {
			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, ?) ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope",
				r.ID, perm.ID, scope,
			).Error; err != nil {
				log.Printf("Warning: Failed to assign %s to %s: %v", perm.Code, roleCode, err)
				continue
			}
			count++
		}
		return nil
	})

	log.Printf("Assigned %d VIEW permissions to %s role (scope=%s)", count, roleCode, scope)
}

func getPermissionIDsByCodes(tx *gorm.DB, codes []string) ([]string, error) {
	var deprecatedPerms []permission.Permission
	if err := tx.Unscoped().Where("code IN ?", codes).Find(&deprecatedPerms).Error; err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(deprecatedPerms))
	for _, perm := range deprecatedPerms {
		ids = append(ids, perm.ID)
	}

	return ids, nil
}

func removePermissionsByIDs(tx *gorm.DB, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	if err := tx.Exec("DELETE FROM role_permissions WHERE permission_id IN ?", ids).Error; err != nil {
		return err
	}

	if err := tx.Unscoped().Where("id IN ?", ids).Delete(&permission.Permission{}).Error; err != nil {
		return err
	}

	log.Printf("Removed %d deprecated permissions", len(ids))
	return nil
}

func removeDeprecatedPermissions(codes []string) {
	if len(codes) == 0 {
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		ids, err := getPermissionIDsByCodes(tx, codes)
		if err != nil {
			return err
		}
		return removePermissionsByIDs(tx, ids)
	}); err != nil {
		log.Printf("Warning: Failed to remove deprecated permissions: %v", err)
	}
}

// matchesModule checks if a permission resource belongs to a given module.
// Uses prefix matching on common resource naming patterns.
func matchesModule(resource, module string) bool {
	// Common resource patterns: sales_order, sales_quotation, purchase_order, hrd_leave, finance_journal, etc.
	if len(resource) >= len(module) && resource[:len(module)] == module {
		return true
	}
	return false
}

// SyncAdminPermissions syncs all existing permissions to admin role with ALL scope
func SyncAdminPermissions() error {
	var adminRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		log.Printf("Skipping permission_seeder.go due to missing dependency: %v", err)
		return nil
	}

	var allPermissions []permission.Permission
	if err := database.DB.Find(&allPermissions).Error; err != nil {
		return err
	}

	assignedCount := 0
	database.DB.Transaction(func(tx *gorm.DB) error {
		for _, perm := range allPermissions {
			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'ALL') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL'",
				adminRole.ID, perm.ID,
			).Error; err != nil {
				log.Printf("Warning: Failed to assign permission %s to admin: %v", perm.Code, err)
			} else {
				assignedCount++
			}
		}
		return nil
	})

	log.Printf("Synced %d permissions to admin role (scope=ALL, total: %d)", assignedCount, len(allPermissions))

	// Invalidate cache so admin gets fresh permissions on next request
	invalidatePermissionCache()

	return nil
}
