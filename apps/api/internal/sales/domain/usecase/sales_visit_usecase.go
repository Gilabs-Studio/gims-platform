package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
)

var (
	ErrSalesVisitNotFound       = errors.New("sales visit not found")
	ErrInvalidVisitTransition   = errors.New("invalid status transition")
	ErrVisitAlreadyCheckedIn    = errors.New("visit already checked in")
	ErrVisitNotCheckedIn        = errors.New("visit must be checked in first")
	ErrVisitAlreadyCompleted    = errors.New("visit already completed")
	ErrCannotModifyCompletedVisit = errors.New("cannot modify completed visit")
)

// SalesVisitUsecase defines the interface for sales visit business logic
type SalesVisitUsecase interface {
	List(ctx context.Context, req *dto.ListSalesVisitsRequest) ([]dto.SalesVisitResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.SalesVisitResponse, error)
	ListDetails(ctx context.Context, visitID string, req *dto.ListSalesVisitDetailsRequest) ([]dto.SalesVisitDetailResponse, *utils.PaginationResult, error)
	ListProgressHistory(ctx context.Context, visitID string, req *dto.ListSalesVisitProgressHistoryRequest) ([]dto.SalesVisitProgressHistoryResponse, *utils.PaginationResult, error)
	Create(ctx context.Context, req *dto.CreateSalesVisitRequest, createdBy *string) (*dto.SalesVisitResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateSalesVisitRequest) (*dto.SalesVisitResponse, error)
	Delete(ctx context.Context, id string) error
	UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesVisitStatusRequest, userID *string) (*dto.SalesVisitResponse, error)
	CheckIn(ctx context.Context, id string, req *dto.CheckInRequest, userID *string) (*dto.SalesVisitResponse, error)
	CheckOut(ctx context.Context, id string, req *dto.CheckOutRequest, userID *string) (*dto.SalesVisitResponse, error)
	GetCalendarSummary(ctx context.Context, req *dto.GetCalendarSummaryRequest) (*dto.CalendarSummaryResponse, error)
}

type salesVisitUsecase struct {
	visitRepo repositories.SalesVisitRepository
}

// NewSalesVisitUsecase creates a new SalesVisitUsecase
func NewSalesVisitUsecase(visitRepo repositories.SalesVisitRepository) SalesVisitUsecase {
	return &salesVisitUsecase{
		visitRepo: visitRepo,
	}
}

func (u *salesVisitUsecase) List(ctx context.Context, req *dto.ListSalesVisitsRequest) ([]dto.SalesVisitResponse, *utils.PaginationResult, error) {
	visits, total, err := u.visitRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response
	responses := mapper.MapSalesVisitsToResponse(visits)

	// Build pagination
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

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *salesVisitUsecase) GetByID(ctx context.Context, id string) (*dto.SalesVisitResponse, error) {
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrSalesVisitNotFound
	}
	return mapper.MapSalesVisitToResponse(visit), nil
}

