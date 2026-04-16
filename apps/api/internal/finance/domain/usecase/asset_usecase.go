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
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	finDTO "github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"github.com/gilabs/gims/api/internal/finance/domain/reference"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrAssetNotFound          = errors.New("asset not found")
	ErrAssetDisposedImmutable = errors.New("disposed asset cannot be modified")
)

type AssetUsecase interface {
	Create(ctx context.Context, req *dto.CreateAssetRequest) (*dto.AssetResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateAssetRequest) (*dto.AssetResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.AssetResponse, error)
	List(ctx context.Context, req *dto.ListAssetsRequest) ([]dto.AssetResponse, int64, error)
	Depreciate(ctx context.Context, id string, req *dto.DepreciateAssetRequest) (*dto.AssetResponse, error)
	ApproveDepreciation(ctx context.Context, id string) (*dto.AssetResponse, error)
	Transfer(ctx context.Context, id string, req *dto.TransferAssetRequest) (*dto.AssetResponse, error)
	Dispose(ctx context.Context, id string, req *dto.DisposeAssetRequest) (*dto.AssetResponse, error)
	Sell(ctx context.Context, id string, req *dto.SellAssetRequest) (*dto.AssetResponse, error)
	Revalue(ctx context.Context, id string, req *dto.RevalueAssetRequest) (*dto.AssetResponse, error)
	Adjust(ctx context.Context, id string, req *dto.AdjustAssetRequest) (*dto.AssetResponse, error)
	ApproveTransaction(ctx context.Context, txID string) (*dto.AssetResponse, error)
	CreateFromPurchase(ctx context.Context, req *dto.CreateAssetFromPurchaseRequest) error
	GetFormData(ctx context.Context) (*dto.AssetFormDataResponse, error)

	// Available assets for employee borrowing
	GetAvailableAssets(ctx context.Context) ([]dto.AvailableAssetResponse, error)

	// Phase 2: Attachments, Assignments, Audit Logs
	ListAttachments(ctx context.Context, assetID string) ([]dto.AssetAttachmentResponse, error)
	CreateAttachment(ctx context.Context, assetID string, att *financeModels.AssetAttachment) (*dto.AssetAttachmentResponse, error)
	DeleteAttachment(ctx context.Context, assetID string, attachmentID string) error
	Assign(ctx context.Context, id string, req *dto.AssignAssetRequest) (*dto.AssetResponse, error)
	Return(ctx context.Context, id string, req *dto.ReturnAssetRequest) (*dto.AssetResponse, error)
	ListAuditLogs(ctx context.Context, assetID string) ([]dto.AssetAuditLogResponse, error)
	ListAssignmentHistory(ctx context.Context, assetID string) ([]dto.AssetAssignmentHistoryResponse, error)
}

type assetUsecase struct {
	db             *gorm.DB
	coaRepo        repositories.ChartOfAccountRepository
	catRepo        repositories.AssetCategoryRepository
	locRepo        repositories.AssetLocationRepository
	repo           repositories.AssetRepository
	attachmentRepo repositories.AssetAttachmentRepository
	auditLogRepo   repositories.AssetAuditLogRepository
	assignmentRepo repositories.AssetAssignmentRepository
	mapper         *mapper.AssetMapper
	journalUC      JournalEntryUsecase
}

func NewAssetUsecase(
	db *gorm.DB,
	coaRepo repositories.ChartOfAccountRepository,
	catRepo repositories.AssetCategoryRepository,
	locRepo repositories.AssetLocationRepository,
	repo repositories.AssetRepository,
	mapper *mapper.AssetMapper,
	attachmentRepo repositories.AssetAttachmentRepository,
	auditLogRepo repositories.AssetAuditLogRepository,
	assignmentRepo repositories.AssetAssignmentRepository,
	journalUC ...JournalEntryUsecase,
) AssetUsecase {
	uc := &assetUsecase{
		db: db, coaRepo: coaRepo, catRepo: catRepo, locRepo: locRepo,
		repo: repo, mapper: mapper,
		attachmentRepo: attachmentRepo, auditLogRepo: auditLogRepo, assignmentRepo: assignmentRepo,
	}
	if len(journalUC) > 0 {
		uc.journalUC = journalUC[0]
	}
	return uc
}

func parseAssetDateStrict(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, errors.New("date is required")
	}
	return time.Parse("2006-01-02", value)
}

