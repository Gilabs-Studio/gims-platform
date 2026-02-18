package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrSalesEstimationNotFound      = errors.New("sales estimation not found")
	ErrSalesEstimationAlreadyExists = errors.New("sales estimation with this code already exists")
	ErrEstimationAlreadyConverted   = errors.New("estimation already converted to quotation")
	ErrInvalidEstimationStatus      = errors.New("cannot modify estimation in current status")
)

// SalesEstimationUsecase defines the interface for sales estimation business logic
type SalesEstimationUsecase interface {
	List(ctx context.Context, req *dto.ListSalesEstimationsRequest) ([]dto.SalesEstimationResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.SalesEstimationResponse, error)
	ListItems(ctx context.Context, estimationID string, req *dto.ListSalesEstimationItemsRequest) ([]dto.SalesEstimationItemResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateSalesEstimationRequest, createdBy *string) (*dto.SalesEstimationResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalesEstimationRequest) (*dto.SalesEstimationResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesEstimationStatusRequest, userID *string) (*dto.SalesEstimationResponse, error)
	ConvertToQuotation(ctx context.Context, id string, req *dto.ConvertToQuotationRequest, userID *string) (string, error)
}

type salesEstimationUsecase struct {
	estimationRepo salesRepos.SalesEstimationRepository
	quotationRepo  salesRepos.SalesQuotationRepository
	productRepo    productRepos.ProductRepository
}

// NewSalesEstimationUsecase creates a new SalesEstimationUsecase
func NewSalesEstimationUsecase(
	estimationRepo salesRepos.SalesEstimationRepository,
	quotationRepo salesRepos.SalesQuotationRepository,
	productRepo productRepos.ProductRepository,
) SalesEstimationUsecase {
	return &salesEstimationUsecase{
		estimationRepo: estimationRepo,
		quotationRepo:  quotationRepo,
		productRepo:    productRepo,
	}
}

func (u *salesEstimationUsecase) List(ctx context.Context, req *dto.ListSalesEstimationsRequest) ([]dto.SalesEstimationResponse, *utils.PaginationResult, error) {
	estimations, total, err := u.estimationRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.SalesEstimationResponse, len(estimations))
	for i := range estimations {
		responses[i] = mapper.ToSalesEstimationResponse(&estimations[i])
	}

	page := req.Page
	if page < 1 { page = 1 }
	perPage := req.PerPage
	if perPage < 1 { perPage = 20 }
	if perPage > 100 { perPage = 100 }

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *salesEstimationUsecase) GetByID(ctx context.Context, id string) (*dto.SalesEstimationResponse, error) {
	estimation, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesEstimationNotFound
		}
		return nil, err
	}

	response := mapper.ToSalesEstimationResponse(estimation)
	return &response, nil
}

func (u *salesEstimationUsecase) ListItems(ctx context.Context, estimationID string, req *dto.ListSalesEstimationItemsRequest) ([]dto.SalesEstimationItemResponse, *utils.PaginationResult, error) {
	// Verify estimation exists
	_, err := u.estimationRepo.FindByID(ctx, estimationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrSalesEstimationNotFound
		}
		return nil, nil, err
	}

	items, total, err := u.estimationRepo.ListItems(ctx, estimationID, req)
	if err != nil {
		return nil, nil, err
	}

	responses := make([]dto.SalesEstimationItemResponse, len(items))
	for i := range items {
		responses[i] = mapper.ToSalesEstimationItemResponse(&items[i])
	}

	page := req.Page
	if page < 1 { page = 1 }
	perPage := req.PerPage
	if perPage < 1 { perPage = 20 }
	if perPage > 100 { perPage = 100 }

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *salesEstimationUsecase) Create(ctx context.Context, req *dto.CreateSalesEstimationRequest, createdBy *string) (*dto.SalesEstimationResponse, error) {
	// Validate products
	for _, item := range req.Items {
		product, err := u.productRepo.FindByID(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrProductNotFound
			}
			return nil, err
		}
		// Use product selling price if not provided
		if item.EstimatedPrice == 0 {
			item.EstimatedPrice = product.SellingPrice
		}
	}

	// Generate estimation number
	code, err := u.estimationRepo.GetNextEstimationNumber(ctx, "SE")
	if err != nil {
		return nil, err
	}

	estimation, err := mapper.ToSalesEstimationModel(req, code, createdBy)
	if err != nil {
		return nil, err
	}

	u.calculateTotals(estimation)

	if err := u.estimationRepo.Create(ctx, estimation); err != nil {
		return nil, err
	}

	created, err := u.estimationRepo.FindByID(ctx, estimation.ID)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesEstimationResponse(created)
	return &response, nil
}

