package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/utils"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	"github.com/gilabs/gims/api/internal/loyalty/data/models"
	"github.com/gilabs/gims/api/internal/loyalty/data/repositories"
	"github.com/gilabs/gims/api/internal/loyalty/domain/dto"
	"github.com/gilabs/gims/api/internal/loyalty/domain/mapper"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var (
	ErrLoyaltyProgramNotFound = errors.New("LOYALTY_PROGRAM_NOT_FOUND")
	ErrLoyaltyMemberNotFound  = errors.New("LOYALTY_MEMBER_NOT_FOUND")
	ErrAlreadyEnrolled        = errors.New("LOYALTY_ALREADY_ENROLLED")
	ErrInvalidLoyaltyConfig   = errors.New("LOYALTY_INVALID_CONFIG")
	ErrRewardNotFound         = errors.New("LOYALTY_REWARD_NOT_FOUND")
	ErrInsufficientPoints     = errors.New("LOYALTY_INSUFFICIENT_POINTS")
	ErrPointsAlreadyAwarded   = errors.New("LOYALTY_POINTS_ALREADY_AWARDED")
	ErrNoActiveProgram        = errors.New("LOYALTY_NO_ACTIVE_PROGRAM")
)

type LoyaltyUsecase interface {
	// Program management
	CreateProgram(ctx context.Context, createdBy string, req *dto.CreateLoyaltyProgramRequest) (*dto.LoyaltyProgramResponse, error)
	UpdateProgram(ctx context.Context, id, updatedBy string, req *dto.UpdateLoyaltyProgramRequest) (*dto.LoyaltyProgramResponse, error)
	DeleteProgram(ctx context.Context, id string) error
	GetProgram(ctx context.Context, id string) (*dto.LoyaltyProgramResponse, error)
	ListPrograms(ctx context.Context, page, perPage int) ([]dto.LoyaltyProgramResponse, *utils.PaginationResult, error)
	ToggleProgramActive(ctx context.Context, id, updatedBy string) (*dto.LoyaltyProgramResponse, error)

	// Member management
	EnrollMember(ctx context.Context, enrolledBy string, req *dto.EnrollMemberRequest) (*dto.LoyaltyMemberResponse, error)
	ChangeProgram(ctx context.Context, id, updatedBy string, req *dto.ChangeProgramRequest) (*dto.LoyaltyMemberResponse, error)
	GetMember(ctx context.Context, id string) (*dto.LoyaltyMemberResponse, error)
	GetMemberByCustomerID(ctx context.Context, customerID string) (*dto.LoyaltyMemberResponse, error)
	LookupMember(ctx context.Context, name, outletID string) (*dto.LookupMemberResponse, error)
	ListMembers(ctx context.Context, params repositories.MemberListParams) ([]dto.LoyaltyMemberResponse, *utils.PaginationResult, error)

	// Points operations
	EarnPoints(ctx context.Context, req *dto.EarnPointsRequest) (int64, error)
	RedeemPoints(ctx context.Context, req *dto.RedeemPointsRequest) (*dto.RedeemPointsResponse, error)
	AdjustPoints(ctx context.Context, req *dto.AdjustPointsRequest) error
	ListLedger(ctx context.Context, params repositories.LedgerListParams) ([]dto.PointLedgerResponse, *utils.PaginationResult, error)

	// Public self-registration
	PublicSelfRegister(ctx context.Context, req *dto.PublicSelfRegisterRequest) (*dto.PublicSelfRegisterResponse, error)
}

type loyaltyUsecase struct {
	db           *gorm.DB
	programRepo  repositories.LoyaltyProgramRepository
	memberRepo   repositories.LoyaltyMemberRepository
	ledgerRepo   repositories.LoyaltyPointLedgerRepository
	customerRepo customerRepos.CustomerRepository
}

