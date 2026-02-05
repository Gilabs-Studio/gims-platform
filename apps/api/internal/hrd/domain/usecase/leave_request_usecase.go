package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
)

// LeaveRequestUsecase defines business logic for leave request operations
type LeaveRequestUsecase interface {
	// CRUD operations
	Create(ctx context.Context, req *dto.CreateLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error)
	GetByID(ctx context.Context, id string, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error)
	List(ctx context.Context, filters *dto.LeaveRequestListFilterDTO, currentUserID string) ([]*dto.LeaveRequestResponseDTO, int64, error)
	Update(ctx context.Context, id string, req *dto.UpdateLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error)
	Delete(ctx context.Context, id string, currentUserID string) error

	// Form data for dropdowns
	GetFormData(ctx context.Context, currentUserID string) (*dto.FormDataResponseDTO, error)

	// Balance calculation
	CalculateBalance(ctx context.Context, employeeID string, currentUserID string) (*dto.LeaveBalanceResponseDTO, error)

	// Approval workflow
	Approve(ctx context.Context, id string, req *dto.ApproveLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error)
	Reject(ctx context.Context, id string, req *dto.RejectLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error)
}

type leaveRequestUsecase struct {
	leaveRequestRepo repositories.LeaveRequestRepository
	employeeRepo     orgRepos.EmployeeRepository
	leaveTypeRepo    coreRepos.LeaveTypeRepository
	holidayRepo      repositories.HolidayRepository
	mapper           *mapper.LeaveRequestMapper
}

// NewLeaveRequestUsecase creates a new instance of LeaveRequestUsecase
func NewLeaveRequestUsecase(
	leaveRequestRepo repositories.LeaveRequestRepository,
	employeeRepo orgRepos.EmployeeRepository,
	leaveTypeRepo coreRepos.LeaveTypeRepository,
	holidayRepo repositories.HolidayRepository,
) LeaveRequestUsecase {
	return &leaveRequestUsecase{
		leaveRequestRepo: leaveRequestRepo,
		employeeRepo:     employeeRepo,
		leaveTypeRepo:    leaveTypeRepo,
		holidayRepo:      holidayRepo,
		mapper:           mapper.NewLeaveRequestMapper(),
	}
}

// Create creates a new leave request
// WHY: Validates balance, calculates working days, prevents overlapping requests
func (u *leaveRequestUsecase) Create(ctx context.Context, req *dto.CreateLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error) {
	// 1. Fetch employee to validate and get quota
	employee, err := u.employeeRepo.FindByID(ctx, req.EmployeeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employee: %w", err)
	}

	// 2. IDOR check: Only employee themselves can create their leave request
	// WHY: Prevent unauthorized users from creating leave requests for other employees
	if employee.UserID == nil || *employee.UserID != currentUserID {
		return nil, fmt.Errorf("FORBIDDEN: you can only create leave requests for yourself")
	}

	// 3. Parse dates for validation
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("INVALID_DATE_FORMAT: start_date must be YYYY-MM-DD")
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("INVALID_DATE_FORMAT: end_date must be YYYY-MM-DD")
	}

	// 4. Calculate total days based on duration
	totalDays, err := u.calculateTotalDays(ctx, req.Duration, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// 5. Check for overlapping requests
	// WHY: Prevent employee from having multiple leave requests for the same period
	overlapping, err := u.leaveRequestRepo.FindOverlappingRequests(ctx, req.EmployeeID, startDate, endDate, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to check overlapping requests: %w", err)
	}
	if len(overlapping) > 0 {
		return nil, fmt.Errorf("OVERLAPPING_LEAVE_REQUEST: you already have a leave request for these dates")
	}

	// 6. Fetch leave type to check if it cuts annual leave
	leaveType, err := u.leaveTypeRepo.FindByID(ctx, req.LeaveTypeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leave type: %w", err)
	}

	// 7. Validate balance if leave type cuts annual leave
	// WHY: Prevent submission if employee has insufficient leave balance
	if leaveType.IsCutAnnualLeave {
		usedDays, err := u.leaveRequestRepo.CalculateUsedLeaveDays(ctx, req.EmployeeID, true)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate used leave days: %w", err)
		}

		remainingBalance := employee.TotalLeaveQuota - usedDays
		if int(totalDays) > remainingBalance {
			return nil, fmt.Errorf("INSUFFICIENT_LEAVE_BALANCE: requested %.1f days but only %d days available", totalDays, remainingBalance)
		}
	}

	// 8. Convert DTO to model
	leaveRequest, err := u.mapper.ToModel(req, totalDays, &currentUserID)
	if err != nil {
		return nil, err
	}

	// 9. Save to database
	if err := u.leaveRequestRepo.Create(ctx, leaveRequest); err != nil {
		return nil, fmt.Errorf("failed to create leave request: %w", err)
	}

	// 10. Return response DTO with full details
	return u.mapper.ToDetailResponseDTO(leaveRequest, employee, leaveType), nil
}

