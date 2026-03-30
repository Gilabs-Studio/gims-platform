package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/travel_planner/data/models"
	"github.com/gilabs/gims/api/internal/travel_planner/data/repositories"
	"github.com/gilabs/gims/api/internal/travel_planner/domain/dto"
	"github.com/gilabs/gims/api/internal/travel_planner/domain/mapper"
	"github.com/go-pdf/fpdf"
	"gorm.io/gorm"
)

var (
	ErrTravelPlanNotFound  = errors.New("travel plan not found")
	ErrInvalidDateRange    = errors.New("invalid date range")
	ErrInvalidTravelMode   = errors.New("invalid travel mode")
	ErrInvalidStatus       = errors.New("invalid travel status")
	ErrInvalidDayDate      = errors.New("invalid day date")
	ErrInvalidStopCategory = errors.New("invalid stop category")
	ErrInvalidStopSource   = errors.New("invalid stop source")
	ErrInvalidSearchQuery  = errors.New("search query must contain at least 2 characters")
)

type TravelPlanUsecase interface {
	Create(ctx context.Context, req *dto.CreateTravelPlanRequest) (*dto.TravelPlanResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateTravelPlanRequest) (*dto.TravelPlanResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.TravelPlanResponse, error)
	List(ctx context.Context, req *dto.ListTravelPlansRequest) ([]dto.TravelPlanResponse, int64, int, int, error)
	GetFormData(ctx context.Context) (*dto.TravelPlannerFormDataResponse, error)
	SearchPlaces(ctx context.Context, query string, provider string) ([]dto.PlaceSearchResult, error)
	OptimizeRoute(ctx context.Context, planID string) (*dto.RouteOptimizationResponse, error)
	GetWeather(ctx context.Context, planID string) (*dto.WeatherPlanResponse, error)
	GetGoogleMapsLinks(ctx context.Context, planID string) ([]dto.DayGoogleMapsLink, error)
	ExportPDF(ctx context.Context, planID string, dayIndex *int) ([]byte, string, error)
}

type travelPlanUsecase struct {
	db           *gorm.DB
	repo         repositories.TravelPlanRepository
	mapper       *mapper.TravelPlanMapper
	httpClient   *http.Client
	googleAPIKey string
}

func NewTravelPlanUsecase(db *gorm.DB, repo repositories.TravelPlanRepository, planMapper *mapper.TravelPlanMapper) TravelPlanUsecase {
	return &travelPlanUsecase{
		db:           db,
		repo:         repo,
		mapper:       planMapper,
		httpClient:   &http.Client{Timeout: 12 * time.Second},
		googleAPIKey: strings.TrimSpace(os.Getenv("GOOGLE_MAPS_API_KEY")),
	}
}

func (uc *travelPlanUsecase) Create(ctx context.Context, req *dto.CreateTravelPlanRequest) (*dto.TravelPlanResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	mode, err := parseTravelMode(req.Mode)
	if err != nil {
		return nil, err
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := parseDate(req.EndDate)
	if err != nil {
		return nil, err
	}
	if endDate.Before(startDate) {
		return nil, ErrInvalidDateRange
	}

	days, err := uc.buildDays(req.Days)
	if err != nil {
		return nil, err
	}

	code, err := uc.repo.GenerateCode(ctx, apptime.Now())
	if err != nil {
		return nil, err
	}

	createdBy := strings.TrimSpace(getActorID(ctx))
	var createdByPtr *string
	if createdBy != "" {
		createdByPtr = &createdBy
	}

	plan := &models.TravelPlan{
		Code:      code,
		Title:     strings.TrimSpace(req.Title),
		Mode:      mode,
		StartDate: startDate,
		EndDate:   endDate,
		Status:    models.TravelPlanStatusDraft,
		Notes:     strings.TrimSpace(req.Notes),
		Days:      days,
		CreatedBy: createdByPtr,
	}

	if err := uc.repo.Create(ctx, plan); err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, plan.ID, true)
	if err != nil {
		return nil, err
	}

	response := uc.mapper.ToResponse(full)
	return &response, nil
}