func ymPeriod(t time.Time) string {
	return fmt.Sprintf("%04d-%02d", t.Year(), int(t.Month()))
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func (uc *assetUsecase) Create(ctx context.Context, req *dto.CreateAssetRequest) (*dto.AssetResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	acqDate, err := parseAssetDateStrict(req.AcquisitionDate)
	if err != nil {
		return nil, err
	}

	cat, err := uc.catRepo.FindByID(ctx, strings.TrimSpace(req.CategoryID))
	if err != nil {
		return nil, err
	}
	if !cat.IsActive {
		return nil, errors.New("asset category is inactive")
	}
	if _, err := uc.locRepo.FindByID(ctx, strings.TrimSpace(req.LocationID)); err != nil {
		return nil, err
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		code, _ = uc.repo.GenerateCode(ctx)
	}

	item := &financeModels.Asset{
		Code:                    code,
		Name:                    strings.TrimSpace(req.Name),
		Description:             strings.TrimSpace(req.Description),
		CategoryID:              strings.TrimSpace(req.CategoryID),
		LocationID:              strings.TrimSpace(req.LocationID),
		AcquisitionDate:         acqDate,
		AcquisitionCost:         req.AcquisitionCost,
		SalvageValue:            req.SalvageValue,
		AccumulatedDepreciation: 0,
		BookValue:               req.AcquisitionCost,
		Status:                  financeModels.AssetStatusActive,
		CreatedBy:               &actorID,
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(item).Error; err != nil {
			return err
		}
		txRec := &financeModels.AssetTransaction{
			AssetID:         item.ID,
			Type:            financeModels.AssetTransactionTypeAcquire,
			TransactionDate: acqDate,
			Description:     "Asset acquired",
			CreatedBy:       &actorID,
		}
		return tx.Create(txRec).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, item.ID, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) Update(ctx context.Context, id string, req *dto.UpdateAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	existing, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if existing.Status == financeModels.AssetStatusDisposed {
		return nil, ErrAssetDisposedImmutable
	}

	acqDate, err := parseAssetDateStrict(req.AcquisitionDate)
	if err != nil {
		return nil, err
	}
	cat, err := uc.catRepo.FindByID(ctx, strings.TrimSpace(req.CategoryID))
	if err != nil {
		return nil, err
	}
	if !cat.IsActive {
		return nil, errors.New("asset category is inactive")
	}
	if _, err := uc.locRepo.FindByID(ctx, strings.TrimSpace(req.LocationID)); err != nil {
		return nil, err
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	status := existing.Status
	if strings.TrimSpace(string(req.Status)) != "" {
		status = req.Status
	}

	updates := map[string]interface{}{
		"code":             strings.TrimSpace(req.Code),
		"name":             strings.TrimSpace(req.Name),
		"description":      strings.TrimSpace(req.Description),
		"category_id":      strings.TrimSpace(req.CategoryID),
		"location_id":      strings.TrimSpace(req.LocationID),
		"acquisition_date": acqDate,
		"acquisition_cost": req.AcquisitionCost,
		"salvage_value":    req.SalvageValue,
		"status":           status,
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&financeModels.Asset{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		txRec := &financeModels.AssetTransaction{
			AssetID:         id,
			Type:            financeModels.AssetTransactionTypeUpdate,
			TransactionDate: apptime.Now(),
			Description:     "Asset updated",
			CreatedBy:       &actorID,
		}
		return tx.Create(txRec).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	existing, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrAssetNotFound
		}
		return err
	}
	if existing.Status == financeModels.AssetStatusDisposed {
		return ErrAssetDisposedImmutable
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.Asset{}, "id = ?", id).Error
}

func (uc *assetUsecase) GetByID(ctx context.Context, id string) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if !security.CheckRecordScopeAccess(database.DB, ctx, &financeModels.Asset{}, id, security.FinanceScopeQueryOptions()) {
		return nil, ErrAssetNotFound
	}
	item, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item, true)
	return &res, nil
}

func (uc *assetUsecase) List(ctx context.Context, req *dto.ListAssetsRequest) ([]dto.AssetResponse, int64, error) {
	if req == nil {
		req = &dto.ListAssetsRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	var startDate *time.Time
	if req.StartDate != nil && strings.TrimSpace(*req.StartDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.StartDate))
		if err != nil {
			return nil, 0, errors.New("invalid start_date")
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if req.EndDate != nil && strings.TrimSpace(*req.EndDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EndDate))
		if err != nil {
			return nil, 0, errors.New("invalid end_date")
		}
		endDate = &parsed
	}

	items, total, err := uc.repo.List(ctx, repositories.AssetListParams{
		Search:     req.Search,
		Status:     req.Status,
		CategoryID: req.CategoryID,
		LocationID: req.LocationID,
		StartDate:  startDate,
		EndDate:    endDate,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.AssetResponse, 0, len(items))
	for i := range items {
		mapped := uc.mapper.ToResponse(&items[i], false)
		res = append(res, mapped)
	}
	return res, total, nil
}

func (uc *assetUsecase) Depreciate(ctx context.Context, id string, req *dto.DepreciateAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	asOfDate, err := parseAssetDateStrict(req.AsOfDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if asset.Status != financeModels.AssetStatusActive {
		return nil, errors.New("only active assets can be depreciated")
	}

	cat, err := uc.catRepo.FindByID(ctx, asset.CategoryID)
	if err != nil {
		return nil, err
	}

	if !cat.IsDepreciable || cat.DepreciationMethod == financeModels.DepreciationMethodNone {
		return nil, errors.New("this asset category is not depreciable")
	}

	// validate COA references exist
	if _, err := uc.coaRepo.FindByID(ctx, cat.DepreciationExpenseAccountID); err != nil {
		return nil, err
	}
	if _, err := uc.coaRepo.FindByID(ctx, cat.AccumulatedDepreciationAccountID); err != nil {
		return nil, err
	}

	period := ymPeriod(asOfDate)

	var createdID string
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// period closing guard
		if err := ensureNotClosed(ctx, tx, asOfDate); err != nil {
			return err
		}

		// already depreciated?
		var existing financeModels.AssetDepreciation
		err := tx.Where("asset_id = ? AND period = ?", asset.ID, period).First(&existing).Error
		if err == nil {
			return errors.New("asset already depreciated for this period")
		}
		if err != gorm.ErrRecordNotFound {
			return err
		}

		// last depreciation
		var last financeModels.AssetDepreciation
		lastErr := tx.Where("asset_id = ?", asset.ID).Order("depreciation_date desc").First(&last).Error
		bookValue := asset.AcquisitionCost - asset.AccumulatedDepreciation
		accumulated := asset.AccumulatedDepreciation
		periodsDone := 0
		if lastErr == nil {
			bookValue = last.BookValue
			accumulated = last.Accumulated
			var count int64
			_ = tx.Model(&financeModels.AssetDepreciation{}).Where("asset_id = ?", asset.ID).Count(&count).Error
			periodsDone = int(count)
		}

		remainingFloor := math.Max(0, bookValue-asset.SalvageValue)
		if remainingFloor <= 0.000001 {
			return errors.New("asset is fully depreciated")
		}

		var amount float64
		switch cat.DepreciationMethod {
		case financeModels.DepreciationMethodStraightLine:
			if cat.UsefulLifeMonths <= 0 {
				return errors.New("invalid useful_life_months")
			}
			if periodsDone >= cat.UsefulLifeMonths {
				return errors.New("asset has reached useful life")
			}
			base := asset.AcquisitionCost - asset.SalvageValue
			if base < 0 {
				base = 0
			}
			amount = base / float64(cat.UsefulLifeMonths)
		case financeModels.DepreciationMethodDecliningBalance:
			if cat.DepreciationRate <= 0 {
				return errors.New("depreciation_rate is required for DB")
			}
			amount = bookValue * cat.DepreciationRate
		default:
			return errors.New("unsupported depreciation_method")
		}

		amount = round2(amount)
		if amount <= 0 {
			return errors.New("depreciation amount must be > 0")
		}
		if amount > remainingFloor {
			amount = round2(remainingFloor)
		}

		newAccum := round2(accumulated + amount)
		newBook := round2(asset.AcquisitionCost - newAccum)

		d := &financeModels.AssetDepreciation{
			AssetID:          asset.ID,
			Period:           period,
			DepreciationDate: asOfDate,
			Method:           cat.DepreciationMethod,
			Amount:           amount,
			Accumulated:      newAccum,
			BookValue:        newBook,
			Status:           financeModels.AssetDepreciationStatusPending,
			CreatedBy:        &actorID,
			CreatedAt:        apptime.Now(),
		}
		if err := tx.Create(d).Error; err != nil {
			return err
		}

		txRec := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeDepreciate,
			TransactionDate: asOfDate,
			Description:     fmt.Sprintf("Depreciation pending for %s", period),
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		if err := tx.Create(txRec).Error; err != nil {
			return err
		}

		createdID = asset.ID
		return nil
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, createdID, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) ApproveDepreciation(ctx context.Context, id string) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	var dep financeModels.AssetDepreciation
	if err := uc.db.WithContext(ctx).Preload("Asset").First(&dep, "id = ?", id).Error; err != nil {
		return nil, errors.New("depreciation record not found")
	}

	if dep.Status != financeModels.AssetDepreciationStatusPending {
		return nil, errors.New("only pending depreciations can be approved")
	}

	asset := dep.Asset
	cat, err := uc.catRepo.FindByID(ctx, asset.CategoryID)
	if err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, dep.DepreciationDate); err != nil {
			return err
		}

		now := apptime.Now()
		refType := reference.RefTypeAssetDepreciation

		je := &financeModels.JournalEntry{
			EntryDate:     dep.DepreciationDate,
			Description:   fmt.Sprintf("Asset depreciation %s (%s)", asset.Code, dep.Period),
			ReferenceType: &refType,
			ReferenceID:   &dep.ID,
			Status:        financeModels.JournalStatusPosted,
			PostedAt:      &now,
			PostedBy:      &actorID,
			CreatedBy:     &actorID,
		}
		if err := tx.Create(je).Error; err != nil {
			return err
		}

		debit := &financeModels.JournalLine{
			JournalEntryID:   je.ID,
			ChartOfAccountID: cat.DepreciationExpenseAccountID,
			Debit:            dep.Amount,
			Memo:             "Depreciation expense",
		}
		tx.Create(debit)
		credit := &financeModels.JournalLine{
			JournalEntryID:   je.ID,
			ChartOfAccountID: cat.AccumulatedDepreciationAccountID,
			Credit:           dep.Amount,
			Memo:             "Accumulated depreciation",
		}
		tx.Create(credit)

		if err := tx.Model(&financeModels.AssetDepreciation{}).Where("id = ?", dep.ID).Updates(map[string]interface{}{
			"status":           financeModels.AssetDepreciationStatusApproved,
			"journal_entry_id": je.ID,
		}).Error; err != nil {
			return err
		}

		if err := tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Updates(map[string]interface{}{
			"accumulated_depreciation": dep.Accumulated,
			"book_value":               dep.BookValue,
		}).Error; err != nil {
			return err
		}

		txRec := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeDepreciate,
			TransactionDate: apptime.Now(),
			Description:     fmt.Sprintf("Depreciation approved for %s", dep.Period),
			ReferenceType:   &refType,
			ReferenceID:     &dep.ID,
			CreatedBy:       &actorID,
		}
		return tx.Create(txRec).Error
	})

	if err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, asset.ID, true)
	resp := uc.mapper.ToResponse(full, true)
	return &resp, nil
}

