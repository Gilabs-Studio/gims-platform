package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/role/data/models"
	"gorm.io/gorm/clause"
)

// SeedRoles seeds initial roles
func SeedRoles() error {
	// Check if roles already exist
	// Refactored to Upsert/Ensure existence of Fixed Roles

	roles := []models.Role{
		{
			ID:          AdminRoleID,
			Name:        "Admin",
			Code:        "admin",
			Description: "Administrator with full access",
			Status:      "active",
			DataScope:   models.DataScopeAll,
		},
		{
			ID:          ManagerRoleID,
			Name:        "Manager",
			Code:        "manager",
			Description: "Manager with department access",
			Status:      "active",
			DataScope:   models.DataScopeDivision,
		},
		{
			ID:          StaffRoleID,
			Name:        "Staff",
			Code:        "staff",
			Description: "Staff with operational access",
			Status:      "active",
			DataScope:   models.DataScopeOwn,
		},
		{
			ID:          ViewerRoleID,
			Name:        "Viewer",
			Code:        "viewer",
			Description: "Viewer role with read-only access",
			Status:      "active",
			DataScope:   models.DataScopeOwn,
		},
		{
			ID:          AreaSupervisorRoleID,
			Name:        "Area Supervisor",
			Code:        "area_supervisor",
			Description: "Supervisor with territory-based access to assigned areas",
			Status:      "active",
			DataScope:   models.DataScopeArea,
		},
		{
			ID:          AuditorRoleID,
			Name:        "Auditor",
			Code:        "auditor",
			Description: "Read-only audit role for financial controls and review",
			Status:      "active",
			DataScope:   models.DataScopeAll,
		},
		{
			ID:          OutletManagerRoleID,
			Name:        "Outlet Manager",
			Code:        "outlet_manager",
			Description: "Manager with outlet-scoped access to sales, purchase, POS, CRM, HRD, and reports",
			Status:      "active",
			DataScope:   models.DataScopeOutlet,
		},
	}

	for _, r := range roles {
		// 1. Check if role with same Code exists but different ID
		var existingCode models.Role
		errCode := database.DB.Unscoped().Where("code = ?", r.Code).First(&existingCode).Error
		if errCode == nil && existingCode.ID != r.ID {
			log.Printf("Role code conflict for %s: Existing ID %s, Expected %s. Moving existing...", r.Code, existingCode.ID, r.ID)
			database.DB.Unscoped().Model(&existingCode).Update("code", r.Code+"_old_"+existingCode.ID[:8])
		}

		// 2. Check if role with same Name exists but different ID
		var existingName models.Role
		errName := database.DB.Unscoped().Where("name = ?", r.Name).First(&existingName).Error
		if errName == nil && existingName.ID != r.ID {
			log.Printf("Role name conflict for %s: Existing ID %s, Expected %s. Moving existing...", r.Name, existingName.ID, r.ID)
			database.DB.Unscoped().Model(&existingName).Update("name", r.Name+"_old_"+existingName.ID[:8])
		}

		// 3. Use OnConflict for ID safety
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		}).Create(&r).Error; err != nil {
			log.Printf("Warning: Failed to ensure role %s: %v", r.Code, err)
			return err
		}
		log.Printf("Ensured role: %s (%s)", r.Name, r.Code)
	}

	log.Println("Roles seeded successfully")
	return nil
}