func (uc *travelPlanUsecase) Update(ctx context.Context, id string, req *dto.UpdateTravelPlanRequest) (*dto.TravelPlanResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	id = strings.TrimSpace(id)
	existing, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTravelPlanNotFound
		}
		return nil, err
	}

	mode, err := parseTravelMode(req.Mode)
	if err != nil {
		return nil, err
	}

	startDate, err := parseDate(req.StartDate)
	if err != nil {
		return nil, err
	}
	endDate, err := parseDate(req.EndDate)
	if err != nil {
		return nil, err
	}
	if endDate.Before(startDate) {
		return nil, ErrInvalidDateRange
	}

	status := existing.Status
	if strings.TrimSpace(req.Status) != "" {
		status, err = parseTravelStatus(req.Status)
		if err != nil {
			return nil, err
		}
	}

	days, err := uc.buildDays(req.Days)
	if err != nil {
		return nil, err
	}

	existing.Title = strings.TrimSpace(req.Title)
	existing.Mode = mode
	existing.StartDate = startDate
	existing.EndDate = endDate
	existing.Status = status
	existing.Notes = strings.TrimSpace(req.Notes)

	if err := uc.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	if err := uc.repo.ReplaceDays(ctx, existing.ID, days); err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, existing.ID, true)
	if err != nil {
		return nil, err
	}

	response := uc.mapper.ToResponse(full)
	return &response, nil
}

func (uc *travelPlanUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return ErrTravelPlanNotFound
	}

	if _, err := uc.repo.FindByID(ctx, id, false); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTravelPlanNotFound
		}
		return err
	}

	return uc.repo.Delete(ctx, id)
}

func (uc *travelPlanUsecase) GetByID(ctx context.Context, id string) (*dto.TravelPlanResponse, error) {
	id = strings.TrimSpace(id)
	plan, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTravelPlanNotFound
		}
		return nil, err
	}

	response := uc.mapper.ToResponse(plan)
	return &response, nil
}

func (uc *travelPlanUsecase) List(ctx context.Context, req *dto.ListTravelPlansRequest) ([]dto.TravelPlanResponse, int64, int, int, error) {
	if req == nil {
		req = &dto.ListTravelPlansRequest{}
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	var mode *models.TravelMode
	if req.Mode != nil && strings.TrimSpace(*req.Mode) != "" {
		parsedMode, err := parseTravelMode(*req.Mode)
		if err != nil {
			return nil, 0, page, perPage, err
		}
		mode = &parsedMode
	}

	var status *models.TravelPlanStatus
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		parsedStatus, err := parseTravelStatus(*req.Status)
		if err != nil {
			return nil, 0, page, perPage, err
		}
		status = &parsedStatus
	}

	var startDate *time.Time
	if req.StartDate != nil && strings.TrimSpace(*req.StartDate) != "" {
		parsedStartDate, err := parseDate(*req.StartDate)
		if err != nil {
			return nil, 0, page, perPage, err
		}
		startDate = &parsedStartDate
	}

	var endDate *time.Time
	if req.EndDate != nil && strings.TrimSpace(*req.EndDate) != "" {
		parsedEndDate, err := parseDate(*req.EndDate)
		if err != nil {
			return nil, 0, page, perPage, err
		}
		endDate = &parsedEndDate
	}

	plans, total, err := uc.repo.List(ctx, repositories.TravelPlanListParams{
		Search:    strings.TrimSpace(req.Search),
		Mode:      mode,
		Status:    status,
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, page, perPage, err
	}

	responses := uc.mapper.ToResponseList(plans)
	return responses, total, page, perPage, nil
}

func (uc *travelPlanUsecase) GetFormData(ctx context.Context) (*dto.TravelPlannerFormDataResponse, error) {
	_ = ctx

	return &dto.TravelPlannerFormDataResponse{
		Modes: []dto.EnumOption{
			{Value: string(models.TravelModeLogistic), Label: "Logistic"},
			{Value: string(models.TravelModeCargo), Label: "Cargo"},
			{Value: string(models.TravelModeVessel), Label: "Vessel"},
			{Value: string(models.TravelModeMilestone), Label: "Milestone"},
		},
		Categories: []dto.EnumOption{
			{Value: string(models.TravelStopCategoryPickup), Label: "Pickup"},
			{Value: string(models.TravelStopCategoryDropoff), Label: "Dropoff"},
			{Value: string(models.TravelStopCategoryRefuel), Label: "Refuel"},
			{Value: string(models.TravelStopCategoryCheckpoint), Label: "Checkpoint"},
			{Value: string(models.TravelStopCategoryRest), Label: "Rest"},
			{Value: string(models.TravelStopCategoryCustom), Label: "Custom"},
		},
		Sources: []dto.EnumOption{
			{Value: string(models.TravelStopSourceManual), Label: "Manual"},
			{Value: string(models.TravelStopSourceGooglePlaces), Label: "Google Places"},
			{Value: string(models.TravelStopSourceOpenStreetMap), Label: "OpenStreetMap"},
		},
		WeatherRisk: []dto.EnumOption{
			{Value: string(models.TravelWeatherRiskLow), Label: "Low"},
			{Value: string(models.TravelWeatherRiskMedium), Label: "Medium"},
			{Value: string(models.TravelWeatherRiskHigh), Label: "High"},
		},
	}, nil
}

func (uc *travelPlanUsecase) SearchPlaces(ctx context.Context, query string, provider string) ([]dto.PlaceSearchResult, error) {
	searchQuery := strings.TrimSpace(query)
	if len(searchQuery) < 2 {
		return nil, ErrInvalidSearchQuery
	}

	provider = strings.ToLower(strings.TrimSpace(provider))

	if provider == "google" || provider == "google_places" {
		if uc.googleAPIKey != "" {
			googleResults, err := uc.searchGooglePlaces(ctx, searchQuery)
			if err == nil {
				return googleResults, nil
			}
		}
		return uc.searchOpenStreetMap(ctx, searchQuery)
	}

	if provider == "osm" || provider == "open_street_map" {
		return uc.searchOpenStreetMap(ctx, searchQuery)
	}

	if uc.googleAPIKey != "" {
		googleResults, err := uc.searchGooglePlaces(ctx, searchQuery)
		if err == nil {
			return googleResults, nil
		}
	}

	return uc.searchOpenStreetMap(ctx, searchQuery)
}

func (uc *travelPlanUsecase) OptimizeRoute(ctx context.Context, planID string) (*dto.RouteOptimizationResponse, error) {
	planID = strings.TrimSpace(planID)
	plan, err := uc.repo.FindByID(ctx, planID, true)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTravelPlanNotFound
		}
		return nil, err
	}

	summaries := make([]dto.RouteOptimizationDaySummary, 0, len(plan.Days))
	optimizedAt := apptime.Now()

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for dayIndex := range plan.Days {
			day := &plan.Days[dayIndex]
			if len(day.Stops) == 0 {
				continue
			}

			optimizedStops, totalDistance := optimizeStops(day.Stops)
			for stopIdx := range optimizedStops {
				optimizedStops[stopIdx].OrderIndex = stopIdx + 1
				if err := tx.Model(&models.TravelPlanStop{}).
					Where("id = ?", optimizedStops[stopIdx].ID).
					Update("order_index", optimizedStops[stopIdx].OrderIndex).Error; err != nil {
					return err
				}
			}

			day.Stops = optimizedStops
			optimizedStopIDs := make([]string, 0, len(optimizedStops))
			for _, stop := range optimizedStops {
				optimizedStopIDs = append(optimizedStopIDs, stop.ID)
			}

			summaries = append(summaries, dto.RouteOptimizationDaySummary{
				DayID:            day.ID,
				DayIndex:         day.DayIndex,
				TotalDistanceKM:  roundToTwo(totalDistance),
				GoogleMapsURL:    buildGoogleMapsURL(optimizedStops),
				OptimizedStopIDs: optimizedStopIDs,
			})
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.SliceStable(summaries, func(i, j int) bool {
		return summaries[i].DayIndex < summaries[j].DayIndex
	})

	return &dto.RouteOptimizationResponse{
		PlanID:      plan.ID,
		OptimizedAt: optimizedAt.Format(time.RFC3339),
		Days:        summaries,
	}, nil
}

