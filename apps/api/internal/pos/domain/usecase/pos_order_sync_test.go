package usecase

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestPOSDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbName := fmt.Sprintf("file:pos_test_%s?mode=memory&cache=shared", uuid.NewString())
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	schema := []string{
		`CREATE TABLE pos_orders (
			id TEXT PRIMARY KEY,
			tenant_id TEXT,
			order_number TEXT UNIQUE,
			session_id TEXT,
			outlet_id TEXT,
			pos_type TEXT DEFAULT 'GOODS',
			table_id TEXT,
			table_label TEXT,
			order_type TEXT DEFAULT 'COUNTER',
			customer_id TEXT,
			customer_name TEXT,
			customer_phone TEXT,
			customer_email TEXT,
			guest_count INTEGER DEFAULT 1,
			subtotal REAL DEFAULT 0,
			discount_amount REAL DEFAULT 0,
			tax_amount REAL DEFAULT 0,
			service_charge REAL DEFAULT 0,
			total_amount REAL DEFAULT 0,
			status TEXT DEFAULT 'DRAFT',
			notes TEXT,
			void_reason TEXT,
			sales_order_id TEXT,
			customer_invoice_id TEXT,
			loyalty_member_id TEXT,
			loyalty_reward_id TEXT,
			order_source TEXT DEFAULT 'STAFF',
			created_by TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE pos_order_items (
			id TEXT PRIMARY KEY,
			tenant_id TEXT,
			pos_order_id TEXT,
			product_id TEXT,
			product_name TEXT,
			product_code TEXT,
			quantity REAL DEFAULT 1,
			unit_price REAL DEFAULT 0,
			discount REAL DEFAULT 0,
			subtotal REAL DEFAULT 0,
			notes TEXT,
			status TEXT DEFAULT 'PENDING',
			kitchen_note TEXT,
			created_at DATETIME,
			updated_at DATETIME
		)`,
		`CREATE TABLE pos_configs (
			id TEXT PRIMARY KEY,
			tenant_id TEXT,
			outlet_id TEXT UNIQUE,
			tax_rate REAL DEFAULT 0,
			service_charge_rate REAL DEFAULT 0,
			allow_discount BOOLEAN DEFAULT 1,
			max_discount_percent REAL DEFAULT 100,
			print_receipt_auto BOOLEAN DEFAULT 0,
			receipt_footer TEXT,
			receipt_whatsapp_template TEXT,
			currency TEXT DEFAULT 'IDR',
			updated_by TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
			code TEXT,
			name TEXT,
			category_id TEXT,
			selling_price REAL,
			status TEXT,
			is_approved BOOLEAN,
			is_active BOOLEAN,
			pos_scope TEXT DEFAULT 'none',
			product_kind TEXT,
			image_url TEXT,
			deleted_at DATETIME
		)`,
	}

	for _, ddl := range schema {
		err = db.Exec(ddl).Error
		require.NoError(t, err)
	}

	return db
}

func seedTestProducts(t *testing.T, db *gorm.DB) []productModels.Product {
	t.Helper()
	products := []productModels.Product{
		{
			ID:           "11111111-1111-1111-1111-111111111111",
			Code:         "COFFEE-01",
			Name:         "Espresso",
			SellingPrice: 25000,
			ProductKind:  productModels.ProductKindStock,
		},
		{
			ID:           "22222222-2222-2222-2222-222222222222",
			Code:         "COFFEE-02",
			Name:         "Cappuccino",
			SellingPrice: 35000,
			ProductKind:  productModels.ProductKindStock,
		},
		{
			ID:           "33333333-3333-3333-3333-333333333333",
			Code:         "SNACK-01",
			Name:         "Croissant",
			SellingPrice: 20000,
			ProductKind:  productModels.ProductKindStock,
		},
	}
	for _, p := range products {
		require.NoError(t, db.Exec(
			"INSERT INTO products (id, code, name, selling_price, product_kind) VALUES (?, ?, ?, ?, ?)",
			p.ID, p.Code, p.Name, p.SellingPrice, p.ProductKind,
		).Error)
	}
	return products
}

