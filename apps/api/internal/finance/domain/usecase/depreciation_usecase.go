package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/reference"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func parseYearMonthPeriod(period string) (time.Time, error) {
	period = strings.TrimSpace(period)
	if period == "" {
		return time.Time{}, errors.New("period is required")
	}
	parsed, err := time.ParseInLocation("2006-01", period, apptime.Location())
	if err != nil {
		return time.Time{}, errors.New("period must be in YYYY-MM format")
	}
	return parsed, nil
}

func calculateDepreciation(asset *financeModels.Asset, method financeModels.DepreciationMethod) (float64, error) {
	if asset == nil {
		return 0, errors.New("asset is required")
	}
	if asset.GetUsefulLifeMonths() <= 0 {
		return 0, errors.New("useful_life_months must be greater than zero")
	}
	if !asset.CanDepreciate() {
		return 0, errors.New("asset is fully depreciated")
	}

	bookValue := round2(asset.BookValue)
	if bookValue <= asset.SalvageValue {
		return 0, errors.New("asset is fully depreciated")
	}

	var amount float64
	switch method {
	case financeModels.DepreciationMethodStraightLine:
		amount = round2(asset.AcquisitionCost / float64(asset.GetUsefulLifeMonths()))
	case financeModels.DepreciationMethodDecliningBalance:
		amount = round2((2.0 / float64(asset.GetUsefulLifeMonths())) * bookValue)
	case financeModels.DepreciationMethodNone:
		return 0, errors.New("asset is not depreciable")
	default:
		return 0, fmt.Errorf("unsupported depreciation method: %s", method)
	}

	remainingFloor := math.Max(0, bookValue-asset.SalvageValue)
	if remainingFloor <= 0 {
		return 0, errors.New("asset is fully depreciated")
	}
	if amount > remainingFloor {
		amount = remainingFloor
	}
	if amount <= 0 {
		return 0, errors.New("depreciation amount must be greater than zero")
	}
	return round2(amount), nil
}

func (uc *assetUsecase) GetDepreciationSchedule(ctx context.Context, req *dto.RunDepreciationRequest) (*dto.DepreciationScheduleResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	periodStart, err := parseYearMonthPeriod(req.Period)
	if err != nil {
		return nil, err
	}
	periodEnd := periodStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
	periodKey := ymPeriod(periodStart)

	q := database.GetDB(ctx, uc.db).
		Model(&financeModels.Asset{}).
		Preload("Category").
		Preload("Location").
		Where("status = ?", financeModels.AssetStatusActive).
		Where("acquisition_date <= ?", periodEnd)
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())
	if req.AssetID != nil && strings.TrimSpace(*req.AssetID) != "" {
		q = q.Where("id = ?", strings.TrimSpace(*req.AssetID))
	}
	if req.CategoryID != nil && strings.TrimSpace(*req.CategoryID) != "" {
		q = q.Where("category_id = ?", strings.TrimSpace(*req.CategoryID))
	}
	if req.LocationID != nil && strings.TrimSpace(*req.LocationID) != "" {
		q = q.Where("location_id = ?", strings.TrimSpace(*req.LocationID))
	}

	var assets []financeModels.Asset
	if err := q.Order("code asc").Find(&assets).Error; err != nil {
		return nil, err
	}

	items := make([]dto.DepreciationScheduleItem, 0, len(assets))
	posted := 0
	pending := 0
	totalAmount := 0.0

	for i := range assets {
		asset := &assets[i]
		item := dto.DepreciationScheduleItem{
			AssetID:                 asset.ID,
			AssetCode:               asset.Code,
			AssetName:               asset.Name,
			CategoryID:              asset.CategoryID,
			LocationID:              asset.LocationID,
			Method:                  asset.GetDepreciationMethod(),
			Period:                  periodKey,
			AcquisitionCost:         asset.AcquisitionCost,
			AccumulatedDepreciation: round2(asset.AccumulatedDepreciation),
			NetBookValue:            round2(asset.BookValue),
			Status:                  "skipped",
		}
		if asset.Category != nil {
			item.CategoryName = asset.Category.Name
		}
		if asset.Location != nil {
			item.LocationName = asset.Location.Name
		}

		var dep financeModels.AssetDepreciation
		err := database.GetDB(ctx, uc.db).
			Where("asset_id = ? AND period = ?", asset.ID, periodKey).
			First(&dep).Error
		if err == nil {
			item.DepreciationAmount = round2(dep.Amount)
			item.Posted = dep.Status == financeModels.AssetDepreciationStatusApproved || dep.JournalEntryID != nil
			item.Highlighted = !item.Posted
			item.JournalEntryID = dep.JournalEntryID
			if item.Posted {
				item.Status = "posted"
				posted++
				totalAmount += dep.Amount
			} else {
				item.Status = "pending"
				pending++
			}
		} else if err == gorm.ErrRecordNotFound {
			method := financeModels.DepreciationMethod(asset.GetDepreciationMethod())
			amount, calcErr := calculateDepreciation(asset, method)
			if calcErr != nil {
				item.SkipReason = calcErr.Error()
				item.Highlighted = true
			} else {
				item.DepreciationAmount = amount
				item.Posted = false
				item.Highlighted = true
				item.Status = "pending"
				pending++
				totalAmount += amount
			}
		} else {
			item.SkipReason = "failed to check depreciation status"
			item.Highlighted = true
		}

		items = append(items, item)
	}

	return &dto.DepreciationScheduleResponse{
		Period:      periodKey,
		TotalAssets: len(items),
		Posted:      posted,
		Pending:     pending,
		TotalAmount: round2(totalAmount),
		Items:       items,
	}, nil
}