func (uc *assetUsecase) Transfer(ctx context.Context, id string, req *dto.TransferAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	transferDate, err := parseAssetDateStrict(req.TransferDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if asset.Status == financeModels.AssetStatusDisposed {
		return nil, ErrAssetDisposedImmutable
	}

	newLocationID := strings.TrimSpace(req.LocationID)
	if newLocationID == "" {
		return nil, errors.New("location_id is required")
	}
	if _, err := uc.locRepo.FindByID(ctx, newLocationID); err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, transferDate); err != nil {
			return err
		}

		desc := strings.TrimSpace(req.Description)
		if desc == "" {
			desc = "Asset transfer request"
		}
		tr := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeTransfer,
			TransactionDate: transferDate,
			Description:     desc,
			Status:          financeModels.AssetTransactionStatusDraft,
			ReferenceID:     &newLocationID, // Store target location ID in reference for approval
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		return tx.Create(tr).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, asset.ID, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) Dispose(ctx context.Context, id string, req *dto.DisposeAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	disposalDate, err := parseAssetDateStrict(req.DisposalDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if asset.Status == financeModels.AssetStatusDisposed {
		full, err := uc.repo.FindByID(ctx, asset.ID, true)
		if err != nil {
			return nil, err
		}
		res := uc.mapper.ToResponse(full, true)
		return &res, nil
	}

	err = database.GetDB(ctx, uc.db).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, disposalDate); err != nil {
			return err
		}

		desc := strings.TrimSpace(req.Description)
		if desc == "" {
			desc = "Asset disposal request"
		}
		tr := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeDispose,
			TransactionDate: disposalDate,
			Description:     desc,
			Status:          financeModels.AssetTransactionStatusDraft,
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		return tx.Create(tr).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, asset.ID, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) Sell(ctx context.Context, id string, req *dto.SellAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	disposalDate, err := parseAssetDateStrict(req.DisposalDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if asset.Status == financeModels.AssetStatusDisposed || asset.Status == financeModels.AssetStatusSold {
		full, err := uc.repo.FindByID(ctx, asset.ID, true)
		if err != nil {
			return nil, err
		}
		res := uc.mapper.ToResponse(full, true)
		return &res, nil
	}

	saleAmountStr := fmt.Sprintf("%.2f", req.SaleAmount)
	err = database.GetDB(ctx, uc.db).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, disposalDate); err != nil {
			return err
		}

		desc := strings.TrimSpace(req.Description)
		if desc == "" {
			desc = "Asset sold"
		}
		tr := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeDispose,
			TransactionDate: disposalDate,
			Amount:          req.SaleAmount,
			Description:     fmt.Sprintf("%s (sale amount: %s)", desc, saleAmountStr),
			Status:          financeModels.AssetTransactionStatusDraft,
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		if err := tx.Create(tr).Error; err != nil {
			return err
		}

		return tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Updates(map[string]interface{}{
			"status":      financeModels.AssetStatusSold,
			"disposed_at": disposalDate,
		}).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, asset.ID, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) CreateFromPurchase(ctx context.Context, req *dto.CreateAssetFromPurchaseRequest) error {
	tx := database.GetDB(ctx, uc.db)

	// Fallback Category
	var catID string
	if req.CategoryID != nil && *req.CategoryID != "" {
		catID = *req.CategoryID
	} else {
		var cat financeModels.AssetCategory
		if err := tx.First(&cat).Error; err == nil {
			catID = cat.ID
		}
	}

	// Fallback Location
	var locID string
	if req.LocationID != nil && *req.LocationID != "" {
		locID = *req.LocationID
	} else {
		var loc financeModels.AssetLocation
		if err := tx.First(&loc).Error; err == nil {
			locID = loc.ID
		}
	}

	parsedDate, _ := time.Parse("2006-01-02", req.AcquisitionDate)
	if parsedDate.IsZero() {
		parsedDate = apptime.Now()
	}

	asset := financeModels.Asset{
		Code:            req.Code,
		Name:            req.Name,
		CategoryID:      catID,
		LocationID:      locID,
		AcquisitionDate: parsedDate,
		AcquisitionCost: req.AcquisitionCost,
		Status:          financeModels.AssetStatusActive,
	}

	if err := tx.Create(&asset).Error; err != nil {
		return err
	}

	// Create transaction log
	tLog := financeModels.AssetTransaction{
		AssetID:         asset.ID,
		Type:            financeModels.AssetTransactionTypeAcquire,
		TransactionDate: parsedDate,
		Description:     fmt.Sprintf("Acquired from %s #%s", req.ReferenceType, req.ReferenceID),
		ReferenceType:   &req.ReferenceType,
		ReferenceID:     &req.ReferenceID,
	}

	if err := tx.Create(&tLog).Error; err != nil {
		return err
	}

	return nil
}

