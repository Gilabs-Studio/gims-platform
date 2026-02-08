package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
)

type employeeEvaluationUsecase struct {
	evaluationRepo repositories.EmployeeEvaluationRepository
	groupRepo      repositories.EvaluationGroupRepository
	criteriaRepo   repositories.EvaluationCriteriaRepository
	employeeRepo   orgRepos.EmployeeRepository
}

// NewEmployeeEvaluationUsecase creates a new instance of EmployeeEvaluationUsecase
func NewEmployeeEvaluationUsecase(
	evaluationRepo repositories.EmployeeEvaluationRepository,
	groupRepo repositories.EvaluationGroupRepository,
	criteriaRepo repositories.EvaluationCriteriaRepository,
	employeeRepo orgRepos.EmployeeRepository,
) EmployeeEvaluationUsecase {
	return &employeeEvaluationUsecase{
		evaluationRepo: evaluationRepo,
		groupRepo:      groupRepo,
		criteriaRepo:   criteriaRepo,
		employeeRepo:   employeeRepo,
	}
}

func (u *employeeEvaluationUsecase) GetAll(ctx context.Context, page, perPage int, search, employeeID, evaluationGroupID, status, evaluationType string) ([]*dto.EmployeeEvaluationResponse, *response.PaginationMeta, error) {
	// Validate pagination
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	evaluations, total, err := u.evaluationRepo.FindAll(ctx, page, perPage, search, employeeID, evaluationGroupID, status, evaluationType)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch employee evaluations: %w", err)
	}

	// Collect unique employee IDs (employees + evaluators)
	employeeIDSet := make(map[string]struct{})
	for _, eval := range evaluations {
		employeeIDSet[eval.EmployeeID] = struct{}{}
		employeeIDSet[eval.EvaluatorID] = struct{}{}
	}
	employeeIDs := make([]string, 0, len(employeeIDSet))
	for id := range employeeIDSet {
		employeeIDs = append(employeeIDs, id)
	}

	// Batch fetch employees
	employeeMap := make(map[string]dto.EmployeeSimpleResponse)
	if len(employeeIDs) > 0 {
		employees, err := u.employeeRepo.FindByIDs(ctx, employeeIDs)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to fetch employees: %w", err)
		}
		for _, emp := range employees {
			empID, _ := uuid.Parse(emp.ID)
			employeeMap[emp.ID] = dto.EmployeeSimpleResponse{
				ID:           empID,
				EmployeeCode: emp.EmployeeCode,
				Name:         emp.Name,
			}
		}
	}

	responses := mapper.ToEmployeeEvaluationResponseList(evaluations, employeeMap)

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	meta := &response.PaginationMeta{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	return responses, meta, nil
}

func (u *employeeEvaluationUsecase) GetByID(ctx context.Context, id string) (*dto.EmployeeEvaluationResponse, error) {
	eval, err := u.evaluationRepo.FindByIDWithDetails(ctx, id)
	if err != nil {
		return nil, err
	}
	if eval == nil {
		return nil, errors.New("employee evaluation not found")
	}

	// Fetch employee and evaluator data
	employeeIDs := []string{eval.EmployeeID, eval.EvaluatorID}
	employees, err := u.employeeRepo.FindByIDs(ctx, employeeIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}

	employeeMap := make(map[string]dto.EmployeeSimpleResponse)
	for _, emp := range employees {
		empID, _ := uuid.Parse(emp.ID)
		employeeMap[emp.ID] = dto.EmployeeSimpleResponse{
			ID:           empID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		}
	}

	// Build criteria name map from the evaluation group's criteria
	criteriaMap := make(map[string]string)
	if eval.EvaluationGroupID != "" {
		criteria, err := u.criteriaRepo.FindByGroupID(ctx, eval.EvaluationGroupID)
		if err == nil {
			for _, c := range criteria {
				criteriaMap[c.ID] = c.Name
			}
		}
	}

	return mapper.ToEmployeeEvaluationResponse(eval, employeeMap, criteriaMap), nil
}