func (u *salesEstimationUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalesEstimationRequest) (*dto.SalesEstimationResponse, error) {
	estimation, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSalesEstimationNotFound
		}
		return nil, err
	}

	if estimation.Status != models.SalesEstimationStatusDraft {
		return nil, ErrInvalidEstimationStatus
	}

	// Validate items if updating
	if req.Items != nil && len(*req.Items) > 0 {
		for i := range *req.Items {
			item := &(*req.Items)[i]
			product, err := u.productRepo.FindByID(ctx, item.ProductID)
			if err != nil {
				return nil, err
			}
			if item.EstimatedPrice == 0 {
				item.EstimatedPrice = product.SellingPrice
			}
		}
	}

	if err := mapper.UpdateSalesEstimationModel(estimation, req); err != nil {
		return nil, err
	}

	u.calculateTotals(estimation)

	if err := u.estimationRepo.Update(ctx, estimation); err != nil {
		return nil, err
	}

	updated, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesEstimationResponse(updated)
	return &response, nil
}

func (u *salesEstimationUsecase) Delete(ctx context.Context, id string) error {
	estimation, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSalesEstimationNotFound
		}
		return err
	}

	if estimation.Status != models.SalesEstimationStatusDraft {
		return ErrInvalidEstimationStatus
	}

	return u.estimationRepo.Delete(ctx, id)
}

func (u *salesEstimationUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesEstimationStatusRequest, userID *string) (*dto.SalesEstimationResponse, error) {
	estimation, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	newStatus := models.SalesEstimationStatus(req.Status)

	if !u.isValidStatusTransition(estimation.Status, newStatus) {
		return nil, ErrInvalidStatusTransition
	}

	var reason *string
	if req.RejectionReason != nil {
		reason = req.RejectionReason
	}

	if err := u.estimationRepo.UpdateStatus(ctx, id, newStatus, userID, reason); err != nil {
		return nil, err
	}

	updated, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	response := mapper.ToSalesEstimationResponse(updated)
	return &response, nil
}

