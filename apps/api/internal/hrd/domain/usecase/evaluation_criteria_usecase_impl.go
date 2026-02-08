package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	"github.com/google/uuid"
)

type evaluationCriteriaUsecase struct {
	criteriaRepo repositories.EvaluationCriteriaRepository
	groupRepo    repositories.EvaluationGroupRepository
}

// NewEvaluationCriteriaUsecase creates a new instance of EvaluationCriteriaUsecase
func NewEvaluationCriteriaUsecase(
	criteriaRepo repositories.EvaluationCriteriaRepository,
	groupRepo repositories.EvaluationGroupRepository,
) EvaluationCriteriaUsecase {
	return &evaluationCriteriaUsecase{
		criteriaRepo: criteriaRepo,
		groupRepo:    groupRepo,
	}
}

func (u *evaluationCriteriaUsecase) GetByGroupID(ctx context.Context, groupID string) ([]*dto.EvaluationCriteriaResponse, error) {
	// Validate group exists
	group, err := u.groupRepo.FindByID(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if group == nil {
		return nil, errors.New("evaluation group not found")
	}

	criteria, err := u.criteriaRepo.FindByGroupID(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch evaluation criteria: %w", err)
	}

	return mapper.ToEvaluationCriteriaResponseList(criteria), nil
}

func (u *evaluationCriteriaUsecase) GetByID(ctx context.Context, id string) (*dto.EvaluationCriteriaResponse, error) {
	criteria, err := u.criteriaRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if criteria == nil {
		return nil, errors.New("evaluation criteria not found")
	}

	return mapper.ToEvaluationCriteriaResponse(criteria), nil
}

func (u *evaluationCriteriaUsecase) Create(ctx context.Context, req *dto.CreateEvaluationCriteriaRequest) (*dto.EvaluationCriteriaResponse, error) {
	// Validate group exists
	group, err := u.groupRepo.FindByID(ctx, req.EvaluationGroupID)
	if err != nil {
		return nil, err
	}
	if group == nil {
		return nil, errors.New("evaluation group not found")
	}

	// Validate total weight does not exceed 100%
	currentWeight, err := u.criteriaRepo.GetTotalWeightByGroupID(ctx, req.EvaluationGroupID, "")
	if err != nil {
		return nil, err
	}
	if currentWeight+req.Weight > 100 {
		return nil, fmt.Errorf("total weight would exceed 100%%. Current: %.2f%%, Adding: %.2f%%", currentWeight, req.Weight)
	}

	id := uuid.New().String()
	criteria := mapper.ToEvaluationCriteriaModel(req, id)

	if err := u.criteriaRepo.Create(ctx, criteria); err != nil {
		return nil, fmt.Errorf("failed to create evaluation criteria: %w", err)
	}

	return mapper.ToEvaluationCriteriaResponse(criteria), nil
}

func (u *evaluationCriteriaUsecase) Update(ctx context.Context, id string, req *dto.UpdateEvaluationCriteriaRequest) (*dto.EvaluationCriteriaResponse, error) {
	criteria, err := u.criteriaRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if criteria == nil {
		return nil, errors.New("evaluation criteria not found")
	}

	// Validate weight if being updated
	if req.Weight != nil {
		// Get total weight excluding the current criteria
		otherWeight, err := u.criteriaRepo.GetTotalWeightByGroupID(ctx, criteria.EvaluationGroupID, id)
		if err != nil {
			return nil, err
		}
		if otherWeight+*req.Weight > 100 {
			return nil, fmt.Errorf("total weight would exceed 100%%. Other criteria: %.2f%%, New weight: %.2f%%", otherWeight, *req.Weight)
		}
	}

	mapper.UpdateEvaluationCriteriaModel(criteria, req)

	if err := u.criteriaRepo.Update(ctx, criteria); err != nil {
		return nil, fmt.Errorf("failed to update evaluation criteria: %w", err)
	}

	return mapper.ToEvaluationCriteriaResponse(criteria), nil
}

func (u *evaluationCriteriaUsecase) Delete(ctx context.Context, id string) error {
	criteria, err := u.criteriaRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if criteria == nil {
		return errors.New("evaluation criteria not found")
	}

	if err := u.criteriaRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete evaluation criteria: %w", err)
	}

	return nil
}
