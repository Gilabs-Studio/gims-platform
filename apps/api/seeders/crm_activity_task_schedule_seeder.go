package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm/clause"
)

// CRM Activity, Task & Schedule UUIDs (hex-only: 0-9, a-f)
const (
	// Activities linked to Customers (prefix: d0)
	ActivityID1 = "d0000001-0000-0000-0000-000000000001"
	ActivityID2 = "d0000001-0000-0000-0000-000000000002"
	ActivityID3 = "d0000001-0000-0000-0000-000000000003"
	ActivityID4 = "d0000001-0000-0000-0000-000000000004"
	ActivityID5 = "d0000001-0000-0000-0000-000000000005"

	// Activities linked to Leads (prefix: d5)
	LeadActivityID1 = "d5000001-0000-0000-0000-000000000001"
	LeadActivityID2 = "d5000001-0000-0000-0000-000000000002"
	LeadActivityID3 = "d5000001-0000-0000-0000-000000000003"
	LeadActivityID4 = "d5000001-0000-0000-0000-000000000004"
	LeadActivityID5 = "d5000001-0000-0000-0000-000000000005"

	// Activities linked to Deals (prefix: d6)
	DealActivityID1 = "d6000001-0000-0000-0000-000000000001"
	DealActivityID2 = "d6000001-0000-0000-0000-000000000002"
	DealActivityID3 = "d6000001-0000-0000-0000-000000000003"

	// Tasks (prefix: d1)
	TaskID1 = "d1000001-0000-0000-0000-000000000001"
	TaskID2 = "d1000001-0000-0000-0000-000000000002"
	TaskID3 = "d1000001-0000-0000-0000-000000000003"
	TaskID4 = "d1000001-0000-0000-0000-000000000004"
	// Admin user tasks (prefix: d1 continued)
	TaskID5 = "d1000001-0000-0000-0000-000000000005"
	TaskID6 = "d1000001-0000-0000-0000-000000000006"
	TaskID7 = "d1000001-0000-0000-0000-000000000007"
	TaskID8 = "d1000001-0000-0000-0000-000000000008"

	// Reminders (prefix: d2)
	ReminderID1 = "d2000001-0000-0000-0000-000000000001"
	ReminderID2 = "d2000001-0000-0000-0000-000000000002"
	ReminderID3 = "d2000001-0000-0000-0000-000000000003"

	// Visit-generated activities (prefix: d7)
	VisitActivityID1 = "d7000001-0000-0000-0000-000000000001"
	VisitActivityID2 = "d7000001-0000-0000-0000-000000000002"
	VisitActivityID3 = "d7000001-0000-0000-0000-000000000003"

	// Schedules (prefix: d3)
	ScheduleID1 = "d3000001-0000-0000-0000-000000000001"
	ScheduleID2 = "d3000001-0000-0000-0000-000000000002"
	ScheduleID3 = "d3000001-0000-0000-0000-000000000003"
)

// SeedCRMActivitiesTasksSchedules seeds sample CRM activities, tasks, reminders and schedules
func SeedCRMActivitiesTasksSchedules() error {
	log.Println("Seeding CRM activities, tasks & schedules...")

	if err := seedCRMActivities(); err != nil {
		return err
	}
	if err := seedCRMTasks(); err != nil {
		return err
	}
	if err := seedCRMReminders(); err != nil {
		return err
	}
	if err := seedCRMSchedules(); err != nil {
		return err
	}

	log.Println("CRM activities, tasks & schedules seeded successfully")
	return nil
}

