package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PlanFeatureList is a JSON-serialisable list of feature descriptions.
type PlanFeatureList []string

func (f PlanFeatureList) Value() (driver.Value, error) {
	return json.Marshal(f)
}

func (f *PlanFeatureList) Scan(value interface{}) error {
	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, f)
	case string:
		return json.Unmarshal([]byte(v), f)
	case nil:
		*f = nil
		return nil
	}
	return fmt.Errorf("unsupported type: %T", value)
}

// BillingType classifies a plan as user-based or flat-rate.
type BillingType string

const (
	BillingTypePerUser  BillingType = "per_user"
	BillingTypeFlat     BillingType = "flat"
)

// SubscriptionPlanConfig stores pricing and metadata for each plan.
// Replaces the hardcoded planTotalPriceIDR map in auth_usecase.go.
type SubscriptionPlanConfig struct {
	ID              string          `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Slug            string          `gorm:"type:varchar(64);uniqueIndex;not null"           json:"slug"` // e.g. "growth_suite"
	Name            string          `gorm:"type:varchar(128);not null"                      json:"name"`
	Category        string          `gorm:"type:varchar(64);not null;index"                 json:"category"` // pos, erp, crm, hr, bundle
	Description     string          `gorm:"type:text"                                       json:"description,omitempty"`
	BillingType     BillingType     `gorm:"type:varchar(20);not null;default:'per_user'"                    json:"billing_type"`
	PriceMonthlyIDR int64           `gorm:"column:price_monthly_idr;type:bigint;not null;default:0"         json:"price_monthly_idr"` // per-user or flat
	PriceYearlyIDR  int64           `gorm:"column:price_yearly_idr;type:bigint;not null;default:0"          json:"price_yearly_idr"`  // per-user or flat
	MinUsers        int             `gorm:"type:int;not null;default:1"                     json:"min_users"`
	MaxUsers        int             `gorm:"type:int;not null;default:500"                   json:"max_users"`
	IsActive        bool            `gorm:"type:boolean;not null;default:true;index"        json:"is_active"`
	IsHighlighted   bool            `gorm:"type:boolean;not null;default:false"             json:"is_highlighted"` // show as "recommended"
	SortOrder       int             `gorm:"type:int;not null;default:0"                     json:"sort_order"`
	Features        PlanFeatureList `gorm:"type:jsonb;not null;default:'[]'"                json:"features"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `gorm:"index"                                           json:"-"`

	// Associations
	Entitlements []PlanModuleEntitlement `gorm:"foreignKey:PlanSlug;references:Slug" json:"entitlements,omitempty"`
}

func (SubscriptionPlanConfig) TableName() string { return "subscription_plan_configs" }

func (s *SubscriptionPlanConfig) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// TotalPriceIDR computes the invoice amount for the selected billing period and user count.
// For flat-rate plans userCount is ignored.
func (s *SubscriptionPlanConfig) TotalPriceIDR(billingPeriod string, userCount int) int64 {
	if userCount < 1 {
		userCount = 1
	}
	switch s.BillingType {
	case BillingTypeFlat:
		if billingPeriod == "yearly" {
			return s.PriceYearlyIDR
		}
		return s.PriceMonthlyIDR
	default: // per_user
		if billingPeriod == "yearly" {
			return s.PriceYearlyIDR * int64(userCount)
		}
		return s.PriceMonthlyIDR * int64(userCount)
	}
}

// PlanModuleEntitlement maps a plan slug to a module slug that it grants access to.
// A plan can have many entitlements; the entitlement guard reads this table.
type PlanModuleEntitlement struct {
	ID         string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PlanSlug   string    `gorm:"type:varchar(64);not null;index:idx_plan_module,unique" json:"plan_slug"`
	ModuleSlug string    `gorm:"type:varchar(64);not null;index:idx_plan_module,unique" json:"module_slug"` // e.g. "pos", "erp", "crm", "hrd"
	IsEnabled  bool      `gorm:"type:boolean;not null;default:true"              json:"is_enabled"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (PlanModuleEntitlement) TableName() string { return "plan_module_entitlements" }

func (e *PlanModuleEntitlement) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}
