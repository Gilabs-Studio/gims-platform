package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	crm "github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm/clause"
)

// CRM Settings UUIDs (hex-only: 0-9, a-f)
const (
	// Pipeline Stages (prefix: ca)
	PipelineStageQualificationID = "ca000001-0000-0000-0000-000000000001"
	PipelineStageProposalID      = "ca000001-0000-0000-0000-000000000002"
	PipelineStageNegotiationID   = "ca000001-0000-0000-0000-000000000003"
	PipelineStageClosedWonID     = "ca000001-0000-0000-0000-000000000004"
	PipelineStageClosedLostID    = "ca000001-0000-0000-0000-000000000005"

	// Lead Sources (prefix: cb)
	LeadSourceWebsiteID    = "cb000001-0000-0000-0000-000000000001"
	LeadSourceReferralID   = "cb000001-0000-0000-0000-000000000002"
	LeadSourceColdCallID   = "cb000001-0000-0000-0000-000000000003"
	LeadSourceExhibitionID = "cb000001-0000-0000-0000-000000000004"
	LeadSourceSocialMediaID = "cb000001-0000-0000-0000-000000000005"

	// Lead Statuses (prefix: cc)
	LeadStatusNewID       = "cc000001-0000-0000-0000-000000000001"
	LeadStatusContactedID = "cc000001-0000-0000-0000-000000000002"
	LeadStatusQualifiedID = "cc000001-0000-0000-0000-000000000003"
	LeadStatusProposalID  = "cc000001-0000-0000-0000-000000000004"
	LeadStatusConvertedID = "cc000001-0000-0000-0000-000000000005"
	LeadStatusLostID      = "cc000001-0000-0000-0000-000000000006"

	// Contact Roles (prefix: cd)
	ContactRoleDirectorID   = "cd000001-0000-0000-0000-000000000001"
	ContactRoleManagerID    = "cd000001-0000-0000-0000-000000000002"
	ContactRolePICID        = "cd000001-0000-0000-0000-000000000003"
	ContactRolePurchasingID = "cd000001-0000-0000-0000-000000000004"
	ContactRoleFinanceID    = "cd000001-0000-0000-0000-000000000005"

	// Activity Types (prefix: ce)
	ActivityTypeVisitID    = "ce000001-0000-0000-0000-000000000001"
	ActivityTypeCallID     = "ce000001-0000-0000-0000-000000000002"
	ActivityTypeEmailID    = "ce000001-0000-0000-0000-000000000003"
	ActivityTypeMeetingID  = "ce000001-0000-0000-0000-000000000004"
	ActivityTypeFollowUpID = "ce000001-0000-0000-0000-000000000005"
)

// SeedCRMSettings seeds default CRM settings data
func SeedCRMSettings() error {
	log.Println("Seeding CRM settings...")

	if err := seedPipelineStages(); err != nil {
		return err
	}
	if err := seedLeadSources(); err != nil {
		return err
	}
	if err := seedLeadStatuses(); err != nil {
		return err
	}
	if err := seedContactRoles(); err != nil {
		return err
	}
	if err := seedActivityTypes(); err != nil {
		return err
	}

	log.Println("CRM settings seeded successfully")
	return nil
}

func seedPipelineStages() error {

	stages := []crm.PipelineStage{
		{
			ID:          PipelineStageQualificationID,
			Name:        "Qualification",
			Code:        "QUALIFICATION",
			Order:       1,
			Color:       "#3B82F6",
			Probability: 20,
			IsWon:       false,
			IsLost:      false,
			IsActive:    true,
			Description: "Initial qualification of the lead or opportunity",
		},
		{
			ID:          PipelineStageProposalID,
			Name:        "Proposal",
			Code:        "PROPOSAL",
			Order:       2,
			Color:       "#F59E0B",
			Probability: 50,
			IsWon:       false,
			IsLost:      false,
			IsActive:    true,
			Description: "Proposal has been sent to the prospect",
		},
		{
			ID:          PipelineStageNegotiationID,
			Name:        "Negotiation",
			Code:        "NEGOTIATION",
			Order:       3,
			Color:       "#8B5CF6",
			Probability: 75,
			IsWon:       false,
			IsLost:      false,
			IsActive:    true,
			Description: "Active negotiation with the prospect",
		},
		{
			ID:          PipelineStageClosedWonID,
			Name:        "Closed Won",
			Code:        "CLOSED_WON",
			Order:       4,
			Color:       "#10B981",
			Probability: 100,
			IsWon:       true,
			IsLost:      false,
			IsActive:    true,
			Description: "Deal has been won and closed successfully",
		},
		{
			ID:          PipelineStageClosedLostID,
			Name:        "Closed Lost",
			Code:        "CLOSED_LOST",
			Order:       5,
			Color:       "#EF4444",
			Probability: 0,
			IsWon:       false,
			IsLost:      true,
			IsActive:    true,
			Description: "Deal has been lost",
		},
	}

	for _, stage := range stages {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "code", "color", "probability", "is_won", "is_lost", "updated_at"}),
		}).Create(&stage).Error; err != nil {
			log.Printf("Warning: Failed to seed pipeline stage %s: %v", stage.Name, err)
		}
	}

	return nil
}