func (u *salesVisitUsecase) ListDetails(ctx context.Context, visitID string, req *dto.ListSalesVisitDetailsRequest) ([]dto.SalesVisitDetailResponse, *utils.PaginationResult, error) {
	details, total, err := u.visitRepo.ListDetails(ctx, visitID, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response
	responses := mapper.MapSalesVisitDetailsToResponse(details)

	// Build pagination
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

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *salesVisitUsecase) ListProgressHistory(ctx context.Context, visitID string, req *dto.ListSalesVisitProgressHistoryRequest) ([]dto.SalesVisitProgressHistoryResponse, *utils.PaginationResult, error) {
	history, total, err := u.visitRepo.ListProgressHistory(ctx, visitID, req)
	if err != nil {
		return nil, nil, err
	}

	// Map to response
	responses := mapper.MapSalesVisitProgressHistoryListToResponse(history)

	// Build pagination
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

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *salesVisitUsecase) Create(ctx context.Context, req *dto.CreateSalesVisitRequest, createdBy *string) (*dto.SalesVisitResponse, error) {
	// Parse visit date
	visitDate, err := time.Parse("2006-01-02", req.VisitDate)
	if err != nil {
		return nil, errors.New("invalid visit_date format, expected YYYY-MM-DD")
	}

	// Generate visit code
	code, err := u.visitRepo.GetNextVisitNumber(ctx, "VIS")
	if err != nil {
		return nil, err
	}

	// Build visit model
	visit := &models.SalesVisit{
		Code:          code,
		VisitDate:     visitDate,
		EmployeeID:    req.EmployeeID,
		CompanyID:     req.CompanyID,
		ContactPerson: req.ContactPerson,
		ContactPhone:  req.ContactPhone,
		Address:       req.Address,
		VillageID:     req.VillageID,
		Purpose:       req.Purpose,
		Notes:         req.Notes,
		Status:        models.SalesVisitStatusPlanned,
		CreatedBy:     createdBy,
	}

	// Parse scheduled time if provided
	if req.ScheduledTime != nil && *req.ScheduledTime != "" {
		scheduledTime, err := time.Parse("15:04", *req.ScheduledTime)
		if err == nil {
			visit.ScheduledTime = &scheduledTime
		}
	}

	// Build details
	if len(req.Details) > 0 {
		visit.Details = make([]models.SalesVisitDetail, len(req.Details))
		for i, detailReq := range req.Details {
			visit.Details[i] = models.SalesVisitDetail{
				ProductID:     detailReq.ProductID,
				InterestLevel: detailReq.InterestLevel,
				Notes:         detailReq.Notes,
				Quantity:      detailReq.Quantity,
				Price:         detailReq.Price,
			}
		}
	}

	// Create visit
	if err := u.visitRepo.Create(ctx, visit); err != nil {
		return nil, err
	}

	// Fetch created visit with relations
	createdVisit, err := u.visitRepo.FindByID(ctx, visit.ID)
	if err != nil {
		return nil, err
	}

	return mapper.MapSalesVisitToResponse(createdVisit), nil
}

func (u *salesVisitUsecase) Update(ctx context.Context, id string, req *dto.UpdateSalesVisitRequest) (*dto.SalesVisitResponse, error) {
	// Find existing visit
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrSalesVisitNotFound
	}

	// Check if visit can be modified
	if visit.Status == models.SalesVisitStatusCompleted || visit.Status == models.SalesVisitStatusCancelled {
		return nil, ErrCannotModifyCompletedVisit
	}

	// Update fields
	if req.VisitDate != nil {
		visitDate, err := time.Parse("2006-01-02", *req.VisitDate)
		if err == nil {
			visit.VisitDate = visitDate
		}
	}

	if req.ScheduledTime != nil {
		scheduledTime, err := time.Parse("15:04", *req.ScheduledTime)
		if err == nil {
			visit.ScheduledTime = &scheduledTime
		}
	}

	if req.EmployeeID != nil {
		visit.EmployeeID = *req.EmployeeID
	}
	if req.CompanyID != nil {
		visit.CompanyID = req.CompanyID
	}
	if req.ContactPerson != nil {
		visit.ContactPerson = *req.ContactPerson
	}
	if req.ContactPhone != nil {
		visit.ContactPhone = *req.ContactPhone
	}
	if req.Address != nil {
		visit.Address = *req.Address
	}
	if req.VillageID != nil {
		visit.VillageID = req.VillageID
	}
	if req.Purpose != nil {
		visit.Purpose = *req.Purpose
	}
	if req.Notes != nil {
		visit.Notes = *req.Notes
	}
	if req.Result != nil {
		visit.Result = *req.Result
	}

	// Update details if provided
	if req.Details != nil {
		visit.Details = make([]models.SalesVisitDetail, len(*req.Details))
		for i, detailReq := range *req.Details {
			visit.Details[i] = models.SalesVisitDetail{
				ProductID:     detailReq.ProductID,
				InterestLevel: detailReq.InterestLevel,
				Notes:         detailReq.Notes,
				Quantity:      detailReq.Quantity,
				Price:         detailReq.Price,
			}
		}
	}

	// Save updates
	if err := u.visitRepo.Update(ctx, visit); err != nil {
		return nil, err
	}

	// Fetch updated visit with relations
	updatedVisit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapSalesVisitToResponse(updatedVisit), nil
}

func (u *salesVisitUsecase) Delete(ctx context.Context, id string) error {
	// Check if visit exists
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return ErrSalesVisitNotFound
	}

	// Only allow deletion of planned visits
	if visit.Status != models.SalesVisitStatusPlanned {
		return errors.New("only planned visits can be deleted")
	}

	return u.visitRepo.Delete(ctx, id)
}