// GetByID retrieves a leave request by ID
// WHY: IDOR protection - only owner or approvers can view
func (u *leaveRequestUsecase) GetByID(ctx context.Context, id string, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error) {
	leaveRequest, err := u.leaveRequestRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// IDOR check: Fetch employee to verify ownership
	employee, err := u.employeeRepo.FindByID(ctx, leaveRequest.EmployeeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employee: %w", err)
	}

	// Allow access if:
	// 1. Current user is the employee who submitted the request
	// 2. Current user is an approver (TODO: check approval permissions)
	if employee.UserID == nil || *employee.UserID != currentUserID {
		// TODO: Add check for approval permission
		return nil, fmt.Errorf("FORBIDDEN: you do not have access to this leave request")
	}

	// Fetch leave type for detailed response
	leaveType, err := u.leaveTypeRepo.FindByID(ctx, leaveRequest.LeaveTypeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leave type: %w", err)
	}

	return u.mapper.ToDetailResponseDTO(leaveRequest, employee, leaveType), nil
}

// List retrieves leave requests with filters and pagination
func (u *leaveRequestUsecase) List(ctx context.Context, filters *dto.LeaveRequestListFilterDTO, currentUserID string) ([]*dto.LeaveRequestResponseDTO, int64, error) {
	// Set default pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}

	perPage := filters.PerPage
	if perPage < 1 {
		perPage = 20
	}

	// Parse optional date filters
	var startDate, endDate *time.Time
	if filters.StartDate != nil {
		parsed, err := time.Parse("2006-01-02", *filters.StartDate)
		if err != nil {
			return nil, 0, fmt.Errorf("INVALID_DATE_FORMAT: start_date must be YYYY-MM-DD")
		}
		startDate = &parsed
	}

	if filters.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *filters.EndDate)
		if err != nil {
			return nil, 0, fmt.Errorf("INVALID_DATE_FORMAT: end_date must be YYYY-MM-DD")
		}
		endDate = &parsed
	}

	// Parse optional status filter (case-insensitive)
	var status *models.LeaveStatus
	if filters.Status != nil {
		// Convert to uppercase for case-insensitive matching
		statusUpper := strings.ToUpper(*filters.Status)

		// Validate status value
		validStatuses := map[string]models.LeaveStatus{
			"PENDING":   models.LeaveStatusPending,
			"APPROVED":  models.LeaveStatusApproved,
			"REJECTED":  models.LeaveStatusRejected,
			"CANCELLED": models.LeaveStatusCancelled,
		}

		if validStatus, ok := validStatuses[statusUpper]; ok {
			status = &validStatus
		} else {
			return nil, 0, fmt.Errorf("INVALID_STATUS: status must be one of: PENDING, APPROVED, REJECTED, CANCELLED (case-insensitive)")
		}
	}

	// TODO: IDOR protection - filter by currentUserID if not admin/approver
	// For now, if employeeID filter is not provided, show only current user's requests
	employeeID := filters.EmployeeID
	if employeeID == nil {
		// Fetch current user's employee record
		employee, err := u.employeeRepo.FindByUserID(ctx, currentUserID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to fetch employee for current user: %w", err)
		}
		employeeID = &employee.ID
	}

	// Fetch from repository
	leaveRequests, total, err := u.leaveRequestRepo.List(ctx, employeeID, status, startDate, endDate, page, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch leave requests: %w", err)
	}

	// Extract unique employee IDs and leave type IDs for batch fetching
	employeeIDs := make([]string, 0)
	leaveTypeIDs := make([]string, 0)
	employeeIDMap := make(map[string]bool)
	leaveTypeIDMap := make(map[string]bool)

	for _, req := range leaveRequests {
		if !employeeIDMap[req.EmployeeID] {
			employeeIDs = append(employeeIDs, req.EmployeeID)
			employeeIDMap[req.EmployeeID] = true
		}
		if !leaveTypeIDMap[req.LeaveTypeID] {
			leaveTypeIDs = append(leaveTypeIDs, req.LeaveTypeID)
			leaveTypeIDMap[req.LeaveTypeID] = true
		}
	}

	// Batch fetch employees and leave types
	employees, err := u.employeeRepo.FindByIDs(ctx, employeeIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch employees: %w", err)
	}

	leaveTypes, err := u.leaveTypeRepo.FindByIDs(ctx, leaveTypeIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch leave types: %w", err)
	}

	// Create maps for O(1) lookup
	employeeMap := make(map[string]*orgModels.Employee)
	for i := range employees {
		employeeMap[employees[i].ID] = &employees[i]
	}

	leaveTypeMap := make(map[string]*coreModels.LeaveType)
	for i := range leaveTypes {
		leaveTypeMap[leaveTypes[i].ID] = &leaveTypes[i]
	}

	return u.mapper.ToList(leaveRequests, employeeMap, leaveTypeMap), total, nil
}