func (uc *travelPlanUsecase) GetWeather(ctx context.Context, planID string) (*dto.WeatherPlanResponse, error) {
	planID = strings.TrimSpace(planID)
	plan, err := uc.repo.FindByID(ctx, planID, true)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTravelPlanNotFound
		}
		return nil, err
	}

	forecastMap := map[string]dto.WeatherDayResponse{}
	if lat, lon, ok := extractRepresentativeCoordinate(plan); ok {
		forecastMap, _ = uc.fetchOpenMeteoForecast(ctx, lat, lon)
	}

	days := make([]dto.WeatherDayResponse, 0, len(plan.Days))
	sortedDays := append([]models.TravelPlanDay{}, plan.Days...)
	sort.SliceStable(sortedDays, func(i, j int) bool {
		return sortedDays[i].DayIndex < sortedDays[j].DayIndex
	})

	for _, day := range sortedDays {
		dayKey := day.DayDate.Format("2006-01-02")
		if forecast, ok := forecastMap[dayKey]; ok {
			days = append(days, forecast)
			continue
		}
		days = append(days, buildHistoricalWeather(day.DayDate))
	}

	return &dto.WeatherPlanResponse{
		PlanID: plan.ID,
		Days:   days,
	}, nil
}

func (uc *travelPlanUsecase) GetGoogleMapsLinks(ctx context.Context, planID string) ([]dto.DayGoogleMapsLink, error) {
	planID = strings.TrimSpace(planID)
	plan, err := uc.repo.FindByID(ctx, planID, true)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTravelPlanNotFound
		}
		return nil, err
	}

	links := make([]dto.DayGoogleMapsLink, 0, len(plan.Days))
	for _, day := range plan.Days {
		sortedStops := append([]models.TravelPlanStop{}, day.Stops...)
		sort.SliceStable(sortedStops, func(i, j int) bool {
			return sortedStops[i].OrderIndex < sortedStops[j].OrderIndex
		})
		links = append(links, dto.DayGoogleMapsLink{
			DayID:    day.ID,
			DayIndex: day.DayIndex,
			URL:      buildGoogleMapsURL(sortedStops),
		})
	}

	sort.SliceStable(links, func(i, j int) bool {
		return links[i].DayIndex < links[j].DayIndex
	})

	return links, nil
}

