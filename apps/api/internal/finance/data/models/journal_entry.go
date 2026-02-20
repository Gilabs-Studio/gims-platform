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

type JournalEntry struct {
	ID          string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	EntryDate   time.Time `gorm:"type:date;not null;index" json:"entry_date"`
	Description string    `gorm:"type:text" json:"description"`

	ReferenceType *string `gorm:"type:varchar(50);index" json:"reference_type"`
	ReferenceID   *string `gorm:"type:uuid;index" json:"reference_id"`

	Status   JournalStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`
	PostedAt *time.Time    `json:"posted_at"`
	PostedBy *string       `gorm:"type:uuid" json:"posted_by"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Lines []JournalLine `gorm:"foreignKey:JournalEntryID;constraint:OnDelete:CASCADE" json:"lines,omitempty"`
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
