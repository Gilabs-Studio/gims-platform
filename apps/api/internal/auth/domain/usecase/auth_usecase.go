package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/crm-healthcare/api/internal/auth/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/core/events"
	infraEvents "github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/events"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	jwtManager "github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	refreshTokenModels "github.com/gilabs/crm-healthcare/api/internal/refresh_token/data/models"
	refreshTokenRepo "github.com/gilabs/crm-healthcare/api/internal/refresh_token/data/repositories"
	userRepo "github.com/gilabs/crm-healthcare/api/internal/user/data/repositories"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrUserNotFound        = errors.New("user not found")
	ErrUserInactive        = errors.New("user is inactive")
	ErrRefreshTokenInvalid = errors.New("refresh token is invalid")
	ErrRefreshTokenRevoked = errors.New("refresh token has been revoked")
	ErrRefreshTokenExpired = errors.New("refresh token has expired")
)

type AuthUsecase interface {
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*dto.LoginResponse, error)
	Logout(ctx context.Context, refreshToken string) error
}

type authUsecase struct {
	db               *gorm.DB
	userRepo         userRepo.UserRepository
	refreshTokenRepo refreshTokenRepo.RefreshTokenRepository
	jwtManager       *jwtManager.JWTManager
	eventPublisher   infraEvents.EventPublisher
}

func NewAuthUsecase(
	db *gorm.DB,
	userRepo userRepo.UserRepository,
	refreshTokenRepo refreshTokenRepo.RefreshTokenRepository,
	jwtManager *jwtManager.JWTManager,
	eventPublisher infraEvents.EventPublisher,
) AuthUsecase {
	return &authUsecase{
		db:               db,
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		jwtManager:       jwtManager,
		eventPublisher:   eventPublisher,
	}
}

func (u *authUsecase) Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error) {
	var resp *dto.LoginResponse
	
	err := u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)
		
		// Find user by email
		user, err := u.userRepo.FindByEmail(txCtx, req.Email)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrInvalidCredentials
			}
			return err
		}

		// Check if user is active
		if user.Status != "active" {
			return ErrUserInactive
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			return ErrInvalidCredentials
		}

		// Get role code and permissions
		roleCode := "user"
		roleName := "User"
		var permissions []string

		if user.Role != nil {
			roleCode = user.Role.Code
			roleName = user.Role.Name
			if user.Role.Permissions != nil {
				for _, p := range user.Role.Permissions {
					permissions = append(permissions, p.Code)
				}
			}
		}

		// Generate tokens
		accessToken, err := u.jwtManager.GenerateAccessToken(user.ID, user.Email, roleCode)
		if err != nil {
			return err
		}

		refreshToken, err := u.jwtManager.GenerateRefreshToken(user.ID)
		if err != nil {
			return err
		}

		// Extract token ID (jti) from refresh token
		tokenID, err := u.jwtManager.ExtractRefreshTokenID(refreshToken)
		if err != nil {
			return err
		}

		// Store refresh token in database
		refreshTokenEntity := &refreshTokenModels.RefreshToken{
			UserID:    user.ID,
			TokenID:   tokenID,
			ExpiresAt: time.Now().Add(u.jwtManager.RefreshTokenTTL()),
			Revoked:   false,
		}

		if err := u.refreshTokenRepo.Create(txCtx, refreshTokenEntity); err != nil {
			return err
		}

		// Calculate expires in (seconds)
		expiresIn := int(u.jwtManager.AccessTokenTTL().Seconds())

		// Convert to auth response format
		authUserResp := &dto.UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			Name:        user.Name,
			AvatarURL:   user.AvatarURL,
			Role:        roleCode,
			RoleName:    roleName,
			Permissions: permissions,
			Status:      user.Status,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}

		resp = &dto.LoginResponse{
			User:         authUserResp,
			Token:        accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    expiresIn,
		}
		
		// Publish login event (async, fire-and-forget) - done AFTER transaction commit technically, 
		// but typically events are fired within usecase. 
		// Since it's fire-and-forget, safety is fine.
		u.publishLoginEvent(ctx, user.ID, user.Email, roleCode)
		
		return nil
	})
	
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// publishLoginEvent publishes the login event asynchronously
func (u *authUsecase) publishLoginEvent(ctx context.Context, userID, email, roleCode string) {
	// Extract IP and User-Agent from context
	ipAddress := ""
	userAgent := ""
	if v := ctx.Value("client_ip"); v != nil {
		ipAddress = v.(string)
	}
	if v := ctx.Value("user_agent"); v != nil {
		userAgent = v.(string)
	}

	u.eventPublisher.PublishAsync(ctx, events.NewUserLoggedInEvent(ctx, events.UserLoggedInPayload{
		UserID:     userID,
		Email:      email,
		RoleCode:   roleCode,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		LoggedInAt: time.Now(),
	}))
}