func seedCRMActivities() error {
	now := time.Now()

	activities := []crm.Activity{
		{
			ID:             ActivityID1,
			Type:           "visit",
			ActivityTypeID: strPtr(ActivityTypeVisitID),
			CustomerID:     strPtr(Customer1ID),
			ContactID:      strPtr(ContactID1),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Visited PT Apotek Sehat Sentosa to discuss Q4 pharmaceutical supply contract renewal",
			Timestamp:      now.Add(-72 * time.Hour),
		},
		{
			ID:             ActivityID2,
			Type:           "call",
			ActivityTypeID: strPtr(ActivityTypeCallID),
			CustomerID:     strPtr(Customer2ID),
			ContactID:      strPtr(ContactID2),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Follow-up call with RS Harapan Kita regarding pending purchase order",
			Timestamp:      now.Add(-48 * time.Hour),
		},
		{
			ID:             ActivityID3,
			Type:           "email",
			ActivityTypeID: strPtr(ActivityTypeEmailID),
			CustomerID:     strPtr(Customer3ID),
			ContactID:      strPtr(ContactID3),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Sent product catalog and price list to Klinik Pratama Medika",
			Timestamp:      now.Add(-24 * time.Hour),
		},
		{
			ID:             ActivityID4,
			Type:           "meeting",
			ActivityTypeID: strPtr(ActivityTypeMeetingID),
			CustomerID:     strPtr(Customer4ID),
			ContactID:      strPtr(ContactID4),
			EmployeeID:     ManagerEmployeeID,
			Description:    "Quarterly business review meeting with RS Siloam Hospitals procurement team",
			Timestamp:      now.Add(-12 * time.Hour),
		},
		{
			ID:             ActivityID5,
			Type:           "follow_up",
			ActivityTypeID: strPtr(ActivityTypeFollowUpID),
			CustomerID:     strPtr(Customer5ID),
			ContactID:      strPtr(ContactID5),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Follow-up on outstanding invoice with Apotek Kimia Farma Cabang Bekasi",
			Timestamp:      now.Add(-6 * time.Hour),
		},
	}

	for _, activity := range activities {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "timestamp"}),
		}).Create(&activity).Error; err != nil {
			log.Printf("Warning: Failed to seed activity %s: %v", activity.ID, err)
		}
	}

	// Seed activities linked to leads
	leadActivities := []crm.Activity{
		{
			ID:             LeadActivityID1,
			Type:           "call",
			ActivityTypeID: strPtr(ActivityTypeCallID),
			LeadID:         strPtr(LeadID1),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Initial qualification call with PT Teknologi Maju Bersama — confirmed budget allocation for Q1 procurement",
			Timestamp:      now.Add(-96 * time.Hour),
		},
		{
			ID:             LeadActivityID2,
			Type:           "email",
			ActivityTypeID: strPtr(ActivityTypeEmailID),
			LeadID:         strPtr(LeadID2),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Sent product brochure and initial pricing proposal to CV Sumber Makmur Abadi",
			Timestamp:      now.Add(-72 * time.Hour),
		},
		{
			ID:             LeadActivityID3,
			Type:           "visit",
			ActivityTypeID: strPtr(ActivityTypeVisitID),
			LeadID:         strPtr(LeadID3),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Site visit to UD Berkah Jaya Sentosa — assessed operational needs and discussed procurement timeline",
			Timestamp:      now.Add(-48 * time.Hour),
		},
		{
			ID:             LeadActivityID4,
			Type:           "meeting",
			ActivityTypeID: strPtr(ActivityTypeMeetingID),
			LeadID:         strPtr(LeadID4),
			EmployeeID:     ManagerEmployeeID,
			Description:    "Discovery meeting with PT Karya Mandiri Sejahtera — aligned on authority chain and decision-making process",
			Timestamp:      now.Add(-24 * time.Hour),
		},
		{
			ID:             LeadActivityID5,
			Type:           "follow_up",
			ActivityTypeID: strPtr(ActivityTypeFollowUpID),
			LeadID:         strPtr(LeadID5),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Follow-up with CV Mitra Usaha Bersama — confirmed need for supply chain solution and requested formal proposal",
			Timestamp:      now.Add(-4 * time.Hour),
		},
	}

	for _, activity := range leadActivities {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "timestamp"}),
		}).Create(&activity).Error; err != nil {
			log.Printf("Warning: Failed to seed lead activity %s: %v", activity.ID, err)
		}
	}

	// Seed activities linked to deals
	dealActivities := []crm.Activity{
		{
			ID:             DealActivityID1,
			Type:           "meeting",
			ActivityTypeID: strPtr(ActivityTypeMeetingID),
			DealID:         strPtr(DealID1),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Demo scheduled with RS Harapan Kita — presenting medical supply package options and bulk pricing tiers",
			Timestamp:      now.Add(-36 * time.Hour),
		},
		{
			ID:             DealActivityID2,
			Type:           "email",
			ActivityTypeID: strPtr(ActivityTypeEmailID),
			DealID:         strPtr(DealID2),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Sent detailed proposal for lab equipment upgrade to PT Apotek Sehat — includes installation timeline and training plan",
			Timestamp:      now.Add(-18 * time.Hour),
		},
		{
			ID:             DealActivityID3,
			Type:           "call",
			ActivityTypeID: strPtr(ActivityTypeCallID),
			DealID:         strPtr(DealID3),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Negotiation call with Klinik Pratama — discussed payment terms and delivery schedule for annual consumable contract",
			Timestamp:      now.Add(-8 * time.Hour),
		},
	}

	for _, activity := range dealActivities {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "timestamp"}),
		}).Create(&activity).Error; err != nil {
			log.Printf("Warning: Failed to seed deal activity %s: %v", activity.ID, err)
		}
	}

	// Seed activities auto-generated from submitted/approved visit reports
	// In production, these are created by the visit-submit usecase; for seeder we create them directly
	visitActivities := []crm.Activity{
		{
			ID:             VisitActivityID1,
			Type:           "visit",
			ActivityTypeID: strPtr(ActivityTypeVisitID),
			CustomerID:     strPtr(Customer1ID),
			ContactID:      strPtr(ContactID1),
			DealID:         strPtr(DealID1),
			VisitReportID:  strPtr(VisitReportID1),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Visit ke PT Apotek Sehat Sentosa — Follow-up penawaran produk farmasi baru. Customer setuju untuk melakukan trial order 100 unit.",
			Timestamp:      now.Add(-7 * 24 * time.Hour),
			Metadata:       strPtr(`{"outcome":"POSITIVE","has_check_in":true,"has_check_out":true}`),
		},
		{
			ID:             VisitActivityID2,
			Type:           "visit",
			ActivityTypeID: strPtr(ActivityTypeVisitID),
			CustomerID:     strPtr(Customer2ID),
			ContactID:      strPtr(ContactID2),
			VisitReportID:  strPtr(VisitReportID2),
			EmployeeID:     SalesRep1EmployeeID,
			Description:    "Visit ke RS Harapan Kita — Presentasi katalog produk ke bagian pengadaan. Diminta untuk submit proposal resmi.",
			Timestamp:      now.Add(-24 * time.Hour),
			Metadata:       strPtr(`{"outcome":"NEUTRAL","has_check_in":false,"has_check_out":false}`),
		},
		{
			ID:             VisitActivityID3,
			Type:           "visit",
			ActivityTypeID: strPtr(ActivityTypeVisitID),
			CustomerID:     strPtr(Customer3ID),
			ContactID:      strPtr(ContactID3),
			LeadID:         strPtr(LeadID2),
			VisitReportID:  strPtr(VisitReportID3),
			EmployeeID:     SalesRep2EmployeeID,
			Description:    "Visit ke Klinik Pratama Medika — Kunjungan pertama ke prospek klinik baru. Berhasil mendapatkan PO pertama senilai 50 juta.",
			Timestamp:      now.Add(-14 * 24 * time.Hour),
			Metadata:       strPtr(`{"outcome":"VERY_POSITIVE","has_check_in":true,"has_check_out":true}`),
		},
	}

	for _, activity := range visitActivities {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"description", "timestamp"}),
		}).Create(&activity).Error; err != nil {
			log.Printf("Warning: Failed to seed visit activity %s: %v", activity.ID, err)
		}
	}

	return nil
}

