package usecase

import (
	"context"
	cryptorand "crypto/rand"
	"errors"
	"fmt"

	"github.com/gilabs/gims/api/internal/auth/domain/dto"
	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/events"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	jwtManager "github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	refreshTokenModels "github.com/gilabs/gims/api/internal/refresh_token/data/models"
	refreshTokenRepo "github.com/gilabs/gims/api/internal/refresh_token/data/repositories"
	userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
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
	ErrEmailAlreadyTaken   = errors.New("email already registered")
	ErrSlugAlreadyTaken    = errors.New("organization slug already taken")
)

type AuthUsecase interface {
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*dto.LoginResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	// RegisterTenant creates a new tenant and provisions an admin account for self-service sign-up.
	// The returned LoginResponse can be used to immediately log the user in.
	// TODO(future): Accept a package/tier parameter once batch billing is implemented.
	RegisterTenant(ctx context.Context, req *dto.RegisterTenantRequest) (*dto.LoginResponse, error)
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

		// Get role code and permissions with scope
		roleCode := "user"
		roleName := "User"
		roleDataScope := "OWN"
		permissions := make(map[string]string)

		if user.Role != nil {
			roleCode = user.Role.Code
			roleName = user.Role.Name
			roleDataScope = user.Role.DataScope
			if roleDataScope == "" {
				roleDataScope = "ALL"
			}

			// Prefer RolePermissions (scope-aware) over legacy Permissions
			if len(user.Role.RolePermissions) > 0 {
				for _, rp := range user.Role.RolePermissions {
					if rp.Permission != nil && rp.Permission.Code != "" {
						scope := rp.Scope
						if scope == "" {
							scope = "ALL"
						}
						permissions[rp.Permission.Code] = scope
					}
				}
			} else if user.Role.Permissions != nil {
				// Backward compatibility fallback
				for _, p := range user.Role.Permissions {
					permissions[p.Code] = "ALL"
				}
			}
		}

		// Generate tokens — embed tenant_id so AuthMiddleware can scope queries without a DB lookup
		accessToken, err := u.jwtManager.GenerateAccessToken(user.ID, user.Email, roleCode, user.TenantID)
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
			ExpiresAt: apptime.Now().Add(u.jwtManager.RefreshTokenTTL()),
			Revoked:   false,
		}

		if err := u.refreshTokenRepo.Create(txCtx, refreshTokenEntity); err != nil {
			return err
		}

		// Calculate expires in (seconds)
		expiresIn := int(u.jwtManager.AccessTokenTTL().Seconds())

		// Resolve Employee ID
		var employeeID string
		_ = u.db.Table("employees").Select("id").Where("user_id = ? AND deleted_at IS NULL", user.ID).Row().Scan(&employeeID)

		// Resolve Tenant name for SaaS context display
		var tenantID, tenantName string
		u.db.Table("users").Select("tenant_id").Where("id = ?", user.ID).Row().Scan(&tenantID)
		if tenantID != "" {
			u.db.Table("tenants").Select("name").Where("id = ?", tenantID).Row().Scan(&tenantName)
		}

		// Convert to auth response format
		authUserResp := &dto.UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			AvatarURL:     user.AvatarURL,
			EmployeeID:    employeeID,
			Role:          roleCode,
			RoleName:      roleName,
			RoleDataScope: roleDataScope,
			Permissions:   permissions,
			Status:        user.Status,
			CreatedAt:     user.CreatedAt,
			UpdatedAt:     user.UpdatedAt,
			TenantID:      tenantID,
			TenantName:    tenantName,
		}

		resp = &dto.LoginResponse{
			User:         authUserResp,
			Token:        accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    expiresIn,
		}
		
		// Publish login event (async, fire-and-forget)
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
		LoggedInAt: apptime.Now(),
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

		// Get role code and permissions with scope
		roleCode := "user"
		roleName := "User"
		roleDataScope := "OWN"
		permissions := make(map[string]string)

		if user.Role != nil {
			roleCode = user.Role.Code
			roleName = user.Role.Name
			roleDataScope = user.Role.DataScope
			if roleDataScope == "" {
				roleDataScope = "ALL"
			}

			// Prefer RolePermissions (scope-aware) over legacy Permissions
			if len(user.Role.RolePermissions) > 0 {
				for _, rp := range user.Role.RolePermissions {
					if rp.Permission != nil && rp.Permission.Code != "" {
						scope := rp.Scope
						if scope == "" {
							scope = "ALL"
						}
						permissions[rp.Permission.Code] = scope
					}
				}
			} else if user.Role.Permissions != nil {
				for _, p := range user.Role.Permissions {
					permissions[p.Code] = "ALL"
				}
			}
		}

		// Revoke old refresh token (token rotation)
		if err := u.refreshTokenRepo.Revoke(txCtx, tokenID); err != nil {
			return err
		}

		// Generate new tokens — embed tenant_id so AuthMiddleware can scope queries without a DB lookup
		accessToken, err := u.jwtManager.GenerateAccessToken(user.ID, user.Email, roleCode, user.TenantID)
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
			ExpiresAt: apptime.Now().Add(u.jwtManager.RefreshTokenTTL()),
			Revoked:   false,
		}

		if err := u.refreshTokenRepo.Create(txCtx, newRefreshTokenEntity); err != nil {
			return err
		}

		expiresIn := int(u.jwtManager.AccessTokenTTL().Seconds())

		// Resolve Employee ID
		var employeeID string
		_ = u.db.Table("employees").Select("id").Where("user_id = ? AND deleted_at IS NULL", user.ID).Row().Scan(&employeeID)

		// Resolve Tenant name for SaaS context display
		var tenantID, tenantName string
		u.db.Table("users").Select("tenant_id").Where("id = ?", user.ID).Row().Scan(&tenantID)
		if tenantID != "" {
			u.db.Table("tenants").Select("name").Where("id = ?", tenantID).Row().Scan(&tenantName)
		}

		// Convert to auth response format
		authUserResp := &dto.UserResponse{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			AvatarURL:     user.AvatarURL,
			EmployeeID:    employeeID,
			Role:          roleCode,
			RoleName:      roleName,
			RoleDataScope: roleDataScope,
			Permissions:   permissions,
			Status:        user.Status,
			CreatedAt:     user.CreatedAt,
			UpdatedAt:     user.UpdatedAt,
			TenantID:      tenantID,
			TenantName:    tenantName,
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
			RefreshedAt: apptime.Now(),
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
			LoggedOutAt: apptime.Now(),
		}))
		
		return nil
	})
}