// Update updates an existing leave request
// WHY: Only owner can update, only if status is PENDING or REJECTED
func (u *leaveRequestUsecase) Update(ctx context.Context, id string, req *dto.UpdateLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error) {
	// 1. Fetch existing leave request
	leaveRequest, err := u.leaveRequestRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 2. IDOR check: Only owner can update
	employee, err := u.employeeRepo.FindByID(ctx, leaveRequest.EmployeeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employee: %w", err)
	}

	if employee.UserID == nil || *employee.UserID != currentUserID {
		return nil, fmt.Errorf("FORBIDDEN: you can only update your own leave requests")
	}

	// 3. Check if leave request is editable
	// WHY: Only PENDING or REJECTED leaves can be edited
	if !leaveRequest.IsEditable() {
		return nil, fmt.Errorf("INVALID_STATUS: only PENDING or REJECTED leave requests can be edited")
	}

	// 4. Recalculate total days if dates or duration changed
	var totalDays *float64
	if req.StartDate != nil || req.EndDate != nil || req.Duration != nil {
		// Parse dates
		startDate := leaveRequest.StartDate
		if req.StartDate != nil {
			parsed, err := time.Parse("2006-01-02", *req.StartDate)
			if err != nil {
				return nil, fmt.Errorf("INVALID_DATE_FORMAT: start_date must be YYYY-MM-DD")
			}
			startDate = parsed
		}

		endDate := leaveRequest.EndDate
		if req.EndDate != nil {
			parsed, err := time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				return nil, fmt.Errorf("INVALID_DATE_FORMAT: end_date must be YYYY-MM-DD")
			}
			endDate = parsed
		}

		duration := string(leaveRequest.Duration)
		if req.Duration != nil {
			duration = *req.Duration
		}

		calculated, err := u.calculateTotalDays(ctx, duration, startDate, endDate)
		if err != nil {
			return nil, err
		}
		totalDays = &calculated

		// Check for overlapping requests (excluding current one)
		overlapping, err := u.leaveRequestRepo.FindOverlappingRequests(ctx, leaveRequest.EmployeeID, startDate, endDate, &id)
		if err != nil {
			return nil, fmt.Errorf("failed to check overlapping requests: %w", err)
		}
		if len(overlapping) > 0 {
			return nil, fmt.Errorf("OVERLAPPING_LEAVE_REQUEST: dates overlap with another leave request")
		}

		// Revalidate balance if leave type cuts annual leave
		if req.LeaveTypeID != nil {
			leaveType, err := u.leaveTypeRepo.FindByID(ctx, *req.LeaveTypeID)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch leave type: %w", err)
			}

			if leaveType.IsCutAnnualLeave {
				usedDays, err := u.leaveRequestRepo.CalculateUsedLeaveDays(ctx, leaveRequest.EmployeeID, true)
				if err != nil {
					return nil, fmt.Errorf("failed to calculate used leave days: %w", err)
				}

				remainingBalance := employee.TotalLeaveQuota - usedDays
				if int(*totalDays) > remainingBalance {
					return nil, fmt.Errorf("INSUFFICIENT_LEAVE_BALANCE: requested %.1f days but only %d days available", *totalDays, remainingBalance)
				}
			}
		}
	}

	// 5. Apply updates to model
	if err := u.mapper.ApplyUpdateDTO(leaveRequest, req, totalDays, &currentUserID); err != nil {
		return nil, err
	}

	// 6. Save changes
	if err := u.leaveRequestRepo.Update(ctx, leaveRequest); err != nil {
		return nil, fmt.Errorf("failed to update leave request: %w", err)
	}

	// 7. Fetch updated leave type for response
	leaveType, err := u.leaveTypeRepo.FindByID(ctx, leaveRequest.LeaveTypeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leave type: %w", err)
	}

	return u.mapper.ToDetailResponseDTO(leaveRequest, employee, leaveType), nil
}

