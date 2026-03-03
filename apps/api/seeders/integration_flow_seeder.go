package seeders

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

// SeedIntegrationFlow creates a coherent dataset that demonstrates cross-module
// relations Purchase → Stock → Sales → Finance.
func SeedIntegrationFlow() error {
	db := database.DB

	log.Println("Seeding enhanced integration flow (purchase → stock → sales → finance)...")

	return db.Transaction(func(tx *gorm.DB) error {
		// 1) Admin user
		defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
		if defaultEmail == "" {
			defaultEmail = "admin@example.com"
		}

		var adminUser userModels.User
		if err := tx.Where("email = ?", defaultEmail).First(&adminUser).Error; err != nil {
			if err := tx.First(&adminUser).Error; err != nil {
				log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
			}
		}
		adminID := adminUser.ID
		if adminID == "" {
			adminID = "00000000-0000-0000-0000-000000000000"
		}

		// 2) Get common dependencies
		var supplier supplierModels.Supplier
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&supplier).Error; err != nil {
			log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
		}

		var pt coreModels.PaymentTerms
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&pt).Error; err != nil {
			log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
		}

		var bu orgModels.BusinessUnit
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&bu).Error; err != nil {
			log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
		}

		var warehouse warehouseModels.Warehouse
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&warehouse).Error; err != nil {
			log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
		}

		var bankAccount coreModels.BankAccount
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&bankAccount).Error; err != nil {
			log.Printf("Skipping integration_flow_seeder.go due to missing dependency: %v", err); return nil
		}

		// 3) Get Products
		var products []productModels.Product
		if err := tx.Where("is_active = ?", true).Limit(5).Find(&products).Error; err != nil || len(products) == 0 {
			return errors.New("no products found for seeding integration flow")
		}

		// Helper to get COA ID by code
		getCOA := func(tx *gorm.DB, code string) string {
			var coa financeModels.ChartOfAccount
			if err := tx.Where("code = ?", code).First(&coa).Error; err != nil {
				return ""
			}
			return coa.ID
		}

		now := time.Now()

		// Seed 5 different integration sets
		for i := 1; i <= 5; i++ {
			tag := fmt.Sprintf("%s-%03d", now.Format("20060102"), i)
			prod := products[i%len(products)]

			poCode := fmt.Sprintf("PO-INT-%s", tag)
			var existingPO purchaseModels.PurchaseOrder
			if err := tx.Where("code = ?", poCode).First(&existingPO).Error; err == nil {
				log.Printf("Integration flow set %s already exists (PO: %s), skipping", tag, poCode)
				continue
			}

// A) Purchase Order — status is varied per index to cover all flow states.
		poQty := 10.0 + float64(i*5)
		poPrice := prod.CostPrice
		if poPrice <= 0 {
			poPrice = 50000.0 + float64(i*1000)
		}
		subtotal := poQty * poPrice
		taxRate := 11.0
		tax := subtotal * (taxRate / 100)
		total := subtotal + tax

		var poStatus purchaseModels.PurchaseOrderStatus
		switch i {
		case 1:
			poStatus = purchaseModels.PurchaseOrderStatusDraft
		case 2:
			poStatus = purchaseModels.PurchaseOrderStatusSubmitted
		default:
			poStatus = purchaseModels.PurchaseOrderStatusApproved
		}

		po := purchaseModels.PurchaseOrder{
			Code:                 poCode,
			SupplierID:           &supplier.ID,
			SupplierCodeSnapshot: supplier.Code,
			SupplierNameSnapshot: supplier.Name,
			PaymentTermsID:       &pt.ID,
			BusinessUnitID:       &bu.ID,
			CreatedBy:            adminID,
			OrderDate:            now.AddDate(0, 0, -i*2).Format("2006-01-02"),
			Status:               poStatus,
			TaxRate:              taxRate,
			TaxAmount:            tax,
			SubTotal:             subtotal,
			TotalAmount:          total,
			Items: []purchaseModels.PurchaseOrderItem{
				{
					ProductID: prod.ID,
					Quantity:  poQty,
					Price:     poPrice,
					Subtotal:  subtotal,
				},
			},
		}
		if err := tx.Create(&po).Error; err != nil {
			return err
		}

			// GR, SI, and Payment are skipped for DRAFT and SUBMITTED orders.
			if poStatus != purchaseModels.PurchaseOrderStatusApproved {
				continue
			}

			// B) Goods Receipt (Triggers Stock & Accrual Journal)
			receiptDate := now.AddDate(0, 0, -i)
			gr := purchaseModels.GoodsReceipt{
				Code:            fmt.Sprintf("GR-INT-%s", tag),
				PurchaseOrderID: po.ID,
				SupplierID:      supplier.ID,
				ReceiptDate:     &receiptDate,
				Status:          purchaseModels.GoodsReceiptStatusConfirmed,
				CreatedBy:       adminID,
				Items: []purchaseModels.GoodsReceiptItem{
					{
						PurchaseOrderItemID: po.Items[0].ID,
						ProductID:           prod.ID,
						QuantityReceived:    poQty,
					},
				},
			}
			if err := tx.Create(&gr).Error; err != nil {
				return err
			}

			// RECORDING: STOCK & ACCRUAL JOURNAL
			// 1. Inventory Batch
			batch := inventoryModels.InventoryBatch{
				ProductID:       prod.ID,
				WarehouseID:     warehouse.ID,
				BatchNumber:     fmt.Sprintf("BCH-%s", gr.Code),
				InitialQuantity: poQty,
				CurrentQuantity: poQty,
				CostPrice:       poPrice,
				IsActive:        true,
			}
			if err := tx.Create(&batch).Error; err != nil {
				return err
			}

			// 2. Stock Movement
			move := inventoryModels.StockMovement{
				ProductID:   prod.ID,
				WarehouseID: warehouse.ID,
				RefType:     "GoodsReceipt",
				RefID:       gr.ID,
				RefNumber:   gr.Code,
				QtyIn:       poQty,
				Cost:        poPrice,
				Date:        receiptDate,
				CreatedAt:   receiptDate,
			}
			if err := tx.Create(&move).Error; err != nil {
				return err
			}

			// 3. Journal: Dr Inventory / Cr GR-IR
			invCoa := getCOA(tx, "11400")
			grirCoa := getCOA(tx, "21100")
			if invCoa != "" && grirCoa != "" {
				je := financeModels.JournalEntry{
					EntryDate:     receiptDate,
					Description:   fmt.Sprintf("Accrual for %s", gr.Code),
					ReferenceType: stringPtr("GoodsReceipt"),
					ReferenceID:   stringPtr(gr.ID),
					Status:        financeModels.JournalStatusPosted,
					CreatedBy:     stringPtr(adminID),
					Lines: []financeModels.JournalLine{
						{ChartOfAccountID: invCoa, Debit: subtotal, Credit: 0, Memo: "Stock In"},
						{ChartOfAccountID: grirCoa, Debit: 0, Credit: subtotal, Memo: "GR/IR Clearing"},
					},
				}
				_ = tx.Create(&je).Error
			}

			// C) Supplier Invoice (Triggers AP Journal)
			si := purchaseModels.SupplierInvoice{
				Type:            purchaseModels.SupplierInvoiceTypeNormal,
				PurchaseOrderID: po.ID,
				SupplierID:      supplier.ID,
				PaymentTermsID:  &pt.ID,
				Code:            fmt.Sprintf("SI-INT-%s", tag),
				InvoiceNumber:   fmt.Sprintf("INV-%s", tag),
				InvoiceDate:     receiptDate.Format("2006-01-02"),
				DueDate:         receiptDate.AddDate(0, 0, 30).Format("2006-01-02"),
				TaxRate:         taxRate,
				TaxAmount:       tax,
				SubTotal:        subtotal,
				Amount:          total,
				RemainingAmount: total,
				Status:          purchaseModels.SupplierInvoiceStatusUnpaid,
				CreatedBy:       adminID,
				Items: []purchaseModels.SupplierInvoiceItem{
					{
						PurchaseOrderItemID: &po.Items[0].ID,
						ProductID:           prod.ID,
						Quantity:            poQty,
						Price:               poPrice,
						SubTotal:            subtotal,
					},
				},
			}
			if err := tx.Create(&si).Error; err != nil {
				return err
			}

			// RECORDING: AP JOURNAL (Dr GR/IR, Dr VAT / Cr AP)
			apCoa := getCOA(tx, "21000")
			vatCoa := getCOA(tx, "11800")
			if apCoa != "" && grirCoa != "" && vatCoa != "" {
				je := financeModels.JournalEntry{
					EntryDate:     receiptDate,
					Description:   fmt.Sprintf("AP Invoice %s", si.Code),
					ReferenceType: stringPtr("SupplierInvoice"),
					ReferenceID:   stringPtr(si.ID),
					Status:        financeModels.JournalStatusPosted,
					CreatedBy:     stringPtr(adminID),
					Lines: []financeModels.JournalLine{
						{ChartOfAccountID: grirCoa, Debit: subtotal, Credit: 0, Memo: "Clear GR/IR"},
						{ChartOfAccountID: vatCoa, Debit: tax, Credit: 0, Memo: "VAT Input"},
						{ChartOfAccountID: apCoa, Debit: 0, Credit: total, Memo: "Account Payable"},
					},
				}
				_ = tx.Create(&je).Error
			}

			// D) Purchase Payment (Triggers Payment Journal) — only for the last two APPROVED sets.
			if i >= 4 {
				pp := purchaseModels.PurchasePayment{
					SupplierInvoiceID: si.ID,
					BankAccountID:     bankAccount.ID,
					PaymentDate:       now.Format("2006-01-02"),
					Amount:            total,
					Method:            purchaseModels.PurchasePaymentMethodBank,
					Status:            purchaseModels.PurchasePaymentStatusConfirmed,
					ReferenceNumber:   stringPtr(fmt.Sprintf("PAY-%s", tag)),
					CreatedBy:         adminID,
				}
				if err := tx.Create(&pp).Error; err != nil {
					return err
				}

				// Update SI status, paid amount, remaining
				paidNow := time.Now()
				tx.Model(&si).Updates(map[string]interface{}{
					"status":           purchaseModels.SupplierInvoiceStatusPaid,
					"paid_amount":      total,
					"remaining_amount": 0,
					"payment_at":       &paidNow,
				})

				// RECORDING: PAYMENT JOURNAL (Dr AP / Cr Bank)
				cashCoa := ""
				var baItem coreModels.BankAccount
				tx.First(&baItem, "id = ?", bankAccount.ID)
				if baItem.ChartOfAccountID != nil {
					cashCoa = *baItem.ChartOfAccountID
				} else {
					cashCoa = getCOA(tx, "11100")
				}

				if apCoa != "" && cashCoa != "" {
					je := financeModels.JournalEntry{
						EntryDate:     now,
						Description:   fmt.Sprintf("Payment for %s", si.Code),
						ReferenceType: stringPtr("PurchasePayment"),
						ReferenceID:   stringPtr(pp.ID),
						Status:        financeModels.JournalStatusPosted,
						CreatedBy:     stringPtr(adminID),
						Lines: []financeModels.JournalLine{
							{ChartOfAccountID: apCoa, Debit: total, Credit: 0, Memo: "Debit AP"},
							{ChartOfAccountID: cashCoa, Debit: 0, Credit: total, Memo: "Credit Cash/Bank"},
						},
					}
					_ = tx.Create(&je).Error
				}
			}

			// Close PO for the last set to demonstrate the CLOSED status in the list.
			if i == 5 {
				tx.Model(&po).Update("status", purchaseModels.PurchaseOrderStatusClosed)
			}
		}

		log.Println("Enhanced integration flow seeded successfully")
		return nil
	})
}