// RegisterTenant provisions a brand-new tenant and an enterprise-level admin account
// in a single atomic transaction, then immediately returns a valid JWT so the caller
// can start using the platform without a separate login step.
//
// TODO(future): Accept a plan/package parameter and enforce billing limits once the
//
//	batch billing system is implemented. Currently every registration receives the
//	"enterprise" plan with no user cap.
func (u *authUsecase) RegisterTenant(ctx context.Context, req *dto.RegisterTenantRequest) (*dto.LoginResponse, error) {
	var resp *dto.LoginResponse

	err := u.db.Transaction(func(tx *gorm.DB) error {
		// Guard: reject if email is already registered
		var existingCount int64
		if err := tx.Table("users").Where("email = ? AND deleted_at IS NULL", req.Email).Count(&existingCount).Error; err != nil {
			return err
		}
		if existingCount > 0 {
			return ErrEmailAlreadyTaken
		}

		// Derive a URL-safe slug from the company name (lowercase, replace spaces with hyphens)
		slug := slugify(req.CompanyName)

		// Guard: reject if slug collides with an existing tenant
		var slugCount int64
		if err := tx.Table("tenants").Where("slug = ?", slug).Count(&slugCount).Error; err != nil {
			return err
		}
		if slugCount > 0 {
			slug = slug + "-" + shortID()
		}

		tenantID := newUUID()
		userID := newUUID()

		// 1. Create the tenant record
		// TODO(future): replace hard-coded enterprise plan with a plan parameter
		//               and enforce MaxUsers / feature flags per package tier.
		if err := tx.Exec(`
			INSERT INTO tenants (id, name, slug, owner_user_id, status, plan, max_users, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'active', 'enterprise', 999, NOW(), NOW())`,
			tenantID, req.CompanyName, slug, userID,
		).Error; err != nil {
			return err
		}

		// 2. Hash password
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		avatarURL := "https://api.dicebear.com/7.x/lorelei/svg?seed=" + req.Email

		// 3. Create the admin user scoped to the new tenant
		// The admin role (code="admin") is platform-wide — no per-tenant role provisioning needed.
		// roles/menus/permissions repositories bypass tenant scoping intentionally.
		if err := tx.Exec(`
			INSERT INTO users (id, tenant_id, email, password, name, avatar_url, role_id, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM roles WHERE code = 'admin' LIMIT 1), 'active', NOW(), NOW())`,
			userID, tenantID, req.Email, string(hashed), req.Name, avatarURL,
		).Error; err != nil {
			return err
		}

		// 4. Resolve the admin role code and permissions for the JWT / response
		roleCode := "admin"
		roleName := "Admin"
		roleDataScope := "ALL"
		permissions := make(map[string]string)

		type rolePermRow struct {
			Code  string
			Scope string
		}
		var rolePerms []rolePermRow
		tx.Raw(`
			SELECT p.code, COALESCE(rp.scope, 'ALL') AS scope
			FROM role_permissions rp
			JOIN permissions p ON p.id = rp.permission_id
			JOIN roles r ON r.id = rp.role_id
			WHERE r.code = 'admin'
		`).Scan(&rolePerms)
		for _, rp := range rolePerms {
			permissions[rp.Code] = rp.Scope
		}

		// 5. Generate JWT with the new tenant_id embedded
		accessToken, err := u.jwtManager.GenerateAccessToken(userID, req.Email, roleCode, tenantID)
		if err != nil {
			return err
		}

		refreshToken, err := u.jwtManager.GenerateRefreshToken(userID)
		if err != nil {
			return err
		}

		tokenID, err := u.jwtManager.ExtractRefreshTokenID(refreshToken)
		if err != nil {
			return err
		}

		if err := tx.Exec(`
			INSERT INTO refresh_tokens (id, user_id, token_id, expires_at, revoked, created_at, updated_at)
			VALUES (gen_random_uuid(), ?, ?, ?, false, NOW(), NOW())`,
			userID, tokenID, apptime.Now().Add(u.jwtManager.RefreshTokenTTL()),
		).Error; err != nil {
			return err
		}

		resp = &dto.LoginResponse{
			User: &dto.UserResponse{
				ID:            userID,
				Email:         req.Email,
				Name:          req.Name,
				AvatarURL:     avatarURL,
				Role:          roleCode,
				RoleName:      roleName,
				RoleDataScope: roleDataScope,
				Permissions:   permissions,
				Status:        "active",
				TenantID:      tenantID,
				TenantName:    req.CompanyName,
			},
			Token:        accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    int(u.jwtManager.AccessTokenTTL().Seconds()),
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return resp, nil
}

// slugify converts a human-readable string into a URL-safe slug.
func slugify(s string) string {
	result := make([]rune, 0, len(s))
	prev := '-'
	for _, r := range []rune(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			result = append(result, r)
			prev = r
		} else if r >= 'A' && r <= 'Z' {
			result = append(result, r+32)
			prev = r + 32
		} else if prev != '-' {
			result = append(result, '-')
			prev = '-'
		}
	}
	// Trim trailing hyphen
	for len(result) > 0 && result[len(result)-1] == '-' {
		result = result[:len(result)-1]
	}
	return string(result)
}

// newUUID generates a random UUID v4.
func newUUID() string {
	b := make([]byte, 16)
	_, _ = cryptorand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// shortID returns a 6-character hex string for slug disambiguation.
func shortID() string {
	b := make([]byte, 3)
	_, _ = cryptorand.Read(b)
	return fmt.Sprintf("%x", b)
}
