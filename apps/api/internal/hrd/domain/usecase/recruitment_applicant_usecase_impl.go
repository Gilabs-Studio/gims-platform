package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"gorm.io/datatypes"
)

type recruitmentApplicantUsecase struct {
	applicantRepo  repositories.RecruitmentApplicantRepository
	stageRepo      repositories.ApplicantStageRepository
	activityRepo   repositories.ApplicantActivityRepository
	recruitmentRepo repositories.RecruitmentRequestRepository
	employeeRepo   orgRepos.EmployeeRepository
}

// NewRecruitmentApplicantUsecase creates a new instance of RecruitmentApplicantUsecase
func NewRecruitmentApplicantUsecase(
	applicantRepo repositories.RecruitmentApplicantRepository,
	stageRepo repositories.ApplicantStageRepository,
	activityRepo repositories.ApplicantActivityRepository,
	recruitmentRepo repositories.RecruitmentRequestRepository,
	employeeRepo orgRepos.EmployeeRepository,
) RecruitmentApplicantUsecase {
	return &recruitmentApplicantUsecase{
		applicantRepo:   applicantRepo,
		stageRepo:       stageRepo,
		activityRepo:    activityRepo,
		recruitmentRepo: recruitmentRepo,
		employeeRepo:    employeeRepo,
	}
}

func (u *recruitmentApplicantUsecase) GetAll(ctx context.Context, params dto.ListApplicantsParams) ([]*dto.RecruitmentApplicantResponse, *response.PaginationMeta, error) {
	page := params.Page
	perPage := params.PerPage

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	applicants, total, err := u.applicantRepo.FindAll(ctx, page, perPage, params.Search, params.RecruitmentRequestID, params.StageID, params.Source)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch applicants: %w", err)
	}

	responses := make([]*dto.RecruitmentApplicantResponse, 0, len(applicants))
	for _, a := range applicants {
		responses = append(responses, toApplicantResponse(&a))
	}

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

func (u *recruitmentApplicantUsecase) GetByID(ctx context.Context, id string) (*dto.RecruitmentApplicantResponse, error) {
	applicant, err := u.applicantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if applicant == nil {
		return nil, errors.New("applicant not found")
	}

	return toApplicantResponse(applicant), nil
}

func (u *recruitmentApplicantUsecase) Create(ctx context.Context, req *dto.CreateRecruitmentApplicantDTO, userID string) (*dto.RecruitmentApplicantResponse, error) {
	// Validate recruitment request exists
	recruitment, err := u.recruitmentRepo.FindByID(ctx, req.RecruitmentRequestID)
	if err != nil {
		return nil, err
	}
	if recruitment == nil {
		return nil, errors.New("recruitment request not found")
	}

	// Validate stage exists
	stage, err := u.stageRepo.FindByID(ctx, req.StageID)
	if err != nil {
		return nil, err
	}
	if stage == nil {
		return nil, errors.New("stage not found")
	}

	// Validate source
	if !models.IsValidSource(req.Source) {
		return nil, errors.New("invalid applicant source")
	}

	now := apptime.Now()
	applicant := &models.RecruitmentApplicant{
		RecruitmentRequestID: req.RecruitmentRequestID,
		StageID:              req.StageID,
		FullName:             req.FullName,
		Email:                req.Email,
		Phone:                req.Phone,
		Source:               req.Source,
		Notes:                req.Notes,
		ResumeURL:            req.ResumeURL,
		AppliedAt:            now,
		LastActivityAt:       now,
		CreatedBy:            &userID,
	}

	if err := u.applicantRepo.Create(ctx, applicant); err != nil {
		return nil, fmt.Errorf("failed to create applicant: %w", err)
	}

	// Create activity record
	activity := &models.ApplicantActivity{
		ApplicantID: applicant.ID,
		Type:        models.ActivityTypeCreated,
		Description: fmt.Sprintf("Applicant %s was added to %s", applicant.FullName, stage.Name),
		CreatedBy:   &userID,
	}
	_ = u.activityRepo.Create(ctx, activity) // Non-critical, ignore error

	// Reload with stage
	return u.GetByID(ctx, applicant.ID)
}

