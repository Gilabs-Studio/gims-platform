package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm/clause"
)

// Evaluation Group IDs (Fixed UUIDs)
const (
	EvalGroupPerformanceID = "e0000001-0000-0000-0000-000000000001"
	EvalGroupLeadershipID  = "e0000001-0000-0000-0000-000000000002"
	EvalGroupTechnicalID   = "e0000001-0000-0000-0000-000000000003"
)

// Evaluation Criteria IDs (Fixed UUIDs)
const (
	// Performance group criteria
	CriteriaProductivityID = "ec000001-0000-0000-0000-000000000001"
	CriteriaQualityID      = "ec000001-0000-0000-0000-000000000002"
	CriteriaInitiativeID   = "ec000001-0000-0000-0000-000000000003"
	CriteriaTeamworkID     = "ec000001-0000-0000-0000-000000000004"
	CriteriaAttendanceID   = "ec000001-0000-0000-0000-000000000005"
	// Leadership group criteria
	CriteriaDecisionMakingID = "ec000002-0000-0000-0000-000000000001"
	CriteriaCommunicationID  = "ec000002-0000-0000-0000-000000000002"
	CriteriaMentoringID      = "ec000002-0000-0000-0000-000000000003"
	CriteriaStrategicID      = "ec000002-0000-0000-0000-000000000004"
	// Technical group criteria
	CriteriaTechSkillsID     = "ec000003-0000-0000-0000-000000000001"
	CriteriaProblemSolvingID = "ec000003-0000-0000-0000-000000000002"
	CriteriaInnovationID     = "ec000003-0000-0000-0000-000000000003"
	CriteriaDocumentationID  = "ec000003-0000-0000-0000-000000000004"
)

// Employee Evaluation IDs (Fixed UUIDs)
const (
	EvalStaffPerformanceID = "ee000001-0000-0000-0000-000000000001"
	EvalStaffLeadershipID  = "ee000001-0000-0000-0000-000000000002"
	EvalManagerTechnicalID = "ee000001-0000-0000-0000-000000000003"
)

// Employee Evaluation Criteria Score IDs (Fixed UUIDs)
const (
	EvalScoreID01 = "es000001-0000-0000-0000-000000000001"
	EvalScoreID02 = "es000001-0000-0000-0000-000000000002"
	EvalScoreID03 = "es000001-0000-0000-0000-000000000003"
	EvalScoreID04 = "es000001-0000-0000-0000-000000000004"
	EvalScoreID05 = "es000001-0000-0000-0000-000000000005"
	EvalScoreID06 = "es000001-0000-0000-0000-000000000006"
	EvalScoreID07 = "es000001-0000-0000-0000-000000000007"
	EvalScoreID08 = "es000001-0000-0000-0000-000000000008"
	EvalScoreID09 = "es000001-0000-0000-0000-000000000009"
)

// SeedEvaluationGroups seeds evaluation group templates
func SeedEvaluationGroups() error {
	groups := []models.EvaluationGroup{
		{
			ID:          EvalGroupPerformanceID,
			Name:        "Performance Review",
			Description: stringPtr("Standard performance review template for evaluating employee work quality, productivity, and professional behavior"),
			IsActive:    true,
		},
		{
			ID:          EvalGroupLeadershipID,
			Name:        "Leadership Competency",
			Description: stringPtr("Leadership assessment template for managers and supervisors covering decision-making, communication, and strategic thinking"),
			IsActive:    true,
		},
		{
			ID:          EvalGroupTechnicalID,
			Name:        "Technical Proficiency",
			Description: stringPtr("Technical skills assessment for IT and engineering roles covering problem-solving, innovation, and documentation"),
			IsActive:    true,
		},
	}

	for _, g := range groups {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "is_active", "updated_at"}),
		}).Create(&g)
		if result.Error != nil {
			log.Printf("Error seeding evaluation group %s: %v", g.Name, result.Error)
			return result.Error
		}
	}

	log.Println("Evaluation groups seeded successfully")
	return nil
}

