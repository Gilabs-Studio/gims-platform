package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UpCountryCostStatus string

const (
	UpCountryCostStatusDraft    UpCountryCostStatus = "draft"
	UpCountryCostStatusApproved UpCountryCostStatus = "approved"
)

type UpCountryCost struct {
	ID        string              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code      string              `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Purpose   string              `gorm:"type:varchar(255)" json:"purpose"`
	Location  string              `gorm:"type:varchar(255)" json:"location"`
	StartDate time.Time           `gorm:"type:date;not null" json:"start_date"`
	EndDate   time.Time           `gorm:"type:date;not null" json:"end_date"`
	Status    UpCountryCostStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	Notes     string              `gorm:"type:text" json:"notes"`

	Employees []UpCountryCostEmployee `gorm:"foreignKey:UpCountryCostID;constraint:OnDelete:CASCADE" json:"employees,omitempty"`
	Items     []UpCountryCostItem     `gorm:"foreignKey:UpCountryCostID;constraint:OnDelete:CASCADE" json:"items,omitempty"`

	ApprovedAt *time.Time `json:"approved_at"`
	ApprovedBy *string    `gorm:"type:uuid" json:"approved_by"`

	CreatedBy *string        `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UpCountryCost) TableName() string {
	return "up_country_costs"
}

func (u *UpCountryCost) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

type UpCountryCostEmployee struct {
	ID              string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UpCountryCostID string `gorm:"type:uuid;not null;index" json:"up_country_cost_id"`
	EmployeeID      string `gorm:"type:uuid;not null;index" json:"employee_id"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UpCountryCostEmployee) TableName() string {
	return "up_country_cost_employees"
}

func (u *UpCountryCostEmployee) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

type CostType string

const (
	CostTypeTransport     CostType = "transport"
	CostTypeAccommodation CostType = "accommodation"
	CostTypeMeal          CostType = "meal"
	CostTypeFuel          CostType = "fuel"
	CostTypeOther         CostType = "other"
)

type UpCountryCostItem struct {
	ID              string   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UpCountryCostID string   `gorm:"type:uuid;not null;index" json:"up_country_cost_id"`
	CostType        CostType `gorm:"type:varchar(50);not null" json:"cost_type"`
	Description     string   `gorm:"type:text" json:"description"`
	Amount          float64  `gorm:"type:numeric(18,2);default:0" json:"amount"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UpCountryCostItem) TableName() string {
	return "up_country_cost_items"
}

func (u *UpCountryCostItem) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}
