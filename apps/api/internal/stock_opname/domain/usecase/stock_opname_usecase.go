package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/utils"
	finDTO "github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/financesettings"
	finUC "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	inventoryDTO "github.com/gilabs/gims/api/internal/inventory/domain/dto"
	inventoryUC "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	notificationService "github.com/gilabs/gims/api/internal/notification/service"
	"github.com/gilabs/gims/api/internal/stock_opname/data/models"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/dto"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/mapper"
	"github.com/gilabs/gims/api/internal/stock_opname/domain/repository"
	"gorm.io/gorm"
)

var (
	ErrStockOpnameNotFound = errors.New("stock opname not found")
	ErrInvalidStatus       = errors.New("invalid status for this operation")
	ErrJournalNotGenerated = errors.New("stock opname adjustment journal has not been generated")
	ErrJournalWorkflowUnavailable = errors.New("journal workflow is not configured")
)

type StockOpnameUsecase interface {
	Create(ctx context.Context, req *dto.CreateStockOpnameRequest, createdBy *string) (*dto.StockOpnameResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateStockOpnameRequest) (*dto.StockOpnameResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	List(ctx context.Context, req *dto.ListStockOpnamesRequest) ([]dto.StockOpnameResponse, *utils.PaginationResult, error)
	SaveItems(ctx context.Context, opnameID string, req *dto.SaveStockOpnameItemsRequest) (*dto.StockOpnameResponse, error)
	ListItems(ctx context.Context, opnameID string) ([]dto.StockOpnameItemResponse, error)
	GenerateJournal(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	SubmitApproval(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	Submit(ctx context.Context, id string) (*dto.StockOpnameResponse, error)
	Approve(ctx context.Context, id string, approvedBy *string) (*dto.StockOpnameResponse, error)
	Reject(ctx context.Context, id string, rejectedBy *string) (*dto.StockOpnameResponse, error)
	Post(ctx context.Context, id string, postedBy *string) (*dto.StockOpnameResponse, error)
	TriggerJournalForStockOpname(ctx context.Context, opname *models.StockOpname) error
}

type stockOpnameUsecase struct {
	repo        repository.StockOpnameRepository
	inventoryUC inventoryUC.InventoryUsecase
	journalUC   finUC.JournalEntryUsecase
	coaUC       finUC.ChartOfAccountUsecase
	settingsUC  financesettings.SettingsService
}

func (u *stockOpnameUsecase) resolveCompanyIDFromActor(ctx context.Context) (string, error) {
	actorID, _ := ctx.Value("user_id").(string)
	if actorID == "" {
		return "", errors.New("user not authenticated")
	}

	var companyID string
	err := database.GetDB(ctx, database.DB).
		WithContext(ctx).
		Table("employees").
		Select("company_id").
		Where("user_id = ? AND deleted_at IS NULL", actorID).
		Limit(1).
		Scan(&companyID).Error
	if err != nil {
		return "", err
	}
	if companyID == "" {
		return "", errors.New("employee company not found")
	}

	return companyID, nil
}

func NewStockOpnameUsecase(repo repository.StockOpnameRepository, invUC inventoryUC.InventoryUsecase, journalUC finUC.JournalEntryUsecase, coaUC finUC.ChartOfAccountUsecase, settingsUC ...financesettings.SettingsService) StockOpnameUsecase {
	uc := &stockOpnameUsecase{repo: repo, inventoryUC: invUC, journalUC: journalUC, coaUC: coaUC}
	if len(settingsUC) > 0 {
		uc.settingsUC = settingsUC[0]
	}
	return uc
}

func (u *stockOpnameUsecase) Create(ctx context.Context, req *dto.CreateStockOpnameRequest, createdBy *string) (*dto.StockOpnameResponse, error) {
	logDebug("Usecase Create started")
	opnameNumber, err := u.repo.GetNextOpnameNumber(ctx)
	if err != nil {
		logDebug(fmt.Sprintf("GetNextOpnameNumber error: %v", err))
		return nil, err
	}
	logDebug(fmt.Sprintf("Generated OpnameNumber: %s", opnameNumber))

	model, err := mapper.ToStockOpnameModel(req, opnameNumber, createdBy)
	if err != nil {
		logDebug(fmt.Sprintf("Mapper error: %v", err))
		return nil, err
	}
	logDebug("Mapper success, calling Repo Create")

	if err := u.repo.Create(ctx, model); err != nil {
		logDebug(fmt.Sprintf("Repo Create error: %v", err))
		return nil, err
	}
	logDebug("Repo Create success")

	resp := mapper.ToStockOpnameResponse(model)
	return &resp, nil
}

func logDebug(msg string) {
	f, err := os.OpenFile("/tmp/gims_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	f.WriteString(fmt.Sprintf("%s: %s\n", apptime.Now().Format(time.RFC3339), msg))
}

func (u *stockOpnameUsecase) Update(ctx context.Context, id string, req *dto.UpdateStockOpnameRequest) (*dto.StockOpnameResponse, error) {
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return nil, ErrInvalidStatus
	}

	if req.Description != nil {
		opname.Description = *req.Description
	}
	if req.Date != nil {
		date, err := time.Parse("2006-01-02", *req.Date)
		if err == nil {
			opname.Date = date
		}
	}

	if err := u.repo.Update(ctx, opname); err != nil {
		return nil, err
	}

	resp := mapper.ToStockOpnameResponse(opname)
	return &resp, nil
}

func (u *stockOpnameUsecase) Delete(ctx context.Context, id string) error {
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrStockOpnameNotFound
		}
		return err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return ErrInvalidStatus
	}

	return u.repo.Delete(ctx, id)
}

func (u *stockOpnameUsecase) GetByID(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	if !security.CheckRecordScopeAccess(database.DB, ctx, &models.StockOpname{}, id, security.DefaultScopeQueryOptions()) {
		return nil, ErrStockOpnameNotFound
	}

	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}
	resp := mapper.ToStockOpnameResponse(opname)
	return &resp, nil
}