func TestPOSOrderSyncAndBatch(t *testing.T) {
	db := setupTestPOSDB(t)
	products := seedTestProducts(t, db)

	orderRepo := repositories.NewPosOrderRepository(db)
	productRepo := repositories.NewPOSProductRepository(db)
	configRepo := repositories.NewPOSConfigRepository(db)

	uc := NewPOSOrderUsecase(db, orderRepo, nil, productRepo, configRepo, nil)
	ctx := context.WithValue(context.Background(), "permission_scope", "ALL")
	outletID := uuid.NewString()

	t.Run("Create order with bulk items in single transaction", func(t *testing.T) {
		req := &dto.CreateOrderRequest{
			OutletID:   outletID,
			OrderType:  "DINE_IN",
			GuestCount: 2,
			Items: []dto.OrderItemInput{
				{ProductID: products[0].ID, Quantity: 2}, // 2 * 25000 = 50000
				{ProductID: products[1].ID, Quantity: 1}, // 1 * 35000 = 35000
			},
		}

		resp, err := uc.Create(ctx, req, "test-cashier")
		require.NoError(t, err)
		assert.Equal(t, "DRAFT", resp.Status)
		assert.Equal(t, 2, len(resp.Items))
		assert.Equal(t, float64(85000), resp.Subtotal)
		assert.Equal(t, float64(85000), resp.TotalAmount)
	})

	t.Run("AssignTable and unassign table", func(t *testing.T) {
		// 1. Create draft
		createReq := &dto.CreateOrderRequest{
			OutletID:   outletID,
			OrderType:  "DINE_IN",
			GuestCount: 1,
			Items: []dto.OrderItemInput{
				{ProductID: products[0].ID, Quantity: 1},
			},
		}
		order, err := uc.Create(ctx, createReq, "test-cashier")
		require.NoError(t, err)

		// 2. Assign table T1
		tableID := "T1"
		tableLabel := "Table 1"
		assigned, err := uc.AssignTable(ctx, order.ID, &dto.AssignTableRequest{
			TableID:    tableID,
			TableLabel: tableLabel,
		})
		require.NoError(t, err)
		assert.NotNil(t, assigned.TableID)
		assert.Equal(t, tableID, *assigned.TableID)
		assert.NotNil(t, assigned.TableLabel)
		assert.Equal(t, tableLabel, *assigned.TableLabel)

		// 3. Unassign table by passing empty TableID
		unassigned, err := uc.AssignTable(ctx, order.ID, &dto.AssignTableRequest{
			TableID:    "",
			TableLabel: "",
		})
		require.NoError(t, err)
		assert.Nil(t, unassigned.TableID)
		assert.Nil(t, unassigned.TableLabel)

		// Verify in DB directly
		stored, err := orderRepo.GetByID(ctx, order.ID)
		require.NoError(t, err)
		assert.Nil(t, stored.TableID)
		assert.Nil(t, stored.TableLabel)
	})

	t.Run("SyncItems reconciliation (insert, update, delete)", func(t *testing.T) {
		// 1. Create order with item 0 and item 1
		createReq := &dto.CreateOrderRequest{
			OutletID:   outletID,
			OrderType:  "DINE_IN",
			GuestCount: 1,
			Items: []dto.OrderItemInput{
				{ProductID: products[0].ID, Quantity: 1}, // 25000
				{ProductID: products[1].ID, Quantity: 2}, // 70000
			},
		}
		order, err := uc.Create(ctx, createReq, "test-cashier")
		require.NoError(t, err)
		assert.Equal(t, float64(95000), order.Subtotal)

		// 2. Sync:
		// - Update item 0: quantity 1 -> 3 (75000)
		// - Remove item 1 (omitted from payload)
		// - Add item 2 (Croissant): quantity 2 (40000)
		syncReq := &dto.SyncOrderItemsRequest{
			Items: []dto.OrderItemInput{
				{ProductID: products[0].ID, Quantity: 3},
				{ProductID: products[2].ID, Quantity: 2},
			},
		}
		synced, err := uc.SyncItems(ctx, order.ID, syncReq)
		require.NoError(t, err)
		assert.Equal(t, 2, len(synced.Items))
		assert.Equal(t, float64(115000), synced.Subtotal) // 75000 + 40000

		// Verify item 1 is deleted from DB
		itemsInDB, err := orderRepo.GetItems(ctx, order.ID)
		require.NoError(t, err)
		assert.Equal(t, 2, len(itemsInDB))
		for _, it := range itemsInDB {
			assert.NotEqual(t, products[1].ID, it.ProductID)
		}
	})

	t.Run("SyncItems with empty list clears all items", func(t *testing.T) {
		createReq := &dto.CreateOrderRequest{
			OutletID:   outletID,
			OrderType:  "DINE_IN",
			GuestCount: 1,
			Items: []dto.OrderItemInput{
				{ProductID: products[0].ID, Quantity: 2},
			},
		}
		order, err := uc.Create(ctx, createReq, "test-cashier")
		require.NoError(t, err)
		assert.Equal(t, float64(50000), order.Subtotal)

		synced, err := uc.SyncItems(ctx, order.ID, &dto.SyncOrderItemsRequest{Items: []dto.OrderItemInput{}})
		require.NoError(t, err)
		assert.Equal(t, 0, len(synced.Items))
		assert.Equal(t, float64(0), synced.Subtotal)
		assert.Equal(t, float64(0), synced.TotalAmount)

		itemsInDB, err := orderRepo.GetItems(ctx, order.ID)
		require.NoError(t, err)
		assert.Equal(t, 0, len(itemsInDB))
	})

	t.Run("Concurrent SyncItems stress test", func(t *testing.T) {
		createReq := &dto.CreateOrderRequest{
			OutletID:   outletID,
			OrderType:  "DINE_IN",
			GuestCount: 1,
		}
		order, err := uc.Create(ctx, createReq, "test-cashier")
		require.NoError(t, err)

		var wg sync.WaitGroup
		concurrency := 15
		for i := 0; i < concurrency; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				qty := float64((idx % 5) + 1)
				_, syncErr := uc.SyncItems(ctx, order.ID, &dto.SyncOrderItemsRequest{
					Items: []dto.OrderItemInput{
						{ProductID: products[idx%len(products)].ID, Quantity: qty},
					},
				})
				assert.NoError(t, syncErr)
			}(i)
		}
		wg.Wait()

		// Final check: Order should be in valid consistent state
		finalOrder, err := orderRepo.GetByID(ctx, order.ID)
		require.NoError(t, err)
		assert.True(t, finalOrder.Subtotal > 0)
		assert.Equal(t, finalOrder.Subtotal, finalOrder.TotalAmount)
	})
}