// Delete soft deletes a leave request
// WHY: Only owner can delete, only if status is PENDING or REJECTED
func (u *leaveRequestUsecase) Delete(ctx context.Context, id string, currentUserID string) error {
	// 1. Fetch leave request
	leaveRequest, err := u.leaveRequestRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// 2. IDOR check: Only owner can delete
	employee, err := u.employeeRepo.FindByID(ctx, leaveRequest.EmployeeID)
	if err != nil {
		return fmt.Errorf("failed to fetch employee: %w", err)
	}

	if employee.UserID == nil || *employee.UserID != currentUserID {
		return fmt.Errorf("FORBIDDEN: you can only delete your own leave requests")
	}

	// 3. Check if deletable (only PENDING or REJECTED)
	if !leaveRequest.IsEditable() {
		return fmt.Errorf("INVALID_STATUS: only PENDING or REJECTED leave requests can be deleted")
	}

	// 4. Soft delete
	return u.leaveRequestRepo.Delete(ctx, id)
}

// CalculateBalance calculates the leave balance for an employee
func (u *leaveRequestUsecase) CalculateBalance(ctx context.Context, employeeID string, currentUserID string) (*dto.LeaveBalanceResponseDTO, error) {
	// 1. Fetch employee
	employee, err := u.employeeRepo.FindByID(ctx, employeeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employee: %w", err)
	}

	// 2. IDOR check: Only employee themselves or approvers can view balance
	if employee.UserID == nil || *employee.UserID != currentUserID {
		// TODO: Add check for approval permission
		return nil, fmt.Errorf("FORBIDDEN: you do not have access to this employee's balance")
	}

	// 3. Calculate used days (only leave types that cut annual leave)
	usedDays, err := u.leaveRequestRepo.CalculateUsedLeaveDays(ctx, employeeID, true)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate used leave days: %w", err)
	}

	// 4. Calculate pending days
	pendingDays := 0
	pendingRequests, _, err := u.leaveRequestRepo.List(ctx, &employeeID, &[]models.LeaveStatus{models.LeaveStatusPending}[0], nil, nil, 1, 100)
	if err == nil {
		for _, req := range pendingRequests {
			pendingDays += int(req.TotalDays)
		}
	}

	// 5. Get carry-over balance (if any)
	// TODO: Implement carry-over logic from previous year
	carryOverBalance := 0.0
	var carryOverExpiry *time.Time

	// 6. Build response
	return u.mapper.ToBalanceDTO(
		employeeID,
		employee.TotalLeaveQuota,
		usedDays,
		pendingDays,
		carryOverBalance,
		carryOverExpiry,
	), nil
}