func (uc *travelPlanUsecase) ExportPDF(ctx context.Context, planID string, dayIndex *int) ([]byte, string, error) {
	planID = strings.TrimSpace(planID)
	plan, err := uc.repo.FindByID(ctx, planID, true)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", ErrTravelPlanNotFound
		}
		return nil, "", err
	}

	days := append([]models.TravelPlanDay{}, plan.Days...)
	sort.SliceStable(days, func(i, j int) bool {
		return days[i].DayIndex < days[j].DayIndex
	})

	if dayIndex != nil {
		filtered := make([]models.TravelPlanDay, 0, 1)
		for _, day := range days {
			if day.DayIndex == *dayIndex {
				filtered = append(filtered, day)
				break
			}
		}
		if len(filtered) == 0 {
			return nil, "", errors.New("day not found for export")
		}
		days = filtered
	}

	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 12)

	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Travel Planner Brief")
	pdf.Ln(9)
	pdf.SetFont("Arial", "", 11)
	pdf.Cell(0, 7, fmt.Sprintf("Plan Code: %s", plan.Code))
	pdf.Ln(6)
	pdf.Cell(0, 7, fmt.Sprintf("Title: %s", plan.Title))
	pdf.Ln(6)
	pdf.Cell(0, 7, fmt.Sprintf("Mode: %s", strings.Title(string(plan.Mode))))
	pdf.Ln(6)
	pdf.Cell(0, 7, fmt.Sprintf("Period: %s to %s", plan.StartDate.Format("2006-01-02"), plan.EndDate.Format("2006-01-02")))
	pdf.Ln(8)
	if strings.TrimSpace(plan.Notes) != "" {
		pdf.MultiCell(0, 6, "Notes: "+strings.TrimSpace(plan.Notes), "", "L", false)
		pdf.Ln(2)
	}

	for _, day := range days {
		pdf.AddPage()
		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 8, fmt.Sprintf("Day %d - %s", day.DayIndex, day.DayDate.Format("2006-01-02")))
		pdf.Ln(8)

		pdf.SetFont("Arial", "", 11)
		if strings.TrimSpace(day.Summary) != "" {
			pdf.MultiCell(0, 6, "Summary: "+strings.TrimSpace(day.Summary), "", "L", false)
			pdf.Ln(2)
		}

		sortedStops := append([]models.TravelPlanStop{}, day.Stops...)
		sort.SliceStable(sortedStops, func(i, j int) bool {
			return sortedStops[i].OrderIndex < sortedStops[j].OrderIndex
		})

		pdf.SetFont("Arial", "B", 11)
		pdf.Cell(0, 7, "Itinerary Stops")
		pdf.Ln(7)
		pdf.SetFont("Arial", "", 10)
		for _, stop := range sortedStops {
			lockTag := ""
			if stop.IsLocked {
				lockTag = " [LOCKED]"
			}
			pdf.MultiCell(
				0,
				5,
				fmt.Sprintf("%d. %s%s (%s) [%.6f, %.6f]", stop.OrderIndex, stop.PlaceName, lockTag, strings.Title(string(stop.Category)), stop.Latitude, stop.Longitude),
				"",
				"L",
				false,
			)
		}

		sortedNotes := append([]models.TravelPlanDayNote{}, day.Notes...)
		sort.SliceStable(sortedNotes, func(i, j int) bool {
			return sortedNotes[i].OrderIndex < sortedNotes[j].OrderIndex
		})
		if len(sortedNotes) > 0 {
			pdf.Ln(2)
			pdf.SetFont("Arial", "B", 11)
			pdf.Cell(0, 7, "Day Notes")
			pdf.Ln(7)
			pdf.SetFont("Arial", "", 10)
			for _, note := range sortedNotes {
				noteTime := strings.TrimSpace(note.NoteTime)
				if noteTime == "" {
					noteTime = "--:--"
				}
				iconTag := strings.TrimSpace(note.IconTag)
				if iconTag == "" {
					iconTag = "note"
				}
				pdf.MultiCell(0, 5, fmt.Sprintf("- [%s] %s %s", iconTag, noteTime, note.NoteText), "", "L", false)
			}
		}
	}

	var buffer bytes.Buffer
	if err := pdf.Output(&buffer); err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("travel-plan-%s.pdf", strings.ToLower(plan.Code))
	if dayIndex != nil {
		filename = fmt.Sprintf("travel-plan-%s-day-%d.pdf", strings.ToLower(plan.Code), *dayIndex)
	}

	return buffer.Bytes(), filename, nil
}

