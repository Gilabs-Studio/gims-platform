package usecase

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
)

// TenantUsecase handles tenant management (system admin only)
type TenantUsecase interface {
	ListTenants(ctx context.Context) ([]dto.TenantListResponse, error)
	ListTenantsPaginated(ctx context.Context, params dto.TenantListParams) ([]dto.TenantListResponse, *response.PaginationMeta, error)
	GetTenantDetail(ctx context.Context, id string) (*dto.TenantListResponse, error)
}

type tenantUsecase struct {
	repo repositories.TenantRepository
}

// NewTenantUsecase creates a new TenantUsecase
func NewTenantUsecase(repo repositories.TenantRepository) TenantUsecase {
	return &tenantUsecase{repo: repo}
}

func toTenantDTO(t repositories.TenantWithCounts) dto.TenantListResponse {
	ownerID := ""
	if t.OwnerUserID != nil {
		ownerID = *t.OwnerUserID
	}
	var createdAt *string
	if !t.CreatedAt.IsZero() {
		s := t.CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		createdAt = &s
	}
	return dto.TenantListResponse{
		ID:             t.ID,
		Name:           t.Name,
		Slug:           t.Slug,
		Status:         t.Status,
		Plan:           t.Plan,
		MaxUsers:       t.MaxUsers,
		CurrentUsers:   int(t.CurrentUsers),
		CompanyCount:   int(t.CompanyCount),
		OutletCount:    int(t.OutletCount),
		WarehouseCount: int(t.WarehouseCount),
		OwnerUserID:    ownerID,
		OwnerName:      t.OwnerName,
		OwnerEmail:     t.OwnerEmail,
		CreatedAt:      createdAt,
	}
}

func (u *tenantUsecase) ListTenants(ctx context.Context) ([]dto.TenantListResponse, error) {
	list, _, err := u.ListTenantsPaginated(ctx, dto.TenantListParams{Page: 1, PerPage: 100})
	return list, err
}

func (u *tenantUsecase) ListTenantsPaginated(ctx context.Context, params dto.TenantListParams) ([]dto.TenantListResponse, *response.PaginationMeta, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 10
	}

	tenants, total, err := u.repo.FindPaginatedWithCounts(ctx, params.Search, params.Page, params.PerPage)
	if err != nil {
		return nil, nil, err
	}

	result := make([]dto.TenantListResponse, 0, len(tenants))
	for _, t := range tenants {
		result = append(result, toTenantDTO(t))
	}

	pagination := response.NewPaginationMeta(params.Page, params.PerPage, int(total))
	return result, pagination, nil
}

func (u *tenantUsecase) GetTenantDetail(ctx context.Context, id string) (*dto.TenantListResponse, error) {
	tenant, err := u.repo.FindByIDWithCounts(ctx, id)
	if err != nil {
		return nil, err
	}
	resp := toTenantDTO(*tenant)
	return &resp, nil
}
