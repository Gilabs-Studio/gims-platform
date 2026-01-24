package dto

// CreateYearlyTargetRequest represents the request to create a yearly target
type CreateYearlyTargetRequest struct {
	AreaID      *string                       `json:"area_id"`
	Year        int                           `json:"year" binding:"required,min=2020,max=2100"`
	TotalTarget float64                       `json:"total_target" binding:"required,gte=0"`
	Notes       string                        `json:"notes"`
	Months      []CreateMonthlyTargetRequest  `json:"months" binding:"required,len=12,dive"`
}

// CreateMonthlyTargetRequest represents a monthly target in the request
type CreateMonthlyTargetRequest struct {
	Month        int     `json:"month" binding:"required,min=1,max=12"`
	TargetAmount float64 `json:"target_amount" binding:"required,gte=0"`
	Notes        string  `json:"notes"`
}

// UpdateYearlyTargetRequest represents the request to update a yearly target
type UpdateYearlyTargetRequest struct {
	AreaID      *string                        `json:"area_id"`
	TotalTarget *float64                       `json:"total_target" binding:"omitempty,gte=0"`
	Notes       *string                        `json:"notes"`
	Months      *[]UpdateMonthlyTargetRequest  `json:"months" binding:"omitempty,len=12,dive"`
}

// UpdateMonthlyTargetRequest represents a monthly target in the update request
type UpdateMonthlyTargetRequest struct {
	Month        int     `json:"month" binding:"required,min=1,max=12"`
	TargetAmount float64 `json:"target_amount" binding:"required,gte=0"`
	Notes        string  `json:"notes"`
}

// ListYearlyTargetsRequest represents the request to list yearly targets
type ListYearlyTargetsRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PerPage  int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Year     *int   `form:"year"`
	AreaID   string `form:"area_id"`
	Status   string `form:"status"`
	Search   string `form:"search"`
	SortBy   string `form:"sort_by"`
	SortDir  string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
}

// UpdateYearlyTargetStatusRequest represents the request to update target status
type UpdateYearlyTargetStatusRequest struct {
	Status          string  `json:"status" binding:"required,oneof=submitted approved rejected"`
	RejectionReason *string `json:"rejection_reason"`
}

// YearlyTargetResponse represents the response for a yearly target
type YearlyTargetResponse struct {
	ID                 string                   `json:"id"`
	Code               string                   `json:"code"`
	AreaID             *string                  `json:"area_id"`
	Area               *AreaResponse            `json:"area,omitempty"`
	Year               int                      `json:"year"`
	TotalTarget        float64                  `json:"total_target"`
	TotalActual        float64                  `json:"total_actual"`
	AchievementPercent float64                  `json:"achievement_percent"`
	Notes              string                   `json:"notes"`
	Status             string                   `json:"status"`
	
	SubmittedAt     *string `json:"submitted_at"`
	SubmittedBy     *string `json:"submitted_by"`
	ApprovedAt      *string `json:"approved_at"`
	ApprovedBy      *string `json:"approved_by"`
	RejectedAt      *string `json:"rejected_at"`
	RejectedBy      *string `json:"rejected_by"`
	RejectionReason string  `json:"rejection_reason"`
	
	MonthlyTargets []MonthlyTargetResponse `json:"monthly_targets,omitempty"`
	
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// MonthlyTargetResponse represents the response for a monthly target
type MonthlyTargetResponse struct {
	ID                 string  `json:"id"`
	Month              int     `json:"month"`
	MonthName          string  `json:"month_name"`
	TargetAmount       float64 `json:"target_amount"`
	ActualAmount       float64 `json:"actual_amount"`
	AchievementPercent float64 `json:"achievement_percent"`
	Notes              string  `json:"notes"`
}
