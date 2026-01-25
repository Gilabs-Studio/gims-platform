package dto

import geographic "github.com/gilabs/gims/api/internal/geographic/domain/dto"

// CreateWarehouseRequest represents the request to create a warehouse
type CreateWarehouseRequest struct {
	Code        string   `json:"code" validate:"required,min=2,max=50"`
	Name        string   `json:"name" validate:"required,min=2,max=200"`
	Description string   `json:"description,omitempty"`
	Capacity    *int     `json:"capacity,omitempty"`
	Address     string   `json:"address,omitempty"`
	VillageID   *string  `json:"village_id,omitempty"`
	Latitude    *float64 `json:"latitude,omitempty"`
	Longitude   *float64 `json:"longitude,omitempty"`
	IsActive    *bool    `json:"is_active,omitempty"`
}

// UpdateWarehouseRequest represents the request to update a warehouse
type UpdateWarehouseRequest struct {
	Code        *string  `json:"code,omitempty" validate:"omitempty,min=2,max=50"`
	Name        *string  `json:"name,omitempty" validate:"omitempty,min=2,max=200"`
	Description *string  `json:"description,omitempty"`
	Capacity    *int     `json:"capacity,omitempty"`
	Address     *string  `json:"address,omitempty"`
	VillageID   *string  `json:"village_id,omitempty"`
	Latitude    *float64 `json:"latitude,omitempty"`
	Longitude   *float64 `json:"longitude,omitempty"`
	IsActive    *bool    `json:"is_active,omitempty"`
}

// WarehouseResponse represents the warehouse response
type WarehouseResponse struct {
	ID          string                  `json:"id"`
	Code        string                  `json:"code"`
	Name        string                  `json:"name"`
	Description string                  `json:"description,omitempty"`
	Capacity    *int                    `json:"capacity,omitempty"`
	Address     string                  `json:"address,omitempty"`
	VillageID   *string                 `json:"village_id,omitempty"`
	Village     *geographic.VillageResponse `json:"village,omitempty"`
	Latitude    *float64                `json:"latitude,omitempty"`
	Longitude   *float64                `json:"longitude,omitempty"`
	IsActive    bool                    `json:"is_active"`
	CreatedAt   string                  `json:"created_at"`
	UpdatedAt   string                  `json:"updated_at"`
}
