package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	customerRepos "github.com/gilabs/gims/api/internal/customer/data/repositories"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	"github.com/google/uuid"
)

// Visit report error codes
var (
	ErrVisitReportNotFound            = errors.New("VISIT_NOT_FOUND")
	ErrVisitReportNotDraft            = errors.New("VISIT_NOT_DRAFT")
	ErrVisitReportAlreadyCheckedIn    = errors.New("VISIT_ALREADY_CHECKED_IN")
	ErrVisitReportNotCheckedIn        = errors.New("VISIT_NOT_CHECKED_IN")
	ErrVisitReportCannotApproveOwn    = errors.New("VISIT_CANNOT_APPROVE_OWN")
	ErrVisitReportRejectionRequired   = errors.New("VISIT_REJECTION_REASON_REQUIRED")
	ErrVisitReportMaxPhotosExceeded   = errors.New("VISIT_MAX_PHOTOS_EXCEEDED")
	ErrVisitReportNotSubmitted        = errors.New("VISIT_NOT_SUBMITTED")
	ErrVisitReportImmutable           = errors.New("VISIT_APPROVED_IMMUTABLE")
)

const maxPhotosPerVisit = 5

// visitActivityTypeID is the fixed UUID for the "Visit" activity type from the CRM seeder
const visitActivityTypeID = "ce000001-0000-0000-0000-000000000001"

// VisitActivityMetadata defines the JSONB metadata structure for visit activities
type VisitActivityMetadata struct {
	VisitCode     string                    `json:"visit_code"`
	Purpose       string                    `json:"purpose"`
	Outcome       string                    `json:"outcome"`
	Result        string                    `json:"result"`
	Photos        []string                  `json:"photos"`
	CheckInAt     *string                   `json:"check_in_at,omitempty"`
	CheckOutAt    *string                   `json:"check_out_at,omitempty"`
	CheckInLat    *float64                  `json:"check_in_lat,omitempty"`
	CheckInLng    *float64                  `json:"check_in_lng,omitempty"`
	CheckOutLat   *float64                  `json:"check_out_lat,omitempty"`
	CheckOutLng   *float64                  `json:"check_out_lng,omitempty"`
	Address       string                    `json:"address"`
	ContactPerson string                    `json:"contact_person"`
	Products      []VisitActivityProductInfo `json:"products,omitempty"`
}

// VisitActivityProductInfo holds product interest data embedded in activity metadata
type VisitActivityProductInfo struct {
	ProductName   string `json:"product_name"`
	ProductSKU    string `json:"product_sku,omitempty"`
	InterestLevel int    `json:"interest_level"`
	Quantity      int    `json:"quantity,omitempty"`
	Notes         string `json:"notes,omitempty"`
}

// VisitReportUsecase defines the interface for visit report business logic
type VisitReportUsecase interface {
	List(ctx context.Context, req *dto.ListVisitReportsRequest) ([]dto.VisitReportResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.VisitReportResponse, error)
	Create(ctx context.Context, req *dto.CreateVisitReportRequest, createdBy *string) (*dto.VisitReportResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateVisitReportRequest) (*dto.VisitReportResponse, error)
	Delete(ctx context.Context, id string) error
	CheckIn(ctx context.Context, id string, req *dto.CheckInVisitRequest, userID *string) (*dto.VisitReportResponse, error)
	CheckOut(ctx context.Context, id string, req *dto.CheckOutVisitRequest, userID *string) (*dto.VisitReportResponse, error)
	Submit(ctx context.Context, id string, req *dto.SubmitVisitReportRequest, userID *string) (*dto.VisitReportResponse, error)
	Approve(ctx context.Context, id string, req *dto.ApproveVisitReportRequest, userID *string) (*dto.VisitReportResponse, error)
	Reject(ctx context.Context, id string, req *dto.RejectVisitReportRequest, userID *string) (*dto.VisitReportResponse, error)
	UploadPhotos(ctx context.Context, id string, photoURLs []string) (*dto.VisitReportResponse, error)
	GetFormData(ctx context.Context) (*dto.VisitReportFormDataResponse, error)
	ListProgressHistory(ctx context.Context, visitReportID string, page, perPage int) ([]dto.VisitReportProgressHistoryResponse, *utils.PaginationResult, error)
	// ListByEmployee returns per-employee visit report summary metrics for team-level views.
	ListByEmployee(ctx context.Context, req *dto.ListByEmployeeRequest) ([]dto.VisitReportEmployeeSummary, *utils.PaginationResult, error)
}

