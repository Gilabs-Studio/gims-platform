package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	permission "github.com/gilabs/gims/api/internal/permission/data/models"
)

// createMenu is a helper function to create or update a menu
func createMenu(menu *permission.Menu) error {
	var existing permission.Menu
	query := database.DB.Where("name = ?", menu.Name)
	if menu.ParentID != nil {
		query = query.Where("parent_id = ?", *menu.ParentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}

	if err := query.First(&existing).Error; err == nil {
		// Found existing menu, update it
		menu.ID = existing.ID // Important: keep the ID for children
		if err := database.DB.Model(&existing).Updates(map[string]interface{}{
			"icon":   menu.Icon,
			"url":    menu.URL,
			"order":  menu.Order,
			"status": menu.Status,
		}).Error; err != nil {
			return err
		}
		log.Printf("Updated menu: %s", menu.Name)
		return nil
	}

	// Create new
	if err := database.DB.Create(menu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", menu.Name)
	return nil
}

// createChildMenu creates a child menu under a parent
func createChildMenu(name, icon, url string, parentID *string, order int) (*permission.Menu, error) {
	menu := &permission.Menu{
		Name:     name,
		Icon:     icon,
		URL:      url,
		ParentID: parentID,
		Order:    order,
		Status:   "active",
	}
	if err := createMenu(menu); err != nil {
		return nil, err
	}
	return menu, nil
}

// SeedMenus seeds initial ERP menus based on database structure
func SeedMenus() error {


	log.Println("Seeding ERP menu structure...")

	// ============================================================
	// ROOT LEVEL MENUS
	// ============================================================

	// 1. Dashboard
	dashboardMenu := &permission.Menu{
		Name:   "Dashboard",
		Icon:   "layout-dashboard",
		URL:    "/dashboard",
		Order:  1,
		Status: "active",
	}
	if err := createMenu(dashboardMenu); err != nil {
		return err
	}

	// 2. Master Data
	masterDataMenu := &permission.Menu{
		Name:   "Master Data",
		Icon:   "database",
		URL:    "/master-data",
		Order:  2,
		Status: "active",
	}
	if err := createMenu(masterDataMenu); err != nil {
		return err
	}

	// 3. Sales
	salesMenu := &permission.Menu{
		Name:   "Sales",
		Icon:   "shopping-cart",
		URL:    "/sales",
		Order:  3,
		Status: "active",
	}
	if err := createMenu(salesMenu); err != nil {
		return err
	}

	// 4. Purchase
	purchaseMenu := &permission.Menu{
		Name:   "Purchase",
		Icon:   "truck",
		URL:    "/purchase",
		Order:  4,
		Status: "active",
	}
	if err := createMenu(purchaseMenu); err != nil {
		return err
	}

	// 5. Stock
	stockMenu := &permission.Menu{
		Name:   "Stock",
		Icon:   "warehouse",
		URL:    "/stock",
		Order:  5,
		Status: "active",
	}
	if err := createMenu(stockMenu); err != nil {
		return err
	}

	// 6. Finance
	financeMenu := &permission.Menu{
		Name:   "Finance",
		Icon:   "credit-card",
		URL:    "/finance",
		Order:  6,
		Status: "active",
	}
	if err := createMenu(financeMenu); err != nil {
		return err
	}

	// 7. HRD
	hrdMenu := &permission.Menu{
		Name:   "HRD",
		Icon:   "users",
		URL:    "/hrd",
		Order:  7,
		Status: "active",
	}
	if err := createMenu(hrdMenu); err != nil {
		return err
	}

	// 8. Reports
	reportsMenu := &permission.Menu{
		Name:   "Reports",
		Icon:   "bar-chart-3",
		URL:    "/reports",
		Order:  8,
		Status: "active",
	}
	if err := createMenu(reportsMenu); err != nil {
		return err
	}

	// 9. AI Assistant
	aiMenu := &permission.Menu{
		Name:   "AI Assistant",
		Icon:   "sparkles",
		URL:    "/ai-assistant",
		Order:  9,
		Status: "active",
	}
	if err := createMenu(aiMenu); err != nil {
		return err
	}

	// ============================================================
	// MASTER DATA SUB-MENUS
	// ============================================================

	// Geographic Group
	geographicMenu, err := createChildMenu("Geographic", "globe", "/master-data/geographic", &masterDataMenu.ID, 1)
	if err != nil {
		return err
	}

	geographicChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Countries", "flag", "/master-data/geographic/countries", 1},
		{"Provinces", "map", "/master-data/geographic/provinces", 2},
		{"Cities", "building", "/master-data/geographic/cities", 3},
		{"Districts", "map-pin", "/master-data/geographic/districts", 4},
		{"Villages", "home", "/master-data/geographic/villages", 5},
	}
	for _, child := range geographicChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &geographicMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Organization Group
	organizationMenu, err := createChildMenu("Organization", "building-2", "/master-data/organization", &masterDataMenu.ID, 2)
	if err != nil {
		return err
	}

	organizationChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Company", "briefcase", "/master-data/company", 1},
		{"Divisions", "layers", "/master-data/divisions", 2},
		{"Job Positions", "user-cog", "/master-data/job-positions", 3},
		{"Business Units", "grid", "/master-data/business-units", 4},
		{"Business Types", "tag", "/master-data/business-types", 5},
		{"Areas", "map", "/master-data/areas", 6},
		{"Area Supervisors", "user-check", "/master-data/area-supervisors", 7},
	}
	for _, child := range organizationChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &organizationMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Employee
	if _, err := createChildMenu("Employees", "users", "/master-data/employees", &masterDataMenu.ID, 3); err != nil {
		return err
	}

	// Supplier Group
	supplierMenu, err := createChildMenu("Supplier", "truck", "/master-data/supplier", &masterDataMenu.ID, 4)
	if err != nil {
		return err
	}

	supplierChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Suppliers", "building-2", "/master-data/suppliers", 1},
		{"Supplier Types", "tag", "/master-data/supplier-types", 2},
		{"Banks", "landmark", "/master-data/banks", 3},
	}
	for _, child := range supplierChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &supplierMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Product Group
	productMenu, err := createChildMenu("Product", "package", "/master-data/product", &masterDataMenu.ID, 5)
	if err != nil {
		return err
	}

	productChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Products", "package", "/master-data/products", 1},
		{"Categories", "folder-tree", "/master-data/product-categories", 2},
		{"Brands", "star", "/master-data/product-brands", 3},
		{"Segments", "pie-chart", "/master-data/product-segments", 4},
		{"Types", "tag", "/master-data/product-types", 5},
		{"Packaging", "box", "/master-data/packaging", 6},
		{"Unit of Measure", "ruler", "/master-data/uom", 7},
		{"Procurement Types", "shopping-bag", "/master-data/procurement-types", 8},
	}
	for _, child := range productChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &productMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Warehouse
	if _, err := createChildMenu("Warehouses", "warehouse", "/master-data/warehouses", &masterDataMenu.ID, 6); err != nil {
		return err
	}

	// Payment & Courier
	paymentMenu, err := createChildMenu("Payment & Courier", "credit-card", "/master-data/payment-courier", &masterDataMenu.ID, 7)
	if err != nil {
		return err
	}

	paymentChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Payment Terms", "clock", "/master-data/payment-terms", 1},
		{"Courier Agencies", "truck", "/master-data/courier-agencies", 2},
		{"SO Sources", "file-text", "/master-data/so-sources", 3},
	}
	for _, child := range paymentChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &paymentMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Leave Types
	if _, err := createChildMenu("Leave Types", "calendar", "/master-data/leave-types", &masterDataMenu.ID, 8); err != nil {
		return err
	}

	// Users (RBAC)
	if _, err := createChildMenu("Users", "users", "/master-data/users", &masterDataMenu.ID, 99); err != nil {
		return err
	}

	// ============================================================
	// SALES SUB-MENUS
	// ============================================================

	salesChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Quotations", "file-text", "/sales/quotations", 1},
		{"Sales Orders", "shopping-cart", "/sales/orders", 2},
		{"Delivery Orders", "truck", "/sales/delivery-orders", 3},
		{"Customer Invoices", "receipt", "/sales/invoices", 4},
		{"Visit Reports", "map-pin", "/sales/visits", 5},
		{"Sales Estimation", "calculator", "/sales/estimations", 6},
		{"Sales Target", "target", "/sales/targets", 7},
	}
	for _, child := range salesChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &salesMenu.ID, child.order); err != nil {
			return err
		}
	}

	// ============================================================
	// PURCHASE SUB-MENUS
	// ============================================================

	purchaseChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Requisitions", "clipboard-list", "/purchase/requisitions", 1},
		{"Purchase Orders", "file-text", "/purchase/orders", 2},
		{"Goods Receipt", "package", "/purchase/goods-receipt", 3},
		{"Supplier Invoices", "receipt", "/purchase/invoices", 4},
	}
	for _, child := range purchaseChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &purchaseMenu.ID, child.order); err != nil {
			return err
		}
	}

	// ============================================================
	// STOCK SUB-MENUS
	// ============================================================

	stockChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Inventory", "package", "/stock/inventory", 1},
		{"Stock Movement", "arrow-right-left", "/stock/movements", 2},
		{"Stock Opname", "clipboard-check", "/stock/opname", 3},
	}
	for _, child := range stockChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &stockMenu.ID, child.order); err != nil {
			return err
		}
	}

	// ============================================================
	// FINANCE SUB-MENUS
	// ============================================================

	financeChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Chart of Accounts", "list", "/finance/coa", 1},
		{"Journal Entries", "book-open", "/finance/journals", 2},
		{"Bank Accounts", "landmark", "/finance/bank-accounts", 3},
		{"Payments", "credit-card", "/finance/payments", 4},
		{"Tax Invoices", "file-text", "/finance/tax-invoices", 5},
		{"Non-Trade Payables", "file-minus", "/finance/non-trade-payables", 6},
		{"Budget", "pie-chart", "/finance/budget", 7},
		{"Cash Bank Journal", "book", "/finance/cash-bank", 8},
		{"Financial Closing", "lock", "/finance/closing", 9},
		{"Asset Management", "briefcase", "/finance/assets", 10},
		{"Up Country Cost", "map", "/finance/up-country-cost", 11},
		{"Salary", "dollar-sign", "/finance/salary", 12},
	}
	for _, child := range financeChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &financeMenu.ID, child.order); err != nil {
			return err
		}
	}

	// ============================================================
	// HRD SUB-MENUS
	// ============================================================

	hrdChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Attendance", "clock", "/hrd/attendance", 1},
		{"Leave Requests", "calendar", "/hrd/leave-requests", 2},
		{"Evaluation", "star", "/hrd/evaluation", 5},
		{"Recruitment", "user-plus", "/hrd/recruitment", 6},
		{"Work Schedule", "calendar", "/hrd/work-schedule", 7},
		{"Holidays", "calendar", "/hrd/holidays", 8},
	}
	for _, child := range hrdChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &hrdMenu.ID, child.order); err != nil {
			return err
		}
	}

	// Employee Documents Group
	empDocsMenu, err := createChildMenu("Employee Documents", "folder", "/hrd/documents", &hrdMenu.ID, 3)
	if err != nil {
		return err
	}

	empDocsChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"Contracts", "file-text", "/hrd/contracts", 1},
		{"Education History", "graduation-cap", "/hrd/education", 2},
		{"Certifications", "award", "/hrd/certifications", 3},
		{"Employee Assets", "package", "/hrd/employee-assets", 4},
	}
	for _, child := range empDocsChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &empDocsMenu.ID, child.order); err != nil {
			return err
		}
	}

	// ============================================================
	// AI ASSISTANT SUB-MENUS
	// ============================================================

	aiChildren := []struct {
		name  string
		icon  string
		url   string
		order int
	}{
		{"AI Chatbot", "bot", "/ai-chatbot", 1},
		{"AI Settings", "settings", "/ai-settings", 2},
	}
	for _, child := range aiChildren {
		if _, err := createChildMenu(child.name, child.icon, child.url, &aiMenu.ID, child.order); err != nil {
			return err
		}
	}

	log.Println("ERP menus seeded successfully")
	return nil
}

// UpdateMenuStructure updates existing menu structure (migration helper)
func UpdateMenuStructure() error {
	log.Println("Menu structure update completed (no changes needed for fresh seed)")
	return nil
}