func (uc *assetUsecase) Revalue(ctx context.Context, id string, req *dto.RevalueAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	actorID, _ := ctx.Value("user_id").(string)
	date, err := parseAssetDateStrict(req.RevaluationDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, date); err != nil {
			return err
		}
		tr := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeRevalue,
			TransactionDate: date,
			Amount:          req.NewValue, // New total value
			Description:     req.Description,
			Status:          financeModels.AssetTransactionStatusDraft,
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		return tx.Create(tr).Error
	})
	if err != nil {
		return nil, err
	}
	full, _ := uc.repo.FindByID(ctx, asset.ID, true)
	resp := uc.mapper.ToResponse(full, true)
	return &resp, nil
}

func (uc *assetUsecase) Adjust(ctx context.Context, id string, req *dto.AdjustAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	actorID, _ := ctx.Value("user_id").(string)
	date, err := parseAssetDateStrict(req.AdjustmentDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, date); err != nil {
			return err
		}
		tr := &financeModels.AssetTransaction{
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeAdjust,
			TransactionDate: date,
			Amount:          req.AdjustmentAmount, // Delta amount
			Description:     req.Description,
			Status:          financeModels.AssetTransactionStatusDraft,
			CreatedBy:       &actorID,
			CreatedAt:       apptime.Now(),
		}
		return tx.Create(tr).Error
	})
	if err != nil {
		return nil, err
	}
	full, _ := uc.repo.FindByID(ctx, asset.ID, true)
	resp := uc.mapper.ToResponse(full, true)
	return &resp, nil
}