func NewLoyaltyUsecase(
	db *gorm.DB,
	programRepo repositories.LoyaltyProgramRepository,
	memberRepo repositories.LoyaltyMemberRepository,
	ledgerRepo repositories.LoyaltyPointLedgerRepository,
	customerRepo customerRepos.CustomerRepository,
) LoyaltyUsecase {
	return &loyaltyUsecase{
		db:           db,
		programRepo:  programRepo,
		memberRepo:   memberRepo,
		ledgerRepo:   ledgerRepo,
		customerRepo: customerRepo,
	}
}

// ─── Program Management ───────────────────────────────────────────────────────

func (u *loyaltyUsecase) CreateProgram(ctx context.Context, createdBy string, req *dto.CreateLoyaltyProgramRequest) (*dto.LoyaltyProgramResponse, error) {
	configBytes, err := marshalAndValidateConfig(&req.Config)
	if err != nil {
		return nil, err
	}

	program := &models.LoyaltyProgram{
		OutletID:    req.OutletID,
		Name:        req.Name,
		Description: req.Description,
		ConfigJSON:  datatypes.JSON(configBytes),
		IsActive:    req.IsActive,
		CreatedBy:   &createdBy,
		UpdatedBy:   &createdBy,
	}

	if err := u.programRepo.Create(ctx, program); err != nil {
		return nil, err
	}
	return mapper.ToLoyaltyProgramResponse(program), nil
}

func (u *loyaltyUsecase) UpdateProgram(ctx context.Context, id, updatedBy string, req *dto.UpdateLoyaltyProgramRequest) (*dto.LoyaltyProgramResponse, error) {
	program, err := u.programRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}

	if req.Name != nil {
		program.Name = *req.Name
	}
	if req.Description != nil {
		program.Description = req.Description
	}
	if req.Config != nil {
		configBytes, err := marshalAndValidateConfig(req.Config)
		if err != nil {
			return nil, err
		}
		program.ConfigJSON = datatypes.JSON(configBytes)
	}
	if req.IsActive != nil {
		program.IsActive = *req.IsActive
	}
	program.UpdatedBy = &updatedBy

	if err := u.programRepo.Update(ctx, program); err != nil {
		return nil, err
	}
	return mapper.ToLoyaltyProgramResponse(program), nil
}

func (u *loyaltyUsecase) DeleteProgram(ctx context.Context, id string) error {
	program, err := u.programRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if program == nil {
		return ErrLoyaltyProgramNotFound
	}
	return u.programRepo.Delete(ctx, id)
}

func (u *loyaltyUsecase) GetProgram(ctx context.Context, id string) (*dto.LoyaltyProgramResponse, error) {
	program, err := u.programRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}
	return mapper.ToLoyaltyProgramResponse(program), nil
}

func (u *loyaltyUsecase) ListPrograms(ctx context.Context, page, perPage int) ([]dto.LoyaltyProgramResponse, *utils.PaginationResult, error) {
	programs, total, err := u.programRepo.List(ctx, page, perPage)
	if err != nil {
		return nil, nil, err
	}

	resp := make([]dto.LoyaltyProgramResponse, 0, len(programs))
	for i := range programs {
		resp = append(resp, *mapper.ToLoyaltyProgramResponse(&programs[i]))
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: totalPages,
	}
	return resp, pagination, nil
}

func (u *loyaltyUsecase) ToggleProgramActive(ctx context.Context, id, updatedBy string) (*dto.LoyaltyProgramResponse, error) {
	program, err := u.programRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}
	program.IsActive = !program.IsActive
	program.UpdatedBy = &updatedBy
	if err := u.programRepo.Update(ctx, program); err != nil {
		return nil, err
	}
	return mapper.ToLoyaltyProgramResponse(program), nil
}

// ─── Member Management ────────────────────────────────────────────────────────

