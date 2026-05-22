package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/password_reset/data/models"
	"gorm.io/gorm"
)

type TenantOwnerPendingRequest struct {
	RequestID   string
	Token       string
	UserID      string
	UserName    string
	UserEmail   string
	TenantID    string
	TenantName  string
	Status      string
	RequestedAt time.Time
	ExpiresAt   time.Time
}

// PasswordResetRequestRepository defines data access for password reset requests.
type PasswordResetRequestRepository interface {
	Create(ctx context.Context, req *models.PasswordResetRequest) error
	FindByToken(ctx context.Context, token string) (*models.PasswordResetRequest, error)
	FindByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error)
	FindPendingByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error)
	ListPendingTenantOwner(ctx context.Context, search string, page, perPage int) ([]TenantOwnerPendingRequest, int64, error)
	CountPendingTenantOwner(ctx context.Context) (int64, error)
	Update(ctx context.Context, req *models.PasswordResetRequest) error
	DeleteByUserID(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
}

type passwordResetRequestRepository struct {
	db *gorm.DB
}

func NewPasswordResetRequestRepository(db *gorm.DB) PasswordResetRequestRepository {
	return &passwordResetRequestRepository{db: db}
}

func (r *passwordResetRequestRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *passwordResetRequestRepository) Create(ctx context.Context, req *models.PasswordResetRequest) error {
	return r.getDB(ctx).Create(req).Error
}

func (r *passwordResetRequestRepository) FindByToken(ctx context.Context, token string) (*models.PasswordResetRequest, error) {
	var req models.PasswordResetRequest
	err := r.getDB(ctx).Where("token = ?", token).First(&req).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *passwordResetRequestRepository) FindByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error) {
	var req models.PasswordResetRequest
	err := r.getDB(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&req).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *passwordResetRequestRepository) FindPendingByUserID(ctx context.Context, userID string) (*models.PasswordResetRequest, error) {
	var req models.PasswordResetRequest
	err := r.getDB(ctx).
		Where("user_id = ? AND status = ?", userID, models.PasswordResetStatusPending).
		Order("created_at DESC").
		First(&req).Error
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *passwordResetRequestRepository) ListPendingTenantOwner(ctx context.Context, search string, page, perPage int) ([]TenantOwnerPendingRequest, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}

	query := r.getDB(ctx).
		Table("password_reset_requests pr").
		Joins("JOIN users u ON u.id = pr.user_id AND u.deleted_at IS NULL").
		Joins("JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL").
		Where("pr.status = ?", models.PasswordResetStatusPending).
		Where("t.owner_user_id = u.id")

	if search != "" {
		like := "%" + search + "%"
		query = query.Where("u.email ILIKE ? OR u.name ILIKE ? OR t.name ILIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	rows := make([]TenantOwnerPendingRequest, 0)
	err := query.
		Select(`
			pr.id AS request_id,
			pr.token AS token,
			u.id AS user_id,
			u.name AS user_name,
			u.email AS user_email,
			t.id AS tenant_id,
			t.name AS tenant_name,
			pr.status AS status,
			pr.created_at AS requested_at,
			pr.expires_at AS expires_at
		`).
		Order("pr.created_at DESC").
		Offset(offset).
		Limit(perPage).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	return rows, total, nil
}

func (r *passwordResetRequestRepository) CountPendingTenantOwner(ctx context.Context) (int64, error) {
	var total int64
	err := r.getDB(ctx).
		Table("password_reset_requests pr").
		Joins("JOIN users u ON u.id = pr.user_id AND u.deleted_at IS NULL").
		Joins("JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL").
		Where("pr.status = ?", models.PasswordResetStatusPending).
		Where("t.owner_user_id = u.id").
		Count(&total).Error
	if err != nil {
		return 0, err
	}

	return total, nil
}

func (r *passwordResetRequestRepository) Update(ctx context.Context, req *models.PasswordResetRequest) error {
	return r.getDB(ctx).Save(req).Error
}

func (r *passwordResetRequestRepository) DeleteByUserID(ctx context.Context, userID string) error {
	return r.getDB(ctx).Where("user_id = ?", userID).Delete(&models.PasswordResetRequest{}).Error
}

func (r *passwordResetRequestRepository) DeleteExpired(ctx context.Context) error {
	return r.getDB(ctx).
		Where("expires_at < NOW() OR status = ?", models.PasswordResetStatusUsed).
		Delete(&models.PasswordResetRequest{}).Error
}