func (u *stockOpnameUsecase) List(ctx context.Context, req *dto.ListStockOpnamesRequest) ([]dto.StockOpnameResponse, *utils.PaginationResult, error) {
	// Defaults
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PerPage <= 0 {
		req.PerPage = 20
	}

	items, total, err := u.repo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	data := make([]dto.StockOpnameResponse, len(items))
	for i, item := range items {
		data[i] = mapper.ToStockOpnameResponse(&item)
	}

	pagination := &utils.PaginationResult{
		Page:       req.Page,
		PerPage:    req.PerPage,
		Total:      int(total),
		TotalPages: int(math.Ceil(float64(total) / float64(req.PerPage))),
	}

	return data, pagination, nil
}

func (u *stockOpnameUsecase) SaveItems(ctx context.Context, opnameID string, req *dto.SaveStockOpnameItemsRequest) (*dto.StockOpnameResponse, error) {
	opname, err := u.repo.FindByID(ctx, opnameID)
	if err != nil {
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return nil, ErrInvalidStatus
	}

	var items []models.StockOpnameItem
	for _, itemReq := range req.Items {
		variance := 0.0
		if itemReq.PhysicalQty != nil {
			variance = *itemReq.PhysicalQty - itemReq.SystemQty
		}

		items = append(items, models.StockOpnameItem{
			StockOpnameID: opnameID,
			ProductID:     itemReq.ProductID,
			SystemQty:     itemReq.SystemQty,
			PhysicalQty:   itemReq.PhysicalQty,
			VarianceQty:   variance,
			Notes:         itemReq.Notes,
		})
	}

	if err := u.repo.ReplaceItems(ctx, opnameID, items); err != nil {
		return nil, err
	}

	// Refresh
	return u.GetByID(ctx, opnameID)
}

func (u *stockOpnameUsecase) ListItems(ctx context.Context, opnameID string) ([]dto.StockOpnameItemResponse, error) {
	items, err := u.repo.ListItems(ctx, opnameID)
	if err != nil {
		return nil, err
	}

	data := make([]dto.StockOpnameItemResponse, len(items))
	for i, item := range items {
		data[i] = mapper.ToStockOpnameItemResponse(&item)
	}
	return data, nil
}