func (u *employeeEvaluationUsecase) GetFormData(ctx context.Context) (*dto.EmployeeEvaluationFormDataResponse, error) {
	// Fetch all employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	employeeOptions := make([]dto.EmployeeFormOption, 0, len(employees))
	for _, emp := range employees {
		employeeID, err := uuid.Parse(emp.ID)
		if err != nil {
			continue
		}
		employeeOptions = append(employeeOptions, dto.EmployeeFormOption{
			ID:           employeeID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	// Fetch active evaluation groups
	isActive := true
	groups, _, err := u.groupRepo.FindAll(ctx, 1, 100, "", &isActive)
	if err != nil {
		return nil, err
	}

	groupOptions := make([]dto.EvaluationGroupSimpleResponse, 0, len(groups))
	for _, g := range groups {
		groupOptions = append(groupOptions, dto.EvaluationGroupSimpleResponse{
			ID:   g.ID,
			Name: g.Name,
		})
	}

	// Evaluation types
	evaluationTypes := []dto.EvaluationTypeOption{
		{Value: "SELF", Label: "Self Evaluation"},
		{Value: "MANAGER", Label: "Manager Evaluation"},
	}

	// Statuses
	statuses := []dto.EvaluationStatusOption{
		{Value: "DRAFT", Label: "Draft"},
		{Value: "SUBMITTED", Label: "Submitted"},
		{Value: "REVIEWED", Label: "Reviewed"},
		{Value: "FINALIZED", Label: "Finalized"},
	}

	return &dto.EmployeeEvaluationFormDataResponse{
		Employees:        employeeOptions,
		EvaluationGroups: groupOptions,
		EvaluationTypes:  evaluationTypes,
		Statuses:         statuses,
	}, nil
}

func (u *employeeEvaluationUsecase) Create(ctx context.Context, req *dto.CreateEmployeeEvaluationRequest) (*dto.EmployeeEvaluationResponse, error) {
	// Validate employee exists
	employee, err := u.employeeRepo.FindByID(ctx, req.EmployeeID)
	if err != nil {
		return nil, err
	}
	if employee == nil {
		return nil, errors.New("employee not found")
	}

	// Validate evaluator exists
	evaluator, err := u.employeeRepo.FindByID(ctx, req.EvaluatorID)
	if err != nil {
		return nil, err
	}
	if evaluator == nil {
		return nil, errors.New("evaluator not found")
	}

	// Validate evaluation group exists and is active
	group, err := u.groupRepo.FindByID(ctx, req.EvaluationGroupID)
	if err != nil {
		return nil, err
	}
	if group == nil {
		return nil, errors.New("evaluation group not found")
	}
	if !group.IsActive {
		return nil, errors.New("evaluation group is not active")
	}

	// Parse dates
	periodStart, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		return nil, errors.New("invalid period_start format, must be YYYY-MM-DD")
	}
	periodEnd, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		return nil, errors.New("invalid period_end format, must be YYYY-MM-DD")
	}

	// Validate period_end is after period_start
	if periodEnd.Before(periodStart) {
		return nil, errors.New("period_end must be after period_start")
	}

	id := uuid.New().String()
	evaluation := &models.EmployeeEvaluation{
		ID:                id,
		EmployeeID:        req.EmployeeID,
		EvaluationGroupID: req.EvaluationGroupID,
		EvaluatorID:       req.EvaluatorID,
		EvaluationType:    models.EvaluationType(req.EvaluationType),
		PeriodStart:       periodStart,
		PeriodEnd:         periodEnd,
		OverallScore:      0,
		Status:            models.EvaluationStatusDraft,
		Notes:             req.Notes,
	}

	if err := u.evaluationRepo.Create(ctx, evaluation); err != nil {
		return nil, fmt.Errorf("failed to create employee evaluation: %w", err)
	}

	// Save criteria scores if provided
	if len(req.CriteriaScores) > 0 {
		// Build weight map from group criteria
		criteria, err := u.criteriaRepo.FindByGroupID(ctx, req.EvaluationGroupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch criteria: %w", err)
		}
		criteriaWeightMap := make(map[string]float64)
		for _, c := range criteria {
			criteriaWeightMap[c.ID] = c.Weight
		}

		// Validate all criteria IDs belong to the group
		for _, score := range req.CriteriaScores {
			if _, ok := criteriaWeightMap[score.EvaluationCriteriaID]; !ok {
				return nil, fmt.Errorf("criteria %s does not belong to the evaluation group", score.EvaluationCriteriaID)
			}
		}

		scoreModels := mapper.ToEvaluationCriteriaScoreModels(id, req.CriteriaScores, criteriaWeightMap)

		if err := u.evaluationRepo.SaveCriteriaScores(ctx, id, scoreModels); err != nil {
			return nil, fmt.Errorf("failed to save criteria scores: %w", err)
		}

		// Calculate and update overall score
		evaluation.CriteriaScores = scoreModels
		evaluation.CalculateOverallScore()
		if err := u.evaluationRepo.Update(ctx, evaluation); err != nil {
			return nil, fmt.Errorf("failed to update overall score: %w", err)
		}
	}

	// Return full response
	return u.GetByID(ctx, id)
}

func (u *employeeEvaluationUsecase) Update(ctx context.Context, id string, req *dto.UpdateEmployeeEvaluationRequest) (*dto.EmployeeEvaluationResponse, error) {
	eval, err := u.evaluationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if eval == nil {
		return nil, errors.New("employee evaluation not found")
	}

	// Only DRAFT evaluations can be edited
	if eval.Status != models.EvaluationStatusDraft {
		return nil, errors.New("only draft evaluations can be edited")
	}

	// Update fields
	if req.EvaluationType != nil {
		eval.EvaluationType = models.EvaluationType(*req.EvaluationType)
	}
	if req.PeriodStart != nil {
		periodStart, err := time.Parse("2006-01-02", *req.PeriodStart)
		if err != nil {
			return nil, errors.New("invalid period_start format, must be YYYY-MM-DD")
		}
		eval.PeriodStart = periodStart
	}
	if req.PeriodEnd != nil {
		periodEnd, err := time.Parse("2006-01-02", *req.PeriodEnd)
		if err != nil {
			return nil, errors.New("invalid period_end format, must be YYYY-MM-DD")
		}
		eval.PeriodEnd = periodEnd
	}
	if req.Notes != nil {
		eval.Notes = req.Notes
	}

	// Validate period_end is after period_start
	if eval.PeriodEnd.Before(eval.PeriodStart) {
		return nil, errors.New("period_end must be after period_start")
	}

	// Update criteria scores if provided
	if len(req.CriteriaScores) > 0 {
		criteria, err := u.criteriaRepo.FindByGroupID(ctx, eval.EvaluationGroupID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch criteria: %w", err)
		}
		criteriaWeightMap := make(map[string]float64)
		for _, c := range criteria {
			criteriaWeightMap[c.ID] = c.Weight
		}

		// Validate all criteria IDs belong to the group
		for _, score := range req.CriteriaScores {
			if _, ok := criteriaWeightMap[score.EvaluationCriteriaID]; !ok {
				return nil, fmt.Errorf("criteria %s does not belong to the evaluation group", score.EvaluationCriteriaID)
			}
		}

		scoreModels := mapper.ToEvaluationCriteriaScoreModels(id, req.CriteriaScores, criteriaWeightMap)

		if err := u.evaluationRepo.SaveCriteriaScores(ctx, id, scoreModels); err != nil {
			return nil, fmt.Errorf("failed to save criteria scores: %w", err)
		}

		// Recalculate overall score
		eval.CriteriaScores = scoreModels
		eval.CalculateOverallScore()
	}

	if err := u.evaluationRepo.Update(ctx, eval); err != nil {
		return nil, fmt.Errorf("failed to update employee evaluation: %w", err)
	}

	return u.GetByID(ctx, id)
}

func (u *employeeEvaluationUsecase) UpdateStatus(ctx context.Context, id string, req *dto.SubmitEvaluationRequest) (*dto.EmployeeEvaluationResponse, error) {
	eval, err := u.evaluationRepo.FindByIDWithDetails(ctx, id)
	if err != nil {
		return nil, err
	}
	if eval == nil {
		return nil, errors.New("employee evaluation not found")
	}

	newStatus := models.EvaluationStatus(req.Status)

	// Validate status transitions:
	// DRAFT → SUBMITTED → REVIEWED → FINALIZED
	validTransitions := map[models.EvaluationStatus][]models.EvaluationStatus{
		models.EvaluationStatusDraft:     {models.EvaluationStatusSubmitted},
		models.EvaluationStatusSubmitted: {models.EvaluationStatusReviewed},
		models.EvaluationStatusReviewed:  {models.EvaluationStatusFinalized},
	}

	allowed, ok := validTransitions[eval.Status]
	if !ok {
		return nil, errors.New("evaluation is already finalized")
	}

	isValid := false
	for _, s := range allowed {
		if s == newStatus {
			isValid = true
			break
		}
	}
	if !isValid {
		return nil, fmt.Errorf("cannot transition from %s to %s", eval.Status, newStatus)
	}

	// When submitting, ensure criteria scores are present
	if newStatus == models.EvaluationStatusSubmitted && len(eval.CriteriaScores) == 0 {
		return nil, errors.New("cannot submit evaluation without criteria scores")
	}

	eval.Status = newStatus
	if req.Notes != nil {
		eval.Notes = req.Notes
	}

	if err := u.evaluationRepo.Update(ctx, eval); err != nil {
		return nil, fmt.Errorf("failed to update evaluation status: %w", err)
	}

	return u.GetByID(ctx, id)
}

func (u *employeeEvaluationUsecase) Delete(ctx context.Context, id string) error {
	eval, err := u.evaluationRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if eval == nil {
		return errors.New("employee evaluation not found")
	}

	// Only DRAFT evaluations can be deleted
	if eval.Status != models.EvaluationStatusDraft {
		return errors.New("only draft evaluations can be deleted")
	}

	// Delete criteria scores first
	if err := u.evaluationRepo.DeleteCriteriaScores(ctx, id); err != nil {
		return fmt.Errorf("failed to delete criteria scores: %w", err)
	}

	if err := u.evaluationRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete employee evaluation: %w", err)
	}

	return nil
}