func (uc *travelPlanUsecase) buildDays(dayRequests []dto.TravelPlanDayRequest) ([]models.TravelPlanDay, error) {
	days := make([]models.TravelPlanDay, 0, len(dayRequests))
	for _, dayRequest := range dayRequests {
		dayDate, err := parseDate(dayRequest.DayDate)
		if err != nil {
			return nil, ErrInvalidDayDate
		}

		weatherRisk, err := parseWeatherRisk(dayRequest.WeatherRisk)
		if err != nil {
			return nil, err
		}

		stops := make([]models.TravelPlanStop, 0, len(dayRequest.Stops))
		for stopIndex, stopRequest := range dayRequest.Stops {
			category, err := parseStopCategory(stopRequest.Category)
			if err != nil {
				return nil, err
			}
			source, err := parseStopSource(stopRequest.Source)
			if err != nil {
				return nil, err
			}

			orderIndex := stopRequest.OrderIndex
			if orderIndex <= 0 {
				orderIndex = stopIndex + 1
			}

			stops = append(stops, models.TravelPlanStop{
				PlaceName:  strings.TrimSpace(stopRequest.PlaceName),
				Latitude:   stopRequest.Latitude,
				Longitude:  stopRequest.Longitude,
				Category:   category,
				OrderIndex: orderIndex,
				IsLocked:   stopRequest.IsLocked,
				Source:     source,
				PhotoURL:   strings.TrimSpace(stopRequest.PhotoURL),
				Note:       strings.TrimSpace(stopRequest.Note),
			})
		}
		sort.SliceStable(stops, func(i, j int) bool {
			return stops[i].OrderIndex < stops[j].OrderIndex
		})
		for stopIndex := range stops {
			stops[stopIndex].OrderIndex = stopIndex + 1
		}

		notes := make([]models.TravelPlanDayNote, 0, len(dayRequest.Notes))
		for noteIndex, noteRequest := range dayRequest.Notes {
			orderIndex := noteRequest.OrderIndex
			if orderIndex <= 0 {
				orderIndex = noteIndex + 1
			}
			notes = append(notes, models.TravelPlanDayNote{
				IconTag:    strings.TrimSpace(noteRequest.IconTag),
				NoteText:   strings.TrimSpace(noteRequest.NoteText),
				NoteTime:   normalizeNoteTime(noteRequest.NoteTime),
				OrderIndex: orderIndex,
			})
		}
		sort.SliceStable(notes, func(i, j int) bool {
			return notes[i].OrderIndex < notes[j].OrderIndex
		})
		for noteIndex := range notes {
			notes[noteIndex].OrderIndex = noteIndex + 1
		}

		days = append(days, models.TravelPlanDay{
			DayIndex:    dayRequest.DayIndex,
			DayDate:     dayDate,
			Summary:     strings.TrimSpace(dayRequest.Summary),
			WeatherRisk: weatherRisk,
			Stops:       stops,
			Notes:       notes,
		})
	}

	sort.SliceStable(days, func(i, j int) bool {
		return days[i].DayIndex < days[j].DayIndex
	})

	return days, nil
}

func parseDate(value string) (time.Time, error) {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	if err != nil {
		return time.Time{}, ErrInvalidDayDate
	}
	return parsed, nil
}

func parseTravelMode(mode string) (models.TravelMode, error) {
	normalized := strings.ToLower(strings.TrimSpace(mode))
	switch models.TravelMode(normalized) {
	case models.TravelModeLogistic, models.TravelModeCargo, models.TravelModeVessel, models.TravelModeMilestone:
		return models.TravelMode(normalized), nil
	default:
		return "", ErrInvalidTravelMode
	}
}

func parseTravelStatus(status string) (models.TravelPlanStatus, error) {
	normalized := strings.ToLower(strings.TrimSpace(status))
	switch models.TravelPlanStatus(normalized) {
	case models.TravelPlanStatusDraft, models.TravelPlanStatusActive, models.TravelPlanStatusCompleted, models.TravelPlanStatusCancelled:
		return models.TravelPlanStatus(normalized), nil
	default:
		return "", ErrInvalidStatus
	}
}

