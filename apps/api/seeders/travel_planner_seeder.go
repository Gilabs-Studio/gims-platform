package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	travelPlanner "github.com/gilabs/gims/api/internal/travel_planner/data/models"
	"gorm.io/gorm"
)

// Travel Planner seed IDs (hex-only UUIDs)
const (
	TravelPlanLogisticsID = "f1000001-0000-0000-0000-000000000001"
	TravelPlanMilestoneID = "f1000001-0000-0000-0000-000000000002"
)

// SeedTravelPlanner seeds baseline travel planner records.
// Relation to master data is represented through CreatedBy (employee IDs from constants.go).
func SeedTravelPlanner() error {
	log.Println("Seeding travel planner records...")

	adminID := AdminEmployeeID
	managerID := ManagerEmployeeID

	plans := []travelPlanner.TravelPlan{
		{
			ID:           TravelPlanLogisticsID,
			Code:         "TPL-SEED-0001",
			Title:        "Jabodetabek Medical Distribution",
			Mode:         travelPlanner.TravelModeLogistic,
			StartDate:    time.Date(2026, time.March, 2, 0, 0, 0, 0, time.UTC),
			EndDate:      time.Date(2026, time.March, 3, 0, 0, 0, 0, time.UTC),
			Status:       travelPlanner.TravelPlanStatusActive,
			BudgetAmount: 18000000,
			Notes:        "Distribution route linked to master-data customers and warehouse checkpoints.",
			CreatedBy:    &adminID,
			Days: []travelPlanner.TravelPlanDay{
				{
					ID:          "f1100001-0000-0000-0000-000000000001",
					DayIndex:    1,
					DayDate:     time.Date(2026, time.March, 2, 0, 0, 0, 0, time.UTC),
					Summary:     "Pickup from HQ warehouse then deliver to Jakarta medical accounts.",
					WeatherRisk: travelPlanner.TravelWeatherRiskLow,
					Stops: []travelPlanner.TravelPlanStop{
						{
							ID:         "f1200001-0000-0000-0000-000000000001",
							PlaceName:  "GILABS Central Warehouse Jakarta",
							Latitude:   -6.2088,
							Longitude:  106.8456,
							Category:   travelPlanner.TravelStopCategoryPickup,
							OrderIndex: 1,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Loading point for customer deliveries",
						},
						{
							ID:         "f1200001-0000-0000-0000-000000000002",
							PlaceName:  "PT Apotek Sehat Sentosa",
							Latitude:   -6.1754,
							Longitude:  106.8272,
							Category:   travelPlanner.TravelStopCategoryDropoff,
							OrderIndex: 2,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Customer delivery from master customer list",
						},
						{
							ID:         "f1200001-0000-0000-0000-000000000003",
							PlaceName:  "RS Harapan Kita Jakarta",
							Latitude:   -6.1944,
							Longitude:  106.7972,
							Category:   travelPlanner.TravelStopCategoryDropoff,
							OrderIndex: 3,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Hospital account delivery",
						},
					},
					Notes: []travelPlanner.TravelPlanDayNote{
						{
							ID:         "f1300001-0000-0000-0000-000000000001",
							IconTag:    "warehouse",
							NoteText:   "Vehicle and shipment checklist approved by operations.",
							NoteTime:   "07:15",
							OrderIndex: 1,
						},
					},
				},
				{
					ID:          "f1100001-0000-0000-0000-000000000002",
					DayIndex:    2,
					DayDate:     time.Date(2026, time.March, 3, 0, 0, 0, 0, time.UTC),
					Summary:     "Continue route to Bekasi area and return to warehouse.",
					WeatherRisk: travelPlanner.TravelWeatherRiskMedium,
					Stops: []travelPlanner.TravelPlanStop{
						{
							ID:         "f1200001-0000-0000-0000-000000000004",
							PlaceName:  "Apotek Kimia Farma Bekasi",
							Latitude:   -6.2383,
							Longitude:  106.9756,
							Category:   travelPlanner.TravelStopCategoryDropoff,
							OrderIndex: 1,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Customer replenishment",
						},
						{
							ID:         "f1200001-0000-0000-0000-000000000005",
							PlaceName:  "Cikarang Rest Point",
							Latitude:   -6.2980,
							Longitude:  107.1530,
							Category:   travelPlanner.TravelStopCategoryRest,
							OrderIndex: 2,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Driver break and fuel check",
						},
						{
							ID:         "f1200001-0000-0000-0000-000000000006",
							PlaceName:  "GILABS Central Warehouse Jakarta",
							Latitude:   -6.2088,
							Longitude:  106.8456,
							Category:   travelPlanner.TravelStopCategoryCheckpoint,
							OrderIndex: 3,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Return checkpoint",
						},
					},
					Notes: []travelPlanner.TravelPlanDayNote{
						{
							ID:         "f1300001-0000-0000-0000-000000000002",
							IconTag:    "warning",
							NoteText:   "Monitor rain probability before entering Cikarang route.",
							NoteTime:   "09:00",
							OrderIndex: 1,
						},
					},
				},
			},
		},
		{
			ID:           TravelPlanMilestoneID,
			Code:         "TPL-SEED-0002",
			Title:        "Q2 Customer Milestone Visit",
			Mode:         travelPlanner.TravelModeMilestone,
			StartDate:    time.Date(2026, time.April, 7, 0, 0, 0, 0, time.UTC),
			EndDate:      time.Date(2026, time.April, 8, 0, 0, 0, 0, time.UTC),
			Status:       travelPlanner.TravelPlanStatusDraft,
			BudgetAmount: 9500000,
			Notes:        "Milestone trip for sales-management review across key customer locations.",
			CreatedBy:    &managerID,
			Days: []travelPlanner.TravelPlanDay{
				{
					ID:          "f1100001-0000-0000-0000-000000000003",
					DayIndex:    1,
					DayDate:     time.Date(2026, time.April, 7, 0, 0, 0, 0, time.UTC),
					Summary:     "Kickoff milestone and customer contract review.",
					WeatherRisk: travelPlanner.TravelWeatherRiskLow,
					Stops: []travelPlanner.TravelPlanStop{
						{
							ID:         "f1200001-0000-0000-0000-000000000007",
							PlaceName:  "GILABS HQ Meeting Room",
							Latitude:   -6.2024,
							Longitude:  106.8166,
							Category:   travelPlanner.TravelStopCategoryCheckpoint,
							OrderIndex: 1,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Milestone kickoff with sales and finance stakeholders",
						},
						{
							ID:         "f1200001-0000-0000-0000-000000000008",
							PlaceName:  "Klinik Pratama Medika",
							Latitude:   -6.1648,
							Longitude:  106.8224,
							Category:   travelPlanner.TravelStopCategoryDropoff,
							OrderIndex: 2,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Customer milestone presentation",
						},
					},
					Notes: []travelPlanner.TravelPlanDayNote{
						{
							ID:         "f1300001-0000-0000-0000-000000000003",
							IconTag:    "flag",
							NoteText:   "Collect stakeholder sign-off for Q2 milestone deliverables.",
							NoteTime:   "10:30",
							OrderIndex: 1,
						},
					},
				},
				{
					ID:          "f1100001-0000-0000-0000-000000000004",
					DayIndex:    2,
					DayDate:     time.Date(2026, time.April, 8, 0, 0, 0, 0, time.UTC),
					Summary:     "Finance checkpoint and closure of milestone documentation.",
					WeatherRisk: travelPlanner.TravelWeatherRiskLow,
					Stops: []travelPlanner.TravelPlanStop{
						{
							ID:         "f1200001-0000-0000-0000-000000000009",
							PlaceName:  "GILABS Finance Division Office",
							Latitude:   -6.2030,
							Longitude:  106.8230,
							Category:   travelPlanner.TravelStopCategoryCheckpoint,
							OrderIndex: 1,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Budget and advance review",
						},
						{
							ID:         "f1200001-0000-0000-0000-00000000000a",
							PlaceName:  "GILABS HQ Archive",
							Latitude:   -6.2018,
							Longitude:  106.8199,
							Category:   travelPlanner.TravelStopCategoryCheckpoint,
							OrderIndex: 2,
							Source:     travelPlanner.TravelStopSourceManual,
							Note:       "Store signed documents",
						},
					},
					Notes: []travelPlanner.TravelPlanDayNote{
						{
							ID:         "f1300001-0000-0000-0000-000000000004",
							IconTag:    "check",
							NoteText:   "Confirm completion report before end of day.",
							NoteTime:   "15:45",
							OrderIndex: 1,
						},
					},
				},
			},
		},
	}

	for _, plan := range plans {
		currentPlan := plan
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("id = ?", currentPlan.ID).Delete(&travelPlanner.TravelPlan{}).Error; err != nil {
				return err
			}
			if err := tx.Create(&currentPlan).Error; err != nil {
				return err
			}
			return nil
		})
		if err != nil {
			log.Printf("Warning: Failed to seed travel plan %s: %v", plan.Code, err)
		}
	}

	log.Println("Travel planner records seeded successfully")
	return nil
}
