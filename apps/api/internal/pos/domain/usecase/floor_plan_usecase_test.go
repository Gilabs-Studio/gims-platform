package usecase

import (
	"context"
	"testing"

	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

type floorPlanRepoStub struct {
	lastCreated *posModels.FloorPlan
	lastList    repositories.FloorPlanListParams
	plans       []posModels.FloorPlan
}

func (s *floorPlanRepoStub) Create(_ context.Context, plan *posModels.FloorPlan) error {
	s.lastCreated = plan
	return nil
}

func (s *floorPlanRepoStub) FindByID(_ context.Context, _ string) (*posModels.FloorPlan, error) {
	return nil, gorm.ErrRecordNotFound
}

func (s *floorPlanRepoStub) List(_ context.Context, params repositories.FloorPlanListParams) ([]posModels.FloorPlan, int64, error) {
	s.lastList = params
	return s.plans, int64(len(s.plans)), nil
}

func (s *floorPlanRepoStub) Update(_ context.Context, _ *posModels.FloorPlan) error {
	return nil
}

func (s *floorPlanRepoStub) Delete(_ context.Context, _ string) error {
	return nil
}

func (s *floorPlanRepoStub) CreateVersion(_ context.Context, _ *posModels.LayoutVersion) error {
	return nil
}

func (s *floorPlanRepoStub) ListVersions(_ context.Context, _ string) ([]posModels.LayoutVersion, error) {
	return []posModels.LayoutVersion{}, nil
}

func (s *floorPlanRepoStub) GetVersion(_ context.Context, _ string) (*posModels.LayoutVersion, error) {
	return nil, gorm.ErrRecordNotFound
}

type outletRepoStub struct {
	byID map[string]*orgModels.Outlet
	list []*orgModels.Outlet
}

func (s *outletRepoStub) Create(_ context.Context, _ *orgModels.Outlet) error {
	return nil
}

func (s *outletRepoStub) GetByID(_ context.Context, id string) (*orgModels.Outlet, error) {
	if out, ok := s.byID[id]; ok {
		return out, nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (s *outletRepoStub) GetByCode(_ context.Context, _ string) (*orgModels.Outlet, error) {
	return nil, gorm.ErrRecordNotFound
}

func (s *outletRepoStub) GetNextCode(_ context.Context) (string, error) {
	return "", nil
}

func (s *outletRepoStub) List(_ context.Context, params orgRepos.OutletListParams) ([]*orgModels.Outlet, int64, error) {
	result := make([]*orgModels.Outlet, 0, len(s.list))
	for _, out := range s.list {
		if params.CompanyID != "" {
			if out.CompanyID == nil || *out.CompanyID != params.CompanyID {
				continue
			}
		}
		result = append(result, out)
	}
	if params.Limit > 0 && len(result) > params.Limit {
		result = result[:params.Limit]
	}
	return result, int64(len(result)), nil
}

func (s *outletRepoStub) Update(_ context.Context, _ *orgModels.Outlet) error {
	return nil
}

func (s *outletRepoStub) Delete(_ context.Context, _ string) error {
	return nil
}

func TestFloorPlanCreate_ShouldUseOutletScope_WhenOutletMatchesUserCompany(t *testing.T) {
	repo := &floorPlanRepoStub{}
	companyID := "11111111-1111-1111-1111-111111111111"
	outletID := "22222222-2222-2222-2222-222222222222"
	outletRepo := &outletRepoStub{
		byID: map[string]*orgModels.Outlet{
			outletID: {ID: outletID, CompanyID: &companyID},
		},
	}

	uc := NewFloorPlanUsecase(repo, outletRepo)
	resp, err := uc.Create(context.Background(), &dto.CreateFloorPlanRequest{
		OutletID:    outletID,
		Name:        "Main Dining",
		FloorNumber: 1,
	}, "33333333-3333-3333-3333-333333333333", companyID, false)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotNil(t, repo.lastCreated)
	assert.Equal(t, outletID, repo.lastCreated.OutletID)
	assert.NotNil(t, repo.lastCreated.CompanyID)
	assert.Equal(t, companyID, *repo.lastCreated.CompanyID)
}

func TestFloorPlanCreate_ShouldReject_WhenOutletOutsideUserCompany(t *testing.T) {
	repo := &floorPlanRepoStub{}
	userCompanyID := "11111111-1111-1111-1111-111111111111"
	otherCompanyID := "44444444-4444-4444-4444-444444444444"
	outletID := "22222222-2222-2222-2222-222222222222"
	outletRepo := &outletRepoStub{
		byID: map[string]*orgModels.Outlet{
			outletID: {ID: outletID, CompanyID: &otherCompanyID},
		},
	}

	uc := NewFloorPlanUsecase(repo, outletRepo)
	resp, err := uc.Create(context.Background(), &dto.CreateFloorPlanRequest{
		OutletID:    outletID,
		Name:        "Main Dining",
		FloorNumber: 1,
	}, "33333333-3333-3333-3333-333333333333", userCompanyID, false)

	assert.ErrorIs(t, err, ErrFloorPlanForbidden)
	assert.Nil(t, resp)
}

func TestFloorPlanList_ShouldScopeByCompany_WhenNonOwner(t *testing.T) {
	repo := &floorPlanRepoStub{}
	outletRepo := &outletRepoStub{}
	uc := NewFloorPlanUsecase(repo, outletRepo)

	_, _, err := uc.List(context.Background(), repositories.FloorPlanListParams{
		OutletID: "22222222-2222-2222-2222-222222222222",
	}, "11111111-1111-1111-1111-111111111111", false)

	assert.NoError(t, err)
	assert.Equal(t, "11111111-1111-1111-1111-111111111111", repo.lastList.CompanyID)
	assert.Equal(t, "22222222-2222-2222-2222-222222222222", repo.lastList.OutletID)
}
