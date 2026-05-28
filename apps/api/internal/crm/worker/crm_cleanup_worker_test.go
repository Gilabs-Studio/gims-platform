package worker

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Define local schema models specifically for testing the raw SQL operations
type TestDeal struct {
	ID        string         `gorm:"primaryKey"`
	Title     string
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (TestDeal) TableName() string {
	return "crm_deals"
}

type TestLead struct {
	ID        string         `gorm:"primaryKey"`
	FirstName string
	LastName  string
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (TestLead) TableName() string {
	return "crm_leads"
}

type TestDealProductItem struct {
	ID     string `gorm:"primaryKey"`
	DealID string
}

func (TestDealProductItem) TableName() string {
	return "crm_deal_product_items"
}

type TestLeadProductItem struct {
	ID     string `gorm:"primaryKey"`
	LeadID string
}

func (TestLeadProductItem) TableName() string {
	return "crm_lead_product_items"
}

type TestDealHistory struct {
	ID     string `gorm:"primaryKey;default:rowid"` // SQLite auto-inc pk fallback
	DealID string
}

func (TestDealHistory) TableName() string {
	return "crm_deal_histories"
}

type TestTask struct {
	ID     string `gorm:"primaryKey"`
	LeadID *string
	DealID *string
}

func (TestTask) TableName() string {
	return "crm_tasks"
}

type TestActivity struct {
	ID     string `gorm:"primaryKey"`
	LeadID *string
	DealID *string
}

func (TestActivity) TableName() string {
	return "crm_activities"
}

type TestVisitReport struct {
	ID     string `gorm:"primaryKey"`
	LeadID *string
	DealID *string
}

func (TestVisitReport) TableName() string {
	return "crm_visit_reports"
}

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test SQLite DB: %v", err)
	}

	// Migrate schemas
	err = db.AutoMigrate(
		&TestDeal{},
		&TestLead{},
		&TestDealProductItem{},
		&TestLeadProductItem{},
		&TestDealHistory{},
		&TestTask{},
		&TestActivity{},
		&TestVisitReport{},
	)
	if err != nil {
		t.Fatalf("failed to migrate test schemas: %v", err)
	}

	return db
}

