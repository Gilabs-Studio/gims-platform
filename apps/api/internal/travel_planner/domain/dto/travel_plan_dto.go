package dto

type EnumOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

type TravelPlanStopRequest struct {
	PlaceName  string  `json:"place_name" binding:"required,max=255"`
	Latitude   float64 `json:"latitude" binding:"required"`
	Longitude  float64 `json:"longitude" binding:"required"`
	Category   string  `json:"category" binding:"required"`
	OrderIndex int     `json:"order_index"`
	IsLocked   bool    `json:"is_locked"`
	Source     string  `json:"source"`
	PhotoURL   string  `json:"photo_url"`
	Note       string  `json:"note"`
}

type TravelPlanDayNoteRequest struct {
	IconTag    string `json:"icon_tag"`
	NoteText   string `json:"note_text" binding:"required"`
	NoteTime   string `json:"note_time"`
	OrderIndex int    `json:"order_index"`
}

type TravelPlanDayRequest struct {
	DayIndex    int                        `json:"day_index" binding:"required,min=1"`
	DayDate     string                     `json:"day_date" binding:"required"`
	Summary     string                     `json:"summary"`
	WeatherRisk string                     `json:"weather_risk"`
	Stops       []TravelPlanStopRequest    `json:"stops" binding:"required,min=1"`
	Notes       []TravelPlanDayNoteRequest `json:"notes"`
}

type CreateTravelPlanRequest struct {
	Title     string                 `json:"title" binding:"required,max=255"`
	Mode      string                 `json:"mode" binding:"required"`
	StartDate string                 `json:"start_date" binding:"required"`
	EndDate   string                 `json:"end_date" binding:"required"`
	Notes     string                 `json:"notes"`
	Days      []TravelPlanDayRequest `json:"days" binding:"required,min=1"`
}

type UpdateTravelPlanRequest struct {
	Title     string                 `json:"title" binding:"required,max=255"`
	Mode      string                 `json:"mode" binding:"required"`
	StartDate string                 `json:"start_date" binding:"required"`
	EndDate   string                 `json:"end_date" binding:"required"`
	Status    string                 `json:"status"`
	Notes     string                 `json:"notes"`
	Days      []TravelPlanDayRequest `json:"days" binding:"required,min=1"`
}

type ListTravelPlansRequest struct {
	Page      int     `form:"page" binding:"omitempty,min=1"`
	PerPage   int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search    string  `form:"search"`
	Mode      *string `form:"mode"`
	Status    *string `form:"status"`
	StartDate *string `form:"start_date"`
	EndDate   *string `form:"end_date"`
}

type TravelPlanStopResponse struct {
	ID         string  `json:"id"`
	PlaceName  string  `json:"place_name"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Category   string  `json:"category"`
	OrderIndex int     `json:"order_index"`
	IsLocked   bool    `json:"is_locked"`
	Source     string  `json:"source"`
	PhotoURL   string  `json:"photo_url"`
	Note       string  `json:"note"`
}

type TravelPlanDayNoteResponse struct {
	ID         string `json:"id"`
	IconTag    string `json:"icon_tag"`
	NoteText   string `json:"note_text"`
	NoteTime   string `json:"note_time"`
	OrderIndex int    `json:"order_index"`
}

type TravelPlanDayResponse struct {
	ID          string                      `json:"id"`
	DayIndex    int                         `json:"day_index"`
	DayDate     string                      `json:"day_date"`
	Summary     string                      `json:"summary"`
	WeatherRisk string                      `json:"weather_risk"`
	Stops       []TravelPlanStopResponse    `json:"stops"`
	Notes       []TravelPlanDayNoteResponse `json:"notes"`
}

type TravelPlanResponse struct {
	ID        string                  `json:"id"`
	Code      string                  `json:"code"`
	Title     string                  `json:"title"`
	Mode      string                  `json:"mode"`
	StartDate string                  `json:"start_date"`
	EndDate   string                  `json:"end_date"`
	Status    string                  `json:"status"`
	Notes     string                  `json:"notes"`
	Days      []TravelPlanDayResponse `json:"days"`
	CreatedBy *string                 `json:"created_by"`
	CreatedAt string                  `json:"created_at"`
	UpdatedAt string                  `json:"updated_at"`
}

type PlaceSearchResult struct {
	Provider  string   `json:"provider"`
	PlaceName string   `json:"place_name"`
	Address   string   `json:"address"`
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	Category  string   `json:"category"`
	PhotoURL  string   `json:"photo_url"`
	Rating    *float64 `json:"rating"`
}

type RouteOptimizationDaySummary struct {
	DayID            string   `json:"day_id"`
	DayIndex         int      `json:"day_index"`
	TotalDistanceKM  float64  `json:"total_distance_km"`
	GoogleMapsURL    string   `json:"google_maps_url"`
	OptimizedStopIDs []string `json:"optimized_stop_ids"`
}

type RouteOptimizationResponse struct {
	PlanID      string                        `json:"plan_id"`
	OptimizedAt string                        `json:"optimized_at"`
	Days        []RouteOptimizationDaySummary `json:"days"`
}

type WeatherDayResponse struct {
	Date                 string  `json:"date"`
	TemperatureMin       float64 `json:"temperature_min"`
	TemperatureMax       float64 `json:"temperature_max"`
	PrecipitationPercent int     `json:"precipitation_percent"`
	Risk                 string  `json:"risk"`
	Source               string  `json:"source"`
}

type WeatherPlanResponse struct {
	PlanID string               `json:"plan_id"`
	Days   []WeatherDayResponse `json:"days"`
}

type DayGoogleMapsLink struct {
	DayID    string `json:"day_id"`
	DayIndex int    `json:"day_index"`
	URL      string `json:"url"`
}

type TravelPlannerFormDataResponse struct {
	Modes       []EnumOption `json:"modes"`
	Categories  []EnumOption `json:"categories"`
	Sources     []EnumOption `json:"sources"`
	WeatherRisk []EnumOption `json:"weather_risk"`
}