func (u *loyaltyUsecase) EnrollMember(ctx context.Context, enrolledBy string, req *dto.EnrollMemberRequest) (*dto.LoyaltyMemberResponse, error) {
	// Resolve program from outlet if not provided.
	programID := ""
	if req.ProgramID != nil {
		programID = *req.ProgramID
	} else {
		if req.OutletID == nil || *req.OutletID == "" {
			return nil, errors.New("PROGRAM_OR_OUTLET_REQUIRED")
		}
		prog, err := u.programRepo.FindActiveForOutlet(ctx, *req.OutletID)
		if err != nil {
			return nil, err
		}
		if prog == nil {
			return nil, ErrNoActiveProgram
		}
		programID = prog.ID
	}

	// Resolve or create the customer record.
	customerID := ""
	var customerRecord *customerModels.Customer

	if req.CustomerID != nil {
		customerRecord, _ = u.customerRepo.FindByID(ctx, *req.CustomerID)
	}

	if customerRecord == nil {
		// Create a minimal customer record.
		code, err := u.customerRepo.GetNextCode(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to generate customer code: %w", err)
		}
		newCustomer := &customerModels.Customer{
			ID:   uuid.New().String(),
			Code: code,
			Name: req.Name,
		}
		if req.Phone != nil && *req.Phone != "" {
			newCustomer.ContactPerson = *req.Phone
		}
		if req.Email != nil {
			newCustomer.Email = *req.Email
		}
		if err := u.db.WithContext(ctx).Create(newCustomer).Error; err != nil {
			return nil, fmt.Errorf("failed to create customer: %w", err)
		}
		customerRecord = newCustomer
	}
	customerID = customerRecord.ID

	// Prevent duplicate enrollments.
	existing, err := u.memberRepo.GetByCustomerID(ctx, customerID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		// Return existing member rather than erroring — the caller handles the "already enrolled" case.
		return u.buildMemberResponse(ctx, existing, customerRecord)
	}

	program, err := u.programRepo.GetByID(ctx, programID)
	if err != nil || program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}

	cfg, err := parseConfig(program)
	if err != nil {
		return nil, err
	}

	tier := computeTier(0, cfg.Tiers)

	memberCode, err := u.memberRepo.GetNextMemberCode(ctx)
	if err != nil {
		return nil, err
	}

	now := apptime.Now()
	member := &models.LoyaltyMember{
		CustomerID:       customerID,
		ProgramID:        programID,
		MemberCode:       memberCode,
		EnrolledOutletID: req.OutletID,
		CurrentTier:      tier.Name,
		TierBadgeColor:   tier.BadgeColor,
		LifetimePoints:   0,
		PointBalance:     0,
		JoinedAt:         now,
		CreatedBy:        &enrolledBy,
		UpdatedBy:        &enrolledBy,
	}

	if err := u.memberRepo.Create(ctx, member); err != nil {
		return nil, err
	}

	// If a POS order was linked, credit points for it immediately.
	if req.PosOrderID != nil {
		_, _ = u.EarnPoints(ctx, &dto.EarnPointsRequest{
			MemberID:        member.ID,
			TransactionID:   *req.PosOrderID,
			TransactionType: "pos_order",
			ProcessedBy:     &enrolledBy,
		})
	}

	// If an existing customer is being enrolled for the first time, backfill historical
	// purchase points from previously completed POS orders.
	if req.CustomerID != nil {
		u.backfillHistoricalPoints(ctx, member, cfg, customerID, enrolledBy)
	}

	// Re-fetch member to reflect any points earned or backfilled above.
	if req.PosOrderID != nil || req.CustomerID != nil {
		member, _ = u.memberRepo.GetByID(ctx, member.ID)
	}

	return u.buildMemberResponse(ctx, member, customerRecord)
}

