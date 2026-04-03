package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	hrdModels "github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Leave Request IDs (fixed UUIDs for consistency)
const (
	LeaveRequest1ID = "10000001-0001-0001-0001-000000000001"
	LeaveRequest2ID = "20000002-0002-0002-0002-000000000002"
	LeaveRequest3ID = "30000003-0003-0003-0003-000000000003"
	LeaveRequest4ID = "40000004-0004-0004-0004-000000000004"
	LeaveRequest5ID = "50000005-0005-0005-0005-000000000005"
	LeaveRequest6ID = "60000006-0006-0006-0006-000000000006"
	LeaveRequest7ID = "70000007-0007-0007-0007-000000000007"
	LeaveRequest8ID = "80000008-0008-0008-0008-000000000008"
)

// SeedLeaveRequests seeds initial leave request data for testing
func SeedLeaveRequests() error {
	db := database.DB

	// Helper functions
	strPtr := func(s string) *string { return &s }
	timePtr := func(t time.Time) *time.Time { return &t }
	date := func(year int, month time.Month, day int) time.Time {
		return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	}

	// Get leave types from database
	var leaveTypes []models.LeaveType
	if err := db.Find(&leaveTypes).Error; err != nil {
		log.Printf("Error fetching leave types: %v", err)
		return err
	}

	if len(leaveTypes) == 0 {
		log.Println("No leave types found. Skipping leave request seeding...")
		return nil
	}

	// Map leave types by name for easier access
	leaveTypeMap := make(map[string]string)
	for _, lt := range leaveTypes {
		leaveTypeMap[lt.Name] = lt.ID
	}

	// Get Annual Leave and Sick Leave IDs
	annualLeaveID := leaveTypeMap["Annual Leave"]
	sickLeaveID := leaveTypeMap["Sick Leave"]
	maternityLeaveID := leaveTypeMap["Maternity Leave"]
	unpaidLeaveID := leaveTypeMap["Unpaid Leave"]

	// Default to first leave type if specific types not found
	if annualLeaveID == "" && len(leaveTypes) > 0 {
		annualLeaveID = leaveTypes[0].ID
	}
	if sickLeaveID == "" && len(leaveTypes) > 1 {
		sickLeaveID = leaveTypes[1].ID
	}
	if maternityLeaveID == "" && len(leaveTypes) > 2 {
		maternityLeaveID = leaveTypes[2].ID
	}
	if unpaidLeaveID == "" && len(leaveTypes) > 0 {
		unpaidLeaveID = leaveTypes[0].ID
	}

	// Define leave requests with various scenarios
	leaveRequests := []hrdModels.LeaveRequest{
		// 1. APPROVED - Admin's past annual leave (3 days: Dec 15-17)
		{
			ID:            LeaveRequest1ID,
			EmployeeID:    AdminEmployeeID,
			LeaveTypeID:   annualLeaveID,
			StartDate:     date(2024, 12, 15),
			EndDate:       date(2024, 12, 17),
			TotalDays:     3,
			Duration:      hrdModels.LeaveDurationMultiDay,
			Reason:        "Family vacation to Bali",
			Status:        hrdModels.LeaveStatusApproved,
			ApprovedBy:    strPtr(ManagerUserID),
			ApprovedAt:    timePtr(date(2024, 12, 10)),
			ApprovalNotes: strPtr("Approved. Enjoy your vacation!"),
		},

		// 2. APPROVED - Manager's past sick leave (2 days: Dec 20-21)
		{
			ID:            LeaveRequest2ID,
			EmployeeID:    ManagerEmployeeID,
			LeaveTypeID:   sickLeaveID,
			StartDate:     date(2024, 12, 20),
			EndDate:       date(2024, 12, 21),
			TotalDays:     2,
			Duration:      hrdModels.LeaveDurationMultiDay,
			Reason:        "Flu and fever, doctor's note attached",
			Status:        hrdModels.LeaveStatusApproved,
			ApprovedBy:    strPtr(AdminUserID),
			ApprovedAt:    timePtr(date(2024, 12, 20)),
			ApprovalNotes: strPtr("Get well soon. Approved."),
		},

		// 3. PENDING - Staff's upcoming annual leave (5 days: Feb 10-14)
		{
			ID:          LeaveRequest3ID,
			EmployeeID:  StaffEmployeeID,
			LeaveTypeID: annualLeaveID,
			StartDate:   date(2025, 2, 10),
			EndDate:     date(2025, 2, 14),
			TotalDays:   5,
			Duration:    hrdModels.LeaveDurationMultiDay,
			Reason:      "Attending sister's wedding in Surabaya",
			Status:      hrdModels.LeaveStatusPending,
		},

		// 4. PENDING - Admin's half-day leave (morning)
		{
			ID:          LeaveRequest4ID,
			EmployeeID:  AdminEmployeeID,
			LeaveTypeID: annualLeaveID,
			StartDate:   date(2025, 1, 25),
			EndDate:     date(2025, 1, 25),
			TotalDays:   0.5,
			Duration:    hrdModels.LeaveDurationHalfDay,
			Reason:      "Dental appointment at 9 AM",
			Status:      hrdModels.LeaveStatusPending,
		},

		// 5. REJECTED - Staff's overlapping request (2 days: Dec 5-6)
		{
			ID:             LeaveRequest5ID,
			EmployeeID:     StaffEmployeeID,
			LeaveTypeID:    annualLeaveID,
			StartDate:      date(2024, 12, 5),
			EndDate:        date(2024, 12, 6),
			TotalDays:      2,
			Duration:       hrdModels.LeaveDurationMultiDay,
			Reason:         "Personal matters",
			Status:         hrdModels.LeaveStatusRejected,
			RejectedBy:     strPtr(ManagerUserID),
			RejectedAt:     timePtr(date(2024, 12, 1)),
			RejectionNotes: strPtr("Rejected - Too many staff on leave during this period. Please reschedule."),
		},

		// 6. REJECTED - Manager's insufficient balance (7 days: Dec 28 - Jan 3)
		{
			ID:             LeaveRequest6ID,
			EmployeeID:     ManagerEmployeeID,
			LeaveTypeID:    annualLeaveID,
			StartDate:      date(2024, 12, 28),
			EndDate:        date(2025, 1, 3),
			TotalDays:      7,
			Duration:       hrdModels.LeaveDurationMultiDay,
			Reason:         "Year-end holiday trip",
			Status:         hrdModels.LeaveStatusRejected,
			RejectedBy:     strPtr(AdminUserID),
			RejectedAt:     timePtr(date(2024, 12, 22)),
			RejectionNotes: strPtr("Rejected - Insufficient leave balance remaining."),
		},

		// 7. CANCELLED - Admin cancelled their own request (1 day)
		{
			ID:          LeaveRequest7ID,
			EmployeeID:  AdminEmployeeID,
			LeaveTypeID: annualLeaveID,
			StartDate:   date(2025, 2, 1),
			EndDate:     date(2025, 2, 1),
			TotalDays:   1,
			Duration:    hrdModels.LeaveDurationFullDay,
			Reason:      "Personal day off",
			Status:      hrdModels.LeaveStatusCancelled,
		},

		// 8. APPROVED - Staff's long maternity leave (90 days: Nov 1 - Jan 29)
		{
			ID:            LeaveRequest8ID,
			EmployeeID:    StaffEmployeeID,
			LeaveTypeID:   maternityLeaveID,
			StartDate:     date(2024, 11, 1),
			EndDate:       date(2025, 1, 29),
			TotalDays:     90,
			Duration:      hrdModels.LeaveDurationMultiDay,
			Reason:        "Maternity leave - expected delivery date: November 15, 2024",
			Status:        hrdModels.LeaveStatusApproved,
			ApprovedBy:    strPtr(ManagerUserID),
			ApprovedAt:    timePtr(date(2024, 10, 25)),
			ApprovalNotes: strPtr("Approved. Congratulations! Best wishes for a healthy delivery."),
		},
	}

	// Seed leave requests
	for _, lr := range leaveRequests {
		result := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"employee_id", "leave_type_id", "start_date", "end_date",
				"total_days", "duration", "reason", "status",
				"approved_by", "approved_at", "approval_notes",
				"rejected_by", "rejected_at", "rejection_notes", "updated_at",
			}),
		}).Create(&lr)

		if result.Error != nil {
			log.Printf("Error seeding leave request for employee %s: %v", lr.EmployeeID, result.Error)
			return result.Error
		}
	}

	log.Println("Leave requests seeded successfully")
	log.Println("Sample scenarios created:")
	log.Println("  - 2 APPROVED past leaves (admin: 3 days annual, manager: 2 days sick)")
	log.Println("  - 2 PENDING upcoming leaves (staff: 5 days annual, admin: 0.5 day half-day)")
	log.Println("  - 2 REJECTED leaves (staff: overlapping, manager: insufficient balance)")
	log.Println("  - 1 CANCELLED leave (admin: personal day)")
	log.Println("  - 1 APPROVED long leave (staff: 90 days maternity)")
	return nil
}
