package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DealUsecase defines the interface for deal business logic
type DealUsecase interface {
	Create(ctx context.Context, req dto.CreateDealRequest, createdBy string) (dto.DealResponse, error)
	GetByID(ctx context.Context, id string) (dto.DealResponse, error)
	List(ctx context.Context, params repositories.DealListParams) ([]dto.DealResponse, int64, error)
	ListByStage(ctx context.Context, params repositories.DealsByStageParams) ([]dto.DealResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateDealRequest) (dto.DealResponse, error)
	Delete(ctx context.Context, id string) error
	MoveStage(ctx context.Context, id string, req dto.MoveDealStageRequest, changedBy string) (dto.DealResponse, error)
	GetHistory(ctx context.Context, dealID string) ([]dto.DealHistoryResponse, error)
	GetFormData(ctx context.Context) (*dto.DealFormDataResponse, error)
	GetPipelineSummary(ctx context.Context) (dto.DealPipelineSummaryResponse, error)
	GetForecast(ctx context.Context) (dto.DealForecastResponse, error)
	ConvertToQuotation(ctx context.Context, dealID string, req dto.ConvertToQuotationRequest, userID string) (dto.ConvertToQuotationResponse, error)
	StockCheck(ctx context.Context, dealID string) (dto.StockCheckResponse, error)
}

type dealUsecase struct {
	dealRepo           repositories.DealRepository
	stageRepo          repositories.PipelineStageRepository
	customerRepo       customerRepos.CustomerRepository
	contactRepo        repositories.ContactRepository
	employeeRepo       orgRepos.EmployeeRepository
	productRepo        productRepos.ProductRepository
	leadRepo           repositories.LeadRepository
	salesQuotationRepo salesRepos.SalesQuotationRepository
	db                 *gorm.DB
}

// NewDealUsecase creates a new deal usecase
func NewDealUsecase(
	dealRepo repositories.DealRepository,
	stageRepo repositories.PipelineStageRepository,
	customerRepo customerRepos.CustomerRepository,
	contactRepo repositories.ContactRepository,
	employeeRepo orgRepos.EmployeeRepository,
	productRepo productRepos.ProductRepository,
	leadRepo repositories.LeadRepository,
	salesQuotationRepo salesRepos.SalesQuotationRepository,
	db *gorm.DB,
) DealUsecase {
	return &dealUsecase{
		dealRepo:           dealRepo,
		stageRepo:          stageRepo,
		customerRepo:       customerRepo,
		contactRepo:        contactRepo,
		employeeRepo:       employeeRepo,
		productRepo:        productRepo,
		leadRepo:           leadRepo,
		salesQuotationRepo: salesQuotationRepo,
		db:                 db,
	}
}