func (u *loyaltyUsecase) ChangeProgram(ctx context.Context, id, updatedBy string, req *dto.ChangeProgramRequest) (*dto.LoyaltyMemberResponse, error) {
	member, err := u.memberRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, ErrLoyaltyMemberNotFound
	}

	if member.ProgramID == req.ProgramID {
		return u.GetMember(ctx, id)
	}

	program, err := u.programRepo.GetByID(ctx, req.ProgramID)
	if err != nil || program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}

	cfg, err := parseConfig(program)
	if err != nil {
		return nil, err
	}

	tier := computeTier(member.LifetimePoints, cfg.Tiers)

	err = u.db.WithContext(ctx).Model(&models.LoyaltyMember{}).Where("id = ?", id).Updates(map[string]interface{}{
		"program_id":       req.ProgramID,
		"current_tier":     tier.Name,
		"tier_badge_color": tier.BadgeColor,
		"updated_by":       &updatedBy,
	}).Error
	if err != nil {
		return nil, err
	}

	return u.GetMember(ctx, id)
}

func (u *loyaltyUsecase) GetMember(ctx context.Context, id string) (*dto.LoyaltyMemberResponse, error) {
	member, err := u.memberRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, ErrLoyaltyMemberNotFound
	}

	customer, _ := u.customerRepo.FindByID(ctx, member.CustomerID)
	return u.buildMemberResponse(ctx, member, customer)
}

func (u *loyaltyUsecase) GetMemberByCustomerID(ctx context.Context, customerID string) (*dto.LoyaltyMemberResponse, error) {
	member, err := u.memberRepo.GetByCustomerID(ctx, customerID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, ErrLoyaltyMemberNotFound
	}
	customer, _ := u.customerRepo.FindByID(ctx, customerID)
	return u.buildMemberResponse(ctx, member, customer)
}

func (u *loyaltyUsecase) LookupMember(ctx context.Context, name, outletID string) (*dto.LookupMemberResponse, error) {
	member, err := u.memberRepo.LookupByNameAndOutlet(ctx, name, outletID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return &dto.LookupMemberResponse{Found: false}, nil
	}

	// Load program config to build available rewards list.
	var availableRewards []dto.RewardConfig
	program, _ := u.programRepo.GetByID(ctx, member.ProgramID)
	if program != nil {
		cfg, parseErr := parseConfig(program)
		if parseErr == nil {
			for _, r := range cfg.Rewards {
				if r.IsActive && int64(r.PointsRequired) <= member.PointBalance {
					availableRewards = append(availableRewards, r)
				}
			}
		}
	}

	return &dto.LookupMemberResponse{
		Found:            true,
		MemberID:         &member.ID,
		MemberCode:       &member.MemberCode,
		CustomerID:       &member.CustomerID,
		CurrentTier:      &member.CurrentTier,
		TierBadgeColor:   &member.TierBadgeColor,
		PointBalance:     &member.PointBalance,
		AvailableRewards: availableRewards,
	}, nil
}

func (u *loyaltyUsecase) ListMembers(ctx context.Context, params repositories.MemberListParams) ([]dto.LoyaltyMemberResponse, *utils.PaginationResult, error) {
	members, total, err := u.memberRepo.List(ctx, params)
	if err != nil {
		return nil, nil, err
	}

	resp := make([]dto.LoyaltyMemberResponse, 0, len(members))
	for i := range members {
		customer, _ := u.customerRepo.FindByID(ctx, members[i].CustomerID)
		r, _ := u.buildMemberResponse(ctx, &members[i], customer)
		if r != nil {
			resp = append(resp, *r)
		}
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	pagination := &utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}
	return resp, pagination, nil
}

// ─── Points Operations ────────────────────────────────────────────────────────

