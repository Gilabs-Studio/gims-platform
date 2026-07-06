package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type POSSettlementPayoutStatus string

const (
	POSSettlementPayoutStatusPending   POSSettlementPayoutStatus = "PENDING"
	POSSettlementPayoutStatusAccepted  POSSettlementPayoutStatus = "ACCEPTED"
	POSSettlementPayoutStatusRequested POSSettlementPayoutStatus = "REQUESTED"
	POSSettlementPayoutStatusSucceeded POSSettlementPayoutStatus = "SUCCEEDED"
	POSSettlementPayoutStatusFailed    POSSettlementPayoutStatus = "FAILED"
	POSSettlementPayoutStatusCancelled POSSettlementPayoutStatus = "CANCELLED"
	POSSettlementPayoutStatusReversed  POSSettlementPayoutStatus = "REVERSED"
)

// POSSettlementPayout tracks tenant-level money-out requests to prevent
// repeated payout against the same collected POS balance.
type POSSettlementPayout struct {
	ID                   string                    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	TenantID             string                    `gorm:"column:tenant_id;type:uuid;not null;index;uniqueIndex:idx_pos_settlement_payouts_tenant_idempotency" json:"tenant_id"`
	ReferenceID          string                    `gorm:"type:varchar(255);not null;uniqueIndex" json:"reference_id"`
	IdempotencyKey       string                    `gorm:"type:varchar(100);not null;uniqueIndex:idx_pos_settlement_payouts_tenant_idempotency" json:"idempotency_key"`
	XenditPayoutID       *string                   `gorm:"type:varchar(100);index" json:"xendit_payout_id,omitempty"`
	Status               POSSettlementPayoutStatus `gorm:"type:varchar(20);not null;default:'PENDING';index" json:"status"`
	Amount               float64                   `gorm:"type:decimal(15,2);not null;default:0" json:"amount"`
	Fee                  float64                   `gorm:"type:decimal(15,2);not null;default:0" json:"fee"`
	Vat                  float64                   `gorm:"type:decimal(15,2);not null;default:0" json:"vat"`
	Currency             string                    `gorm:"type:varchar(3);not null;default:'IDR'" json:"currency"`
	ChannelCode          string                    `gorm:"type:varchar(50);not null" json:"channel_code"`
	AccountNumberMasked  string                    `gorm:"type:varchar(100);not null" json:"account_number_masked"`
	AccountHolderName    string                    `gorm:"type:varchar(100);not null" json:"account_holder_name"`
	Description          *string                   `gorm:"type:varchar(100)" json:"description,omitempty"`
	FailureCode          *string                   `gorm:"type:varchar(100)" json:"failure_code,omitempty"`
	FailureReason        *string                   `gorm:"type:text" json:"failure_reason,omitempty"`
	EstimatedArrivalTime *time.Time                `json:"estimated_arrival_time,omitempty"`
	RequestedBy          string                    `gorm:"type:uuid;not null;index" json:"requested_by"`
	CreatedAt            time.Time                 `json:"created_at"`
	UpdatedAt            time.Time                 `json:"updated_at"`
}

func (POSSettlementPayout) TableName() string {
	return "pos_settlement_payouts"
}

func (p *POSSettlementPayout) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
