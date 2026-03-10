package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	orgDto "github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/google/uuid"
)

// LeadUsecase defines the interface for lead business logic
type LeadUsecase interface {
	Create(ctx context.Context, req dto.CreateLeadRequest, createdBy string) (dto.LeadResponse, error)
	GetByID(ctx context.Context, id string) (dto.LeadResponse, error)
	List(ctx context.Context, params repositories.LeadListParams) ([]dto.LeadResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateLeadRequest) (dto.LeadResponse, error)
	Delete(ctx context.Context, id string) error
	Convert(ctx context.Context, id string, req dto.ConvertLeadRequest, convertedBy string) (dto.LeadResponse, error)
	BulkUpsert(ctx context.Context, req dto.BulkUpsertLeadRequest, createdBy string) (*dto.BulkUpsertLeadResponse, error)
	GetFormData(ctx context.Context) (*dto.LeadFormDataResponse, error)
	GetAnalytics(ctx context.Context) (*repositories.LeadAnalytics, error)
	GetProductItems(ctx context.Context, leadID string) ([]dto.LeadProductItemResponse, error)
}

type leadUsecase struct {
	leadRepo          repositories.LeadRepository
	leadStatusRepo    repositories.LeadStatusRepository
	leadSourceRepo    repositories.LeadSourceRepository
	dealRepo          repositories.DealRepository
	pipelineStageRepo repositories.PipelineStageRepository
	activityRepo      repositories.ActivityRepository
	employeeRepo      orgRepos.EmployeeRepository
	businessTypeRepo  orgRepos.BusinessTypeRepository
	areaRepo          orgRepos.AreaRepository
	paymentTermsRepo  coreRepos.PaymentTermsRepository
}

// NewLeadUsecase creates a new lead usecase
func NewLeadUsecase(
	leadRepo repositories.LeadRepository,
	leadStatusRepo repositories.LeadStatusRepository,
	leadSourceRepo repositories.LeadSourceRepository,
	dealRepo repositories.DealRepository,
	pipelineStageRepo repositories.PipelineStageRepository,
	activityRepo repositories.ActivityRepository,
	employeeRepo orgRepos.EmployeeRepository,
	businessTypeRepo orgRepos.BusinessTypeRepository,
	areaRepo orgRepos.AreaRepository,
	paymentTermsRepo coreRepos.PaymentTermsRepository,
) LeadUsecase {
	return &leadUsecase{
		leadRepo:          leadRepo,
		leadStatusRepo:    leadStatusRepo,
		leadSourceRepo:    leadSourceRepo,
		dealRepo:          dealRepo,
		pipelineStageRepo: pipelineStageRepo,
		activityRepo:      activityRepo,
		employeeRepo:      employeeRepo,
		businessTypeRepo:  businessTypeRepo,
		areaRepo:          areaRepo,
		paymentTermsRepo:  paymentTermsRepo,
	}
}