func (u *recruitmentApplicantUsecase) Update(ctx context.Context, id string, req *dto.UpdateRecruitmentApplicantDTO, userID string) (*dto.RecruitmentApplicantResponse, error) {
	applicant, err := u.applicantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if applicant == nil {
		return nil, errors.New("applicant not found")
	}

	// Apply updates
	if req.FullName != nil {
		applicant.FullName = *req.FullName
	}
	if req.Email != nil {
		applicant.Email = *req.Email
	}
	if req.Phone != nil {
		applicant.Phone = req.Phone
	}
	if req.Source != nil {
		if !models.IsValidSource(*req.Source) {
			return nil, errors.New("invalid applicant source")
		}
		applicant.Source = *req.Source
	}
	if req.Notes != nil {
		applicant.Notes = req.Notes
	}
	if req.ResumeURL != nil {
		applicant.ResumeURL = req.ResumeURL
	}
	if req.Rating != nil {
		oldRating := applicant.Rating
		applicant.Rating = req.Rating

		// Create activity for rating change
		if oldRating == nil || *oldRating != *req.Rating {
			activity := &models.ApplicantActivity{
				ApplicantID: applicant.ID,
				Type:        models.ActivityTypeRatingChanged,
				Description: fmt.Sprintf("Rating changed to %d stars", *req.Rating),
				Metadata:    toJSONMetadata(map[string]interface{}{"old_rating": oldRating, "new_rating": *req.Rating}),
				CreatedBy:   &userID,
			}
			_ = u.activityRepo.Create(ctx, activity)
		}
	}

	applicant.UpdatedBy = &userID

	if err := u.applicantRepo.Update(ctx, applicant); err != nil {
		return nil, fmt.Errorf("failed to update applicant: %w", err)
	}

	// Create activity record
	activity := &models.ApplicantActivity{
		ApplicantID: applicant.ID,
		Type:        models.ActivityTypeUpdated,
		Description: fmt.Sprintf("Applicant %s information was updated", applicant.FullName),
		CreatedBy:   &userID,
	}
	_ = u.activityRepo.Create(ctx, activity)

	return u.GetByID(ctx, applicant.ID)
}

func (u *recruitmentApplicantUsecase) Delete(ctx context.Context, id string) error {
	applicant, err := u.applicantRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if applicant == nil {
		return errors.New("applicant not found")
	}

	return u.applicantRepo.Delete(ctx, id)
}

func (u *recruitmentApplicantUsecase) MoveStage(ctx context.Context, id string, req *dto.MoveApplicantStageDTO, userID string) (*dto.RecruitmentApplicantResponse, error) {
	applicant, err := u.applicantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if applicant == nil {
		return nil, errors.New("applicant not found")
	}

	// Get current and target stages
	fromStage := applicant.Stage
	toStage, err := u.stageRepo.FindByID(ctx, req.ToStageID)
	if err != nil {
		return nil, err
	}
	if toStage == nil {
		return nil, errors.New("target stage not found")
	}

	// Move the applicant
	if err := u.applicantRepo.MoveStage(ctx, id, req.ToStageID); err != nil {
		return nil, err
	}

	// Determine activity type
	activityType := models.ActivityTypeStageChange
	if toStage.IsWon {
		activityType = models.ActivityTypeHired
	} else if toStage.IsLost {
		activityType = models.ActivityTypeRejected
	}

	description := fmt.Sprintf("Moved from %s to %s", fromStage.Name, toStage.Name)
	if req.Reason != nil && *req.Reason != "" {
		description = fmt.Sprintf("%s. Reason: %s", description, *req.Reason)
	}

	// Create activity record
	activity := &models.ApplicantActivity{
		ApplicantID: id,
		Type:        activityType,
		Description: description,
		Metadata:    toJSONMetadata(map[string]interface{}{"from_stage_id": fromStage.ID, "to_stage_id": toStage.ID, "notes": req.Notes}),
		CreatedBy:   &userID,
	}
	_ = u.activityRepo.Create(ctx, activity)

	// Update filled count based on stage movement
	// Allow updates for all non-terminal recruitment statuses (not DRAFT or CANCELLED)
	recruitment, _ := u.recruitmentRepo.FindByID(ctx, applicant.RecruitmentRequestID)
	if recruitment != nil && recruitment.Status != models.RecruitmentStatusDraft && recruitment.Status != models.RecruitmentStatusCancelled {
		// Moving to Hired (Won) stage - increment filled count
		if toStage.IsWon && !fromStage.IsWon {
			recruitment.FilledCount++
			_ = u.recruitmentRepo.Update(ctx, recruitment)
		}
		// Moving from Hired (Won) to non-Won stage - decrement filled count
		if fromStage.IsWon && !toStage.IsWon {
			if recruitment.FilledCount > 0 {
				recruitment.FilledCount--
				_ = u.recruitmentRepo.Update(ctx, recruitment)
			}
		}
	}

	return u.GetByID(ctx, id)
}

func (u *recruitmentApplicantUsecase) GetByStage(ctx context.Context, params dto.ListApplicantsByStageParams) (map[string]*dto.ApplicantsByStageResponse, error) {
	page := params.Page
	perPage := params.PerPage

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	// Get all active stages
	stages, err := u.stageRepo.FindAllActive(ctx)
	if err != nil {
		return nil, err
	}

	result := make(map[string]*dto.ApplicantsByStageResponse)

	for _, stage := range stages {
		applicants, total, err := u.applicantRepo.FindByStage(ctx, stage.ID, params.RecruitmentRequestID, page, perPage)
		if err != nil {
			continue // Skip this stage on error
		}

		applicantResponses := make([]*dto.RecruitmentApplicantResponse, 0, len(applicants))
		for _, a := range applicants {
			applicantResponses = append(applicantResponses, toApplicantResponse(&a))
		}

		result[stage.ID] = &dto.ApplicantsByStageResponse{
			StageID:    stage.ID,
			StageName:  stage.Name,
			StageColor: stage.Color,
			Order:      stage.Order,
			Applicants: applicantResponses,
			Total:      total,
		}
	}

	return result, nil
}

