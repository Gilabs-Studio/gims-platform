package repositories

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm"
)

type employeeEvaluationRepositoryImpl struct {
	db *gorm.DB
}

// NewEmployeeEvaluationRepository creates a new instance of EmployeeEvaluationRepository
func NewEmployeeEvaluationRepository(db *gorm.DB) EmployeeEvaluationRepository {
	return &employeeEvaluationRepositoryImpl{db: db}
}

func (r *employeeEvaluationRepositoryImpl) FindAll(ctx context.Context, page, perPage int, search string, employeeID, evaluationGroupID, status, evaluationType string) ([]models.EmployeeEvaluation, int64, error) {
	var evaluations []models.EmployeeEvaluation
	var total int64

	query := r.db.WithContext(ctx).Model(&models.EmployeeEvaluation{})

	// Apply search filter on notes (prefix search for GIN index)
	if search != "" {
		searchPattern := search + "%"
		query = query.Where("notes ILIKE ?", searchPattern)
	}

	// Filter by employee_id
	if employeeID != "" {
		query = query.Where("employee_id = ?", employeeID)
	}

	// Filter by evaluation_group_id
	if evaluationGroupID != "" {
		query = query.Where("evaluation_group_id = ?", evaluationGroupID)
	}

	// Filter by status
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by evaluation_type
	if evaluationType != "" {
		query = query.Where("evaluation_type = ?", evaluationType)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count employee evaluations: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * perPage
	query = query.Offset(offset).Limit(perPage)

	// Order by created_at DESC (newest first)
	query = query.Order("created_at DESC")

	if err := query.Find(&evaluations).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to find employee evaluations: %w", err)
	}

	return evaluations, total, nil
}

func (r *employeeEvaluationRepositoryImpl) FindByID(ctx context.Context, id string) (*models.EmployeeEvaluation, error) {
	var evaluation models.EmployeeEvaluation
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&evaluation).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find employee evaluation by ID: %w", err)
	}
	return &evaluation, nil
}

func (r *employeeEvaluationRepositoryImpl) FindByIDWithDetails(ctx context.Context, id string) (*models.EmployeeEvaluation, error) {
	var evaluation models.EmployeeEvaluation
	if err := r.db.WithContext(ctx).
		Preload("EvaluationGroup").
		Preload("CriteriaScores").
		Where("id = ?", id).
		First(&evaluation).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find employee evaluation with details: %w", err)
	}
	return &evaluation, nil
}

func (r *employeeEvaluationRepositoryImpl) Create(ctx context.Context, evaluation *models.EmployeeEvaluation) error {
	if err := r.db.WithContext(ctx).Create(evaluation).Error; err != nil {
		return fmt.Errorf("failed to create employee evaluation: %w", err)
	}
	return nil
}

func (r *employeeEvaluationRepositoryImpl) Update(ctx context.Context, evaluation *models.EmployeeEvaluation) error {
	if err := r.db.WithContext(ctx).Save(evaluation).Error; err != nil {
		return fmt.Errorf("failed to update employee evaluation: %w", err)
	}
	return nil
}

func (r *employeeEvaluationRepositoryImpl) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.EmployeeEvaluation{}).Error; err != nil {
		return fmt.Errorf("failed to delete employee evaluation: %w", err)
	}
	return nil
}

func (r *employeeEvaluationRepositoryImpl) SaveCriteriaScores(ctx context.Context, evaluationID string, scores []models.EmployeeEvaluationCriteria) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete existing scores for this evaluation
		if err := tx.Where("employee_evaluation_id = ?", evaluationID).
			Delete(&models.EmployeeEvaluationCriteria{}).Error; err != nil {
			return fmt.Errorf("failed to delete existing criteria scores: %w", err)
		}

		// Insert new scores
		if len(scores) > 0 {
			if err := tx.Create(&scores).Error; err != nil {
				return fmt.Errorf("failed to create criteria scores: %w", err)
			}
		}

		return nil
	})
}

func (r *employeeEvaluationRepositoryImpl) DeleteCriteriaScores(ctx context.Context, evaluationID string) error {
	if err := r.db.WithContext(ctx).
		Where("employee_evaluation_id = ?", evaluationID).
		Delete(&models.EmployeeEvaluationCriteria{}).Error; err != nil {
		return fmt.Errorf("failed to delete criteria scores: %w", err)
	}
	return nil
}