func (u *salesEstimationUsecase) ConvertToQuotation(ctx context.Context, id string, req *dto.ConvertToQuotationRequest, userID *string) (string, error) {
	estimation, err := u.estimationRepo.FindByID(ctx, id)
	if err != nil {
		return "", err
	}

	if estimation.Status != models.SalesEstimationStatusApproved {
		return "", errors.New("only approved estimations can be converted")
	}

	if estimation.ConvertedToQuotationID != nil && *estimation.ConvertedToQuotationID != "" {
		return "", ErrEstimationAlreadyConverted
	}

	// Create new Quotation
	quotationCode, err := u.quotationRepo.GetNextQuotationNumber(ctx, "SQ")
	if err != nil {
		return "", err
	}
	
	validUntilRaw := ""
	if req.ValidUntil != nil {
		validUntilRaw = *req.ValidUntil
	}
	
	// Create DTO for mapping
	createDTO := &dto.CreateSalesQuotationRequest{
		QuotationDate: req.QuotationDate,
		ValidUntil: &validUntilRaw,
		PaymentTermsID: req.PaymentTermsID,
		SalesRepID: *estimation.SalesRepID,
		BusinessUnitID: *estimation.BusinessUnitID,
		BusinessTypeID: estimation.BusinessTypeID,
		CustomerName:    estimation.CustomerName,
		CustomerContact: estimation.CustomerContact,
		CustomerPhone:   estimation.CustomerPhone,
		CustomerEmail:   estimation.CustomerEmail,
		TaxRate: estimation.TaxRate,
		DeliveryCost: estimation.DeliveryCost,
		OtherCost: estimation.OtherCost,
		DiscountAmount: estimation.DiscountAmount,
		Notes: "Converted from Estimation " + estimation.Code,
		Items: []dto.CreateSalesQuotationItemRequest{},
	}
	
	if req.InheritItems && len(estimation.Items) > 0 {
		for _, estItem := range estimation.Items {
			createDTO.Items = append(createDTO.Items, dto.CreateSalesQuotationItemRequest{
				ProductID: estItem.ProductID,
				Quantity: estItem.Quantity,
				Price: estItem.EstimatedPrice,
				Discount: estItem.Discount,
			})
		}
	} else {
		// Cannot create empty quotation usually, but if inherit is false we might need at least one item?
		// For now assume if not inherit items, user must add items manually later. 
		// BUT wait, standard validation says Items required min=1.
		// So if inherit is false, we can't create valid quotation via this simplified flow.
		// We should enforce inherit Items for now or handle empty items if Repository allows (it doesn't usually).
		if len(createDTO.Items) == 0 {
			// Fallback: If no items, we can't create quotation properly based on strict validation.
			// But let's assume filtering happens.
			return "", errors.New("cannot create quotation without items")
		}
	}
	
	// Use Mapper from Quotation package (need to import it? Cyclical dependency usually)
	// Alternatively, manual creation.
	// Since we are in `sales` package, we can import `sales/domain/mapper` which is `sales_estimation_mapper`??
	// No, we need `sales_quotation_mapper`.
	// But both are in same package `mapper` if I can access it.
	// Actually `mapper` folder has both files.
	// So simply `mapper.ToSalesQuotationModel`.
	
	quotationModel, err := mapper.ToSalesQuotationModel(createDTO, quotationCode, userID)
	if err != nil {
		return "", err
	}
	
	// Calculate totals for quotation
	subtotal := 0.0
	for i := range quotationModel.Items {
		quotationModel.Items[i].CalculateSubtotal()
		subtotal += quotationModel.Items[i].Subtotal
	}
	quotationModel.Subtotal = subtotal
	subAfter := subtotal - quotationModel.DiscountAmount
	if subAfter < 0 { subAfter = 0 }
	quotationModel.TaxAmount = subAfter * (quotationModel.TaxRate / 100.0)
	quotationModel.TotalAmount = subAfter + quotationModel.TaxAmount + quotationModel.DeliveryCost + quotationModel.OtherCost
	
	
	// Save Quotation
	if err := u.quotationRepo.Create(ctx, quotationModel); err != nil {
		return "", err
	}
	
	// Update Estimation status
	if err := u.estimationRepo.UpdateStatus(ctx, id, models.SalesEstimationStatusConverted, userID, nil); err != nil {
		return "", err
	}
	
	// Link them: Estimation has ConvertedToQuotationID
	// We need a specific method or raw update to link ID since UpdateStatus is for status only.
	// Actually GORM `Update` might clear items if we use the generic Update.
	// Better to use a specific manual update here.
	// Let's assume we can add a method to Repo or use Updates map.
	// Wait, Repo `UpdateStatus` only touches status related fields.
	// I should probably add `LinkQuotation` in repo or just hack it here?
	// No, I can't call DB directly from usecase (clean arch).
	// I should assume `UpdateStatus` handles it if I modify it or add a parameter.
	// Or I can add `LinkQuotation(ctx, id, quotationID)` to repository interface.
	// Since I already wrote repository, I can't easily change it without rewriting.
	// BUT, `Update` works if I load the full model first.
	
	estimation.Status = models.SalesEstimationStatusConverted
	conversionTime := time.Now()
	estimation.ConvertedAt = &conversionTime
	estimation.ConvertedToQuotationID = &quotationModel.ID
	
	// Use Repo Update (it handles item re-creation which is fine, items didn't change).
	if err := u.estimationRepo.Update(ctx, estimation); err != nil {
		return "", err
	}
	
	return quotationModel.ID, nil
}

func (u *salesEstimationUsecase) calculateTotals(se *models.SalesEstimation) {
	subtotal := 0.0
	for i := range se.Items {
		se.Items[i].CalculateSubtotal()
		subtotal += se.Items[i].Subtotal
	}

	se.Subtotal = subtotal
	subAfter := se.Subtotal - se.DiscountAmount
	if subAfter < 0 { subAfter = 0 }

	if se.TaxRate == 0 { se.TaxRate = 11.00 }
	se.TaxAmount = subAfter * (se.TaxRate / 100.0)

	se.TotalAmount = subAfter + se.TaxAmount + se.DeliveryCost + se.OtherCost
}

func (u *salesEstimationUsecase) isValidStatusTransition(current, new models.SalesEstimationStatus) bool {
	valid := map[models.SalesEstimationStatus][]models.SalesEstimationStatus{
		models.SalesEstimationStatusDraft: {
			models.SalesEstimationStatusSubmitted,
			models.SalesEstimationStatusRejected, // Can force reject? Usually no.
		},
		models.SalesEstimationStatusSubmitted: {
			models.SalesEstimationStatusApproved,
			models.SalesEstimationStatusRejected,
		},
		models.SalesEstimationStatusApproved: {
			models.SalesEstimationStatusConverted,
		},
		models.SalesEstimationStatusRejected: {
			models.SalesEstimationStatusDraft,
		},
		models.SalesEstimationStatusConverted: {},
	}

	allowed, ok := valid[current]
	if !ok { return false }
	for _, s := range allowed {
		if s == new { return true }
	}
	return false
}
