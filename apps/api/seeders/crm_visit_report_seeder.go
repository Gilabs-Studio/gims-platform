package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm/clause"
)

// Visit Report UUIDs (prefix: d1 — hex-only: 0-9, a-f)
const (
	VisitReportID1 = "d1000001-0000-0000-0000-000000000001"
	VisitReportID2 = "d1000001-0000-0000-0000-000000000002"
	VisitReportID3 = "d1000001-0000-0000-0000-000000000003"
	VisitReportID4 = "d1000001-0000-0000-0000-000000000004"

	// Visit Report Details (prefix: d2)
	VisitReportDetailID1 = "d2000001-0000-0000-0000-000000000001"
	VisitReportDetailID2 = "d2000001-0000-0000-0000-000000000002"
	VisitReportDetailID3 = "d2000001-0000-0000-0000-000000000003"
	VisitReportDetailID4 = "d2000001-0000-0000-0000-000000000004"

	// Visit Report Progress History (prefix: d3)
	VisitReportHistoryID1 = "d3000001-0000-0000-0000-000000000001"
	VisitReportHistoryID2 = "d3000001-0000-0000-0000-000000000002"
	VisitReportHistoryID3 = "d3000001-0000-0000-0000-000000000003"
	VisitReportHistoryID4 = "d3000001-0000-0000-0000-000000000004"
	VisitReportHistoryID5 = "d3000001-0000-0000-0000-000000000005"
)

// SeedCRMVisitReports seeds sample visit reports with various statuses
func SeedCRMVisitReports() error {
	log.Println("Seeding CRM visit reports...")

	adminID := AdminEmployeeID
	salesRep1 := SalesRep1EmployeeID
	salesRep2 := SalesRep2EmployeeID
	managerID := ManagerEmployeeID

	customer1 := Customer1ID
	customer2 := Customer2ID
	customer3 := Customer3ID
	customer4 := Customer4ID

	contact1 := ContactID1
	contact2 := ContactID2
	contact3 := ContactID3

	deal1 := DealID1
	lead2 := LeadID2

	today := time.Now()
	yesterday := today.AddDate(0, 0, -1)
	lastWeek := today.AddDate(0, 0, -7)
	twoWeeksAgo := today.AddDate(0, 0, -14)

	checkInLoc1 := `{"latitude": -6.2088, "longitude": 106.8456, "accuracy": 15.5}`
	checkOutLoc1 := `{"latitude": -6.2088, "longitude": 106.8456, "accuracy": 12.3}`
	checkInLoc3 := `{"latitude": -6.9147, "longitude": 107.6098, "accuracy": 10.0}`
	checkOutLoc3 := `{"latitude": -6.9147, "longitude": 107.6098, "accuracy": 8.5}`

	scheduledMorning := time.Date(today.Year(), today.Month(), today.Day(), 9, 0, 0, 0, time.Local)
	scheduledAfternoon := time.Date(today.Year(), today.Month(), today.Day(), 14, 0, 0, 0, time.Local)

	checkIn1 := lastWeek.Add(9 * time.Hour)
	checkOut1 := lastWeek.Add(11 * time.Hour)
	checkIn3 := twoWeeksAgo.Add(10 * time.Hour)
	checkOut3 := twoWeeksAgo.Add(12 * time.Hour)

	visitReports := []crm.VisitReport{
		{
			// Visit 1: Approved — completed visit with check-in/out
			ID:               VisitReportID1,
			Code:             "VISIT-" + lastWeek.Format("200601") + "-00001",
			EmployeeID:       salesRep1,
			CustomerID:       &customer1,
			ContactID:        &contact1,
			DealID:           &deal1,
			VisitDate:        lastWeek,
			ScheduledTime:    &scheduledMorning,
			ActualTime:       &checkIn1,
			CheckInAt:        &checkIn1,
			CheckOutAt:       &checkOut1,
			CheckInLocation:  &checkInLoc1,
			CheckOutLocation: &checkOutLoc1,
			Address:          "Jl. Sudirman No. 45, Jakarta Selatan",
			ContactPerson:    "Ahmad Setiawan",
			ContactPhone:     "081234567890",
			Purpose:          "Follow-up penawaran produk farmasi baru",
			Notes:            "Customer tertarik dengan produk lini baru",
			Result:           "Customer setuju untuk melakukan trial order 100 unit",
			Outcome:          string(crm.VisitReportOutcomePositive),
			NextSteps:        "Kirim quotation dan sample produk dalam 3 hari",
			Status:           crm.VisitReportStatusApproved,
			ApprovedBy:       &managerID,
			ApprovedAt:       timePtr(lastWeek.Add(24 * time.Hour)),
			CreatedBy:        &salesRep1,
		},
		{
			// Visit 2: Submitted — waiting for approval
			ID:            VisitReportID2,
			Code:          "VISIT-" + yesterday.Format("200601") + "-00002",
			EmployeeID:    salesRep1,
			CustomerID:    &customer2,
			ContactID:     &contact2,
			VisitDate:     yesterday,
			ScheduledTime: &scheduledAfternoon,
			Address:       "Jl. Gatot Subroto No. 10, Jakarta Selatan",
			ContactPerson: "Siti Rahmawati",
			ContactPhone:  "082345678901",
			Purpose:       "Presentasi katalog produk ke bagian pengadaan",
			Notes:         "Meeting berjalan baik, menunggu review internal RS",
			Result:        "Diminta untuk submit proposal resmi minggu depan",
			Outcome:       string(crm.VisitReportOutcomeNeutral),
			NextSteps:     "Siapkan proposal dan kirim via email",
			Status:        crm.VisitReportStatusSubmitted,
			CreatedBy:     &salesRep1,
		},
		{
			// Visit 3: Approved — completed visit with check-in/out, linked to lead
			ID:               VisitReportID3,
			Code:             "VISIT-" + twoWeeksAgo.Format("200601") + "-00003",
			EmployeeID:       salesRep2,
			CustomerID:       &customer3,
			ContactID:        &contact3,
			LeadID:           &lead2,
			VisitDate:        twoWeeksAgo,
			ScheduledTime:    &scheduledMorning,
			ActualTime:       &checkIn3,
			CheckInAt:        &checkIn3,
			CheckOutAt:       &checkOut3,
			CheckInLocation:  &checkInLoc3,
			CheckOutLocation: &checkOutLoc3,
			Address:          "Jl. Dago No. 88, Bandung",
			ContactPerson:    "Budi Santoso",
			ContactPhone:     "083456789012",
			Purpose:          "Kunjungan pertama ke prospek klinik baru",
			Notes:            "Klinik baru buka, membutuhkan supply obat reguler",
			Result:           "Berhasil mendapatkan PO pertama senilai 50 juta",
			Outcome:          string(crm.VisitReportOutcomeVeryPositive),
			NextSteps:        "Proses order dan jadwalkan pengiriman",
			Status:           crm.VisitReportStatusApproved,
			ApprovedBy:       &managerID,
			ApprovedAt:       timePtr(twoWeeksAgo.Add(48 * time.Hour)),
			CreatedBy:        &salesRep2,
		},
		{
			// Visit 4: Draft — planned visit, not yet conducted
			ID:            VisitReportID4,
			Code:          "VISIT-" + today.Format("200601") + "-00004",
			EmployeeID:    salesRep2,
			CustomerID:    &customer4,
			VisitDate:     today.AddDate(0, 0, 3),
			ScheduledTime: &scheduledAfternoon,
			Address:       "Jl. Mayjen Sungkono No. 89, Surabaya",
			ContactPerson: "Dewi Lestari",
			ContactPhone:  "084567890123",
			Purpose:       "Diskusi perpanjangan kontrak supply tahunan",
			Notes:         "",
			Status:        crm.VisitReportStatusDraft,
			CreatedBy:     &salesRep2,
		},
	}

	for _, visit := range visitReports {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&visit).Error; err != nil {
			log.Printf("Warning: Failed to seed visit report %s: %v", visit.Code, err)
		}
	}

	// Seed progress history
	if err := seedVisitReportHistory(salesRep1, salesRep2, managerID, adminID, lastWeek, yesterday, twoWeeksAgo); err != nil {
		log.Printf("Warning: Failed to seed visit report history: %v", err)
	}

	log.Println("CRM visit reports seeded successfully")
	return nil
}