// EarnPoints awards points for a completed transaction atomically using a DB transaction.
func (u *loyaltyUsecase) EarnPoints(ctx context.Context, req *dto.EarnPointsRequest) (int64, error) {
	member, err := u.memberRepo.GetByID(ctx, req.MemberID)
	if err != nil || member == nil {
		return 0, ErrLoyaltyMemberNotFound
	}

	// Guard against double-awarding points for the same transaction.
	existing, err := u.ledgerRepo.FindByTransaction(ctx, req.MemberID, req.TransactionID, string(models.LedgerEntryTypeEarned))
	if err != nil {
		return 0, err
	}
	if existing != nil {
		return 0, ErrPointsAlreadyAwarded
	}

	program, err := u.programRepo.GetByID(ctx, member.ProgramID)
	if err != nil || program == nil {
		return 0, ErrLoyaltyProgramNotFound
	}

	cfg, err := parseConfig(program)
	if err != nil {
		return 0, err
	}

	// Skip if transaction is below minimum amount.
	if req.TotalAmount < cfg.PointRules.MinTransactionAmount {
		return 0, nil
	}

	tier := computeTier(member.LifetimePoints, cfg.Tiers)
	multiplier := tier.Multiplier
	if multiplier <= 0 {
		multiplier = 1.0
	}

	basePoints := int64(0)
	if cfg.PointRules.AmountPerPoint > 0 {
		basePoints = int64(math.Floor(req.TotalAmount / cfg.PointRules.AmountPerPoint * cfg.PointRules.PointsPerAmount))
	}
	earnedPoints := int64(math.Floor(float64(basePoints) * multiplier))
	if earnedPoints <= 0 {
		return 0, nil
	}

	var expiresAt *time.Time
	if cfg.PointExpiryDays > 0 {
		expiry := apptime.Now().AddDate(0, 0, cfg.PointExpiryDays)
		expiresAt = &expiry
	}

	return earnedPoints, u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entry := &models.LoyaltyPointLedger{
			MemberID:        req.MemberID,
			EntryType:       models.LedgerEntryTypeEarned,
			TransactionType: &req.TransactionType,
			TransactionID:   &req.TransactionID,
			Points:          earnedPoints,
			BalanceAfter:    member.PointBalance + earnedPoints,
			LifetimeAfter:   member.LifetimePoints + earnedPoints,
			Multiplier:      &multiplier,
			ExpiresAt:       expiresAt,
			ProcessedBy:     req.ProcessedBy,
		}

		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		newLifetime := member.LifetimePoints + earnedPoints
		newTier := computeTier(newLifetime, cfg.Tiers)
		now := apptime.Now()

		return tx.Model(&models.LoyaltyMember{}).Where("id = ?", req.MemberID).Updates(map[string]interface{}{
			"point_balance":      gorm.Expr("point_balance + ?", earnedPoints),
			"lifetime_points":    gorm.Expr("lifetime_points + ?", earnedPoints),
			"current_tier":       newTier.Name,
			"tier_badge_color":   newTier.BadgeColor,
			"last_transaction_at": &now,
			"total_transactions": gorm.Expr("total_transactions + 1"),
		}).Error
	})
}

