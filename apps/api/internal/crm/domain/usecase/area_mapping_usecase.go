package usecase

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
)

// AreaMappingUsecase defines operations for area mapping
type AreaMappingUsecase interface {
	// GetAreaMapping returns all customers and leads with their activity metrics
	GetAreaMapping(ctx context.Context, req *dto.GetAreaMappingRequest) (*dto.AreaMappingResponse, error)
}

// NewAreaMappingUsecase creates a new area mapping usecase
func NewAreaMappingUsecase(repo repositories.AreaMappingRepository) AreaMappingUsecase {
	return &areaMappingUsecase{
		repo: repo,
	}
}

type areaMappingUsecase struct {
	repo repositories.AreaMappingRepository
}

// GetAreaMapping fetches customers and leads with aggregated activity metrics
func (u *areaMappingUsecase) GetAreaMapping(ctx context.Context, req *dto.GetAreaMappingRequest) (*dto.AreaMappingResponse, error) {
	startDate, endDate, err := resolveDateRange(req)
	if err != nil {
		return nil, err
	}

	// Fetch customers
	customers, err := u.repo.GetCustomersForMapping(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Fetch leads
	leads, err := u.repo.GetLeadsForMapping(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Combine into unified items list
	items := make([]dto.AreaMappingItem, 0, len(customers)+len(leads))

	// Add customers
	for i := range customers {
		items = append(items, dto.AreaMappingItem{
			Type:     "customer",
			Customer: &customers[i],
		})
	}

	// Add leads
	for i := range leads {
		items = append(items, dto.AreaMappingItem{
			Type: "lead",
			Lead: &leads[i],
		})
	}

	// Calculate summary statistics
	summary := calculateSummary(customers, leads)
	clusters := buildClusters(customers, leads)

	filters := dto.AreaMappingFilterMeta{}
	if req != nil {
		filters.Month = req.Month
		filters.Year = req.Year
	}

	return &dto.AreaMappingResponse{
		Items:    items,
		Clusters: clusters,
		Summary:  summary,
		Filters:  filters,
	}, nil
}

func resolveDateRange(req *dto.GetAreaMappingRequest) (*time.Time, *time.Time, error) {
	if req == nil {
		return nil, nil, nil
	}

	if req.Month != nil && (*req.Month < 1 || *req.Month > 12) {
		return nil, nil, errors.New("INVALID_MONTH: month must be between 1 and 12")
	}

	if req.Year != nil && (*req.Year < 2000 || *req.Year > 2100) {
		return nil, nil, errors.New("INVALID_YEAR: year must be between 2000 and 2100")
	}

	if req.Month == nil && req.Year == nil {
		return nil, nil, nil
	}

	nowYear := apptime.Now().Year()
	year := nowYear
	if req.Year != nil {
		year = *req.Year
	}

	if req.Month != nil {
		start := time.Date(year, time.Month(*req.Month), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, 0)
		return &start, &end, nil
	}

	start := time.Date(year, time.January, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(1, 0, 0)
	return &start, &end, nil
}

type clusterAccumulator struct {
	city           string
	totalPoints    int
	customerCount  int
	leadCount      int
	totalLat       float64
	totalLng       float64
	totalIntensity float64
	maxIntensity   float64
}

func normalizeCityKey(city string) string {
	c := strings.TrimSpace(strings.ToLower(city))
	if c == "" {
		return "unknown"
	}
	return c
}

func ensureCluster(clusters map[string]*clusterAccumulator, city string) *clusterAccumulator {
	key := normalizeCityKey(city)
	if clusters[key] == nil {
		clusters[key] = &clusterAccumulator{city: strings.TrimSpace(city)}
	}
	return clusters[key]
}

func updateCluster(
	acc *clusterAccumulator,
	latitude float64,
	longitude float64,
	intensity float64,
	isCustomer bool,
) {
	acc.totalPoints++
	if isCustomer {
		acc.customerCount++
	} else {
		acc.leadCount++
	}
	acc.totalLat += latitude
	acc.totalLng += longitude
	acc.totalIntensity += intensity
	if intensity > acc.maxIntensity {
		acc.maxIntensity = intensity
	}
}

func buildClusters(customers []dto.AreaMappingCustomerData, leads []dto.AreaMappingLeadData) []dto.AreaMappingClusterResponse {
	clusters := make(map[string]*clusterAccumulator)

	for _, customer := range customers {
		updateCluster(
			ensureCluster(clusters, customer.City),
			customer.Latitude,
			customer.Longitude,
			customer.IntensityScore,
			true,
		)
	}

	for _, lead := range leads {
		updateCluster(
			ensureCluster(clusters, lead.City),
			lead.Latitude,
			lead.Longitude,
			lead.IntensityScore,
			false,
		)
	}

	result := make([]dto.AreaMappingClusterResponse, 0, len(clusters))
	for _, acc := range clusters {
		if acc.totalPoints == 0 {
			continue
		}
		city := acc.city
		if strings.TrimSpace(city) == "" {
			city = "Unknown"
		}
		result = append(result, dto.AreaMappingClusterResponse{
			City:          city,
			TotalPoints:   acc.totalPoints,
			CustomerCount: acc.customerCount,
			LeadCount:     acc.leadCount,
			AvgIntensity:  acc.totalIntensity / float64(acc.totalPoints),
			MaxIntensity:  acc.maxIntensity,
			CenterLat:     acc.totalLat / float64(acc.totalPoints),
			CenterLng:     acc.totalLng / float64(acc.totalPoints),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalPoints > result[j].TotalPoints
	})

	return result
}

// calculateSummary aggregates statistics from customers and leads
func calculateSummary(customers []dto.AreaMappingCustomerData, leads []dto.AreaMappingLeadData) dto.AreaMappingSummary {
	summary := dto.AreaMappingSummary{
		TotalCustomers: len(customers),
		TotalLeads:     len(leads),
	}

	maxScore := 0.0
	minScore := 100.0

	// Aggregate from customers
	for _, c := range customers {
		summary.TotalActivities += c.ActivityCount
		summary.TotalPipelineValue += c.TotalDealValue

		if c.IntensityScore > maxScore {
			maxScore = c.IntensityScore
		}
		if c.IntensityScore < minScore {
			minScore = c.IntensityScore
		}
	}

	// Aggregate from leads
	for _, l := range leads {
		summary.TotalActivities += l.ActivityCount
		summary.TotalPipelineValue += l.EstimatedVal

		if l.IntensityScore > maxScore {
			maxScore = l.IntensityScore
		}
		if l.IntensityScore < minScore {
			minScore = l.IntensityScore
		}
	}

	summary.MaxIntensityScore = maxScore
	summary.MinIntensityScore = minScore

	return summary
}