// SeedEvaluationCriteria seeds evaluation criteria for each group
func SeedEvaluationCriteria() error {
	criteria := []models.EvaluationCriteria{
		// Performance Review criteria (weights sum to 100)
		{
			ID:                CriteriaProductivityID,
			EvaluationGroupID: EvalGroupPerformanceID,
			Name:              "Productivity & Output",
			Description:       stringPtr("Ability to complete tasks on time and meet targets consistently"),
			Weight:            30,
			MaxScore:          100,
			SortOrder:         1,
		},
		{
			ID:                CriteriaQualityID,
			EvaluationGroupID: EvalGroupPerformanceID,
			Name:              "Quality of Work",
			Description:       stringPtr("Accuracy, thoroughness, and attention to detail in deliverables"),
			Weight:            25,
			MaxScore:          100,
			SortOrder:         2,
		},
		{
			ID:                CriteriaInitiativeID,
			EvaluationGroupID: EvalGroupPerformanceID,
			Name:              "Initiative & Proactiveness",
			Description:       stringPtr("Willingness to take on new responsibilities and suggest improvements"),
			Weight:            15,
			MaxScore:          100,
			SortOrder:         3,
		},
		{
			ID:                CriteriaTeamworkID,
			EvaluationGroupID: EvalGroupPerformanceID,
			Name:              "Teamwork & Collaboration",
			Description:       stringPtr("Ability to work effectively with team members and across departments"),
			Weight:            20,
			MaxScore:          100,
			SortOrder:         4,
		},
		{
			ID:                CriteriaAttendanceID,
			EvaluationGroupID: EvalGroupPerformanceID,
			Name:              "Attendance & Punctuality",
			Description:       stringPtr("Consistency in attendance, punctuality, and adherence to work schedule"),
			Weight:            10,
			MaxScore:          100,
			SortOrder:         5,
		},

		// Leadership Competency criteria (weights sum to 100)
		{
			ID:                CriteriaDecisionMakingID,
			EvaluationGroupID: EvalGroupLeadershipID,
			Name:              "Decision Making",
			Description:       stringPtr("Ability to make sound decisions under pressure with available information"),
			Weight:            30,
			MaxScore:          100,
			SortOrder:         1,
		},
		{
			ID:                CriteriaCommunicationID,
			EvaluationGroupID: EvalGroupLeadershipID,
			Name:              "Communication Skills",
			Description:       stringPtr("Effectiveness in conveying ideas, providing feedback, and active listening"),
			Weight:            25,
			MaxScore:          100,
			SortOrder:         2,
		},
		{
			ID:                CriteriaMentoringID,
			EvaluationGroupID: EvalGroupLeadershipID,
			Name:              "Mentoring & Development",
			Description:       stringPtr("Commitment to developing team members and fostering growth"),
			Weight:            25,
			MaxScore:          100,
			SortOrder:         3,
		},
		{
			ID:                CriteriaStrategicID,
			EvaluationGroupID: EvalGroupLeadershipID,
			Name:              "Strategic Thinking",
			Description:       stringPtr("Ability to align team objectives with organizational goals"),
			Weight:            20,
			MaxScore:          100,
			SortOrder:         4,
		},

		// Technical Proficiency criteria (weights sum to 100)
		{
			ID:                CriteriaTechSkillsID,
			EvaluationGroupID: EvalGroupTechnicalID,
			Name:              "Technical Skills",
			Description:       stringPtr("Mastery of required tools, technologies, and methodologies"),
			Weight:            35,
			MaxScore:          100,
			SortOrder:         1,
		},
		{
			ID:                CriteriaProblemSolvingID,
			EvaluationGroupID: EvalGroupTechnicalID,
			Name:              "Problem Solving",
			Description:       stringPtr("Ability to analyze complex problems and develop effective solutions"),
			Weight:            30,
			MaxScore:          100,
			SortOrder:         2,
		},
		{
			ID:                CriteriaInnovationID,
			EvaluationGroupID: EvalGroupTechnicalID,
			Name:              "Innovation & Improvement",
			Description:       stringPtr("Contribution to process improvements and creative solutions"),
			Weight:            20,
			MaxScore:          100,
			SortOrder:         3,
		},
		{
			ID:                CriteriaDocumentationID,
			EvaluationGroupID: EvalGroupTechnicalID,
			Name:              "Documentation & Knowledge Sharing",
			Description:       stringPtr("Quality of technical documentation and willingness to share knowledge"),
			Weight:            15,
			MaxScore:          100,
			SortOrder:         4,
		},
	}

	for _, c := range criteria {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "weight", "max_score", "sort_order", "updated_at"}),
		}).Create(&c)
		if result.Error != nil {
			log.Printf("Error seeding evaluation criteria %s: %v", c.Name, result.Error)
			return result.Error
		}
	}

	log.Println("Evaluation criteria seeded successfully")
	return nil
}

