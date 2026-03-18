package seeders

import (
	"log"
	"math"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm/clause"
)

const (
	SalesReturnSeed1ID    = "ab100001-0000-0000-0000-000000000001"
	SalesReturnSeed2ID    = "ab100001-0000-0000-0000-000000000002"
	PurchaseReturnSeed1ID = "ab100002-0000-0000-0000-000000000001"
	PurchaseReturnSeed2ID = "ab100002-0000-0000-0000-000000000002"
)

// SeedReturns seeds realistic sales/purchase return data using existing invoice and goods receipt records.
func SeedReturns() error {
	if err := SeedSalesReturns(); err != nil {
		return err
	}
	if err := SeedPurchaseReturns(); err != nil {
		return err
	}
	return nil
}

func SeedSalesReturns() error {
	db := database.DB
	adminID := getAdminID(db)

	var warehouse warehouseModels.Warehouse
	if err := db.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
		log.Println("Warning: No active warehouse found. Skipping sales returns seeder.")
		return nil
	}

	var invoices []salesModels.CustomerInvoice
	if err := db.
		Preload("Items").
		Preload("SalesOrder").
		Where("sales_order_id IS NOT NULL").
		Where("status IN ?", []string{"UNPAID", "PARTIAL", "PAID", "APPROVED", "WAITING_PAYMENT"}).
		Order("invoice_date ASC").
		Limit(5).
		Find(&invoices).Error; err != nil {
		return err
	}

	if len(invoices) == 0 {
		log.Println("Warning: No eligible customer invoices found. Skipping sales returns seeder.")
		return nil
	}

	targets := []struct {
		id     string
		code   string
		reason string
		action salesModels.SalesReturnAction
		status salesModels.SalesReturnStatus
		notes  string
	}{
		{SalesReturnSeed1ID, "SR-SEED-2026-001", "DAMAGED", salesModels.SalesReturnActionCreditNote, salesModels.SalesReturnStatusSubmitted, "Auto-seeded sales return for damaged item claim."},
		{SalesReturnSeed2ID, "SR-SEED-2026-002", "CUSTOMER_REQUEST", salesModels.SalesReturnActionRefund, salesModels.SalesReturnStatusDraft, "Auto-seeded sales return for customer request adjustment."},
	}

	for i, target := range targets {
		invoice := invoices[i%len(invoices)]
		if invoice.SalesOrder == nil || invoice.SalesOrder.CustomerID == nil || len(invoice.Items) == 0 {
			continue
		}

		row := salesModels.SalesReturn{
			ID:          target.id,
			Code:        target.code,
			InvoiceID:   stringPtr(invoice.ID),
			DeliveryID:  invoice.DeliveryOrderID,
			WarehouseID: warehouse.ID,
			CustomerID:  *invoice.SalesOrder.CustomerID,
			Reason:      target.reason,
			Action:      target.action,
			Status:      target.status,
			Notes:       stringPtr(target.notes),
			CreatedBy:   adminID,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"code", "invoice_id", "delivery_id", "warehouse_id", "customer_id", "reason", "action", "status", "notes", "created_by", "updated_at",
			}),
		}).Create(&row).Error; err != nil {
			return err
		}

		if err := db.Where("sales_return_id = ?", row.ID).Delete(&salesModels.SalesReturnItem{}).Error; err != nil {
			return err
		}

		totalAmount := 0.0
		for idx, invItem := range invoice.Items {
			if idx >= 2 {
				break
			}
			qty := math.Min(invItem.Quantity, 2)
			if qty <= 0 {
				continue
			}

			item := salesModels.SalesReturnItem{
				SalesReturnID: row.ID,
				InvoiceItemID: stringPtr(invItem.ID),
				ProductID:     invItem.ProductID,
				Condition:     "GOOD",
				Quantity:      qty,
				UnitPrice:     invItem.Price,
				Subtotal:      qty * invItem.Price,
			}
			totalAmount += item.Subtotal
			if err := db.Create(&item).Error; err != nil {
				return err
			}
		}

		if err := db.Model(&salesModels.SalesReturn{}).
			Where("id = ?", row.ID).
			Update("total_amount", totalAmount).Error; err != nil {
			return err
		}
	}

	log.Println("Sales returns seeded successfully")
	return nil
}

