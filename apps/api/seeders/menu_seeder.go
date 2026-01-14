package seeders

import (
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	permission "github.com/gilabs/crm-healthcare/api/internal/permission/data/models"
)

// SeedMenus seeds initial menus based on the provided structure
func SeedMenus() error {
	// Check if menus already exist
	var count int64
	database.DB.Model(&permission.Menu{}).Count(&count)
	if count > 0 {
		log.Println("Menus already seeded, skipping...")
		return nil
	}

	// Base path for frontend routes (for i18n support, keep URLs locale-agnostic).
	// Frontend akan menambahkan prefix locale sendiri (mis. "/en" atau "/id").
	basePath := ""

	// Create Dashboard menu (root level)
	dashboardMenu := permission.Menu{
		Name:   "Dashboard",
		Icon:   "layout-dashboard",
		URL:    basePath + "/dashboard",
		Order:  1,
		Status: "active",
	}
	if err := database.DB.Create(&dashboardMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", dashboardMenu.Name)

	// Create root menu: Data Master
	dataMasterMenu := permission.Menu{
		Name:   "Data Master",
		Icon:   "database",
		URL:    basePath + "/data-master",
		Order:  2,
		Status: "active",
	}
	if err := database.DB.Create(&dataMasterMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", dataMasterMenu.Name)

	// Create Users menu under Data Master
	userPageMenu := permission.Menu{
		Name:     "Users",
		Icon:     "users",
		URL:      basePath + "/master-data/users",
		ParentID: &dataMasterMenu.ID,
		Order:    1,
		Status:   "active",
	}
	if err := database.DB.Create(&userPageMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", userPageMenu.Name)

	// Create Sales CRM root menu
	salesCRMMenu := permission.Menu{
		Name:   "Sales CRM",
		Icon:   "briefcase",
		URL:    basePath + "/sales-crm",
		Order:  3,
		Status: "active",
	}
	if err := database.DB.Create(&salesCRMMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", salesCRMMenu.Name)

	// Create Accounts menu under Sales CRM
	accountsMenu := permission.Menu{
		Name:     "Accounts",
		Icon:     "building-2",
		URL:      basePath + "/accounts",
		ParentID: &salesCRMMenu.ID,
		Order:    1,
		Status:   "active",
	}
	if err := database.DB.Create(&accountsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", accountsMenu.Name)

	// Create Leads menu under Sales CRM
	leadsMenu := permission.Menu{
		Name:     "Lead Management",
		Icon:     "user-plus",
		URL:      basePath + "/leads",
		ParentID: &salesCRMMenu.ID,
		Order:    2,
		Status:   "active",
	}
	if err := database.DB.Create(&leadsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", leadsMenu.Name)

	// Create Pipeline menu under Sales CRM
	pipelineMenu := permission.Menu{
		Name:     "Pipeline",
		Icon:     "trending-up",
		URL:      basePath + "/pipeline",
		ParentID: &salesCRMMenu.ID,
		Order:    3,
		Status:   "active",
	}
	if err := database.DB.Create(&pipelineMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", pipelineMenu.Name)

	// Create Visit Reports menu under Sales CRM
	visitReportsMenu := permission.Menu{
		Name:     "Visit Reports",
		Icon:     "map-pin",
		URL:      basePath + "/visit-reports",
		ParentID: &salesCRMMenu.ID,
		Order:    4,
		Status:   "active",
	}
	if err := database.DB.Create(&visitReportsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", visitReportsMenu.Name)

	// Create Tasks menu under Sales CRM
	tasksMenu := permission.Menu{
		Name:     "Tasks",
		Icon:     "clipboard-list",
		URL:      basePath + "/tasks",
		ParentID: &salesCRMMenu.ID,
		Order:    5,
		Status:   "active",
	}
	if err := database.DB.Create(&tasksMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", tasksMenu.Name)

	// Create Products menu under Data Master (single entry, internal tabs handle sub-sections)
	productsMenu := permission.Menu{
		Name:     "Products",
		Icon:     "package",
		URL:      basePath + "/products",
		ParentID: &dataMasterMenu.ID,
		Order:    2,
		Status:   "active",
	}
	if err := database.DB.Create(&productsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", productsMenu.Name)

	// Create Reports menu (root level)
	reportsMenu := permission.Menu{
		Name:   "Reports",
		Icon:   "file-text",
		URL:    basePath + "/reports",
		Order:  4,
		Status: "active",
	}
	if err := database.DB.Create(&reportsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", reportsMenu.Name)

	// Create AI Assistant root menu
	aiMenu := permission.Menu{
		Name:   "AI Assistant",
		Icon:   "sparkles",
		URL:    basePath + "/ai-assistant",
		Order:  5,
		Status: "active",
	}
	if err := database.DB.Create(&aiMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", aiMenu.Name)

	// Create AI Chatbot menu under AI Assistant
	aiChatbotMenu := permission.Menu{
		Name:     "AI Chatbot",
		Icon:     "ai-chatbot",
		URL:      basePath + "/ai-chatbot",
		ParentID: &aiMenu.ID,
		Order:    1,
		Status:   "active",
	}
	if err := database.DB.Create(&aiChatbotMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", aiChatbotMenu.Name)

	// Create AI Settings menu under AI Assistant
	aiSettingsMenu := permission.Menu{
		Name:     "AI Settings",
		Icon:     "ai-settings",
		URL:      basePath + "/ai-settings",
		ParentID: &aiMenu.ID,
		Order:    2,
		Status:   "active",
	}
	if err := database.DB.Create(&aiSettingsMenu).Error; err != nil {
		return err
	}
	log.Printf("Created menu: %s", aiSettingsMenu.Name)

	log.Println("Menus seeded successfully")
	return nil
}

// UpdateMenuStructure updates existing menu structure to fix Users menu location
func UpdateMenuStructure() error {
	log.Println("Updating menu structure...")

	// Find Data Master menu
	var dataMasterMenu permission.Menu
	if err := database.DB.Where("url = ?", "/data-master").First(&dataMasterMenu).Error; err != nil {
		log.Printf("Data Master menu not found, skipping update: %v", err)
		return nil
	}

	// Find Users menu with old URL (/users) or old parent (Healthcare)
	var userPageMenu permission.Menu
	if err := database.DB.Where("url = ?", "/master-data/users").First(&userPageMenu).Error; err == nil {
		// Users menu exists, update parent to Data Master directly
		log.Printf("Updating Users menu parent to Data Master")
		userPageMenu.ParentID = &dataMasterMenu.ID
		userPageMenu.Order = 1
		if err := database.DB.Save(&userPageMenu).Error; err != nil {
			return err
		}
		log.Printf("Updated Users menu parent to Data Master")
	} else if err := database.DB.Where("url = ?", "/users").First(&userPageMenu).Error; err == nil {
		// Users menu exists with old URL, need to migrate
		log.Printf("Migrating Users menu from /users to /master-data/users")

		// Update Users menu URL and parent to Data Master
		userPageMenu.URL = "/master-data/users"
		userPageMenu.ParentID = &dataMasterMenu.ID
		userPageMenu.Order = 1
		if err := database.DB.Save(&userPageMenu).Error; err != nil {
			return err
		}
		log.Printf("Updated Users menu URL to /master-data/users and parent to Data Master")
	}

	// Find and delete Healthcare menu if it exists
	var healthcareMenu permission.Menu
	if err := database.DB.Where("url = ?", "/master-data").First(&healthcareMenu).Error; err == nil {
		// Check if Healthcare menu has any children
		var childCount int64
		database.DB.Model(&permission.Menu{}).Where("parent_id = ?", healthcareMenu.ID).Count(&childCount)

		if childCount == 0 {
			// Delete Healthcare menu if it has no children
			if err := database.DB.Delete(&healthcareMenu).Error; err != nil {
				log.Printf("Warning: Failed to delete Healthcare menu: %v", err)
			} else {
				log.Printf("Deleted Healthcare menu")
			}
		}
	}

	// Find and delete Company Management menu and its children if they exist
	var companyMgmtMenu permission.Menu
	if err := database.DB.Where("url = ?", "/data-master/company").First(&companyMgmtMenu).Error; err == nil {
		// Find and delete all children of Company Management
		var children []permission.Menu
		database.DB.Where("parent_id = ?", companyMgmtMenu.ID).Find(&children)
		for _, child := range children {
			if err := database.DB.Delete(&child).Error; err != nil {
				log.Printf("Warning: Failed to delete menu %s: %v", child.Name, err)
			} else {
				log.Printf("Deleted menu: %s", child.Name)
			}
		}

		// Delete Company Management menu
		if err := database.DB.Delete(&companyMgmtMenu).Error; err != nil {
			log.Printf("Warning: Failed to delete Company Management menu: %v", err)
		} else {
			log.Printf("Deleted Company Management menu")
		}
	}

	// Find and delete System menu if it exists and has no children
	var systemMenu permission.Menu
	if err := database.DB.Where("url = ?", "/system").First(&systemMenu).Error; err == nil {
		// Check if System menu has any children
		var childCount int64
		database.DB.Model(&permission.Menu{}).Where("parent_id = ?", systemMenu.ID).Count(&childCount)

		if childCount == 0 {
			// Delete System menu if it has no children
			if err := database.DB.Delete(&systemMenu).Error; err != nil {
				log.Printf("Warning: Failed to delete System menu: %v", err)
			} else {
				log.Printf("Deleted System menu")
			}
		}
	}

	// Add Leads menu if it doesn't exist
	var leadsMenu permission.Menu
	if err := database.DB.Where("url = ?", "/leads").First(&leadsMenu).Error; err != nil {
		// Leads menu doesn't exist, create it
		var salesCRMMenu permission.Menu
		if err := database.DB.Where("url = ?", "/sales-crm").First(&salesCRMMenu).Error; err == nil {
			leadsMenu = permission.Menu{
				Name:     "Lead Management",
				Icon:     "user-plus",
				URL:      "/leads",
				ParentID: &salesCRMMenu.ID,
				Order:    2,
				Status:   "active",
			}
			if err := database.DB.Create(&leadsMenu).Error; err != nil {
				log.Printf("Warning: Failed to create Leads menu: %v", err)
			} else {
				log.Printf("Created Leads menu")
			}
		}
	}

	// Add Pipeline menu if it doesn't exist
	var pipelineMenu permission.Menu
	if err := database.DB.Where("url = ?", "/pipeline").First(&pipelineMenu).Error; err != nil {
		// Pipeline menu doesn't exist, create it
		var salesCRMMenu permission.Menu
		if err := database.DB.Where("url = ?", "/sales-crm").First(&salesCRMMenu).Error; err == nil {
			pipelineMenu = permission.Menu{
				Name:     "Pipeline",
				Icon:     "trending-up",
				URL:      "/pipeline",
				ParentID: &salesCRMMenu.ID,
				Order:    3,
				Status:   "active",
			}
			if err := database.DB.Create(&pipelineMenu).Error; err != nil {
				log.Printf("Warning: Failed to create Pipeline menu: %v", err)
			} else {
				log.Printf("Created Pipeline menu")
			}
		}
	}

	// Add Tasks menu if it doesn't exist
	var tasksMenu permission.Menu
	if err := database.DB.Where("url = ?", "/tasks").First(&tasksMenu).Error; err != nil {
		var salesCRMMenu permission.Menu
		if err := database.DB.Where("url = ?", "/sales-crm").First(&salesCRMMenu).Error; err == nil {
			tasksMenu = permission.Menu{
				Name:     "Tasks",
				Icon:     "clipboard-list",
				URL:      "/tasks",
				ParentID: &salesCRMMenu.ID,
				Order:    4,
				Status:   "active",
			}
			if err := database.DB.Create(&tasksMenu).Error; err != nil {
				log.Printf("Warning: Failed to create Tasks menu: %v", err)
			} else {
				log.Printf("Created Tasks menu")
			}
		}
	}

	// Add Products menu if it doesn't exist
	var productsMenu permission.Menu
	if err := database.DB.Where("url = ?", "/products").First(&productsMenu).Error; err != nil {
		// Products menu doesn't exist at all: create under Data Master
		var dataMaster permission.Menu
		if err := database.DB.Where("url = ?", "/data-master").First(&dataMaster).Error; err == nil {
			productsMenu = permission.Menu{
				Name:     "Products",
				Icon:     "package",
				URL:      "/products",
				ParentID: &dataMaster.ID,
				Order:    2,
				Status:   "active",
			}
			if err := database.DB.Create(&productsMenu).Error; err != nil {
				log.Printf("Warning: Failed to create Products menu: %v", err)
			} else {
				log.Printf("Created Products menu under Data Master")
			}
		}
	} else {
		// Products menu exists (mungkin masih di bawah Sales CRM) -> pastikan parent-nya Data Master
		var dataMaster permission.Menu
		if err := database.DB.Where("url = ?", "/data-master").First(&dataMaster).Error; err == nil {
			if productsMenu.ParentID == nil || *productsMenu.ParentID != dataMaster.ID {
				productsMenu.ParentID = &dataMaster.ID
				productsMenu.Order = 2
				if err := database.DB.Save(&productsMenu).Error; err != nil {
					log.Printf("Warning: Failed to move Products menu under Data Master: %v", err)
				} else {
					log.Printf("Moved Products menu under Data Master")
				}
			}
		}
	}

	// Remove Product Categories menu from navigation if it exists
	var productCategoriesMenu permission.Menu
	if err := database.DB.Where("url = ?", "/product-categories").First(&productCategoriesMenu).Error; err == nil {
		if err := database.DB.Delete(&productCategoriesMenu).Error; err != nil {
			log.Printf("Warning: Failed to delete Product Categories menu: %v", err)
		} else {
			log.Printf("Deleted Product Categories menu from navigation")
		}
	}

	// Remove legacy Products child menu (/products/list) if it exists,
	// so sidebar only shows a single 'Products' entry that internally uses tabs.
	var productsListMenu permission.Menu
	if err := database.DB.Where("url = ?", "/products/list").First(&productsListMenu).Error; err == nil {
		if err := database.DB.Delete(&productsListMenu).Error; err != nil {
			log.Printf("Warning: Failed to delete Products list child menu: %v", err)
		} else {
			log.Printf("Deleted legacy Products list child menu from navigation")
		}
	}

	// Add AI Assistant menu if it doesn't exist
	var aiMenu permission.Menu
	if err := database.DB.Where("url = ?", "/ai-assistant").First(&aiMenu).Error; err != nil {
		aiMenu = permission.Menu{
			Name:   "AI Assistant",
			Icon:   "sparkles",
			URL:    "/ai-assistant",
			Order:  5,
			Status: "active",
		}
		if err := database.DB.Create(&aiMenu).Error; err != nil {
			log.Printf("Warning: Failed to create AI Assistant menu: %v", err)
		} else {
			log.Printf("Created AI Assistant menu")
		}
	}

	// Add AI Chatbot menu if it doesn't exist
	var aiChatbotMenu permission.Menu
	if err := database.DB.Where("url = ?", "/ai-chatbot").First(&aiChatbotMenu).Error; err != nil {
		aiChatbotMenu = permission.Menu{
			Name:     "AI Chatbot",
			Icon:     "ai-chatbot",
			URL:      "/ai-chatbot",
			ParentID: &aiMenu.ID,
			Order:    1,
			Status:   "active",
		}
		if err := database.DB.Create(&aiChatbotMenu).Error; err != nil {
			log.Printf("Warning: Failed to create AI Chatbot menu: %v", err)
		} else {
			log.Printf("Created AI Chatbot menu")
		}
	}

	// Add AI Settings menu if it doesn't exist
	var aiSettingsMenu permission.Menu
	if err := database.DB.Where("url = ?", "/ai-settings").First(&aiSettingsMenu).Error; err != nil {
		aiSettingsMenu = permission.Menu{
			Name:     "AI Settings",
			Icon:     "ai-settings",
			URL:      "/ai-settings",
			ParentID: &aiMenu.ID,
			Order:    2,
			Status:   "active",
		}
		if err := database.DB.Create(&aiSettingsMenu).Error; err != nil {
			log.Printf("Warning: Failed to create AI Settings menu: %v", err)
		} else {
			log.Printf("Created AI Settings menu")
		}
	}

	log.Println("Menu structure updated successfully")
	return nil
}