func (u *stockOpnameUsecase) GenerateJournal(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	if u.journalUC == nil {
		return nil, ErrJournalWorkflowUnavailable
	}

	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft && opname.Status != models.StockOpnameStatusPending {
		return nil, ErrInvalidStatus
	}

	// Idempotent: if journal already generated, return current snapshot.
	if opname.JournalID != nil && *opname.JournalID != "" {
		return u.GetByID(ctx, id)
	}

	items, err := u.repo.ListItems(ctx, id)
	if err != nil {
		return nil, err
	}

	companyID, err := u.resolveCompanyIDFromActor(ctx)
	if err != nil {
		return nil, err
	}

	lines, err := u.buildStockOpnameJournalLines(ctx, opname, items)
	if err != nil {
		return nil, err
	}

	if len(lines) == 0 {
		return u.GetByID(ctx, id)
	}

	reference := opname.OpnameNumber
	refType := "STOCK_OPNAME"
	refID := opname.ID
	journalReq := &finDTO.CreateJournalEntryRequest{
		CompanyID:         companyID,
		EntryDate:         opname.Date.Format("2006-01-02"),
		Description:       fmt.Sprintf("Stock opname adjustment %s", opname.OpnameNumber),
		Reference:         reference,
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             lines,
		IsSystemGenerated: true,
		SkipControlAccountValidation: true,
	}

	// Use PostOrUpdateJournal to auto-create AND auto-post the journal
	journal, err := u.journalUC.PostOrUpdateJournal(ctx, journalReq)
	if err != nil {
		return nil, err
	}

	opname.JournalID = &journal.ID
	if err := u.repo.Update(ctx, opname); err != nil {
		return nil, err
	}

	return u.GetByID(ctx, id)
}

func (u *stockOpnameUsecase) SubmitApproval(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	if u.journalUC == nil {
		return nil, ErrJournalWorkflowUnavailable
	}

	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusDraft {
		return nil, ErrInvalidStatus
	}

	// Ensure journal is generated for non-zero variance scenarios.
	// For zero-variance opname, journal generation is a no-op and submission should still proceed.
	if opname.JournalID == nil || *opname.JournalID == "" {
		if _, err := u.GenerateJournal(ctx, id); err != nil {
			return nil, err
		}

		opname, err = u.repo.FindByID(ctx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrStockOpnameNotFound
			}
			return nil, err
		}
	}

	updated, err := u.updateStatus(ctx, id, models.StockOpnameStatusPending, nil)
	if err != nil {
		return nil, err
	}

	actorUserID, _ := ctx.Value("user_id").(string)
	if err := notificationService.CreateApprovalNotification(ctx, database.DB, notificationService.ApprovalNotificationParams{
		PermissionCode: "stock_opname.approve",
		EntityType:     "stock_opname",
		EntityID:       updated.ID,
		Title:          "Stock Opname Approval",
		Message:        "A stock opname has been submitted and requires your approval.",
		ActorUserID:    actorUserID,
	}); err != nil {
		logDebug(fmt.Sprintf("warning: failed to create stock opname notification: %v", err))
	}

	return updated, nil
}

func (u *stockOpnameUsecase) Submit(ctx context.Context, id string) (*dto.StockOpnameResponse, error) {
	return u.SubmitApproval(ctx, id)
}

func (u *stockOpnameUsecase) Approve(ctx context.Context, id string, approvedBy *string) (*dto.StockOpnameResponse, error) {
	if u.journalUC == nil {
		return nil, ErrJournalWorkflowUnavailable
	}

	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.JournalID != nil && *opname.JournalID != "" {
		if _, err := u.journalUC.ApproveAdjustmentJournal(ctx, *opname.JournalID, fmt.Sprintf("Stock opname %s approved", opname.OpnameNumber)); err != nil {
			return nil, err
		}
	}

	return u.updateStatus(ctx, id, models.StockOpnameStatusApproved, approvedBy)
}

func (u *stockOpnameUsecase) Reject(ctx context.Context, id string, rejectedBy *string) (*dto.StockOpnameResponse, error) {
	if u.journalUC == nil {
		return nil, ErrJournalWorkflowUnavailable
	}

	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.JournalID != nil && *opname.JournalID != "" {
		if _, err := u.journalUC.RejectAdjustmentJournal(ctx, *opname.JournalID, fmt.Sprintf("Stock opname %s rejected", opname.OpnameNumber)); err != nil {
			return nil, err
		}
	}

	return u.updateStatus(ctx, id, models.StockOpnameStatusRejected, rejectedBy)
}

