package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/crm/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"gorm.io/gorm"
)

const (
	visitQueryByID            = "id = ?"
	visitQueryByVisitReportID = "visit_report_id = ?"
)

// VisitReportListParams defines filtering/sorting/pagination for visit report queries
type VisitReportListParams struct {
	Search     string
	SortBy     string
	SortDir    string
	Limit      int
	Offset     int
	Status     string
	CustomerID string
	EmployeeID string
	ContactID  string
	DealID     string
	LeadID     string
	Outcome    string
	DateFrom   string
	DateTo     string
}

// VisitReportRepository defines data access methods for visit reports
type VisitReportRepository interface {
	FindByID(ctx context.Context, id string) (*models.VisitReport, error)
	FindByCode(ctx context.Context, code string) (*models.VisitReport, error)
	List(ctx context.Context, params *VisitReportListParams) ([]models.VisitReport, int64, error)
	Create(ctx context.Context, report *models.VisitReport) error
	Update(ctx context.Context, report *models.VisitReport) error
	Delete(ctx context.Context, id string) error
	GetNextCode(ctx context.Context) (string, error)
	UpdateStatus(ctx context.Context, id string, status models.VisitReportStatus) error
	CheckIn(ctx context.Context, id string, location string, checkInAt time.Time) error
	CheckOut(ctx context.Context, id string, location string, checkOutAt time.Time) error
	CreateProgressHistory(ctx context.Context, history *models.VisitReportProgressHistory) error
	ListProgressHistory(ctx context.Context, visitReportID string, limit, offset int) ([]models.VisitReportProgressHistory, int64, error)
	ListInterestQuestions(ctx context.Context) ([]salesModels.SalesVisitInterestQuestion, error)
	UpdatePhotos(ctx context.Context, id string, photos string) error
}

type visitReportRepository struct {
	db *gorm.DB
}

// NewVisitReportRepository creates a new visit report repository
func NewVisitReportRepository(db *gorm.DB) VisitReportRepository {
	return &visitReportRepository{db: db}
}

func (r *visitReportRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *visitReportRepository) FindByID(ctx context.Context, id string) (*models.VisitReport, error) {
	var report models.VisitReport
	err := r.getDB(ctx).
		Preload("Employee").
		Preload("Customer").
		Preload("Contact").
		Preload("Deal").
		Preload("Lead").
		Preload("Village.District.City.Province").
		Preload("Details.Product").
		Preload("Details.Answers.Question").
		Preload("Details.Answers.Option").
		Where(visitQueryByID, id).
		First(&report).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func (r *visitReportRepository) FindByCode(ctx context.Context, code string) (*models.VisitReport, error) {
	var report models.VisitReport
	err := r.getDB(ctx).
		Preload("Employee").
		Preload("Customer").
		Preload("Contact").
		Where("code = ?", code).
		First(&report).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func (r *visitReportRepository) List(ctx context.Context, params *VisitReportListParams) ([]models.VisitReport, int64, error) {
	var reports []models.VisitReport
	var total int64

	query := r.getDB(ctx).Model(&models.VisitReport{})

	// Scope-based data filtering
	query = security.ApplyScopeFilter(query, ctx, security.HRDScopeQueryOptions())

	// Search filter
	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("code ILIKE ? OR contact_person ILIKE ? OR purpose ILIKE ? OR notes ILIKE ?",
			search, search, search, search)
	}

	// Status filter
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// Customer filter
	if params.CustomerID != "" {
		query = query.Where("customer_id = ?", params.CustomerID)
	}

	// Employee filter
	if params.EmployeeID != "" {
		query = query.Where("employee_id = ?", params.EmployeeID)
	}

	// Contact filter
	if params.ContactID != "" {
		query = query.Where("contact_id = ?", params.ContactID)
	}

	// Deal filter
	if params.DealID != "" {
		query = query.Where("deal_id = ?", params.DealID)
	}

	// Lead filter
	if params.LeadID != "" {
		query = query.Where("lead_id = ?", params.LeadID)
	}

	// Outcome filter
	if params.Outcome != "" {
		query = query.Where("outcome = ?", params.Outcome)
	}

	// Date range filter
	if params.DateFrom != "" {
		query = query.Where("visit_date >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("visit_date <= ?", params.DateTo)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "visit_date"
	}
	sortDir := params.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order(sortBy + " " + sortDir)

	// Pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	// Execute with preloads
	err := query.
		Preload("Employee").
		Preload("Customer").
		Preload("Contact").
		Find(&reports).Error
	if err != nil {
		return nil, 0, err
	}

	return reports, total, nil
}

func (r *visitReportRepository) Create(ctx context.Context, report *models.VisitReport) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		details := report.Details
		report.Details = nil

		if err := tx.Create(report).Error; err != nil {
			return err
		}

		// Create details with answers
		if len(details) > 0 {
			for i := range details {
				details[i].VisitReportID = report.ID
				answers := details[i].Answers
				details[i].Answers = nil
				if err := tx.Create(&details[i]).Error; err != nil {
					return err
				}
				// Create answers for this detail
				if len(answers) > 0 {
					for j := range answers {
						answers[j].VisitReportDetailID = details[i].ID
					}
					if err := tx.Create(&answers).Error; err != nil {
						return err
					}
				}
			}
		}

		// Create initial progress history
		initialHistory := models.VisitReportProgressHistory{
			VisitReportID: report.ID,
			FromStatus:    "",
			ToStatus:      report.Status,
			Notes:         "Visit report created",
			ChangedBy:     report.CreatedBy,
			CreatedAt:     apptime.Now(),
		}
		if err := tx.Create(&initialHistory).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *visitReportRepository) Update(ctx context.Context, report *models.VisitReport) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Details", "ProgressHistory").Save(report).Error; err != nil {
			return err
		}

		// Replace details
		if err := tx.Where(visitQueryByVisitReportID, report.ID).Delete(&models.VisitReportInterestAnswer{}).Error; err != nil {
			// Answers are nested under details, delete via detail IDs
		}

		// Delete existing detail answers first
		var detailIDs []string
		tx.Model(&models.VisitReportDetail{}).Where(visitQueryByVisitReportID, report.ID).Pluck("id", &detailIDs)
		if len(detailIDs) > 0 {
			tx.Where("visit_report_detail_id IN ?", detailIDs).Delete(&models.VisitReportInterestAnswer{})
		}

		// Delete existing details
		if err := tx.Where(visitQueryByVisitReportID, report.ID).Delete(&models.VisitReportDetail{}).Error; err != nil {
			return err
		}

		// Re-create details
		if len(report.Details) > 0 {
			for i := range report.Details {
				report.Details[i].VisitReportID = report.ID
				answers := report.Details[i].Answers
				report.Details[i].Answers = nil
				report.Details[i].CreatedAt = apptime.Now()
				report.Details[i].UpdatedAt = apptime.Now()
				if err := tx.Create(&report.Details[i]).Error; err != nil {
					return err
				}
				if len(answers) > 0 {
					for j := range answers {
						answers[j].VisitReportDetailID = report.Details[i].ID
					}
					if err := tx.Create(&answers).Error; err != nil {
						return err
					}
				}
			}
		}

		return nil
	})
}

