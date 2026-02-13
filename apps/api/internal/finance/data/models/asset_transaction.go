package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetTransactionType string

const (
	AssetTransactionTypeAcquire    AssetTransactionType = "acquire"
	AssetTransactionTypeUpdate     AssetTransactionType = "update"
	AssetTransactionTypeDepreciate AssetTransactionType = "depreciate"
	AssetTransactionTypeTransfer   AssetTransactionType = "transfer"
	AssetTransactionTypeDispose    AssetTransactionType = "dispose"
)

type AssetTransaction struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	AssetID string `gorm:"type:uuid;not null;index" json:"asset_id"`
	Asset   *Asset `gorm:"foreignKey:AssetID" json:"asset,omitempty"`

	Type            AssetTransactionType `gorm:"type:varchar(20);not null;index" json:"type"`
	TransactionDate time.Time            `gorm:"type:date;not null;index" json:"transaction_date"`
	Description     string               `gorm:"type:text" json:"description"`

	ReferenceType *string `gorm:"type:varchar(50)" json:"reference_type"`
	ReferenceID   *string `gorm:"type:uuid" json:"reference_id"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

func (AssetTransaction) TableName() string {
	return "asset_transactions"
}

func (t *AssetTransaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}