// RedeemPoints deducts points for a reward atomically using a DB transaction.
func (u *loyaltyUsecase) RedeemPoints(ctx context.Context, req *dto.RedeemPointsRequest) (*dto.RedeemPointsResponse, error) {
	member, err := u.memberRepo.GetByID(ctx, req.MemberID)
	if err != nil || member == nil {
		return nil, ErrLoyaltyMemberNotFound
	}

	program, err := u.programRepo.GetByID(ctx, member.ProgramID)
	if err != nil || program == nil {
		return nil, ErrLoyaltyProgramNotFound
	}

	cfg, err := parseConfig(program)
	if err != nil {
		return nil, err
	}

	// Find the requested reward.
	var reward *dto.RewardConfig
	for i := range cfg.Rewards {
		if cfg.Rewards[i].ID == req.RewardID {
			reward = &cfg.Rewards[i]
			break
		}
	}
	if reward == nil {
		return nil, ErrRewardNotFound
	}

	if member.PointBalance < reward.PointsRequired {
		return nil, ErrInsufficientPoints
	}

	rewardName := reward.Name
	pointsToDeduct := reward.PointsRequired

	txErr := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entry := &models.LoyaltyPointLedger{
			MemberID:        req.MemberID,
			EntryType:       models.LedgerEntryTypeRedeemed,
			TransactionType: &req.TransactionType,
			TransactionID:   &req.TransactionID,
			Points:          -int64(pointsToDeduct),
			BalanceAfter:    member.PointBalance - int64(pointsToDeduct),
			LifetimeAfter:   member.LifetimePoints,
			RewardID:        &req.RewardID,
			RewardName:      &rewardName,
			ProcessedBy:     req.ProcessedBy,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		return tx.Model(&models.LoyaltyMember{}).Where("id = ?", req.MemberID).Updates(map[string]interface{}{
			"point_balance": gorm.Expr("point_balance - ?", pointsToDeduct),
		}).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return &dto.RedeemPointsResponse{
		PointsDeducted: int64(pointsToDeduct),
		NewBalance:     member.PointBalance - int64(pointsToDeduct),
		DiscountAmount: reward.Value,
		DiscountType:   reward.Type,
		RewardName:     reward.Name,
	}, nil
}

func (u *loyaltyUsecase) AdjustPoints(ctx context.Context, req *dto.AdjustPointsRequest) error {
	member, err := u.memberRepo.GetByID(ctx, req.MemberID)
	if err != nil || member == nil {
		return ErrLoyaltyMemberNotFound
	}

	return u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		newBalance := member.PointBalance + req.Points
		newLifetime := member.LifetimePoints
		if req.Points > 0 {
			newLifetime += req.Points
		}

		entry := &models.LoyaltyPointLedger{
			MemberID:      req.MemberID,
			EntryType:     models.LedgerEntryTypeAdjusted,
			Points:        req.Points,
			BalanceAfter:  newBalance,
			LifetimeAfter: newLifetime,
			Notes:         req.Notes,
			ProcessedBy:   req.ProcessedBy,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{
			"point_balance": gorm.Expr("point_balance + ?", req.Points),
		}
		if req.Points > 0 {
			updates["lifetime_points"] = gorm.Expr("lifetime_points + ?", req.Points)
		}
		return tx.Model(&models.LoyaltyMember{}).Where("id = ?", req.MemberID).Updates(updates).Error
	})
}

// backfillHistoricalPoints awards adjusted points for a newly enrolled customer based on
// the total revenue of their previously completed POS orders. This is best-effort:
// errors are silently ignored so that enrollment itself always succeeds.
func (u *loyaltyUsecase) backfillHistoricalPoints(ctx context.Context, member *models.LoyaltyMember, cfg *dto.LoyaltyConfigJSON, customerID, enrolledBy string) {
	if cfg.PointRules.AmountPerPoint <= 0 || cfg.PointRules.PointsPerAmount <= 0 {
		return
	}

	var totalRevenue float64
	if err := u.db.WithContext(ctx).
		Table("pos_orders").
		Where("customer_id = ? AND status IN ?", customerID, []string{"PAID", "COMPLETED"}).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&totalRevenue).Error; err != nil || totalRevenue <= 0 {
		return
	}

	backfillPoints := int64(math.Floor(totalRevenue / cfg.PointRules.AmountPerPoint * cfg.PointRules.PointsPerAmount))
	if backfillPoints <= 0 {
		return
	}

	note := "Historical purchase backfill"
	_ = u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entry := &models.LoyaltyPointLedger{
			MemberID:      member.ID,
			EntryType:     models.LedgerEntryTypeAdjusted,
			Points:        backfillPoints,
			BalanceAfter:  member.PointBalance + backfillPoints,
			LifetimeAfter: member.LifetimePoints + backfillPoints,
			Notes:         &note,
			ProcessedBy:   &enrolledBy,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		newLifetime := member.LifetimePoints + backfillPoints
		newTier := computeTier(newLifetime, cfg.Tiers)

		return tx.Model(&models.LoyaltyMember{}).Where("id = ?", member.ID).Updates(map[string]interface{}{
			"point_balance":   gorm.Expr("point_balance + ?", backfillPoints),
			"lifetime_points": gorm.Expr("lifetime_points + ?", backfillPoints),
			"current_tier":    newTier.Name,
			"tier_badge_color": newTier.BadgeColor,
		}).Error
	})
}

