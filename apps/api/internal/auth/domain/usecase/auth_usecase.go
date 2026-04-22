package usecase

import (
	"context"
	cryptorand "crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/auth/domain/dto"
	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/events"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	infraEvents "github.com/gilabs/gims/api/internal/core/infrastructure/events"
	jwtManager "github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	xenditClient "github.com/gilabs/gims/api/internal/core/infrastructure/xendit"
	refreshTokenModels "github.com/gilabs/gims/api/internal/refresh_token/data/models"
	refreshTokenRepo "github.com/gilabs/gims/api/internal/refresh_token/data/repositories"
	couponUC "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrUserNotFound              = errors.New("user not found")
	ErrUserInactive              = errors.New("user is inactive")
	ErrRefreshTokenInvalid       = errors.New("refresh token is invalid")
	ErrRefreshTokenRevoked       = errors.New("refresh token has been revoked")
	ErrRefreshTokenExpired       = errors.New("refresh token has expired")
	ErrEmailAlreadyTaken         = errors.New("email already registered")
	ErrSlugAlreadyTaken          = errors.New("organization slug already taken")
	ErrPaymentRequired           = errors.New("payment or valid coupon required to register")
	ErrPaymentGatewayUnavailable = errors.New("payment gateway is not configured")
	ErrCouponInvalid             = errors.New("coupon is invalid, inactive, or exhausted")
	ErrCouponAlreadyUsed         = errors.New("coupon already used by this email")
)

// pendingRegTTL is how long a pending (awaiting payment) registration is kept in Redis.
const pendingRegTTL = 24 * time.Hour

// pendingRegKeyPrefix is the Redis key prefix for pending registrations.
const pendingRegKeyPrefix = "pending_reg:"

// PendingRegistration is the Redis payload for a registration that awaits Xendit payment.
type PendingRegistration struct {
	Name          string `json:"name"`
	Email         string `json:"email"`
	HashedPwd     string `json:"hashed_pwd"`
	CompanyName   string `json:"company_name"`
	Plan          string `json:"plan"`
	BillingPeriod string `json:"billing_period"`
	UserCount     int    `json:"user_count"`
	InvoiceID     string `json:"invoice_id"`
	CreatedAt     string `json:"created_at"`
}

// RegisterTenantResult wraps the two possible outcomes of RegisterTenant:
//   - Immediate: coupon flow — LoginResponse is set.
//   - Deferred: paid plan flow — InvoiceResponse is set and RequiresPayment is true.
type RegisterTenantResult struct {
	RequiresPayment bool
	LoginResponse   *dto.LoginResponse
	InvoiceResponse *dto.RegisterInitResponse
}

type AuthUsecase interface {
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*dto.LoginResponse, error)
	Logout(ctx context.Context, refreshToken string) error
	// RegisterTenant creates a new tenant and provisions an admin account for self-service sign-up.
	// When using a paid plan, it creates a Xendit invoice instead of immediate provisioning.
	RegisterTenant(ctx context.Context, req *dto.RegisterTenantRequest) (*RegisterTenantResult, error)
	// CompletePendingRegistration is called by the Xendit webhook after successful payment.
	// token is the UUID stored in the Xendit external_id / Redis key.
	CompletePendingRegistration(ctx context.Context, token string) error
}

type authUsecase struct {
	db               *gorm.DB
	userRepo         userRepo.UserRepository
	refreshTokenRepo refreshTokenRepo.RefreshTokenRepository
	jwtManager       *jwtManager.JWTManager
	eventPublisher   infraEvents.EventPublisher
	couponUC         couponUC.CouponUsecase
	redis            *redis.Client
	xendit           *xenditClient.Client
}