func (u *leadUsecase) Create(ctx context.Context, req dto.CreateLeadRequest, createdBy string) (dto.LeadResponse, error) {
	// Validate lead source if provided
	if req.LeadSourceID != nil && *req.LeadSourceID != "" {
		_, err := u.leadSourceRepo.FindByID(ctx, *req.LeadSourceID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("lead source not found")
		}
	}

	// Assign default lead status if not provided
	var statusID *string
	if req.LeadStatusID != nil && *req.LeadStatusID != "" {
		_, err := u.leadStatusRepo.FindByID(ctx, *req.LeadStatusID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("lead status not found")
		}
		statusID = req.LeadStatusID
	} else {
		// Use the default status (e.g., "New")
		defaultStatus, err := u.leadStatusRepo.FindDefault(ctx)
		if err == nil && defaultStatus != nil {
			statusID = &defaultStatus.ID
		}
	}

	// Validate assigned employee if provided
	if req.AssignedTo != nil && *req.AssignedTo != "" {
		_, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo)
		if err != nil {
			return dto.LeadResponse{}, errors.New("assigned employee not found")
		}
	}

	// Parse time expected
	var timeExpected *time.Time
	if req.TimeExpected != nil && *req.TimeExpected != "" {
		t, err := time.Parse("2006-01-02", *req.TimeExpected)
		if err != nil {
			return dto.LeadResponse{}, errors.New("invalid time_expected format, use YYYY-MM-DD")
		}
		timeExpected = &t
	}

	lead := &models.Lead{
		ID:              uuid.New().String(),
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		CompanyName:     req.CompanyName,
		Email:           req.Email,
		Phone:           req.Phone,
		JobTitle:        req.JobTitle,
		Address:         req.Address,
		City:            req.City,
		Province:        req.Province,
		ProvinceID:      req.ProvinceID,
		CityID:          req.CityID,
		DistrictID:      req.DistrictID,
		VillageName:     req.VillageName,
		LeadSourceID:    req.LeadSourceID,
		LeadStatusID:    statusID,
		EstimatedValue:  req.EstimatedValue,
		Probability:     req.Probability,
		Website:         req.Website,
		BudgetConfirmed: req.BudgetConfirmed,
		BudgetAmount:    req.BudgetAmount,
		AuthConfirmed:   req.AuthConfirmed,
		AuthPerson:      req.AuthPerson,
		NeedConfirmed:   req.NeedConfirmed,
		NeedDescription: req.NeedDescription,
		TimeConfirmed:   req.TimeConfirmed,
		TimeExpected:    timeExpected,
		AssignedTo:      req.AssignedTo,
		Notes:           req.Notes,
		BusinessTypeID:  req.BusinessTypeID,
		AreaID:          req.AreaID,
		PaymentTermsID:  req.PaymentTermsID,
		CreatedBy:       &createdBy,
	}

	// Calculate lead score after setting all fields
	// Need to preload status for score calculation
	if statusID != nil {
		status, _ := u.leadStatusRepo.FindByID(ctx, *statusID)
		if status != nil {
			lead.LeadStatus = status
		}
	}
	lead.LeadScore = lead.CalculateLeadScore()

	if err := u.leadRepo.Create(ctx, lead); err != nil {
		return dto.LeadResponse{}, fmt.Errorf("failed to create lead: %w", err)
	}

	// Reload with preloaded relations
	created, err := u.leadRepo.FindByID(ctx, lead.ID)
	if err != nil {
		return dto.LeadResponse{}, err
	}

	return mapper.ToLeadResponse(created), nil
}

func (u *leadUsecase) GetByID(ctx context.Context, id string) (dto.LeadResponse, error) {
	lead, err := u.leadRepo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadResponse{}, errors.New("lead not found")
	}
	return mapper.ToLeadResponse(lead), nil
}

func (u *leadUsecase) List(ctx context.Context, params repositories.LeadListParams) ([]dto.LeadResponse, int64, error) {
	leads, total, err := u.leadRepo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToLeadResponseList(leads), total, nil
}

