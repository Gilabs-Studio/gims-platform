package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/notification/data/models"
	"gorm.io/gorm"
)

type ListParams struct {
	UserID     string
	Type       string
	EntityType string
	IsRead     *bool
	Limit      int
	Offset     int
}

type NotificationRepository interface {
	List(ctx context.Context, params ListParams) ([]models.Notification, int64, error)
	CountUnread(ctx context.Context, userID string) (int64, error)
	MarkAsRead(ctx context.Context, userID, id string, readAt time.Time) (*models.Notification, error)
	CreateBulk(ctx context.Context, notifications []models.Notification) error
}

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) List(ctx context.Context, params ListParams) ([]models.Notification, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ?", params.UserID)

	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.EntityType != "" {
		query = query.Where("entity_type = ?", params.EntityType)
	}
	if params.IsRead != nil {
		query = query.Where("is_read = ?", *params.IsRead)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		if isMissingNotificationsTableError(err) {
			return []models.Notification{}, 0, nil
		}
		return nil, 0, err
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	var items []models.Notification
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&items).Error; err != nil {
		if isMissingNotificationsTableError(err) {
			return []models.Notification{}, 0, nil
		}
		return nil, 0, err
	}

	return items, total, nil
}

func (r *notificationRepository) CountUnread(ctx context.Context, userID string) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&total).Error
	if err != nil {
		if isMissingNotificationsTableError(err) {
			return 0, nil
		}
		return 0, err
	}
	return total, nil
}

func (r *notificationRepository) MarkAsRead(ctx context.Context, userID, id string, readAt time.Time) (*models.Notification, error) {
	var item models.Notification
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
			if isMissingNotificationsTableError(err) {
				return gorm.ErrRecordNotFound
			}
			return err
		}
		if item.IsRead {
			return nil
		}
		return tx.Model(&item).Updates(map[string]interface{}{
			"is_read": true,
			"read_at": readAt,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *notificationRepository) CreateBulk(ctx context.Context, notifications []models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}
	err := r.db.WithContext(ctx).Create(&notifications).Error
	if isMissingNotificationsTableError(err) {
		return nil
	}
	return err
}

func isMissingNotificationsTableError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "relation \"notifications\" does not exist") ||
		strings.Contains(errMsg, "sqlstate 42p01") ||
		strings.Contains(errMsg, "no such table: notifications")
}
