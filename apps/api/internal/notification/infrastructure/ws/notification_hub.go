package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	notificationModels "github.com/gilabs/gims/api/internal/notification/data/models"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	NotificationEventCreated = "notification.created"
	NotificationEventUpdated = "notification.updated"
	NotificationEventDeleted = "notification.deleted"
)

// NotificationEvent is the envelope sent to notification WebSocket clients.
type NotificationEvent struct {
	Event     string                          `json:"event"`
	Type      string                          `json:"type"`
	Data      notificationModels.Notification `json:"data"`
	TenantID  string                          `json:"tenant_id,omitempty"`
	UserID    string                          `json:"user_id"`
	Timestamp string                          `json:"timestamp"`
}

type notificationSubscriber struct {
	id       string
	conn     *websocket.Conn
	tenantID string
	userID   string
	mu       sync.Mutex
}

// NotificationHub manages user-scoped notification WebSocket subscribers.
type NotificationHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[string]*notificationSubscriber // map[userID]map[subscriberID]*notificationSubscriber
}

var defaultNotificationHub = NewNotificationHub()

func NewNotificationHub() *NotificationHub {
	return &NotificationHub{
		subscribers: make(map[string]map[string]*notificationSubscriber),
	}
}

func DefaultNotificationHub() *NotificationHub {
	return defaultNotificationHub
}

func (h *NotificationHub) Register(conn *websocket.Conn, tenantID, userID string) string {
	h.mu.Lock()
	defer h.mu.Unlock()

	id := uuid.New().String()
	if h.subscribers == nil {
		h.subscribers = make(map[string]map[string]*notificationSubscriber)
	}
	if h.subscribers[userID] == nil {
		h.subscribers[userID] = make(map[string]*notificationSubscriber)
	}
	h.subscribers[userID][id] = &notificationSubscriber{
		id:       id,
		conn:     conn,
		tenantID: tenantID,
		userID:   userID,
	}
	return id
}

func (h *NotificationHub) Unregister(userID, id string) {
	h.mu.Lock()
	var sub *notificationSubscriber
	if userSubs, exists := h.subscribers[userID]; exists {
		if s, ok := userSubs[id]; ok {
			sub = s
			delete(userSubs, id)
			if len(userSubs) == 0 {
				delete(h.subscribers, userID)
			}
		}
	}
	h.mu.Unlock()

	if sub != nil {
		sub.mu.Lock()
		_ = sub.conn.Close()
		sub.mu.Unlock()
	}
}

func (h *NotificationHub) PublishCreated(notification notificationModels.Notification) {
	h.Publish(NotificationEventCreated, notification)

	// Publish updated unread count asynchronously
	go func() {
		if count, err := h.CountUnread(notification.UserID); err == nil {
			h.PublishUnreadCount(notification.TenantID, notification.UserID, count)
		}
	}()
}

func (h *NotificationHub) Publish(eventType string, notification notificationModels.Notification) {
	if notification.UserID == "" || eventType == "" {
		return
	}

	event := NotificationEvent{
		Event:     eventType,
		Type:      eventType,
		Data:      notification,
		TenantID:  notification.TenantID,
		UserID:    notification.UserID,
		Timestamp: apptime.Now().UTC().Format(time.RFC3339),
	}

	h.deliver(event)
	publishNotificationToRedis(event)
}

func (h *NotificationHub) deliver(event NotificationEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	targets := make([]*notificationSubscriber, 0)
	if userSubs, exists := h.subscribers[event.UserID]; exists {
		for _, sub := range userSubs {
			if event.TenantID != "" && sub.tenantID != "" && sub.tenantID != event.TenantID {
				continue
			}
			targets = append(targets, sub)
		}
	}
	h.mu.RUnlock()

	for _, sub := range targets {
		sub.mu.Lock()
		if err := sub.conn.WriteMessage(websocket.TextMessage, data); err != nil {
			sub.mu.Unlock()
			h.Unregister(sub.userID, sub.id)
			continue
		}
		sub.mu.Unlock()
	}
}

// CountUnread counts unread notifications for a user using database directly.
func (h *NotificationHub) CountUnread(userID string) (int64, error) {
	if database.DB == nil {
		return 0, nil
	}
	var total int64
	err := database.DB.
		Table("notifications").
		Where("user_id = ? AND is_read = ? AND deleted_at IS NULL", userID, false).
		Count(&total).Error
	return total, err
}

// PublishUnreadCount sends the updated unread count to all WebSocket subscribers of the user.
func (h *NotificationHub) PublishUnreadCount(tenantID, userID string, count int64) {
	if userID == "" {
		return
	}

	payload := map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"unread_count": count,
		},
		"timestamp": apptime.Now().Format(time.RFC3339),
		"request_id": uuid.New().String(),
	}

	h.deliverRaw(tenantID, userID, payload)
	publishRawToRedis(tenantID, userID, payload)
}

func (h *NotificationHub) deliverRaw(tenantID, userID string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	h.mu.RLock()
	targets := make([]*notificationSubscriber, 0)
	if userSubs, exists := h.subscribers[userID]; exists {
		for _, sub := range userSubs {
			if tenantID != "" && sub.tenantID != "" && sub.tenantID != tenantID {
				continue
			}
			targets = append(targets, sub)
		}
	}
	h.mu.RUnlock()

	for _, sub := range targets {
		sub.mu.Lock()
		if err := sub.conn.WriteMessage(websocket.TextMessage, data); err != nil {
			sub.mu.Unlock()
			h.Unregister(sub.userID, sub.id)
			continue
		}
		sub.mu.Unlock()
	}
}