func (u *stockOpnameUsecase) Post(ctx context.Context, id string, postedBy *string) (*dto.StockOpnameResponse, error) {
	if u.journalUC == nil {
		return nil, ErrJournalWorkflowUnavailable
	}

	// 1. Validate opname exists and is approved
	opname, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStockOpnameNotFound
		}
		return nil, err
	}

	if opname.Status != models.StockOpnameStatusApproved {
		return nil, ErrInvalidStatus
	}

	// 2. Get all items with variance data
	items, err := u.repo.ListItems(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to list opname items: %w", err)
	}

	// 3. Build adjustment request from items with non-zero variance
	var adjustItems []inventoryDTO.AdjustStockItem
	for _, item := range items {
		if item.VarianceQty == 0 || item.PhysicalQty == nil {
			continue
		}
		adjustItems = append(adjustItems, inventoryDTO.AdjustStockItem{
			ProductID:   item.ProductID,
			VarianceQty: item.VarianceQty,
		})
	}

	// 4. Create ADJUST stock movements via inventory usecase
	if len(adjustItems) > 0 {
		postedByStr := ""
		if postedBy != nil {
			postedByStr = *postedBy
		}

		adjustReq := &inventoryDTO.AdjustStockFromOpnameRequest{
			OpnameID:     id,
			OpnameNumber: opname.OpnameNumber,
			WarehouseID:  opname.WarehouseID,
			Items:        adjustItems,
			PostedBy:     postedByStr,
			Notes:        fmt.Sprintf("Stock adjustment from opname %s", opname.OpnameNumber),
		}

		if err := u.inventoryUC.AdjustStockFromOpname(ctx, adjustReq); err != nil {
			return nil, fmt.Errorf("failed to create stock adjustments: %w", err)
		}

		if opname.JournalID != nil && *opname.JournalID != "" {
			// Journal is already posted by GenerateJournal via PostOrUpdateJournal
			// No need to post again - it's idempotent via triggerStockOpnameJournal
			// Skip PostAdjustmentJournal since journal reference_type is STOCK_OPNAME, not MANUAL_ADJUSTMENT
		} else {
			if err := u.triggerStockOpnameJournal(ctx, opname, items); err != nil {
				return nil, fmt.Errorf("failed to post stock opname journal: %w", err)
			}
		}
	}

	// 5. Update status to posted
	return u.updateStatus(ctx, id, models.StockOpnameStatusPosted, postedBy)
}

func (u *stockOpnameUsecase) updateStatus(ctx context.Context, id string, status models.StockOpnameStatus, userID *string) (*dto.StockOpnameResponse, error) {
	if err := u.repo.UpdateStatus(ctx, id, status, userID); err != nil {
		return nil, err
	}
	return u.GetByID(ctx, id)
}

func (u *stockOpnameUsecase) TriggerJournalForStockOpname(ctx context.Context, opname *models.StockOpname) error {
	if opname == nil {
		return nil
	}

	items, err := u.repo.ListItems(ctx, opname.ID)
	if err != nil {
		return err
	}
	return u.triggerStockOpnameJournal(ctx, opname, items)
}

