package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/loyalty/data/models"
)

type MemberListParams struct {
	Page    int
	PerPage int
	Tier    string
	OutletID string
}

type LoyaltyMemberRepository interface {
	Create(ctx context.Context, member *models.LoyaltyMember) error
	GetByID(ctx context.Context, id string) (*models.LoyaltyMember, error)
	GetByCustomerID(ctx context.Context, customerID string) (*models.LoyaltyMember, error)
	// LookupByPhoneOrName performs a case-insensitive name match + optional phone lookup
	// via the customers table to find an existing member.
	LookupByNameAndOutlet(ctx context.Context, name, outletID string) (*models.LoyaltyMember, error)
	List(ctx context.Context, params MemberListParams) ([]models.LoyaltyMember, int64, error)
	Update(ctx context.Context, member *models.LoyaltyMember) error
	GetNextMemberCode(ctx context.Context) (string, error)
}