func (uc *assetUsecase) ApproveTransaction(ctx context.Context, txID string) (*dto.AssetResponse, error) {
	var tr financeModels.AssetTransaction
	if err := uc.db.WithContext(ctx).Preload("Asset").First(&tr, "id = ?", txID).Error; err != nil {
		return nil, errors.New("transaction not found")
	}

	if tr.Status != financeModels.AssetTransactionStatusDraft {
		return nil, errors.New("only draft transactions can be approved")
	}

	asset := tr.Asset
	actorID, _ := ctx.Value("user_id").(string)

	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, tr.TransactionDate); err != nil {
			return err
		}

		cat, _ := uc.catRepo.FindByID(ctx, asset.CategoryID)

		switch tr.Type {
		case financeModels.AssetTransactionTypeTransfer:
			if tr.ReferenceID != nil {
				tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Update("location_id", *tr.ReferenceID)
			}
		case financeModels.AssetTransactionTypeDispose:
			tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Updates(map[string]interface{}{
				"status":      financeModels.AssetStatusDisposed,
				"disposed_at": tr.TransactionDate,
			})
			// Journal: Debit Cash(100), Credit Asset(Ref: AcquisitionAccountID)
			// For simplicity, we just use the Asset Account
			if err := uc.createAssetJournal(tx, asset, &tr, cat.AssetAccountID, "Asset Disposal", tr.Amount, false); err != nil {
				return err
			}

		case financeModels.AssetTransactionTypeRevalue:
			oldVal := asset.AcquisitionCost - asset.AccumulatedDepreciation
			diff := tr.Amount - oldVal
			tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Update("acquisition_cost", asset.AcquisitionCost+diff)
			// Journal: Debit Asset, Credit Revaluation Reserve
			var revalCoA financeModels.ChartOfAccount
			if err := tx.Where("name ILIKE ?", "%Cadangan Revaluasi%").First(&revalCoA).Error; err == nil {
				if err := uc.createAssetJournal(tx, asset, &tr, revalCoA.ID, "Asset Revaluation", diff, true); err != nil {
					return err
				}
			} else {
				// Fallback to expense if no revaluation reserve found
				if err := uc.createAssetJournal(tx, asset, &tr, cat.DepreciationExpenseAccountID, "Asset Revaluation", diff, true); err != nil {
					return err
				}
			}

		case financeModels.AssetTransactionTypeAdjust:
			tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Update("acquisition_cost", asset.AcquisitionCost+tr.Amount)
			// Journal: Debit Asset, Credit Expense
			if err := uc.createAssetJournal(tx, asset, &tr, cat.DepreciationExpenseAccountID, "Asset Adjustment", tr.Amount, true); err != nil {
				return err
			}
		}

		return tx.Model(&financeModels.AssetTransaction{}).Where("id = ?", tr.ID).Updates(map[string]interface{}{
			"status":    financeModels.AssetTransactionStatusApproved,
			"posted_by": &actorID,
		}).Error
	})

	if err != nil {
		return nil, err
	}

	full, _ := uc.repo.FindByID(ctx, asset.ID, true)
	resp := uc.mapper.ToResponse(full, true)
	return &resp, nil
}