// calculateTotalDays calculates the total days for a leave request
// WHY: Considers duration type and excludes weekends/holidays for MULTI_DAY
func (u *leaveRequestUsecase) calculateTotalDays(ctx context.Context, duration string, startDate, endDate time.Time) (float64, error) {
	switch duration {
	case "HALF_DAY":
		return 0.5, nil
	case "FULL_DAY":
		return 1.0, nil
	case "MULTI_DAY":
		// Calculate working days (exclude weekends and holidays)
		return u.calculateWorkingDays(ctx, startDate, endDate)
	default:
		return 0, fmt.Errorf("INVALID_DURATION: must be FULL_DAY, HALF_DAY, or MULTI_DAY")
	}
}

// calculateWorkingDays calculates working days between two dates (excluding weekends and holidays)
// WHY: Leave days should only count actual working days
func (u *leaveRequestUsecase) calculateWorkingDays(ctx context.Context, startDate, endDate time.Time) (float64, error) {
	// Fetch holidays in the date range
	holidays, err := u.holidayRepo.FindByDateRange(ctx, startDate, endDate)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch holidays: %w", err)
	}

	// Create holiday map for O(1) lookup
	holidayMap := make(map[string]bool)
	for _, holiday := range holidays {
		holidayMap[holiday.Date.Format("2006-01-02")] = true
	}

	// Count working days
	workingDays := 0.0
	currentDate := startDate

	for !currentDate.After(endDate) {
		// Skip weekends (Saturday = 6, Sunday = 0)
		weekday := currentDate.Weekday()
		if weekday != time.Saturday && weekday != time.Sunday {
			// Check if it's not a holiday
			dateStr := currentDate.Format("2006-01-02")
			if !holidayMap[dateStr] {
				workingDays++
			}
		}

		// Move to next day
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	return workingDays, nil
}

