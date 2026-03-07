package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	geoRepos "github.com/gilabs/gims/api/internal/geographic/data/repositories"
	geoDto "github.com/gilabs/gims/api/internal/geographic/domain/dto"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
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
}

type leadUsecase struct {
	leadRepo       repositories.LeadRepository
	leadStatusRepo repositories.LeadStatusRepository
	leadSourceRepo repositories.LeadSourceRepository
	customerRepo   customerRepos.CustomerRepository
	contactRepo    repositories.ContactRepository
	employeeRepo   orgRepos.EmployeeRepository
	provinceRepo   geoRepos.ProvinceRepository
	cityRepo       geoRepos.CityRepository
	districtRepo   geoRepos.DistrictRepository
}

// NewLeadUsecase creates a new lead usecase
func NewLeadUsecase(
	leadRepo repositories.LeadRepository,
	leadStatusRepo repositories.LeadStatusRepository,
	leadSourceRepo repositories.LeadSourceRepository,
	customerRepo customerRepos.CustomerRepository,
	contactRepo repositories.ContactRepository,
	employeeRepo orgRepos.EmployeeRepository,
	provinceRepo geoRepos.ProvinceRepository,
	cityRepo geoRepos.CityRepository,
	districtRepo geoRepos.DistrictRepository,
) LeadUsecase {
	return &leadUsecase{
		leadRepo:       leadRepo,
		leadStatusRepo: leadStatusRepo,
		leadSourceRepo: leadSourceRepo,
		customerRepo:   customerRepo,
		contactRepo:    contactRepo,
		employeeRepo:   employeeRepo,
		provinceRepo:   provinceRepo,
		cityRepo:       cityRepo,
		districtRepo:   districtRepo,
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

	// Recalculate lead score after updates
	lead.LeadScore = lead.CalculateLeadScore()

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

// Convert transforms a lead into a customer + contact, updating the lead's conversion fields
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

	now := apptime.Now()
	var customerID string

	if req.CustomerID != nil && *req.CustomerID != "" {
		// Link to existing customer
		customer, err := u.customerRepo.FindByID(ctx, *req.CustomerID)
		if err != nil {
			return dto.LeadResponse{}, errors.New("customer not found")
		}
		customerID = customer.ID
	} else {
		// Create a new customer from lead data
		nextCode, err := u.customerRepo.GetNextCode(ctx)
		if err != nil {
			return dto.LeadResponse{}, fmt.Errorf("failed to generate customer code: %w", err)
		}

		customerName := lead.FirstName
		if lead.LastName != "" {
			customerName += " " + lead.LastName
		}
		if lead.CompanyName != "" {
			customerName = lead.CompanyName
		}

		// Contact person is always the individual name (even when name = company name)
		cpName := lead.FirstName
		if lead.LastName != "" {
			cpName += " " + lead.LastName
		}

		var villageName *string
		if lead.VillageName != "" {
			villageName = &lead.VillageName
		}

		// Resolve geographic IDs when only textual names exist on the lead
		resolvedProvinceID := lead.ProvinceID
		resolvedCityID := lead.CityID
		resolvedDistrictID := lead.DistrictID

		// Try to resolve province by name if ID missing
		if (resolvedProvinceID == nil || *resolvedProvinceID == "") && lead.Province != "" {
			provs, _, err := u.provinceRepo.List(ctx, &geoDto.ListProvincesRequest{Search: lead.Province, PerPage: 1})
			if err == nil && len(provs) > 0 {
				id := provs[0].ID
				resolvedProvinceID = &id
			}
		}

		// Try to resolve city by name if ID missing (prefer filtering by province if available)
		if (resolvedCityID == nil || *resolvedCityID == "") && lead.City != "" {
			provinceFilter := ""
			if resolvedProvinceID != nil {
				provinceFilter = *resolvedProvinceID
			}
			cities, _, err := u.cityRepo.List(ctx, &geoDto.ListCitiesRequest{Search: lead.City, ProvinceID: provinceFilter, PerPage: 1})
			if err == nil && len(cities) > 0 {
				id := cities[0].ID
				resolvedCityID = &id
			}
		}

		// District resolution is skipped — lead currently stores DistrictID, not a textual district name.
		// If future leads include district text, we can resolve similarly via u.districtRepo.List().

		newCustomer := &customerModels.Customer{
			ID:            uuid.New().String(),
			Code:          nextCode,
			Name:          customerName,
			ContactPerson: cpName,
			Address:       lead.Address,
			Email:         lead.Email,
			Website:       lead.Website,
			NPWP:          lead.NPWP,
			ProvinceID:    resolvedProvinceID,
			CityID:        resolvedCityID,
			DistrictID:    resolvedDistrictID,
			VillageName:   villageName,
			Latitude:      lead.Latitude,
			Longitude:     lead.Longitude,
			Notes:         fmt.Sprintf("Converted from lead %s. %s", lead.Code, req.Notes),
			CreatedBy:     &convertedBy,
			IsActive:      true,
		}

		if err := u.customerRepo.Create(ctx, newCustomer); err != nil {
			return dto.LeadResponse{}, fmt.Errorf("failed to create customer from lead: %w", err)
		}
		customerID = newCustomer.ID

		// Create primary phone number record if the lead has a phone
		if lead.Phone != "" {
			phone := &customerModels.CustomerPhoneNumber{
				CustomerID:  customerID,
				PhoneNumber: lead.Phone,
				Label:       "Primary",
				IsPrimary:   true,
			}
			// Non-fatal — log and continue if phone creation fails
			if err := u.customerRepo.CreatePhoneNumber(ctx, phone); err != nil {
				_ = fmt.Errorf("warn: failed to create phone number during lead conversion: %w", err)
			}
		}
	}

	// Create contact under the customer
	contactName := lead.FirstName
	if lead.LastName != "" {
		contactName += " " + lead.LastName
	}

	newContact := &models.Contact{
		ID:         uuid.New().String(),
		CustomerID: customerID,
		Name:       contactName,
		Phone:      lead.Phone,
		Email:      lead.Email,
		Position:   lead.JobTitle,
		Notes:      fmt.Sprintf("Auto-created from lead conversion (%s)", lead.Code),
		IsActive:   true,
	}

	if err := u.contactRepo.Create(ctx, newContact); err != nil {
		return dto.LeadResponse{}, fmt.Errorf("failed to create contact from lead: %w", err)
	}

	// Update lead with conversion data
	lead.CustomerID = &customerID
	lead.ContactID = &newContact.ID
	lead.ConvertedAt = &now
	lead.ConvertedBy = &convertedBy

	// Set lead status to "Converted"
	convertedStatus, err := u.leadStatusRepo.FindConverted(ctx)
	if err == nil && convertedStatus != nil {
		lead.LeadStatusID = &convertedStatus.ID
		lead.LeadStatus = convertedStatus
	}

	lead.LeadScore = lead.CalculateLeadScore()

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

	// Fetch customers for conversion dropdown
	customers, _, err := u.customerRepo.List(ctx, customerRepos.CustomerListParams{
		ListParams: customerRepos.ListParams{
			Limit: 500,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customers: %w", err)
	}

	customerOptions := make([]dto.LeadCustomerOption, 0, len(customers))
	for _, c := range customers {
		customerOptions = append(customerOptions, dto.LeadCustomerOption{
			ID:   c.ID,
			Code: c.Code,
			Name: c.Name,
		})
	}

	return &dto.LeadFormDataResponse{
		Employees:    employeeOptions,
		LeadSources:  sourceOptions,
		LeadStatuses: statusOptions,
		Customers:    customerOptions,
	}, nil
}

func (u *leadUsecase) GetAnalytics(ctx context.Context) (*repositories.LeadAnalytics, error) {
	return u.leadRepo.GetAnalytics(ctx)
}