func (u *stockOpnameUsecase) triggerStockOpnameJournal(ctx context.Context, opname *models.StockOpname, items []models.StockOpnameItem) error {
	if u.journalUC == nil || u.coaUC == nil {
		return nil
	}
	if u.settingsUC == nil {
		return errors.New("system account mapping untuk 'purchase.inventory_asset' belum dikonfigurasi")
	}

	inventoryCode, err := u.settingsUC.GetCOAByKey(ctx, "purchase.inventory_asset")
	if err != nil {
		return err
	}
	inventoryAccount, err := u.coaUC.GetByCode(ctx, inventoryCode)
	if err != nil {
		return err
	}
	gainCode, err := u.settingsUC.GetCOAByKey(ctx, "inventory.adjustment_gain")
	if err != nil {
		return err
	}
	gainAccount, err := u.coaUC.GetByCode(ctx, gainCode)
	if err != nil {
		return err
	}
	lossCode, err := u.settingsUC.GetCOAByKey(ctx, "inventory.adjustment_loss")
	if err != nil {
		return err
	}
	lossAccount, err := u.coaUC.GetByCode(ctx, lossCode)
	if err != nil {
		return err
	}

	lines, err := u.buildStockOpnameJournalLinesWithAccounts(opname, items, inventoryAccount.ID, gainAccount.ID, lossAccount.ID)
	if err != nil {
		return err
	}

	if len(lines) == 0 {
		return nil
	}

	companyID, err := u.resolveCompanyIDFromActor(ctx)
	if err != nil {
		return err
	}

	refType := "STOCK_OPNAME"
	refID := opname.ID
	req := &finDTO.CreateJournalEntryRequest{
		CompanyID:     companyID,
		EntryDate:     opname.Date.Format("2006-01-02"),
		Description:   fmt.Sprintf("Stock opname adjustment %s", opname.OpnameNumber),
		ReferenceType: &refType,
		ReferenceID:   &refID,
		Lines:         lines,
	}

	_, err = u.journalUC.PostOrUpdateJournal(ctx, req)
	return err
}

func (u *stockOpnameUsecase) buildStockOpnameJournalLines(ctx context.Context, opname *models.StockOpname, items []models.StockOpnameItem) ([]finDTO.JournalLineRequest, error) {
	if u.coaUC == nil {
		return nil, nil
	}
	if u.settingsUC == nil {
		return nil, errors.New("system account mapping untuk 'purchase.inventory_asset' belum dikonfigurasi")
	}

	inventoryCode, err := u.settingsUC.GetCOAByKey(ctx, "purchase.inventory_asset")
	if err != nil {
		return nil, err
	}
	inventoryAccount, err := u.coaUC.GetByCode(ctx, inventoryCode)
	if err != nil {
		return nil, err
	}
	gainCode, err := u.settingsUC.GetCOAByKey(ctx, "inventory.adjustment_gain")
	if err != nil {
		return nil, err
	}
	gainAccount, err := u.coaUC.GetByCode(ctx, gainCode)
	if err != nil {
		return nil, err
	}
	lossCode, err := u.settingsUC.GetCOAByKey(ctx, "inventory.adjustment_loss")
	if err != nil {
		return nil, err
	}
	lossAccount, err := u.coaUC.GetByCode(ctx, lossCode)
	if err != nil {
		return nil, err
	}

	return u.buildStockOpnameJournalLinesWithAccounts(opname, items, inventoryAccount.ID, gainAccount.ID, lossAccount.ID)
}

func (u *stockOpnameUsecase) buildStockOpnameJournalLinesWithAccounts(opname *models.StockOpname, items []models.StockOpnameItem, inventoryAccountID, gainAccountID, lossAccountID string) ([]finDTO.JournalLineRequest, error) {
	lines := make([]finDTO.JournalLineRequest, 0)

	for _, item := range items {
		if item.VarianceQty == 0 || item.Product == nil {
			continue
		}

		unitCost := item.Product.CurrentHpp
		if unitCost <= 0 {
			unitCost = item.Product.CostPrice
		}
		if unitCost <= 0 {
			continue
		}

		lineValue := math.Abs(item.VarianceQty * unitCost)
		if lineValue <= 0 {
			continue
		}

		memo := fmt.Sprintf("Stock opname %s - %s", opname.OpnameNumber, item.Product.Name)

		if item.VarianceQty > 0 {
			lines = append(lines,
				finDTO.JournalLineRequest{ChartOfAccountID: inventoryAccountID, Debit: lineValue, Credit: 0, Memo: memo},
				finDTO.JournalLineRequest{ChartOfAccountID: gainAccountID, Debit: 0, Credit: lineValue, Memo: memo},
			)
			continue
		}

		lines = append(lines,
			finDTO.JournalLineRequest{ChartOfAccountID: lossAccountID, Debit: lineValue, Credit: 0, Memo: memo},
			finDTO.JournalLineRequest{ChartOfAccountID: inventoryAccountID, Debit: 0, Credit: lineValue, Memo: memo},
		)
	}

	return lines, nil
}