func logIntegrationFlowReport(db *gorm.DB) {
	if db == nil {
		return
	}

	// Find latest integration PO
	var po purchaseModels.PurchaseOrder
	if err := db.Where("code LIKE ?", "PO-INT-%").Order("created_at DESC").First(&po).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("Integration flow report: no PO-INT-* found")
			return
		}
		log.Printf("Integration flow report: failed to load PO: %v", err)
		return
	}

	var gr purchaseModels.GoodsReceipt
	if err := db.Where("purchase_order_id = ? AND code LIKE ?", po.ID, "GR-INT-%").Order("created_at DESC").First(&gr).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Integration flow report: failed to load GR: %v", err)
		}
	}

	var batch inventoryModels.InventoryBatch
	if gr.Code != "" {
		derivedBatchNumber := fmt.Sprintf("INT-%s", gr.Code)
		if err := db.Where("batch_number = ?", derivedBatchNumber).Order("created_at DESC").First(&batch).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				log.Printf("Integration flow report: failed to load batch: %v", err)
			}
		}
	}

	var si purchaseModels.SupplierInvoice
	if err := db.Where("purchase_order_id = ? AND code LIKE ?", po.ID, "SI-INT-%").Order("created_at DESC").First(&si).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Integration flow report: failed to load supplier invoice: %v", err)
		}
	}

	var payment purchaseModels.PurchasePayment
	if si.ID != "" {
		if err := db.Where("supplier_invoice_id = ? AND reference_number LIKE ?", si.ID, "PAY-INT-%").Order("created_at DESC").First(&payment).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				log.Printf("Integration flow report: failed to load purchase payment: %v", err)
			}
		}
	}

	var tax financeModels.TaxInvoice
	if si.ID != "" {
		if err := db.Where("supplier_invoice_id = ? AND tax_invoice_number LIKE ?", si.ID, "TI-INT-%").Order("created_at DESC").First(&tax).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				log.Printf("Integration flow report: failed to load tax invoice: %v", err)
			}
		}
	}

	var je financeModels.JournalEntry
	if si.ID != "" {
		_ = db.Where("reference_type = ? AND reference_id = ?", "SupplierInvoice", si.ID).
			Order("created_at DESC").
			First(&je).Error
	}

	var do salesModels.DeliveryOrder
	if po.SalesOrderID != nil && *po.SalesOrderID != "" {
		doErr := db.Where("sales_order_id = ? AND code LIKE ?", *po.SalesOrderID, "DO-INT-%").Order("created_at DESC").First(&do).Error
		if errors.Is(doErr, gorm.ErrRecordNotFound) {
			_ = db.Where("sales_order_id = ?", *po.SalesOrderID).Order("created_at DESC").First(&do).Error
		}
	}

	var poCount int64
	db.Model(&purchaseModels.PurchaseOrder{}).Where("code LIKE ?", "PO-INT-%").Count(&poCount)

	var jeCount int64
	db.Model(&financeModels.JournalEntry{}).Where("description LIKE ?", "%INT-%").Count(&jeCount)

	log.Println("Integration flow report:")
	log.Printf("- Total Integration POs: %d", poCount)
	log.Printf("- Total Journals Created: %d", jeCount)
	log.Printf("- Latest PO: %s (id=%s)", po.Code, po.ID)
	// ... rest of detailed log if needed, but summary is better for large sets
}

