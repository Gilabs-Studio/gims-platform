package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// PosEventType identifies the kind of real-time POS event.
type PosEventType string

const (
	// PosEventNewCustomerOrder fires when a customer places an order via the self-order QR page.
	PosEventNewCustomerOrder PosEventType = "pos.new_customer_order"
	// PosEventOrderStatusChanged fires when order status transitions (e.g. IN_PROGRESS → READY).
	PosEventOrderStatusChanged PosEventType = "pos.order_status_changed"
)

// PosEvent is the envelope sent over every WebSocket connection.
type PosEvent struct {
	Type      PosEventType           `json:"type"`
	OutletID  string                 `json:"outlet_id"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp string                 `json:"timestamp"`
}

type posSubscriber struct {
	id       string
	conn     *websocket.Conn
	outletID string
	mu       sync.Mutex
}

// PosHub manages WebSocket connections for the POS real-time event system.
// Subscriptions are keyed by outlet_id so events fan-out only to relevant staff.
type PosHub struct {
	mu          sync.RWMutex
	subscribers map[string]*posSubscriber
}

var defaultPosHub = NewPosHub()

// NewPosHub creates an isolated hub instance.
func NewPosHub() *PosHub {
	return &PosHub{
		subscribers: make(map[string]*posSubscriber),
	}
}

// DefaultPosHub returns the process-wide singleton hub.
func DefaultPosHub() *PosHub {
	return defaultPosHub
}

// Register adds a WebSocket connection subscribed to events for the given outlet.
// Returns the subscriber ID needed to unregister later.
func (h *PosHub) Register(conn *websocket.Conn, outletID string) string {
	h.mu.Lock()
	defer h.mu.Unlock()

	id := uuid.New().String()
	h.subscribers[id] = &posSubscriber{
		id:       id,
		conn:     conn,
		outletID: outletID,
	}
	return id
}

// Unregister removes a subscriber and closes its connection.
func (h *PosHub) Unregister(id string) {
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

// PublishEvent broadcasts an event using a typed PosEventType.
func (h *PosHub) PublishEvent(outletID string, eventType PosEventType, payload map[string]interface{}) {
	h.Publish(outletID, string(eventType), payload)
}

// Publish satisfies the usecase.POSHubPublisher interface with a plain string event type.
func (h *PosHub) Publish(outletID string, eventType string, payload map[string]interface{}) {
	event := PosEvent{
		Type:      PosEventType(eventType),
		OutletID:  outletID,
		Payload:   payload,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	targets := make([]*posSubscriber, 0)
	for _, sub := range h.subscribers {
		if sub.outletID == outletID {
			targets = append(targets, sub)
		}
	}
	h.mu.RUnlock()

	for _, sub := range targets {
		sub.mu.Lock()
		_ = sub.conn.WriteMessage(websocket.TextMessage, data)
		sub.mu.Unlock()
	}
}
