package usecase

import (
	"context"
	cryptorand "crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
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
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	planRepo "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	tenantPolicy "github.com/gilabs/gims/api/internal/tenant/domain/policy"
	couponUC "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	userRepo "github.com/gilabs/gims/api/internal/user/data/repositories"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrInvalidCredentials             = errors.New("invalid credentials")
	ErrUserNotFound                   = errors.New("user not found")
	ErrUserInactive                   = errors.New("user is inactive")
	ErrRefreshTokenInvalid            = errors.New("refresh token is invalid")
	ErrRefreshTokenRevoked            = errors.New("refresh token has been revoked")
	ErrRefreshTokenExpired            = errors.New("refresh token has expired")
	ErrEmailAlreadyTaken              = errors.New("email already registered")
	ErrSlugAlreadyTaken               = errors.New("organization slug already taken")
	ErrPaymentRequired                = errors.New("payment or valid coupon required to register")
	ErrPaymentGatewayUnavailable      = errors.New("payment gateway is not configured")
	ErrCouponInvalid                  = errors.New("coupon is invalid, inactive, or exhausted")
	ErrCouponAlreadyUsed              = errors.New("coupon already used by this email")
	ErrPendingRegistrationNotFound    = errors.New("pending registration not found or expired")
	ErrPendingRegistrationDataInvalid = errors.New("pending registration data is invalid")
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
	CouponCode    string `json:"coupon_code,omitempty"`
	AmountPaid    int64  `json:"amount_paid"`
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
	// ConfirmPendingRegistration is called by frontend after payment redirect to
	// finalize provisioning and immediately return a logged-in session.
	ConfirmPendingRegistration(ctx context.Context, token string) (*dto.LoginResponse, error)
	// HandleRecurringRenewal is called by the Xendit webhook when a recurring invoice
	// is paid. It extends the tenant's subscription next billing date.
	HandleRecurringRenewal(ctx context.Context, xenditInvoiceID string) error
}

