package dto

// CreateAreaSupervisorRequest represents create area supervisor request
type CreateAreaSupervisorRequest struct {
	Name     string   `json:"name" binding:"required,min=2,max=100"`
	Email    string   `json:"email" binding:"omitempty,email,max=100"`
	Phone    string   `json:"phone" binding:"omitempty,max=20"`
	AreaIDs  []string `json:"area_ids" binding:"omitempty"` // Area IDs to assign
	IsActive *bool    `json:"is_active"`
}

// UpdateAreaSupervisorRequest represents update area supervisor request
type UpdateAreaSupervisorRequest struct {
	Name     string   `json:"name" binding:"omitempty,min=2,max=100"`
	Email    string   `json:"email" binding:"omitempty,email,max=100"`
	Phone    string   `json:"phone" binding:"omitempty,max=20"`
	AreaIDs  []string `json:"area_ids" binding:"omitempty"` // Area IDs to assign
	IsActive *bool    `json:"is_active"`
}

// ListAreaSupervisorsRequest represents list area supervisors request
type ListAreaSupervisorsRequest struct {
	Page    int    `form:"page" binding:"omitempty,min=1"`
	PerPage int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search  string `form:"search" binding:"omitempty,max=100"`
	SortBy  string `form:"sort_by" binding:"omitempty,oneof=name email created_at updated_at"`
	SortDir string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
}

// AssignAreasRequest represents assign areas to supervisor request
type AssignAreasRequest struct {
	AreaIDs []string `json:"area_ids" binding:"required"`
}

// AreaSupervisorResponse represents area supervisor response
type AreaSupervisorResponse struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Email     string           `json:"email"`
	Phone     string           `json:"phone"`
	IsActive  bool             `json:"is_active"`
	Areas     []AreaResponse   `json:"areas,omitempty"`
	CreatedAt string           `json:"created_at"`
	UpdatedAt string           `json:"updated_at"`
}

// AreaSupervisorAreaResponse represents the area assignment response
type AreaSupervisorAreaResponse struct {
	ID               string        `json:"id"`
	AreaSupervisorID string        `json:"area_supervisor_id"`
	AreaID           string        `json:"area_id"`
	Area             *AreaResponse `json:"area,omitempty"`
	CreatedAt        string        `json:"created_at"`
}
