package models

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Lead represents a sales prospect with BANT qualification scoring
type Lead struct {
	ID             string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code           string  `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	FirstName      string  `gorm:"type:varchar(100);not null;index" json:"first_name"`
	LastName       string  `gorm:"type:varchar(100);index" json:"last_name"`
	CompanyName    string  `gorm:"type:varchar(200);index" json:"company_name"`
	Email          string  `gorm:"type:varchar(100)" json:"email"`
	Phone          string  `gorm:"type:varchar(30)" json:"phone"`
	JobTitle       string  `gorm:"type:varchar(100)" json:"job_title"`
	Address        string  `gorm:"type:text" json:"address"`
	City           string  `gorm:"type:varchar(100)" json:"city"`
	Province       string  `gorm:"type:varchar(100)" json:"province"`

	// Classification
	LeadSourceID *string     `gorm:"type:uuid;index" json:"lead_source_id"`
	LeadSource   *LeadSource `gorm:"foreignKey:LeadSourceID" json:"lead_source,omitempty"`
	LeadStatusID *string     `gorm:"type:uuid;index" json:"lead_status_id"`
	LeadStatus   *LeadStatus `gorm:"foreignKey:LeadStatusID" json:"lead_status,omitempty"`

	// Scoring
	LeadScore      int     `gorm:"type:int;default:0" json:"lead_score"`
	Probability    int     `gorm:"type:int;default:0" json:"probability"`
	EstimatedValue float64 `gorm:"type:decimal(15,2);default:0" json:"estimated_value"`

	// BANT Qualification
	BudgetConfirmed bool    `gorm:"default:false" json:"budget_confirmed"`
	BudgetAmount    float64 `gorm:"type:decimal(15,2);default:0" json:"budget_amount"`
	AuthConfirmed   bool    `gorm:"default:false" json:"auth_confirmed"`
	AuthPerson      string  `gorm:"type:varchar(200)" json:"auth_person"`
	NeedConfirmed   bool    `gorm:"default:false" json:"need_confirmed"`
	NeedDescription string  `gorm:"type:text" json:"need_description"`
	TimeConfirmed   bool    `gorm:"default:false" json:"time_confirmed"`
	TimeExpected    *time.Time `gorm:"type:date" json:"time_expected"`

	// Assignment
	AssignedTo       *string             `gorm:"type:uuid;index" json:"assigned_to"`
	AssignedEmployee *orgModels.Employee  `gorm:"foreignKey:AssignedTo" json:"assigned_employee,omitempty"`

	// Conversion (populated after conversion)
	CustomerID  *string                   `gorm:"type:uuid;index" json:"customer_id"`
	Customer    *customerModels.Customer  `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	ContactID   *string                   `gorm:"type:uuid;index" json:"contact_id"`
	Contact     *Contact                  `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	DealID      *string                   `gorm:"type:uuid;index" json:"deal_id"`
	ConvertedAt *time.Time                `json:"converted_at"`
	ConvertedBy *string                   `gorm:"type:uuid" json:"converted_by"`

	// Metadata
	Notes     string         `gorm:"type:text" json:"notes"`
	CreatedBy *string        `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Lead) TableName() string {
	return "crm_leads"
}

func (l *Lead) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	if l.Code == "" {
		l.Code = generateLeadCode(tx)
	}
	return nil
}

// generateLeadCode creates auto-generated code: LEAD-YYYYMM-XXXXX
func generateLeadCode(tx *gorm.DB) string {
	now := apptime.Now()
	prefix := fmt.Sprintf("LEAD-%s", now.Format("200601"))

	var count int64
	tx.Model(&Lead{}).Where("code LIKE ?", prefix+"%").Count(&count)

	return fmt.Sprintf("%s-%05d", prefix, count+1)
}

// CalculateLeadScore computes score from BANT fields + status score
func (l *Lead) CalculateLeadScore() int {
	score := 0

	if l.LeadStatus != nil {
		score += l.LeadStatus.Score
	}

	if l.BudgetConfirmed {
		score += 15
	}
	if l.AuthConfirmed {
		score += 15
	}
	if l.NeedConfirmed {
		score += 15
	}
	if l.TimeConfirmed {
		score += 15
	}

	if score > 100 {
		score = 100
	}

	return score
}

// IsConverted returns true if lead has been converted
func (l *Lead) IsConverted() bool {
	return l.ConvertedAt != nil
}