func (u *leadUsecase) Update(ctx context.Context, id string, req dto.UpdateLeadRequest) (dto.LeadResponse, error) {
	lead, err := u.leadRepo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadResponse{}, errors.New("lead not found")
	}

	// Prevent updates on converted leads
	if lead.ConvertedAt != nil {
		return dto.LeadResponse{}, errors.New("cannot update a converted lead")
	}

	// Validate lead source if changing
	if req.LeadSourceID != nil && *req.LeadSourceID != "" {
		_, err := u.leadSourceRepo.FindByID(ctx, *req.LeadSourceID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("lead source not found")
		}
		lead.LeadSourceID = req.LeadSourceID
	}

	// Validate lead status if changing
	if req.LeadStatusID != nil && *req.LeadStatusID != "" {
		status, err := u.leadStatusRepo.FindByID(ctx, *req.LeadStatusID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("lead status not found")
		}
		// Prevent manual assignment of converted status
		if status.IsConverted {
			return dto.LeadResponse{}, errors.New("cannot manually set converted status, use the convert endpoint")
		}
		lead.LeadStatusID = req.LeadStatusID
		lead.LeadStatus = status
	}

	// Validate assigned employee if changing
	if req.AssignedTo != nil && *req.AssignedTo != "" {
		_, err := u.employeeRepo.FindByID(ctx, *req.AssignedTo)
		if err != nil {
			return dto.LeadResponse{}, errors.New("assigned employee not found")
		}
		lead.AssignedTo = req.AssignedTo
	}

	// Apply partial updates
	if req.FirstName != nil {
		lead.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		lead.LastName = *req.LastName
	}
	if req.CompanyName != nil {
		lead.CompanyName = *req.CompanyName
	}
	if req.Email != nil {
		lead.Email = *req.Email
	}
	if req.Phone != nil {
		lead.Phone = *req.Phone
	}
	if req.JobTitle != nil {
		lead.JobTitle = *req.JobTitle
	}
	if req.Address != nil {
		lead.Address = *req.Address
	}
	if req.City != nil {
		lead.City = *req.City
	}
	if req.Province != nil {
		lead.Province = *req.Province
	}
	if req.ProvinceID != nil {
		lead.ProvinceID = req.ProvinceID
	}
	if req.CityID != nil {
		lead.CityID = req.CityID
	}
	if req.DistrictID != nil {
		lead.DistrictID = req.DistrictID
	}
	if req.VillageName != nil {
		lead.VillageName = *req.VillageName
	}
	if req.Website != nil {
		lead.Website = *req.Website
	}
	if req.EstimatedValue != nil {
		lead.EstimatedValue = *req.EstimatedValue
	}
	if req.Probability != nil {
		lead.Probability = *req.Probability
	}
	if req.BudgetConfirmed != nil {
		lead.BudgetConfirmed = *req.BudgetConfirmed
	}
	if req.BudgetAmount != nil {
		lead.BudgetAmount = *req.BudgetAmount
	}
	if req.AuthConfirmed != nil {
		lead.AuthConfirmed = *req.AuthConfirmed
	}
	if req.AuthPerson != nil {
		lead.AuthPerson = *req.AuthPerson
	}
	if req.NeedConfirmed != nil {
		lead.NeedConfirmed = *req.NeedConfirmed
	}
	if req.NeedDescription != nil {
		lead.NeedDescription = *req.NeedDescription
	}
	if req.TimeConfirmed != nil {
		lead.TimeConfirmed = *req.TimeConfirmed
	}
	if req.TimeExpected != nil && *req.TimeExpected != "" {
		t, err := time.Parse("2006-01-02", *req.TimeExpected)
		if err != nil {
			return dto.LeadResponse{}, errors.New("invalid time_expected format, use YYYY-MM-DD")
		}
		lead.TimeExpected = &t
	}
	if req.Notes != nil {
		lead.Notes = *req.Notes
	}
	if req.NPWP != nil {
		lead.NPWP = *req.NPWP
	}
	if req.Latitude != nil {
		lead.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		lead.Longitude = req.Longitude
	}
	if req.BusinessTypeID != nil {
		lead.BusinessTypeID = req.BusinessTypeID
	}
	if req.AreaID != nil {
		lead.AreaID = req.AreaID
	}
	if req.PaymentTermsID != nil {
		lead.PaymentTermsID = req.PaymentTermsID
	}

	// Recalculate lead score after updates
	lead.LeadScore = lead.CalculateLeadScore()

	// Nil out preloaded associations to prevent GORM BelongsTo FK override
	lead.LeadSource = nil
	lead.LeadStatus = nil
	lead.AssignedEmployee = nil
	lead.Customer = nil
	lead.Contact = nil
	lead.Deal = nil
	lead.BusinessType = nil
	lead.Area = nil
	lead.PaymentTerms = nil
	lead.Activities = nil

	if err := u.leadRepo.Update(ctx, lead); err != nil {
		return dto.LeadResponse{}, fmt.Errorf("failed to update lead: %w", err)
	}

	// Reload with preloaded relations
	updated, err := u.leadRepo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadResponse{}, err
	}

	return mapper.ToLeadResponse(updated), nil
}

func (u *leadUsecase) Delete(ctx context.Context, id string) error {
	lead, err := u.leadRepo.FindByID(ctx, id)
	if err != nil {
		return errors.New("lead not found")
	}

	// Prevent deletion of converted leads
	if lead.ConvertedAt != nil {
		return errors.New("cannot delete a converted lead")
	}

	return u.leadRepo.Delete(ctx, id)
}

