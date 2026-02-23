package models

import (
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CustomerStatus represents the approval status of a customer
type CustomerStatus string

const (
	CustomerStatusDraft    CustomerStatus = "draft"
	CustomerStatusPending  CustomerStatus = "pending"
	CustomerStatusApproved CustomerStatus = "approved"
	CustomerStatusRejected CustomerStatus = "rejected"
)

// Customer represents a customer entity with approval workflow
type Customer struct {
	ID             string              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code           string              `gorm:"type:varchar(50);uniqueIndex" json:"code"`
	Name           string              `gorm:"type:varchar(200);not null;index" json:"name"`
	CustomerTypeID *string             `gorm:"type:uuid;index" json:"customer_type_id"`
	CustomerType   *CustomerType       `gorm:"foreignKey:CustomerTypeID" json:"customer_type,omitempty"`
	Address        string              `gorm:"type:text" json:"address"`
	VillageID      *string             `gorm:"type:uuid;index" json:"village_id"`
	Village        *geographic.Village `gorm:"foreignKey:VillageID" json:"village,omitempty"`
	Email          string              `gorm:"type:varchar(100)" json:"email"`
	Website        string              `gorm:"type:varchar(200)" json:"website"`
	NPWP           string              `gorm:"type:varchar(30)" json:"npwp"`
	ContactPerson  string              `gorm:"type:varchar(100)" json:"contact_person"`
	Notes          string              `gorm:"type:text" json:"notes"`
	// Location coordinates for map display
	Latitude  *float64 `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude *float64 `gorm:"type:decimal(11,8)" json:"longitude"`
	// Sales defaults — auto-filled to sales documents when this customer is selected
	DefaultBusinessTypeID  *string                    `gorm:"type:uuid;index" json:"default_business_type_id"`
	DefaultBusinessType    *orgModels.BusinessType    `gorm:"foreignKey:DefaultBusinessTypeID" json:"default_business_type,omitempty"`
	DefaultAreaID          *string                    `gorm:"type:uuid;index" json:"default_area_id"`
	DefaultArea            *orgModels.Area            `gorm:"foreignKey:DefaultAreaID" json:"default_area,omitempty"`
	DefaultSalesRepID      *string                    `gorm:"type:uuid;index" json:"default_sales_rep_id"`
	DefaultSalesRep        *orgModels.Employee        `gorm:"foreignKey:DefaultSalesRepID" json:"default_sales_rep,omitempty"`
	DefaultPaymentTermsID  *string                    `gorm:"type:uuid;index" json:"default_payment_terms_id"`
	DefaultPaymentTerms    *coreModels.PaymentTerms   `gorm:"foreignKey:DefaultPaymentTermsID" json:"default_payment_terms,omitempty"`
	DefaultTaxRate         *float64                   `gorm:"type:decimal(5,2)" json:"default_tax_rate"`

	// Approval workflow
	Status     CustomerStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	IsApproved bool           `gorm:"default:false;index" json:"is_approved"`
	CreatedBy  *string        `gorm:"type:uuid" json:"created_by"`
	ApprovedBy *string        `gorm:"type:uuid" json:"approved_by"`
	ApprovedAt *time.Time     `json:"approved_at"`
	IsActive   bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	// Nested relations
	PhoneNumbers []CustomerPhoneNumber `gorm:"foreignKey:CustomerID" json:"phone_numbers,omitempty"`
	BankAccounts []CustomerBank        `gorm:"foreignKey:CustomerID" json:"bank_accounts,omitempty"`
}

// TableName specifies the table name for Customer
func (Customer) TableName() string {
	return "customers"
}

// BeforeCreate hook to generate UUID
func (c *Customer) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