func (uc *assetUsecase) createAssetJournal(tx *gorm.DB, asset *financeModels.Asset, tr *financeModels.AssetTransaction, contraAccountID string, desc string, amount float64, isDebitAsset bool) error {
	if amount == 0 {
		return nil
	}
	if uc.journalUC == nil {
		return errors.New("journal usecase is not configured")
	}

	cat, _ := uc.catRepo.FindByID(tx.Statement.Context, asset.CategoryID)

	assetAccount := cat.AssetAccountID
	if strings.TrimSpace(assetAccount) == "" {
		return errors.New("asset account is not configured on category")
	}
	if strings.TrimSpace(contraAccountID) == "" {
		return errors.New("contra account is required")
	}

	lines := make([]finDTO.JournalLineRequest, 0, 2)

	if isDebitAsset {
		// Debit Asset, Credit Contra
		lines = append(lines,
			finDTO.JournalLineRequest{ChartOfAccountID: assetAccount, Debit: math.Abs(amount), Credit: 0, Memo: desc},
			finDTO.JournalLineRequest{ChartOfAccountID: contraAccountID, Debit: 0, Credit: math.Abs(amount), Memo: desc},
		)
	} else {
		// Debit Contra, Credit Asset
		lines = append(lines,
			finDTO.JournalLineRequest{ChartOfAccountID: contraAccountID, Debit: math.Abs(amount), Credit: 0, Memo: desc},
			finDTO.JournalLineRequest{ChartOfAccountID: assetAccount, Debit: 0, Credit: math.Abs(amount), Memo: desc},
		)
	}

	refType := reference.RefTypeAssetTransaction
	refID := tr.ID
	journalReq := &finDTO.CreateJournalEntryRequest{
		EntryDate:         tr.TransactionDate.Format("2006-01-02"),
		Description:       desc + ": " + asset.Code,
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
	}

	_, err := uc.journalUC.PostOrUpdateJournal(database.WithTx(tx.Statement.Context, tx), journalReq)
	return err
}

