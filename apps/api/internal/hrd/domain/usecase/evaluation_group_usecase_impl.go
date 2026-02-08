package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	"github.com/google/uuid"
)

type evaluationGroupUsecase struct {
	groupRepo    repositories.EvaluationGroupRepository
	criteriaRepo repositories.EvaluationCriteriaRepository
}

// NewEvaluationGroupUsecase creates a new instance of EvaluationGroupUsecase
func NewEvaluationGroupUsecase(
	groupRepo repositories.EvaluationGroupRepository,
	criteriaRepo repositories.EvaluationCriteriaRepository,
) EvaluationGroupUsecase {
	return &evaluationGroupUsecase{
		groupRepo:    groupRepo,
		criteriaRepo: criteriaRepo,
	}
}

func (u *evaluationGroupUsecase) GetAll(ctx context.Context, page, perPage int, search string, isActive *bool) ([]*dto.EvaluationGroupResponse, *response.PaginationMeta, error) {
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

	groups, total, err := u.groupRepo.FindAll(ctx, page, perPage, search, isActive)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch evaluation groups: %w", err)
	}

	responses := mapper.ToEvaluationGroupResponseList(groups)

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

func (u *evaluationGroupUsecase) GetByID(ctx context.Context, id string) (*dto.EvaluationGroupResponse, error) {
	// Fetch group with criteria preloaded
	group, err := u.groupRepo.FindByIDWithCriteria(ctx, id)
	if err != nil {
		return nil, err
	}
	if group == nil {
		return nil, errors.New("evaluation group not found")
	}

	return mapper.ToEvaluationGroupResponse(group), nil
}

func (u *evaluationGroupUsecase) Create(ctx context.Context, req *dto.CreateEvaluationGroupRequest) (*dto.EvaluationGroupResponse, error) {
	id := uuid.New().String()
	group := mapper.ToEvaluationGroupModel(req, id)

	if err := u.groupRepo.Create(ctx, group); err != nil {
		return nil, fmt.Errorf("failed to create evaluation group: %w", err)
	}

	return mapper.ToEvaluationGroupResponse(group), nil
}

func (u *evaluationGroupUsecase) Update(ctx context.Context, id string, req *dto.UpdateEvaluationGroupRequest) (*dto.EvaluationGroupResponse, error) {
	group, err := u.groupRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if group == nil {
		return nil, errors.New("evaluation group not found")
	}

	mapper.UpdateEvaluationGroupModel(group, req)

	if err := u.groupRepo.Update(ctx, group); err != nil {
		return nil, fmt.Errorf("failed to update evaluation group: %w", err)
	}

	// Re-fetch with criteria for full response
	updatedGroup, err := u.groupRepo.FindByIDWithCriteria(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.ToEvaluationGroupResponse(updatedGroup), nil
}

func (u *evaluationGroupUsecase) Delete(ctx context.Context, id string) error {
	group, err := u.groupRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if group == nil {
		return errors.New("evaluation group not found")
	}

	if err := u.groupRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete evaluation group: %w", err)
	}

	return nil
}