func NewAuthUsecase(
	db *gorm.DB,
	userRepo userRepo.UserRepository,
	refreshTokenRepo refreshTokenRepo.RefreshTokenRepository,
	jwtManager *jwtManager.JWTManager,
	eventPublisher infraEvents.EventPublisher,
	couponUC couponUC.CouponUsecase,
	redisClient *redis.Client,
) AuthUsecase {
	var xc *xenditClient.Client
	if config.AppConfig != nil {
		xc = xenditClient.NewClient(
			config.AppConfig.Xendit.SecretKey,
			config.AppConfig.Xendit.BaseURL,
		)
	}
	return &authUsecase{
		db:               db,
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		jwtManager:       jwtManager,
		eventPublisher:   eventPublisher,
		couponUC:         couponUC,
		redis:            redisClient,
		xendit:           xc,
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
// Access gate (one required):
//   - coupon: a promotional code that grants a trial TenantSubscription
//   - plan + billing_period: a paid subscription handled via Xendit invoice
func (u *authUsecase) RegisterTenant(ctx context.Context, req *dto.RegisterTenantRequest) (*RegisterTenantResult, error) {
	couponCode := strings.TrimSpace(req.Coupon)
	plan := strings.TrimSpace(req.Plan)

	// ── Gate: require either coupon or plan ─────────────────────────────────
	if couponCode == "" && plan == "" {
		return nil, ErrPaymentRequired
	}

	// ── Coupon path: validate first for fast feedback ────────────────────────
	if couponCode != "" {
		validity, err := u.couponUC.ValidateForEmail(ctx, couponCode, req.Email)
		if err != nil {
			return nil, err
		}
		if !validity.Valid {
			if validity.Reason == "already_used_by_email" {
				return nil, ErrCouponAlreadyUsed
			}
			return nil, ErrCouponInvalid
		}
	}

	// ── Paid plan path: create Xendit invoice + store pending registration ───
	if couponCode == "" && plan != "" {
		return u.initPaidRegistration(ctx, req)
	}

	// ── Coupon path: provision tenant immediately ────────────────────────────
	loginResp, err := u.provisionTenantWithCoupon(ctx, req, couponCode)
	if err != nil {
		return nil, err
	}
	return &RegisterTenantResult{LoginResponse: loginResp}, nil
}

// initPaidRegistration creates a Xendit invoice for the selected plan, stores the
// pending registration in Redis, and returns the invoice URL for the frontend redirect.
func (u *authUsecase) initPaidRegistration(ctx context.Context, req *dto.RegisterTenantRequest) (*RegisterTenantResult, error) {
	if u.xendit == nil || !u.xendit.IsConfigured() {
		return nil, ErrPaymentGatewayUnavailable
	}

	// Hash password early — we store it in Redis so the webhook can complete registration.
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	companyName := strings.TrimSpace(req.CompanyName)
	if companyName == "" {
		companyName = req.Name
	}

	// Generate a unique registration token (used as Xendit external_id and Redis key).
	token := newUUID()

	billingPeriod := req.BillingPeriod
	if billingPeriod == "" {
		billingPeriod = "monthly"
	}

	userCount := req.UserCount
	if userCount < 1 {
		userCount = 1
	}
	amount := planTotalPriceIDR(req.Plan, billingPeriod, userCount)
	frontendBaseURL := ""
	if config.AppConfig != nil {
		frontendBaseURL = config.AppConfig.Server.FrontendBaseURL
	}

	invoice, err := u.xendit.CreateInvoice(ctx, xenditClient.CreateInvoiceRequest{
		ExternalID:         token,
		Amount:             amount,
		PayerEmail:         req.Email,
		Description:        fmt.Sprintf("GIMS %s (%s) for %d user(s) — %s", req.Plan, billingPeriod, userCount, companyName),
		SuccessRedirectURL: frontendBaseURL + "/register/success?token=" + token,
		FailureRedirectURL: frontendBaseURL + "/register?status=failed",
		Currency:           "IDR",
		InvoiceDuration:    86400,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create payment invoice: %w", err)
	}

	// Persist pending registration in Redis with a 24-hour TTL.
	pending := PendingRegistration{
		Name:          req.Name,
		Email:         req.Email,
		HashedPwd:     string(hashed),
		CompanyName:   companyName,
		Plan:          req.Plan,
		BillingPeriod: billingPeriod,
		UserCount:     userCount,
		InvoiceID:     invoice.ID,
		CreatedAt:     apptime.Now().Format(time.RFC3339),
	}
	pendingJSON, err := json.Marshal(pending)
	if err != nil {
		return nil, err
	}
	if err := u.redis.Set(ctx, pendingRegKeyPrefix+token, string(pendingJSON), pendingRegTTL).Err(); err != nil {
		return nil, fmt.Errorf("failed to store pending registration: %w", err)
	}

	return &RegisterTenantResult{
		RequiresPayment: true,
		InvoiceResponse: &dto.RegisterInitResponse{
			InvoiceURL: invoice.InvoiceURL,
			InvoiceID:  invoice.ID,
			ExpiresAt:  invoice.ExpiryDate.Format(time.RFC3339),
		},
	}, nil
}

// CompletePendingRegistration is triggered by the Xendit webhook after a successful
// payment. It retrieves the pending registration from Redis and provisions the tenant.
func (u *authUsecase) CompletePendingRegistration(ctx context.Context, token string) error {
	key := pendingRegKeyPrefix + token
	val, err := u.redis.Get(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("pending registration not found or expired")
	}

	var pending PendingRegistration
	if err := json.Unmarshal([]byte(val), &pending); err != nil {
		return fmt.Errorf("corrupted pending registration data")
	}

	// Provision tenant using the stored data.
	syntheticReq := &dto.RegisterTenantRequest{
		Name:          pending.Name,
		Email:         pending.Email,
		Password:      "__pre-hashed__", // Signal to skip re-hashing
		CompanyName:   pending.CompanyName,
		Plan:          pending.Plan,
		BillingPeriod: pending.BillingPeriod,
	}

	_, err = u.provisionTenantForPaidPlan(ctx, syntheticReq, pending.HashedPwd)
	if err != nil {
		return fmt.Errorf("tenant provisioning after payment failed: %w", err)
	}

	// Remove the pending registration key to prevent double-provisioning.
	u.redis.Del(ctx, key)
	return nil
}

// planTotalPriceIDR returns the total invoice amount in IDR for the selected plan,
// billing period, and number of users.
//
// Pricing model: all plans are per-user. Bundle plans are intentionally cheaper
// per-user than individual modules to create a decoy pricing effect — customers
// who compare individual modules against bundles will see the bundle as the clear winner.
//
// Yearly billing applies a 10% annual discount.
//
// TODO(restrict-api-by-plan): After MVP, enforce plan-based API access gating here.
// Current implementation: all paid plans grant full platform access.
// Future: each plan ID should restrict which modules/routes are accessible.
// Reference: docs/erp-sprint-planning.md — "Subscription tier API gating" task.
func planTotalPriceIDR(plan, billingPeriod string, userCount int) int64 {
	if userCount < 1 {
		userCount = 1
	}
	// Per-user monthly prices in IDR.
	// Modular plans are priced higher per-user so that bundles are always a better deal.
	perUserMonthly := map[string]int64{
		// ── Bundles (decoy anchors – best value) ──────────────────────────
		"growth_suite":   149_000, // POS + ERP + CRM
		"ultimate_suite": 175_000, // All modules (POS + ERP + CRM + HR)
		// ── POS ──────────────────────────────────────────────────────────
		"pos_essential":  149_000,
		"pos_growth":     199_000,
		"pos_enterprise": 299_000,
		// ── ERP ──────────────────────────────────────────────────────────
		"erp_core":       299_000,
		"erp_pro":        399_000,
		"erp_enterprise": 599_000,
		// ── CRM ──────────────────────────────────────────────────────────
		"crm_basic":      99_000,
		"crm_growth":     149_000,
		"crm_enterprise": 199_000,
		// ── HR ───────────────────────────────────────────────────────────
		"hr_basic":      49_000,
		"hr_growth":     79_000,
		"hr_enterprise": 119_000,
		// ── Legacy full-access (coupon-based, not sold via Xendit) ───────
		"full_access": 175_000,
	}
	perUser, ok := perUserMonthly[strings.ToLower(plan)]
	if !ok {
		perUser = 175_000 // Safe default — ultimate_suite price
	}
	total := perUser * int64(userCount)
	if billingPeriod == "yearly" {
		// 10% annual discount; charge the full year up-front.
		total = int64(float64(total*12) * 0.9)
	}
	return total
}

// provisionTenantWithCoupon runs the coupon-based tenant provisioning flow.
func (u *authUsecase) provisionTenantWithCoupon(ctx context.Context, req *dto.RegisterTenantRequest, couponCode string) (*dto.LoginResponse, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	resp, err := u.provisionTenantForPaidPlan(ctx, req, string(hashed))
	if err != nil {
		return nil, err
	}

	// Redeem coupon AFTER the tenant transaction commits to avoid holding the row lock
	// while expensive user/tenant inserts run. Failure is non-fatal for UX.
	if couponCode != "" {
		if _, redeemErr := u.couponUC.RedeemForTenant(ctx, couponCode, req.Email, resp.User.TenantID); redeemErr != nil {
			_ = redeemErr
		}
	}

	return resp, nil
}

// provisionTenantForPaidPlan creates the tenant, company, onboarding record, and admin
// user inside a single DB transaction and returns the auth tokens.
// hashedPwd must be a bcrypt hash of the user's password.
func (u *authUsecase) provisionTenantForPaidPlan(ctx context.Context, req *dto.RegisterTenantRequest, hashedPwd string) (*dto.LoginResponse, error) {
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

		companyName := strings.TrimSpace(req.CompanyName)
		if companyName == "" {
			companyName = req.Name
		}

		slug := slugify(companyName)

		var slugCount int64
		if err := tx.Table("tenants").Where("slug = ?", slug).Count(&slugCount).Error; err != nil {
			return err
		}
		if slugCount > 0 {
			slug = slug + "-" + shortID()
		}

		tenantID := newUUID()
		userID := newUUID()

		if err := tx.Exec(`
			INSERT INTO tenants (id, name, slug, owner_user_id, status, plan, max_users, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'active', 'trial', 999, NOW(), NOW())`,
			tenantID, companyName, slug, userID,
		).Error; err != nil {
			return err
		}

		companyID := newUUID()
		if err := tx.Exec(`
			INSERT INTO companies (id, tenant_id, name, timezone, status, is_approved, is_active, created_at, updated_at)
			VALUES (?, ?, ?, 'Asia/Jakarta', 'approved', true, true, NOW(), NOW())`,
			companyID, tenantID, companyName,
		).Error; err != nil {
			_ = err
		}

		if err := tx.Exec(`
			INSERT INTO tenant_onboardings (id, tenant_id, business_type, completed, created_at, updated_at)
			VALUES (gen_random_uuid(), ?, '', false, NOW(), NOW())`,
			tenantID,
		).Error; err != nil {
			_ = err
		}

		avatarURL := "https://api.dicebear.com/7.x/lorelei/svg?seed=" + req.Email

		if err := tx.Exec(`
			INSERT INTO users (id, tenant_id, email, password, name, avatar_url, role_id, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM roles WHERE code = 'admin' LIMIT 1), 'active', NOW(), NOW())`,
			userID, tenantID, req.Email, hashedPwd, req.Name, avatarURL,
		).Error; err != nil {
			return err
		}

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
				TenantName:    companyName,
			},
			Token:        accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    int(u.jwtManager.AccessTokenTTL().Seconds()),
		}

		return nil
	})

	return resp, err
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