// ========== Phase 2: Attachments ==========

func (uc *assetUsecase) ListAttachments(ctx context.Context, assetID string) ([]dto.AssetAttachmentResponse, error) {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return nil, errors.New("asset_id is required")
	}

	items, err := uc.attachmentRepo.GetByAssetID(ctx, assetID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.AssetAttachmentResponse, 0, len(items))
	for i := range items {
		res = append(res, uc.mapper.ToAttachmentResponse(&items[i]))
	}
	return res, nil
}

func (uc *assetUsecase) CreateAttachment(ctx context.Context, assetID string, att *financeModels.AssetAttachment) (*dto.AssetAttachmentResponse, error) {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return nil, errors.New("asset_id is required")
	}

	// Verify asset exists
	if _, err := uc.repo.FindByID(ctx, assetID, false); err != nil {
		return nil, ErrAssetNotFound
	}

	if err := uc.attachmentRepo.Create(ctx, att); err != nil {
		return nil, fmt.Errorf("failed to create attachment: %w", err)
	}

	resp := uc.mapper.ToAttachmentResponse(att)
	return &resp, nil
}

func (uc *assetUsecase) DeleteAttachment(ctx context.Context, assetID string, attachmentID string) error {
	assetID = strings.TrimSpace(assetID)
	attachmentID = strings.TrimSpace(attachmentID)
	if assetID == "" || attachmentID == "" {
		return errors.New("asset_id and attachment_id are required")
	}

	att, err := uc.attachmentRepo.GetByID(ctx, attachmentID)
	if err != nil || att == nil {
		return errors.New("attachment not found")
	}
	if att.AssetID.String() != assetID {
		return errors.New("attachment does not belong to this asset")
	}

	return uc.attachmentRepo.Delete(ctx, attachmentID)
}

// ========== Phase 2: Assignments ==========

