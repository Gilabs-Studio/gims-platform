package worker

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/domain/usecase"
)

// AutoAbsentWorker runs daily to create ABSENT/LEAVE records for employees
// who didn't clock in on the previous working day.
type AutoAbsentWorker struct {
	attendanceUC usecase.AttendanceRecordUsecase
	ticker       *time.Ticker
	stopChan     chan struct{}
	stopOnce     sync.Once
}

// NewAutoAbsentWorker creates a new AutoAbsentWorker
func NewAutoAbsentWorker(
	attendanceUC usecase.AttendanceRecordUsecase,
	interval time.Duration,
) *AutoAbsentWorker {
	return &AutoAbsentWorker{
		attendanceUC: attendanceUC,
		ticker:       time.NewTicker(interval),
		stopChan:     make(chan struct{}),
	}
}

// Start starts the auto-absent worker
func (w *AutoAbsentWorker) Start() {
	log.Println("Auto-absent worker started (runs daily)")

	// Run immediately on start for yesterday's date
	go w.processAutoAbsent()

	go func() {
		for {
			select {
			case <-w.ticker.C:
				w.processAutoAbsent()
			case <-w.stopChan:
				w.ticker.Stop()
				log.Println("Auto-absent worker stopped")
				return
			}
		}
	}()
}

// Stop stops the auto-absent worker
func (w *AutoAbsentWorker) Stop() {
	w.stopOnce.Do(func() {
		close(w.stopChan)
	})
}

// processAutoAbsent processes auto-absent for yesterday's date
func (w *AutoAbsentWorker) processAutoAbsent() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Process yesterday
	yesterday := time.Now().AddDate(0, 0, -1)

	log.Printf("Auto-absent: processing date %s", yesterday.Format("2006-01-02"))

	result, err := w.attendanceUC.ProcessAutoAbsent(ctx, yesterday)
	if err != nil {
		log.Printf("Auto-absent error: %v", err)
		return
	}

	if result.HolidaySkipped {
		log.Printf("Auto-absent: %s is a holiday, skipped", result.Date)
		return
	}

	log.Printf("Auto-absent completed for %s: %d employees, %d absent, %d leave, %d skipped, %d errors",
		result.Date, result.TotalEmployees, result.AbsentCreated, result.LeaveCreated, result.Skipped, result.Errors)
}