func safePtr(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

func ensureIntegrationFinanceArtifacts(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Find latest integration supplier invoice
		var si purchaseModels.SupplierInvoice
		if err := tx.Where("code LIKE ?", "SI-INT-%").Order("created_at DESC").First(&si).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}

		// Avoid duplicate journal entry
		var existingJE financeModels.JournalEntry
		jeErr := tx.Where("reference_type = ? AND reference_id = ?", "SupplierInvoice", si.ID).
			Order("created_at DESC").
			First(&existingJE).Error
		if jeErr == nil {
			return nil
		}
		if !errors.Is(jeErr, gorm.ErrRecordNotFound) {
			return jeErr
		}

		var assetCOA financeModels.ChartOfAccount
		_ = tx.Where("type = ? AND is_active = ?", financeModels.AccountTypeAsset, true).Order("created_at ASC").First(&assetCOA).Error
		var liabilityCOA financeModels.ChartOfAccount
		_ = tx.Where("type = ? AND is_active = ?", financeModels.AccountTypeLiability, true).Order("created_at ASC").First(&liabilityCOA).Error

		if assetCOA.ID == "" || liabilityCOA.ID == "" {
			log.Println("Warning: Skipping integration journal backfill because COA types are missing")
			return nil
		}

		// Best-effort created_by: admin if present
		defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
		if defaultEmail == "" {
			defaultEmail = "admin@example.com"
		}

		var adminUser userModels.User
		if err := tx.Where("email = ?", defaultEmail).First(&adminUser).Error; err != nil {
			_ = tx.First(&adminUser).Error
		}
		adminID := adminUser.ID
		if adminID == "" {
			adminID = "00000000-0000-0000-0000-000000000000"
		}

		refType := "SupplierInvoice"
		je := financeModels.JournalEntry{
			EntryDate:     time.Now(),
			Description:   "Integration seed(backfill): Supplier invoice journal",
			ReferenceType: &refType,
			ReferenceID:   stringPtr(si.ID),
			Status:        financeModels.JournalStatusPosted,
			CreatedBy:     stringPtr(adminID),
			Lines: []financeModels.JournalLine{
				{ChartOfAccountID: assetCOA.ID, Debit: si.Amount, Credit: 0, Memo: "Integration debit"},
				{ChartOfAccountID: liabilityCOA.ID, Debit: 0, Credit: si.Amount, Memo: "Integration credit"},
			},
		}
		return tx.Create(&je).Error
	})
}
