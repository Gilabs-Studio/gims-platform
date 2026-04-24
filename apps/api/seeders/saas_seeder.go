package seeders

import (
	"log"
	"os"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database/migrations"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm/clause"
)

// SaaS seeder constants
const (
	DefaultTenantID   = migrations.DefaultTenantID // "a0000001-0000-0000-0000-000000000001"
	DefaultTenantName = "Default Organization"
	DefaultTenantSlug = "default"

	// System admin UUID — never appears in the users table
	SystemAdminID    = "b0000001-0000-0000-0000-000000000001"
	SystemAdminEmail = "sysadmin@gilabs.com"
	SystemAdminName  = "GiLabs System Admin"

	// Tenant 2 — empty tenant for testing multi-tenancy
	Tenant2ID       = "a0000002-0000-0000-0000-000000000002"
	Tenant2Name     = "Tenant 2 Organization"
	Tenant2Slug     = "tenant2"
	Tenant2AdminID  = "c0000002-0000-0000-0000-000000000002"
	Tenant2AdminEmail = "admin2@example.com"
)

// SeedTenant creates the default tenant (Tenant 1) and maps existing data to it.
// This seeder is idempotent and does NOT modify any existing seeders.
func SeedTenant() error {
	log.Println("Seeding SaaS tenant (Tenant 1)...")

	ownerUserID := AdminUserID // from existing constants.go

	tenant := tenantModels.Tenant{
		ID:          DefaultTenantID,
		Name:        DefaultTenantName,
		Slug:        DefaultTenantSlug,
		OwnerUserID: &ownerUserID,
		Status:      "active",
		Plan:        "ultimate_suite",
		MaxUsers:    999,
	}

	result := database.DB.Where("id = ?", tenant.ID).FirstOrCreate(&tenant)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		log.Printf("Created default tenant: %s (%s)", tenant.Name, tenant.ID)
	} else {
		log.Println("Default tenant already exists, skipping")
	}

	return nil
}

// SeedTenant2 creates an empty second tenant with a dedicated admin user.
// Tenant 2 has no seeder data — it represents a fresh SaaS customer.
func SeedTenant2() error {
	log.Println("Seeding SaaS Tenant 2 (empty tenant)...")

	tenant2AdminID := Tenant2AdminID

	tenant := tenantModels.Tenant{
		ID:          Tenant2ID,
		Name:        Tenant2Name,
		Slug:        Tenant2Slug,
		OwnerUserID: &tenant2AdminID,
		Status:      "active",
		Plan:        "pos_growth",
		MaxUsers:    10,
	}

	result := database.DB.Where("id = ?", tenant.ID).FirstOrCreate(&tenant)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		log.Printf("Created Tenant 2: %s (%s)", tenant.Name, tenant.ID)
	} else {
		log.Println("Tenant 2 already exists, skipping")
	}

	// Create Tenant 2 admin user with the correct tenant_id set from the start
	// so the user can authenticate with a properly scoped JWT on first login.
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	tenant2Admin := userModels.User{
		ID:        Tenant2AdminID,
		TenantID:  Tenant2ID,
		Email:     Tenant2AdminEmail,
		Password:  string(hashedPassword),
		Name:      "Tenant 2 Admin",
		AvatarURL: "https://api.dicebear.com/7.x/lorelei/svg?seed=" + Tenant2AdminEmail,
		RoleID:    AdminRoleID,
		Status:    "active",
	}

	if err := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		UpdateAll: true,
	}).Create(&tenant2Admin).Error; err != nil {
		log.Printf("Warning: Failed to ensure Tenant 2 admin user: %v", err)
		return err
	}
	log.Printf("Ensured Tenant 2 admin: %s", Tenant2AdminEmail)

	return nil
}

// SeedSystemAdmin creates the initial system admin account.
// The password is read from SYSTEM_ADMIN_PASSWORD env var (default: sysadmin123).
func SeedSystemAdmin() error {
	log.Println("Seeding system admin...")

	password := os.Getenv("SYSTEM_ADMIN_PASSWORD")
	if password == "" {
		// Development default — override via SYSTEM_ADMIN_PASSWORD in production
		password = "sysadmin123"
		log.Printf("WARNING: Using default system admin password. Set SYSTEM_ADMIN_PASSWORD in production!")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := tenantModels.SystemAdmin{
		ID:       SystemAdminID,
		Email:    SystemAdminEmail,
		Password: string(hashedPassword),
		Name:     SystemAdminName,
		Status:   "active",
	}

	// Use upsert to update password/name on re-seed
	if err := database.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"email", "password", "name", "status"}),
	}).Create(&admin).Error; err != nil {
		return err
	}
	log.Printf("Ensured system admin: %s (%s)", admin.Email, admin.ID)

	return nil
}

// BackfillSeedTenantIDs ensures every seeded row has the correct tenant_id.
// It runs the tenant migration (which backfills NULL tenant_id → Tenant 1),
// then explicitly sets Tenant 2 admin's tenant_id to Tenant2ID.
// Safe to call multiple times.
func BackfillSeedTenantIDs() error {
	log.Println("Backfilling tenant_id for seeded data...")

	// Backfill all NULL tenant_id rows → Tenant 1 (idempotent)
	if err := migrations.MigrateTenantID(database.DB); err != nil {
		return err
	}

	// Override Tenant 2 admin to correct tenant
	if err := database.DB.Exec(
		"UPDATE users SET tenant_id = ? WHERE id = ?",
		Tenant2ID, Tenant2AdminID,
	).Error; err != nil {
		return err
	}
	log.Printf("Assigned tenant_id=%s for Tenant 2 admin (%s)", Tenant2ID, Tenant2AdminEmail)

	return nil
}