// Convert transforms a lead into a deal in the pipeline, updating the lead's conversion fields
func (u *leadUsecase) Convert(ctx context.Context, id string, req dto.ConvertLeadRequest, convertedBy string) (dto.LeadResponse, error) {
	lead, err := u.leadRepo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadResponse{}, errors.New("lead not found")
	}

	// Prevent double conversion
	if lead.ConvertedAt != nil {
		return dto.LeadResponse{}, errors.New("lead already converted")
	}

	// Prevent conversion of lost leads
	if lead.LeadStatus != nil && lead.LeadStatus.Code == "LOST" {
		return dto.LeadResponse{}, errors.New("cannot convert a lost lead")
	}

	// Resolve pipeline stage: use provided stage or default to first stage (order=1)
	var pipelineStageID string
	if req.PipelineStageID != nil && *req.PipelineStageID != "" {
		stage, err := u.pipelineStageRepo.FindByID(ctx, *req.PipelineStageID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("pipeline stage not found")
		}
		pipelineStageID = stage.ID
	} else {
		firstStage, err := u.pipelineStageRepo.FindByOrder(ctx, 1)
		if err != nil {
			return dto.LeadResponse{}, fmt.Errorf("failed to find default pipeline stage: %w", err)
		}
		pipelineStageID = firstStage.ID
	}

	// Build deal title from request or lead data
	dealTitle := req.DealTitle
	if dealTitle == "" {
		if lead.CompanyName != "" {
			dealTitle = lead.CompanyName
		} else {
			dealTitle = lead.FirstName
			if lead.LastName != "" {
				dealTitle += " " + lead.LastName
			}
		}
	}

	// Determine deal value
	dealValue := lead.EstimatedValue
	if req.DealValue != nil {
		dealValue = *req.DealValue
	}

	now := apptime.Now()

	// Create deal from lead data
	newDeal := &models.Deal{
		ID:              uuid.New().String(),
		Title:           dealTitle,
		Status:          models.DealStatusOpen,
		PipelineStageID: pipelineStageID,
		Value:           dealValue,
		Probability:     lead.Probability,
		LeadID:          &lead.ID,
		AssignedTo:      lead.AssignedTo,
		BudgetConfirmed: lead.BudgetConfirmed,
		BudgetAmount:    lead.BudgetAmount,
		AuthConfirmed:   lead.AuthConfirmed,
		AuthPerson:      lead.AuthPerson,
		NeedConfirmed:   lead.NeedConfirmed,
		NeedDescription: lead.NeedDescription,
		TimeConfirmed:   lead.TimeConfirmed,
		// Use the lead's original notes so deal mirrors lead data exactly
		Notes:     lead.Notes,
		CreatedBy: &convertedBy,
	}

	if lead.TimeExpected != nil {
		newDeal.ExpectedCloseDate = lead.TimeExpected
	}

	if err := u.dealRepo.Create(ctx, newDeal); err != nil {
		return dto.LeadResponse{}, fmt.Errorf("failed to create deal from lead: %w", err)
	}

	// Create initial stage history entry so the Information tab is never empty
	initialHistory := &models.DealHistory{
		DealID:        newDeal.ID,
		ToStageID:     pipelineStageID,
		ToProbability: newDeal.Probability,
		ChangedAt:     now,
		Reason:        fmt.Sprintf("Converted from lead %s", lead.Code),
	}
	// best-effort — do not block conversion if history creation fails
	_ = u.dealRepo.CreateHistory(ctx, initialHistory)

	// Copy lead product items to deal product items
	leadProducts, lpErr := u.leadRepo.ListProductItems(ctx, lead.ID)
	if lpErr == nil && len(leadProducts) > 0 {
		dealItems := make([]models.DealProductItem, 0, len(leadProducts))
		for _, lp := range leadProducts {
			item := models.DealProductItem{
				DealID:      newDeal.ID,
				ProductID:   lp.ProductID,
				ProductName: lp.ProductName,
				ProductSKU:  lp.ProductSKU,
				UnitPrice:   lp.UnitPrice,
				Quantity:    lp.Quantity,
				Notes:       lp.Notes,
			}
			item.Subtotal = item.UnitPrice * float64(item.Quantity)
			dealItems = append(dealItems, item)
		}
		// best-effort — do not block conversion if product copy fails
		_ = u.dealRepo.CreateItems(ctx, dealItems)
	}

	// Create a special immutable activity recording the conversion — best-effort, never blocks conversion
	if convertedBy != "" {
		conversionActivity := &models.Activity{
			Type:        "conversion",
			DealID:      &newDeal.ID,
			LeadID:      &lead.ID,
			EmployeeID:  convertedBy,
			Description: fmt.Sprintf("Lead %s (%s %s) dikonversi ke deal pipeline %s", lead.Code, lead.FirstName, lead.LastName, newDeal.Code),
			Timestamp:   now,
		}
		_ = u.activityRepo.Create(ctx, conversionActivity)
	}

	// Update lead with conversion data
	lead.DealID = &newDeal.ID
	lead.ConvertedAt = &now
	lead.ConvertedBy = &convertedBy

	// Set lead status to "Converted"
	convertedStatus, err := u.leadStatusRepo.FindConverted(ctx)
	if err == nil && convertedStatus != nil {
		lead.LeadStatusID = &convertedStatus.ID
		lead.LeadStatus = convertedStatus
	}

	lead.LeadScore = lead.CalculateLeadScore()

	// Nil out preloaded associations to prevent GORM BelongsTo FK override
	lead.LeadSource = nil
	lead.LeadStatus = nil
	lead.AssignedEmployee = nil
	lead.Customer = nil
	lead.Contact = nil
	lead.Deal = nil
	lead.BusinessType = nil
	lead.Area = nil
	lead.PaymentTerms = nil
	lead.Activities = nil

	if err := u.leadRepo.Update(ctx, lead); err != nil {
		return dto.LeadResponse{}, fmt.Errorf("failed to update lead conversion: %w", err)
	}

	// Reload with all preloaded relations
	converted, err := u.leadRepo.FindByID(ctx, lead.ID)
	if err != nil {
		return dto.LeadResponse{}, err
	}

	return mapper.ToLeadResponse(converted), nil
}