func (u *authUsecase) RefreshToken(ctx context.Context, refreshToken string) (*dto.LoginResponse, error) {
	var resp *dto.LoginResponse
	
	err := u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)
		
		// Validate refresh token and extract user ID and token ID
		userID, tokenID, err := u.jwtManager.ValidateRefreshTokenWithID(refreshToken)
		if err != nil {
			return ErrRefreshTokenInvalid
		}

		// Check if token exists in database (Lock for UPDATE to prevent race condition during rotation)
		tokenEntity, err := u.refreshTokenRepo.FindByTokenIDForUpdate(txCtx, tokenID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRefreshTokenInvalid
			}
			return err
		}

		// Check if token is revoked
		if tokenEntity.Revoked {
			return ErrRefreshTokenRevoked
		}

		// Check if token is expired
		if tokenEntity.IsExpired() {
			return ErrRefreshTokenExpired
		}

		// Verify user ID matches
		if tokenEntity.UserID != userID {
			return ErrRefreshTokenInvalid
		}

		// Find user
		user, err := u.userRepo.FindByID(txCtx, userID)
		if err != nil {
			return ErrUserNotFound
		}

		// Check if user is active
		if user.Status != "active" {
			return ErrUserInactive
		}

		// Get role code and permissions
		roleCode := "user"
		roleName := "User"
		var permissions []string

		if user.Role != nil {
			roleCode = user.Role.Code
			roleName = user.Role.Name
			if user.Role.Permissions != nil {
				for _, p := range user.Role.Permissions {
					permissions = append(permissions, p.Code)
				}
			}
		}

		// Revoke old refresh token (token rotation)
		if err := u.refreshTokenRepo.Revoke(txCtx, tokenID); err != nil {
			return err
		}

		// Generate new tokens
		accessToken, err := u.jwtManager.GenerateAccessToken(user.ID, user.Email, roleCode)
		if err != nil {
			return err
		}

		newRefreshToken, err := u.jwtManager.GenerateRefreshToken(user.ID)
		if err != nil {
			return err
		}

		// Extract token ID (jti) from new refresh token
		newTokenID, err := u.jwtManager.ExtractRefreshTokenID(newRefreshToken)
		if err != nil {
			return err
		}

		// Store new refresh token in database
		newRefreshTokenEntity := &refreshTokenModels.RefreshToken{
			UserID:    user.ID,
			TokenID:   newTokenID,
			ExpiresAt: time.Now().Add(u.jwtManager.RefreshTokenTTL()),
			Revoked:   false,
		}

		if err := u.refreshTokenRepo.Create(txCtx, newRefreshTokenEntity); err != nil {
			return err
		}

		expiresIn := int(u.jwtManager.AccessTokenTTL().Seconds())

		// Convert to auth response format
		authUserResp := &dto.UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			Name:        user.Name,
			AvatarURL:   user.AvatarURL,
			Role:        roleCode,
			RoleName:    roleName,
			Permissions: permissions,
			Status:      user.Status,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
		}
		
		resp = &dto.LoginResponse{
			User:         authUserResp,
			Token:        accessToken,
			RefreshToken: newRefreshToken,
			ExpiresIn:    expiresIn,
		}
		
		// Publish token refresh event (async, fire-and-forget)
		u.eventPublisher.PublishAsync(ctx, events.NewTokenRefreshedEvent(ctx, events.TokenRefreshedPayload{
			UserID:      user.ID,
			OldTokenID:  tokenID,
			NewTokenID:  newTokenID,
			RefreshedAt: time.Now(),
		}))

		return nil
	})

	if err != nil {
		return nil, err
	}
	
	return resp, nil
}

func (u *authUsecase) Logout(ctx context.Context, refreshToken string) error {
	// Extract token ID from refresh token
	tokenID, err := u.jwtManager.ExtractRefreshTokenID(refreshToken)
	if err != nil {
		// If token is invalid, we can't revoke it, but we don't return error
		// This allows logout to succeed even if token is already invalid
		return nil
	}

	// Use Transaction for consistency
	return u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := database.WithTx(ctx, tx)
		
		// Revoke the token
		if err := u.refreshTokenRepo.Revoke(txCtx, tokenID); err != nil {
			return err
		}
		
		// Publish logout event (async, fire-and-forget)
		u.eventPublisher.PublishAsync(ctx, events.NewUserLoggedOutEvent(ctx, events.UserLoggedOutPayload{
			LoggedOutAt: time.Now(),
		}))
		
		return nil
	})
}