func (u *salesVisitUsecase) UpdateStatus(ctx context.Context, id string, req *dto.UpdateSalesVisitStatusRequest, userID *string) (*dto.SalesVisitResponse, error) {
	// Find existing visit
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrSalesVisitNotFound
	}

	newStatus := models.SalesVisitStatus(req.Status)

	// Validate transition
	if !isValidVisitStatusTransition(visit.Status, newStatus) {
		return nil, ErrInvalidVisitTransition
	}

	// Update status
	if err := u.visitRepo.UpdateStatus(ctx, id, newStatus, req.Notes, userID); err != nil {
		return nil, err
	}

	// Create progress history
	history := &models.SalesVisitProgressHistory{
		SalesVisitID: id,
		FromStatus:   visit.Status,
		ToStatus:     newStatus,
		Notes:        req.Notes,
		ChangedBy:    userID,
		CreatedAt:    time.Now(),
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	// Fetch updated visit
	updatedVisit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapSalesVisitToResponse(updatedVisit), nil
}

func (u *salesVisitUsecase) CheckIn(ctx context.Context, id string, req *dto.CheckInRequest, userID *string) (*dto.SalesVisitResponse, error) {
	// Find existing visit
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrSalesVisitNotFound
	}

	// Validate status
	if visit.Status == models.SalesVisitStatusInProgress {
		return nil, ErrVisitAlreadyCheckedIn
	}
	if visit.Status == models.SalesVisitStatusCompleted {
		return nil, ErrVisitAlreadyCompleted
	}

	checkInTime := time.Now()

	// Perform check-in
	if err := u.visitRepo.CheckIn(ctx, id, req.Latitude, req.Longitude, checkInTime); err != nil {
		return nil, err
	}

	// Create progress history
	history := &models.SalesVisitProgressHistory{
		SalesVisitID: id,
		FromStatus:   visit.Status,
		ToStatus:     models.SalesVisitStatusInProgress,
		Notes:        "Checked in",
		ChangedBy:    userID,
		CreatedAt:    checkInTime,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	// Fetch updated visit
	updatedVisit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapSalesVisitToResponse(updatedVisit), nil
}

func (u *salesVisitUsecase) CheckOut(ctx context.Context, id string, req *dto.CheckOutRequest, userID *string) (*dto.SalesVisitResponse, error) {
	// Find existing visit
	visit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrSalesVisitNotFound
	}

	// Validate status
	if visit.Status != models.SalesVisitStatusInProgress {
		return nil, ErrVisitNotCheckedIn
	}

	checkOutTime := time.Now()

	// Perform check-out
	if err := u.visitRepo.CheckOut(ctx, id, checkOutTime, req.Result); err != nil {
		return nil, err
	}

	// Create progress history
	history := &models.SalesVisitProgressHistory{
		SalesVisitID: id,
		FromStatus:   models.SalesVisitStatusInProgress,
		ToStatus:     models.SalesVisitStatusCompleted,
		Notes:        "Checked out",
		ChangedBy:    userID,
		CreatedAt:    checkOutTime,
	}
	if err := u.visitRepo.CreateProgressHistory(ctx, history); err != nil {
		return nil, err
	}

	// Fetch updated visit
	updatedVisit, err := u.visitRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.MapSalesVisitToResponse(updatedVisit), nil
}

// isValidVisitStatusTransition checks if the status transition is valid
func isValidVisitStatusTransition(from, to models.SalesVisitStatus) bool {
	validTransitions := map[models.SalesVisitStatus][]models.SalesVisitStatus{
		models.SalesVisitStatusPlanned: {
			models.SalesVisitStatusInProgress,
			models.SalesVisitStatusCancelled,
		},
		models.SalesVisitStatusInProgress: {
			models.SalesVisitStatusCompleted,
			models.SalesVisitStatusCancelled,
		},
		// Completed and Cancelled are terminal states
		models.SalesVisitStatusCompleted: {},
		models.SalesVisitStatusCancelled: {},
	}

	allowedTargets, ok := validTransitions[from]
	if !ok {
		return false
	}

	for _, allowed := range allowedTargets {
		if allowed == to {
			return true
		}
	}

	return false
}

func (u *salesVisitUsecase) GetCalendarSummary(ctx context.Context, req *dto.GetCalendarSummaryRequest) (*dto.CalendarSummaryResponse, error) {
	summaries, err := u.visitRepo.GetCalendarSummary(ctx, req)
	if err != nil {
		return nil, err
	}
	return &dto.CalendarSummaryResponse{Summary: summaries}, nil
}
