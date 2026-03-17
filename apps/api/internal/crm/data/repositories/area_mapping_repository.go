package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"gorm.io/gorm"
)

// AreaMappingRepository defines operations for area mapping data
type AreaMappingRepository interface {
	// GetCustomersForMapping returns all customers with their activity metrics
	GetCustomersForMapping(ctx context.Context, startDate *time.Time, endDate *time.Time) ([]dto.AreaMappingCustomerData, error)

	// GetLeadsForMapping returns all leads with their activity metrics
	GetLeadsForMapping(ctx context.Context, startDate *time.Time, endDate *time.Time) ([]dto.AreaMappingLeadData, error)
}

// NewAreaMappingRepository creates a new area mapping repository
func NewAreaMappingRepository(db *gorm.DB) AreaMappingRepository {
	return &areaMappingRepository{db: db}
}

type areaMappingRepository struct {
	db *gorm.DB
}

func (r *areaMappingRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

// GetCustomersForMapping returns customers with activity and pipeline metrics.
func (r *areaMappingRepository) GetCustomersForMapping(ctx context.Context, startDate *time.Time, endDate *time.Time) ([]dto.AreaMappingCustomerData, error) {
	var results []dto.AreaMappingCustomerData

	activityJoin := "LEFT JOIN crm_activities a ON c.id = a.customer_id"
	dealJoin := "LEFT JOIN crm_deals d ON c.id = d.customer_id"
	args := make([]interface{}, 0)

	if startDate != nil && endDate != nil {
		activityJoin += " AND a.created_at >= ? AND a.created_at < ?"
		args = append(args, *startDate, *endDate)
		dealJoin += " AND d.created_at >= ? AND d.created_at < ?"
		args = append(args, *startDate, *endDate)
	}

	query := fmt.Sprintf(`
		SELECT
			c.id,
			c.code,
			c.name,
			'customer' AS type,
			c.latitude,
			c.longitude,
			COALESCE(p.name, '') AS province,
			COALESCE(ci.name, '') AS city,
			COALESCE(COUNT(DISTINCT a.id), 0) AS activity_count,
			COALESCE(COUNT(DISTINCT d.id), 0) AS deal_count,
			COALESCE(SUM(d.value), 0) AS total_deal_value,
			MAX(a.created_at) AS last_activity_at,
			CASE
				WHEN (COALESCE(COUNT(DISTINCT a.id), 0) + COALESCE(COUNT(DISTINCT d.id), 0)) = 0 THEN 10
				ELSE LEAST(100, (COALESCE(COUNT(DISTINCT a.id), 0) * 5 + COALESCE(COUNT(DISTINCT d.id), 0) * 15))
			END AS intensity_score
		FROM customers c
		LEFT JOIN provinces p ON c.province_id = p.id
		LEFT JOIN cities ci ON c.city_id = ci.id
		%s
		%s
		WHERE c.deleted_at IS NULL
			AND c.latitude IS NOT NULL
			AND c.longitude IS NOT NULL
		GROUP BY c.id, c.code, c.name, c.latitude, c.longitude, p.name, ci.name
		ORDER BY intensity_score DESC
	`, activityJoin, dealJoin)

	if err := r.getDB(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}

	return results, nil
}

// GetLeadsForMapping returns potential customers (leads) with activity metrics.
func (r *areaMappingRepository) GetLeadsForMapping(ctx context.Context, startDate *time.Time, endDate *time.Time) ([]dto.AreaMappingLeadData, error) {
	var results []dto.AreaMappingLeadData

	activityJoin := "LEFT JOIN crm_activities a ON l.id = a.lead_id"
	taskJoin := "LEFT JOIN crm_tasks t ON l.id = t.lead_id"
	args := make([]interface{}, 0)

	if startDate != nil && endDate != nil {
		activityJoin += " AND a.created_at >= ? AND a.created_at < ?"
		args = append(args, *startDate, *endDate)
		taskJoin += " AND t.created_at >= ? AND t.created_at < ?"
		args = append(args, *startDate, *endDate)
	}

	query := fmt.Sprintf(`
		SELECT
			l.id,
			l.code,
			CONCAT(l.first_name, ' ', COALESCE(l.last_name, '')) AS name,
			'lead' AS type,
			l.latitude,
			l.longitude,
			COALESCE(l.province, '') AS province,
			COALESCE(l.city, '') AS city,
			COALESCE(ls.name, '') AS lead_status,
			COALESCE(l.lead_score, 0) AS lead_score,
			COALESCE(l.estimated_value, 0) AS estimated_value,
			l.assigned_to,
			e.name AS assigned_name,
			COALESCE(COUNT(DISTINCT a.id), 0) AS activity_count,
			COALESCE(COUNT(DISTINCT t.id), 0) AS task_count,
			MAX(a.created_at) AS last_activity_at,
			CASE
				WHEN (COALESCE(COUNT(DISTINCT a.id), 0) + COALESCE(COUNT(DISTINCT t.id), 0) + COALESCE(l.lead_score, 0)) = 0 THEN 10
				ELSE LEAST(100, (COALESCE(COUNT(DISTINCT a.id), 0) * 5 + COALESCE(COUNT(DISTINCT t.id), 0) * 3 + COALESCE(l.lead_score, 0) / 2))
			END AS intensity_score
		FROM crm_leads l
		LEFT JOIN crm_lead_statuses ls ON l.lead_status_id = ls.id
		LEFT JOIN employees e ON l.assigned_to = e.id
		%s
		%s
		WHERE l.deleted_at IS NULL
			AND l.converted_at IS NULL
			AND l.latitude IS NOT NULL
			AND l.longitude IS NOT NULL
		GROUP BY l.id, l.code, l.first_name, l.last_name, l.latitude, l.longitude, l.province, l.city, ls.name, l.lead_score, l.estimated_value, l.assigned_to, e.name
		ORDER BY intensity_score DESC
	`, activityJoin, taskJoin)

	if err := r.getDB(ctx).Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, err
	}

	return results, nil
}
