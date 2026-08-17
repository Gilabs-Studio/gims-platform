package migrations

import (
	"gorm.io/gorm"
)

// RemoveRecruitmentPriorityColumn removes the priority column from recruitment_requests table
func RemoveRecruitmentPriorityColumn(db *gorm.DB) error {
	// Check if column exists first
	if db.Migrator().HasColumn(&RecruitmentRequestMigration{}, "priority") {
		if err := db.Migrator().DropColumn(&RecruitmentRequestMigration{}, "priority"); err != nil {
			return err
		}
	}
	return nil
}

// RecruitmentRequestMigration is a temporary struct for migration purposes only
type RecruitmentRequestMigration struct {
	ID       string `gorm:"type:uuid;primaryKey"`
	Priority string `gorm:"type:varchar(20)"`
}

func (RecruitmentRequestMigration) TableName() string {
	return "recruitment_requests"
}
