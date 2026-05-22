package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	notificationModels "github.com/gilabs/gims/api/internal/notification/data/models"
	notificationRepo "github.com/gilabs/gims/api/internal/notification/data/repositories"
	passwordResetModels "github.com/gilabs/gims/api/internal/password_reset/data/models"
	"github.com/gilabs/gims/api/internal/password_reset/data/repositories"
	resetDto "github.com/gilabs/gims/api/internal/password_reset/domain/dto"
	"github.com/gilabs/gims/api/internal/password_reset/domain/mapper"
	roleRepo "github.com/gilabs/gims/api/internal/role/data/repositories"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
	userDto "github.com/gilabs/gims/api/internal/user/domain/dto"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound          = errors.New("user not found")
	ErrInvalidResetToken     = errors.New("invalid or expired reset token")
	ErrResetTokenExpired     = errors.New("reset token has expired")
	ErrResetTokenAlreadyUsed = errors.New("reset token has already been used")
)

type PasswordResetUsecase interface {
	ForgotPassword(ctx context.Context, req *resetDto.ForgotPasswordRequest) (*resetDto.ForgotPasswordResponse, error)
	ResetPassword(ctx context.Context, req *resetDto.ResetPasswordRequest) (*resetDto.ResetPasswordResponse, error)
	ValidateResetToken(ctx context.Context, token string) error
	ListTenantOwnerRequests(ctx context.Context, page, perPage int, search string) ([]resetDto.TenantOwnerPasswordResetQueueItem, int64, error)
	GetTenantOwnerPendingCount(ctx context.Context) (*resetDto.TenantOwnerPasswordResetPendingCountResponse, error)
}

type tenantLookupRepository interface {
	FindByID(ctx context.Context, id string) (*tenantModels.Tenant, error)
}

type systemAdminLookupRepository interface {
	ListActive(ctx context.Context) ([]tenantModels.SystemAdmin, error)
}

type passwordResetUsecase struct {
	passwordResetRepo repositories.PasswordResetRequestRepository
	userRepo          userRepo.UserRepository
	roleRepo          roleRepo.RoleRepository
	tenantRepo        tenantLookupRepository
	systemAdminRepo   systemAdminLookupRepository
	notificationRepo  notificationRepo.NotificationRepository
	auditService      audit.AuditService
	eventPublisher    infraEvents.EventPublisher
	redis             *redis.Client
}

func NewPasswordResetUsecase(
	passwordResetRepo repositories.PasswordResetRequestRepository,
	userRepo userRepo.UserRepository,
	roleRepo roleRepo.RoleRepository,
	tenantRepo tenantLookupRepository,
	systemAdminRepo systemAdminLookupRepository,
	notificationRepo notificationRepo.NotificationRepository,
	auditService audit.AuditService,
	eventPublisher infraEvents.EventPublisher,
	redisClient *redis.Client,
) PasswordResetUsecase {
	return &passwordResetUsecase{
		passwordResetRepo: passwordResetRepo,
		userRepo:          userRepo,
		roleRepo:          roleRepo,
		tenantRepo:        tenantRepo,
		systemAdminRepo:   systemAdminRepo,
		notificationRepo:  notificationRepo,
		auditService:      auditService,
		eventPublisher:    eventPublisher,
		redis:             redisClient,
	}
}

func (u *passwordResetUsecase) ForgotPassword(ctx context.Context, req *resetDto.ForgotPasswordRequest) (*resetDto.ForgotPasswordResponse, error) {
	user, err := u.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Do not reveal account existence to callers.
			return mapper.ToForgotPasswordResponse(req.Email), nil
		}
		return nil, err
	}

	_ = u.passwordResetRepo.DeleteByUserID(ctx, user.ID)

	token, err := generateSecureToken(32)
	if err != nil {
		return nil, err
	}

	resetReq := &passwordResetModels.PasswordResetRequest{
		UserID:    user.ID,
		Token:     token,
		Status:    passwordResetModels.PasswordResetStatusPending,
		ExpiresAt: apptime.Now().Add(24 * time.Hour),
	}
	if err := u.passwordResetRepo.Create(ctx, resetReq); err != nil {
		return nil, err
	}

	user.PasswordResetPending = true
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	u.invalidateUserCaches(ctx, user.ID)

	isTenantOwner, ownerCheckErr := u.isTenantOwnerRequester(ctx, user)
	if ownerCheckErr != nil {
		u.auditService.Log(ctx, "password_reset.tenant_owner_check_failed", user.ID, map[string]interface{}{
			"email": user.Email,
			"error": ownerCheckErr.Error(),
		})
	}

	var notifyErr error
	if isTenantOwner {
		notifyErr = u.notifySystemAdminPasswordResetRequest(ctx, user, token)
	} else {
		notifyErr = u.notifyAdminPasswordResetRequest(ctx, user, token)
	}

	if notifyErr != nil {
		u.auditService.Log(ctx, "password_reset.notify_admin_failed", user.ID, map[string]interface{}{
			"email": user.Email,
			"error": notifyErr.Error(),
		})
	}

	u.auditService.Log(ctx, "password_reset.forgot_password_requested", user.ID, map[string]interface{}{
		"email": user.Email,
	})

	return mapper.ToForgotPasswordResponse(req.Email), nil
}