func (r *visitReportRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete answers via detail IDs
		var detailIDs []string
		tx.Model(&models.VisitReportDetail{}).Where(visitQueryByVisitReportID, id).Pluck("id", &detailIDs)
		if len(detailIDs) > 0 {
			tx.Where("visit_report_detail_id IN ?", detailIDs).Delete(&models.VisitReportInterestAnswer{})
		}

		// Delete details
		if err := tx.Where(visitQueryByVisitReportID, id).Delete(&models.VisitReportDetail{}).Error; err != nil {
			return err
		}

		// Delete progress history
		if err := tx.Where(visitQueryByVisitReportID, id).Delete(&models.VisitReportProgressHistory{}).Error; err != nil {
			return err
		}

		// Soft delete the report
		return tx.Delete(&models.VisitReport{}, visitQueryByID, id).Error
	})
}

func (r *visitReportRepository) GetNextCode(ctx context.Context) (string, error) {
	now := r.getDB(ctx).NowFunc()
	prefix := fmt.Sprintf("VISIT-%s", now.Format("200601"))

	var count int64
	r.getDB(ctx).Model(&models.VisitReport{}).
		Where("code LIKE ?", prefix+"%").
		Count(&count)

	code := fmt.Sprintf("%s-%05d", prefix, count+1)
	return code, nil
}

func (r *visitReportRepository) UpdateStatus(ctx context.Context, id string, status models.VisitReportStatus) error {
	return r.getDB(ctx).Model(&models.VisitReport{}).
		Where(visitQueryByID, id).
		Update("status", status).Error
}

func (r *visitReportRepository) CheckIn(ctx context.Context, id string, location string, checkInAt time.Time) error {
	updates := map[string]interface{}{
		"check_in_at":       checkInAt,
		"check_in_location": location,
		"actual_time":       checkInAt,
	}
	return r.getDB(ctx).Model(&models.VisitReport{}).
		Where(visitQueryByID, id).
		Updates(updates).Error
}

func (r *visitReportRepository) CheckOut(ctx context.Context, id string, location string, checkOutAt time.Time) error {
	updates := map[string]interface{}{
		"check_out_at":       checkOutAt,
		"check_out_location": location,
	}
	return r.getDB(ctx).Model(&models.VisitReport{}).
		Where(visitQueryByID, id).
		Updates(updates).Error
}

func (r *visitReportRepository) CreateProgressHistory(ctx context.Context, history *models.VisitReportProgressHistory) error {
	return r.getDB(ctx).Create(history).Error
}

func (r *visitReportRepository) ListProgressHistory(ctx context.Context, visitReportID string, limit, offset int) ([]models.VisitReportProgressHistory, int64, error) {
	var history []models.VisitReportProgressHistory
	var total int64

	if err := r.getDB(ctx).Model(&models.VisitReportProgressHistory{}).
		Where(visitQueryByVisitReportID, visitReportID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.getDB(ctx).
		Where(visitQueryByVisitReportID, visitReportID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&history).Error
	if err != nil {
		return nil, 0, err
	}

	return history, total, nil
}

func (r *visitReportRepository) ListInterestQuestions(ctx context.Context) ([]salesModels.SalesVisitInterestQuestion, error) {
	var questions []salesModels.SalesVisitInterestQuestion
	err := r.getDB(ctx).
		Preload("Options").
		Where("is_active = ?", true).
		Order("sequence ASC").
		Find(&questions).Error
	if err != nil {
		return nil, err
	}
	return questions, nil
}

func (r *visitReportRepository) UpdatePhotos(ctx context.Context, id string, photos string) error {
	return r.getDB(ctx).Model(&models.VisitReport{}).
		Where(visitQueryByID, id).
		Update("photos", photos).Error
}
