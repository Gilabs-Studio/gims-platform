package mapper

import (
	geographicDto "github.com/gilabs/crm-healthcare/api/internal/geographic/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/warehouse/data/models"
	"github.com/gilabs/crm-healthcare/api/internal/warehouse/domain/dto"
)

// WarehouseMapper handles conversion between Warehouse model and DTOs
type WarehouseMapper struct{}

// NewWarehouseMapper creates a new WarehouseMapper
func NewWarehouseMapper() *WarehouseMapper {
	return &WarehouseMapper{}
}

// ToResponse converts a Warehouse model to WarehouseResponse DTO
func (m *WarehouseMapper) ToResponse(warehouse *models.Warehouse) *dto.WarehouseResponse {
	if warehouse == nil {
		return nil
	}

	response := &dto.WarehouseResponse{
		ID:          warehouse.ID,
		Code:        warehouse.Code,
		Name:        warehouse.Name,
		Description: warehouse.Description,
		Capacity:    warehouse.Capacity,
		Address:     warehouse.Address,
		VillageID:   warehouse.VillageID,
		Latitude:    warehouse.Latitude,
		Longitude:   warehouse.Longitude,
		IsActive:    warehouse.IsActive,
		CreatedAt:   warehouse.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   warehouse.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Map nested village if present
	if warehouse.Village != nil {
		response.Village = &geographicDto.VillageResponse{
			ID:   warehouse.Village.ID,
			Name: warehouse.Village.Name,
		}

		// Map nested district
		if warehouse.Village.District != nil {
			response.Village.District = &geographicDto.DistrictResponse{
				ID:   warehouse.Village.District.ID,
				Name: warehouse.Village.District.Name,
			}

			// Map nested city
			if warehouse.Village.District.City != nil {
				response.Village.District.City = &geographicDto.CityResponse{
					ID:   warehouse.Village.District.City.ID,
					Name: warehouse.Village.District.City.Name,
				}

				// Map nested province
				if warehouse.Village.District.City.Province != nil {
					response.Village.District.City.Province = &geographicDto.ProvinceResponse{
						ID:   warehouse.Village.District.City.Province.ID,
						Name: warehouse.Village.District.City.Province.Name,
					}
				}
			}
		}
	}

	return response
}

// ToResponseList converts a list of Warehouse models to WarehouseResponse DTOs
func (m *WarehouseMapper) ToResponseList(warehouses []*models.Warehouse) []*dto.WarehouseResponse {
	responses := make([]*dto.WarehouseResponse, len(warehouses))
	for i, warehouse := range warehouses {
		responses[i] = m.ToResponse(warehouse)
	}
	return responses
}

// FromCreateRequest converts CreateWarehouseRequest to Warehouse model
func (m *WarehouseMapper) FromCreateRequest(req dto.CreateWarehouseRequest) *models.Warehouse {
	warehouse := &models.Warehouse{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Capacity:    req.Capacity,
		Address:     req.Address,
		VillageID:   req.VillageID,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		IsActive:    true, // Default to active
	}

	if req.IsActive != nil {
		warehouse.IsActive = *req.IsActive
	}

	return warehouse
}

// ApplyUpdateRequest applies UpdateWarehouseRequest to existing Warehouse model
func (m *WarehouseMapper) ApplyUpdateRequest(warehouse *models.Warehouse, req dto.UpdateWarehouseRequest) {
	if req.Code != nil {
		warehouse.Code = *req.Code
	}
	if req.Name != nil {
		warehouse.Name = *req.Name
	}
	if req.Description != nil {
		warehouse.Description = *req.Description
	}
	if req.Capacity != nil {
		warehouse.Capacity = req.Capacity
	}
	if req.Address != nil {
		warehouse.Address = *req.Address
	}
	if req.VillageID != nil {
		warehouse.VillageID = req.VillageID
	}
	if req.Latitude != nil {
		warehouse.Latitude = req.Latitude
	}
	if req.Longitude != nil {
		warehouse.Longitude = req.Longitude
	}
	if req.IsActive != nil {
		warehouse.IsActive = *req.IsActive
	}
}