func (u *passwordResetUsecase) ResetPassword(ctx context.Context, req *resetDto.ResetPasswordRequest) (*resetDto.ResetPasswordResponse, error) {
	resetReq, err := u.passwordResetRepo.FindByToken(ctx, req.Token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidResetToken
		}
		return nil, err
	}

	if !resetReq.IsValid() {
		if resetReq.Status == passwordResetModels.PasswordResetStatusUsed {
			return nil, ErrResetTokenAlreadyUsed
		}
		return nil, ErrResetTokenExpired
	}

	user, err := u.userRepo.FindByID(ctx, resetReq.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.Password = string(hashedPassword)
	user.PasswordResetPending = false
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	u.invalidateUserCaches(ctx, user.ID)

	usedAt := apptime.Now()
	resetReq.Status = passwordResetModels.PasswordResetStatusUsed
	resetReq.UsedAt = &usedAt
	if err := u.passwordResetRepo.Update(ctx, resetReq); err != nil {
		return nil, err
	}

	u.auditService.Log(ctx, "password_reset.password_reset", user.ID, map[string]interface{}{
		"email": user.Email,
	})

	return mapper.ToResetPasswordResponse(user.Email), nil
}

func (u *passwordResetUsecase) ValidateResetToken(ctx context.Context, token string) error {
	resetReq, err := u.passwordResetRepo.FindByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidResetToken
		}
		return err
	}

	if !resetReq.IsValid() {
		if resetReq.Status == passwordResetModels.PasswordResetStatusUsed {
			return ErrResetTokenAlreadyUsed
		}
		return ErrResetTokenExpired
	}

	return nil
}

func (u *passwordResetUsecase) notifyAdminPasswordResetRequest(ctx context.Context, user *userModels.User, token string) error {
	adminRole, err := u.roleRepo.FindByCode(ctx, "admin")
	if err != nil {
		return err
	}

	adminUsers, _, err := u.userRepo.List(ctx, &userDto.ListUsersRequest{
		Page:    1,
		PerPage: 100,
		RoleID:  adminRole.ID,
	})
	if err != nil {
		return err
	}

	notifications := make([]notificationModels.Notification, 0, len(adminUsers))
	for _, admin := range adminUsers {
		notifications = append(notifications, notificationModels.Notification{
			UserID:     admin.ID,
			TenantID:   user.TenantID,
			Type:       notificationModels.NotificationTypeInfo,
			Title:      fmt.Sprintf("Password Reset Request - %s", user.Name),
			Message:    fmt.Sprintf("User %s (%s) has requested a password reset. Token: %s (expires in 24 hours)", user.Name, user.Email, token),
			EntityType: "password_reset_request",
			EntityID:   user.ID,
			IsRead:     false,
		})
	}

	if len(notifications) == 0 {
		return nil
	}

	return u.notificationRepo.CreateBulk(ctx, notifications)
}

func (u *passwordResetUsecase) notifySystemAdminPasswordResetRequest(ctx context.Context, user *userModels.User, token string) error {
	admins, err := u.systemAdminRepo.ListActive(ctx)
	if err != nil {
		return err
	}

	notifications := make([]notificationModels.Notification, 0, len(admins))
	for _, admin := range admins {
		notifications = append(notifications, notificationModels.Notification{
			UserID:     admin.ID,
			TenantID:   user.TenantID,
			Type:       notificationModels.NotificationTypeInfo,
			Title:      fmt.Sprintf("Tenant Owner Password Reset Request - %s", user.Name),
			Message:    fmt.Sprintf("Tenant owner %s (%s) requested password reset. Token: %s (expires in 24 hours)", user.Name, user.Email, token),
			EntityType: "password_reset_request",
			EntityID:   user.ID,
			IsRead:     false,
		})
	}

	if len(notifications) == 0 {
		return nil
	}

	return u.notificationRepo.CreateBulk(ctx, notifications)
}

func (u *passwordResetUsecase) isTenantOwnerRequester(ctx context.Context, user *userModels.User) (bool, error) {
	if user == nil || strings.TrimSpace(user.TenantID) == "" {
		return false, nil
	}

	tenant, err := u.tenantRepo.FindByID(ctx, user.TenantID)
	if err != nil {
		return false, err
	}

	if tenant.OwnerUserID == nil {
		return false, nil
	}

	return strings.TrimSpace(*tenant.OwnerUserID) == strings.TrimSpace(user.ID), nil
}

func (u *passwordResetUsecase) ListTenantOwnerRequests(ctx context.Context, page, perPage int, search string) ([]resetDto.TenantOwnerPasswordResetQueueItem, int64, error) {
	rows, total, err := u.passwordResetRepo.ListPendingTenantOwner(ctx, strings.TrimSpace(search), page, perPage)
	if err != nil {
		return nil, 0, err
	}

	items := make([]resetDto.TenantOwnerPasswordResetQueueItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, resetDto.TenantOwnerPasswordResetQueueItem{
			RequestID:   row.RequestID,
			Token:       row.Token,
			UserID:      row.UserID,
			UserName:    row.UserName,
			UserEmail:   row.UserEmail,
			TenantID:    row.TenantID,
			TenantName:  row.TenantName,
			Status:      row.Status,
			RequestedAt: row.RequestedAt,
			ExpiresAt:   row.ExpiresAt,
		})
	}

	return items, total, nil
}

func (u *passwordResetUsecase) GetTenantOwnerPendingCount(ctx context.Context) (*resetDto.TenantOwnerPasswordResetPendingCountResponse, error) {
	total, err := u.passwordResetRepo.CountPendingTenantOwner(ctx)
	if err != nil {
		return nil, err
	}

	return &resetDto.TenantOwnerPasswordResetPendingCountResponse{PendingCount: total}, nil
}

func generateSecureToken(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (u *passwordResetUsecase) invalidateUserCaches(ctx context.Context, userID string) {
	if u.redis == nil {
		return
	}

	u.redis.Del(ctx, fmt.Sprintf("users:id:%s", userID))

	iter := u.redis.Scan(ctx, 0, "users:list:*", 0).Iterator()
	for iter.Next(ctx) {
		u.redis.Del(ctx, iter.Val())
	}
}