// BulkUpsert creates or updates leads in bulk, using email as the deduplication key.
// Designed for automation workflows (e.g., n8n) that scrape leads from external sources.
func (u *leadUsecase) BulkUpsert(ctx context.Context, req dto.BulkUpsertLeadRequest, createdBy string) (*dto.BulkUpsertLeadResponse, error) {
	result := &dto.BulkUpsertLeadResponse{
		Items: make([]dto.LeadResponse, 0, len(req.Leads)),
	}

	// Resolve default status once for all new leads
	var defaultStatusID *string
	defaultStatus, err := u.leadStatusRepo.FindDefault(ctx)
	if err == nil && defaultStatus != nil {
		defaultStatusID = &defaultStatus.ID
	}

	for _, item := range req.Leads {
		// Try to find existing lead by place_id, cid, email, phone, or company_name (deduplication key)
		existing, findErr := u.leadRepo.FindDuplicate(ctx, item.Email, item.Phone, item.CompanyName, item.PlaceID, item.CID)

		typesStr := ""
		if item.Types != nil {
			if s, ok := item.Types.(string); ok {
				typesStr = s
			} else {
				b, _ := json.Marshal(item.Types)
				typesStr = string(b)
			}
		}

		openingHoursStr := ""
		if item.OpeningHours != nil {
			if s, ok := item.OpeningHours.(string); ok {
				openingHoursStr = s
			} else {
				b, _ := json.Marshal(item.OpeningHours)
				openingHoursStr = string(b)
			}
		}

		if findErr == nil && existing != nil {
			// Update existing lead with new data (merge non-empty fields)
			if item.FirstName != "" {
				existing.FirstName = item.FirstName
			}
			if item.LastName != "" {
				existing.LastName = item.LastName
			}
			if item.CompanyName != "" {
				existing.CompanyName = item.CompanyName
			}
			if item.Phone != "" {
				existing.Phone = item.Phone
			}
			if item.JobTitle != "" {
				existing.JobTitle = item.JobTitle
			}
			if item.Address != "" {
				existing.Address = item.Address
			}
			if item.City != "" {
				existing.City = item.City
			}
			if item.Province != "" {
				existing.Province = item.Province
			}
			if item.ProvinceID != nil && *item.ProvinceID != "" {
				existing.ProvinceID = item.ProvinceID
			}
			if item.CityID != nil && *item.CityID != "" {
				existing.CityID = item.CityID
			}
			if item.DistrictID != nil && *item.DistrictID != "" {
				existing.DistrictID = item.DistrictID
			}
			if item.VillageName != "" {
				existing.VillageName = item.VillageName
			}
			if item.EstimatedValue > 0 {
				existing.EstimatedValue = item.EstimatedValue
			}
			if item.LeadSourceID != nil && *item.LeadSourceID != "" {
				existing.LeadSourceID = item.LeadSourceID
			}
			if item.Latitude != nil {
				existing.Latitude = item.Latitude
			}
			if item.Longitude != nil {
				existing.Longitude = item.Longitude
			}
			if item.Rating != nil {
				existing.Rating = item.Rating
			}
			if item.RatingCount != nil {
				existing.RatingCount = item.RatingCount
			}
			if typesStr != "" {
				existing.Types = typesStr
			}
			if openingHoursStr != "" {
				existing.OpeningHours = openingHoursStr
			}
			if item.ThumbnailURL != "" {
				existing.ThumbnailURL = item.ThumbnailURL
			}
			if item.CID != "" {
				existing.CID = item.CID
			}
			if item.PlaceID != "" {
				existing.PlaceID = item.PlaceID
			}
			if item.Website != "" {
				existing.Website = item.Website
			}
			if item.Notes != "" {
				existing.Notes = existing.Notes + "\n---\n" + item.Notes
			}

			existing.LeadScore = existing.CalculateLeadScore()

			if updateErr := u.leadRepo.Update(ctx, existing); updateErr != nil {
				result.Errors++
				continue
			}

			reloaded, reloadErr := u.leadRepo.FindByID(ctx, existing.ID)
			if reloadErr != nil {
				result.Errors++
				continue
			}

			result.Updated++
			result.Items = append(result.Items, mapper.ToLeadResponse(reloaded))
		} else {
			// Create new lead
			lead := &models.Lead{
				ID:             uuid.New().String(),
				FirstName:      item.FirstName,
				LastName:       item.LastName,
				CompanyName:    item.CompanyName,
				Email:          item.Email,
				Phone:          item.Phone,
				JobTitle:       item.JobTitle,
				Address:        item.Address,
				City:           item.City,
				Province:       item.Province,
				ProvinceID:     item.ProvinceID,
				CityID:         item.CityID,
				DistrictID:     item.DistrictID,
				VillageName:    item.VillageName,
				LeadSourceID:   item.LeadSourceID,
				LeadStatusID:   defaultStatusID,
				EstimatedValue: item.EstimatedValue,
				Latitude:       item.Latitude,
				Longitude:      item.Longitude,
				Rating:         item.Rating,
				RatingCount:    item.RatingCount,
				Types:          typesStr,
				OpeningHours:   openingHoursStr,
				ThumbnailURL:   item.ThumbnailURL,
				CID:            item.CID,
				PlaceID:        item.PlaceID,
				Website:        item.Website,
				Notes:          item.Notes,
				CreatedBy:      &createdBy,
			}

			// Load status for score calculation
			if defaultStatusID != nil && defaultStatus != nil {
				lead.LeadStatus = defaultStatus
			}
			lead.LeadScore = lead.CalculateLeadScore()

			if createErr := u.leadRepo.Create(ctx, lead); createErr != nil {
				fmt.Printf("Error creating new lead %s - %s: %v\n", lead.CompanyName, lead.FirstName, createErr)
				result.Errors++
				continue
			}

			reloaded, reloadErr := u.leadRepo.FindByID(ctx, lead.ID)
			if reloadErr != nil {
				result.Errors++
				continue
			}

			result.Created++
			result.Items = append(result.Items, mapper.ToLeadResponse(reloaded))
		}
	}

	return result, nil
}