// SeedEmployeeEvaluations seeds sample employee evaluations with scores
func SeedEmployeeEvaluations() error {
	now := time.Now()
	// Period: last 6 months
	periodStart := time.Date(now.Year(), now.Month()-6, 1, 0, 0, 0, 0, time.Local)
	periodEnd := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, time.Local).AddDate(0, 1, -1)

	evaluations := []models.EmployeeEvaluation{
		// Staff employee evaluated by manager using Performance Review (FINALIZED)
		{
			ID:                EvalStaffPerformanceID,
			EmployeeID:        StaffEmployeeID,
			EvaluationGroupID: EvalGroupPerformanceID,
			EvaluatorID:       ManagerEmployeeID,
			EvaluationType:    models.EvaluationTypeManager,
			PeriodStart:       periodStart,
			PeriodEnd:         periodEnd,
			OverallScore:      78.5, // will be recalculated from criteria
			Status:            models.EvaluationStatusFinalized,
			Notes:             stringPtr("Good performance overall. Shows strong productivity and teamwork. Needs improvement in initiative."),
		},
		// Staff self-evaluation using Leadership template (SUBMITTED)
		{
			ID:                EvalStaffLeadershipID,
			EmployeeID:        StaffEmployeeID,
			EvaluationGroupID: EvalGroupLeadershipID,
			EvaluatorID:       StaffEmployeeID,
			EvaluationType:    models.EvaluationTypeSelf,
			PeriodStart:       periodStart,
			PeriodEnd:         periodEnd,
			OverallScore:      72.0,
			Status:            models.EvaluationStatusSubmitted,
			Notes:             stringPtr("Self-assessment for leadership development program."),
		},
		// Manager self-evaluation using Technical template (DRAFT)
		{
			ID:                EvalManagerTechnicalID,
			EmployeeID:        ManagerEmployeeID,
			EvaluationGroupID: EvalGroupTechnicalID,
			EvaluatorID:       ManagerEmployeeID,
			EvaluationType:    models.EvaluationTypeSelf,
			PeriodStart:       periodStart,
			PeriodEnd:         periodEnd,
			OverallScore:      0, // draft, no score yet
			Status:            models.EvaluationStatusDraft,
			Notes:             nil,
		},
	}

	for _, e := range evaluations {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"overall_score", "status", "notes", "updated_at"}),
		}).Create(&e)
		if result.Error != nil {
			log.Printf("Error seeding employee evaluation: %v", result.Error)
			return result.Error
		}
	}

	// Seed criteria scores for completed evaluations
	if err := seedEvaluationCriteriaScores(); err != nil {
		return err
	}

	log.Println("Employee evaluations seeded successfully")
	return nil
}

// seedEvaluationCriteriaScores seeds individual criteria scores for evaluations
func seedEvaluationCriteriaScores() error {
	scores := []models.EmployeeEvaluationCriteria{
		// Staff Performance Review scores (finalized)
		{
			ID:                   EvalScoreID01,
			EmployeeEvaluationID: EvalStaffPerformanceID,
			EvaluationCriteriaID: CriteriaProductivityID,
			Score:                85,
			Weight:               30,
			Notes:                stringPtr("Consistently meets deadlines and output targets"),
		},
		{
			ID:                   EvalScoreID02,
			EmployeeEvaluationID: EvalStaffPerformanceID,
			EvaluationCriteriaID: CriteriaQualityID,
			Score:                80,
			Weight:               25,
			Notes:                stringPtr("Delivers high-quality work with minimal revisions"),
		},
		{
			ID:                   EvalScoreID03,
			EmployeeEvaluationID: EvalStaffPerformanceID,
			EvaluationCriteriaID: CriteriaInitiativeID,
			Score:                60,
			Weight:               15,
			Notes:                stringPtr("Could be more proactive in suggesting improvements"),
		},
		{
			ID:                   EvalScoreID04,
			EmployeeEvaluationID: EvalStaffPerformanceID,
			EvaluationCriteriaID: CriteriaTeamworkID,
			Score:                80,
			Weight:               20,
			Notes:                stringPtr("Works well with team members, good collaborator"),
		},
		{
			ID:                   EvalScoreID05,
			EmployeeEvaluationID: EvalStaffPerformanceID,
			EvaluationCriteriaID: CriteriaAttendanceID,
			Score:                90,
			Weight:               10,
			Notes:                stringPtr("Excellent attendance record"),
		},

		// Staff Leadership self-evaluation scores (submitted)
		{
			ID:                   EvalScoreID06,
			EmployeeEvaluationID: EvalStaffLeadershipID,
			EvaluationCriteriaID: CriteriaDecisionMakingID,
			Score:                70,
			Weight:               30,
			Notes:                stringPtr("Learning to make better decisions under pressure"),
		},
		{
			ID:                   EvalScoreID07,
			EmployeeEvaluationID: EvalStaffLeadershipID,
			EvaluationCriteriaID: CriteriaCommunicationID,
			Score:                75,
			Weight:               25,
			Notes:                stringPtr("Good verbal communication, improving written skills"),
		},
		{
			ID:                   EvalScoreID08,
			EmployeeEvaluationID: EvalStaffLeadershipID,
			EvaluationCriteriaID: CriteriaMentoringID,
			Score:                65,
			Weight:               25,
			Notes:                stringPtr("Started mentoring new team members"),
		},
		{
			ID:                   EvalScoreID09,
			EmployeeEvaluationID: EvalStaffLeadershipID,
			EvaluationCriteriaID: CriteriaStrategicID,
			Score:                75,
			Weight:               20,
			Notes:                stringPtr("Developing strategic thinking through project planning"),
		},
	}

	for _, s := range scores {
		result := database.DB.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"score", "weight", "notes", "updated_at"}),
		}).Create(&s)
		if result.Error != nil {
			log.Printf("Error seeding evaluation criteria score: %v", result.Error)
			return result.Error
		}
	}

	log.Println("Evaluation criteria scores seeded successfully")
	return nil
}
