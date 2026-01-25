package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrYearlyTargetNotFound = errors.New("yearly target not found")
	ErrInvalidTargetStatus  = errors.New("cannot modify target in current status")
)

// YearlyTargetUsecase defines the interface for yearly target business logic
type YearlyTargetUsecase interface {
	List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]dto.YearlyTargetResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.YearlyTargetResponse, error)
	Create(ctx context.Context, req *dto.CreateYearlyTargetRequest) (*dto.YearlyTargetResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateYearlyTargetRequest) (*dto.YearlyTargetResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateYearlyTargetStatusRequest, userID *string) (*dto.YearlyTargetResponse, error)
}

type yearlyTargetUsecase struct {
	targetRepo salesRepos.YearlyTargetRepository
}

// NewYearlyTargetUsecase creates a new YearlyTargetUsecase
func NewYearlyTargetUsecase(
	targetRepo salesRepos.YearlyTargetRepository,
) YearlyTargetUsecase {
	return &yearlyTargetUsecase{
		targetRepo: targetRepo,
	}
}

func (u *yearlyTargetUsecase) List(ctx context.Context, req *dto.ListYearlyTargetsRequest) ([]dto.YearlyTargetResponse, *utils.PaginationResult, error) {
	targets, total, err := u.targetRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.YearlyTargetResponse, len(targets))
	for i := range targets {
		responses[i] = mapper.ToYearlyTargetResponse(&targets[i])
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *yearlyTargetUsecase) GetByID(ctx context.Context, id string) (*dto.YearlyTargetResponse, error) {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrYearlyTargetNotFound
		}
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(target)
	return &response, nil
}

func (u *yearlyTargetUsecase) Create(ctx context.Context, req *dto.CreateYearlyTargetRequest) (*dto.YearlyTargetResponse, error) {
	// Generate target number
	code, err := u.targetRepo.GetNextTargetNumber(ctx, "YT")
	if err != nil {
		return nil, err
	}

	target := mapper.ToYearlyTargetModel(req, code)

	if err := u.targetRepo.Create(ctx, target); err != nil {
		return nil, err
	}

	created, err := u.targetRepo.FindByID(ctx, target.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(created)
	return &response, nil
}

func (u *yearlyTargetUsecase) Update(ctx context.Context, id string, req *dto.UpdateYearlyTargetRequest) (*dto.YearlyTargetResponse, error) {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrYearlyTargetNotFound
		}
		return nil, err
	}

	if target.Status != models.YearlyTargetStatusDraft {
		return nil, ErrInvalidTargetStatus
	}

	mapper.UpdateYearlyTargetModel(target, req)

	if err := u.targetRepo.Update(ctx, target); err != nil {
		return nil, err
	}

	updated, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(updated)
	return &response, nil
}

func (u *yearlyTargetUsecase) Delete(ctx context.Context, id string) error {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrYearlyTargetNotFound
		}
		return err
	}

	if target.Status != models.YearlyTargetStatusDraft {
		return ErrInvalidTargetStatus
	}

	return u.targetRepo.Delete(ctx, id)
}

func (u *yearlyTargetUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateYearlyTargetStatusRequest, userID *string) (*dto.YearlyTargetResponse, error) {
	target, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	newStatus := models.YearlyTargetStatus(req.Status)

	if !u.isValidStatusTransition(target.Status, newStatus) {
		return nil, ErrInvalidStatusTransition
	}

	var reason *string
	if req.RejectionReason != nil {
		reason = req.RejectionReason
	}

	if err := u.targetRepo.UpdateStatus(ctx, id, newStatus, userID, reason); err != nil {
		return nil, err
	}

	updated, err := u.targetRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToYearlyTargetResponse(updated)
	return &response, nil
}

func (u *yearlyTargetUsecase) isValidStatusTransition(current, new models.YearlyTargetStatus) bool {
	valid := map[models.YearlyTargetStatus][]models.YearlyTargetStatus{
		models.YearlyTargetStatusDraft: {
			models.YearlyTargetStatusSubmitted,
		},
		models.YearlyTargetStatusSubmitted: {
			models.YearlyTargetStatusApproved,
			models.YearlyTargetStatusRejected,
		},
		models.YearlyTargetStatusApproved: {},
		models.YearlyTargetStatusRejected: {
			models.YearlyTargetStatusDraft,
		},
	}

	allowed, ok := valid[current]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == new {
			return true
		}
	}
	return false
}