type visitReportUsecase struct {
	visitRepo    repositories.VisitReportRepository
	activityRepo repositories.ActivityRepository
	customerRepo customerRepos.CustomerRepository
	contactRepo  repositories.ContactRepository
	employeeRepo orgRepos.EmployeeRepository
	dealRepo     repositories.DealRepository
	leadRepo     repositories.LeadRepository
	productRepo  productRepos.ProductRepository
}

// NewVisitReportUsecase creates a new visit report usecase
func NewVisitReportUsecase(
	visitRepo repositories.VisitReportRepository,
	activityRepo repositories.ActivityRepository,
	customerRepo customerRepos.CustomerRepository,
	contactRepo repositories.ContactRepository,
	employeeRepo orgRepos.EmployeeRepository,
	dealRepo repositories.DealRepository,
	leadRepo repositories.LeadRepository,
	productRepo productRepos.ProductRepository,
) VisitReportUsecase {
	return &visitReportUsecase{
		visitRepo:    visitRepo,
		activityRepo: activityRepo,
		customerRepo: customerRepo,
		contactRepo:  contactRepo,
		employeeRepo: employeeRepo,
		dealRepo:     dealRepo,
		leadRepo:     leadRepo,
		productRepo:  productRepo,
	}
}

func (u *visitReportUsecase) List(ctx context.Context, req *dto.ListVisitReportsRequest) ([]dto.VisitReportResponse, *utils.PaginationResult, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	params := &repositories.VisitReportListParams{
		Search:     req.Search,
		SortBy:     req.SortBy,
		SortDir:    req.SortDir,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
		Status:     req.Status,
		CustomerID: req.CustomerID,
		EmployeeID: req.EmployeeID,
		ContactID:  req.ContactID,
		DealID:     req.DealID,
		LeadID:     req.LeadID,
		Outcome:    req.Outcome,
		DateFrom:   req.DateFrom,
		DateTo:     req.DateTo,
	}

	reports, total, err := u.visitRepo.List(ctx, params)
	if err != nil {
		return nil, nil, err
	}

	responses := mapper.MapVisitReportsToResponse(reports)
	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *visitReportUsecase) GetByID(ctx context.Context, id string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}
	return mapper.MapVisitReportToResponse(report), nil
}

func (u *visitReportUsecase) Create(ctx context.Context, req *dto.CreateVisitReportRequest, createdBy *string) (*dto.VisitReportResponse, error) {
	visitDate, err := time.Parse("2006-01-02", req.VisitDate)
	if err != nil {
		return nil, errors.New("invalid visit_date format, expected YYYY-MM-DD")
	}

	code, err := u.visitRepo.GetNextCode(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate visit code: %w", err)
	}

	report := &models.VisitReport{
		Code:          code,
		VisitDate:     visitDate,
		EmployeeID:    req.EmployeeID,
		CustomerID:    req.CustomerID,
		ContactID:     req.ContactID,
		DealID:        req.DealID,
		LeadID:        req.LeadID,
		ContactPerson: req.ContactPerson,
		ContactPhone:  req.ContactPhone,
		Address:       req.Address,
		VillageID:     req.VillageID,
		Purpose:       req.Purpose,
		Notes:         req.Notes,
		Status:        models.VisitReportStatusDraft,
		CreatedBy:     createdBy,
	}

	if req.ScheduledTime != nil && *req.ScheduledTime != "" {
		// Parse scheduled time in application timezone so it is anchored to company/app TZ
		scheduledTime, err := time.ParseInLocation("15:04", *req.ScheduledTime, apptime.Location())
		if err == nil {
			report.ScheduledTime = &scheduledTime
		}
	}

	// Build details with interest scoring
	if len(req.Details) > 0 {
		optionScoreMap := u.buildOptionScoreMap(ctx)
		report.Details = make([]models.VisitReportDetail, len(req.Details))
		for i, detailReq := range req.Details {
			interestLevel, answers := u.processInterestAnswers(detailReq, optionScoreMap)
			report.Details[i] = models.VisitReportDetail{
				ProductID:     detailReq.ProductID,
				InterestLevel: interestLevel,
				Notes:         detailReq.Notes,
				Quantity:      detailReq.Quantity,
				Price:         detailReq.Price,
				Answers:       answers,
			}
		}
	}

	if err := u.visitRepo.Create(ctx, report); err != nil {
		return nil, err
	}

	created, err := u.visitRepo.FindByID(ctx, report.ID)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(created), nil
}

