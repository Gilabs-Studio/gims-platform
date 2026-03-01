package dto

import "time"

type CreateSalaryStructureRequest struct {
	EmployeeID    string  `json:"employee_id" binding:"required,uuid"`
	EffectiveDate string  `json:"effective_date" binding:"required"`
	BasicSalary   float64 `json:"basic_salary" binding:"required,gt=0"`
	Notes         string  `json:"notes"`
}

type UpdateSalaryStructureRequest struct {
	EmployeeID    string  `json:"employee_id" binding:"required,uuid"`
	EffectiveDate string  `json:"effective_date" binding:"required"`
	BasicSalary   float64 `json:"basic_salary" binding:"required,gt=0"`
	Notes         string  `json:"notes"`
}

type ListSalaryStructuresRequest struct {
	Page       int     `form:"page" binding:"omitempty,min=1"`
	PerPage    int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search     string  `form:"search"`
	EmployeeID *string `form:"employee_id" binding:"omitempty,uuid"`
	Status     *string `form:"status"`
	SortBy     string  `form:"sort_by"`
	SortDir    string  `form:"sort_dir"`
}

type SalaryStructureResponse struct {
	ID            string    `json:"id"`
	EmployeeID    string    `json:"employee_id"`
	EffectiveDate time.Time `json:"effective_date"`
	BasicSalary   float64   `json:"basic_salary"`
	Notes         string    `json:"notes"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