func (u *dealUsecase) Create(ctx context.Context, req dto.CreateDealRequest, createdBy string) (dto.DealResponse, error) {
	// Validate pipeline stage
	stage, err := u.stageRepo.FindByID(ctx, req.PipelineStageID)
	if err != nil {
		return dto.DealResponse{}, errors.New("pipeline stage not found")
	}

	// Validate customer if provided
	if req.CustomerID != nil && *req.CustomerID != "" {
		_, err := u.customerRepo.FindByID(ctx, *req.CustomerID)
		if err != nil {
			return dto.DealResponse{}, errors.New("customer not found")
		}
	}

	// Validate contact if provided
	if req.ContactID != nil && *req.ContactID != "" {
		_, err := u.contactRepo.FindByID(ctx, *req.ContactID)
		if err != nil {
			return dto.DealResponse{}, errors.New("contact not found")
		}
	}

	// Validate assigned employee if provided
	if req.AssignedTo != nil && *req.AssignedTo != "" {
		_, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo)
		if err != nil {
			return dto.DealResponse{}, errors.New("assigned employee not found")
		}
	}

	// Validate lead if provided
	if req.LeadID != nil && *req.LeadID != "" {
		_, err := u.leadRepo.FindByID(ctx, *req.LeadID)
		if err != nil {
			return dto.DealResponse{}, errors.New("lead not found")
		}
	}

	// Parse expected close date
	var expectedCloseDate *time.Time
	if req.ExpectedCloseDate != nil && *req.ExpectedCloseDate != "" {
		t, err := time.Parse("2006-01-02", *req.ExpectedCloseDate)
		if err != nil {
			return dto.DealResponse{}, errors.New("invalid expected_close_date format, use YYYY-MM-DD")
		}
		expectedCloseDate = &t
	}

	// Build product items with snapshot data
	items := make([]models.DealProductItem, 0, len(req.Items))
	for _, itemDTO := range req.Items {
		item := models.DealProductItem{
			ID:              uuid.New().String(),
			ProductID:       itemDTO.ProductID,
			ProductName:     itemDTO.ProductName,
			ProductSKU:      itemDTO.ProductSKU,
			UnitPrice:       itemDTO.UnitPrice,
			Quantity:        itemDTO.Quantity,
			DiscountPercent: itemDTO.DiscountPercent,
			DiscountAmount:  itemDTO.DiscountAmount,
			Notes:           itemDTO.Notes,
		}

		// Snapshot product data if product ID is provided
		if itemDTO.ProductID != nil && *itemDTO.ProductID != "" {
			product, err := u.productRepo.FindByID(ctx, *itemDTO.ProductID)
			if err != nil {
				return dto.DealResponse{}, fmt.Errorf("product not found: %s", *itemDTO.ProductID)
			}
			if item.ProductName == "" {
				item.ProductName = product.Name
			}
			if item.ProductSKU == "" {
				item.ProductSKU = product.Sku
			}
			if item.UnitPrice == 0 {
				item.UnitPrice = product.SellingPrice
			}
		}

		// Calculate subtotal
		item.Subtotal = item.CalculateSubtotal()
		items = append(items, item)
	}

	// Calculate value from items if items exist and no manual value
	dealValue := req.Value
	if len(items) > 0 && dealValue == 0 {
		for _, item := range items {
			dealValue += item.Subtotal
		}
	}

	deal := &models.Deal{
		ID:                uuid.New().String(),
		Title:             req.Title,
		Description:       req.Description,
		Status:            models.DealStatusOpen,
		PipelineStageID:   req.PipelineStageID,
		Value:             dealValue,
		Probability:       stage.Probability,
		ExpectedCloseDate: expectedCloseDate,
		CustomerID:        req.CustomerID,
		ContactID:         req.ContactID,
		AssignedTo:        req.AssignedTo,
		LeadID:            req.LeadID,
		BudgetConfirmed:   req.BudgetConfirmed,
		BudgetAmount:      req.BudgetAmount,
		AuthConfirmed:     req.AuthConfirmed,
		AuthPerson:        req.AuthPerson,
		NeedConfirmed:     req.NeedConfirmed,
		NeedDescription:   req.NeedDescription,
		TimeConfirmed:     req.TimeConfirmed,
		Notes:             req.Notes,
		CreatedBy:         &createdBy,
		Items:             items,
	}

	if err := u.dealRepo.Create(ctx, deal); err != nil {
		return dto.DealResponse{}, fmt.Errorf("failed to create deal: %w", err)
	}

	// Reload with preloaded relations
	created, err := u.dealRepo.FindByID(ctx, deal.ID)
	if err != nil {
		return dto.DealResponse{}, err
	}

	return mapper.ToDealResponse(created), nil
}

func (u *dealUsecase) GetByID(ctx context.Context, id string) (dto.DealResponse, error) {
	deal, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return dto.DealResponse{}, errors.New("deal not found")
	}
	return mapper.ToDealResponse(deal), nil
}

func (u *dealUsecase) List(ctx context.Context, params repositories.DealListParams) ([]dto.DealResponse, int64, error) {
	deals, total, err := u.dealRepo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToDealResponseList(deals), total, nil
}