func parseStopCategory(category string) (models.TravelStopCategory, error) {
	normalized := strings.ToLower(strings.TrimSpace(category))
	switch models.TravelStopCategory(normalized) {
	case models.TravelStopCategoryPickup,
		models.TravelStopCategoryDropoff,
		models.TravelStopCategoryRefuel,
		models.TravelStopCategoryCheckpoint,
		models.TravelStopCategoryRest,
		models.TravelStopCategoryCustom:
		return models.TravelStopCategory(normalized), nil
	default:
		return "", ErrInvalidStopCategory
	}
}

func parseStopSource(source string) (models.TravelStopSource, error) {
	normalized := strings.ToLower(strings.TrimSpace(source))
	if normalized == "" {
		return models.TravelStopSourceManual, nil
	}
	switch models.TravelStopSource(normalized) {
	case models.TravelStopSourceManual,
		models.TravelStopSourceGooglePlaces,
		models.TravelStopSourceOpenStreetMap:
		return models.TravelStopSource(normalized), nil
	default:
		return "", ErrInvalidStopSource
	}
}

func parseWeatherRisk(risk string) (models.TravelWeatherRisk, error) {
	normalized := strings.ToLower(strings.TrimSpace(risk))
	if normalized == "" {
		return models.TravelWeatherRiskLow, nil
	}
	switch models.TravelWeatherRisk(normalized) {
	case models.TravelWeatherRiskLow, models.TravelWeatherRiskMedium, models.TravelWeatherRiskHigh:
		return models.TravelWeatherRisk(normalized), nil
	default:
		return "", errors.New("invalid weather risk")
	}
}

func normalizeNoteTime(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if len(trimmed) >= 5 {
		return trimmed[:5]
	}
	return trimmed
}

func getActorID(ctx context.Context) string {
	actorID, _ := ctx.Value("user_id").(string)
	return strings.TrimSpace(actorID)
}

func optimizeStops(stops []models.TravelPlanStop) ([]models.TravelPlanStop, float64) {
	sortedStops := append([]models.TravelPlanStop{}, stops...)
	sort.SliceStable(sortedStops, func(i, j int) bool {
		return sortedStops[i].OrderIndex < sortedStops[j].OrderIndex
	})

	if len(sortedStops) <= 2 {
		for index := range sortedStops {
			sortedStops[index].OrderIndex = index + 1
		}
		return sortedStops, calculateTotalDistance(sortedStops)
	}

	lockedByPosition := make(map[int]models.TravelPlanStop)
	unlocked := make([]models.TravelPlanStop, 0, len(sortedStops))
	for index, stop := range sortedStops {
		if stop.IsLocked {
			lockedByPosition[index] = stop
			continue
		}
		unlocked = append(unlocked, stop)
	}

	if len(unlocked) <= 1 {
		for index := range sortedStops {
			sortedStops[index].OrderIndex = index + 1
		}
		return sortedStops, calculateTotalDistance(sortedStops)
	}

	optimizedUnlocked := nearestNeighborOrder(unlocked)
	optimized := make([]models.TravelPlanStop, len(sortedStops))
	unlockedIndex := 0
	for index := range optimized {
		if lockedStop, exists := lockedByPosition[index]; exists {
			optimized[index] = lockedStop
			continue
		}
		optimized[index] = optimizedUnlocked[unlockedIndex]
		unlockedIndex++
	}

	for index := range optimized {
		optimized[index].OrderIndex = index + 1
	}

	return optimized, calculateTotalDistance(optimized)
}

func nearestNeighborOrder(stops []models.TravelPlanStop) []models.TravelPlanStop {
	if len(stops) <= 1 {
		return append([]models.TravelPlanStop{}, stops...)
	}

	remaining := append([]models.TravelPlanStop{}, stops...)
	ordered := make([]models.TravelPlanStop, 0, len(stops))

	ordered = append(ordered, remaining[0])
	remaining = remaining[1:]

	for len(remaining) > 0 {
		last := ordered[len(ordered)-1]
		closestIndex := 0
		closestDistance := math.MaxFloat64
		for index, candidate := range remaining {
			distance := haversine(last.Latitude, last.Longitude, candidate.Latitude, candidate.Longitude)
			if distance < closestDistance {
				closestDistance = distance
				closestIndex = index
			}
		}

		ordered = append(ordered, remaining[closestIndex])
		remaining = append(remaining[:closestIndex], remaining[closestIndex+1:]...)
	}

	return ordered
}