func seedCRMTasks() error {
	adminID := AdminEmployeeID
	now := time.Now()

	dueTomorrow := now.Add(24 * time.Hour)
	dueNextWeek := now.Add(7 * 24 * time.Hour)
	dueYesterday := now.Add(-24 * time.Hour)

	// make local variables for pointers to constant IDs (cannot take address of constants)
	salesRep1 := SalesRep1EmployeeID
	manager := ManagerEmployeeID
	salesRep2 := SalesRep2EmployeeID
	financeStaff := FinanceStaffEmployeeID

	tasks := []crm.Task{
		{
			ID:           TaskID1,
			Title:        "Follow up with PT Apotek Sehat Sentosa",
			Description:  "Send revised quotation after visit discussion about Q4 contract renewal terms",
			Type:         "follow_up",
			Status:       "pending",
			Priority:     "high",
			DueDate:      &dueTomorrow,
			AssignedTo:   &salesRep1,
			AssignedFrom: &manager,
			LeadID:       strPtr(LeadID1),
			CreatedBy:    &adminID,
		},
		{
			ID:          TaskID2,
			Title:       "Prepare proposal for RS Siloam Hospitals",
			Description: "Create comprehensive proposal for annual medical supply agreement",
			Type:        "general",
			Status:      "in_progress",
			Priority:    "urgent",
			DueDate:     &dueNextWeek,
			AssignedTo:  &salesRep2,
			DealID:      strPtr(DealID1),
			CreatedBy:   &adminID,
		},
		{
			ID:          TaskID3,
			Title:       "Schedule call with Klinik Pratama Medika",
			Description: "Discuss product catalog items and arrange product demo",
			Type:        "call",
			Status:      "pending",
			Priority:    "medium",
			DueDate:     &dueTomorrow,
			AssignedTo:  &salesRep2,
			LeadID:      strPtr(LeadID3),
			CreatedBy:   &adminID,
		},
		{
			ID:          TaskID4,
			Title:       "Collect overdue payment from Kimia Farma",
			Description: "Follow up on invoice payment that is past due date",
			Type:        "follow_up",
			Status:      "pending",
			Priority:    "high",
			DueDate:     &dueYesterday,
			AssignedTo:  &financeStaff,
			CreatedBy:   &adminID,
		},
		// Admin user tasks — used to test action buttons as the admin account
		{
			ID:           TaskID5,
			Title:        "Review Q4 Sales Pipeline",
			Description:  "Analyze all active deals in the pipeline and prioritize closing opportunities",
			Type:         "general",
			Status:       "pending",
			Priority:     "high",
			DueDate:      &dueNextWeek,
			AssignedTo:   &adminID,
			AssignedFrom: &adminID,
			DealID:       strPtr(DealID1),
			CreatedBy:    &adminID,
		},
		{
			ID:           TaskID6,
			Title:        "Prepare monthly CRM activity report",
			Description:  "Compile activity logs and visit reports for the monthly management review",
			Type:         "general",
			Status:       "in_progress",
			Priority:     "medium",
			DueDate:      &dueNextWeek,
			AssignedTo:   &adminID,
			AssignedFrom: &adminID,
			CreatedBy:    &adminID,
		},
		{
			ID:           TaskID7,
			Title:        "System onboarding check for new leads",
			Description:  "Verify that newly imported leads have correct assignment and contact info",
			Type:         "general",
			Status:       "completed",
			Priority:     "low",
			DueDate:      &dueYesterday,
			AssignedTo:   &adminID,
			AssignedFrom: &adminID,
			LeadID:       strPtr(LeadID2),
			CreatedBy:    &adminID,
		},
		{
			ID:           TaskID8,
			Title:        "Send product brochure to PT Kimia Farma",
			Description:  "Email updated product brochure with pricing to the purchasing contact",
			Type:         "email",
			Status:       "pending",
			Priority:     "urgent",
			DueDate:      &dueTomorrow,
			AssignedTo:   &adminID,
			AssignedFrom: &manager,
			CreatedBy:    &adminID,
		},
	}

	for _, task := range tasks {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"title", "status", "priority", "updated_at"}),
		}).Create(&task).Error; err != nil {
			log.Printf("Warning: Failed to seed task %s: %v", task.ID, err)
		}
	}

	return nil
}