// Approve approves a leave request
// WHY: Uses row-level locking (FOR UPDATE) to prevent race conditions
func (u *leaveRequestUsecase) Approve(ctx context.Context, id string, req *dto.ApproveLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error) {
	var employee *orgModels.Employee
	var leaveType *coreModels.LeaveType

	// Use UpdateWithLock to ensure row-level locking (FOR UPDATE)
	// WHY: Prevent concurrent approvals causing double-deduction of leave balance
	err := u.leaveRequestRepo.UpdateWithLock(ctx, id, func(leaveRequest *models.LeaveRequest) error {
		// 1. Check if leave request can be approved
		if !leaveRequest.CanBeApproved() {
			return fmt.Errorf("INVALID_STATUS: leave request cannot be approved (current status: %s)", leaveRequest.Status)
		}

		// 2. TODO: Verify currentUser has approval permission for this employee
		// For now, assume currentUser is an approver

		// 3. Fetch employee and leave type to revalidate balance
		var err error
		employee, err = u.employeeRepo.FindByID(ctx, leaveRequest.EmployeeID)
		if err != nil {
			return fmt.Errorf("failed to fetch employee: %w", err)
		}

		leaveType, err = u.leaveTypeRepo.FindByID(ctx, leaveRequest.LeaveTypeID)
		if err != nil {
			return fmt.Errorf("failed to fetch leave type: %w", err)
		}

		// 4. Revalidate balance if leave type cuts annual leave
		// WHY: Balance might have changed between submission and approval
		if leaveType.IsCutAnnualLeave {
			usedDays, err := u.leaveRequestRepo.CalculateUsedLeaveDays(ctx, leaveRequest.EmployeeID, true)
			if err != nil {
				return fmt.Errorf("failed to calculate used leave days: %w", err)
			}

			remainingBalance := employee.TotalLeaveQuota - usedDays
			if int(leaveRequest.TotalDays) > remainingBalance {
				return fmt.Errorf("INSUFFICIENT_LEAVE_BALANCE: employee has only %d days remaining", remainingBalance)
			}
		}

		// 5. Update status to APPROVED
		leaveRequest.Status = models.LeaveStatusApproved
		now := time.Now()
		leaveRequest.ApprovedAt = &now

		// Use approver ID from DTO if provided, otherwise current user
		if req.ApprovedBy != nil {
			leaveRequest.ApprovedBy = req.ApprovedBy
		} else {
			leaveRequest.ApprovedBy = &currentUserID
		}

		leaveRequest.UpdatedBy = &currentUserID

		// 6. TODO: Trigger notification to employee
		// notificationService.Send(employee.Email, "Leave Request Approved", ...)

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 7. Fetch updated leave request to return
	updatedLeaveRequest, err := u.leaveRequestRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated leave request: %w", err)
	}

	return u.mapper.ToDetailResponseDTO(updatedLeaveRequest, employee, leaveType), nil
}

// Reject rejects a leave request
// WHY: Uses row-level locking (FOR UPDATE) to prevent concurrent updates
func (u *leaveRequestUsecase) Reject(ctx context.Context, id string, req *dto.RejectLeaveRequestDTO, currentUserID string) (*dto.LeaveRequestDetailResponseDTO, error) {
	var employee *orgModels.Employee
	var leaveType *coreModels.LeaveType

	// Use UpdateWithLock to ensure row-level locking (FOR UPDATE)
	err := u.leaveRequestRepo.UpdateWithLock(ctx, id, func(leaveRequest *models.LeaveRequest) error {
		// 1. Check if leave request can be approved (same check for rejection)
		if !leaveRequest.CanBeApproved() {
			return fmt.Errorf("INVALID_STATUS: leave request cannot be rejected (current status: %s)", leaveRequest.Status)
		}

		// 2. TODO: Verify currentUser has approval permission for this employee
		// For now, assume currentUser is an approver

		// 3. Validate rejection note
		if req.RejectionNote == "" {
			return fmt.Errorf("VALIDATION_ERROR: rejection_note is required")
		}

		// 4. Fetch employee and leave type for response
		var err error
		employee, err = u.employeeRepo.FindByID(ctx, leaveRequest.EmployeeID)
		if err != nil {
			return fmt.Errorf("failed to fetch employee: %w", err)
		}

		leaveType, err = u.leaveTypeRepo.FindByID(ctx, leaveRequest.LeaveTypeID)
		if err != nil {
			return fmt.Errorf("failed to fetch leave type: %w", err)
		}

		// 5. Update status to REJECTED
		leaveRequest.Status = models.LeaveStatusRejected
		leaveRequest.RejectionNote = &req.RejectionNote

		// Use rejecter ID from DTO if provided, otherwise current user
		if req.RejectedBy != nil {
			leaveRequest.RejectedBy = req.RejectedBy
		} else {
			leaveRequest.RejectedBy = &currentUserID
		}

		leaveRequest.UpdatedBy = &currentUserID

		// 6. TODO: Trigger notification to employee
		// notificationService.Send(employee.Email, "Leave Request Rejected", ...)

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 7. Fetch updated leave request to return
	updatedLeaveRequest, err := u.leaveRequestRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated leave request: %w", err)
	}

	return u.mapper.ToDetailResponseDTO(updatedLeaveRequest, employee, leaveType), nil
}

// GetFormData returns data for form dropdowns (employees and leave types)
func (u *leaveRequestUsecase) GetFormData(ctx context.Context, currentUserID string) (*dto.FormDataResponseDTO, error) {
	// 1. Fetch all active employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch employees: %w", err)
	}

	// 2. Fetch all active leave types
	leaveTypes, err := u.leaveTypeRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch leave types: %w", err)
	}

	// 3. Map to form DTOs
	formEmployees := make([]dto.FormEmployeeDTO, 0, len(employees))
	for _, emp := range employees {
		formEmployees = append(formEmployees, dto.FormEmployeeDTO{
			ID:    emp.ID,
			Name:  emp.Name,
			Email: emp.Email,
		})
	}

	formLeaveTypes := make([]dto.FormLeaveTypeDTO, 0, len(leaveTypes))
	for _, lt := range leaveTypes {
		formLeaveTypes = append(formLeaveTypes, dto.FormLeaveTypeDTO{
			ID:      lt.ID,
			Name:    lt.Name,
			Code:    lt.Code,
			MaxDays: lt.MaxDays,
		})
	}

	return &dto.FormDataResponseDTO{
		Employees:  formEmployees,
		LeaveTypes: formLeaveTypes,
	}, nil
}
