package dto

import (
	"encoding/json"

	"github.com/google/uuid"
)

// CreateFloorPlanRequest for creating a new floor plan
type CreateFloorPlanRequest struct {
	CompanyID  string `json:"company_id" binding:"required,uuid"`
	Name       string `json:"name" binding:"required,max=200"`
	FloorNumber int   `json:"floor_number" binding:"required,min=1"`
	GridSize   *int   `json:"grid_size,omitempty"`
	SnapToGrid *bool  `json:"snap_to_grid,omitempty"`
	Width      *int   `json:"width,omitempty"`
	Height     *int   `json:"height,omitempty"`
}

// UpdateFloorPlanRequest for updating a floor plan
type UpdateFloorPlanRequest struct {
	Name       *string `json:"name,omitempty" binding:"omitempty,max=200"`
	FloorNumber *int   `json:"floor_number,omitempty" binding:"omitempty,min=1"`
	GridSize   *int    `json:"grid_size,omitempty"`
	SnapToGrid *bool   `json:"snap_to_grid,omitempty"`
	Width      *int    `json:"width,omitempty"`
	Height     *int    `json:"height,omitempty"`
}

// SaveLayoutDataRequest for saving canvas layout data
type SaveLayoutDataRequest struct {
	LayoutData json.RawMessage `json:"layout_data" binding:"required"`
}

// FloorPlanResponse returned to client
type FloorPlanResponse struct {
	ID          string          `json:"id"`
	CompanyID   string          `json:"company_id"`
	Name        string          `json:"name"`
	FloorNumber int             `json:"floor_number"`
	Status      string          `json:"status"`
	GridSize    int             `json:"grid_size"`
	SnapToGrid  bool            `json:"snap_to_grid"`
	Width       int             `json:"width"`
	Height      int             `json:"height"`
	LayoutData  json.RawMessage `json:"layout_data"`
	Version     int             `json:"version"`
	PublishedAt *string         `json:"published_at"`
	PublishedBy *string         `json:"published_by"`
	CreatedBy   *string         `json:"created_by"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}

// LayoutVersionResponse returned to client
type LayoutVersionResponse struct {
	ID          string          `json:"id"`
	FloorPlanID string          `json:"floor_plan_id"`
	Version     int             `json:"version"`
	LayoutData  json.RawMessage `json:"layout_data"`
	PublishedAt string          `json:"published_at"`
	PublishedBy string          `json:"published_by"`
}

// CompanyOption for form data select
type CompanyOption struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// FloorPlanFormDataResponse for form dropdown options
type FloorPlanFormDataResponse struct {
	Companies []CompanyOption `json:"companies"`
}