func (uc *assetUsecase) GetDepreciationHistory(ctx context.Context, period string) (*dto.DepreciationHistoryResponse, error) {
	period = strings.TrimSpace(period)
	if period == "" {
		return nil, errors.New("period is required")
	}

	var entries []financeModels.AssetDepreciation
	q := database.GetDB(ctx, uc.db).
		Preload("Asset").
		Where("period = ?", period)
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())
	if err := q.Order("created_at desc").Find(&entries).Error; err != nil {
		return nil, err
	}

	items := make([]dto.DepreciationHistoryItem, 0, len(entries))
	posted := 0
	pending := 0
	for i := range entries {
		entry := &entries[i]
		item := dto.DepreciationHistoryItem{
			DepreciationID: entry.ID,
			AssetID:        entry.AssetID,
			Period:         entry.Period,
			Amount:         round2(entry.Amount),
			Posted:         entry.Status == financeModels.AssetDepreciationStatusApproved || entry.JournalEntryID != nil,
			JournalEntryID: entry.JournalEntryID,
			CreatedAt:      entry.CreatedAt,
		}
		if entry.Asset != nil {
			item.AssetCode = entry.Asset.Code
			item.AssetName = entry.Asset.Name
		}
		if item.Posted {
			posted++
		} else {
			pending++
		}
		items = append(items, item)
	}

	return &dto.DepreciationHistoryResponse{
		Period:  period,
		Total:   len(items),
		Posted:  posted,
		Pending: pending,
		Items:   items,
	}, nil
}

