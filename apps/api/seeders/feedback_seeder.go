package seeders

import (
	"encoding/json"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	feedbackModels "github.com/gilabs/gims/api/internal/feedback/data/models"
	"gorm.io/datatypes"
	"gorm.io/gorm/clause"
)

const (
	// Feedback Form IDs — hex-only characters [0-9a-f]
	FeedbackFormMieGacoan1ID = "fb000001-0000-0000-0000-000000000001"
	FeedbackFormMieGacoan2ID = "fb000001-0000-0000-0000-000000000002"
)

// SeedFeedback seeds a default feedback form for each Mie Gacoan outlet.
func SeedFeedback() error {
	log.Println("Seeding default feedback forms...")

	schema1 := map[string]interface{}{
		"questions": []map[string]interface{}{
			{
				"id":       "q1",
				"type":     "rating",
				"label":    "How satisfied are you with our service?",
				"required": true,
				"order":    1,
				"config": map[string]interface{}{
					"min": 1,
					"max": 5,
				},
			},
			{
				"id":       "q2",
				"type":     "multiple_choice",
				"label":    "What did you enjoy most?",
				"required": false,
				"order":    2,
				"config": map[string]interface{}{
					"options":        []string{"Food quality", "Speed of service", "Staff friendliness", "Cleanliness"},
					"allow_multiple": true,
				},
			},
			{
				"id":       "q3",
				"type":     "text",
				"label":    "Any suggestions for us?",
				"required": false,
				"order":    3,
				"config": map[string]interface{}{
					"max_length":  500,
					"placeholder": "Share your thoughts...",
				},
			},
		},
	}

	schemaBytes1, err := json.Marshal(schema1)
	if err != nil {
		return err
	}

	// Use same schema for both outlets (identical default)
	outlet1ID := MieGacoanOutlet1ID
	outlet2ID := MieGacoanOutlet2ID
	adminID := AdminEmployeeID

	forms := []feedbackModels.FeedbackForm{
		{
			ID:         FeedbackFormMieGacoan1ID,
			OutletID:   outlet1ID,
			Title:      "Satisfaction Survey",
			SchemaJSON: datatypes.JSON(schemaBytes1),
			Version:    1,
			IsActive:   true,
			CreatedBy:  &adminID,
			UpdatedBy:  &adminID,
		},
		{
			ID:         FeedbackFormMieGacoan2ID,
			OutletID:   outlet2ID,
			Title:      "Satisfaction Survey",
			SchemaJSON: datatypes.JSON(schemaBytes1),
			Version:    1,
			IsActive:   true,
			CreatedBy:  &adminID,
			UpdatedBy:  &adminID,
		},
	}

	for _, form := range forms {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"updated_at"}),
		}).Create(&form).Error; err != nil {
			log.Printf("Warning: Failed to seed feedback form %s: %v", form.ID, err)
		}
	}

	log.Println("Default feedback forms seeded successfully")
	return nil
}