func calculateTotalDistance(stops []models.TravelPlanStop) float64 {
	if len(stops) <= 1 {
		return 0
	}

	totalDistance := 0.0
	for index := 1; index < len(stops); index++ {
		previous := stops[index-1]
		current := stops[index]
		totalDistance += haversine(previous.Latitude, previous.Longitude, current.Latitude, current.Longitude)
	}

	return totalDistance
}

func roundToTwo(value float64) float64 {
	return math.Round(value*100) / 100
}

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0

	toRadians := func(value float64) float64 {
		return value * math.Pi / 180
	}

	dLat := toRadians(lat2 - lat1)
	dLon := toRadians(lon2 - lon1)
	rLat1 := toRadians(lat1)
	rLat2 := toRadians(lat2)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(rLat1)*math.Cos(rLat2)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusKm * c
}

func buildGoogleMapsURL(stops []models.TravelPlanStop) string {
	if len(stops) == 0 {
		return ""
	}

	sortedStops := append([]models.TravelPlanStop{}, stops...)
	sort.SliceStable(sortedStops, func(i, j int) bool {
		return sortedStops[i].OrderIndex < sortedStops[j].OrderIndex
	})

	origin := fmt.Sprintf("%.6f,%.6f", sortedStops[0].Latitude, sortedStops[0].Longitude)
	destination := origin
	if len(sortedStops) > 1 {
		lastStop := sortedStops[len(sortedStops)-1]
		destination = fmt.Sprintf("%.6f,%.6f", lastStop.Latitude, lastStop.Longitude)
	}

	waypoints := make([]string, 0)
	if len(sortedStops) > 2 {
		for _, stop := range sortedStops[1 : len(sortedStops)-1] {
			waypoints = append(waypoints, fmt.Sprintf("%.6f,%.6f", stop.Latitude, stop.Longitude))
			if len(waypoints) >= 10 {
				break
			}
		}
	}

	values := url.Values{}
	values.Set("api", "1")
	values.Set("origin", origin)
	values.Set("destination", destination)
	if len(waypoints) > 0 {
		values.Set("waypoints", strings.Join(waypoints, "|"))
	}

	return "https://www.google.com/maps/dir/?" + values.Encode()
}

func extractRepresentativeCoordinate(plan *models.TravelPlan) (float64, float64, bool) {
	for _, day := range plan.Days {
		if len(day.Stops) > 0 {
			return day.Stops[0].Latitude, day.Stops[0].Longitude, true
		}
	}
	return 0, 0, false
}

