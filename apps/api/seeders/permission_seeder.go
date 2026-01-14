package seeders

import (
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	permission "github.com/gilabs/crm-healthcare/api/internal/permission/data/models"
	role "github.com/gilabs/crm-healthcare/api/internal/role/data/models"
)

// SeedPermissions seeds initial permissions based on the provided structure
func SeedPermissions() error {
	// Check if permissions already exist
	var count int64
	database.DB.Model(&permission.Permission{}).Count(&count)
	if count > 0 {
		log.Println("Permissions already seeded, skipping...")
		return nil
	}

	// Get menus
	var dashboardMenu permission.Menu
	var userPageMenu permission.Menu
	var salesCRMMenu, accountsMenu, leadsMenu, pipelineMenu, tasksMenu, productsMenu permission.Menu
	var visitReportsMenu permission.Menu
	var reportsMenu permission.Menu
	var aiMenu, aiChatbotMenu, aiSettingsMenu permission.Menu

	// Base path harus sama dengan yang digunakan di menu_seeder (locale-agnostic).
	basePath := ""

	database.DB.Where("url = ?", basePath+"/dashboard").First(&dashboardMenu)
	database.DB.Where("url = ?", basePath+"/master-data/users").First(&userPageMenu)
	database.DB.Where("url = ?", basePath+"/sales-crm").First(&salesCRMMenu)
	database.DB.Where("url = ?", basePath+"/accounts").First(&accountsMenu)
	database.DB.Where("url = ?", basePath+"/visit-reports").First(&visitReportsMenu)
	database.DB.Where("url = ?", basePath+"/ai-assistant").First(&aiMenu)
	database.DB.Where("url = ?", basePath+"/ai-chatbot").First(&aiChatbotMenu)
	database.DB.Where("url = ?", basePath+"/ai-settings").First(&aiSettingsMenu)

	// Get or create Leads menu
	if err := database.DB.Where("url = ?", basePath+"/leads").First(&leadsMenu).Error; err != nil {
		// Leads menu doesn't exist, create it (salesCRMMenu already loaded above)
		leadsMenu = permission.Menu{
			Name:     "Lead Management",
			Icon:     "user-plus",
			URL:      basePath + "/leads",
			ParentID: &salesCRMMenu.ID,
			Order:    2,
			Status:   "active",
		}
		if err := database.DB.Create(&leadsMenu).Error; err != nil {
			log.Printf("Warning: Failed to create Leads menu: %v", err)
		} else {
			log.Printf("Created Leads menu in permission seeder")
		}
	}

	// Get or create Pipeline menu
	if err := database.DB.Where("url = ?", basePath+"/pipeline").First(&pipelineMenu).Error; err != nil {
		// Pipeline menu doesn't exist, create it (salesCRMMenu already loaded above)
		pipelineMenu = permission.Menu{
			Name:     "Pipeline",
			Icon:     "trending-up",
			URL:      basePath + "/pipeline",
			ParentID: &salesCRMMenu.ID,
			Order:    3,
			Status:   "active",
		}
		if err := database.DB.Create(&pipelineMenu).Error; err != nil {
			log.Printf("Warning: Failed to create Pipeline menu: %v", err)
		} else {
			log.Printf("Created Pipeline menu in permission seeder")
		}
	}
	database.DB.Where("url = ?", basePath+"/tasks").First(&tasksMenu)
	database.DB.Where("url = ?", basePath+"/products").First(&productsMenu)
	database.DB.Where("url = ?", basePath+"/reports").First(&reportsMenu)

	// Define actions for each menu
	actions := []struct {
		menuID   string
		code     string
		name     string
		action   string
		resource string // Added resource field
		menu     *permission.Menu
	}{
		// Dashboard actions
		{dashboardMenu.ID, "dashboard.view", "View Dashboard", "VIEW", "dashboard", &dashboardMenu},

		// Users page actions
		{userPageMenu.ID, "user.read", "View Users", "VIEW", "user", &userPageMenu},
		{userPageMenu.ID, "user.create", "Create Users", "CREATE", "user", &userPageMenu},
		{userPageMenu.ID, "user.update", "Edit Users", "EDIT", "user", &userPageMenu},
		{userPageMenu.ID, "user.delete", "Delete Users", "DELETE", "user", &userPageMenu},
		
		// Roles & Permissions (managed under users usually or separate)
		{userPageMenu.ID, "role.read", "View Roles", "VIEW", "role", &userPageMenu},
		{userPageMenu.ID, "role.create", "Create Roles", "CREATE", "role", &userPageMenu},
		{userPageMenu.ID, "role.update", "Update Roles", "EDIT", "role", &userPageMenu},
		{userPageMenu.ID, "role.delete", "Delete Roles", "DELETE", "role", &userPageMenu},
		{userPageMenu.ID, "role.assign_permissions", "Assign Permissions", "ASSIGN", "role", &userPageMenu},
		{userPageMenu.ID, "permission.read", "View Permissions", "VIEW", "permission", &userPageMenu},

		// Sales CRM actions
		{salesCRMMenu.ID, "sales_crm.view", "View Sales CRM", "VIEW", "sales_crm", &salesCRMMenu},

		// Accounts actions
		{accountsMenu.ID, "account.read", "View Accounts", "VIEW", "account", &accountsMenu},
		{accountsMenu.ID, "account.create", "Create Accounts", "CREATE", "account", &accountsMenu},
		{accountsMenu.ID, "account.update", "Edit Accounts", "EDIT", "account", &accountsMenu},
		{accountsMenu.ID, "account.delete", "Delete Accounts", "DELETE", "account", &accountsMenu},
		// {accountsMenu.ID, "account.detail", "Detail Accounts", "DETAIL", "account", &accountsMenu}, // Covered by read usually
		{accountsMenu.ID, "category.manage", "Manage Categories", "CATEGORY", "category", &accountsMenu},
		{accountsMenu.ID, "contact_role.manage", "Manage Contact Roles", "ROLE", "contact_role", &accountsMenu},

		// Leads actions
		{leadsMenu.ID, "lead.read", "View Leads", "VIEW", "lead", &leadsMenu},
		{leadsMenu.ID, "lead.create", "Create Leads", "CREATE", "lead", &leadsMenu},
		{leadsMenu.ID, "lead.update", "Edit Leads", "EDIT", "lead", &leadsMenu},
		{leadsMenu.ID, "lead.delete", "Delete Leads", "DELETE", "lead", &leadsMenu},
		{leadsMenu.ID, "lead.convert", "Convert Leads", "CONVERT", "lead", &leadsMenu},
		// {leadsMenu.ID, "lead.create_account", "Create Account From Lead", "CREATE_ACCOUNT", "lead", &leadsMenu},
		{leadsMenu.ID, "lead.analytics", "View Lead Analytics", "ANALYTICS", "lead", &leadsMenu},

		// Pipeline actions
		{pipelineMenu.ID, "pipeline.view", "View Pipeline", "VIEW", "pipeline", &pipelineMenu},
		{pipelineMenu.ID, "deal.create", "Create Deals", "CREATE", "deal", &pipelineMenu},
		{pipelineMenu.ID, "deal.update", "Edit Deals", "EDIT", "deal", &pipelineMenu},
		{pipelineMenu.ID, "deal.delete", "Delete Deals", "DELETE", "deal", &pipelineMenu},
		{pipelineMenu.ID, "deal.move", "Move Deals", "MOVE", "deal", &pipelineMenu},
		{pipelineMenu.ID, "deal_summary.view", "View Summary", "SUMMARY", "deal_summary", &pipelineMenu},
		{pipelineMenu.ID, "deal_forecast.view", "View Forecast", "FORECAST", "deal_forecast", &pipelineMenu},
		{pipelineMenu.ID, "pipeline_stage.manage", "Manage Pipeline Stages", "STAGES", "pipeline_stage", &pipelineMenu},

		// Task & Reminder actions
		{tasksMenu.ID, "task.read", "View Tasks", "VIEW", "task", &tasksMenu},
		{tasksMenu.ID, "task.create", "Create Tasks", "CREATE", "task", &tasksMenu},
		{tasksMenu.ID, "task.update", "Edit Tasks", "EDIT", "task", &tasksMenu},
		{tasksMenu.ID, "task.delete", "Delete Tasks", "DELETE", "task", &tasksMenu},
		{tasksMenu.ID, "task.assign", "Assign Tasks", "ASSIGN", "task", &tasksMenu},

		// Visit Reports actions
		{visitReportsMenu.ID, "visit_report.read", "View Visit Reports", "VIEW", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "visit_report.create", "Create Visit Reports", "CREATE", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "visit_report.update", "Edit Visit Reports", "EDIT", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "visit_report.delete", "Delete Visit Reports", "DELETE", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "visit_report.approve", "Approve Visit Reports", "APPROVE", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "visit_report.reject", "Reject Visit Reports", "REJECT", "visit_report", &visitReportsMenu},
		{visitReportsMenu.ID, "activity_type.manage", "Manage Activity Types", "ACTIVITY", "activity_type", &visitReportsMenu},

		// Products actions
		{productsMenu.ID, "product.read", "View Products", "VIEW", "product", &productsMenu},
		{productsMenu.ID, "product.create", "Create Products", "CREATE", "product", &productsMenu},
		{productsMenu.ID, "product.update", "Edit Products", "EDIT", "product", &productsMenu},
		{productsMenu.ID, "product.delete", "Delete Products", "DELETE", "product", &productsMenu},

		// Product Categories actions
		{productsMenu.ID, "product_category.read", "View Product Categories", "VIEW", "product_category", &productsMenu},
		{productsMenu.ID, "product_category.create", "Create Product Categories", "CREATE", "product_category", &productsMenu},
		{productsMenu.ID, "product_category.update", "Edit Product Categories", "EDIT", "product_category", &productsMenu},
		{productsMenu.ID, "product_category.delete", "Delete Product Categories", "DELETE", "product_category", &productsMenu},

		// Reports actions
		{reportsMenu.ID, "report.view", "View Reports", "VIEW", "report", &reportsMenu},
		{reportsMenu.ID, "report.generate", "Generate Reports", "CREATE", "report", &reportsMenu},
		{reportsMenu.ID, "report.export", "Export Reports", "EXPORT", "report", &reportsMenu},

		// AI Chatbot actions
		{aiChatbotMenu.ID, "ai_chatbot.view", "View AI Chatbot", "VIEW", "ai_chatbot", &aiChatbotMenu},

		// AI Settings actions
		{aiSettingsMenu.ID, "ai_settings.view", "View AI Settings", "VIEW", "ai_settings", &aiSettingsMenu},
		{aiSettingsMenu.ID, "ai_settings.edit", "Edit AI Settings", "EDIT", "ai_settings", &aiSettingsMenu},
	}

	// Create permissions
	var permissionIDs []string
	for _, act := range actions {
		perm := permission.Permission{
			Name:     act.name,
			Code:     act.code,
			MenuID:   &act.menuID,
			Action:   act.action,
			Resource: act.resource, // Populate Resource
		}
		if err := database.DB.Create(&perm).Error; err != nil {
			return err
		}
		permissionIDs = append(permissionIDs, perm.ID)
		log.Printf("Created permission: %s (%s)", perm.Name, perm.Code)
	}

	// Assign all permissions to admin role
	var adminRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		return err
	}

	// Assign all permissions to admin
	for _, permID := range permissionIDs {
		if err := database.DB.Exec(
			"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
			adminRole.ID, permID,
		).Error; err != nil {
			return err
		}
	}

	log.Printf("Assigned %d permissions to admin role", len(permissionIDs))

	// Always sync all permissions to admin role (even if permissions already exist)
	if err := SyncAdminPermissions(); err != nil {
		log.Printf("Warning: Failed to sync admin permissions: %v", err)
	}

	// Assign VIEW permissions only to viewer role (read-only access)
	var viewerRole role.Role
	if err := database.DB.Where("code = ?", "viewer").First(&viewerRole).Error; err == nil {
		// Get all VIEW permissions only
		var viewPermissions []permission.Permission
		if err := database.DB.Where("action = ?", "VIEW").Find(&viewPermissions).Error; err == nil {
			viewerPermissionCount := 0
			for _, perm := range viewPermissions {
				if err := database.DB.Exec(
					"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
					viewerRole.ID, perm.ID,
				).Error; err != nil {
					log.Printf("Warning: Failed to assign permission %s to viewer: %v", perm.Code, err)
				} else {
					viewerPermissionCount++
				}
			}
			log.Printf("Assigned %d VIEW permissions to viewer role", viewerPermissionCount)
		}
	} else {
		log.Printf("Warning: Viewer role not found, skipping viewer permission assignment: %v", err)
	}

	log.Println("Permissions seeded successfully")
	return nil
}

// SyncAdminPermissions syncs all existing permissions to admin role
// This ensures admin always has access to all permissions, including newly added ones
func SyncAdminPermissions() error {
	var adminRole role.Role
	if err := database.DB.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
		return err
	}

	// Get all permissions from database
	var allPermissions []permission.Permission
	if err := database.DB.Find(&allPermissions).Error; err != nil {
		return err
	}

	// Assign all permissions to admin (skip if already exists)
	assignedCount := 0
	for _, perm := range allPermissions {
		if err := database.DB.Exec(
			"INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
			adminRole.ID, perm.ID,
		).Error; err != nil {
			log.Printf("Warning: Failed to assign permission %s to admin: %v", perm.Code, err)
		} else {
			assignedCount++
		}
	}

	log.Printf("Synced %d permissions to admin role (total: %d)", assignedCount, len(allPermissions))
	return nil
}
