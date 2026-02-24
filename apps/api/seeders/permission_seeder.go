package seeders

import (
	"context"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	permission "github.com/gilabs/gims/api/internal/permission/data/models"
	role "github.com/gilabs/gims/api/internal/role/data/models"
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

		// Master Data - Geographic
		// Master Data - Geographic
		{"/master-data/geographic/countries", "country.read", "View Countries", "VIEW", "country"},
		{"/master-data/geographic/countries", "country.create", "Create Countries", "CREATE", "country"},
		{"/master-data/geographic/countries", "country.update", "Edit Countries", "EDIT", "country"},
		{"/master-data/geographic/countries", "country.delete", "Delete Countries", "DELETE", "country"},

		{"/master-data/geographic/provinces", "province.read", "View Provinces", "VIEW", "province"},
		{"/master-data/geographic/provinces", "province.create", "Create Provinces", "CREATE", "province"},
		{"/master-data/geographic/provinces", "province.update", "Edit Provinces", "EDIT", "province"},
		{"/master-data/geographic/provinces", "province.delete", "Delete Provinces", "DELETE", "province"},

		{"/master-data/geographic/cities", "city.read", "View Cities", "VIEW", "city"},
		{"/master-data/geographic/cities", "city.create", "Create Cities", "CREATE", "city"},
		{"/master-data/geographic/cities", "city.update", "Edit Cities", "EDIT", "city"},
		{"/master-data/geographic/cities", "city.delete", "Delete Cities", "DELETE", "city"},

		{"/master-data/geographic/districts", "district.read", "View Districts", "VIEW", "district"},
		{"/master-data/geographic/districts", "district.create", "Create Districts", "CREATE", "district"},
		{"/master-data/geographic/districts", "district.update", "Edit Districts", "EDIT", "district"},
		{"/master-data/geographic/districts", "district.delete", "Delete Districts", "DELETE", "district"},

		{"/master-data/geographic/villages", "village.read", "View Villages", "VIEW", "village"},
		{"/master-data/geographic/villages", "village.create", "Create Villages", "CREATE", "village"},
		{"/master-data/geographic/villages", "village.update", "Edit Villages", "EDIT", "village"},
		{"/master-data/geographic/villages", "village.delete", "Delete Villages", "DELETE", "village"},

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

		{"/sales/visits", "sales_visit.read", "View Sales Visits", "VIEW", "sales_visit"},
		{"/sales/visits", "sales_visit.create", "Create Sales Visits", "CREATE", "sales_visit"},
		{"/sales/visits", "sales_visit.update", "Edit Sales Visits", "EDIT", "sales_visit"},
		{"/sales/visits", "sales_visit.delete", "Delete Sales Visits", "DELETE", "sales_visit"},
		{"/sales/visits", "sales_visit.approve", "Approve Sales Visits", "APPROVE", "sales_visit"},

		{"/sales/estimations", "sales_estimation.read", "View Sales Estimations", "VIEW", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.create", "Create Sales Estimations", "CREATE", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.update", "Edit Sales Estimations", "EDIT", "sales_estimation"},
		{"/sales/estimations", "sales_estimation.delete", "Delete Sales Estimations", "DELETE", "sales_estimation"},

		{"/sales/targets", "sales_target.read", "View Sales Targets", "VIEW", "sales_target"},
		{"/sales/targets", "sales_target.create", "Create Sales Targets", "CREATE", "sales_target"},
		{"/sales/targets", "sales_target.update", "Edit Sales Targets", "EDIT", "sales_target"},
		{"/sales/targets", "sales_target.delete", "Delete Sales Targets", "DELETE", "sales_target"},

		// Backwards-compatible yearly target permissions (used by yearly-targets routes/pages)
		{"/sales/targets", "yearly_target.read", "View Yearly Targets", "VIEW", "yearly_target"},
		{"/sales/targets", "yearly_target.create", "Create Yearly Targets", "CREATE", "yearly_target"},
		{"/sales/targets", "yearly_target.update", "Edit Yearly Targets", "EDIT", "yearly_target"},
		{"/sales/targets", "yearly_target.delete", "Delete Yearly Targets", "DELETE", "yearly_target"},
		{"/sales/targets", "yearly_target.approve", "Approve Yearly Targets", "APPROVE", "yearly_target"},
		{"/sales/targets", "yearly_target.reject", "Reject Yearly Targets", "REJECT", "yearly_target"},

		// Purchase
		{"/purchase/purchase-requisitions", "purchase_requisition.read", "View Purchase Requisitions", "VIEW", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.create", "Create Purchase Requisitions", "CREATE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.update", "Edit Purchase Requisitions", "EDIT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.delete", "Delete Purchase Requisitions", "DELETE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.approve", "Approve Purchase Requisitions", "APPROVE", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.reject", "Reject Purchase Requisitions", "REJECT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.convert", "Convert Purchase Requisitions", "CONVERT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.export", "Export Purchase Requisitions", "EXPORT", "purchase_requisition"},
		{"/purchase/purchase-requisitions", "purchase_requisition.audit_trail", "View Purchase Requisition Audit Trail", "VIEW", "purchase_requisition_audit"},

		{"/purchase/purchase-orders", "purchase_order.read", "View Purchase Orders", "VIEW", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.create", "Create Purchase Orders", "CREATE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.update", "Edit Purchase Orders", "EDIT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.delete", "Delete Purchase Orders", "DELETE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.confirm", "Confirm Purchase Orders", "APPROVE", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.revise", "Revise Purchase Orders", "EDIT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.export", "Export Purchase Orders", "EXPORT", "purchase_order"},
		{"/purchase/purchase-orders", "purchase_order.audit_trail", "View Purchase Order Audit Trail", "VIEW", "purchase_order_audit"},

		{"/purchase/goods-receipt", "goods_receipt.read", "View Goods Receipts", "VIEW", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.create", "Create Goods Receipts", "CREATE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.update", "Edit Goods Receipts", "EDIT", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.delete", "Delete Goods Receipts", "DELETE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.confirm", "Confirm Goods Receipts", "APPROVE", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.export", "Export Goods Receipts", "EXPORT", "goods_receipt"},
		{"/purchase/goods-receipt", "goods_receipt.audit_trail", "View Goods Receipt Audit Trail", "VIEW", "goods_receipt_audit"},

		{"/purchase/supplier-invoices", "supplier_invoice.read", "View Supplier Invoices", "VIEW", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.create", "Create Supplier Invoices", "CREATE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.update", "Edit Supplier Invoices", "EDIT", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.delete", "Delete Supplier Invoices", "DELETE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.pending", "Pending Supplier Invoices", "APPROVE", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.export", "Export Supplier Invoices", "EXPORT", "supplier_invoice"},
		{"/purchase/supplier-invoices", "supplier_invoice.audit_trail", "View Supplier Invoice Audit Trail", "VIEW", "supplier_invoice_audit"},

		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.read", "View Supplier Invoice Down Payments", "VIEW", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.create", "Create Supplier Invoice Down Payments", "CREATE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.update", "Edit Supplier Invoice Down Payments", "EDIT", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.delete", "Delete Supplier Invoice Down Payments", "DELETE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.pending", "Pending Supplier Invoice Down Payments", "APPROVE", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.audit_trail", "View Supplier Invoice Down Payment Audit Trail", "VIEW", "supplier_invoice_dp"},
		{"/purchase/supplier-invoice-down-payments", "supplier_invoice_dp.export", "Export Supplier Invoice Down Payments", "EXPORT", "supplier_invoice_dp"},
		// Purchase Payments
		{"/purchase/payments", "purchase_payment.read", "View Purchase Payments", "VIEW", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.create", "Create Purchase Payments", "CREATE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.delete", "Delete Purchase Payments", "DELETE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.confirm", "Confirm Purchase Payments", "APPROVE", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.export", "Export Purchase Payments", "EXPORT", "purchase_payment"},
		{"/purchase/payments", "purchase_payment.audit_trail", "View Purchase Payment Audit Trail", "VIEW", "purchase_payment_audit"},

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
		{"/finance/journals", "journal.create", "Create Journal Entries", "CREATE", "journal"},
		{"/finance/journals", "journal.update", "Edit Journal Entries", "EDIT", "journal"},
		{"/finance/journals", "journal.delete", "Delete Journal Entries", "DELETE", "journal"},
		{"/finance/journals", "journal.post", "Post Journal Entries", "POST", "journal"},

		{"/finance/bank-accounts", "bank_account.read", "View Bank Accounts", "VIEW", "bank_account"},
		{"/finance/bank-accounts", "bank_account.create", "Create Bank Accounts", "CREATE", "bank_account"},
		{"/finance/bank-accounts", "bank_account.update", "Edit Bank Accounts", "EDIT", "bank_account"},
		{"/finance/bank-accounts", "bank_account.delete", "Delete Bank Accounts", "DELETE", "bank_account"},

		{"/finance/payments", "payment.read", "View Payments", "VIEW", "payment"},
		{"/finance/payments", "payment.create", "Create Payments", "CREATE", "payment"},
		{"/finance/payments", "payment.update", "Edit Payments", "EDIT", "payment"},
		{"/finance/payments", "payment.delete", "Delete Payments", "DELETE", "payment"},
		{"/finance/payments", "payment.approve", "Approve Payments", "APPROVE", "payment"},

		{"/finance/tax-invoices", "tax_invoice.read", "View Tax Invoices", "VIEW", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.create", "Create Tax Invoices", "CREATE", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.update", "Edit Tax Invoices", "EDIT", "tax_invoice"},
		{"/finance/tax-invoices", "tax_invoice.delete", "Delete Tax Invoices", "DELETE", "tax_invoice"},

		{"/finance/non-trade-payables", "non_trade_payable.read", "View Non-Trade Payables", "VIEW", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.create", "Create Non-Trade Payables", "CREATE", "non_trade_payable"},
		{"/finance/non-trade-payables", "non_trade_payable.update", "Edit Non-Trade Payables", "EDIT", "non_trade_payable"},
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

		{"/finance/assets", "asset.read", "View Assets", "VIEW", "asset"},
		{"/finance/assets", "asset.create", "Create Assets", "CREATE", "asset"},
		{"/finance/assets", "asset.update", "Edit Assets", "EDIT", "asset"},
		{"/finance/assets", "asset.delete", "Delete Assets", "DELETE", "asset"},
		{"/finance/assets", "asset.depreciate", "Depreciate Assets", "DEPRECIATE", "asset"},

		{"/finance/up-country-cost", "up_country_cost.read", "View Up Country Cost", "VIEW", "up_country_cost"},
		{"/finance/up-country-cost", "up_country_cost.create", "Create Up Country Cost", "CREATE", "up_country_cost"},
		{"/finance/up-country-cost", "up_country_cost.update", "Edit Up Country Cost", "EDIT", "up_country_cost"},
		{"/finance/up-country-cost", "up_country_cost.delete", "Delete Up Country Cost", "DELETE", "up_country_cost"},
		{"/finance/up-country-cost", "up_country_cost.approve", "Approve Up Country Cost", "APPROVE", "up_country_cost"},

		{"/finance/salary", "salary.read", "View Salary", "VIEW", "salary"},
		{"/finance/salary", "salary.create", "Create Salary", "CREATE", "salary"},
		{"/finance/salary", "salary.update", "Edit Salary", "EDIT", "salary"},
		{"/finance/salary", "salary.delete", "Delete Salary", "DELETE", "salary"},

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

		{"/hrd/contracts", "employee_contract.read", "View Employee Contracts", "VIEW", "employee_contract"},
		{"/hrd/contracts", "employee_contract.create", "Create Employee Contracts", "CREATE", "employee_contract"},
		{"/hrd/contracts", "employee_contract.update", "Edit Employee Contracts", "EDIT", "employee_contract"},
		{"/hrd/contracts", "employee_contract.delete", "Delete Employee Contracts", "DELETE", "employee_contract"},

		{"/hrd/education", "education_history.read", "View Education History", "VIEW", "education_history"},
		{"/hrd/education", "education_history.create", "Create Education History", "CREATE", "education_history"},
		{"/hrd/education", "education_history.update", "Edit Education History", "EDIT", "education_history"},
		{"/hrd/education", "education_history.delete", "Delete Education History", "DELETE", "education_history"},

		{"/hrd/certifications", "certification.read", "View Certifications", "VIEW", "certification"},
		{"/hrd/certifications", "certification.create", "Create Certifications", "CREATE", "certification"},
		{"/hrd/certifications", "certification.update", "Edit Certifications", "EDIT", "certification"},
		{"/hrd/certifications", "certification.delete", "Delete Certifications", "DELETE", "certification"},

		{"/hrd/employee-assets", "employee_asset.read", "View Employee Assets", "VIEW", "employee_asset"},
		{"/hrd/employee-assets", "employee_asset.create", "Create Employee Assets", "CREATE", "employee_asset"},
		{"/hrd/employee-assets", "employee_asset.update", "Edit Employee Assets", "EDIT", "employee_asset"},
		{"/hrd/employee-assets", "employee_asset.delete", "Delete Employee Assets", "DELETE", "employee_asset"},

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

		// Reports
		{"/reports", "report.view", "View Reports", "VIEW", "report"},
		{"/reports", "report.generate", "Generate Reports", "CREATE", "report"},
		{"/reports", "report.export", "Export Reports", "EXPORT", "report"},

		// AI Assistant
		{"/ai-chatbot", "ai_chatbot.view", "View AI Chatbot", "VIEW", "ai_chatbot"},
		{"/ai-settings", "ai_settings.view", "View AI Settings", "VIEW", "ai_settings"},
		{"/ai-settings", "ai_settings.edit", "Edit AI Settings", "EDIT", "ai_settings"},

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

	// Create permissions
	var permissionIDs []string
	for _, p := range permissions {
		menuID, exists := menuMap[p.menuURL]
		if !exists {
			log.Printf("Warning: Menu not found for URL %s, skipping permission %s", p.menuURL, p.code)
			continue
		}

		// Check if permission already exists
		var existingPerm permission.Permission
		if err := database.DB.Where("code = ?", p.code).First(&existingPerm).Error; err == nil {
			// Permission exists: ensure it matches the latest definition.
			updates := map[string]interface{}{
				"name":     p.name,
				"action":   p.action,
				"resource": p.resource,
				"menu_id":  &menuID,
			}
			if err := database.DB.Model(&existingPerm).Updates(updates).Error; err != nil {
				log.Printf("Warning: Failed to update permission %s: %v", p.code, err)
			}

			// Add ID to list and continue
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
		if err := database.DB.Create(&perm).Error; err != nil {
			log.Printf("Warning: Failed to create permission %s: %v", p.code, err)
			continue
		}
		permissionIDs = append(permissionIDs, perm.ID)
	}

	log.Printf("Ensured existence of %d permissions", len(permissionIDs))

	// Assign all permissions to admin role with ALL scope
	var adminRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		log.Printf("Warning: Admin role not found: %v", err)
	} else {
		for _, permID := range permissionIDs {
			if err := database.DB.Exec(
				"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'ALL') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL'",
				adminRole.ID, permID,
			).Error; err != nil {
				log.Printf("Warning: Failed to assign permission to admin: %v", err)
			}
		}
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
			for _, perm := range viewPermissions {
				if err := database.DB.Exec(
					"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'OWN') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'OWN'",
					viewerRole.ID, perm.ID,
				).Error; err != nil {
					log.Printf("Warning: Failed to assign permission %s to viewer: %v", perm.Code, err)
				} else {
					viewerCount++
				}
			}
			log.Printf("Assigned %d VIEW permissions to viewer role (scope=OWN)", viewerCount)
		}
	}

	// Assign scoped permissions to manager role (DIVISION for operational, ALL for master data)
	assignScopedPermissionsToRole("manager", map[string]string{
		"sales":    "DIVISION",
		"purchase": "DIVISION",
		"hrd":      "DIVISION",
		"finance":  "DIVISION",
		"stock":    "ALL",
	}, "ALL")

	// Assign scoped permissions to staff role (OWN for operational, ALL for master data read)
	assignScopedPermissionsToRole("staff", map[string]string{
		"sales":    "OWN",
		"purchase": "OWN",
		"hrd":      "OWN",
		"finance":  "OWN",
		"stock":    "OWN",
	}, "ALL")

	// Assign scoped permissions to area_supervisor role (AREA for sales, DIVISION for others)
	assignScopedPermissionsToRole("area_supervisor", map[string]string{
		"sales":    "AREA",
		"purchase": "DIVISION",
		"hrd":      "OWN",
		"finance":  "OWN",
		"stock":    "AREA",
	}, "ALL")

	// Assign scoped permissions to sales_director role (ALL for sales, DIVISION for others)
	assignScopedPermissionsToRole("sales_director", map[string]string{
		"sales":    "ALL",
		"purchase": "DIVISION",
		"hrd":      "OWN",
		"finance":  "OWN",
		"stock":    "ALL",
	}, "ALL")

	// Assign scoped permissions to finance_manager role (DIVISION for finance, OWN for others)
	assignScopedPermissionsToRole("finance_manager", map[string]string{
		"finance":  "DIVISION",
		"sales":    "OWN",
		"purchase": "OWN",
		"hrd":      "OWN",
		"stock":    "OWN",
	}, "ALL")

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
	for _, perm := range allPerms {
		scope := defaultScope
		for module, moduleScope := range moduleScopes {
			if matchesModule(perm.Resource, module) {
				scope = moduleScope
				break
			}
		}

		if err := database.DB.Exec(
			"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, ?) ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope",
			r.ID, perm.ID, scope,
		).Error; err != nil {
			log.Printf("Warning: Failed to assign %s to %s: %v", perm.Code, roleCode, err)
		} else {
			count++
		}
	}
	log.Printf("Assigned %d permissions to %s role with module-aware scopes", count, roleCode)
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
		return err
	}

	var allPermissions []permission.Permission
	if err := database.DB.Find(&allPermissions).Error; err != nil {
		return err
	}

	assignedCount := 0
	for _, perm := range allPermissions {
		if err := database.DB.Exec(
			"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'ALL') ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = 'ALL'",
			adminRole.ID, perm.ID,
		).Error; err != nil {
			log.Printf("Warning: Failed to assign permission %s to admin: %v", perm.Code, err)
		} else {
			assignedCount++
		}
	}

	log.Printf("Synced %d permissions to admin role (scope=ALL, total: %d)", assignedCount, len(allPermissions))
	return nil
}