func (u *dealUsecase) ListByStage(ctx context.Context, params repositories.DealsByStageParams) ([]dto.DealResponse, int64, error) {
	deals, total, err := u.dealRepo.ListByStage(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToDealResponseList(deals), total, nil
}

func (u *dealUsecase) Update(ctx context.Context, id string, req dto.UpdateDealRequest) (dto.DealResponse, error) {
	deal, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return dto.DealResponse{}, errors.New("deal not found")
	}

	// Prevent updates on closed deals
	if deal.Status != models.DealStatusOpen {
		return dto.DealResponse{}, errors.New("deal already closed")
	}

	// Validate stage if changing
	if req.PipelineStageID != nil && *req.PipelineStageID != "" {
		stage, err := u.stageRepo.FindByID(ctx, *req.PipelineStageID)
		if err != nil {
			return dto.DealResponse{}, errors.New("pipeline stage not found")
		}
		deal.PipelineStageID = *req.PipelineStageID
		deal.Probability = stage.Probability
	}

	// Validate customer if changing
	if req.CustomerID != nil && *req.CustomerID != "" {
		_, err := u.customerRepo.FindByID(ctx, *req.CustomerID)
		if err != nil {
			return dto.DealResponse{}, errors.New("customer not found")
		}
		deal.CustomerID = req.CustomerID
	}

	// Validate contact if changing
	if req.ContactID != nil && *req.ContactID != "" {
		_, err := u.contactRepo.FindByID(ctx, *req.ContactID)
		if err != nil {
			return dto.DealResponse{}, errors.New("contact not found")
		}
		deal.ContactID = req.ContactID
	}

	// Validate assigned employee if changing
	if req.AssignedTo != nil && *req.AssignedTo != "" {
		_, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo)
		if err != nil {
			return dto.DealResponse{}, errors.New("assigned employee not found")
		}
		deal.AssignedTo = req.AssignedTo
	}

	// Apply partial updates
	if req.Title != nil {
		deal.Title = *req.Title
	}
	if req.Description != nil {
		deal.Description = *req.Description
	}
	if req.Value != nil {
		deal.Value = *req.Value
	}
	if req.ExpectedCloseDate != nil && *req.ExpectedCloseDate != "" {
		t, err := time.Parse("2006-01-02", *req.ExpectedCloseDate)
		if err != nil {
			return dto.DealResponse{}, errors.New("invalid expected_close_date format, use YYYY-MM-DD")
		}
		deal.ExpectedCloseDate = &t
	}

	// BANT updates
	if req.BudgetConfirmed != nil {
		deal.BudgetConfirmed = *req.BudgetConfirmed
	}
	if req.BudgetAmount != nil {
		deal.BudgetAmount = *req.BudgetAmount
	}
	if req.AuthConfirmed != nil {
		deal.AuthConfirmed = *req.AuthConfirmed
	}
	if req.AuthPerson != nil {
		deal.AuthPerson = *req.AuthPerson
	}
	if req.NeedConfirmed != nil {
		deal.NeedConfirmed = *req.NeedConfirmed
	}
	if req.NeedDescription != nil {
		deal.NeedDescription = *req.NeedDescription
	}
	if req.TimeConfirmed != nil {
		deal.TimeConfirmed = *req.TimeConfirmed
	}
	if req.Notes != nil {
		deal.Notes = *req.Notes
	}

	// Handle product items replacement
	if req.Items != nil {
		// Delete existing items
		if err := u.dealRepo.DeleteItemsByDealID(ctx, id); err != nil {
			return dto.DealResponse{}, fmt.Errorf("failed to clear deal items: %w", err)
		}

		// Create new items
		items := make([]models.DealProductItem, 0, len(*req.Items))
		for _, itemDTO := range *req.Items {
			item := models.DealProductItem{
				ID:              uuid.New().String(),
				DealID:          id,
				ProductID:       itemDTO.ProductID,
				ProductName:     itemDTO.ProductName,
				ProductSKU:      itemDTO.ProductSKU,
				UnitPrice:       itemDTO.UnitPrice,
				Quantity:        itemDTO.Quantity,
				DiscountPercent: itemDTO.DiscountPercent,
				DiscountAmount:  itemDTO.DiscountAmount,
				Notes:           itemDTO.Notes,
			}

			// Snapshot product data if product ID is provided
			if itemDTO.ProductID != nil && *itemDTO.ProductID != "" {
				product, err := u.productRepo.FindByID(ctx, *itemDTO.ProductID)
				if err != nil {
					return dto.DealResponse{}, fmt.Errorf("product not found: %s", *itemDTO.ProductID)
				}
				if item.ProductName == "" {
					item.ProductName = product.Name
				}
				if item.ProductSKU == "" {
					item.ProductSKU = product.Sku
				}
				if item.UnitPrice == 0 {
					item.UnitPrice = product.SellingPrice
				}
			}

			item.Subtotal = item.CalculateSubtotal()
			items = append(items, item)
		}

		if len(items) > 0 {
			if err := u.dealRepo.CreateItems(ctx, items); err != nil {
				return dto.DealResponse{}, fmt.Errorf("failed to create deal items: %w", err)
			}

			// Recalculate deal value from items if value not explicitly set
			if req.Value == nil {
				totalValue := 0.0
				for _, item := range items {
					totalValue += item.Subtotal
				}
				deal.Value = totalValue
			}
		}
	}

	// Nil out preloaded association pointers so GORM cannot use stale BelongsTo
	// data to override FK columns during Save.
	deal.PipelineStage = nil
	deal.Customer = nil
	deal.Contact = nil
	deal.AssignedEmployee = nil
	deal.Lead = nil
	deal.Items = nil

	if err := u.dealRepo.Update(ctx, deal); err != nil {
		return dto.DealResponse{}, fmt.Errorf("failed to update deal: %w", err)
	}

	// Reload with preloaded relations
	updated, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return dto.DealResponse{}, err
	}

	return mapper.ToDealResponse(updated), nil
}

