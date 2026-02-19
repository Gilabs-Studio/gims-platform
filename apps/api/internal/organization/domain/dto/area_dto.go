package dto

// CreateAreaRequest represents create area request
type CreateAreaRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=100"`
	Description string `json:"description" binding:"omitempty,max=500"`
	IsActive    *bool  `json:"is_active"`
}

// UpdateAreaRequest represents update area request
type UpdateAreaRequest struct {
	Name        string `json:"name" binding:"omitempty,min=2,max=100"`
	Description string `json:"description" binding:"omitempty,max=500"`
	IsActive    *bool  `json:"is_active"`
}

// ListAreasRequest represents list areas request with optional filter for supervisor/member status
type ListAreasRequest struct {
	Page             int    `form:"page" binding:"omitempty,min=1"`
	PerPage          int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search           string `form:"search" binding:"omitempty,max=100"`
	HasSupervisor    *bool  `form:"has_supervisor"`
	HasMembers       *bool  `form:"has_members"`
	SortBy           string `form:"sort_by" binding:"omitempty,oneof=name created_at updated_at"`
	SortDir          string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
}

// AssignAreaMembersRequest represents the request to assign employees as members of an area
type AssignAreaMembersRequest struct {
	EmployeeIDs []string `json:"employee_ids" binding:"required,min=1"`
}

// AssignAreaSupervisorsRequest represents the request to assign employees as supervisors of an area
type AssignAreaSupervisorsRequest struct {
	EmployeeIDs []string `json:"employee_ids" binding:"required,min=1"`
}

// RemoveAreaEmployeeRequest represents the request to remove an employee from an area
type RemoveAreaEmployeeRequest struct {
	EmployeeID string `json:"employee_id" binding:"required"`
}

// EmployeeInAreaResponse represents a brief employee record in the context of an area assignment
type EmployeeInAreaResponse struct {
	ID           string `json:"id"`
	EmployeeCode string `json:"employee_code"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	DivisionID   *string `json:"division_id,omitempty"`
	DivisionName string  `json:"division_name,omitempty"`
	JobPosition  string  `json:"job_position,omitempty"`
	IsSupervisor bool    `json:"is_supervisor"`
}

// AreaResponse represents area response for list endpoints (includes counts)
type AreaResponse struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	IsActive        bool   `json:"is_active"`
	SupervisorCount int    `json:"supervisor_count"`
	MemberCount     int    `json:"member_count"`
	CreatedAt       string `json:"created_at"`
	UpdatedAt       string `json:"updated_at"`
}

// AreaDetailResponse represents a detailed area response, including full member/supervisor lists
type AreaDetailResponse struct {
	ID          string                   `json:"id"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	IsActive    bool                     `json:"is_active"`
	Supervisors []EmployeeInAreaResponse  `json:"supervisors"`
	Members     []EmployeeInAreaResponse  `json:"members"`
	SupervisorCount int                  `json:"supervisor_count"`
	MemberCount     int                  `json:"member_count"`
	CreatedAt   string                   `json:"created_at"`
	UpdatedAt   string                   `json:"updated_at"`
}
