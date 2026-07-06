package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math"
	"math/big"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/redis"
	resendClient "github.com/gilabs/gims/api/internal/core/infrastructure/resend"
	"github.com/gilabs/gims/api/internal/core/infrastructure/xendit"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

var (
	ErrPOSSettlementNotConfigured       = errors.New("pos settlement is not configured")
	ErrPOSSettlementInsufficientBalance = errors.New("pos settlement balance is insufficient")
	ErrPOSSettlementPayoutFailed        = errors.New("pos settlement payout failed")
)

const (
	PayoutFeeAmount  = 2500.0
	PayoutVatPercent = 0.11
)

type POSSettlementUsecase interface {
	GetOverview(ctx context.Context, tenantID string) (*dto.POSSettlementOverviewResponse, error)
	GetPayoutChannels(ctx context.Context, currency, category string) ([]dto.POSSettlementPayoutChannelResponse, error)
	CreatePayout(ctx context.Context, tenantID, requestedBy string, req *dto.CreatePOSSettlementPayoutRequest) (*dto.POSSettlementPayoutResponse, error)
	ListPayouts(ctx context.Context, tenantID string) ([]*dto.POSSettlementPayoutResponse, error)
	ValidateBankAccount(ctx context.Context, req *dto.ValidatePOSBankAccountRequest) (*dto.ValidatePOSBankAccountResponse, error)
	RequestPayoutOTP(ctx context.Context, tenantID, userID string, amount float64) error
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
		PayoutFee:               PayoutFeeAmount,
		PayoutVatPercent:        PayoutVatPercent,
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
	// OTP Verification
	rdb := redis.GetClient()
	if rdb != nil {
		otpKey := fmt.Sprintf("payout_otp:%s", tenantID)
		storedOTP, err := rdb.Get(ctx, otpKey).Result()
		if err != nil {
			if errors.Is(err, goredis.Nil) {
				return nil, errors.New("OTP expired or not requested")
			}
			return nil, err
		}
		if storedOTP != strings.TrimSpace(req.OTPCode) {
			return nil, errors.New("invalid OTP code")
		}
		_ = rdb.Del(ctx, otpKey)
	}

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
	fee := PayoutFeeAmount
	vat := math.Round(fee * PayoutVatPercent)
	totalDeduction := amount + fee + vat

	overview, err := u.GetOverview(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if !overview.Configured {
		return nil, ErrPOSSettlementNotConfigured
	}
	if totalDeduction > overview.AvailablePayoutAmount {
		return nil, ErrPOSSettlementInsufficientBalance
	}

	balance, err := client.GetBalance(ctx, "IDR")
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrPOSSettlementPayoutFailed, err)
	}
	if balance.Balance < totalDeduction {
		return nil, ErrPOSSettlementInsufficientBalance
	}

	payout := &posModels.POSSettlementPayout{
		TenantID:            tenantID,
		ReferenceID:         "gims-settlement-" + uuid.NewString(),
		IdempotencyKey:      idempotencyKey,
		Status:              posModels.POSSettlementPayoutStatusPending,
		Amount:              amount,
		Fee:                 fee,
		Vat:                 vat,
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
		Fee:                  payout.Fee,
		Vat:                  payout.Vat,
		Currency:             payout.Currency,
		ChannelCode:          payout.ChannelCode,
		AccountNumberMasked:  payout.AccountNumberMasked,
		AccountHolderName:    payout.AccountHolderName,
		Description:          payout.Description,
		EstimatedArrivalTime: payout.EstimatedArrivalTime,
		CreatedAt:            payout.CreatedAt,
	}
}