func (uc *assetUsecase) RunDepreciation(ctx context.Context, req *dto.RunDepreciationRequest) (*dto.BatchDepreciationRunResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	periodStart, err := parseYearMonthPeriod(req.Period)
	if err != nil {
		return nil, err
	}
	periodEnd := periodStart.AddDate(0, 1, 0).Add(-time.Nanosecond)
	periodKey := ymPeriod(periodStart)

	var existingCount int64
	idempotencyQuery := database.GetDB(ctx, uc.db).Model(&financeModels.AssetDepreciation{}).Where("period = ?", periodKey)
	idempotencyQuery = security.ApplyScopeFilter(idempotencyQuery, ctx, security.FinanceScopeQueryOptions())
	if err := idempotencyQuery.Count(&existingCount).Error; err != nil {
		return nil, err
	}
	if existingCount > 0 {
		return nil, errors.New("depreciation already run for this period")
	}

	q := database.GetDB(ctx, uc.db).
		Model(&financeModels.Asset{}).
		Preload("Category").
		Preload("Location").
		Where("status = ?", financeModels.AssetStatusActive).
		Where("acquisition_date <= ?", periodEnd)
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())
	if req.AssetID != nil && strings.TrimSpace(*req.AssetID) != "" {
		q = q.Where("id = ?", strings.TrimSpace(*req.AssetID))
	}
	if req.CategoryID != nil && strings.TrimSpace(*req.CategoryID) != "" {
		q = q.Where("category_id = ?", strings.TrimSpace(*req.CategoryID))
	}
	if req.LocationID != nil && strings.TrimSpace(*req.LocationID) != "" {
		q = q.Where("location_id = ?", strings.TrimSpace(*req.LocationID))
	}

	var assets []financeModels.Asset
	if err := q.Order("code asc").Find(&assets).Error; err != nil {
		return nil, err
	}

	currencyCode := currencyCodeFromContext(ctx)
	items := make([]dto.BatchDepreciationRunItem, 0, len(assets))
	posted := 0
	skipped := 0
	failed := 0
	totalAmount := 0.0
	journalIDs := make([]string, 0, len(assets))

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range assets {
			asset := &assets[i]
			runItem := dto.BatchDepreciationRunItem{
				AssetID:      asset.ID,
				AssetCode:    asset.Code,
				AssetName:    asset.Name,
				CurrencyCode: currencyCode,
			}

			if asset.Category == nil {
				runItem.Status = "skipped"
				runItem.Reason = "asset category not found"
				skipped++
				items = append(items, runItem)
				continue
			}

			if !asset.CanDepreciate() {
				runItem.Status = "skipped"
				runItem.Reason = "asset fully depreciated or not depreciable"
				skipped++
				items = append(items, runItem)
				continue
			}

			method := financeModels.DepreciationMethod(asset.GetDepreciationMethod())
			amount, calcErr := calculateDepreciation(asset, method)
			if calcErr != nil {
				runItem.Status = "failed"
				runItem.Reason = calcErr.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			if amount <= 0 {
				runItem.Status = "skipped"
				runItem.Reason = "depreciation amount is zero"
				skipped++
				items = append(items, runItem)
				continue
			}

			bookValue := round2(asset.BookValue - amount)
			if bookValue < asset.SalvageValue {
				amount = round2(asset.BookValue - asset.SalvageValue)
				bookValue = round2(asset.SalvageValue)
			}
			if amount <= 0 {
				runItem.Status = "skipped"
				runItem.Reason = "asset already at salvage value"
				skipped++
				items = append(items, runItem)
				continue
			}

			companyID, err := uc.resolveCompanyIDForDepreciation(ctx, asset.CompanyID, actorID)
			if err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			if existingErr := tx.Where("asset_id = ? AND period = ?", asset.ID, periodKey).First(&financeModels.AssetDepreciation{}).Error; existingErr == nil {
				runItem.Status = "failed"
				runItem.Reason = "period already processed for asset"
				failed++
				items = append(items, runItem)
				continue
			} else if existingErr != gorm.ErrRecordNotFound {
				runItem.Status = "failed"
				runItem.Reason = existingErr.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			dep := &financeModels.AssetDepreciation{
				TenantID:            asset.TenantID,
				AssetID:             asset.ID,
				Period:              periodKey,
				DepreciationDate:    periodStart,
				Method:              method,
				Amount:              amount,
				Accumulated:         round2(asset.AccumulatedDepreciation + amount),
				BookValue:           bookValue,
				Status:              financeModels.AssetDepreciationStatusPending,
				CreatedBy:           &actorID,
			}
			if err := tx.Create(dep).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			cat := asset.Category
			expenseAccountID := strings.TrimSpace(cat.DepreciationExpenseAccountID)
			accumulatedDepreciationAccountID := strings.TrimSpace(cat.AccumulatedDepreciationAccountID)
			if expenseAccountID == "" || accumulatedDepreciationAccountID == "" {
				return errors.New("asset category depreciation accounts are not configured")
			}

			expenseUUID, err := uuid.Parse(expenseAccountID)
			if err != nil {
				return errors.New("depreciation expense account id is invalid")
			}
			accUUID, err := uuid.Parse(accumulatedDepreciationAccountID)
			if err != nil {
				return errors.New("accumulated depreciation account id is invalid")
			}

			actorUUID, actorErr := uuid.Parse(actorID)
			var actorPtr *string
			if actorErr == nil {
				actorPtr = &actorID
			}

			refType := string(reference.RefTypeAssetDepreciation)
			now := apptime.Now()
			journalEntry := &financeModels.JournalEntry{
				CompanyID:     companyID,
				EntryDate:     periodStart,
				Description:   fmt.Sprintf("Asset depreciation %s (%s)", asset.Code, periodKey),
				ReferenceType: &refType,
				ReferenceID:   &dep.ID,
				Status:        financeModels.JournalStatusPosted,
				JournalType:   financeModels.JournalTypeGeneral,
				DebitTotal:    amount,
				CreditTotal:   amount,
				CurrencyCode:  currencyCode,
				ExchangeRate:  1,
				PostedAt:      &now,
				PostedBy:      actorPtr,
				CreatedBy:     actorPtr,
				IsSystemGenerated: true,
				Source:        financeModels.JournalSourceOperational,
			}
			if err := tx.Create(journalEntry).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			debitLine := &financeModels.JournalLine{
				JournalEntryID:             journalEntry.ID,
				ChartOfAccountID:           expenseUUID.String(),
				Debit:                      amount,
				Memo:                       "Depreciation expense",
			}
			creditLine := &financeModels.JournalLine{
				JournalEntryID:             journalEntry.ID,
				ChartOfAccountID:           accUUID.String(),
				Credit:                     amount,
				Memo:                       "Accumulated depreciation",
			}
			if err := tx.Create(debitLine).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}
			if err := tx.Create(creditLine).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			if err := tx.Model(&financeModels.AssetDepreciation{}).
				Where("id = ?", dep.ID).
				Updates(map[string]interface{}{
					"status":           financeModels.AssetDepreciationStatusApproved,
					"journal_entry_id": journalEntry.ID,
				}).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			if err := tx.Model(&financeModels.Asset{}).
				Where("id = ?", asset.ID).
				Updates(map[string]interface{}{
					"accumulated_depreciation": round2(asset.AccumulatedDepreciation + amount),
					"book_value":               bookValue,
					"is_fully_depreciated":     bookValue <= asset.SalvageValue,
				}).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			audit := &financeModels.AssetAuditLog{
				AssetID:     uuid.MustParse(asset.ID),
				Action:      "depreciated",
				PerformedBy: &actorUUID,
				Changes: financeModels.AuditChanges{{
					Field:    "book_value",
					OldValue: asset.BookValue,
					NewValue:  bookValue,
				}},
				Metadata: financeModels.MapStringInterface{
					"period":      periodKey,
					"amount":      amount,
					"journal_id":  journalEntry.ID,
					"event":       "depreciation.posted",
					"company_id":  companyID,
				},
			}
			if err := tx.Create(audit).Error; err != nil {
				runItem.Status = "failed"
				runItem.Reason = err.Error()
				failed++
				items = append(items, runItem)
				continue
			}

			_ = actorUUID
			dep.JournalEntryID = &journalEntry.ID
			runItem.Amount = amount
			runItem.Status = "posted"
			runItem.JournalEntryID = &journalEntry.ID
			posted++
			totalAmount += amount
			journalIDs = append(journalIDs, journalEntry.ID)
			items = append(items, runItem)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &dto.BatchDepreciationRunResponse{
		CurrencyCode: currencyCode,
		Processed:    len(items),
		Posted:       posted,
		Skipped:      skipped,
		Failed:       failed,
		Items:        items,
	}, nil
}