func (u *visitReportUsecase) Update(ctx context.Context, id string, req *dto.UpdateVisitReportRequest) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	// Only draft or rejected visits can be edited
	if report.Status != models.VisitReportStatusDraft && report.Status != models.VisitReportStatusRejected {
		return nil, ErrVisitReportNotDraft
	}

	// Apply updates
	if req.VisitDate != nil {
		visitDate, err := time.Parse("2006-01-02", *req.VisitDate)
		if err == nil {
			report.VisitDate = visitDate
		}
	}
	if req.ScheduledTime != nil {
		// Parse scheduled time in application timezone so edits preserve FE-provided wall clock
		scheduledTime, err := time.ParseInLocation("15:04", *req.ScheduledTime, apptime.Location())
		if err == nil {
			report.ScheduledTime = &scheduledTime
		}
	}
	if req.EmployeeID != nil {
		report.EmployeeID = *req.EmployeeID
	}
	if req.CustomerID != nil {
		report.CustomerID = req.CustomerID
	}
	if req.ContactID != nil {
		report.ContactID = req.ContactID
	}
	if req.DealID != nil {
		report.DealID = req.DealID
	}
	if req.LeadID != nil {
		report.LeadID = req.LeadID
	}
	if req.ContactPerson != nil {
		report.ContactPerson = *req.ContactPerson
	}
	if req.ContactPhone != nil {
		report.ContactPhone = *req.ContactPhone
	}
	if req.Address != nil {
		report.Address = *req.Address
	}
	if req.VillageID != nil {
		report.VillageID = req.VillageID
	}
	if req.Purpose != nil {
		report.Purpose = *req.Purpose
	}
	if req.Notes != nil {
		report.Notes = *req.Notes
	}
	if req.Result != nil {
		report.Result = *req.Result
	}
	if req.Outcome != nil {
		report.Outcome = *req.Outcome
	}
	if req.NextSteps != nil {
		report.NextSteps = *req.NextSteps
	}

	// If rejected, reset to draft on edit
	if report.Status == models.VisitReportStatusRejected {
		report.Status = models.VisitReportStatusDraft
	}

	// Replace details if provided
	if req.Details != nil {
		optionScoreMap := u.buildOptionScoreMap(ctx)
		report.Details = make([]models.VisitReportDetail, len(*req.Details))
		for i, detailReq := range *req.Details {
			interestLevel, answers := u.processInterestAnswers(detailReq, optionScoreMap)
			report.Details[i] = models.VisitReportDetail{
				ProductID:     detailReq.ProductID,
				InterestLevel: interestLevel,
				Notes:         detailReq.Notes,
				Quantity:      detailReq.Quantity,
				Price:         detailReq.Price,
				Answers:       answers,
			}
		}
	}

	if err := u.visitRepo.Update(ctx, report); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) Delete(ctx context.Context, id string) error {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return ErrVisitReportNotFound
	}

	// Only draft visits can be deleted
	if report.Status != models.VisitReportStatusDraft {
		return ErrVisitReportNotDraft
	}

	return u.visitRepo.Delete(ctx, id)
}

