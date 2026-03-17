package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JournalStatus string

const (
	JournalStatusDraft  JournalStatus = "draft"
	JournalStatusPosted JournalStatus = "posted"
)

type ReferenceType string

const (
	RefSO                ReferenceType = "SO"                     // Sales Order
	RefPO                ReferenceType = "PO"                     // Purchase Order
	RefDO                ReferenceType = "DO"                     // Delivery Order
	RefGR                ReferenceType = "GR"                     // Goods Receipt
	RefStockOpname       ReferenceType = "STOCK_OP"               // Stock Opname
	RefAdjustment        ReferenceType = "ADJUSTMENT"             // Adjustment
	RefNonTradePayable   ReferenceType = "NTP"                    // Non-Trade Payable
	RefPayment           ReferenceType = "PAYMENT"                // Payment
	RefAssetTransaction  ReferenceType = "ASSET_TXN"              // Asset Transaction
	RefAssetDepreciation ReferenceType = "ASSET_DEP"              // Asset Depreciation
	RefCashBank          ReferenceType = "CASH_BANK"              // Cash Bank
	RefUpCountryCost     ReferenceType = "UP_COUNTRY"             // Up Country Cost
	RefInventoryVal      ReferenceType = "INVENTORY_VALUATION"    // Inventory Valuation
	RefCurrencyReval     ReferenceType = "CURRENCY_REVALUATION"   // Currency Revaluation
	RefCostAdjustment    ReferenceType = "COST_ADJUSTMENT"        // Cost Adjustment
	RefDepreciation      ReferenceType = "DEPRECIATION_VALUATION" // Depreciation Valuation
)

// JournalSource distinguishes operational journals from valuation-generated journals.
type JournalSource string

const (
	JournalSourceOperational JournalSource = "OPERATIONAL"
	JournalSourceValuation   JournalSource = "VALUATION"
)

type JournalEntry struct {
	ID          string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	EntryDate   time.Time `gorm:"type:date;not null;index" json:"entry_date"`
	Description string    `gorm:"type:text" json:"description"`

	ReferenceType *string `gorm:"type:varchar(50);index" json:"reference_type"`
	ReferenceID   *string `gorm:"type:varchar(255);index" json:"reference_id"`

	Status   JournalStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	PostedAt *time.Time    `json:"posted_at"`
	PostedBy *string       `gorm:"type:uuid" json:"posted_by"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`

	IsSystemGenerated bool          `gorm:"default:false;index" json:"is_system_generated"`
	IsValuation       bool          `gorm:"default:false;index" json:"is_valuation"`
	Source            JournalSource `gorm:"type:varchar(20);default:'OPERATIONAL';index" json:"source"`
	ValuationRunID    *string       `gorm:"type:uuid;index" json:"valuation_run_id,omitempty"`
	SourceDocumentURL *string       `gorm:"type:varchar(500)" json:"source_document_url,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Lines       []JournalLine       `gorm:"foreignKey:JournalEntryID;constraint:OnDelete:CASCADE" json:"lines,omitempty"`
	Attachments []JournalAttachment `gorm:"foreignKey:JournalEntryID;constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
}

func (JournalEntry) TableName() string {
	return "journal_entries"
}

func (je *JournalEntry) BeforeCreate(tx *gorm.DB) error {
	if je.ID == "" {
		je.ID = uuid.New().String()
	}
	return nil
}
