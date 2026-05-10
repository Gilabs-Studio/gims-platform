package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strconv"
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
	depreciationsvc "github.com/gilabs/gims/api/internal/finance/domain/service"
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
	EditAsset(ctx context.Context, id string, req *dto.EditAssetRequest) (*dto.EditAssetResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.AssetResponse, error)
	List(ctx context.Context, req *dto.ListAssetsRequest) ([]dto.AssetResponse, int64, error)
	Depreciate(ctx context.Context, id string, req *dto.DepreciateAssetRequest) (*dto.AssetResponse, error)
	PreviewBatchDepreciation(ctx context.Context, req *dto.BatchDepreciationRequest) (*dto.BatchDepreciationPreviewResponse, error)
	RunBatchDepreciation(ctx context.Context, req *dto.BatchDepreciationRequest) (*dto.BatchDepreciationRunResponse, error)
	GetDepreciationSchedule(ctx context.Context, req *dto.RunDepreciationRequest) (*dto.DepreciationScheduleResponse, error)
	RunDepreciation(ctx context.Context, req *dto.RunDepreciationRequest) (*dto.BatchDepreciationRunResponse, error)
	GetDepreciationHistory(ctx context.Context, period string) (*dto.DepreciationHistoryResponse, error)
	ApproveDepreciation(ctx context.Context, id string) (*dto.AssetResponse, error)
	Transfer(ctx context.Context, id string, req *dto.TransferAssetRequest) (*dto.AssetResponse, error)
	PreviewDisposal(ctx context.Context, id string, req *dto.PreviewDisposalRequest) (*dto.PreviewDisposalResponse, error)
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
	apRepo         repositories.AccountingPeriodRepository
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
	apRepo repositories.AccountingPeriodRepository,
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
		apRepo: apRepo,
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

func tenantIDFromContext(ctx context.Context) string {
	if tenantID, ok := ctx.Value("tenant_id").(string); ok {
		return strings.TrimSpace(tenantID)
	}
	return ""
}

func companyIDPtrFromContext(ctx context.Context) *string {
	tenantID := tenantIDFromContext(ctx)
	if tenantID == "" {
		return nil
	}
	return &tenantID
}

func depreciationMethodOrDefault(raw *string, categoryMethod financeModels.DepreciationMethod) financeModels.DepreciationMethod {
	if raw == nil {
		return categoryMethod
	}
	method := financeModels.DepreciationMethod(strings.TrimSpace(*raw))
	if method == "" {
		return categoryMethod
	}
	return method
}

func normalizeCurrencyCode(raw string) string {
	code := strings.ToUpper(strings.TrimSpace(raw))
	if len(code) != 3 {
		return "IDR"
	}
	for _, ch := range code {
		if ch < 'A' || ch > 'Z' {
			return "IDR"
		}
	}
	return code
}

func currencyCodeFromContext(ctx context.Context) string {
	if ctx == nil {
		return "IDR"
	}
	ctxCurrencyCode, _ := ctx.Value("currency_code").(string)
	return normalizeCurrencyCode(ctxCurrencyCode)
}

func (uc *assetUsecase) resolveCompanyIDForDepreciation(
	ctx context.Context,
	assetCompanyID *string,
	actorID string,
) (string, error) {
	candidateIDs := make([]string, 0, 3)

	if assetCompanyID != nil {
		candidateIDs = append(candidateIDs, strings.TrimSpace(*assetCompanyID))
	}

	ctxCompanyID, _ := ctx.Value("company_id").(string)
	candidateIDs = append(candidateIDs, strings.TrimSpace(ctxCompanyID))

	if actorID != "" {
		var employee struct {
			CompanyID *string `gorm:"column:company_id"`
		}
		err := uc.db.WithContext(ctx).
			Table("employees").
			Select("company_id").
			Where("user_id = ? AND deleted_at IS NULL", actorID).
			Order("updated_at desc").
			Limit(1).
			Take(&employee).Error
		if err == nil && employee.CompanyID != nil {
			candidateIDs = append(candidateIDs, strings.TrimSpace(*employee.CompanyID))
		}
	}

	for _, candidateID := range candidateIDs {
		if candidateID == "" {
			continue
		}
		if _, err := uuid.Parse(candidateID); err == nil {
			return candidateID, nil
		}
	}

	return "", errors.New("asset company_id is required for depreciation journal")
}

func batchDepreciationDate(year int, month int) (time.Time, error) {
	if month < 1 || month > 12 {
		return time.Time{}, errors.New("period_month must be between 1 and 12")
	}
	if year < 1900 || year > 3000 {
		return time.Time{}, errors.New("period_year is out of valid range")
	}
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, apptime.Location()), nil
}