func (u *dealUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return errors.New("deal not found")
	}
	return u.dealRepo.Delete(ctx, id)
}

func (u *dealUsecase) MoveStage(ctx context.Context, id string, req dto.MoveDealStageRequest, changedBy string) (dto.DealResponse, error) {
	deal, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return dto.DealResponse{}, errors.New("deal not found")
	}

	// Validate target stage first, so we know if we're re-opening or staying closed
	toStage, err := u.stageRepo.FindByID(ctx, req.ToStageID)
	if err != nil {
		return dto.DealResponse{}, errors.New("invalid pipeline stage")
	}

	// Require close reason for won/lost stages
	if (toStage.IsWon || toStage.IsLost) && req.CloseReason == "" {
		if toStage.IsLost {
			return dto.DealResponse{}, errors.New("close reason required for lost deals")
		}
	}

	// Calculate days in previous stage
	daysInPrevStage := 0
	lastHistory, err := u.dealRepo.GetLastHistoryByDealID(ctx, id)
	if err == nil && lastHistory != nil {
		daysInPrevStage = int(math.Ceil(time.Since(lastHistory.ChangedAt).Hours() / 24))
	} else {
		// First stage transition, calculate from deal creation
		daysInPrevStage = int(math.Ceil(time.Since(deal.CreatedAt).Hours() / 24))
	}

	// Record previous stage info
	fromStageID := deal.PipelineStageID
	fromStageName := ""
	fromProbability := deal.Probability
	if deal.PipelineStage != nil {
		fromStageName = deal.PipelineStage.Name
	}

	// Resolve user ID to employee ID to satisfy the FK constraint on crm_deal_history.
	// The JWT carries a user_id, but the FK references the employees table.
	var employeeID *string
	if changedBy != "" {
		emp, empErr := u.employeeRepo.FindByUserID(ctx, changedBy)
		if empErr == nil && emp != nil {
			empID := emp.ID
			employeeID = &empID
		}
		// If no matching employee exists (e.g. system/admin account), ChangedBy stays nil.
	}

	// Create history record
	history := &models.DealHistory{
		ID:              uuid.New().String(),
		DealID:          id,
		FromStageID:     &fromStageID,
		FromStageName:   fromStageName,
		ToStageID:       req.ToStageID,
		ToStageName:     toStage.Name,
		FromProbability: fromProbability,
		ToProbability:   toStage.Probability,
		DaysInPrevStage: daysInPrevStage,
		ChangedBy:       employeeID,
		ChangedAt:       time.Now(),
		Reason:          req.Reason,
		Notes:           req.Notes,
	}

	if err := u.dealRepo.CreateHistory(ctx, history); err != nil {
		return dto.DealResponse{}, fmt.Errorf("failed to create deal history: %w", err)
	}

	// Update deal fields
	deal.PipelineStageID = req.ToStageID
	deal.Probability = toStage.Probability

	if toStage.IsWon {
		deal.Status = models.DealStatusWon
		now := time.Now()
		deal.ActualCloseDate = &now
		if req.CloseReason != "" {
			deal.CloseReason = req.CloseReason
		}
	} else if toStage.IsLost {
		deal.Status = models.DealStatusLost
		now := time.Now()
		deal.ActualCloseDate = &now
		deal.CloseReason = req.CloseReason
	} else {
		// Moving to an open (non-closing) stage — re-open the deal if it was previously closed
		deal.Status = models.DealStatusOpen
		deal.ActualCloseDate = nil
		deal.CloseReason = ""
	}

	// Nil out preloaded associations before Save to prevent GORM BelongsTo FK override
	deal.PipelineStage = nil
	deal.Customer = nil
	deal.Contact = nil
	deal.AssignedEmployee = nil
	deal.Lead = nil
	deal.Items = nil

	if err := u.dealRepo.Update(ctx, deal); err != nil {
		return dto.DealResponse{}, fmt.Errorf("failed to update deal stage: %w", err)
	}

	// Reload with preloaded relations
	updated, err := u.dealRepo.FindByID(ctx, id)
	if err != nil {
		return dto.DealResponse{}, err
	}

	return mapper.ToDealResponse(updated), nil
}