func seedLeadSources() error {

	sources := []crm.LeadSource{
		{ID: LeadSourceWebsiteID, Name: "Website", Code: "WEBSITE", Description: "Lead from company website", Order: 1, IsActive: true},
		{ID: LeadSourceReferralID, Name: "Referral", Code: "REFERRAL", Description: "Lead from customer or partner referral", Order: 2, IsActive: true},
		{ID: LeadSourceColdCallID, Name: "Cold Call", Code: "COLD_CALL", Description: "Lead from outbound cold calling", Order: 3, IsActive: true},
		{ID: LeadSourceExhibitionID, Name: "Exhibition", Code: "EXHIBITION", Description: "Lead from trade show or exhibition", Order: 4, IsActive: true},
		{ID: LeadSourceSocialMediaID, Name: "Social Media", Code: "SOCIAL_MEDIA", Description: "Lead from social media channels", Order: 5, IsActive: true},
	}

	for _, source := range sources {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "code", "updated_at"}),
		}).Create(&source).Error; err != nil {
			log.Printf("Warning: Failed to seed lead source %s: %v", source.Name, err)
		}
	}

	return nil
}

func seedLeadStatuses() error {

	statuses := []crm.LeadStatus{
		{ID: LeadStatusNewID, Name: "New", Code: "NEW", Description: "Newly created lead", Score: 10, Color: "#3B82F6", Order: 1, IsActive: true, IsDefault: true, IsConverted: false},
		{ID: LeadStatusContactedID, Name: "Contacted", Code: "CONTACTED", Description: "Lead has been contacted", Score: 30, Color: "#F59E0B", Order: 2, IsActive: true, IsDefault: false, IsConverted: false},
		{ID: LeadStatusQualifiedID, Name: "Qualified", Code: "QUALIFIED", Description: "Lead is qualified for opportunity", Score: 50, Color: "#8B5CF6", Order: 3, IsActive: true, IsDefault: false, IsConverted: false},
		{ID: LeadStatusProposalID, Name: "Proposal Sent", Code: "PROPOSAL_SENT", Description: "Proposal has been sent to lead", Score: 70, Color: "#06B6D4", Order: 4, IsActive: true, IsDefault: false, IsConverted: false},
		{ID: LeadStatusConvertedID, Name: "Converted", Code: "CONVERTED", Description: "Lead has been converted to customer", Score: 100, Color: "#10B981", Order: 5, IsActive: true, IsDefault: false, IsConverted: true},
		{ID: LeadStatusLostID, Name: "Lost", Code: "LOST", Description: "Lead has been lost", Score: 0, Color: "#EF4444", Order: 6, IsActive: true, IsDefault: false, IsConverted: false},
	}

	for _, status := range statuses {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "code", "color", "score", "updated_at"}),
		}).Create(&status).Error; err != nil {
			log.Printf("Warning: Failed to seed lead status %s: %v", status.Name, err)
		}
	}

	return nil
}

func seedContactRoles() error {

	roles := []crm.ContactRole{
		{ID: ContactRoleDirectorID, Name: "Director", Code: "DIRECTOR", Description: "C-level or director role", BadgeColor: "#EF4444", IsActive: true},
		{ID: ContactRoleManagerID, Name: "Manager", Code: "MANAGER", Description: "Department or division manager", BadgeColor: "#F59E0B", IsActive: true},
		{ID: ContactRolePICID, Name: "Person In Charge", Code: "PIC", Description: "Main contact person for operations", BadgeColor: "#3B82F6", IsActive: true},
		{ID: ContactRolePurchasingID, Name: "Purchasing", Code: "PURCHASING", Description: "Purchasing or procurement contact", BadgeColor: "#8B5CF6", IsActive: true},
		{ID: ContactRoleFinanceID, Name: "Finance", Code: "FINANCE", Description: "Finance or accounting contact", BadgeColor: "#10B981", IsActive: true},
	}

	for _, r := range roles {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "code", "updated_at"}),
		}).Create(&r).Error; err != nil {
			log.Printf("Warning: Failed to seed contact role %s: %v", r.Name, err)
		}
	}

	return nil
}

func seedActivityTypes() error {

	types := []crm.ActivityType{
		{ID: ActivityTypeVisitID, Name: "Visit", Code: "VISIT", Description: "On-site customer visit", Icon: "map-pin", BadgeColor: "#3B82F6", Order: 1, IsActive: true},
		{ID: ActivityTypeCallID, Name: "Call", Code: "CALL", Description: "Phone call with customer", Icon: "phone", BadgeColor: "#10B981", Order: 2, IsActive: true},
		{ID: ActivityTypeEmailID, Name: "Email", Code: "EMAIL", Description: "Email communication", Icon: "mail", BadgeColor: "#F59E0B", Order: 3, IsActive: true},
		{ID: ActivityTypeMeetingID, Name: "Meeting", Code: "MEETING", Description: "Scheduled meeting (online or offline)", Icon: "users", BadgeColor: "#8B5CF6", Order: 4, IsActive: true},
		{ID: ActivityTypeFollowUpID, Name: "Follow Up", Code: "FOLLOW_UP", Description: "Follow-up activity on previous interaction", Icon: "refresh-cw", BadgeColor: "#06B6D4", Order: 5, IsActive: true},
	}

	for _, t := range types {
		if err := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "code", "icon", "updated_at"}),
		}).Create(&t).Error; err != nil {
			log.Printf("Warning: Failed to seed activity type %s: %v", t.Name, err)
		}
	}

	return nil
}