type authUsecase struct {
	db               *gorm.DB
	userRepo         userRepo.UserRepository
	refreshTokenRepo refreshTokenRepo.RefreshTokenRepository
	jwtManager       *jwtManager.JWTManager
	eventPublisher   infraEvents.EventPublisher
	couponUC         couponUC.CouponUsecase
	planRepo         planRepo.SubscriptionPlanRepository
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
	subscriptionPlanRepo planRepo.SubscriptionPlanRepository,
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
		planRepo:         subscriptionPlanRepo,
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
		isOwner := false
		permissions := make(map[string]string)

		if user.Role != nil {
			roleCode = user.Role.Code
			roleName = user.Role.Name
			roleDataScope = user.Role.DataScope
			// is_protected=true is exclusively set on the auto-generated tenant owner role;
			// use this flag instead of string-matching on role codes.
			isOwner = user.Role.IsProtected
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
			ID:               user.ID,
			Email:            user.Email,
			Name:             user.Name,
			AvatarURL:        user.AvatarURL,
			EmployeeID:       employeeID,
			Role:             roleCode,
			RoleName:         roleName,
			RoleDataScope:    roleDataScope,
			IsOwner:          isOwner,
			Permissions:      permissions,
			Status:           user.Status,
			CreatedAt:        user.CreatedAt,
			UpdatedAt:        user.UpdatedAt,
			TenantID:         tenantID,
			TenantName:       tenantName,
			SubscriptionPlan: activePlanForTenant(u.db, tenantID),
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

		// Determine is_owner from role.is_protected flag (owner role is always protected)
		refreshIsOwner := user.Role != nil && user.Role.IsProtected

		// Convert to auth response format
		authUserResp := &dto.UserResponse{
			ID:               user.ID,
			Email:            user.Email,
			Name:             user.Name,
			AvatarURL:        user.AvatarURL,
			EmployeeID:       employeeID,
			Role:             roleCode,
			RoleName:         roleName,
			RoleDataScope:    roleDataScope,
			IsOwner:          refreshIsOwner,
			Permissions:      permissions,
			Status:           user.Status,
			CreatedAt:        user.CreatedAt,
			UpdatedAt:        user.UpdatedAt,
			TenantID:         tenantID,
			TenantName:       tenantName,
			SubscriptionPlan: activePlanForTenant(u.db, tenantID),
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

	// Resolve price from DB-driven plan config.
	baseAmount, err := u.resolvePlanPrice(ctx, req.Plan, billingPeriod, userCount)
	if err != nil {
		return nil, err
	}

	// Apply coupon discount when a non-trial coupon is included.
	couponCode := strings.TrimSpace(req.Coupon)
	finalAmount := baseAmount
	if couponCode != "" {
		discounted, applyErr := u.couponUC.ApplyDiscount(ctx, couponCode, req.Plan, baseAmount)
		if applyErr == nil {
			finalAmount = discounted
		}
		// If trial coupon (amount=0), route to coupon path instead of paid path.
		if finalAmount == 0 {
			return u.handleZeroAmountCouponRegistration(ctx, req, couponCode)
		}
	}

	frontendBaseURL := ""
	if config.AppConfig != nil {
		frontendBaseURL = config.AppConfig.Server.FrontendBaseURL
	}

	invoice, err := u.xendit.CreateInvoice(ctx, xenditClient.CreateInvoiceRequest{
		ExternalID:         token,
		Amount:             finalAmount,
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
		CouponCode:    couponCode,
		AmountPaid:    finalAmount,
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

// resolvePlanPrice looks up plan price from DB config.
func (u *authUsecase) resolvePlanPrice(ctx context.Context, planSlug, billingPeriod string, userCount int) (int64, error) {
	if u.planRepo == nil {
		return 0, ErrPaymentGatewayUnavailable
	}

	plan, err := u.planRepo.FindBySlug(ctx, planSlug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrPaymentRequired
		}
		return 0, err
	}

	return plan.TotalPriceIDR(billingPeriod, userCount), nil
}

// handleZeroAmountCouponRegistration routes a discount coupon that results in 0 IDR
// through the coupon (trial) provisioning path instead of creating a payment invoice.
func (u *authUsecase) handleZeroAmountCouponRegistration(ctx context.Context, req *dto.RegisterTenantRequest, couponCode string) (*RegisterTenantResult, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	resp, err := u.provisionTenantForPaidPlan(ctx, req, string(hashed))
	if err != nil {
		return nil, err
	}
	// Redeem coupon usage after provisioning.
	_, _ = u.couponUC.RedeemForTenant(ctx, couponCode, req.Email, resp.User.TenantID)
	return &RegisterTenantResult{LoginResponse: resp}, nil
}

// CompletePendingRegistration is triggered by the Xendit webhook after a successful
// payment. It retrieves the pending registration from Redis, provisions the tenant,
// and creates the paid TenantSubscription record.
func (u *authUsecase) CompletePendingRegistration(ctx context.Context, token string) error {
	_, err := u.completePendingRegistrationInternal(ctx, token)
	return err
}

func (u *authUsecase) ConfirmPendingRegistration(ctx context.Context, token string) (*dto.LoginResponse, error) {
	return u.completePendingRegistrationInternal(ctx, token)
}

func (u *authUsecase) completePendingRegistrationInternal(ctx context.Context, token string) (*dto.LoginResponse, error) {
	if u.redis == nil {
		return nil, ErrPendingRegistrationNotFound
	}

	key := pendingRegKeyPrefix + token
	val, err := u.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, ErrPendingRegistrationNotFound
	}

	var pending PendingRegistration
	if err := json.Unmarshal([]byte(val), &pending); err != nil {
		return nil, ErrPendingRegistrationDataInvalid
	}

	// Provision tenant using the stored data.
	syntheticReq := &dto.RegisterTenantRequest{
		Name:          pending.Name,
		Email:         pending.Email,
		Password:      "__pre-hashed__", // Signal to skip re-hashing
		CompanyName:   pending.CompanyName,
		Plan:          pending.Plan,
		BillingPeriod: pending.BillingPeriod,
		UserCount:     pending.UserCount,
	}

	loginResp, err := u.provisionTenantForPaidPlan(ctx, syntheticReq, pending.HashedPwd)
	if err != nil {
		return nil, fmt.Errorf("tenant provisioning after payment failed: %w", err)
	}

	// Create the TenantSubscription record to track the paid plan and Xendit invoice.
	tenantID := loginResp.User.TenantID
	now := apptime.Now()
	// Monthly billing next cycle; yearly billing is 12 months out.
	nextBilling := now.AddDate(0, 1, 0)
	if pending.BillingPeriod == "yearly" {
		nextBilling = now.AddDate(1, 0, 0)
	}
	xenditInvoiceID := pending.InvoiceID
	userCount := pending.UserCount
	if userCount < 1 {
		userCount = 1
	}
	sub := &tenantModels.TenantSubscription{
		TenantID:        tenantID,
		Plan:            tenantModels.SubscriptionPlan(pending.Plan),
		BillingPeriod:   tenantModels.SubscriptionBillingPeriod(pending.BillingPeriod),
		Status:          tenantModels.SubscriptionActive,
		StartsAt:        now,
		AmountPaidIDR:   pending.AmountPaid,
		UserCount:       userCount,
		XenditInvoiceID: &xenditInvoiceID,
		NextBillingAt:   &nextBilling,
		Notes:           fmt.Sprintf("Paid via Xendit invoice %s", xenditInvoiceID),
	}
	if pending.CouponCode != "" {
		sub.Notes += fmt.Sprintf(" (coupon: %s)", pending.CouponCode)
	}
	if err := u.ensureSubscriptionRecord(ctx, sub); err != nil {
		return nil, fmt.Errorf("failed to persist subscription record: %w", err)
	}

	// Remove the pending registration key to prevent double-provisioning.
	if err := u.redis.Del(ctx, key).Err(); err != nil {
		return nil, fmt.Errorf("failed to finalize pending registration: %w", err)
	}

	return loginResp, nil
}

func (u *authUsecase) ensureSubscriptionRecord(ctx context.Context, sub *tenantModels.TenantSubscription) error {
	if sub == nil {
		return nil
	}

	if sub.XenditInvoiceID != nil && *sub.XenditInvoiceID != "" {
		var invoiceCount int64
		if err := u.db.WithContext(ctx).
			Table("tenant_subscriptions").
			Where("xendit_invoice_id = ? AND deleted_at IS NULL", *sub.XenditInvoiceID).
			Count(&invoiceCount).Error; err != nil {
			return err
		}
		if invoiceCount > 0 {
			return nil
		}
	}

	return u.db.WithContext(ctx).Create(sub).Error
}

// HandleRecurringRenewal is called by the Xendit webhook when a recurring (subscription)
// invoice is paid. It locates the TenantSubscription by XenditInvoiceID and advances
// the next billing date by one billing cycle.
func (u *authUsecase) HandleRecurringRenewal(ctx context.Context, xenditInvoiceID string) error {
	var sub tenantModels.TenantSubscription
	err := u.db.WithContext(ctx).
		Where("xendit_invoice_id = ? AND deleted_at IS NULL", xenditInvoiceID).
		First(&sub).Error
	if err != nil {
		// No matching subscription — this may be a new-registration invoice, not a renewal.
		return fmt.Errorf("subscription not found for invoice %s", xenditInvoiceID)
	}

	now := apptime.Now()
	nextBilling := now.AddDate(0, 1, 0)
	if sub.BillingPeriod == tenantModels.BillingYearly {
		nextBilling = now.AddDate(1, 0, 0)
	}

	return u.db.WithContext(ctx).
		Model(&tenantModels.TenantSubscription{}).
		Where("id = ?", sub.ID).
		Updates(map[string]interface{}{
			"next_billing_at": nextBilling,
			"status":          tenantModels.SubscriptionActive,
		}).Error
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

		planSlug := strings.TrimSpace(strings.ToLower(req.Plan))
		if planSlug == "" {
			planSlug = "full_access"
		}

		roleID, roleCode, roleName, permissions, err := u.createTenantOwnerRole(tx, tenantID, companyName, planSlug)
		if err != nil {
			return err
		}

		// Auto-generate standard roles (Admin, Cashier, etc.) tailored for this specific tenant
		if err := u.generateDefaultTenantRoles(tx, companyName, planSlug, tenantID); err != nil {
			return err
		}

		if err := tx.Exec(`
			INSERT INTO users (id, tenant_id, email, password, name, avatar_url, role_id, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
			userID, tenantID, req.Email, hashedPwd, req.Name, avatarURL, roleID,
		).Error; err != nil {
			return err
		}
		roleDataScope := "ALL"

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
				// Owner role is always is_protected=true; safe to hard-code here since
				// createTenantOwnerRole always marks it as protected.
				IsOwner:          true,
				Permissions:      permissions,
				Status:           "active",
				TenantID:         tenantID,
				TenantName:       companyName,
				SubscriptionPlan: activePlanForTenant(tx, tenantID),
			},
			Token:        accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    int(u.jwtManager.AccessTokenTTL().Seconds()),
		}

		return nil
	})

	return resp, err
}

type rolePermissionAssignment struct {
	PermissionID string
	Code         string
	Scope        string
	MenuURL      string
	MenuModule   string
}

func (u *authUsecase) createTenantOwnerRole(tx *gorm.DB, tenantID, companyName, planSlug string) (string, string, string, map[string]string, error) {
	roleID := newUUID()
	codeSuffix := strings.ReplaceAll(shortID(), "-", "")
	roleCode := fmt.Sprintf("tenant_owner_%s_%s", sanitizeSlug(planSlug), codeSuffix)
	roleName := fmt.Sprintf("%s Owner", companyName)
	if roleName == " Owner" {
		roleName = "Tenant Owner"
	}

	if err := tx.Exec(`
		INSERT INTO roles (id, name, code, description, status, is_protected, data_scope, tenant_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'active', true, 'ALL', ?, NOW(), NOW())`,
		roleID,
		roleName,
		roleCode,
		fmt.Sprintf("Auto-generated owner role for tenant %s (%s)", tenantID, planSlug),
		tenantID,
	).Error; err != nil {
		return "", "", "", nil, err
	}

	assignments, err := u.collectPlanPermissionAssignments(tx, planSlug)
	if err != nil {
		return "", "", "", nil, err
	}

	permissions := make(map[string]string, len(assignments))
	for _, a := range assignments {
		scope := strings.ToUpper(strings.TrimSpace(a.Scope))
		if scope == "" {
			scope = "ALL"
		}
		if err := tx.Exec(
			"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, ?)",
			roleID,
			a.PermissionID,
			scope,
		).Error; err != nil {
			return "", "", "", nil, err
		}
		permissions[a.Code] = scope
	}

	return roleID, roleCode, roleName, permissions, nil
}

func (u *authUsecase) generateDefaultTenantRoles(tx *gorm.DB, companyName, planSlug, tenantID string) error {
	assignments, err := u.collectPlanPermissionAssignments(tx, planSlug)
	if err != nil {
		return err
	}

	allowedPerms := make(map[string]string)
	for _, a := range assignments {
		allowedPerms[a.Code] = a.PermissionID
	}

	var templateCodes []string
	if isPOSModulePlan(planSlug) {
		templateCodes = []string{"admin", "cashier", "outlet_manager"}
	} else {
		templateCodes = []string{"admin", "manager", "staff"}
	}

	for _, tCode := range templateCodes {
		var tmplRole struct {
			ID   string
			Name string
			Code string
		}
		if err := tx.Raw("SELECT id, name, code FROM roles WHERE code = ? AND deleted_at IS NULL LIMIT 1", tCode).Scan(&tmplRole).Error; err != nil {
			continue // Skip if not found
		}
		if tmplRole.ID == "" {
			continue
		}

		var permCodes []string
		if err := tx.Raw(`
			SELECT p.code 
			FROM role_permissions rp
			JOIN permissions p ON p.id = rp.permission_id
			WHERE rp.role_id = ? AND p.deleted_at IS NULL
		`, tmplRole.ID).Scan(&permCodes).Error; err != nil {
			continue
		}

		var finalPermIDs []string
		for _, pc := range permCodes {
			if pid, ok := allowedPerms[pc]; ok {
				finalPermIDs = append(finalPermIDs, pid)
			}
		}

		newRoleID := newUUID()
		codeSuffix := shortID()
		newCode := fmt.Sprintf("%s_%s_%s", tCode, sanitizeSlug(companyName), codeSuffix)
		newName := fmt.Sprintf("%s - %s", tmplRole.Name, companyName)

		if err := tx.Exec(`
			INSERT INTO roles (id, name, code, description, status, is_protected, data_scope, tenant_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'active', false, 'ALL', ?, NOW(), NOW())`,
			newRoleID,
			newName,
			newCode,
			fmt.Sprintf("Auto-generated %s role for %s", tmplRole.Name, companyName),
			tenantID,
		).Error; err != nil {
			return err
		}

		for _, pid := range finalPermIDs {
			if err := tx.Exec(
				"INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (?, ?, 'ALL')",
				newRoleID,
				pid,
			).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

func (u *authUsecase) collectPlanPermissionAssignments(tx *gorm.DB, planSlug string) ([]rolePermissionAssignment, error) {
	planSlug = normalizeTenantPlanSlug(planSlug)

	rows := make([]rolePermissionAssignment, 0)
	err := tx.Raw(`
		SELECT p.id AS permission_id,
		       p.code,
		       COALESCE(m.url, '') AS menu_url,
		       COALESCE(m.module, '') AS menu_module,
		       'ALL' AS scope
		FROM permissions p
		LEFT JOIN menus m ON m.id = p.menu_id
		WHERE p.deleted_at IS NULL
	`).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	if strings.EqualFold(planSlug, "full_access") {
		sort.Slice(rows, func(i, j int) bool { return rows[i].Code < rows[j].Code })
		return rows, nil
	}

	entitled := make(map[string]struct{})
	var modules []string
	if err := tx.Table("plan_module_entitlements").
		Select("module_slug").
		Where("plan_slug = ? AND is_enabled = true", planSlug).
		Find(&modules).Error; err != nil {
		return nil, err
	}
	for _, m := range modules {
		entitled[normalizePlanModule(m)] = struct{}{}
	}

	permissionPolicy, err := loadPlanPermissionPolicy(tx, planSlug)
	if err != nil {
		return nil, err
	}

	filtered := make([]rolePermissionAssignment, 0, len(rows))
	for _, row := range rows {
		// Core platform permissions that must be available for ALL plans regardless of entitlement.
		// This ensures foundational capabilities like viewing users/roles, profile, and billing
		// are always accessible to the owner/admin regardless of the subscription tier.
		codeLower := strings.ToLower(row.Code)
		if strings.HasPrefix(codeLower, "dashboard.") ||
			strings.HasPrefix(codeLower, "profile.") ||
			strings.HasPrefix(codeLower, "setting") ||
			strings.HasPrefix(codeLower, "billing.") ||
			codeLower == "pos.payment.manage" ||
			// User and role management: always needed so the owner can manage their team
			strings.HasPrefix(codeLower, "user.") ||
			strings.HasPrefix(codeLower, "role.") ||
			strings.HasPrefix(codeLower, "permission.") ||
			// Master data core: always needed regardless of plan
			strings.HasPrefix(codeLower, "company.") ||
			strings.HasPrefix(codeLower, "warehouse.") ||
			strings.HasPrefix(codeLower, "product.") ||
			strings.HasPrefix(codeLower, "customer.") ||
			strings.HasPrefix(codeLower, "supplier.") ||
			strings.HasPrefix(codeLower, "employee.") {
			filtered = append(filtered, row)
			continue
		}

		module := normalizePlanModule(row.MenuModule)
		if module == "" {
			module = moduleFromPermissionURL(row.MenuURL)
		}
		if module == "" {
			filtered = append(filtered, row)
			continue
		}
		if _, ok := entitled[module]; ok {
			if permissionPolicy.hasRules && !isAssignmentAllowedByPolicy(row, permissionPolicy) {
				continue
			}
			filtered = append(filtered, row)
		}
	}

	sort.Slice(filtered, func(i, j int) bool { return filtered[i].Code < filtered[j].Code })
	return filtered, nil
}

type planPermissionPolicy struct {
	codeSet      map[string]struct{}
	menuPrefixes []string
	hasRules     bool
}

func loadPlanPermissionPolicy(tx *gorm.DB, planSlug string) (planPermissionPolicy, error) {
	policy := planPermissionPolicy{
		codeSet:      map[string]struct{}{},
		menuPrefixes: []string{},
		hasRules:     false,
	}

	rows := make([]struct {
		PermissionCode string
		MenuURL        string
	}, 0)
	err := tx.Table("plan_permission_entitlements").
		Select("permission_code, menu_url").
		Where("plan_slug = ? AND is_enabled = true", strings.ToLower(strings.TrimSpace(planSlug))).
		Scan(&rows).Error
	if err != nil {
		return policy, err
	}
	defaultRows := tenantPolicy.DefaultPlanEntitlementRows(planSlug)
	if len(defaultRows) > 0 {
		merged := make([]struct {
			PermissionCode string
			MenuURL        string
		}, 0, len(rows)+len(defaultRows))
		merged = append(merged, rows...)
		for _, row := range defaultRows {
			merged = append(merged, struct {
				PermissionCode string
				MenuURL        string
			}{
				PermissionCode: row.PermissionCode,
				MenuURL:        row.MenuURL,
			})
		}
		rows = merged
	}

	for _, row := range rows {
		code := strings.ToLower(strings.TrimSpace(row.PermissionCode))
		menu := strings.ToLower(strings.TrimSpace(row.MenuURL))
		if code != "" {
			policy.codeSet[code] = struct{}{}
			policy.hasRules = true
		}
		if menu != "" {
			policy.menuPrefixes = append(policy.menuPrefixes, menu)
			policy.hasRules = true
		}
	}

	return policy, nil
}

func isAssignmentAllowedByPolicy(row rolePermissionAssignment, policy planPermissionPolicy) bool {
	code := strings.ToLower(strings.TrimSpace(row.Code))
	if code != "" {
		if _, ok := policy.codeSet[code]; ok {
			return true
		}
	}

	menu := strings.ToLower(strings.TrimSpace(row.MenuURL))
	if menu == "" {
		return true
	}

	for _, prefix := range policy.menuPrefixes {
		if menu == prefix || strings.HasPrefix(menu, prefix+"/") {
			return true
		}
	}

	return false
}

func sanitizeSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "-", "_")
	s = strings.ReplaceAll(s, " ", "_")
	if s == "" {
		return "tenant"
	}
	return s
}

func normalizeTenantPlanSlug(planSlug string) string {
	normalized := strings.ToLower(strings.TrimSpace(planSlug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")

	switch normalized {
	case "pos", "pos_modular":
		return "pos_growth"
	case "erp", "erp_modular":
		return "erp_pro"
	case "crm", "crm_modular":
		return "crm_growth"
	case "hr", "hr_modular":
		return "hr_growth"
	default:
		return normalized
	}
}

func normalizePlanModule(module string) string {
	m := strings.ToLower(strings.TrimSpace(module))
	switch m {
	case "hrd", "human_resources", "human-resources":
		return "hr"
	case "master_data", "master-data":
		return "core"
	case "fb", "feedback", "loyalty":
		return "pos"
	case "stock":
		return "inventory"
	default:
		return m
	}
}

func moduleFromPermissionURL(url string) string {
	p := strings.ToLower(strings.TrimSpace(url))
	if p == "" {
		return ""
	}
	switch {
	case strings.HasPrefix(p, "/hrd"):
		return "hr"
	case strings.HasPrefix(p, "/stock"):
		return "inventory"
	case strings.HasPrefix(p, "/pos"):
		return "pos"
	case strings.HasPrefix(p, "/crm"):
		return "crm"
	case strings.HasPrefix(p, "/finance"):
		return "finance"
	case strings.HasPrefix(p, "/sales"):
		return "sales"
	case strings.HasPrefix(p, "/purchase"):
		return "purchase"
	case strings.HasPrefix(p, "/master-data"):
		return "core"
	default:
		return ""
	}
}

func isAllowedForPOSPlanByURL(url string) bool {
	p := strings.ToLower(strings.TrimSpace(url))
	if p == "" {
		return false
	}

	// Basic access always allowed for POS users
	basicAccess := []string{
		"/dashboard",
		"/profile",
		"/settings",
		"/master-data/users",
		"/master-data/companies",
		"/master-data/warehouses",
		"/master-data/products",
		"/master-data/customers",
		"/master-data/suppliers",
		"/master-data/employees",
	}
	for _, prefix := range basicAccess {
		if strings.HasPrefix(p, prefix) {
			return true
		}
	}

	allowedPrefixes := []string{
		"/pos/terminal",
		"/pos/fb/terminal",
		"/pos/live-table",
		"/pos/fb/live-table",
		"/pos/floor-layout",
		"/pos/fb/floor-layout",
		"/pos/feedback",
		"/pos/loyalty",
		"/sales/sales-orders",
		"/sales/customer-invoices",
		"/sales/payments",
		"/purchase/purchase-orders",
		"/purchase/supplier-invoices",
		"/purchase/payments",
		"/stock/inventory",
		"/stock/movements",
		"/finance/journals/sales",
		"/finance/journals/purchase",
		"/finance/bank-accounts",
		"/finance/settings/fiscal-years",
	}

	for _, prefix := range allowedPrefixes {
		if strings.HasPrefix(p, prefix) {
			return true
		}
	}

	return false
}

func isPOSModulePlan(planSlug string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(planSlug)), "pos_")
}

func isViewReadPermissionCode(code string) bool {
	parts := strings.Split(strings.ToLower(strings.TrimSpace(code)), ".")
	if len(parts) == 0 {
		return false
	}
	action := parts[len(parts)-1]
	return action == "view" || action == "read"
}

// activePlanForTenant returns the plan slug of the tenant's active or trial subscription.
// Returns an empty string when the tenant has no subscription record.
func activePlanForTenant(db *gorm.DB, tenantID string) string {
	if tenantID == "" {
		return ""
	}
	var plan string
	db.Table("tenant_subscriptions").
		Select("plan").
		Where("tenant_id = ? AND status IN ('active','trial')", tenantID).
		Order("created_at DESC").
		Limit(1).
		Row().Scan(&plan)
	return plan
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
