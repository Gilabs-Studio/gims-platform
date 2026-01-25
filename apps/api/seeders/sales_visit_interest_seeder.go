package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
)

// SeedSalesVisitInterestQuestions seeds default survey questions
func SeedSalesVisitInterestQuestions() error {
	db := database.DB

	var count int64
	db.Model(&salesModels.SalesVisitInterestQuestion{}).Count(&count)
	if count > 0 {
		log.Println("Sales visit interest questions already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales visit interest questions...")

	questions := []struct {
		Text     string
		Sequence int
	}{
		{Text: "Does the customer have a clear need for this product?", Sequence: 1},
		{Text: "Is the budget confirmed?", Sequence: 2},
		{Text: "Is the decision maker involved?", Sequence: 3},
		{Text: "Is the timeline for purchase defined?", Sequence: 4},
		{Text: "Does our solution fit their requirements?", Sequence: 5},
	}

	for _, qData := range questions {
		question := salesModels.SalesVisitInterestQuestion{
			QuestionText: qData.Text,
			Sequence:     qData.Sequence,
			IsActive:     true,
		}

		if err := db.Create(&question).Error; err != nil {
			log.Printf("Warning: Failed to create question %s: %v", qData.Text, err)
			continue
		}

		// Create Options (Yes/No)
		options := []struct {
			Text  string
			Score int
		}{
			{Text: "Yes", Score: 1},
			{Text: "No", Score: 0},
		}

		for _, optData := range options {
			option := salesModels.SalesVisitInterestOption{
				QuestionID: question.ID,
				OptionText: optData.Text,
				Score:      optData.Score,
			}
			if err := db.Create(&option).Error; err != nil {
				log.Printf("Warning: Failed to create option %s: %v", optData.Text, err)
			}
		}
	}

	log.Println("Sales visit interest questions seeded successfully")
	return nil
}