func (uc *assetUsecase) computeBatchDepreciationPreviewItem(
	ctx context.Context,
	asset *financeModels.Asset,
	period string,
	currencyCode string,
) dto.BatchDepreciationPreviewItem {
	item := dto.BatchDepreciationPreviewItem{
		AssetID:      asset.ID,
		AssetCode:    asset.Code,
		AssetName:    asset.Name,
		CurrencyCode: currencyCode,
	}

	if asset.Category == nil {
		item.SkipReason = "asset category not found"
		return item
	}

	cat := asset.Category
	item.Method = string(cat.DepreciationMethod)

	if !asset.CanDepreciate() {
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "asset cannot be depreciated"
		return item
	}

	var existing financeModels.AssetDepreciation
	err := uc.db.WithContext(ctx).
		Where("asset_id = ? AND period = ?", asset.ID, period).
		First(&existing).Error
	if err == nil {
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "already depreciated for this period"
		return item
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "failed to check existing depreciation"
		return item
	}

	remainingFloor := math.Max(0, asset.BookValue-asset.SalvageValue)
	if remainingFloor <= 0.000001 {
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "asset is fully depreciated"
		return item
	}

	amount := 0.0
	switch cat.DepreciationMethod {
	case financeModels.DepreciationMethodStraightLine:
		lifeMonths := asset.GetUsefulLifeMonths()
		if lifeMonths <= 0 {
			item.OpeningBookValue = round2(asset.BookValue)
			item.ProjectedBookValue = round2(asset.BookValue)
			item.SkipReason = "invalid useful_life_months"
			return item
		}
		base := asset.AcquisitionCost - asset.SalvageValue
		if base < 0 {
			base = 0
		}
		amount = base / float64(lifeMonths)
	case financeModels.DepreciationMethodDecliningBalance:
		if cat.DepreciationRate <= 0 {
			item.OpeningBookValue = round2(asset.BookValue)
			item.ProjectedBookValue = round2(asset.BookValue)
			item.SkipReason = "depreciation_rate is required for declining balance"
			return item
		}
		amount = asset.BookValue * cat.DepreciationRate
	default:
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "unsupported depreciation_method"
		return item
	}

	amount = round2(amount)
	if amount <= 0 {
		item.OpeningBookValue = round2(asset.BookValue)
		item.ProjectedBookValue = round2(asset.BookValue)
		item.SkipReason = "depreciation amount must be > 0"
		return item
	}
	if amount > remainingFloor {
		amount = round2(remainingFloor)
	}

	item.OpeningBookValue = round2(asset.BookValue)
	item.DepreciationAmount = amount
	item.ProjectedBookValue = round2(asset.BookValue - amount)
	item.Eligible = true
	return item
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
	tenantID := tenantIDFromContext(ctx)
	if tenantID == "" {
		return nil, errors.New("tenant is required")
	}

	acqDate, err := parseAssetDateStrict(req.AcquisitionDate)
	if err != nil {
		return nil, err
	}
	if acqDate.After(apptime.Now()) {
		return nil, errors.New("acquisition date cannot be in the future")
	}
	if strings.TrimSpace(req.AssetTypeID) == "" {
		return nil, errors.New("asset type is required")
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
	if req.ParentAssetID != nil && strings.TrimSpace(*req.ParentAssetID) != "" {
		if _, err := uc.repo.FindByID(ctx, strings.TrimSpace(*req.ParentAssetID), false); err != nil {
			return nil, err
		}
	}

	depMethod := depreciationMethodOrDefault(req.DepreciationMethod, cat.DepreciationMethod)
	depMethodStr := string(depMethod)
	usefulLife := 0
	if req.UsefulLifeMonths != nil {
		usefulLife = *req.UsefulLifeMonths
	} else {
		usefulLife = cat.UsefulLifeMonths
	}

	depreciationStart := acqDate
	if req.DepreciationStartDate != nil && strings.TrimSpace(*req.DepreciationStartDate) != "" {
		parsedDepStart, err := parseAssetDateStrict(*req.DepreciationStartDate)
		if err != nil {
			return nil, err
		}
		depreciationStart = parsedDepStart
	}

	basePurchasePrice := round2(req.PurchasePrice)
	if basePurchasePrice <= 0 && req.AcquisitionCost > 0 {
		basePurchasePrice = round2(req.AcquisitionCost)
	}
	totalAcquisitionCost := round2(basePurchasePrice + req.ShippingCost + req.InstallationCost + req.TaxAmount + req.OtherCosts)
	if totalAcquisitionCost <= 0 {
		return nil, errors.New("acquisition cost must be greater than zero")
	}
	if req.SalvageValue > totalAcquisitionCost {
		return nil, errors.New("salvage value cannot be greater than acquisition cost")
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		code, err = uc.repo.GenerateCode(ctx)
		if err != nil {
			return nil, err
		}
	}
	if ok, err := uc.repo.ExistsByCode(ctx, code, nil); err != nil {
		return nil, err
	} else if ok {
		return nil, errors.New("asset code already exists for this tenant")
	}

	capitalizationThreshold, approvalRequired, err := uc.loadCreatePolicy(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	isCapitalized := totalAcquisitionCost >= capitalizationThreshold
	isDepreciable := cat.IsDepreciable && isCapitalized && usefulLife > 0 && depMethod != financeModels.DepreciationMethodNone

	status := financeModels.AssetStatusActive
	lifecycle := financeModels.AssetLifecycleInUse
	if approvalRequired {
		status = financeModels.AssetStatusPendingCapitalization
		lifecycle = financeModels.AssetLifecyclePendingCapitalization
	}

	companyID := req.CompanyID
	if companyID == nil {
		companyID = companyIDPtrFromContext(ctx)
	}
	var deptID *string
	if req.DepartmentID != nil && strings.TrimSpace(*req.DepartmentID) != "" {
		deptID = req.DepartmentID
	}

	item := &financeModels.Asset{
		TenantID:                tenantID,
		Code:                    code,
		Name:                    strings.TrimSpace(req.Name),
		Description:             strings.TrimSpace(req.Description),
		AssetTypeID:             &req.AssetTypeID,
		CategoryID:              strings.TrimSpace(req.CategoryID),
		LocationID:              strings.TrimSpace(req.LocationID),
		CompanyID:               companyID,
		BusinessUnitID:          req.BusinessUnitID,
		DepartmentID:            deptID,
		SupplierID:              req.VendorID,
		PurchaseOrderID:         nil,
		SupplierInvoiceID:       req.PurchaseInvoiceID,
		CustodianUserID:         req.CustodianUserID,
		AssignedToEmployeeID:    nil,
		AcquisitionDate:         acqDate,
		AcquisitionCost:         totalAcquisitionCost,
		SalvageValue:            req.SalvageValue,
		ShippingCost:            req.ShippingCost,
		InstallationCost:        req.InstallationCost,
		TaxAmount:               req.TaxAmount,
		OtherCosts:              req.OtherCosts,
		DepreciationMethod:      &depMethodStr,
		UsefulLifeMonths:        &usefulLife,
		DepreciationStartDate:   &depreciationStart,
		AccumulatedDepreciation: 0,
		BookValue:               totalAcquisitionCost,
		Status:                  status,
		LifecycleStage:          lifecycle,
		IsCapitalized:           isCapitalized,
		IsDepreciable:           isDepreciable,
		CreatedBy:               &actorID,
	}

	// Parse optional warranty/insurance dates and set on asset
	if req.WarrantyStart != nil && strings.TrimSpace(*req.WarrantyStart) != "" {
		if ws, err := parseAssetDateStrict(*req.WarrantyStart); err == nil {
			item.WarrantyStart = &ws
		}
	}
	if req.WarrantyEnd != nil && strings.TrimSpace(*req.WarrantyEnd) != "" {
		if we, err := parseAssetDateStrict(*req.WarrantyEnd); err == nil {
			item.WarrantyEnd = &we
		}
	}
	if req.WarrantyProvider != nil {
		item.WarrantyProvider = req.WarrantyProvider
	}
	if req.WarrantyTerms != nil {
		item.WarrantyTerms = req.WarrantyTerms
	}

	if req.InsuranceStart != nil && strings.TrimSpace(*req.InsuranceStart) != "" {
		if isd, err := parseAssetDateStrict(*req.InsuranceStart); err == nil {
			item.InsuranceStart = &isd
		}
	}
	if req.InsuranceEnd != nil && strings.TrimSpace(*req.InsuranceEnd) != "" {
		if ied, err := parseAssetDateStrict(*req.InsuranceEnd); err == nil {
			item.InsuranceEnd = &ied
		}
	}
	if req.InsuranceProvider != nil {
		item.InsuranceProvider = req.InsuranceProvider
	}
	if req.InsurancePolicyNumber != nil {
		item.InsurancePolicyNumber = req.InsurancePolicyNumber
	}
	if req.InsuranceValue != nil {
		item.InsuranceValue = req.InsuranceValue
	}
	actorUUID, err := uuid.Parse(actorID)
	if err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(item).Error; err != nil {
			return err
		}
		if err := tx.Model(&financeModels.Asset{}).Where("id = ?", item.ID).Updates(map[string]interface{}{
			"is_capitalized":  isCapitalized,
			"is_depreciable":  isDepreciable,
			"status":          status,
			"lifecycle_stage": lifecycle,
		}).Error; err != nil {
			return err
		}
		assetUUID, err := uuid.Parse(item.ID)
		if err != nil {
			return err
		}
		txRec := &financeModels.AssetTransaction{
			TenantID:        tenantID,
			AssetID:         item.ID,
			Type:            financeModels.AssetTransactionTypeAcquire,
			TransactionDate: acqDate,
			Amount:          totalAcquisitionCost,
			Description:     "Asset acquired",
			Status:          financeModels.AssetTransactionStatusPosted,
			CreatedBy:       &actorID,
		}
		if approvalRequired {
			txRec.Status = financeModels.AssetTransactionStatusPending
		}
		if err := tx.Create(txRec).Error; err != nil {
			return err
		}

		if approvalRequired {
			return tx.Create(&financeModels.AssetAuditLog{
				AssetID:     assetUUID,
				Action:      "create",
				PerformedBy: &actorUUID,
				IPAddress:   stringPtrFromContext(ctx, "request_ip"),
				UserAgent:   stringPtrFromContext(ctx, "user_agent"),
				Metadata: financeModels.MapStringInterface{
					"source":                 "manual_create",
					"approval_required":      true,
					"is_capitalized":         isCapitalized,
					"acquisition_cost_total": totalAcquisitionCost,
				},
			}).Error
		}

		if item.IsDepreciable {
			if err := uc.generateDepreciationSchedule(tx, item, tenantID, actorID); err != nil {
				return err
			}
		}

		if req.AssignedToEmployeeID != nil && strings.TrimSpace(*req.AssignedToEmployeeID) != "" {
			if err := uc.assignEmployeeTx(tx, item, strings.TrimSpace(*req.AssignedToEmployeeID), actorID, nil); err != nil {
				return err
			}
		}

		if !isCapitalized {
			debitAccountID, err := uc.resolveAcquisitionDebitAccountID(false, cat)
			if err != nil {
				return err
			}
			creditAccountID, err := uc.resolveAcquisitionCreditAccountID(ctx, tenantID, req)
			if err != nil {
				return err
			}
			if err := uc.postAcquisitionJournal(tx, item, txRec, debitAccountID, creditAccountID, totalAcquisitionCost, "Asset acquisition expense"); err != nil {
				return err
			}
		} else {
			debitAccountID, err := uc.resolveAcquisitionDebitAccountID(true, cat)
			if err != nil {
				return err
			}
			creditAccountID, err := uc.resolveAcquisitionCreditAccountID(ctx, tenantID, req)
			if err != nil {
				return err
			}
			if err := uc.postAcquisitionJournal(tx, item, txRec, debitAccountID, creditAccountID, totalAcquisitionCost, "Asset acquisition"); err != nil {
				return err
			}
		}

		audit := &financeModels.AssetAuditLog{
			AssetID:     assetUUID,
			Action:      "create",
			PerformedBy: &actorUUID,
			IPAddress:   stringPtrFromContext(ctx, "request_ip"),
			UserAgent:   stringPtrFromContext(ctx, "user_agent"),
			Metadata: financeModels.MapStringInterface{
				"source":                 "manual_create",
				"approval_required":      false,
				"is_capitalized":         isCapitalized,
				"acquisition_cost_total": totalAcquisitionCost,
			},
		}
		return tx.Create(audit).Error
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
	tenantID := tenantIDFromContext(ctx)
	if strings.TrimSpace(string(req.Status)) != "" {
		status = req.Status
	}

	updates := map[string]interface{}{
		"code":             strings.TrimSpace(req.Code),
		"name":             strings.TrimSpace(req.Name),
		"description":      strings.TrimSpace(req.Description),
		"asset_type_id":    strings.TrimSpace(req.AssetTypeID),
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
			TenantID:        tenantID,
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

func (uc *assetUsecase) EditAsset(ctx context.Context, id string, req *dto.EditAssetRequest) (*dto.EditAssetResponse, error) {
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
	tenantID := tenantIDFromContext(ctx)
	if tenantID == "" {
		return nil, errors.New("tenant is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	// Resolve partial PATCH payload against existing data so omitted fields keep current values.
	resolvedReq := *req
	if strings.TrimSpace(resolvedReq.Code) == "" {
		resolvedReq.Code = existing.Code
	}
	if strings.TrimSpace(resolvedReq.Name) == "" {
		resolvedReq.Name = existing.Name
	}
	if strings.TrimSpace(resolvedReq.Description) == "" {
		resolvedReq.Description = existing.Description
	}
	if strings.TrimSpace(resolvedReq.AssetTypeID) == "" && existing.AssetTypeID != nil {
		resolvedReq.AssetTypeID = strings.TrimSpace(*existing.AssetTypeID)
	}
	if strings.TrimSpace(resolvedReq.CategoryID) == "" {
		resolvedReq.CategoryID = existing.CategoryID
	}
	if strings.TrimSpace(resolvedReq.LocationID) == "" {
		resolvedReq.LocationID = existing.LocationID
	}
	if strings.TrimSpace(resolvedReq.AcquisitionDate) == "" {
		resolvedReq.AcquisitionDate = existing.AcquisitionDate.Format("2006-01-02")
	}
	if resolvedReq.AcquisitionCost == nil {
		acq := existing.AcquisitionCost
		resolvedReq.AcquisitionCost = &acq
	}
	if resolvedReq.SalvageValue == nil {
		salv := existing.SalvageValue
		resolvedReq.SalvageValue = &salv
	}
	if resolvedReq.UsefulLifeMonths == nil {
		resolvedReq.UsefulLifeMonths = existing.UsefulLifeMonths
	}
	if resolvedReq.DepreciationMethod == nil {
		resolvedReq.DepreciationMethod = existing.DepreciationMethod
	}
	if resolvedReq.VendorID == nil {
		resolvedReq.VendorID = existing.SupplierID
	}
	if resolvedReq.PurchaseInvoiceID == nil {
		resolvedReq.PurchaseInvoiceID = existing.SupplierInvoiceID
	}
	if resolvedReq.DepartmentID == nil {
		resolvedReq.DepartmentID = existing.DepartmentID
	}
	if resolvedReq.AssignedToEmployeeID == nil {
		resolvedReq.AssignedToEmployeeID = existing.AssignedToEmployeeID
	}
	if resolvedReq.CustodianUserID == nil {
		resolvedReq.CustodianUserID = existing.CustodianUserID
	}
	if resolvedReq.SerialNumber == nil {
		resolvedReq.SerialNumber = existing.SerialNumber
	}
	if resolvedReq.Barcode == nil {
		resolvedReq.Barcode = existing.Barcode
	}
	if resolvedReq.AssetTag == nil {
		resolvedReq.AssetTag = existing.AssetTag
	}
	if resolvedReq.ShippingCost == nil {
		v := existing.ShippingCost
		resolvedReq.ShippingCost = &v
	}
	if resolvedReq.InstallationCost == nil {
		v := existing.InstallationCost
		resolvedReq.InstallationCost = &v
	}
	if resolvedReq.TaxAmount == nil {
		v := existing.TaxAmount
		resolvedReq.TaxAmount = &v
	}
	if resolvedReq.OtherCosts == nil {
		v := existing.OtherCosts
		resolvedReq.OtherCosts = &v
	}
	if resolvedReq.WarrantyStart == nil && existing.WarrantyStart != nil {
		v := existing.WarrantyStart.Format("2006-01-02")
		resolvedReq.WarrantyStart = &v
	}
	if resolvedReq.WarrantyEnd == nil && existing.WarrantyEnd != nil {
		v := existing.WarrantyEnd.Format("2006-01-02")
		resolvedReq.WarrantyEnd = &v
	}
	if resolvedReq.WarrantyProvider == nil {
		resolvedReq.WarrantyProvider = existing.WarrantyProvider
	}
	if resolvedReq.WarrantyTerms == nil {
		resolvedReq.WarrantyTerms = existing.WarrantyTerms
	}
	if resolvedReq.InsurancePolicyNumber == nil {
		resolvedReq.InsurancePolicyNumber = existing.InsurancePolicyNumber
	}
	if resolvedReq.InsuranceProvider == nil {
		resolvedReq.InsuranceProvider = existing.InsuranceProvider
	}
	if resolvedReq.InsuranceStart == nil && existing.InsuranceStart != nil {
		v := existing.InsuranceStart.Format("2006-01-02")
		resolvedReq.InsuranceStart = &v
	}
	if resolvedReq.InsuranceEnd == nil && existing.InsuranceEnd != nil {
		v := existing.InsuranceEnd.Format("2006-01-02")
		resolvedReq.InsuranceEnd = &v
	}
	if resolvedReq.InsuranceValue == nil {
		resolvedReq.InsuranceValue = existing.InsuranceValue
	}

	acqDate, err := parseAssetDateStrict(resolvedReq.AcquisitionDate)
	if err != nil {
		return nil, err
	}
	cat, err := uc.catRepo.FindByID(ctx, strings.TrimSpace(resolvedReq.CategoryID))
	if err != nil {
		return nil, err
	}
	if !cat.IsActive {
		return nil, errors.New("asset category is inactive")
	}
	if _, err := uc.locRepo.FindByID(ctx, strings.TrimSpace(resolvedReq.LocationID)); err != nil {
		return nil, err
	}
	if strings.TrimSpace(string(resolvedReq.Status)) != "" {
		if _, err := depreciationsvc.ResolveLifecycleStage(resolvedReq.Status, nil); err != nil {
			return nil, err
		}
	}

	changes, err := ClassifyChanges(existing, &resolvedReq)
	if err != nil {
		return nil, fmt.Errorf("failed to classify changes: %w", err)
	}
	if err := ValidateGroupCChanges(ctx, existing, changes); err != nil {
		return nil, err
	}

	var deprecImpact *DepreciationRecalcInfo
	if len(changes.GroupB) > 0 {
		deprecImpact, err = CalculateDepreciationImpact(ctx, existing, changes, uc.db)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate depreciation impact: %w", err)
		}
	}

	auditChangeList := make(financeModels.AuditChanges, 0)
	fieldChanges := make([]dto.FieldChangeInfo, 0)

	for fieldName, changeData := range changes.GroupA {
		change := changeData.(map[string]interface{})
		fieldChanges = append(fieldChanges, dto.FieldChangeInfo{
			FieldName: fieldName,
			OldValue:  change["old"],
			NewValue:  change["new"],
			Group:     string(GroupA),
		})
		auditChangeList = append(auditChangeList, financeModels.AuditChange{
			Field:    fieldName,
			OldValue: change["old"],
			NewValue: change["new"],
		})
	}
	for fieldName, changeData := range changes.GroupB {
		change := changeData.(map[string]interface{})
		impact := &dto.DepreciationImpactPreview{
			OldMonthlyAmount:    deprecImpact.OldMonthlyAmount,
			NewMonthlyAmount:    deprecImpact.NewMonthlyAmount,
			RemainingMonths:     deprecImpact.RemainingMonths,
			OldTotalRemaining:   deprecImpact.OldTotalRemaining,
			NewTotalRemaining:   deprecImpact.NewTotalRemaining,
			ImpactAmount:        deprecImpact.ImpactAmount,
			NewBookValue:        deprecImpact.NewBookValue,
			EntriesToRegenerate: deprecImpact.EntriesToRegenerate,
			FirstAffectedPeriod: deprecImpact.FirstAffectedPeriod,
			DepreciationMethod:  deprecImpact.DepreciationMethod,
		}
		fieldChanges = append(fieldChanges, dto.FieldChangeInfo{
			FieldName:          fieldName,
			OldValue:           change["old"],
			NewValue:           change["new"],
			Group:              string(GroupB),
			DepreciationImpact: impact,
		})
		auditChangeList = append(auditChangeList, financeModels.AuditChange{
			Field:    fieldName,
			OldValue: change["old"],
			NewValue: change["new"],
		})
	}

	derivedAcquisitionCost := deriveEditAcquisitionCost(existing, &resolvedReq)
	if derivedAcquisitionCost != existing.AcquisitionCost {
		fieldChanges = append(fieldChanges, dto.FieldChangeInfo{
			FieldName: "acquisition_cost",
			OldValue:  existing.AcquisitionCost,
			NewValue:  derivedAcquisitionCost,
			Group:     string(GroupB),
		})
		auditChangeList = append(auditChangeList, financeModels.AuditChange{
			Field:    "acquisition_cost",
			OldValue: existing.AcquisitionCost,
			NewValue: derivedAcquisitionCost,
		})
	}

	statusChanged := strings.TrimSpace(string(resolvedReq.Status)) != "" && resolvedReq.Status != existing.Status
	var resolvedLifecycle financeModels.AssetLifecycleStage
	if statusChanged {
		resolvedLifecycle, err = depreciationsvc.ResolveLifecycleStage(resolvedReq.Status, nil)
		if err != nil {
			return nil, err
		}
		fieldChanges = append(fieldChanges, dto.FieldChangeInfo{
			FieldName: "status",
			OldValue:  existing.Status,
			NewValue:  resolvedReq.Status,
			Group:     string(GroupA),
		})
		fieldChanges = append(fieldChanges, dto.FieldChangeInfo{
			FieldName: "lifecycle_stage",
			OldValue:  existing.LifecycleStage,
			NewValue:  resolvedLifecycle,
			Group:     string(GroupA),
		})
		auditChangeList = append(auditChangeList, financeModels.AuditChange{Field: "status", OldValue: existing.Status, NewValue: resolvedReq.Status})
		auditChangeList = append(auditChangeList, financeModels.AuditChange{Field: "lifecycle_stage", OldValue: existing.LifecycleStage, NewValue: resolvedLifecycle})
	}

	assignedEmployeeChanged := false
	if changeData, ok := changes.GroupA["assigned_to_employee_id"]; ok {
		change := changeData.(map[string]interface{})
		if fmt.Sprintf("%v", change["old"]) != fmt.Sprintf("%v", change["new"]) {
			assignedEmployeeChanged = true
		}
	}

	acquisitionBookValue := round2(math.Max(*resolvedReq.SalvageValue, derivedAcquisitionCost-existing.AccumulatedDepreciation))

	updates := map[string]interface{}{
		"code":                strings.TrimSpace(resolvedReq.Code),
		"name":                strings.TrimSpace(resolvedReq.Name),
		"description":         strings.TrimSpace(resolvedReq.Description),
		"asset_type_id":       strings.TrimSpace(resolvedReq.AssetTypeID),
		"category_id":         strings.TrimSpace(resolvedReq.CategoryID),
		"location_id":         strings.TrimSpace(resolvedReq.LocationID),
		"acquisition_date":    acqDate,
		"acquisition_cost":    derivedAcquisitionCost,
		"book_value":          acquisitionBookValue,
		"salvage_value":       *resolvedReq.SalvageValue,
		"useful_life_months":  resolvedReq.UsefulLifeMonths,
		"depreciation_method": resolvedReq.DepreciationMethod,
		"serial_number":       resolvedReq.SerialNumber,
		"barcode":             resolvedReq.Barcode,
		"asset_tag":           resolvedReq.AssetTag,
		"supplier_id":         resolvedReq.VendorID,
		"supplier_invoice_id": resolvedReq.PurchaseInvoiceID,
		"department_id":       resolvedReq.DepartmentID,
		"custodian_user_id":   resolvedReq.CustodianUserID,
		"shipping_cost":       *resolvedReq.ShippingCost,
		"installation_cost":   *resolvedReq.InstallationCost,
		"tax_amount":          *resolvedReq.TaxAmount,
		"other_costs":         *resolvedReq.OtherCosts,
		"status":              existing.Status,
		"lifecycle_stage":     existing.LifecycleStage,
	}
	if statusChanged {
		updates["status"] = resolvedReq.Status
		updates["lifecycle_stage"] = resolvedLifecycle
	}

	assignmentEmployeeID := parseUUIDPtr(resolvedReq.AssignedToEmployeeID)
	if assignmentEmployeeID != nil {
		updates["assigned_to_employee_id"] = assignmentEmployeeID.String()
		updates["assignment_date"] = apptime.Now()
	}

	// Add warranty fields if provided
	if resolvedReq.WarrantyStart != nil && *resolvedReq.WarrantyStart != "" {
		if wStart, err := parseAssetDateStrict(*resolvedReq.WarrantyStart); err == nil {
			updates["warranty_start"] = wStart
		}
	}
	if resolvedReq.WarrantyEnd != nil && *resolvedReq.WarrantyEnd != "" {
		if wEnd, err := parseAssetDateStrict(*resolvedReq.WarrantyEnd); err == nil {
			updates["warranty_end"] = wEnd
		}
	}
	if resolvedReq.WarrantyProvider != nil {
		updates["warranty_provider"] = *resolvedReq.WarrantyProvider
	}
	if resolvedReq.WarrantyTerms != nil {
		updates["warranty_terms"] = *resolvedReq.WarrantyTerms
	}

	// Add insurance fields if provided
	if resolvedReq.InsurancePolicyNumber != nil {
		updates["insurance_policy_number"] = *resolvedReq.InsurancePolicyNumber
	}
	if resolvedReq.InsuranceProvider != nil {
		updates["insurance_provider"] = *resolvedReq.InsuranceProvider
	}
	if resolvedReq.InsuranceStart != nil && *resolvedReq.InsuranceStart != "" {
		if iStart, err := parseAssetDateStrict(*resolvedReq.InsuranceStart); err == nil {
			updates["insurance_start"] = iStart
		}
	}
	if resolvedReq.InsuranceEnd != nil && *resolvedReq.InsuranceEnd != "" {
		if iEnd, err := parseAssetDateStrict(*resolvedReq.InsuranceEnd); err == nil {
			updates["insurance_end"] = iEnd
		}
	}
	if resolvedReq.InsuranceValue != nil {
		updates["insurance_value"] = *resolvedReq.InsuranceValue
	}

	// 9. Execute transaction with depreciation recalculation if needed
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&financeModels.Asset{}).Where("id = ? AND tenant_id = ?", id, tenantID).Updates(updates).Error; err != nil {
			return err
		}

		if assignedEmployeeChanged {
			now := apptime.Now()
			if err := closeCurrentAssignmentTx(tx, id, tenantID, now); err != nil {
				return err
			}
			if err := insertAssignmentHistoryTx(tx, id, tenantID, &resolvedReq, actorID, now); err != nil {
				return err
			}
		}

		// Recalculate depreciation if Group B changed
		if len(changes.GroupB) > 0 && deprecImpact.EntriesToRegenerate > 0 {
			newSalvage := *resolvedReq.SalvageValue
			createdEntries, err := RecalculateDepreciation(ctx, tx, existing, tenantID, newSalvage, resolvedReq.UsefulLifeMonths, resolvedReq.DepreciationMethod)
			if err != nil {
				return fmt.Errorf("depreciation recalculation failed: %w", err)
			}
			if createdEntries > 0 {
				// Update impact info
				deprecImpact.EntriesToRegenerate = createdEntries
			}
		}

		if statusChanged && resolvedReq.CascadeToChildren {
			if err := cascadeStatusToChildrenTx(tx, id, tenantID, resolvedReq.Status, resolvedLifecycle); err != nil {
				return err
			}
		}

		// Create audit log with detailed changes
		assetUUID, err := uuid.Parse(id)
		if err != nil {
			return err
		}
		actorUUID, err := uuid.Parse(actorID)
		if err != nil {
			return err
		}

		auditLog := &financeModels.AssetAuditLog{
			AssetID:     assetUUID,
			Action:      "updated",
			PerformedBy: &actorUUID,
			Changes:     auditChangeList,
			Metadata: financeModels.MapStringInterface{
				"source":                  "manual_edit",
				"group_a_count":           len(changes.GroupA),
				"group_b_count":           len(changes.GroupB),
				"has_depreciation_impact": len(changes.GroupB) > 0,
			},
		}
		if err := tx.Create(auditLog).Error; err != nil {
			return fmt.Errorf("failed to create audit log: %w", err)
		}

		// Create transaction record
		txRec := &financeModels.AssetTransaction{
			AssetID:         id,
			Type:            financeModels.AssetTransactionTypeUpdate,
			TransactionDate: apptime.Now(),
			Description:     fmt.Sprintf("Asset edited with %d Group A and %d Group B changes", len(changes.GroupA), len(changes.GroupB)),
			CreatedBy:       &actorID,
		}
		return tx.Create(txRec).Error
	})
	if err != nil {
		return nil, err
	}

	// 10. Fetch full updated asset and return
	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}

	baseResponse := uc.mapper.ToResponse(full, true)
	res := &dto.EditAssetResponse{
		AssetResponse: &baseResponse,
		ChangedFields: fieldChanges,
	}
	return res, nil
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

	dateFromValue := req.StartDate
	if dateFromValue == nil || strings.TrimSpace(*dateFromValue) == "" {
		dateFromValue = req.DateFrom
	}
	dateToValue := req.EndDate
	if dateToValue == nil || strings.TrimSpace(*dateToValue) == "" {
		dateToValue = req.DateTo
	}

	var startDate *time.Time
	if dateFromValue != nil && strings.TrimSpace(*dateFromValue) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*dateFromValue))
		if err != nil {
			return nil, 0, errors.New("invalid date_from")
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if dateToValue != nil && strings.TrimSpace(*dateToValue) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*dateToValue))
		if err != nil {
			return nil, 0, errors.New("invalid date_to")
		}
		endDate = &parsed
	}

	sortBy := strings.TrimSpace(req.SortBy)
	if sortBy == "" {
		sortBy = strings.TrimSpace(req.Sort)
	}
	sortDir := strings.TrimSpace(req.SortDir)
	if sortDir == "" {
		sortDir = strings.TrimSpace(req.Order)
	}

	items, total, err := uc.repo.List(ctx, repositories.AssetListParams{
		Search:               req.Search,
		Status:               req.Status,
		CategoryID:           req.CategoryID,
		LocationID:           req.LocationID,
		DepartmentID:         req.DeptID,
		StartDate:            startDate,
		EndDate:              endDate,
		WarrantyExpiringDays: req.WarrantyExpiringDays,
		IsCapitalized:        req.IsCapitalized,
		SortBy:               sortBy,
		SortDir:              sortDir,
		Limit:                perPage,
		Offset:               (page - 1) * perPage,
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
	tenantID := tenantIDFromContext(ctx)
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
		lifeMonths := asset.GetUsefulLifeMonths()
		switch cat.DepreciationMethod {
		case financeModels.DepreciationMethodStraightLine:
			if lifeMonths <= 0 {
				return errors.New("invalid useful_life_months")
			}
			if periodsDone >= lifeMonths {
				return errors.New("asset has reached useful life")
			}
			base := asset.AcquisitionCost - asset.SalvageValue
			if base < 0 {
				base = 0
			}
			amount = base / float64(lifeMonths)
		case financeModels.DepreciationMethodDecliningBalance:
			if cat.DepreciationRate <= 0 {
				return errors.New("depreciation_rate is required for DB")
			}
			ratePerMonth := cat.DepreciationRate / float64(lifeMonths)
			amount = bookValue * ratePerMonth
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
			TenantID:         tenantID,
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
			TenantID:        tenantID,
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

func (uc *assetUsecase) PreviewBatchDepreciation(ctx context.Context, req *dto.BatchDepreciationRequest) (*dto.BatchDepreciationPreviewResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	depreciationDate, err := batchDepreciationDate(req.PeriodYear, req.PeriodMonth)
	if err != nil {
		return nil, err
	}
	period := ymPeriod(depreciationDate)

	var assets []financeModels.Asset
	q := uc.db.WithContext(ctx).
		Model(&financeModels.Asset{}).
		Preload("Category").
		Where("status = ?", financeModels.AssetStatusActive)
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())
	if err := q.Order("code asc").Find(&assets).Error; err != nil {
		return nil, err
	}

	items := make([]dto.BatchDepreciationPreviewItem, 0, len(assets))
	eligible := 0
	skipped := 0
	currencyCode := currencyCodeFromContext(ctx)
	for i := range assets {
		item := uc.computeBatchDepreciationPreviewItem(ctx, &assets[i], period, currencyCode)
		if item.Eligible {
			eligible++
		} else {
			skipped++
		}
		items = append(items, item)
	}

	return &dto.BatchDepreciationPreviewResponse{
		PeriodMonth:  req.PeriodMonth,
		PeriodYear:   req.PeriodYear,
		CurrencyCode: currencyCode,
		TotalAssets:  len(items),
		Eligible:     eligible,
		Skipped:      skipped,
		Items:        items,
	}, nil
}

func (uc *assetUsecase) RunBatchDepreciation(ctx context.Context, req *dto.BatchDepreciationRequest) (*dto.BatchDepreciationRunResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	depreciationDate, err := batchDepreciationDate(req.PeriodYear, req.PeriodMonth)
	if err != nil {
		return nil, err
	}
	period := ymPeriod(depreciationDate)

	preview, err := uc.PreviewBatchDepreciation(ctx, req)
	if err != nil {
		return nil, err
	}

	items := make([]dto.BatchDepreciationRunItem, 0, len(preview.Items))
	posted := 0
	skipped := 0
	failed := 0
	currencyCode := preview.CurrencyCode
	if currencyCode == "" {
		currencyCode = currencyCodeFromContext(ctx)
	}

	for _, p := range preview.Items {
		runItem := dto.BatchDepreciationRunItem{
			AssetID:      p.AssetID,
			AssetCode:    p.AssetCode,
			AssetName:    p.AssetName,
			CurrencyCode: p.CurrencyCode,
			Amount:       p.DepreciationAmount,
		}
		if runItem.CurrencyCode == "" {
			runItem.CurrencyCode = currencyCode
		}

		if !p.Eligible {
			runItem.Status = "skipped"
			runItem.Reason = p.SkipReason
			skipped++
			items = append(items, runItem)
			continue
		}

		asOfDate := depreciationDate.Format("2006-01-02")
		if _, err := uc.Depreciate(ctx, p.AssetID, &dto.DepreciateAssetRequest{AsOfDate: asOfDate}); err != nil {
			runItem.Status = "failed"
			runItem.Reason = err.Error()
			failed++
			items = append(items, runItem)
			continue
		}

		var dep financeModels.AssetDepreciation
		if err := uc.db.WithContext(ctx).
			Where("asset_id = ? AND period = ?", p.AssetID, period).
			Order("created_at desc").
			First(&dep).Error; err != nil {
			runItem.Status = "failed"
			runItem.Reason = "failed to load depreciation record"
			failed++
			items = append(items, runItem)
			continue
		}

		if _, err := uc.ApproveDepreciation(ctx, dep.ID); err != nil {
			runItem.Status = "failed"
			runItem.Reason = err.Error()
			failed++
			items = append(items, runItem)
			continue
		}

		var approvedDep financeModels.AssetDepreciation
		_ = uc.db.WithContext(ctx).
			Select("id", "journal_entry_id").
			Where("id = ?", dep.ID).
			First(&approvedDep).Error

		runItem.Status = "posted"
		runItem.JournalEntryID = approvedDep.JournalEntryID
		posted++
		items = append(items, runItem)
	}

	return &dto.BatchDepreciationRunResponse{
		PeriodMonth:  req.PeriodMonth,
		PeriodYear:   req.PeriodYear,
		CurrencyCode: currencyCode,
		Processed:    len(items),
		Posted:       posted,
		Skipped:      skipped,
		Failed:       failed,
		Items:        items,
	}, nil
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

	companyID, err := uc.resolveCompanyIDForDepreciation(ctx, asset.CompanyID, actorID)
	if err != nil {
		return nil, err
	}

	expenseAccountID := strings.TrimSpace(cat.DepreciationExpenseAccountID)
	accumulatedDepreciationAccountID := strings.TrimSpace(cat.AccumulatedDepreciationAccountID)
	if expenseAccountID == "" || accumulatedDepreciationAccountID == "" {
		return nil, errors.New("asset category depreciation accounts are not configured")
	}
	if _, err := uuid.Parse(expenseAccountID); err != nil {
		return nil, errors.New("depreciation expense account id is invalid")
	}
	if _, err := uuid.Parse(accumulatedDepreciationAccountID); err != nil {
		return nil, errors.New("accumulated depreciation account id is invalid")
	}

	currencyCode := "IDR"
	if ctxCurrencyCode, ok := ctx.Value("currency_code").(string); ok {
		if normalizedCurrency := strings.ToUpper(strings.TrimSpace(ctxCurrencyCode)); normalizedCurrency != "" {
			currencyCode = normalizedCurrency
		}
	}

	var actorIDPtr *string
	if _, err := uuid.Parse(actorID); err == nil {
		actorIDPtr = &actorID
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, dep.DepreciationDate); err != nil {
			return err
		}

		now := apptime.Now()
		refType := reference.RefTypeAssetDepreciation

		je := &financeModels.JournalEntry{
			CompanyID:     companyID,
			EntryDate:     dep.DepreciationDate,
			Description:   fmt.Sprintf("Asset depreciation %s (%s)", asset.Code, dep.Period),
			ReferenceType: &refType,
			ReferenceID:   &dep.ID,
			Status:        financeModels.JournalStatusPosted,
			JournalType:   financeModels.JournalTypeGeneral,
			DebitTotal:    dep.Amount,
			CreditTotal:   dep.Amount,
			CurrencyCode:  currencyCode,
			ExchangeRate:  1,
			PostedAt:      &now,
			PostedBy:      actorIDPtr,
			CreatedBy:     actorIDPtr,
		}
		if err := tx.Create(je).Error; err != nil {
			return err
		}

		debit := &financeModels.JournalLine{
			JournalEntryID:   je.ID,
			ChartOfAccountID: expenseAccountID,
			Debit:            dep.Amount,
			Memo:             "Depreciation expense",
		}
		if err := tx.Create(debit).Error; err != nil {
			return err
		}
		credit := &financeModels.JournalLine{
			JournalEntryID:   je.ID,
			ChartOfAccountID: accumulatedDepreciationAccountID,
			Credit:           dep.Amount,
			Memo:             "Accumulated depreciation",
		}
		if err := tx.Create(credit).Error; err != nil {
			return err
		}

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
	tenantID := tenantIDFromContext(ctx)

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, transferDate); err != nil {
			return err
		}

		desc := strings.TrimSpace(req.Description)
		if desc == "" {
			desc = "Asset transfer request"
		}
		tr := &financeModels.AssetTransaction{
			TenantID:        tenantID,
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeTransfer,
			TransactionDate: transferDate,
			Description:     desc,
			Status:          financeModels.AssetTransactionStatusPending,
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

func (uc *assetUsecase) disposalGainLossAccount(cat *financeModels.AssetCategory, gainLossAmount float64) *string {
	if gainLossAmount >= 0 {
		if cat.DisposalGainAccountID != nil && strings.TrimSpace(*cat.DisposalGainAccountID) != "" {
			return cat.DisposalGainAccountID
		}
		account := cat.DepreciationExpenseAccountID
		return &account
	}
	if cat.DisposalLossAccountID != nil && strings.TrimSpace(*cat.DisposalLossAccountID) != "" {
		return cat.DisposalLossAccountID
	}
	account := cat.DepreciationExpenseAccountID
	return &account
}

func (uc *assetUsecase) PreviewDisposal(ctx context.Context, id string, req *dto.PreviewDisposalRequest) (*dto.PreviewDisposalResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
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

	cat, err := uc.catRepo.FindByID(ctx, asset.CategoryID)
	if err != nil {
		return nil, err
	}

	bookValue := round2(asset.BookValue)
	if bookValue <= 0 {
		bookValue = round2(asset.AcquisitionCost - asset.AccumulatedDepreciation)
	}
	proceeds := round2(req.ProceedsAmount)
	gainLoss := round2(proceeds - bookValue)
	gainLossType := "none"
	if gainLoss > 0 {
		gainLossType = "gain"
	} else if gainLoss < 0 {
		gainLossType = "loss"
	}

	return &dto.PreviewDisposalResponse{
		AssetID:         asset.ID,
		AssetCode:       asset.Code,
		AssetName:       asset.Name,
		DisposalDate:    disposalDate.Format("2006-01-02"),
		BookValue:       bookValue,
		ProceedsAmount:  proceeds,
		GainLossAmount:  gainLoss,
		GainLossType:    gainLossType,
		GainLossAccount: uc.disposalGainLossAccount(cat, gainLoss),
	}, nil
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
	tenantID := tenantIDFromContext(ctx)

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

	cat, err := uc.catRepo.FindByID(ctx, asset.CategoryID)
	if err != nil {
		return nil, err
	}

	preview, err := uc.PreviewDisposal(ctx, id, &dto.PreviewDisposalRequest{
		DisposalDate:   req.DisposalDate,
		ProceedsAmount: req.ProceedsAmount,
	})
	if err != nil {
		return nil, err
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
			TenantID:               tenantID,
			AssetID:                asset.ID,
			Type:                   financeModels.AssetTransactionTypeDispose,
			TransactionDate:        disposalDate,
			Amount:                 req.ProceedsAmount,
			Description:            desc,
			Status:                 financeModels.AssetTransactionStatusPending,
			ProceedsAmount:         req.ProceedsAmount,
			BankAccountID:          req.BankAccountID,
			BookValueAtTransaction: preview.BookValue,
			GainLossAmount:         preview.GainLossAmount,
			GainLossAccountID:      uc.disposalGainLossAccount(cat, preview.GainLossAmount),
			CreatedBy:              &actorID,
			CreatedAt:              apptime.Now(),
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
	tenantID := tenantIDFromContext(ctx)

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
			TenantID:        tenantID,
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeDispose,
			TransactionDate: disposalDate,
			Amount:          req.SaleAmount,
			Description:     fmt.Sprintf("%s (sale amount: %s)", desc, saleAmountStr),
			Status:          financeModels.AssetTransactionStatusPending,
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
	tenantID := tenantIDFromContext(ctx)

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

	// Initialize all fields with proper zero values to avoid GORM type reflection issues
	// Especially important for pointer fields which must be explicitly nil, not uninitialized
	asset := financeModels.Asset{
		TenantID:        tenantID,
		Code:            req.Code,
		Name:            req.Name,
		CategoryID:      catID,
		LocationID:      locID,
		AcquisitionDate: parsedDate,
		AcquisitionCost: req.AcquisitionCost,
		SalvageValue:    0,
		Status:          financeModels.AssetStatusActive,
		LifecycleStage:  financeModels.AssetLifecycleDraft,
		// Cost breakdown (initialize to zero to prevent GORM reflection panic)
		ShippingCost:     0,
		InstallationCost: 0,
		TaxAmount:        0,
		OtherCosts:       0,
		// Depreciation fields
		AccumulatedDepreciation: 0,
		BookValue:               0,
		// Nullable pointer fields - explicitly set to nil to avoid reflection issues
		SerialNumber:          nil,
		Barcode:               nil,
		QRCode:                nil,
		AssetTag:              nil,
		CompanyID:             nil,
		BusinessUnitID:        nil,
		DepartmentID:          nil,
		AssignedToEmployeeID:  nil,
		AssignmentDate:        nil,
		SupplierID:            nil,
		PurchaseOrderID:       nil,
		SupplierInvoiceID:     nil,
		DepreciationMethod:    nil,
		UsefulLifeMonths:      nil,
		DepreciationStartDate: nil,
		ParentAssetID:         nil,
		WarrantyStart:         nil,
		WarrantyEnd:           nil,
		WarrantyProvider:      nil,
		WarrantyTerms:         nil,
		InsurancePolicyNumber: nil,
		InsuranceProvider:     nil,
		InsuranceStart:        nil,
		InsuranceEnd:          nil,
		InsuranceValue:        nil,
		ApprovedBy:            nil,
		ApprovedAt:            nil,
		CreatedBy:             nil,
		// Boolean fields - set to false defaults
		IsCapitalized:      false,
		IsDepreciable:      true,
		IsFullyDepreciated: false,
		IsParent:           false,
	}

	if err := tx.Create(&asset).Error; err != nil {
		return err
	}

	// Create transaction log
	tLog := financeModels.AssetTransaction{
		TenantID:        tenantID,
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
	tenantID := tenantIDFromContext(ctx)
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
			TenantID:        tenantID,
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeRevalue,
			TransactionDate: date,
			Amount:          req.NewValue, // New total value
			Description:     req.Description,
			Status:          financeModels.AssetTransactionStatusPending,
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
	tenantID := tenantIDFromContext(ctx)
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
			TenantID:        tenantID,
			AssetID:         asset.ID,
			Type:            financeModels.AssetTransactionTypeAdjust,
			TransactionDate: date,
			Amount:          req.AdjustmentAmount, // Delta amount
			Description:     req.Description,
			Status:          financeModels.AssetTransactionStatusPending,
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

	if tr.Status != financeModels.AssetTransactionStatusPending {
		return nil, errors.New("only pending transactions can be approved")
	}

	asset := tr.Asset
	actorID, _ := ctx.Value("user_id").(string)

	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, tr.TransactionDate); err != nil {
			return err
		}

		cat, err := uc.catRepo.FindByID(ctx, asset.CategoryID)
		if err != nil {
			return err
		}

		switch tr.Type {
		case financeModels.AssetTransactionTypeTransfer:
			if tr.ReferenceID != nil {
				tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Update("location_id", *tr.ReferenceID)
			}
		case financeModels.AssetTransactionTypeDispose:
			if err := tx.Model(&financeModels.Asset{}).Where("id = ?", asset.ID).Updates(map[string]interface{}{
				"status":                   financeModels.AssetStatusDisposed,
				"disposed_at":              tr.TransactionDate,
				"book_value":               0,
				"is_fully_depreciated":     true,
				"accumulated_depreciation": asset.AccumulatedDepreciation,
			}).Error; err != nil {
				return err
			}
			if err := uc.postAssetDisposalJournal(tx, asset, &tr, cat, actorID); err != nil {
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
			"status":    financeModels.AssetTransactionStatusPosted,
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

func (uc *assetUsecase) postAssetDisposalJournal(
	tx *gorm.DB,
	asset *financeModels.Asset,
	tr *financeModels.AssetTransaction,
	cat *financeModels.AssetCategory,
	actorID string,
) error {
	if uc.journalUC == nil {
		return errors.New("journal usecase is not configured")
	}
	if cat == nil {
		return errors.New("asset category not found")
	}

	if strings.TrimSpace(cat.AssetAccountID) == "" {
		return errors.New("asset account is not configured on category")
	}
	if strings.TrimSpace(cat.AccumulatedDepreciationAccountID) == "" {
		return errors.New("accumulated depreciation account is not configured on category")
	}

	proceeds := math.Abs(tr.ProceedsAmount)
	gainLoss := tr.GainLossAmount
	gainLossAbs := math.Abs(gainLoss)

	lines := make([]finDTO.JournalLineRequest, 0, 5)

	if asset.AccumulatedDepreciation > 0 {
		lines = append(lines, finDTO.JournalLineRequest{
			ChartOfAccountID: cat.AccumulatedDepreciationAccountID,
			Debit:            round2(asset.AccumulatedDepreciation),
			Credit:           0,
			Memo:             "Clear accumulated depreciation",
		})
	}
	if proceeds > 0 {
		if tr.BankAccountID == nil || strings.TrimSpace(*tr.BankAccountID) == "" {
			return errors.New("bank_account_id is required when proceeds_amount is greater than zero")
		}
		lines = append(lines, finDTO.JournalLineRequest{
			ChartOfAccountID: *tr.BankAccountID,
			Debit:            round2(proceeds),
			Credit:           0,
			Memo:             "Disposal proceeds",
		})
	}
	if gainLoss > 0 {
		gainAccount := tr.GainLossAccountID
		if gainAccount == nil || strings.TrimSpace(*gainAccount) == "" {
			gainAccount = uc.disposalGainLossAccount(cat, gainLoss)
		}
		if gainAccount == nil || strings.TrimSpace(*gainAccount) == "" {
			return errors.New("gain account is not configured for disposal")
		}
		lines = append(lines, finDTO.JournalLineRequest{
			ChartOfAccountID: *gainAccount,
			Debit:            0,
			Credit:           round2(gainLossAbs),
			Memo:             "Gain on disposal",
		})
	}
	if gainLoss < 0 {
		lossAccount := tr.GainLossAccountID
		if lossAccount == nil || strings.TrimSpace(*lossAccount) == "" {
			lossAccount = uc.disposalGainLossAccount(cat, gainLoss)
		}
		if lossAccount == nil || strings.TrimSpace(*lossAccount) == "" {
			return errors.New("loss account is not configured for disposal")
		}
		lines = append(lines, finDTO.JournalLineRequest{
			ChartOfAccountID: *lossAccount,
			Debit:            round2(gainLossAbs),
			Credit:           0,
			Memo:             "Loss on disposal",
		})
	}

	lines = append(lines, finDTO.JournalLineRequest{
		ChartOfAccountID: cat.AssetAccountID,
		Debit:            0,
		Credit:           round2(asset.AcquisitionCost),
		Memo:             "Remove fixed asset cost",
	})

	refType := reference.RefTypeAssetTransaction
	refID := tr.ID
	journalReq := &finDTO.CreateJournalEntryRequest{
		EntryDate:         tr.TransactionDate.Format("2006-01-02"),
		Description:       fmt.Sprintf("Asset Disposal: %s", asset.Code),
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
	}
	journal, err := uc.journalUC.PostOrUpdateJournal(database.WithTx(tx.Statement.Context, tx), journalReq)
	if err != nil {
		return err
	}

	if journal != nil {
		return tx.Model(&financeModels.AssetTransaction{}).
			Where("id = ?", tr.ID).
			Updates(map[string]interface{}{
				"reference_id": journal.ID,
				"posted_by":    &actorID,
			}).Error
	}
	return nil
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

func stringPtrFromContext(ctx context.Context, key string) *string {
	if ctx == nil {
		return nil
	}
	value, _ := ctx.Value(key).(string)
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func (uc *assetUsecase) settingValueByKey(ctx context.Context, tenantID, key string) (string, error) {
	var setting financeModels.FinanceSetting
	err := database.GetDB(ctx, uc.db).
		Where("tenant_id = ? AND setting_key = ?", tenantID, key).
		First(&setting).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(setting.Value), nil
}

func (uc *assetUsecase) loadCreatePolicy(ctx context.Context, tenantID string) (float64, bool, error) {
	threshold := 0.0
	approvalRequired := false

	if value, err := uc.settingValueByKey(ctx, tenantID, "fixed_assets.capitalization_threshold"); err != nil {
		return 0, false, err
	} else if strings.TrimSpace(value) != "" {
		parsed, parseErr := strconv.ParseFloat(value, 64)
		if parseErr != nil {
			return 0, false, fmt.Errorf("invalid capitalization threshold setting: %w", parseErr)
		}
		threshold = round2(parsed)
	}

	if value, err := uc.settingValueByKey(ctx, tenantID, "fixed_assets.approval_required"); err != nil {
		return 0, false, err
	} else if strings.TrimSpace(value) != "" {
		normalized := strings.ToLower(strings.TrimSpace(value))
		approvalRequired = normalized == "1" || normalized == "true" || normalized == "yes" || normalized == "on"
	}

	return threshold, approvalRequired, nil
}

func (uc *assetUsecase) resolveAcquisitionDebitAccountID(capitalized bool, cat *financeModels.AssetCategory) (string, error) {
	if cat == nil {
		return "", errors.New("asset category is required")
	}
	if capitalized {
		if strings.TrimSpace(cat.AssetAccountID) == "" {
			return "", errors.New("asset account is not configured on category")
		}
		return strings.TrimSpace(cat.AssetAccountID), nil
	}
	if strings.TrimSpace(cat.DepreciationExpenseAccountID) == "" {
		return "", errors.New("expense account is not configured on category")
	}
	return strings.TrimSpace(cat.DepreciationExpenseAccountID), nil
}

func (uc *assetUsecase) resolveAcquisitionCreditAccountID(ctx context.Context, tenantID string, req *dto.CreateAssetRequest) (string, error) {
	settingKey := financeModels.SettingCOACash
	if req != nil && (req.VendorID != nil || req.PurchaseInvoiceID != nil) {
		settingKey = financeModels.SettingCOAAccountsPayable
	}
	code, err := uc.settingValueByKey(ctx, tenantID, settingKey)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(code) == "" {
		return "", fmt.Errorf("finance setting '%s' is not configured", settingKey)
	}
	account, err := uc.coaRepo.FindByCode(ctx, code)
	if err != nil {
		return "", err
	}
	return account.ID, nil
}

func (uc *assetUsecase) postAcquisitionJournal(tx *gorm.DB, asset *financeModels.Asset, tr *financeModels.AssetTransaction, debitAccountID, creditAccountID string, amount float64, desc string) error {
	if amount <= 0 {
		return nil
	}
	if uc.journalUC == nil {
		return errors.New("journal usecase is not configured")
	}
	if asset == nil || tr == nil {
		return errors.New("asset transaction is required")
	}

	lines := []finDTO.JournalLineRequest{
		{ChartOfAccountID: debitAccountID, Debit: math.Abs(amount), Credit: 0, Memo: desc},
		{ChartOfAccountID: creditAccountID, Debit: 0, Credit: math.Abs(amount), Memo: desc},
	}
	refType := reference.RefTypeAssetTransaction
	refID := tr.ID
	journal, err := uc.journalUC.PostOrUpdateJournal(database.WithTx(tx.Statement.Context, tx), &finDTO.CreateJournalEntryRequest{
		EntryDate:         tr.TransactionDate.Format("2006-01-02"),
		Description:       desc + ": " + asset.Code,
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
	})
	if err != nil {
		return err
	}
	if journal != nil {
		return tx.Model(&financeModels.AssetTransaction{}).Where("id = ?", tr.ID).Updates(map[string]interface{}{
			"reference_id": journal.ID,
		}).Error
	}
	return nil
}

func (uc *assetUsecase) generateDepreciationSchedule(tx *gorm.DB, asset *financeModels.Asset, tenantID, actorID string) error {
	if asset == nil || !asset.IsDepreciable || asset.DepreciationMethod == nil || asset.UsefulLifeMonths == nil || *asset.UsefulLifeMonths <= 0 {
		return nil
	}
	method := financeModels.DepreciationMethod(strings.TrimSpace(*asset.DepreciationMethod))
	if method == financeModels.DepreciationMethodNone {
		return nil
	}

	startDate := asset.AcquisitionDate
	if asset.DepreciationStartDate != nil && !asset.DepreciationStartDate.IsZero() {
		startDate = *asset.DepreciationStartDate
	}

	engine, err := depreciationsvc.NewDepreciationEngine(method, asset.AcquisitionCost, asset.SalvageValue, *asset.UsefulLifeMonths, asset.AcquisitionDate, startDate)
	if err != nil {
		return err
	}
	schedules, err := engine.GenerateSchedule(startDate.AddDate(0, *asset.UsefulLifeMonths, 0))
	if err != nil {
		return err
	}
	if len(schedules) == 0 {
		return nil
	}

	assetUUID, err := uuid.Parse(asset.ID)
	if err != nil {
		return err
	}
	for _, item := range schedules {
		row := financeModels.AssetDepreciationSchedule{
			TenantID:                tenantID,
			AssetID:                 assetUUID,
			PeriodStartDate:         item.PeriodStartDate,
			PeriodEndDate:           item.PeriodEndDate,
			PeriodMonth:             item.PeriodMonth,
			DepreciationAmount:      item.DepreciationAmount,
			AccumulatedDepreciation: item.AccumulatedDepreciation,
			BookValue:               item.BookValue,
		}
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

func (uc *assetUsecase) assignEmployeeTx(tx *gorm.DB, asset *financeModels.Asset, employeeID, actorID string, notes *string) error {
	if asset == nil {
		return errors.New("asset is required")
	}
	assetID := strings.TrimSpace(asset.ID)
	if assetID == "" {
		return errors.New("asset id is required")
	}
	employeeID = strings.TrimSpace(employeeID)
	if employeeID == "" {
		return errors.New("employee id is required")
	}
	employeeUUID, err := uuid.Parse(employeeID)
	if err != nil {
		return err
	}
	actorUUID, err := uuid.Parse(strings.TrimSpace(actorID))
	if err != nil {
		return err
	}
	assetUUID, err := uuid.Parse(assetID)
	if err != nil {
		return err
	}
	now := apptime.Now()
	updates := map[string]interface{}{
		"assigned_to_employee_id": employeeUUID.String(),
		"assignment_date":         now,
	}
	if err := tx.Model(&financeModels.Asset{}).Where("id = ? AND tenant_id = ?", assetID, asset.TenantID).Updates(updates).Error; err != nil {
		return err
	}

	// Close previous active assignment(s) for this asset
	prevQuery := tx.Model(&financeModels.AssetAssignmentHistory{}).
		Where("asset_id = ? AND (returned_at IS NULL)", assetUUID)
	if strings.TrimSpace(asset.TenantID) != "" {
		prevQuery = prevQuery.Where("tenant_id = ?", asset.TenantID)
	}
	if err := prevQuery.Update("returned_at", now).Error; err != nil {
		return err
	}

	var departmentUUID *uuid.UUID
	if asset.DepartmentID != nil && strings.TrimSpace(*asset.DepartmentID) != "" {
		if parsed, parseErr := uuid.Parse(strings.TrimSpace(*asset.DepartmentID)); parseErr == nil {
			departmentUUID = &parsed
		}
	}
	var locationUUID *uuid.UUID
	if strings.TrimSpace(asset.LocationID) != "" {
		if parsed, parseErr := uuid.Parse(strings.TrimSpace(asset.LocationID)); parseErr == nil {
			locationUUID = &parsed
		}
	}
	history := financeModels.AssetAssignmentHistory{
		AssetID:      assetUUID,
		EmployeeID:   &employeeUUID,
		DepartmentID: departmentUUID,
		LocationID:   locationUUID,
		AssignedAt:   now,
		AssignedBy:   &actorUUID,
		Notes:        notes,
	}
	// Ensure tenant scoping on assignment history
	if strings.TrimSpace(asset.TenantID) != "" {
		if tUUID, err := uuid.Parse(strings.TrimSpace(asset.TenantID)); err == nil {
			history.TenantID = &tUUID
		}
	}

	return tx.Create(&history).Error
}