func seedCRMReminders() error {
	adminID := AdminEmployeeID
	now := time.Now()

	reminders := []crm.Reminder{
		{
			ID:           ReminderID1,
			TaskID:       TaskID1,
			RemindAt:     now.Add(20 * time.Hour),
			ReminderType: "in_app",
			IsSent:       false,
			Message:      "Reminder: Follow up with PT Apotek Sehat Sentosa is due tomorrow",
			CreatedBy:    &adminID,
		},
		{
			ID:           ReminderID2,
			TaskID:       TaskID2,
			RemindAt:     now.Add(6 * 24 * time.Hour),
			ReminderType: "email",
			IsSent:       false,
			Message:      "RS Siloam proposal deadline approaching - 1 day remaining",
			CreatedBy:    &adminID,
		},
		{
			ID:           ReminderID3,
			TaskID:       TaskID4,
			RemindAt:     now.Add(2 * time.Hour),
			ReminderType: "in_app",
			IsSent:       false,
			Message:      "URGENT: Overdue payment collection from Kimia Farma needs attention",
			CreatedBy:    &adminID,
		},
	}

	for _, reminder := range reminders {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"remind_at", "message"}),
		}).Create(&reminder).Error; err != nil {
			log.Printf("Warning: Failed to seed reminder %s: %v", reminder.ID, err)
		}
	}

	return nil
}

