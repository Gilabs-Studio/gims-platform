package models

import (
	"time"

	geographic "github.com/gilabs/crm-healthcare/api/internal/geographic/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SupplierStatus represents the approval status of a supplier
type SupplierStatus string

const (
	SupplierStatusDraft    SupplierStatus = "draft"
	SupplierStatusPending  SupplierStatus = "pending"
	SupplierStatusApproved SupplierStatus = "approved"
	SupplierStatusRejected SupplierStatus = "rejected"
)

// Supplier represents a supplier/vendor entity with approval workflow
type Supplier struct {
	ID             string          `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code           string          `gorm:"type:varchar(50);uniqueIndex" json:"code"`
	Name           string          `gorm:"type:varchar(200);not null;index" json:"name"`
	SupplierTypeID *string         `gorm:"type:uuid;index" json:"supplier_type_id"`
	SupplierType   *SupplierType   `gorm:"foreignKey:SupplierTypeID" json:"supplier_type,omitempty"`
	Address        string          `gorm:"type:text" json:"address"`
	VillageID      *string         `gorm:"type:uuid;index" json:"village_id"`
	Village        *geographic.Village `gorm:"foreignKey:VillageID" json:"village,omitempty"`
	Email          string          `gorm:"type:varchar(100)" json:"email"`
	Website        string          `gorm:"type:varchar(200)" json:"website"`
	NPWP           string          `gorm:"type:varchar(30)" json:"npwp"`
	ContactPerson  string          `gorm:"type:varchar(100)" json:"contact_person"`
	Notes          string          `gorm:"type:text" json:"notes"`
	// Location coordinates
	Latitude       *float64        `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude      *float64        `gorm:"type:decimal(11,8)" json:"longitude"`
	// Approval workflow
	Status     SupplierStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	IsApproved bool           `gorm:"default:false;index" json:"is_approved"`
	CreatedBy  *string        `gorm:"type:uuid" json:"created_by"`
	ApprovedBy *string        `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time     `json:"approved_at"`
	IsActive   bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	// Nested relations
	PhoneNumbers []SupplierPhoneNumber `gorm:"foreignKey:SupplierID" json:"phone_numbers,omitempty"`
	BankAccounts []SupplierBank        `gorm:"foreignKey:SupplierID" json:"bank_accounts,omitempty"`
}

// TableName specifies the table name for Supplier
func (Supplier) TableName() string {
	return "suppliers"
}

// BeforeCreate hook to generate UUID
func (s *Supplier) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
