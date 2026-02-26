package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/gilabs/gims/api/internal/geographic/data/repositories"
	"github.com/gilabs/gims/api/internal/geographic/domain/dto"
)

var (
	ErrMapDataInvalidLevel    = errors.New("invalid map data level")
	ErrMapDataProvinceIDRequired = errors.New("province_id is required for city level")
	ErrMapDataCityIDRequired     = errors.New("city_id is required for district level")
)

// MapDataUsecase defines the interface for map data business logic
type MapDataUsecase interface {
	GetMapData(ctx context.Context, req *dto.MapDataRequest) (*dto.GeoJSONFeatureCollection, error)
}

type mapDataUsecase struct {
	mapDataRepo repositories.MapDataRepository
}

// NewMapDataUsecase creates a new MapDataUsecase
func NewMapDataUsecase(mapDataRepo repositories.MapDataRepository) MapDataUsecase {
	return &mapDataUsecase{mapDataRepo: mapDataRepo}
}

// GetMapData returns GeoJSON FeatureCollection based on the requested level
func (u *mapDataUsecase) GetMapData(ctx context.Context, req *dto.MapDataRequest) (*dto.GeoJSONFeatureCollection, error) {
	switch req.Level {
	case "province":
		return u.getProvinceMapData(ctx)
	case "city":
		if req.ProvinceID == "" {
			return nil, ErrMapDataProvinceIDRequired
		}
		return u.getCityMapData(ctx, req.ProvinceID)
	case "district":
		if req.CityID == "" {
			return nil, ErrMapDataCityIDRequired
		}
		return u.getDistrictMapData(ctx, req.CityID)
	default:
		return nil, ErrMapDataInvalidLevel
	}
}

func (u *mapDataUsecase) getProvinceMapData(ctx context.Context) (*dto.GeoJSONFeatureCollection, error) {
	provinces, err := u.mapDataRepo.FindProvincesWithGeometry(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch province map data: %w", err)
	}

	features := make([]dto.GeoJSONFeature, 0, len(provinces))
	for _, p := range provinces {
		if p.Geometry == nil {
			continue
		}

		var geometry interface{}
		if err := json.Unmarshal([]byte(*p.Geometry), &geometry); err != nil {
			continue // Skip features with invalid geometry
		}

		features = append(features, dto.GeoJSONFeature{
			Type: "Feature",
			Properties: map[string]interface{}{
				"id":   p.ID,
				"name": p.Name,
				"code": p.Code,
			},
			Geometry: geometry,
		})
	}

	return &dto.GeoJSONFeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}, nil
}

func (u *mapDataUsecase) getCityMapData(ctx context.Context, provinceID string) (*dto.GeoJSONFeatureCollection, error) {
	cities, err := u.mapDataRepo.FindCitiesWithGeometryByProvince(ctx, provinceID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch city map data: %w", err)
	}

	features := make([]dto.GeoJSONFeature, 0, len(cities))
	for _, c := range cities {
		if c.Geometry == nil {
			continue
		}

		var geometry interface{}
		if err := json.Unmarshal([]byte(*c.Geometry), &geometry); err != nil {
			continue
		}

		features = append(features, dto.GeoJSONFeature{
			Type: "Feature",
			Properties: map[string]interface{}{
				"id":          c.ID,
				"name":        c.Name,
				"code":        c.Code,
				"type":        c.Type,
				"province_id": c.ProvinceID,
			},
			Geometry: geometry,
		})
	}

	return &dto.GeoJSONFeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}, nil
}

func (u *mapDataUsecase) getDistrictMapData(ctx context.Context, cityID string) (*dto.GeoJSONFeatureCollection, error) {
	districts, err := u.mapDataRepo.FindDistrictsWithGeometryByCity(ctx, cityID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch district map data: %w", err)
	}

	features := make([]dto.GeoJSONFeature, 0, len(districts))
	for _, d := range districts {
		if d.Geometry == nil {
			continue
		}

		var geometry interface{}
		if err := json.Unmarshal([]byte(*d.Geometry), &geometry); err != nil {
			continue
		}

		features = append(features, dto.GeoJSONFeature{
			Type: "Feature",
			Properties: map[string]interface{}{
				"id":      d.ID,
				"name":    d.Name,
				"code":    d.Code,
				"city_id": d.CityID,
			},
			Geometry: geometry,
		})
	}

	return &dto.GeoJSONFeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}, nil
}