func seedVisitReportHistory(salesRep1, salesRep2, managerID, adminID string, lastWeek, yesterday, twoWeeksAgo time.Time) error {
	histories := []crm.VisitReportProgressHistory{
		{
			// Visit 1: draft → submitted
			ID:            VisitReportHistoryID1,
			VisitReportID: VisitReportID1,
			FromStatus:    crm.VisitReportStatusDraft,
			ToStatus:      crm.VisitReportStatusSubmitted,
			Notes:         "Visit report submitted for approval",
			ChangedBy:     &salesRep1,
			CreatedAt:     lastWeek.Add(12 * time.Hour),
		},
		{
			// Visit 1: submitted → approved
			ID:            VisitReportHistoryID2,
			VisitReportID: VisitReportID1,
			FromStatus:    crm.VisitReportStatusSubmitted,
			ToStatus:      crm.VisitReportStatusApproved,
			Notes:         "Approved — good follow-up, proceed with quotation",
			ChangedBy:     &managerID,
			CreatedAt:     lastWeek.Add(24 * time.Hour),
		},
		{
			// Visit 2: draft → submitted
			ID:            VisitReportHistoryID3,
			VisitReportID: VisitReportID2,
			FromStatus:    crm.VisitReportStatusDraft,
			ToStatus:      crm.VisitReportStatusSubmitted,
			Notes:         "Submitted for manager review",
			ChangedBy:     &salesRep1,
			CreatedAt:     yesterday.Add(16 * time.Hour),
		},
		{
			// Visit 3: draft → submitted
			ID:            VisitReportHistoryID4,
			VisitReportID: VisitReportID3,
			FromStatus:    crm.VisitReportStatusDraft,
			ToStatus:      crm.VisitReportStatusSubmitted,
			Notes:         "Visit completed, submitting report",
			ChangedBy:     &salesRep2,
			CreatedAt:     twoWeeksAgo.Add(13 * time.Hour),
		},
		{
			// Visit 3: submitted → approved
			ID:            VisitReportHistoryID5,
			VisitReportID: VisitReportID3,
			FromStatus:    crm.VisitReportStatusSubmitted,
			ToStatus:      crm.VisitReportStatusApproved,
			Notes:         "Excellent result — lead converted successfully",
			ChangedBy:     &managerID,
			CreatedAt:     twoWeeksAgo.Add(48 * time.Hour),
		},
	}

	for _, history := range histories {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"created_at"}),
		}).Create(&history).Error; err != nil {
			log.Printf("Warning: Failed to seed visit report history %s: %v", history.ID, err)
		}
	}

	return nil
}

