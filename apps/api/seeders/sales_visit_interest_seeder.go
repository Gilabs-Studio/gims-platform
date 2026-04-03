package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"gorm.io/gorm/clause"
)

const (
	interestQuestionNeedID          = "a1000001-0000-0000-0000-000000000001"
	interestQuestionBudgetID        = "a1000001-0000-0000-0000-000000000002"
	interestQuestionDecisionMakerID = "a1000001-0000-0000-0000-000000000003"
	interestQuestionTimelineID      = "a1000001-0000-0000-0000-000000000004"
	interestQuestionFitID           = "a1000001-0000-0000-0000-000000000005"

	interestOptionNeedYesID          = "a2000001-0000-0000-0000-000000000001"
	interestOptionNeedNoID           = "a2000001-0000-0000-0000-000000000002"
	interestOptionBudgetYesID        = "a2000001-0000-0000-0000-000000000003"
	interestOptionBudgetNoID         = "a2000001-0000-0000-0000-000000000004"
	interestOptionDecisionMakerYesID = "a2000001-0000-0000-0000-000000000005"
	interestOptionDecisionMakerNoID  = "a2000001-0000-0000-0000-000000000006"
	interestOptionTimelineYesID      = "a2000001-0000-0000-0000-000000000007"
	interestOptionTimelineNoID       = "a2000001-0000-0000-0000-000000000008"
	interestOptionFitYesID           = "a2000001-0000-0000-0000-000000000009"
	interestOptionFitNoID            = "a2000001-0000-0000-0000-00000000000a"
)

// SeedSalesVisitInterestSurvey seeds default yes/no interest survey questions for visit reports.
func SeedSalesVisitInterestSurvey() error {
	log.Println("Seeding sales visit interest survey...")

	questions := []salesModels.SalesVisitInterestQuestion{
		{
			ID:           interestQuestionNeedID,
			QuestionText: "Does the customer have a clear need for this product?",
			IsActive:     true,
			Sequence:     1,
		},
		{
			ID:           interestQuestionBudgetID,
			QuestionText: "Is the budget confirmed?",
			IsActive:     true,
			Sequence:     2,
		},
		{
			ID:           interestQuestionDecisionMakerID,
			QuestionText: "Is the decision maker involved?",
			IsActive:     true,
			Sequence:     3,
		},
		{
			ID:           interestQuestionTimelineID,
			QuestionText: "Is the timeline for purchase defined?",
			IsActive:     true,
			Sequence:     4,
		},
		{
			ID:           interestQuestionFitID,
			QuestionText: "Does our solution fit their requirements?",
			IsActive:     true,
			Sequence:     5,
		},
	}

	for _, question := range questions {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"question_text",
				"is_active",
				"sequence",
				"updated_at",
			}),
		}).Create(&question).Error; err != nil {
			return err
		}
	}

	type optionSeed struct {
		id         string
		questionID string
		optionText string
		score      int
	}

	options := []optionSeed{
		{id: interestOptionNeedYesID, questionID: interestQuestionNeedID, optionText: "Yes", score: 1},
		{id: interestOptionNeedNoID, questionID: interestQuestionNeedID, optionText: "No", score: 0},
		{id: interestOptionBudgetYesID, questionID: interestQuestionBudgetID, optionText: "Yes", score: 1},
		{id: interestOptionBudgetNoID, questionID: interestQuestionBudgetID, optionText: "No", score: 0},
		{id: interestOptionDecisionMakerYesID, questionID: interestQuestionDecisionMakerID, optionText: "Yes", score: 1},
		{id: interestOptionDecisionMakerNoID, questionID: interestQuestionDecisionMakerID, optionText: "No", score: 0},
		{id: interestOptionTimelineYesID, questionID: interestQuestionTimelineID, optionText: "Yes", score: 1},
		{id: interestOptionTimelineNoID, questionID: interestQuestionTimelineID, optionText: "No", score: 0},
		{id: interestOptionFitYesID, questionID: interestQuestionFitID, optionText: "Yes", score: 1},
		{id: interestOptionFitNoID, questionID: interestQuestionFitID, optionText: "No", score: 0},
	}

	for _, seed := range options {
		option := salesModels.SalesVisitInterestOption{
			ID:         seed.id,
			QuestionID: seed.questionID,
			OptionText: seed.optionText,
			Score:      seed.score,
		}
		if err := database.DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"question_id",
				"option_text",
				"score",
				"updated_at",
			}),
		}).Create(&option).Error; err != nil {
			return err
		}
	}

	log.Println("Sales visit interest survey seeded successfully")
	return nil
}
