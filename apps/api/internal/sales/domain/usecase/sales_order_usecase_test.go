package usecase

import (
	"context"
	"testing"

	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockSalesOrderRepo struct {
	orders []models.SalesOrder
	total  int64
	err    error
}

func (m *mockSalesOrderRepo) FindByID(ctx context.Context, id string) (*models.SalesOrder, error) {
	return nil, nil
}
func (m *mockSalesOrderRepo) FindByCode(ctx context.Context, code string) (*models.SalesOrder, error) {
	return nil, nil
}
func (m *mockSalesOrderRepo) List(ctx context.Context, req *dto.ListSalesOrdersRequest) ([]models.SalesOrder, int64, error) {
	return m.orders, m.total, m.err
}
func (m *mockSalesOrderRepo) ListItems(ctx context.Context, orderID string, req *dto.ListSalesOrderItemsRequest) ([]models.SalesOrderItem, int64, error) {
	return nil, 0, nil
}
func (m *mockSalesOrderRepo) Create(ctx context.Context, so *models.SalesOrder) error {
	return nil
}
func (m *mockSalesOrderRepo) Update(ctx context.Context, so *models.SalesOrder) error {
	return nil
}
func (m *mockSalesOrderRepo) Delete(ctx context.Context, id string) error {
	return nil
}
func (m *mockSalesOrderRepo) GetNextOrderNumber(ctx context.Context, prefix string) (string, error) {
	return "", nil
}
func (m *mockSalesOrderRepo) UpdateStatus(ctx context.Context, id string, status models.SalesOrderStatus, userID *string, reason *string) error {
	return nil
}
func (m *mockSalesOrderRepo) ReserveStock(ctx context.Context, orderID string) error {
	return nil
}
func (m *mockSalesOrderRepo) ReleaseStock(ctx context.Context, orderID string) error {
	return nil
}
func (m *mockSalesOrderRepo) UpdateItemDeliveredQty(ctx context.Context, itemID string, qty float64) error {
	return nil
}
func (m *mockSalesOrderRepo) UpdateItemInvoicedQty(ctx context.Context, itemID string, qty float64) error {
	return nil
}

type mockDeliveryOrderRepo struct {
	batchCallCount   int
	batchIDsReceived []string
	batchResult      map[string]map[string]float64
	singleCallCount  int
}

func (m *mockDeliveryOrderRepo) FindByID(ctx context.Context, id string) (*models.DeliveryOrder, error) {
	return nil, nil
}
func (m *mockDeliveryOrderRepo) FindByCode(ctx context.Context, code string) (*models.DeliveryOrder, error) {
	return nil, nil
}
func (m *mockDeliveryOrderRepo) List(ctx context.Context, req *dto.ListDeliveryOrdersRequest) ([]models.DeliveryOrder, int64, error) {
	return nil, 0, nil
}
func (m *mockDeliveryOrderRepo) ListItems(ctx context.Context, deliveryOrderID string, req *dto.ListDeliveryOrderItemsRequest) ([]models.DeliveryOrderItem, int64, error) {
	return nil, 0, nil
}
func (m *mockDeliveryOrderRepo) Create(ctx context.Context, do *models.DeliveryOrder) error {
	return nil
}
func (m *mockDeliveryOrderRepo) Update(ctx context.Context, do *models.DeliveryOrder) error {
	return nil
}
func (m *mockDeliveryOrderRepo) Delete(ctx context.Context, id string) error {
	return nil
}
func (m *mockDeliveryOrderRepo) GetNextDeliveryNumber(ctx context.Context, prefix string) (string, error) {
	return "", nil
}
func (m *mockDeliveryOrderRepo) UpdateStatus(ctx context.Context, id string, status models.DeliveryOrderStatus, userID *string, reason *string) error {
	return nil
}
func (m *mockDeliveryOrderRepo) Ship(ctx context.Context, id string, userID *string, trackingNumber string) error {
	return nil
}
func (m *mockDeliveryOrderRepo) Deliver(ctx context.Context, id string, userID *string, receiverSignature string, receiverName string) error {
	return nil
}
func (m *mockDeliveryOrderRepo) GetPendingDeliveryQtyBySalesOrder(ctx context.Context, salesOrderID string) (map[string]float64, error) {
	m.singleCallCount++
	return nil, nil
}
func (m *mockDeliveryOrderRepo) GetPendingDeliveryQtyBySalesOrderIDs(ctx context.Context, salesOrderIDs []string) (map[string]map[string]float64, error) {
	m.batchCallCount++
	m.batchIDsReceived = salesOrderIDs
	return m.batchResult, nil
}

func TestSalesOrderUsecase_List_BatchPendingDeliveries(t *testing.T) {
	t.Parallel()

	mockOrders := []models.SalesOrder{
		{
			ID:     "so-1",
			Code:   "SO-001",
			Status: models.SalesOrderStatusApproved,
			Items: []models.SalesOrderItem{
				{ID: "so-item-1", Quantity: 10},
			},
		},
		{
			ID:     "so-2",
			Code:   "SO-002",
			Status: models.SalesOrderStatusApproved,
			Items: []models.SalesOrderItem{
				{ID: "so-item-2", Quantity: 5},
			},
		},
		{
			ID:     "so-3",
			Code:   "SO-003",
			Status: models.SalesOrderStatusDraft,
			Items: []models.SalesOrderItem{
				{ID: "so-item-3", Quantity: 20},
			},
		},
	}

	orderRepo := &mockSalesOrderRepo{
		orders: mockOrders,
		total:  3,
	}
	deliveryOrderRepo := &mockDeliveryOrderRepo{
		batchResult: map[string]map[string]float64{
			"so-1": {"so-item-1": 4.0},
			"so-2": {"so-item-2": 2.0},
		},
	}

	uc := &salesOrderUsecase{
		orderRepo:         orderRepo,
		deliveryOrderRepo: deliveryOrderRepo,
	}

	resp, pag, err := uc.List(context.Background(), &dto.ListSalesOrdersRequest{Page: 1, PerPage: 10})
	require.NoError(t, err)
	require.NotNil(t, pag)
	assert.Equal(t, 3, len(resp))

	// Verify batch method was called exactly once with approved IDs only
	assert.Equal(t, 1, deliveryOrderRepo.batchCallCount)
	assert.Equal(t, 0, deliveryOrderRepo.singleCallCount)
	assert.ElementsMatch(t, []string{"so-1", "so-2"}, deliveryOrderRepo.batchIDsReceived)

	// Verify fulfillment pending quantity mapped correctly
	assert.NotNil(t, resp[0].Fulfillment)
	assert.Equal(t, 4.0, resp[0].Fulfillment.TotalPending)
	assert.NotNil(t, resp[1].Fulfillment)
	assert.Equal(t, 2.0, resp[1].Fulfillment.TotalPending)
}