func (u *posSettlementUsecase) ValidateBankAccount(ctx context.Context, req *dto.ValidatePOSBankAccountRequest) (*dto.ValidatePOSBankAccountResponse, error) {
	client := settlementClient()
	if !client.IsConfigured() {
		return nil, ErrPOSSettlementNotConfigured
	}

	code := strings.ToUpper(strings.TrimSpace(req.BankCode))
	isEwallet := strings.Contains(code, "DANA") ||
		strings.Contains(code, "GOPAY") ||
		strings.Contains(code, "OVO") ||
		strings.Contains(code, "LINKAJA") ||
		strings.Contains(code, "SHOPEEPAY") ||
		strings.Contains(code, "ASTRAPAY") ||
		strings.Contains(code, "JENIUS")

	if isEwallet {
		// Ewallets bypass name lookup check to avoid blocking since Xendit data lookup API is for banks.
		return &dto.ValidatePOSBankAccountResponse{
			BankCode:          req.BankCode,
			AccountNumber:     req.AccountNumber,
			AccountHolderName: "E-Wallet Account (" + req.AccountNumber + ")",
			Status:            "SUCCESS",
		}, nil
	}

	// Xendit's /bank_accounts/data_lookup uses legacy bank codes (e.g. "BCA", "MANDIRI"),
	// but the Payouts API channels use prefixed codes (e.g. "ID_BCA", "ID_MANDIRI").
	// Strip the "ID_" prefix before sending to the data lookup endpoint.
	lookupCode := code
	if strings.HasPrefix(lookupCode, "ID_") {
		lookupCode = strings.TrimPrefix(lookupCode, "ID_")
	}

	res, err := client.ValidateBankAccount(ctx, xendit.ValidateBankAccountRequest{
		BankCode:      lookupCode,
		AccountNumber: strings.TrimSpace(req.AccountNumber),
	})
	if err != nil {
		var apiErr *xendit.APIError
		if errors.As(err, &apiErr) && apiErr.StatusCode == 404 {
			return nil, errors.New("account not found or invalid")
		}
		return nil, err
	}
	return &dto.ValidatePOSBankAccountResponse{
		BankCode:          req.BankCode, // return original channel code (e.g. "ID_BCA") for frontend consistency
		AccountNumber:     res.AccountNumber,
		AccountHolderName: res.AccountHolderName,
		Status:            res.Status,
	}, nil
}

func (u *posSettlementUsecase) RequestPayoutOTP(ctx context.Context, tenantID, userID string, amount float64) error {
	otpCode := generate6DigitOTP()

	rdb := redis.GetClient()
	if rdb == nil {
		return errors.New("redis client not available for OTP registration")
	}
	otpKey := fmt.Sprintf("payout_otp:%s", tenantID)
	err := rdb.Set(ctx, otpKey, otpCode, 10*time.Minute).Err()
	if err != nil {
		return fmt.Errorf("failed to save OTP in redis: %w", err)
	}

	// Fetch user email
	var email string
	err = database.DB.WithContext(ctx).Table("users").Where("id = ? AND deleted_at IS NULL", userID).Select("email").Scan(&email).Error
	if err != nil {
		return fmt.Errorf("failed to retrieve user email: %w", err)
	}
	if email == "" {
		return errors.New("user email is empty")
	}

	// Send email using Resend
	resCl := getResendClient()
	if resCl == nil {
		return errors.New("resend client is not configured")
	}

	fromEmail := "GIMS <cs@gilabs.id>"
	if config.AppConfig != nil && config.AppConfig.Resend.FromEmail != "" {
		fromEmail = config.AppConfig.Resend.FromEmail
	}

	formattedAmount := fmt.Sprintf("Rp%s", formatIDRValue(amount))
	htmlBody := fmt.Sprintf(PayoutOTPEmailTemplate, formattedAmount, otpCode, time.Now().Year())

	_, err = resCl.SendEmail(ctx, &resendClient.SendEmailRequest{
		From:    fromEmail,
		To:      []string{email},
		Subject: "[GIMS] Kode Verifikasi Penarikan Dana POS",
		HTML:    htmlBody,
	})
	if err != nil {
		return fmt.Errorf("failed to send OTP email: %w", err)
	}

	return nil
}

func getResendClient() *resendClient.Client {
	if config.AppConfig == nil || config.AppConfig.Resend.APIKey == "" {
		return nil
	}
	return resendClient.NewClient(config.AppConfig.Resend.APIKey)
}

func generate6DigitOTP() string {
	var otp string
	for i := 0; i < 6; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(10))
		otp += fmt.Sprintf("%d", num.Int64())
	}
	return otp
}

func formatIDRValue(value float64) string {
	parts := strings.Split(fmt.Sprintf("%.0f", value), "")
	var result []string
	for i, p := range parts {
		if i > 0 && (len(parts)-i)%3 == 0 {
			result = append(result, ".")
		}
		result = append(result, p)
	}
	return strings.Join(result, "")
}

const PayoutOTPEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Kode Verifikasi Penarikan Dana</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <h2 style="color: #2563eb; margin-top: 0;">Verifikasi Penarikan Dana</h2>
        <p>Halo,</p>
        <p>Anda menerima email ini karena ada permintaan penarikan dana (payout) POS Settlement dari akun GIMS Anda sebesar <strong>%s</strong>.</p>
        <p>Untuk melanjutkan transaksi ini, masukkan kode verifikasi 6 digit berikut di halaman penarikan:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; margin: 20px 0; color: #111827;">
            %s
        </div>
        <p style="font-size: 13px; color: #6b7280;">Kode verifikasi ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.</p>
        <p style="font-size: 13px; color: #6b7280;">Jika Anda tidak merasa melakukan transaksi ini, harap segera amankan akun Anda atau hubungi customer service kami.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">&copy; %d GIMS Platform. All rights reserved.</p>
    </div>
</body>
</html>
`
