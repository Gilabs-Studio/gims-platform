package usecase

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/notification/data/models"
	"github.com/gilabs/gims/api/internal/notification/data/repositories"
	"github.com/gilabs/gims/api/internal/notification/domain/dto"
)

type entityLinkRule struct {
	basePath string
	queryKey string
}

var entityLinkRules = map[string]entityLinkRule{
	"company":              {basePath: "/master-data/company"},
	"employee":             {basePath: "/master-data/employees"},
	"supplier":             {basePath: "/master-data/suppliers"},
	"customer":             {basePath: "/master-data/customers"},
	"product":              {basePath: "/master-data/products"},
	"sales_quotation":      {basePath: "/sales/quotations", queryKey: "open_quotation"},
	"sales_order":          {basePath: "/sales/orders", queryKey: "open_order"},
	"delivery_order":       {basePath: "/sales/delivery-orders"},
	"customer_invoice":     {basePath: "/sales/invoices"},
	"customer_invoice_dp":  {basePath: "/sales/customer-invoice-down-payments"},
	"purchase_requisition": {basePath: "/purchase/purchase-requisitions"},
	"purchase_order":       {basePath: "/purchase/purchase-orders"},
	"goods_receipt":        {basePath: "/purchase/goods-receipt"},
	"supplier_invoice":     {basePath: "/purchase/supplier-invoices"},
	"supplier_invoice_dp":  {basePath: "/purchase/supplier-invoice-down-payments"},
	"stock_opname":         {basePath: "/stock/opname"},
	"payment":              {basePath: "/finance/payments"},
	"non_trade_payable":    {basePath: "/finance/non-trade-payables"},
	"budget":               {basePath: "/finance/budget"},
	"financial_closing":    {basePath: "/finance/closing"},
	"asset_maintenance":    {basePath: "/finance/asset-maintenance"},
	"up_country_cost":      {basePath: "/finance/up-country-cost"},
	"salary":               {basePath: "/finance/salary"},
	"leave_request":        {basePath: "/hrd/leave-requests"},
	"overtime":             {basePath: "/hrd/overtime"},
	"recruitment":          {basePath: "/hrd/recruitment"},
	"crm_visit":            {basePath: "/crm/visits"},
}

type NotificationUsecase interface {
	List(ctx context.Context, userID string, page, perPage int, notifType, entityType string, isRead *bool) ([]dto.NotificationResponse, int64, error)
	GetUnreadCount(ctx context.Context, userID string) (*dto.UnreadCountResponse, error)
	MarkAsRead(ctx context.Context, userID, id string) (*dto.NotificationResponse, error)
}

type notificationUsecase struct {
	repo repositories.NotificationRepository
}

func NewNotificationUsecase(repo repositories.NotificationRepository) NotificationUsecase {
	return &notificationUsecase{repo: repo}
}

func (u *notificationUsecase) List(ctx context.Context, userID string, page, perPage int, notifType, entityType string, isRead *bool) ([]dto.NotificationResponse, int64, error) {
	items, total, err := u.repo.List(ctx, repositories.ListParams{
		UserID:     userID,
		Type:       notifType,
		EntityType: entityType,
		IsRead:     isRead,
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.NotificationResponse, 0, len(items))
	for _, item := range items {
		res = append(res, mapToResponse(item))
	}
	return res, total, nil
}

func (u *notificationUsecase) GetUnreadCount(ctx context.Context, userID string) (*dto.UnreadCountResponse, error) {
	total, err := u.repo.CountUnread(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &dto.UnreadCountResponse{UnreadCount: total}, nil
}

func (u *notificationUsecase) MarkAsRead(ctx context.Context, userID, id string) (*dto.NotificationResponse, error) {
	item, err := u.repo.MarkAsRead(ctx, userID, id, apptime.Now())
	if err != nil {
		return nil, err
	}
	res := mapToResponse(*item)
	return &res, nil
}

func mapToResponse(item models.Notification) dto.NotificationResponse {
	return dto.NotificationResponse{
		ID:         item.ID,
		UserID:     item.UserID,
		Type:       item.Type,
		Title:      item.Title,
		Message:    item.Message,
		EntityType: item.EntityType,
		EntityID:   item.EntityID,
		EntityLink: buildEntityLink(item.EntityType, item.EntityID),
		IsRead:     item.IsRead,
		ReadAt:     item.ReadAt,
		CreatedAt:  item.CreatedAt,
	}
}

func buildEntityLink(entityType, entityID string) string {
	rule, ok := entityLinkRules[entityType]
	if !ok {
		return ""
	}

	if entityID == "" || rule.queryKey == "" {
		return rule.basePath
	}

	return fmt.Sprintf("%s?%s=%s", rule.basePath, rule.queryKey, entityID)
}