func seedCRMSchedules() error {
	adminID := AdminEmployeeID
	now := time.Now()

	tomorrow9am := time.Date(now.Year(), now.Month(), now.Day()+1, 9, 0, 0, 0, now.Location())
	tomorrow11am := time.Date(now.Year(), now.Month(), now.Day()+1, 11, 0, 0, 0, now.Location())
	nextWeek2pm := time.Date(now.Year(), now.Month(), now.Day()+7, 14, 0, 0, 0, now.Location())
	nextWeek4pm := time.Date(now.Year(), now.Month(), now.Day()+7, 16, 0, 0, 0, now.Location())
	dayAfter10am := time.Date(now.Year(), now.Month(), now.Day()+2, 10, 0, 0, 0, now.Location())
	dayAfter12pm := time.Date(now.Year(), now.Month(), now.Day()+2, 12, 0, 0, 0, now.Location())

	taskID1 := TaskID1
	taskID2 := TaskID2

	schedules := []crm.Schedule{
		{
			ID:                    ScheduleID1,
			TaskID:                &taskID1,
			EmployeeID:            SalesRep1EmployeeID,
			Title:                 "Visit PT Apotek Sehat Sentosa - Contract Follow-up",
			Description:           "Deliver revised quotation and discuss contract terms",
			ScheduledAt:           tomorrow9am,
			EndAt:                 &tomorrow11am,
			Status:                "confirmed",
			ReminderMinutesBefore: 60,
			CreatedBy:             &adminID,
		},
		{
			ID:                    ScheduleID2,
			TaskID:                &taskID2,
			EmployeeID:            SalesRep2EmployeeID,
			Title:                 "RS Siloam Hospitals Proposal Presentation",
			Description:           "Present annual medical supply proposal to procurement team",
			ScheduledAt:           nextWeek2pm,
			EndAt:                 &nextWeek4pm,
			Status:                "pending",
			ReminderMinutesBefore: 120,
			CreatedBy:             &adminID,
		},
		{
			ID:                    ScheduleID3,
			EmployeeID:            ManagerEmployeeID,
			Title:                 "Team Sales Review Meeting",
			Description:           "Weekly sales team meeting to review pipeline and targets",
			ScheduledAt:           dayAfter10am,
			EndAt:                 &dayAfter12pm,
			Status:                "confirmed",
			ReminderMinutesBefore: 30,
			CreatedBy:             &adminID,
		},
	}

	for _, schedule := range schedules {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"title", "status", "updated_at"}),
		}).Create(&schedule).Error; err != nil {
			log.Printf("Warning: Failed to seed schedule %s: %v", schedule.ID, err)
		}
	}

	return nil
}