func SeedPurchaseReturns() error {
	db := database.DB
	adminID := getAdminID(db)

	var warehouse warehouseModels.Warehouse
	if err := db.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
		log.Println("Warning: No active warehouse found. Skipping purchase returns seeder.")
		return nil
	}

	var goodsReceipts []purchaseModels.GoodsReceipt
	if err := db.
		Preload("Items").
		Where("status IN ?", []string{"APPROVED", "PARTIAL", "CLOSED"}).
		Order("created_at ASC").
		Limit(5).
		Find(&goodsReceipts).Error; err != nil {
		return err
	}

	if len(goodsReceipts) == 0 {
		log.Println("Warning: No eligible goods receipts found. Skipping purchase returns seeder.")
		return nil
	}

	targets := []struct {
		id     string
		code   string
		reason string
		action purchaseModels.PurchaseReturnAction
		status purchaseModels.PurchaseReturnStatus
		notes  string
	}{
		{PurchaseReturnSeed1ID, "PR-SEED-2026-001", "DEFECT", purchaseModels.PurchaseReturnActionSupplierCredit, purchaseModels.PurchaseReturnStatusApproved, "Auto-seeded purchase return for supplier defect handling."},
		{PurchaseReturnSeed2ID, "PR-SEED-2026-002", "QUALITY_ISSUE", purchaseModels.PurchaseReturnActionRefund, purchaseModels.PurchaseReturnStatusDraft, "Auto-seeded purchase return pending finance review."},
	}

	for i, target := range targets {
		gr := goodsReceipts[i%len(goodsReceipts)]
		if len(gr.Items) == 0 || gr.SupplierID == "" {
			continue
		}

		row := purchaseModels.PurchaseReturn{
			ID:              target.id,
			Code:            target.code,
			GoodsReceiptID:  gr.ID,
			PurchaseOrderID: stringPtr(gr.PurchaseOrderID),
			SupplierID:      gr.SupplierID,
			WarehouseID:     warehouse.ID,
			Reason:          target.reason,
			Action:          target.action,
			Status:          target.status,
			Notes:           stringPtr(target.notes),
			CreatedBy:       adminID,
		}

		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"code", "goods_receipt_id", "purchase_order_id", "supplier_id", "warehouse_id", "reason", "action", "status", "notes", "created_by", "updated_at",
			}),
		}).Create(&row).Error; err != nil {
			return err
		}

		if err := db.Where("purchase_return_id = ?", row.ID).Delete(&purchaseModels.PurchaseReturnItem{}).Error; err != nil {
			return err
		}

		totalAmount := 0.0
		for idx, grItem := range gr.Items {
			if idx >= 2 {
				break
			}
			qty := math.Min(grItem.QuantityReceived, 2)
			if qty <= 0 {
				continue
			}

			unitCost := 0.0
			var poItem purchaseModels.PurchaseOrderItem
			if err := db.Where("id = ?", grItem.PurchaseOrderItemID).First(&poItem).Error; err == nil {
				unitCost = poItem.Price
			}

			item := purchaseModels.PurchaseReturnItem{
				PurchaseReturnID:   row.ID,
				GoodsReceiptItemID: stringPtr(grItem.ID),
				ProductID:          grItem.ProductID,
				Condition:          "GOOD",
				Quantity:           qty,
				UnitCost:           unitCost,
				Subtotal:           qty * unitCost,
			}
			totalAmount += item.Subtotal
			if err := db.Create(&item).Error; err != nil {
				return err
			}
		}

		if err := db.Model(&purchaseModels.PurchaseReturn{}).
			Where("id = ?", row.ID).
			Update("total_amount", totalAmount).Error; err != nil {
			return err
		}
	}

	log.Println("Purchase returns seeded successfully")
	return nil
}
