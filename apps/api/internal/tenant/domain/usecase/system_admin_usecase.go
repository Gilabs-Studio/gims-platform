package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrSysAdminInvalidCredentials = errors.New("invalid credentials")
	ErrSysAdminNotFound           = errors.New("system admin not found")
	ErrSysAdminDisabled           = errors.New("system admin account is disabled")
)

// SystemAdminUsecase handles system admin authentication
type SystemAdminUsecase interface {
	Login(ctx context.Context, req *dto.SystemAdminLoginRequest) (*dto.SystemAdminLoginResponse, error)
}

type systemAdminUsecase struct {
	repo       repositories.SystemAdminRepository
	jwtManager *jwt.JWTManager
}

// NewSystemAdminUsecase creates a new SystemAdminUsecase
func NewSystemAdminUsecase(repo repositories.SystemAdminRepository, jwtManager *jwt.JWTManager) SystemAdminUsecase {
	return &systemAdminUsecase{
		repo:       repo,
		jwtManager: jwtManager,
	}
}

func (u *systemAdminUsecase) Login(ctx context.Context, req *dto.SystemAdminLoginRequest) (*dto.SystemAdminLoginResponse, error) {
	admin, err := u.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSysAdminInvalidCredentials
		}
		return nil, err
	}

	if admin.Status != "active" {
		return nil, ErrSysAdminDisabled
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(req.Password)); err != nil {
		return nil, ErrSysAdminInvalidCredentials
	}

	// Generate token with role="system_admin" — tenantID is empty since system admins
	// operate at the platform level and are not scoped to any single tenant.
	accessToken, err := u.jwtManager.GenerateAccessToken(admin.ID, admin.Email, "system_admin", "")
	if err != nil {
		return nil, err
	}

	expiresIn := int(u.jwtManager.AccessTokenTTL().Seconds())

	return &dto.SystemAdminLoginResponse{
		Admin: &dto.SystemAdminResponse{
			ID:     admin.ID,
			Email:  admin.Email,
			Name:   admin.Name,
			Status: admin.Status,
		},
		AccessToken: accessToken,
		ExpiresIn:   expiresIn,
		// Tokens set in cookies by handler, not exposed in body
	}, nil
}
