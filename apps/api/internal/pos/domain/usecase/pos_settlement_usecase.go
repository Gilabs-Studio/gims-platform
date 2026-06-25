package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/xendit"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrPOSSettlementNotConfigured       = errors.New("pos settlement is not configured")
	ErrPOSSettlementInsufficientBalance = errors.New("pos settlement balance is insufficient")
	ErrPOSSettlementPayoutFailed        = errors.New("pos settlement payout failed")
)

type POSSettlementUsecase interface {
	GetOverview(ctx context.Context, tenantID string) (*dto.POSSettlementOverviewResponse, error)
	GetPayoutChannels(ctx context.Context, currency, category string) ([]dto.POSSettlementPayoutChannelResponse, error)
	CreatePayout(ctx context.Context, tenantID, requestedBy string, req *dto.CreatePOSSettlementPayoutRequest) (*dto.POSSettlementPayoutResponse, error)
	ListPayouts(ctx context.Context, tenantID string) ([]*dto.POSSettlementPayoutResponse, error)
}

type posSettlementUsecase struct {
	repo repositories.POSSettlementRepository
}

func NewPOSSettlementUsecase(repo repositories.POSSettlementRepository) POSSettlementUsecase {
	return &posSettlementUsecase{repo: repo}
}

func (u *posSettlementUsecase) ListPayouts(ctx context.Context, tenantID string) ([]*dto.POSSettlementPayoutResponse, error) {
	payouts, err := u.repo.ListPayouts(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	result := make([]*dto.POSSettlementPayoutResponse, 0, len(payouts))
	for _, p := range payouts {
		result = append(result, mapSettlementPayout(p))
	}
	return result, nil
}

func (u *posSettlementUsecase) GetPayoutChannels(ctx context.Context, currency, category string) ([]dto.POSSettlementPayoutChannelResponse, error) {
	client := settlementClient()
	if !client.IsConfigured() {
		return nil, ErrPOSSettlementNotConfigured
	}
	if strings.TrimSpace(currency) == "" {
		currency = "IDR"
	}
	normalizedCategory := strings.ToUpper(strings.TrimSpace(category))
	channels, err := client.GetPayoutChannels(ctx, strings.ToUpper(strings.TrimSpace(currency)), normalizedCategory)
	if err != nil {
		return nil, err
	}
	result := make([]dto.POSSettlementPayoutChannelResponse, 0, len(*channels))
	for _, channel := range *channels {
		result = append(result, dto.POSSettlementPayoutChannelResponse{
			ChannelName:     channel.ChannelName,
			ChannelCategory: channel.ChannelCategory,
			ChannelCode:     channel.ChannelCode,
			Currency:        channel.Currency,
			AmountLimits: dto.POSSettlementPayoutAmountLimit{
				Minimum:          channel.AmountLimits.Minimum,
				Maximum:          channel.AmountLimits.Maximum,
				MinimumIncrement: channel.AmountLimits.MinimumIncrement,
			},
		})
	}
	return result, nil
}

func (u *posSettlementUsecase) GetOverview(ctx context.Context, tenantID string) (*dto.POSSettlementOverviewResponse, error) {
	collected, err := u.repo.GetPaidDigitalTotal(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	reserved, err := u.repo.GetReservedPayoutTotal(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	available := math.Max(collected-reserved, 0)
	configured := settlementClient().IsConfigured()
	overview := &dto.POSSettlementOverviewResponse{
		Configured:              configured,
		PayoutEnabled:           configured && available > 0,
		Currency:                "IDR",
		CollectedAmount:         collected,
		ReservedPayoutAmount:    reserved,
		AvailablePayoutAmount:   available,
		PlatformLiquidityStatus: "not_configured",
	}
	if !configured {
		overview.Message = "Merchant settlement key is not configured."
		return overview, nil
	}

	balance, err := settlementClient().GetBalance(ctx, "IDR")
	if err != nil {
		overview.PayoutEnabled = false
		overview.PlatformLiquidityStatus = "unavailable"
		overview.Message = "Unable to verify Xendit settlement balance."
		return overview, nil
	}
	overview.PlatformLiquidityStatus = "available"
	if balance.Balance < available {
		overview.PayoutEnabled = false
		overview.Message = "Platform Xendit balance is lower than the tenant's available payout amount."
	}
	return overview, nil
}

func (u *posSettlementUsecase) CreatePayout(ctx context.Context, tenantID, requestedBy string, req *dto.CreatePOSSettlementPayoutRequest) (*dto.POSSettlementPayoutResponse, error) {
	client := settlementClient()
	if !client.IsConfigured() {
		return nil, ErrPOSSettlementNotConfigured
	}

	channelCode := strings.ToUpper(strings.TrimSpace(req.ChannelCode))
	accountNumber := strings.TrimSpace(req.AccountNumber)
	accountHolderName := strings.TrimSpace(req.AccountHolderName)
	idempotencyKey := strings.TrimSpace(req.IdempotencyKey)
	description := trimOptional(req.Description)
	if description == nil {
		defaultDescription := "GIMS POS merchant payout"
		description = &defaultDescription
	}

	if existing, err := u.repo.FindPayoutByIdempotencyKey(ctx, tenantID, idempotencyKey); err == nil {
		return mapSettlementPayout(existing), nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	amount := float64(req.Amount)
	overview, err := u.GetOverview(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if !overview.Configured {
		return nil, ErrPOSSettlementNotConfigured
	}
	if amount > overview.AvailablePayoutAmount {
		return nil, ErrPOSSettlementInsufficientBalance
	}

	balance, err := client.GetBalance(ctx, "IDR")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrPOSSettlementPayoutFailed, err)
	}
	if balance.Balance < amount {
		return nil, ErrPOSSettlementInsufficientBalance
	}

	payout := &posModels.POSSettlementPayout{
		TenantID:            tenantID,
		ReferenceID:         "gims-settlement-" + uuid.NewString(),
		IdempotencyKey:      idempotencyKey,
		Status:              posModels.POSSettlementPayoutStatusPending,
		Amount:              amount,
		Currency:            "IDR",
		ChannelCode:         channelCode,
		AccountNumberMasked: maskAccountNumber(accountNumber),
		AccountHolderName:   accountHolderName,
		Description:         description,
		RequestedBy:         requestedBy,
	}
	if err := u.repo.CreatePayout(ctx, payout); err != nil {
		return nil, err
	}

	xenditPayout, err := client.CreatePayout(ctx, xendit.CreatePayoutRequest{
		ReferenceID: payout.ReferenceID,
		ChannelCode: channelCode,
		ChannelProperties: xendit.PayoutChannelProperties{
			AccountNumber:     accountNumber,
			AccountHolderName: accountHolderName,
		},
		Amount:      req.Amount,
		Description: *description,
		Currency:    "IDR",
	}, idempotencyKey)
	if err != nil {
		failureReason := err.Error()
		payout.FailureReason = &failureReason

		var apiErr *xendit.APIError
		if errors.As(err, &apiErr) && apiErr.StatusCode >= 400 && apiErr.StatusCode < 500 {
			payout.Status = posModels.POSSettlementPayoutStatusFailed
		}
		_ = u.repo.UpdatePayout(ctx, payout)
		return nil, fmt.Errorf("%w: %v", ErrPOSSettlementPayoutFailed, err)
	}

	payoutID := xenditPayout.ID
	payout.XenditPayoutID = &payoutID
	payout.Status = normalizeSettlementPayoutStatus(xenditPayout.Status)
	if xenditPayout.FailureCode != "" {
		payout.FailureCode = &xenditPayout.FailureCode
	}
	if xenditPayout.EstimatedArrivalTime != "" {
		if eta, parseErr := time.Parse(time.RFC3339, xenditPayout.EstimatedArrivalTime); parseErr == nil {
			payout.EstimatedArrivalTime = &eta
		}
	}
	if err := u.repo.UpdatePayout(ctx, payout); err != nil {
		return nil, err
	}

	return mapSettlementPayout(payout), nil
}

func settlementClient() *xendit.Client {
	if config.AppConfig == nil {
		return xendit.NewClient("", "")
	}
	return xendit.NewClient(
		strings.TrimSpace(config.AppConfig.Xendit.MerchantSettlementSecretKey),
		strings.TrimSpace(config.AppConfig.Xendit.BaseURL),
	)
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func maskAccountNumber(accountNumber string) string {
	trimmed := strings.TrimSpace(accountNumber)
	if len(trimmed) <= 4 {
		return strings.Repeat("*", len(trimmed))
	}
	return strings.Repeat("*", len(trimmed)-4) + trimmed[len(trimmed)-4:]
}

func normalizeSettlementPayoutStatus(status string) posModels.POSSettlementPayoutStatus {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case string(posModels.POSSettlementPayoutStatusAccepted):
		return posModels.POSSettlementPayoutStatusAccepted
	case string(posModels.POSSettlementPayoutStatusRequested):
		return posModels.POSSettlementPayoutStatusRequested
	case string(posModels.POSSettlementPayoutStatusSucceeded):
		return posModels.POSSettlementPayoutStatusSucceeded
	case string(posModels.POSSettlementPayoutStatusFailed):
		return posModels.POSSettlementPayoutStatusFailed
	case string(posModels.POSSettlementPayoutStatusCancelled):
		return posModels.POSSettlementPayoutStatusCancelled
	case string(posModels.POSSettlementPayoutStatusReversed):
		return posModels.POSSettlementPayoutStatusReversed
	default:
		return posModels.POSSettlementPayoutStatusPending
	}
}

func mapSettlementPayout(payout *posModels.POSSettlementPayout) *dto.POSSettlementPayoutResponse {
	return &dto.POSSettlementPayoutResponse{
		ID:                   payout.ID,
		ReferenceID:          payout.ReferenceID,
		XenditPayoutID:       payout.XenditPayoutID,
		Status:               string(payout.Status),
		Amount:               payout.Amount,
		Currency:             payout.Currency,
		ChannelCode:          payout.ChannelCode,
		AccountNumberMasked:  payout.AccountNumberMasked,
		AccountHolderName:    payout.AccountHolderName,
		Description:          payout.Description,
		EstimatedArrivalTime: payout.EstimatedArrivalTime,
		CreatedAt:            payout.CreatedAt,
	}
}
