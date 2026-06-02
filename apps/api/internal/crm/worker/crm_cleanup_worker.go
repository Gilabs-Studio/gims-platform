package worker

import (
	"context"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"gorm.io/gorm"
)

type CrmCleanupWorker struct {
	db       *gorm.DB
	ticker   *time.Ticker
	stopChan chan struct{}
}

func NewCrmCleanupWorker(db *gorm.DB, interval time.Duration) *CrmCleanupWorker {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	return &CrmCleanupWorker{
		db:       db,
		ticker:   time.NewTicker(interval),
		stopChan: make(chan struct{}),
	}
}

func (w *CrmCleanupWorker) Start() {
	log.Println("CRM cleanup worker started")
	go func() {
		// Run once on startup
		w.cleanupSoftDeletedRecords()
		for {
			select {
			case <-w.ticker.C:
				w.cleanupSoftDeletedRecords()
			case <-w.stopChan:
				log.Println("CRM cleanup worker stopped")
				return
			}
		}
	}()
}

func (w *CrmCleanupWorker) Stop() {
	w.ticker.Stop()
	close(w.stopChan)
}

func (w *CrmCleanupWorker) cleanupSoftDeletedRecords() {
	ctx := context.Background()
	cutoff := apptime.Now().AddDate(0, 0, -30)

	log.Printf("CRM cleanup worker: starting cleanup for records soft-deleted before %s", cutoff.Format("2006-01-02 15:04:05"))

	// 1. Get IDs of deals to hard-delete
	var dealIDs []string
	if err := w.db.WithContext(ctx).
		Table("crm_deals").
		Where("deleted_at IS NOT NULL AND deleted_at <= ?", cutoff).
		Pluck("id", &dealIDs).Error; err != nil {
		log.Printf("CRM cleanup worker: failed to query expired deals: %v", err)
	}

	// 2. Get IDs of leads to hard-delete
	var leadIDs []string
	if err := w.db.WithContext(ctx).
		Table("crm_leads").
		Where("deleted_at IS NOT NULL AND deleted_at <= ?", cutoff).
		Pluck("id", &leadIDs).Error; err != nil {
		log.Printf("CRM cleanup worker: failed to query expired leads: %v", err)
	}

	if len(dealIDs) == 0 && len(leadIDs) == 0 {
		log.Println("CRM cleanup worker: no expired leads or deals to clean up")
		return
	}

	err := w.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// --- PURGE DEALS ---
		if len(dealIDs) > 0 {
			log.Printf("CRM cleanup worker: hard-deleting %d deals: %v", len(dealIDs), dealIDs)

			// Delete child product items
			if err := tx.Exec("DELETE FROM crm_deal_product_items WHERE deal_id IN ?", dealIDs).Error; err != nil {
				return err
			}

			// Delete stage histories
			if err := tx.Exec("DELETE FROM crm_deal_histories WHERE deal_id IN ?", dealIDs).Error; err != nil {
				return err
			}

			// Delete tasks
			if err := tx.Exec("DELETE FROM crm_tasks WHERE deal_id IN ?", dealIDs).Error; err != nil {
				return err
			}

			// Delete activities
			if err := tx.Exec("DELETE FROM crm_activities WHERE deal_id IN ?", dealIDs).Error; err != nil {
				return err
			}

			// Unlink visit reports
			if err := tx.Exec("UPDATE crm_visit_reports SET deal_id = NULL WHERE deal_id IN ?", dealIDs).Error; err != nil {
				return err
			}

			// Delete deal records
			if err := tx.Exec("DELETE FROM crm_deals WHERE id IN ?", dealIDs).Error; err != nil {
				return err
			}
		}

		// --- PURGE LEADS ---
		if len(leadIDs) > 0 {
			log.Printf("CRM cleanup worker: hard-deleting %d leads: %v", len(leadIDs), leadIDs)

			// Delete child product items
			if err := tx.Exec("DELETE FROM crm_lead_product_items WHERE lead_id IN ?", leadIDs).Error; err != nil {
				return err
			}

			// Delete tasks
			if err := tx.Exec("DELETE FROM crm_tasks WHERE lead_id IN ?", leadIDs).Error; err != nil {
				return err
			}

			// Delete activities
			if err := tx.Exec("DELETE FROM crm_activities WHERE lead_id IN ?", leadIDs).Error; err != nil {
				return err
			}

			// Unlink visit reports
			if err := tx.Exec("UPDATE crm_visit_reports SET lead_id = NULL WHERE lead_id IN ?", leadIDs).Error; err != nil {
				return err
			}

			// Delete lead records
			if err := tx.Exec("DELETE FROM crm_leads WHERE id IN ?", leadIDs).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		log.Printf("CRM cleanup worker: failed to execute database transaction for CRM purge: %v", err)
	} else {
		log.Println("CRM cleanup worker: successfully finished purging expired CRM records")
	}
}
