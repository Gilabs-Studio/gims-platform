package dto

import "time"

// === ProductCategory DTOs ===

type CreateProductCategoryRequest struct {
	Name        string  `json:"name" binding:"required,min=2,max=100"`
	Description string  `json:"description" binding:"max=500"`
	ParentID    *string `json:"parent_id"`
	IsActive    *bool   `json:"is_active"`
}

type UpdateProductCategoryRequest struct {
	Name        string  `json:"name" binding:"omitempty,min=2,max=100"`
	Description string  `json:"description" binding:"max=500"`
	ParentID    *string `json:"parent_id"`
	IsActive    *bool   `json:"is_active"`
}

type ProductCategoryResponse struct {
	ID          string                   `json:"id"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	ParentID    *string                  `json:"parent_id"`
	Parent      *ProductCategoryResponse `json:"parent,omitempty"`
	IsActive    bool                     `json:"is_active"`
	CreatedAt   time.Time                `json:"created_at"`
	UpdatedAt   time.Time                `json:"updated_at"`
}