func (uc *travelPlanUsecase) fetchOpenMeteoForecast(ctx context.Context, latitude float64, longitude float64) (map[string]dto.WeatherDayResponse, error) {
	values := url.Values{}
	values.Set("latitude", strconv.FormatFloat(latitude, 'f', 6, 64))
	values.Set("longitude", strconv.FormatFloat(longitude, 'f', 6, 64))
	values.Set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max")
	values.Set("forecast_days", "16")
	values.Set("timezone", "auto")

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.open-meteo.com/v1/forecast?"+values.Encode(), nil)
	if err != nil {
		return nil, err
	}

	response, err := uc.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("open-meteo error status: %d", response.StatusCode)
	}

	var payload struct {
		Daily struct {
			Time                     []string  `json:"time"`
			TemperatureMax           []float64 `json:"temperature_2m_max"`
			TemperatureMin           []float64 `json:"temperature_2m_min"`
			PrecipitationProbability []float64 `json:"precipitation_probability_max"`
		} `json:"daily"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}

	weather := make(map[string]dto.WeatherDayResponse, len(payload.Daily.Time))
	for index, day := range payload.Daily.Time {
		if index >= len(payload.Daily.TemperatureMax) ||
			index >= len(payload.Daily.TemperatureMin) ||
			index >= len(payload.Daily.PrecipitationProbability) {
			continue
		}
		precipitation := int(math.Round(payload.Daily.PrecipitationProbability[index]))
		weather[day] = dto.WeatherDayResponse{
			Date:                 day,
			TemperatureMin:       payload.Daily.TemperatureMin[index],
			TemperatureMax:       payload.Daily.TemperatureMax[index],
			PrecipitationPercent: precipitation,
			Risk:                 string(riskFromPrecipitation(precipitation)),
			Source:               "open-meteo",
		}
	}

	return weather, nil
}

func buildHistoricalWeather(dayDate time.Time) dto.WeatherDayResponse {
	month := int(dayDate.Month())

	precipitation := 35
	switch month {
	case 11, 12, 1, 2, 3:
		precipitation = 68
	case 4, 5, 10:
		precipitation = 48
	default:
		precipitation = 32
	}

	temperatureMin := 23.0
	temperatureMax := 31.0
	if month >= 6 && month <= 9 {
		temperatureMin = 22.0
		temperatureMax = 32.0
	}

	return dto.WeatherDayResponse{
		Date:                 dayDate.Format("2006-01-02"),
		TemperatureMin:       temperatureMin,
		TemperatureMax:       temperatureMax,
		PrecipitationPercent: precipitation,
		Risk:                 string(riskFromPrecipitation(precipitation)),
		Source:               "historical-fallback",
	}
}

func riskFromPrecipitation(precipitation int) models.TravelWeatherRisk {
	if precipitation >= 70 {
		return models.TravelWeatherRiskHigh
	}
	if precipitation >= 40 {
		return models.TravelWeatherRiskMedium
	}
	return models.TravelWeatherRiskLow
}

func (uc *travelPlanUsecase) searchGooglePlaces(ctx context.Context, query string) ([]dto.PlaceSearchResult, error) {
	if uc.googleAPIKey == "" {
		return nil, errors.New("google places api key is not configured")
	}

	values := url.Values{}
	values.Set("query", query)
	values.Set("key", uc.googleAPIKey)

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		"https://maps.googleapis.com/maps/api/place/textsearch/json?"+values.Encode(),
		nil,
	)
	if err != nil {
		return nil, err
	}

	response, err := uc.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("google places error status: %d", response.StatusCode)
	}

	var payload struct {
		Status  string `json:"status"`
		Results []struct {
			Name             string   `json:"name"`
			FormattedAddress string   `json:"formatted_address"`
			Types            []string `json:"types"`
			Rating           *float64 `json:"rating"`
			Geometry         struct {
				Location struct {
					Lat float64 `json:"lat"`
					Lng float64 `json:"lng"`
				} `json:"location"`
			} `json:"geometry"`
			Photos []struct {
				PhotoReference string `json:"photo_reference"`
			} `json:"photos"`
		} `json:"results"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if payload.Status != "OK" && payload.Status != "ZERO_RESULTS" {
		return nil, fmt.Errorf("google places status: %s", payload.Status)
	}

	results := make([]dto.PlaceSearchResult, 0, len(payload.Results))
	for _, place := range payload.Results {
		category := "other"
		if len(place.Types) > 0 {
			category = place.Types[0]
		}
		photoURL := ""
		if len(place.Photos) > 0 && strings.TrimSpace(place.Photos[0].PhotoReference) != "" {
			photoURL = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photoreference=" +
				url.QueryEscape(place.Photos[0].PhotoReference) +
				"&key=" + url.QueryEscape(uc.googleAPIKey)
		}

		results = append(results, dto.PlaceSearchResult{
			Provider:  "google_places",
			PlaceName: place.Name,
			Address:   place.FormattedAddress,
			Latitude:  place.Geometry.Location.Lat,
			Longitude: place.Geometry.Location.Lng,
			Category:  category,
			PhotoURL:  photoURL,
			Rating:    place.Rating,
		})
		if len(results) >= 20 {
			break
		}
	}

	return results, nil
}

func (uc *travelPlanUsecase) searchOpenStreetMap(ctx context.Context, query string) ([]dto.PlaceSearchResult, error) {
	values := url.Values{}
	values.Set("q", query)
	values.Set("format", "json")
	values.Set("addressdetails", "1")
	values.Set("limit", "20")

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		"https://nominatim.openstreetmap.org/search?"+values.Encode(),
		nil,
	)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", "GIMS-TravelPlanner/1.0")

	response, err := uc.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("openstreetmap error status: %d", response.StatusCode)
	}

	var payload []struct {
		DisplayName string `json:"display_name"`
		Lat         string `json:"lat"`
		Lon         string `json:"lon"`
		Type        string `json:"type"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, err
	}

	results := make([]dto.PlaceSearchResult, 0, len(payload))
	for _, place := range payload {
		latitude, err := strconv.ParseFloat(place.Lat, 64)
		if err != nil {
			continue
		}
		longitude, err := strconv.ParseFloat(place.Lon, 64)
		if err != nil {
			continue
		}

		placeName := place.DisplayName
		if firstPart := strings.Split(place.DisplayName, ","); len(firstPart) > 0 {
			placeName = strings.TrimSpace(firstPart[0])
		}

		results = append(results, dto.PlaceSearchResult{
			Provider:  "open_street_map",
			PlaceName: placeName,
			Address:   place.DisplayName,
			Latitude:  latitude,
			Longitude: longitude,
			Category:  strings.TrimSpace(place.Type),
		})
	}

	return results, nil
}
