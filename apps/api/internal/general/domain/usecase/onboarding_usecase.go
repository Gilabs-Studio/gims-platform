package usecase

import (
	"context"

	"github.com/gilabs/gims/api/internal/general/data/repositories"
	"github.com/gilabs/gims/api/internal/general/domain/dto"
)

// OnboardingUsecase manages tenant onboarding state.
type OnboardingUsecase interface {
	GetState(ctx context.Context) (*dto.OnboardingStateResponse, error)
	SetBusinessType(ctx context.Context, businessType string) (*dto.OnboardingStateResponse, error)
	MarkComplete(ctx context.Context) (*dto.OnboardingStateResponse, error)
}

type onboardingUsecase struct {
	repo repositories.OnboardingRepository
}

func NewOnboardingUsecase(repo repositories.OnboardingRepository) OnboardingUsecase {
	return &onboardingUsecase{repo: repo}
}

// stepsFromRepo queries live data and converts it to the DTO shape.
// On error it returns nil steps (non-fatal — caller should still return the base state).
func (u *onboardingUsecase) stepsFromRepo(ctx context.Context) *dto.OnboardingStepsResponse {
	raw, err := u.repo.CheckSteps(ctx)
	if err != nil {
		return nil
	}
	       return &dto.OnboardingStepsResponse{
		       Company:     raw.Company,
		       Outlet:      raw.Outlet,
		       FloorLayout: raw.FloorLayout,
		       Products:    raw.Products,
		       Warehouse:   raw.Warehouse,
		       Users:       raw.Users,
		       FiscalYear:  raw.FiscalYear,
	       }
}

func (u *onboardingUsecase) GetState(ctx context.Context) (*dto.OnboardingStateResponse, error) {
	state, err := u.repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	return &dto.OnboardingStateResponse{
		BusinessType: state.BusinessType,
		Completed:    state.Completed,
		Steps:        u.stepsFromRepo(ctx),
	}, nil
}

func (u *onboardingUsecase) SetBusinessType(ctx context.Context, businessType string) (*dto.OnboardingStateResponse, error) {
	state, err := u.repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	state.BusinessType = businessType

	if err := u.repo.Save(ctx, state); err != nil {
		return nil, err
	}

	return &dto.OnboardingStateResponse{
		BusinessType: state.BusinessType,
		Completed:    state.Completed,
		Steps:        u.stepsFromRepo(ctx),
	}, nil
}

func (u *onboardingUsecase) MarkComplete(ctx context.Context) (*dto.OnboardingStateResponse, error) {
	state, err := u.repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	state.Completed = true

	if err := u.repo.Save(ctx, state); err != nil {
		return nil, err
	}

	return &dto.OnboardingStateResponse{
		BusinessType: state.BusinessType,
		Completed:    state.Completed,
		Steps:        u.stepsFromRepo(ctx),
	}, nil
}