func (uc *assetUsecase) Assign(ctx context.Context, id string, req *dto.AssignAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if asset.Status == financeModels.AssetStatusDisposed || asset.Status == financeModels.AssetStatusSold {
		return nil, errors.New("disposed or sold asset cannot be assigned")
	}

	employeeID := strings.TrimSpace(req.EmployeeID)

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Close current assignment if exists
		currentAssignment, _ := uc.assignmentRepo.GetCurrentAssignment(ctx, id)
		if currentAssignment != nil {
			now := apptime.Now()
			reason := "Reassigned to another employee"
			if err := uc.assignmentRepo.MarkAsReturned(ctx, currentAssignment.ID.String(), now, reason); err != nil {
				return err
			}
		}

		// Create new assignment history
		assignment := &financeModels.AssetAssignmentHistory{
			AssetID:    parseUUID(id),
			EmployeeID: parseUUIDPtr(&employeeID),
			AssignedBy: parseUUIDPtr(&actorID),
			Notes:      req.Notes,
		}
		if req.DepartmentID != nil {
			assignment.DepartmentID = parseUUIDPtr(req.DepartmentID)
		}
		if req.LocationID != nil {
			assignment.LocationID = parseUUIDPtr(req.LocationID)
		}
		if err := uc.assignmentRepo.Create(ctx, assignment); err != nil {
			return err
		}

		// Update asset
		now := apptime.Now()
		updates := map[string]interface{}{
			"assigned_to_employee_id": employeeID,
			"assignment_date":         now,
		}
		if req.LocationID != nil {
			updates["location_id"] = *req.LocationID
		}
		return tx.Model(&financeModels.Asset{}).Where("id = ?", id).Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

func (uc *assetUsecase) Return(ctx context.Context, id string, req *dto.ReturnAssetRequest) (*dto.AssetResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	returnDate, err := parseAssetDateStrict(req.ReturnDate)
	if err != nil {
		return nil, err
	}

	asset, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}

	if !asset.IsAssigned() {
		return nil, errors.New("asset is not currently assigned")
	}

	currentAssignment, err := uc.assignmentRepo.GetCurrentAssignment(ctx, id)
	if err != nil || currentAssignment == nil {
		return nil, errors.New("no active assignment found")
	}

	reason := ""
	if req.ReturnReason != nil {
		reason = *req.ReturnReason
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := uc.assignmentRepo.MarkAsReturned(ctx, currentAssignment.ID.String(), returnDate, reason); err != nil {
			return err
		}

		return tx.Model(&financeModels.Asset{}).Where("id = ?", id).Updates(map[string]interface{}{
			"assigned_to_employee_id": nil,
			"assignment_date":         nil,
		}).Error
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full, true)
	return &res, nil
}

// ========== Phase 2: Audit Logs ==========

func (uc *assetUsecase) ListAuditLogs(ctx context.Context, assetID string) ([]dto.AssetAuditLogResponse, error) {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return nil, errors.New("asset_id is required")
	}

	items, err := uc.auditLogRepo.GetByAssetID(ctx, assetID, 100)
	if err != nil {
		return nil, err
	}

	res := make([]dto.AssetAuditLogResponse, 0, len(items))
	for i := range items {
		res = append(res, uc.mapper.ToAuditLogResponse(&items[i]))
	}
	return res, nil
}

// ========== Phase 2: Assignment History ==========

func (uc *assetUsecase) ListAssignmentHistory(ctx context.Context, assetID string) ([]dto.AssetAssignmentHistoryResponse, error) {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return nil, errors.New("asset_id is required")
	}

	items, err := uc.assignmentRepo.GetByAssetID(ctx, assetID)
	if err != nil {
		return nil, err
	}

	res := make([]dto.AssetAssignmentHistoryResponse, 0, len(items))
	for i := range items {
		res = append(res, uc.mapper.ToAssignmentHistoryResponse(&items[i]))
	}
	return res, nil
}

// ========== Available Assets for Employee Borrowing ==========

func (uc *assetUsecase) GetAvailableAssets(ctx context.Context) ([]dto.AvailableAssetResponse, error) {
	// Get assets with status "active" that are not currently assigned to any employee
	// and not currently borrowed in employee_assets table
	params := repositories.AssetListParams{
		Limit:  1000,
		Offset: 0,
	}

	assets, _, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch available assets: %w", err)
	}

	var availableAssets []dto.AvailableAssetResponse
	for i := range assets {
		asset := &assets[i]
		// Only include active assets
		if asset.Status != financeModels.AssetStatusActive {
			continue
		}

		resp := dto.AvailableAssetResponse{
			ID:        asset.ID,
			Code:      asset.Code,
			Name:      asset.Name,
			Status:    string(asset.Status),
			BookValue: asset.BookValue,
		}

		if asset.Category != nil {
			resp.Category = &dto.AvailableAssetCategoryLite{
				ID:   asset.Category.ID,
				Name: asset.Category.Name,
			}
		}

		if asset.Location != nil {
			resp.Location = &dto.AvailableAssetLocationLite{
				ID:   asset.Location.ID,
				Name: asset.Location.Name,
			}
		}

		availableAssets = append(availableAssets, resp)
	}

	return availableAssets, nil
}

// --- UUID helpers ---

func parseUUID(s string) uuid.UUID {
	u, _ := uuid.Parse(s)
	return u
}

func parseUUIDPtr(s *string) *uuid.UUID {
	if s == nil || *s == "" {
		return nil
	}
	u, err := uuid.Parse(*s)
	if err != nil {
		return nil
	}
	return &u
}