func (u *visitReportUsecase) CheckIn(ctx context.Context, id string, req *dto.CheckInVisitRequest, userID *string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	// CheckIn can only happen once
	if report.CheckInAt != nil {
		return nil, ErrVisitReportAlreadyCheckedIn
	}

	// Build GPS location JSONB
	location := buildLocationJSON(req.Latitude, req.Longitude, req.Accuracy)
	checkInAt := apptime.Now()

	if err := u.visitRepo.CheckIn(ctx, id, location, checkInAt); err != nil {
		return nil, err
	}

	// Log progress
	history := &models.VisitReportProgressHistory{
		VisitReportID: id,
		FromStatus:    report.Status,
		ToStatus:      report.Status,
		Notes:         "Checked in",
		ChangedBy:     userID,
		CreatedAt:     checkInAt,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) CheckOut(ctx context.Context, id string, req *dto.CheckOutVisitRequest, userID *string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	// Must be checked in first
	if report.CheckInAt == nil {
		return nil, ErrVisitReportNotCheckedIn
	}

	// Cannot check out if already checked out
	if report.CheckOutAt != nil {
		return nil, ErrVisitReportAlreadyCheckedIn
	}

	location := buildLocationJSON(req.Latitude, req.Longitude, req.Accuracy)
	checkOutAt := apptime.Now()

	if err := u.visitRepo.CheckOut(ctx, id, location, checkOutAt); err != nil {
		return nil, err
	}

	// Log progress
	history := &models.VisitReportProgressHistory{
		VisitReportID: id,
		FromStatus:    report.Status,
		ToStatus:      report.Status,
		Notes:         "Checked out",
		ChangedBy:     userID,
		CreatedAt:     checkOutAt,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) Submit(ctx context.Context, id string, req *dto.SubmitVisitReportRequest, userID *string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	if report.Status != models.VisitReportStatusDraft && report.Status != models.VisitReportStatusRejected {
		return nil, ErrVisitReportNotDraft
	}

	oldStatus := report.Status
	if err := u.visitRepo.UpdateStatus(ctx, id, models.VisitReportStatusSubmitted); err != nil {
		return nil, err
	}

	history := &models.VisitReportProgressHistory{
		VisitReportID: id,
		FromStatus:    oldStatus,
		ToStatus:      models.VisitReportStatusSubmitted,
		Notes:         fmt.Sprintf("Submitted for approval. %s", req.Notes),
		ChangedBy:     userID,
		CreatedAt:     apptime.Now(),
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	// Auto-create activity on submit
	u.autoCreateVisitActivity(ctx, id)

	// Sync product interests to the associated lead
	u.syncProductItemsToLead(ctx, id)

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) Approve(ctx context.Context, id string, req *dto.ApproveVisitReportRequest, userID *string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	if report.Status != models.VisitReportStatusSubmitted {
		return nil, ErrVisitReportNotSubmitted
	}

	// Cannot approve own visit report
	if userID != nil && report.CreatedBy != nil && *userID == *report.CreatedBy {
		return nil, ErrVisitReportCannotApproveOwn
	}

	now := apptime.Now()
	if err := u.visitRepo.UpdateStatus(ctx, id, models.VisitReportStatusApproved); err != nil {
		return nil, err
	}

	// Update approval metadata directly
	report.ApprovedBy = userID
	report.ApprovedAt = &now
	report.Status = models.VisitReportStatusApproved
	if err := u.visitRepo.Update(ctx, report); err != nil {
		return nil, err
	}

	history := &models.VisitReportProgressHistory{
		VisitReportID: id,
		FromStatus:    models.VisitReportStatusSubmitted,
		ToStatus:      models.VisitReportStatusApproved,
		Notes:         fmt.Sprintf("Approved. %s", req.Notes),
		ChangedBy:     userID,
		CreatedAt:     now,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) Reject(ctx context.Context, id string, req *dto.RejectVisitReportRequest, userID *string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	if report.Status != models.VisitReportStatusSubmitted {
		return nil, ErrVisitReportNotSubmitted
	}

	if req.Reason == "" {
		return nil, ErrVisitReportRejectionRequired
	}

	now := apptime.Now()
	if err := u.visitRepo.UpdateStatus(ctx, id, models.VisitReportStatusRejected); err != nil {
		return nil, err
	}

	// Update rejection metadata
	report.RejectedBy = userID
	report.RejectedAt = &now
	report.RejectionReason = req.Reason
	report.Status = models.VisitReportStatusRejected
	if err := u.visitRepo.Update(ctx, report); err != nil {
		return nil, err
	}

	history := &models.VisitReportProgressHistory{
		VisitReportID: id,
		FromStatus:    models.VisitReportStatusSubmitted,
		ToStatus:      models.VisitReportStatusRejected,
		Notes:         fmt.Sprintf("Rejected: %s. %s", req.Reason, req.Notes),
		ChangedBy:     userID,
		CreatedAt:     now,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) UploadPhotos(ctx context.Context, id string, photoURLs []string) (*dto.VisitReportResponse, error) {
	report, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrVisitReportNotFound
	}

	// Approved visits are immutable
	if report.Status == models.VisitReportStatusApproved {
		return nil, ErrVisitReportImmutable
	}

	// Merge existing photos with new ones
	var existingPhotos []string
	if report.Photos != nil {
		_ = json.Unmarshal([]byte(*report.Photos), &existingPhotos)
	}

	allPhotos := append(existingPhotos, photoURLs...)
	if len(allPhotos) > maxPhotosPerVisit {
		return nil, ErrVisitReportMaxPhotosExceeded
	}

	photosJSON, err := json.Marshal(allPhotos)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal photos: %w", err)
	}

	photosStr := string(photosJSON)
	if err := u.visitRepo.UpdatePhotos(ctx, id, photosStr); err != nil {
		return nil, err
	}

	updated, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapVisitReportToResponse(updated), nil
}

func (u *visitReportUsecase) GetFormData(ctx context.Context) (*dto.VisitReportFormDataResponse, error) {
	// Customers
	customers, _, err := u.customerRepo.List(ctx, customerRepos.CustomerListParams{
		ListParams: customerRepos.ListParams{Limit: 500},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customers: %w", err)
	}
	customerOptions := make([]dto.VisitFormDataCustomer, 0, len(customers))
	for _, c := range customers {
		customerOptions = append(customerOptions, dto.VisitFormDataCustomer{
			ID:   c.ID,
			Name: c.Name,
		})
	}

	// Contacts
	contacts, _, err := u.contactRepo.List(ctx, repositories.ContactListParams{ListParams: repositories.ListParams{Limit: 500}})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch contacts: %w", err)
	}
	contactOptions := make([]dto.VisitFormDataContact, 0, len(contacts))
	for _, c := range contacts {
		contactOptions = append(contactOptions, dto.VisitFormDataContact{
			ID:         c.ID,
			Name:       c.Name,
			CustomerID: c.CustomerID,
		})
	}

	// Employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}
	employeeOptions := make([]dto.VisitFormDataEmployee, 0, len(employees))
	for _, emp := range employees {
		if _, err := uuid.Parse(emp.ID); err != nil {
			continue
		}
		employeeOptions = append(employeeOptions, dto.VisitFormDataEmployee{
			ID:           emp.ID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	// Deals (open only)
	deals, _, err := u.dealRepo.List(ctx, repositories.DealListParams{
		Limit:  500,
		Status: "open",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch deals: %w", err)
	}
	dealOptions := make([]dto.VisitFormDataDeal, 0, len(deals))
	for _, d := range deals {
		dealOptions = append(dealOptions, dto.VisitFormDataDeal{
			ID:    d.ID,
			Code:  d.Code,
			Title: d.Title,
		})
	}

	// Leads
	leads, _, err := u.leadRepo.List(ctx, repositories.LeadListParams{Limit: 500})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leads: %w", err)
	}
	leadOptions := make([]dto.VisitFormDataLead, 0, len(leads))
	for _, l := range leads {
		leadOptions = append(leadOptions, dto.VisitFormDataLead{
			ID:        l.ID,
			Code:      l.Code,
			FirstName: l.FirstName,
			LastName:  l.LastName,
		})
	}

	// Products — use "approved" status to match the product lifecycle (draft → pending → approved)
	products, _, err := u.productRepo.List(ctx, productRepos.ProductListParams{
		ListParams: productRepos.ListParams{Limit: 500},
		Status:     "approved",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch products: %w", err)
	}
	productOptions := make([]dto.VisitFormDataProduct, 0, len(products))
	for _, p := range products {
		productOptions = append(productOptions, dto.VisitFormDataProduct{
			ID:           p.ID,
			Code:         p.Code,
			Name:         p.Name,
			SellingPrice: p.SellingPrice,
		})
	}

	// Interest questions
	questions, err := u.visitRepo.ListInterestQuestions(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch interest questions: %w", err)
	}
	questionResponses := mapper.MapInterestQuestionsToResponse(questions)

	// Enum options
	outcomes := []dto.VisitFormDataOption{
		{Value: "positive", Label: "Positive"},
		{Value: "neutral", Label: "Neutral"},
		{Value: "negative", Label: "Negative"},
		{Value: "very_positive", Label: "Very Positive"},
	}

	statuses := []dto.VisitFormDataOption{
		{Value: "draft", Label: "Draft"},
		{Value: "submitted", Label: "Submitted"},
		{Value: "approved", Label: "Approved"},
		{Value: "rejected", Label: "Rejected"},
	}

	return &dto.VisitReportFormDataResponse{
		Customers:         customerOptions,
		Contacts:          contactOptions,
		Employees:         employeeOptions,
		Deals:             dealOptions,
		Leads:             leadOptions,
		Products:          productOptions,
		InterestQuestions: questionResponses,
		Outcomes:          outcomes,
		Statuses:          statuses,
	}, nil
}

func (u *visitReportUsecase) ListProgressHistory(ctx context.Context, visitReportID string, page, perPage int) ([]dto.VisitReportProgressHistoryResponse, *utils.PaginationResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	history, total, err := u.visitRepo.ListProgressHistory(ctx, visitReportID, perPage, (page-1)*perPage)
	if err != nil {
		return nil, nil, err
	}

	responses := mapper.MapVisitReportProgressHistoryListToResponse(history)
	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

// buildOptionScoreMap fetches interest questions and maps optionID -> score
func (u *visitReportUsecase) buildOptionScoreMap(ctx context.Context) map[string]int {
	optionScoreMap := make(map[string]int)
	questions, err := u.visitRepo.ListInterestQuestions(ctx)
	if err != nil {
		return optionScoreMap
	}
	for _, q := range questions {
		for _, o := range q.Options {
			optionScoreMap[o.ID] = o.Score
		}
	}
	return optionScoreMap
}

// processInterestAnswers calculates interest level from survey answers
func (u *visitReportUsecase) processInterestAnswers(
	detailReq dto.CreateVisitReportDetailRequest,
	optionScoreMap map[string]int,
) (int, []models.VisitReportInterestAnswer) {
	interestLevel := detailReq.InterestLevel
	var answers []models.VisitReportInterestAnswer

	if len(detailReq.Answers) > 0 {
		calculatedScore := 0
		answers = make([]models.VisitReportInterestAnswer, len(detailReq.Answers))
		for j, ansReq := range detailReq.Answers {
			score := optionScoreMap[ansReq.OptionID]
			calculatedScore += score
			answers[j] = models.VisitReportInterestAnswer{
				QuestionID: ansReq.QuestionID,
				OptionID:   ansReq.OptionID,
				Score:      score,
			}
		}
		interestLevel = calculatedScore
		if interestLevel > 5 {
			interestLevel = 5
		}
	}

	return interestLevel, answers
}

// buildLocationJSON creates a JSONB location string from GPS coordinates
func buildLocationJSON(lat, lng, accuracy *float64) string {
	location := map[string]interface{}{}
	if lat != nil {
		location["lat"] = *lat
	}
	if lng != nil {
		location["lng"] = *lng
	}
	if accuracy != nil {
		location["accuracy"] = *accuracy
	}
	data, err := json.Marshal(location)
	if err != nil {
		return "{}"
	}
	return string(data)
}

// ListByEmployee returns paginated per-employee visit report metrics for ALL/DIVISION/AREA scope views.
func (u *visitReportUsecase) ListByEmployee(ctx context.Context, req *dto.ListByEmployeeRequest) ([]dto.VisitReportEmployeeSummary, *utils.PaginationResult, error) {
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	rows, total, err := u.visitRepo.GetEmployeeSummary(ctx, req.Search, perPage, (page-1)*perPage)
	if err != nil {
		return nil, nil, err
	}

	summaries := make([]dto.VisitReportEmployeeSummary, 0, len(rows))
	for _, r := range rows {
		summaries = append(summaries, dto.VisitReportEmployeeSummary{
			EmployeeID:   r.EmployeeID,
			EmployeeCode: r.EmployeeCode,
			EmployeeName: r.EmployeeName,
			TotalReports: r.TotalReports,
			LatestVisit:  r.LatestVisit,
			StatusCounts: dto.VisitReportStatusCounts{
				Draft:     r.Draft,
				Submitted: r.Submitted,
				Approved:  r.Approved,
				Rejected:  r.Rejected,
			},
		})
	}

	totalInt := int(total)
	totalPages := (totalInt + perPage - 1) / perPage
	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      totalInt,
		TotalPages: totalPages,
	}

	return summaries, pagination, nil
}

// autoCreateVisitActivity creates an immutable Activity record from a submitted visit report
func (u *visitReportUsecase) autoCreateVisitActivity(ctx context.Context, visitReportID string) {
	visit, err := u.visitRepo.FindByID(ctx, visitReportID)
	if err != nil {
		fmt.Printf("[WARN] failed to fetch visit report %s for activity creation: %v\n", visitReportID, err)
		return
	}

	// Parse photos from JSONB
	var photos []string
	if visit.Photos != nil {
		_ = json.Unmarshal([]byte(*visit.Photos), &photos)
	}

	// Extract GPS coordinates from check-in/check-out locations
	checkInLat, checkInLng := extractCoords(visit.CheckInLocation)
	checkOutLat, checkOutLng := extractCoords(visit.CheckOutLocation)

	// Build product interest list from visit report details
	var products []VisitActivityProductInfo
	for _, detail := range visit.Details {
		p := VisitActivityProductInfo{
			InterestLevel: detail.InterestLevel,
			Notes:         detail.Notes,
		}
		if detail.Product != nil {
			p.ProductName = detail.Product.Name
			p.ProductSKU = detail.Product.Sku
		}
		if detail.Quantity != nil {
			p.Quantity = int(*detail.Quantity)
		}
		products = append(products, p)
	}

	metadata := VisitActivityMetadata{
		VisitCode:     visit.Code,
		Purpose:       visit.Purpose,
		Outcome:       visit.Outcome,
		Result:        visit.Result,
		Photos:        photos,
		CheckInAt:     formatTimePtr(visit.CheckInAt),
		CheckOutAt:    formatTimePtr(visit.CheckOutAt),
		CheckInLat:    checkInLat,
		CheckInLng:    checkInLng,
		CheckOutLat:   checkOutLat,
		CheckOutLng:   checkOutLng,
		Address:       visit.Address,
		ContactPerson: visit.ContactPerson,
		Products:      products,
	}

	metadataJSON, marshalErr := json.Marshal(metadata)
	if marshalErr != nil {
		fmt.Printf("[WARN] failed to marshal visit activity metadata: %v\n", marshalErr)
		return
	}
	metadataStr := string(metadataJSON)

	// Determine timestamp priority:
	// 1. Actual check-in time (most accurate)
	// 2. Visit date + scheduled time, anchored to app timezone (WIB)
	// 3. Visit date at midnight in app timezone (avoids UTC midnight → 07:00 WIB display)
	loc := apptime.Location()
	timestamp := time.Date(
		visit.VisitDate.Year(), visit.VisitDate.Month(), visit.VisitDate.Day(),
		0, 0, 0, 0, loc,
	)
	if visit.CheckInAt != nil {
		// CheckInAt is stored as plain timestamp: numeric value = WIB wall clock, but GORM reads
		// it back tagged as UTC. Re-anchor to app timezone so pgx stores the correct UTC offset.
		ci := *visit.CheckInAt
		timestamp = time.Date(ci.Year(), ci.Month(), ci.Day(), ci.Hour(), ci.Minute(), ci.Second(), 0, loc)
	} else if visit.ScheduledTime != nil {
		st := *visit.ScheduledTime
		timestamp = time.Date(
			visit.VisitDate.Year(), visit.VisitDate.Month(), visit.VisitDate.Day(),
			st.Hour(), st.Minute(), 0, 0, loc,
		)
	}

	actTypeID := visitActivityTypeID
	description := fmt.Sprintf("Visit: %s", visit.Purpose)
	if visit.Result != "" {
		description = fmt.Sprintf("Visit: %s — %s", visit.Purpose, visit.Result)
	}

	activity := &models.Activity{
		Type:           "visit",
		ActivityTypeID: &actTypeID,
		EmployeeID:     visit.EmployeeID,
		LeadID:         visit.LeadID,
		DealID:         visit.DealID,
		CustomerID:     visit.CustomerID,
		VisitReportID:  &visit.ID,
		Description:    description,
		Timestamp:      timestamp,
		Metadata:       &metadataStr,
	}

	if createErr := u.activityRepo.Create(ctx, activity); createErr != nil {
		fmt.Printf("[WARN] failed to auto-create activity for visit %s: %v\n", visit.Code, createErr)
	}
}

// syncProductItemsToLead syncs visit report product interests to the associated lead's product items.
// It merges by product_id: existing items are updated, new ones are appended.
func (u *visitReportUsecase) syncProductItemsToLead(ctx context.Context, visitReportID string) {
	visit, err := u.visitRepo.FindByID(ctx, visitReportID)
	if err != nil || visit.LeadID == nil || len(visit.Details) == 0 {
		return
	}

	leadID := *visit.LeadID

	// Fetch existing product items for this lead
	existing, err := u.leadRepo.ListProductItems(ctx, leadID)
	if err != nil {
		fmt.Printf("[WARN] failed to fetch lead product items for sync: %v\n", err)
		return
	}

	// Build lookup map by product_id for dedup
	existingByProductID := make(map[string]*models.LeadProductItem)
	for i := range existing {
		if existing[i].ProductID != nil {
			existingByProductID[*existing[i].ProductID] = &existing[i]
		}
	}

	var items []models.LeadProductItem
	seen := make(map[string]bool)

	for _, detail := range visit.Details {
		if detail.ProductID == "" || seen[detail.ProductID] {
			continue
		}
		seen[detail.ProductID] = true

		productID := detail.ProductID
		item := models.LeadProductItem{
			LeadID:              leadID,
			ProductID:           &productID,
			InterestLevel:       detail.InterestLevel,
			Notes:               detail.Notes,
			SourceVisitReportID: &visitReportID,
		}

		if detail.Product != nil {
			item.ProductName = detail.Product.Name
			item.ProductSKU = detail.Product.Sku
		}
		if detail.Quantity != nil {
			item.Quantity = int(*detail.Quantity)
		}
		if detail.Price != nil {
			item.UnitPrice = *detail.Price
		}

		// Preserve existing item ID if same product exists to enable update instead of duplicate
		if existingItem, ok := existingByProductID[productID]; ok {
			item.ID = existingItem.ID
		}

		items = append(items, item)
	}

	// Also keep existing items whose product_id was NOT in this visit report
	for pid, existingItem := range existingByProductID {
		if !seen[pid] {
			items = append(items, *existingItem)
		}
	}

	if len(items) > 0 {
		if err := u.leadRepo.UpsertProductItems(ctx, leadID, items); err != nil {
			fmt.Printf("[WARN] failed to sync product items to lead %s: %v\n", leadID, err)
		}
	}
}

// extractCoords parses lat/lng from a JSONB location string
func extractCoords(locationJSON *string) (*float64, *float64) {
	if locationJSON == nil {
		return nil, nil
	}
	var loc map[string]interface{}
	if err := json.Unmarshal([]byte(*locationJSON), &loc); err != nil {
		return nil, nil
	}
	var lat, lng *float64
	if v, ok := loc["lat"].(float64); ok {
		lat = &v
	}
	if v, ok := loc["lng"].(float64); ok {
		lng = &v
	}
	return lat, lng
}

// formatTimePtr formats a *time.Time to ISO 8601 string pointer
func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02T15:04:05+07:00")
	return &s
}