func TestCrmCleanupWorker_CleanupSoftDeletedRecords(t *testing.T) {
	db := setupTestDB(t)

	now := time.Now()
	expiredTime := now.AddDate(0, 0, -31) // Older than 30 days
	recentTime := now.AddDate(0, 0, -10)  // Newer than 30 days

	// Seed Deals
	expiredDeal := TestDeal{ID: "deal-expired", Title: "Expired Deal", DeletedAt: gorm.DeletedAt{Time: expiredTime, Valid: true}}
	recentDeal := TestDeal{ID: "deal-recent", Title: "Recent Deal", DeletedAt: gorm.DeletedAt{Time: recentTime, Valid: true}}
	activeDeal := TestDeal{ID: "deal-active", Title: "Active Deal"}

	db.Create(&expiredDeal)
	db.Create(&recentDeal)
	db.Create(&activeDeal)

	// Seed child relations for expired deal
	db.Create(&TestDealProductItem{ID: "dpi-expired", DealID: expiredDeal.ID})
	db.Create(&TestDealHistory{DealID: expiredDeal.ID})
	db.Create(&TestTask{ID: "task-deal-expired", DealID: &expiredDeal.ID})
	db.Create(&TestActivity{ID: "act-deal-expired", DealID: &expiredDeal.ID})
	db.Create(&TestVisitReport{ID: "vr-deal-expired", DealID: &expiredDeal.ID})

	// Seed child relations for recent deal (should not be deleted)
	db.Create(&TestDealProductItem{ID: "dpi-recent", DealID: recentDeal.ID})
	db.Create(&TestTask{ID: "task-deal-recent", DealID: &recentDeal.ID})
	db.Create(&TestActivity{ID: "act-deal-recent", DealID: &recentDeal.ID})
	db.Create(&TestVisitReport{ID: "vr-deal-recent", DealID: &recentDeal.ID})

	// Seed Leads
	expiredLead := TestLead{ID: "lead-expired", FirstName: "Expired", LastName: "Lead", DeletedAt: gorm.DeletedAt{Time: expiredTime, Valid: true}}
	recentLead := TestLead{ID: "lead-recent", FirstName: "Recent", LastName: "Lead", DeletedAt: gorm.DeletedAt{Time: recentTime, Valid: true}}
	activeLead := TestLead{ID: "lead-active", FirstName: "Active", LastName: "Lead"}

	db.Create(&expiredLead)
	db.Create(&recentLead)
	db.Create(&activeLead)

	// Seed child relations for expired lead
	db.Create(&TestLeadProductItem{ID: "lpi-expired", LeadID: expiredLead.ID})
	db.Create(&TestTask{ID: "task-lead-expired", LeadID: &expiredLead.ID})
	db.Create(&TestActivity{ID: "act-lead-expired", LeadID: &expiredLead.ID})
	db.Create(&TestVisitReport{ID: "vr-lead-expired", LeadID: &expiredLead.ID})

	// Seed child relations for recent lead (should not be deleted)
	db.Create(&TestLeadProductItem{ID: "lpi-recent", LeadID: recentLead.ID})
	db.Create(&TestTask{ID: "task-lead-recent", LeadID: &recentLead.ID})
	db.Create(&TestActivity{ID: "act-lead-recent", LeadID: &recentLead.ID})
	db.Create(&TestVisitReport{ID: "vr-lead-recent", LeadID: &recentLead.ID})

	// Initialize and run the cleanup worker process
	worker := NewCrmCleanupWorker(db, 24*time.Hour)
	worker.cleanupSoftDeletedRecords()

	// 1. Verify Expired Deal is fully purged (even unscoped query returns nothing)
	var count int64
	db.Unscoped().Model(&TestDeal{}).Where("id = ?", expiredDeal.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired deal was not hard deleted")
	}

	// Verify child relations for expired deal are purged
	db.Model(&TestDealProductItem{}).Where("deal_id = ?", expiredDeal.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired deal product items were not deleted")
	}
	db.Model(&TestDealHistory{}).Where("deal_id = ?", expiredDeal.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired deal histories were not deleted")
	}
	db.Model(&TestTask{}).Where("deal_id = ?", expiredDeal.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired deal tasks were not deleted")
	}
	db.Model(&TestActivity{}).Where("deal_id = ?", expiredDeal.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired deal activities were not deleted")
	}
	// Verify visit report is unlinked (deal_id set to NULL), not deleted
	var vr TestVisitReport
	err := db.First(&vr, "id = ?", "vr-deal-expired").Error
	if err != nil {
		t.Errorf("visit report for expired deal was deleted instead of unlinked: %v", err)
	} else if vr.DealID != nil {
		t.Errorf("visit report deal_id was not set to NULL: %s", *vr.DealID)
	}

	// 2. Verify Recent and Active Deals remain
	db.Unscoped().Model(&TestDeal{}).Where("id = ?", recentDeal.ID).Count(&count)
	if count == 0 {
		t.Errorf("recent deal was incorrectly deleted")
	}
	db.Model(&TestDeal{}).Where("id = ?", activeDeal.ID).Count(&count)
	if count == 0 {
		t.Errorf("active deal was incorrectly deleted")
	}

	// Verify recent deal child relations remain
	db.Model(&TestDealProductItem{}).Where("deal_id = ?", recentDeal.ID).Count(&count)
	if count == 0 {
		t.Errorf("recent deal product items were incorrectly deleted")
	}

	// 3. Verify Expired Lead is fully purged
	db.Unscoped().Model(&TestLead{}).Where("id = ?", expiredLead.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired lead was not hard deleted")
	}

	// Verify child relations for expired lead are purged
	db.Model(&TestLeadProductItem{}).Where("lead_id = ?", expiredLead.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired lead product items were not deleted")
	}
	db.Model(&TestTask{}).Where("lead_id = ?", expiredLead.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired lead tasks were not deleted")
	}
	db.Model(&TestActivity{}).Where("lead_id = ?", expiredLead.ID).Count(&count)
	if count > 0 {
		t.Errorf("expired lead activities were not deleted")
	}
	// Verify visit report is unlinked (lead_id set to NULL), not deleted
	var vrLead TestVisitReport
	err = db.First(&vrLead, "id = ?", "vr-lead-expired").Error
	if err != nil {
		t.Errorf("visit report for expired lead was deleted instead of unlinked: %v", err)
	} else if vrLead.LeadID != nil {
		t.Errorf("visit report lead_id was not set to NULL: %s", *vrLead.LeadID)
	}

	// 4. Verify Recent and Active Leads remain
	db.Unscoped().Model(&TestLead{}).Where("id = ?", recentLead.ID).Count(&count)
	if count == 0 {
		t.Errorf("recent lead was incorrectly deleted")
	}
	db.Model(&TestLead{}).Where("id = ?", activeLead.ID).Count(&count)
	if count == 0 {
		t.Errorf("active lead was incorrectly deleted")
	}

	// Verify recent lead child relations remain
	db.Model(&TestLeadProductItem{}).Where("lead_id = ?", recentLead.ID).Count(&count)
	if count == 0 {
		t.Errorf("recent lead product items were incorrectly deleted")
	}
}
