package ws

import (
	"encoding/json"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type BoundingBox struct {
	MinLat float64
	MinLng float64
	MaxLat float64
	MaxLng float64
}

type SubscriptionFilter struct {
	EmployeeIDs map[string]struct{}
	BBox        *BoundingBox
}

type LocationUpdate struct {
	EmployeeID   string
	RouteID      *string
	CheckpointID *string
	Lat          float64
	Lng          float64
	Heading      *float64
	Timestamp    time.Time
}

type RouteStatusUpdate struct {
	EmployeeID   string
	RouteID      *string
	CheckpointID *string
	Status       string
	Timestamp    time.Time
}

type subscriber struct {
	id     string
	conn   *websocket.Conn
	filter SubscriptionFilter
	mu     sync.Mutex
}

type LocationHub struct {
	mu          sync.RWMutex
	subscribers map[string]*subscriber
	latest      map[string]LocationUpdate
}

var defaultLocationHub = NewLocationHub()

func NewLocationHub() *LocationHub {
	return &LocationHub{
		subscribers: make(map[string]*subscriber),
		latest:      make(map[string]LocationUpdate),
	}
}

func DefaultLocationHub() *LocationHub {
	return defaultLocationHub
}

func (h *LocationHub) Register(conn *websocket.Conn, filter SubscriptionFilter) string {
	h.mu.Lock()
	defer h.mu.Unlock()

	id := uuid.New().String()
	h.subscribers[id] = &subscriber{
		id:     id,
		conn:   conn,
		filter: filter,
	}

	return id
}

func (h *LocationHub) Unregister(id string) {
	h.mu.Lock()
	sub, exists := h.subscribers[id]
	if exists {
		delete(h.subscribers, id)
	}
	h.mu.Unlock()

	if exists {
		sub.mu.Lock()
		_ = sub.conn.Close()
		sub.mu.Unlock()
	}
}

func (h *LocationHub) PublishLocationUpdate(update LocationUpdate) {
	h.mu.Lock()
	h.latest[update.EmployeeID] = update
	h.mu.Unlock()

	h.broadcast("location_update", map[string]interface{}{
		"employee_id":   update.EmployeeID,
		"route_id":      update.RouteID,
		"checkpoint_id": update.CheckpointID,
		"lat":           update.Lat,
		"lng":           update.Lng,
		"heading":       update.Heading,
		"timestamp":     update.Timestamp.Format(time.RFC3339),
	}, func(filter SubscriptionFilter) bool {
		return matchesFilter(filter, update.EmployeeID, update.Lat, update.Lng)
	})
}

func (h *LocationHub) PublishRouteStatus(update RouteStatusUpdate) {
	h.broadcast("route_status", map[string]interface{}{
		"employee_id":   update.EmployeeID,
		"route_id":      update.RouteID,
		"checkpoint_id": update.CheckpointID,
		"status":        update.Status,
		"timestamp":     update.Timestamp.Format(time.RFC3339),
	}, func(filter SubscriptionFilter) bool {
		if len(filter.EmployeeIDs) == 0 {
			return true
		}
		_, exists := filter.EmployeeIDs[update.EmployeeID]
		return exists
	})
}

func (h *LocationHub) Snapshot(filter SubscriptionFilter) []LocationUpdate {
	h.mu.RLock()
	defer h.mu.RUnlock()

	items := make([]LocationUpdate, 0, len(h.latest))
	for _, update := range h.latest {
		if matchesFilter(filter, update.EmployeeID, update.Lat, update.Lng) {
			items = append(items, update)
		}
	}

	return items
}

func (h *LocationHub) broadcast(msgType string, data map[string]interface{}, allow func(filter SubscriptionFilter) bool) {
	payload, err := json.Marshal(map[string]interface{}{
		"type": msgType,
		"data": data,
	})
	if err != nil {
		return
	}

	h.mu.RLock()
	subs := make([]*subscriber, 0, len(h.subscribers))
	for _, sub := range h.subscribers {
		subs = append(subs, sub)
	}
	h.mu.RUnlock()

	for _, sub := range subs {
		if !allow(sub.filter) {
			continue
		}
		if err := sub.write(payload); err != nil {
			h.Unregister(sub.id)
		}
	}
}

func (s *subscriber) write(payload []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.WriteMessage(websocket.TextMessage, payload)
}

func matchesFilter(filter SubscriptionFilter, employeeID string, lat float64, lng float64) bool {
	if len(filter.EmployeeIDs) > 0 {
		if _, exists := filter.EmployeeIDs[employeeID]; !exists {
			return false
		}
	}

	if filter.BBox == nil {
		return true
	}

	if math.IsNaN(lat) || math.IsNaN(lng) {
		return false
	}

	minLat := math.Min(filter.BBox.MinLat, filter.BBox.MaxLat)
	maxLat := math.Max(filter.BBox.MinLat, filter.BBox.MaxLat)
	minLng := math.Min(filter.BBox.MinLng, filter.BBox.MaxLng)
	maxLng := math.Max(filter.BBox.MinLng, filter.BBox.MaxLng)

	return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}