func (u *loyaltyUsecase) ListLedger(ctx context.Context, params repositories.LedgerListParams) ([]dto.PointLedgerResponse, *utils.PaginationResult, error) {
	entries, total, err := u.ledgerRepo.ListByMember(ctx, params)
	if err != nil {
		return nil, nil, err
	}

	resp := make([]dto.PointLedgerResponse, 0, len(entries))
	for i := range entries {
		resp = append(resp, *mapper.ToPointLedgerResponse(&entries[i]))
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	pagination := &utils.PaginationResult{
		Page:       params.Page,
		PerPage:    params.PerPage,
		Total:      int(total),
		TotalPages: totalPages,
	}
	return resp, pagination, nil
}

// ─── Public self-registration ─────────────────────────────────────────────────

// PublicSelfRegister allows a walk-in customer to self-register via a QR code on their receipt.
func (u *loyaltyUsecase) PublicSelfRegister(ctx context.Context, req *dto.PublicSelfRegisterRequest) (*dto.PublicSelfRegisterResponse, error) {
	phone := req.Phone
	enrollReq := &dto.EnrollMemberRequest{
		OutletID:   &req.OutletID,
		Name:       req.Name,
		Phone:      &phone,
		Email:      req.Email,
		PosOrderID: &req.OrderID,
	}

	resp, err := u.EnrollMember(ctx, "public", enrollReq)
	if err != nil {
		return nil, err
	}

	// Check if member was already enrolled (EnrollMember returns existing member gracefully).
	alreadyMember := resp.TotalTransactions > 1

	return &dto.PublicSelfRegisterResponse{
		MemberCode:     resp.MemberCode,
		CurrentTier:    resp.CurrentTier,
		TierBadgeColor: resp.TierBadgeColor,
		PointsEarned:   resp.PointBalance,
		PointBalance:   resp.PointBalance,
		AlreadyMember:  alreadyMember,
	}, nil
}

// ─── Private helpers ──────────────────────────────────────────────────────────

func (u *loyaltyUsecase) buildMemberResponse(ctx context.Context, m *models.LoyaltyMember, customer *customerModels.Customer) (*dto.LoyaltyMemberResponse, error) {
	name := ""
	var phone *string
	if customer != nil {
		name = customer.Name
		if customer.ContactPerson != "" {
			cp := customer.ContactPerson
			phone = &cp
		}
	}
	return mapper.ToLoyaltyMemberResponse(m, name, phone), nil
}

func parseConfig(program *models.LoyaltyProgram) (*dto.LoyaltyConfigJSON, error) {
	var cfg dto.LoyaltyConfigJSON
	if err := json.Unmarshal(program.ConfigJSON, &cfg); err != nil {
		return nil, ErrInvalidLoyaltyConfig
	}
	return &cfg, nil
}

func marshalAndValidateConfig(cfg *dto.LoyaltyConfigJSON) ([]byte, error) {
	if len(cfg.Tiers) == 0 {
		return nil, fmt.Errorf("%w: at least one tier is required", ErrInvalidLoyaltyConfig)
	}
	if cfg.PointRules.AmountPerPoint <= 0 {
		return nil, fmt.Errorf("%w: amount_per_point must be positive", ErrInvalidLoyaltyConfig)
	}
	b, err := json.Marshal(cfg)
	if err != nil {
		return nil, ErrInvalidLoyaltyConfig
	}
	return b, nil
}

// computeTier returns the highest tier a member qualifies for based on lifetime points.
func computeTier(lifetimePoints int64, tiers []dto.TierConfig) dto.TierConfig {
	best := dto.TierConfig{Name: "Bronze", MinPoints: 0, Multiplier: 1.0, BadgeColor: "#CD7F32"}
	for _, t := range tiers {
		if lifetimePoints >= t.MinPoints && t.MinPoints >= best.MinPoints {
			best = t
		}
	}
	return best
}