func (u *recruitmentApplicantUsecase) GetStages(ctx context.Context) ([]*dto.ApplicantStageResponse, error) {
	stages, err := u.stageRepo.FindAllActive(ctx)
	if err != nil {
		return nil, err
	}

	responses := make([]*dto.ApplicantStageResponse, 0, len(stages))
	for _, s := range stages {
		responses = append(responses, &dto.ApplicantStageResponse{
			ID:       s.ID,
			Name:     s.Name,
			Color:    s.Color,
			Order:    s.Order,
			IsWon:    s.IsWon,
			IsLost:   s.IsLost,
			IsActive: s.IsActive,
		})
	}

	return responses, nil
}

func (u *recruitmentApplicantUsecase) GetActivities(ctx context.Context, applicantID string, page, perPage int) ([]*dto.ApplicantActivityResponse, *response.PaginationMeta, error) {
	// Verify applicant exists
	applicant, err := u.applicantRepo.FindByID(ctx, applicantID)
	if err != nil {
		return nil, nil, err
	}
	if applicant == nil {
		return nil, nil, errors.New("applicant not found")
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	activities, total, err := u.activityRepo.FindByApplicant(ctx, applicantID, page, perPage)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]*dto.ApplicantActivityResponse, 0, len(activities))
	for _, a := range activities {
		var metadata map[string]interface{}
		if a.Metadata != nil {
			_ = json.Unmarshal(*a.Metadata, &metadata)
		}

		// Note: Creator name lookup would require N+1 queries
		// Frontend can look up user names separately using created_by ID
		var createdByName *string = nil

		responses = append(responses, &dto.ApplicantActivityResponse{
			ID:            a.ID,
			ApplicantID:   a.ApplicantID,
			Type:          a.Type,
			Description:   a.Description,
			Metadata:      metadata,
			CreatedBy:     a.CreatedBy,
			CreatedByName: createdByName,
			CreatedAt:     a.CreatedAt,
		})
	}

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

func (u *recruitmentApplicantUsecase) AddActivity(ctx context.Context, applicantID string, req *dto.CreateApplicantActivityDTO, userID string) (*dto.ApplicantActivityResponse, error) {
	// Verify applicant exists
	applicant, err := u.applicantRepo.FindByID(ctx, applicantID)
	if err != nil {
		return nil, err
	}
	if applicant == nil {
		return nil, errors.New("applicant not found")
	}

	activity := &models.ApplicantActivity{
		ApplicantID: applicantID,
		Type:        req.Type,
		Description: req.Description,
		CreatedBy:   &userID,
	}

	if req.Metadata != nil {
		metadata, _ := json.Marshal(req.Metadata)
		activity.Metadata = (*datatypes.JSON)(&metadata)
	}

	if err := u.activityRepo.Create(ctx, activity); err != nil {
		return nil, err
	}

	return &dto.ApplicantActivityResponse{
		ID:          activity.ID,
		ApplicantID: activity.ApplicantID,
		Type:        activity.Type,
		Description: activity.Description,
		Metadata:    req.Metadata,
		CreatedBy:   &userID,
		CreatedAt:   activity.CreatedAt,
	}, nil
}

func (u *recruitmentApplicantUsecase) GetByRecruitmentRequest(ctx context.Context, recruitmentRequestID string, page, perPage int) ([]*dto.RecruitmentApplicantResponse, *response.PaginationMeta, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	applicants, total, err := u.applicantRepo.FindByRecruitmentRequest(ctx, recruitmentRequestID, page, perPage)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]*dto.RecruitmentApplicantResponse, 0, len(applicants))
	for _, a := range applicants {
		responses = append(responses, toApplicantResponse(&a))
	}

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

// Helper functions

func toApplicantResponse(a *models.RecruitmentApplicant) *dto.RecruitmentApplicantResponse {
	resp := &dto.RecruitmentApplicantResponse{
		ID:                   a.ID,
		RecruitmentRequestID: a.RecruitmentRequestID,
		StageID:              a.StageID,
		FullName:             a.FullName,
		Email:                a.Email,
		Phone:                a.Phone,
		ResumeURL:            a.ResumeURL,
		Source:               a.Source,
		AppliedAt:            a.AppliedAt,
		LastActivityAt:       a.LastActivityAt,
		Rating:               a.Rating,
		Notes:                a.Notes,
		CreatedAt:            a.CreatedAt,
		UpdatedAt:            a.UpdatedAt,
	}

	if a.Stage.ID != "" {
		resp.Stage = &dto.ApplicantStageResponse{
			ID:       a.Stage.ID,
			Name:     a.Stage.Name,
			Color:    a.Stage.Color,
			Order:    a.Stage.Order,
			IsWon:    a.Stage.IsWon,
			IsLost:   a.Stage.IsLost,
			IsActive: a.Stage.IsActive,
		}
	}

	return resp
}

func toJSONMetadata(data map[string]interface{}) *datatypes.JSON {
	b, _ := json.Marshal(data)
	return (*datatypes.JSON)(&b)
}
