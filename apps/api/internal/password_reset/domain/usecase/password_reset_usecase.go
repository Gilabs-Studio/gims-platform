package usecase

import (
	"bytes"
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"html/template"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	"github.com/gilabs/gims/api/internal/core/infrastructure/resend"
	passwordResetModels "github.com/gilabs/gims/api/internal/password_reset/data/models"
	"github.com/gilabs/gims/api/internal/password_reset/data/repositories"
	resetDto "github.com/gilabs/gims/api/internal/password_reset/domain/dto"
	"github.com/gilabs/gims/api/internal/password_reset/domain/mapper"
	roleRepo "github.com/gilabs/gims/api/internal/role/data/repositories"
	userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

//go:embed templates/password_reset.html
var passwordResetTemplate string

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
}

type passwordResetUsecase struct {
	passwordResetRepo repositories.PasswordResetRequestRepository
	userRepo          userRepo.UserRepository
	roleRepo          roleRepo.RoleRepository
	resendClient      *resend.Client
	auditService      audit.AuditService
	eventPublisher    infraEvents.EventPublisher
	redis             *redis.Client
}

func NewPasswordResetUsecase(
	passwordResetRepo repositories.PasswordResetRequestRepository,
	userRepo userRepo.UserRepository,
	roleRepo roleRepo.RoleRepository,
	resendClient *resend.Client,
	auditService audit.AuditService,
	eventPublisher infraEvents.EventPublisher,
	redisClient *redis.Client,
) PasswordResetUsecase {
	return &passwordResetUsecase{
		passwordResetRepo: passwordResetRepo,
		userRepo:          userRepo,
		roleRepo:          roleRepo,
		resendClient:      resendClient,
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
		ExpiresAt: apptime.Now().Add(30 * time.Minute),
	}
	if err := u.passwordResetRepo.Create(ctx, resetReq); err != nil {
		return nil, err
	}

	user.PasswordResetPending = true
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	u.invalidateUserCaches(ctx, user.ID)

	// Send reset email via Resend
	frontendBaseURL := ""
	fromEmail := "Salesview <cs@gilabs.id>"
	if config.AppConfig != nil {
		frontendBaseURL = config.AppConfig.Server.FrontendBaseURL
		if config.AppConfig.Resend.FromEmail != "" {
			fromEmail = config.AppConfig.Resend.FromEmail
		}
	}
	resetLink := fmt.Sprintf("%s/id/reset-password?token=%s", strings.TrimRight(frontendBaseURL, "/"), token)

	tmpl, err := template.New("password_reset").Parse(passwordResetTemplate)
	if err != nil {
		return nil, err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, struct {
		Name      string
		Email     string
		ResetLink string
		Year      int
	}{
		Name:      user.Name,
		Email:     user.Email,
		ResetLink: resetLink,
		Year:      apptime.Now().Year(),
	})
	if err != nil {
		return nil, err
	}
	emailHTML := body.String()

	// Since GIMS is a SaaS, we try to send to user's email.
	// In development/testing, if Resend returns sandboxed domain errors or is not set, we log it.
	if u.resendClient != nil {
		_, sendErr := u.resendClient.SendEmail(ctx, &resend.SendEmailRequest{
			From:    fromEmail,
			To:      []string{user.Email},
			Subject: "Atur Ulang Kata Sandi Salesview",
			HTML:    emailHTML,
		})

		if sendErr != nil {
			u.auditService.Log(ctx, "password_reset.send_email_failed", user.ID, map[string]interface{}{
				"email": user.Email,
				"error": sendErr.Error(),
			})
		}
	} else {
		u.auditService.Log(ctx, "password_reset.send_email_skipped", user.ID, map[string]interface{}{
			"email": user.Email,
			"note":  "Resend client is not configured",
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