func (u *leadUsecase) GetFormData(ctx context.Context) (*dto.LeadFormDataResponse, error) {
	// Fetch employees for assignment dropdown
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}

	employeeOptions := make([]dto.LeadEmployeeOption, 0, len(employees))
	for _, emp := range employees {
		empID, err := uuid.Parse(emp.ID)
		if err != nil {
			continue
		}
		employeeOptions = append(employeeOptions, dto.LeadEmployeeOption{
			ID:           empID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	// Fetch lead sources
	sources, _, err := u.leadSourceRepo.List(ctx, repositories.ListParams{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch lead sources: %w", err)
	}

	sourceOptions := make([]dto.LeadSourceOption, 0, len(sources))
	for _, s := range sources {
		sourceOptions = append(sourceOptions, dto.LeadSourceOption{
			ID:   s.ID,
			Name: s.Name,
			Code: s.Code,
		})
	}

	// Fetch lead statuses
	statuses, _, err := u.leadStatusRepo.List(ctx, repositories.ListParams{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch lead statuses: %w", err)
	}

	statusOptions := make([]dto.LeadStatusOption, 0, len(statuses))
	for _, s := range statuses {
		statusOptions = append(statusOptions, dto.LeadStatusOption{
			ID:          s.ID,
			Name:        s.Name,
			Code:        s.Code,
			Color:       s.Color,
			IsDefault:   s.IsDefault,
			IsConverted: s.IsConverted,
		})
	}

	// Fetch pipeline stages for conversion dropdown
	stages, _, err := u.pipelineStageRepo.List(ctx, repositories.ListParams{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pipeline stages: %w", err)
	}

	stageOptions := make([]dto.LeadPipelineStageOption, 0, len(stages))
	for _, s := range stages {
		stageOptions = append(stageOptions, dto.LeadPipelineStageOption{
			ID:          s.ID,
			Name:        s.Name,
			Code:        s.Code,
			Order:       s.Order,
			Probability: s.Probability,
		})
	}

	// Fetch business types
	businessTypes, _, err := u.businessTypeRepo.List(ctx, &orgDto.ListBusinessTypesRequest{PerPage: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch business types: %w", err)
	}

	businessTypeOptions := make([]dto.LeadBusinessTypeOption, 0, len(businessTypes))
	for _, bt := range businessTypes {
		businessTypeOptions = append(businessTypeOptions, dto.LeadBusinessTypeOption{
			ID:   bt.ID,
			Name: bt.Name,
		})
	}

	// Fetch areas
	areas, _, err := u.areaRepo.List(ctx, &orgDto.ListAreasRequest{PerPage: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch areas: %w", err)
	}

	areaOptions := make([]dto.LeadAreaOption, 0, len(areas))
	for _, a := range areas {
		areaOptions = append(areaOptions, dto.LeadAreaOption{
			ID:       a.ID,
			Name:     a.Name,
			Province: a.Province,
		})
	}

	// Fetch payment terms
	paymentTermsList, _, err := u.paymentTermsRepo.List(ctx, coreRepos.ListParams{Limit: 100})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch payment terms: %w", err)
	}

	paymentTermsOptions := make([]dto.LeadPaymentTermsOption, 0, len(paymentTermsList))
	for _, pt := range paymentTermsList {
		paymentTermsOptions = append(paymentTermsOptions, dto.LeadPaymentTermsOption{
			ID:   pt.ID,
			Name: pt.Name,
			Code: pt.Code,
			Days: pt.Days,
		})
	}

	return &dto.LeadFormDataResponse{
		Employees:      employeeOptions,
		LeadSources:    sourceOptions,
		LeadStatuses:   statusOptions,
		PipelineStages: stageOptions,
		BusinessTypes:  businessTypeOptions,
		Areas:          areaOptions,
		PaymentTerms:   paymentTermsOptions,
	}, nil
}

func (u *leadUsecase) GetAnalytics(ctx context.Context) (*repositories.LeadAnalytics, error) {
	return u.leadRepo.GetAnalytics(ctx)
}

func (u *leadUsecase) GetProductItems(ctx context.Context, leadID string) ([]dto.LeadProductItemResponse, error) {
	items, err := u.leadRepo.ListProductItems(ctx, leadID)
	if err != nil {
		return nil, err
	}
	result := make([]dto.LeadProductItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, dto.LeadProductItemResponse{
			ID:                  item.ID,
			LeadID:              item.LeadID,
			ProductID:           item.ProductID,
			ProductName:         item.ProductName,
			ProductSKU:          item.ProductSKU,
			InterestLevel:       item.InterestLevel,
			Quantity:            item.Quantity,
			UnitPrice:           item.UnitPrice,
			Notes:               item.Notes,
			SourceVisitReportID: item.SourceVisitReportID,
			LastSurveyAnswers:   item.LastSurveyAnswers,
			IsDeleted:           item.DeletedAt.Valid,
			CreatedAt:           item.CreatedAt.Format("2006-01-02T15:04:05+07:00"),
		})
	}
	return result, nil
}