func (u *dealUsecase) GetHistory(ctx context.Context, dealID string) ([]dto.DealHistoryResponse, error) {
	// Verify deal exists
	_, err := u.dealRepo.FindByID(ctx, dealID)
	if err != nil {
		return nil, errors.New("deal not found")
	}

	history, err := u.dealRepo.GetHistory(ctx, dealID)
	if err != nil {
		return nil, err
	}

	return mapper.ToDealHistoryResponseList(history), nil
}

func (u *dealUsecase) GetFormData(ctx context.Context) (*dto.DealFormDataResponse, error) {
	// Employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}
	employeeOptions := make([]dto.DealEmployeeOption, 0, len(employees))
	for _, emp := range employees {
		empID, err := uuid.Parse(emp.ID)
		if err != nil {
			continue
		}
		employeeOptions = append(employeeOptions, dto.DealEmployeeOption{
			ID:           empID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	// Customers
	customers, _, err := u.customerRepo.List(ctx, customerRepos.CustomerListParams{
		ListParams: customerRepos.ListParams{Limit: 500},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customers: %w", err)
	}
	customerOptions := make([]dto.DealCustomerOption, 0, len(customers))
	for _, c := range customers {
		customerOptions = append(customerOptions, dto.DealCustomerOption{
			ID:   c.ID,
			Code: c.Code,
			Name: c.Name,
		})
	}

	// Contacts
	contacts, _, err := u.contactRepo.List(ctx, repositories.ContactListParams{ListParams: repositories.ListParams{Limit: 500}})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch contacts: %w", err)
	}
	contactOptions := make([]dto.DealContactOption, 0, len(contacts))
	for _, c := range contacts {
		contactOptions = append(contactOptions, dto.DealContactOption{
			ID:         c.ID,
			Name:       c.Name,
			Phone:      c.Phone,
			Email:      c.Email,
			CustomerID: c.CustomerID,
		})
	}

	// Pipeline stages
	stages, _, err := u.stageRepo.List(ctx, repositories.ListParams{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pipeline stages: %w", err)
	}
	stageOptions := make([]dto.DealPipelineStageOption, 0, len(stages))
	for _, s := range stages {
		stageOptions = append(stageOptions, dto.DealPipelineStageOption{
			ID:          s.ID,
			Name:        s.Name,
			Code:        s.Code,
			Color:       s.Color,
			Order:       s.Order,
			Probability: s.Probability,
			IsWon:       s.IsWon,
			IsLost:      s.IsLost,
		})
	}

	// Products
	products, _, err := u.productRepo.List(ctx, productRepos.ProductListParams{
		ListParams: productRepos.ListParams{Limit: 500},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch products: %w", err)
	}
	productOptions := make([]dto.DealProductOption, 0, len(products))
	for _, p := range products {
		productOptions = append(productOptions, dto.DealProductOption{
			ID:           p.ID,
			Code:         p.Code,
			Name:         p.Name,
			SKU:          p.Sku,
			SellingPrice: p.SellingPrice,
		})
	}

	// Leads (qualified, not yet converted, for deal creation from lead)
	leads, _, err := u.leadRepo.List(ctx, repositories.LeadListParams{Limit: 500})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leads: %w", err)
	}
	leadOptions := make([]dto.DealLeadOption, 0, len(leads))
	for _, l := range leads {
		leadOptions = append(leadOptions, dto.DealLeadOption{
			ID:          l.ID,
			Code:        l.Code,
			FirstName:   l.FirstName,
			LastName:    l.LastName,
			CompanyName: l.CompanyName,
			IsConverted: l.IsConverted(),
		})
	}

	return &dto.DealFormDataResponse{
		Employees:      employeeOptions,
		Customers:      customerOptions,
		Contacts:       contactOptions,
		PipelineStages: stageOptions,
		Products:       productOptions,
		Leads:          leadOptions,
	}, nil
}

func (u *dealUsecase) GetPipelineSummary(ctx context.Context) (dto.DealPipelineSummaryResponse, error) {
	data, err := u.dealRepo.GetPipelineSummary(ctx)
	if err != nil {
		return dto.DealPipelineSummaryResponse{}, err
	}
	return mapper.ToPipelineSummaryResponse(data), nil
}

func (u *dealUsecase) GetForecast(ctx context.Context) (dto.DealForecastResponse, error) {
	data, err := u.dealRepo.GetForecast(ctx)
	if err != nil {
		return dto.DealForecastResponse{}, err
	}
	return mapper.ToForecastResponse(data), nil
}

// ConvertToQuotation converts a won deal into a Sales Quotation
func (u *dealUsecase) ConvertToQuotation(ctx context.Context, dealID string, req dto.ConvertToQuotationRequest, userID string) (dto.ConvertToQuotationResponse, error) {
	deal, err := u.dealRepo.FindByID(ctx, dealID)
	if err != nil {
		return dto.ConvertToQuotationResponse{}, errors.New("deal not found")
	}

	// Validate deal status must be "won"
	if deal.Status != models.DealStatusWon {
		return dto.ConvertToQuotationResponse{}, errors.New("deal not won")
	}

	// Validate deal has not been converted already
	if deal.ConvertedToQuotationID != nil && *deal.ConvertedToQuotationID != "" {
		return dto.ConvertToQuotationResponse{}, errors.New("deal already converted")
	}

	// Validate deal has product items
	if len(deal.Items) == 0 {
		return dto.ConvertToQuotationResponse{}, errors.New("deal has no items")
	}

	// Validate deal has customer
	if deal.CustomerID == nil || *deal.CustomerID == "" {
		return dto.ConvertToQuotationResponse{}, errors.New("deal customer required")
	}

	// Snapshot customer data
	customer, err := u.customerRepo.FindByID(ctx, *deal.CustomerID)
	if err != nil {
		return dto.ConvertToQuotationResponse{}, fmt.Errorf("customer not found: %w", err)
	}

	// Generate quotation code
	now := time.Now()
	prefix := "QUO"
	codePrefix := fmt.Sprintf("%s-%s", prefix, now.Format("200601"))
	quotationCode, err := u.salesQuotationRepo.GetNextQuotationNumber(ctx, codePrefix)
	if err != nil {
		return dto.ConvertToQuotationResponse{}, fmt.Errorf("failed to generate quotation code: %w", err)
	}

	// Build quotation items from deal product items
	var subtotal float64
	quotationItems := make([]salesModels.SalesQuotationItem, 0, len(deal.Items))
	for _, dealItem := range deal.Items {
		item := salesModels.SalesQuotationItem{
			ID:       uuid.New().String(),
			Quantity: float64(dealItem.Quantity),
			Price:    dealItem.UnitPrice,
			Discount: dealItem.DiscountAmount,
		}

		if dealItem.ProductID != nil && *dealItem.ProductID != "" {
			item.ProductID = *dealItem.ProductID
		}

		item.CalculateSubtotal()
		subtotal += item.Subtotal
		quotationItems = append(quotationItems, item)
	}

	// Calculate tax (11% PPN)
	const defaultTaxRate = 11.0
	taxAmount := subtotal * (defaultTaxRate / 100)
	totalAmount := subtotal + taxAmount

	// Build quotation
	quotation := &salesModels.SalesQuotation{
		ID:            uuid.New().String(),
		Code:          quotationCode,
		QuotationDate: now,
		CustomerID:    deal.CustomerID,
		CustomerName:  customer.Name,
		SalesRepID:    deal.AssignedTo,
		Subtotal:      subtotal,
		TaxRate:       defaultTaxRate,
		TaxAmount:     taxAmount,
		TotalAmount:   totalAmount,
		Status:        salesModels.SalesQuotationStatusDraft,
		CreatedBy:     &userID,
		Items:         quotationItems,
	}

	// Apply optional overrides
	if req.PaymentTermsID != nil && *req.PaymentTermsID != "" {
		quotation.PaymentTermsID = req.PaymentTermsID
	}
	if req.BusinessUnitID != nil && *req.BusinessUnitID != "" {
		quotation.BusinessUnitID = req.BusinessUnitID
	}
	if req.BusinessTypeID != nil && *req.BusinessTypeID != "" {
		quotation.BusinessTypeID = req.BusinessTypeID
	}
	if req.Notes != "" {
		quotation.Notes = req.Notes
	}

	// Snapshot customer contact info
	quotation.CustomerContact = customer.ContactPerson
	quotation.CustomerEmail = customer.Email

	// Create the quotation
	if err := u.salesQuotationRepo.Create(ctx, quotation); err != nil {
		return dto.ConvertToQuotationResponse{}, fmt.Errorf("failed to create quotation: %w", err)
	}

	// Update deal with conversion reference
	quotationID := quotation.ID
	deal.ConvertedToQuotationID = &quotationID
	deal.ConvertedAt = &now

	if err := u.dealRepo.Update(ctx, deal); err != nil {
		return dto.ConvertToQuotationResponse{}, fmt.Errorf("failed to update deal conversion: %w", err)
	}

	return dto.ConvertToQuotationResponse{
		DealID:        deal.ID,
		QuotationID:   quotation.ID,
		QuotationCode: quotation.Code,
	}, nil
}

// stockRow holds the aggregated stock data for a product
type stockRow struct {
	ProductID        string  `gorm:"column:product_id"`
	AvailableStock   float64 `gorm:"column:available_stock"`
	ReservedStock    float64 `gorm:"column:reserved_stock"`
}

// StockCheck queries ERP inventory for stock availability per deal product item
func (u *dealUsecase) StockCheck(ctx context.Context, dealID string) (dto.StockCheckResponse, error) {
	deal, err := u.dealRepo.FindByID(ctx, dealID)
	if err != nil {
		return dto.StockCheckResponse{}, errors.New("deal not found")
	}

	if len(deal.Items) == 0 {
		return dto.StockCheckResponse{
			DealID:        deal.ID,
			Items:         []dto.StockCheckItemResponse{},
			AllSufficient: true,
		}, nil
	}

	// Collect product IDs that have a valid reference
	productIDs := make([]string, 0, len(deal.Items))
	for _, item := range deal.Items {
		if item.ProductID != nil && *item.ProductID != "" {
			productIDs = append(productIDs, *item.ProductID)
		}
	}

	// Query aggregated stock from inventory_batches
	stockMap := make(map[string]stockRow)
	if len(productIDs) > 0 {
		var rows []stockRow
		err := u.db.WithContext(ctx).
			Table("inventory_batches").
			Select(`
				product_id,
				COALESCE(SUM(current_quantity - reserved_quantity), 0) as available_stock,
				COALESCE(SUM(reserved_quantity), 0) as reserved_stock
			`).
			Where("product_id IN ? AND is_active = ? AND deleted_at IS NULL", productIDs, true).
			Group("product_id").
			Scan(&rows).Error
		if err != nil {
			return dto.StockCheckResponse{}, errors.New("stock check failed")
		}
		for _, r := range rows {
			stockMap[r.ProductID] = r
		}
	}

	// Build response items
	allSufficient := true
	items := make([]dto.StockCheckItemResponse, 0, len(deal.Items))
	for _, dealItem := range deal.Items {
		respItem := dto.StockCheckItemResponse{
			ProductName:       dealItem.ProductName,
			RequestedQuantity: dealItem.Quantity,
		}

		if dealItem.ProductID != nil && *dealItem.ProductID != "" {
			respItem.ProductID = *dealItem.ProductID
			if stock, ok := stockMap[*dealItem.ProductID]; ok {
				respItem.AvailableStock = stock.AvailableStock
				respItem.ReservedStock = stock.ReservedStock
			}
		}

		respItem.IsSufficient = respItem.AvailableStock >= float64(respItem.RequestedQuantity)
		if !respItem.IsSufficient {
			allSufficient = false
		}

		items = append(items, respItem)
	}

	return dto.StockCheckResponse{
		DealID:        deal.ID,
		Items:         items,
		AllSufficient: allSufficient,
	}, nil
}
