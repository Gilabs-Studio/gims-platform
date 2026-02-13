package seeders

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
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

// SeedIntegrationFlow creates a small, coherent dataset that demonstrates cross-module
// relations Purchase → Stock → Sales → Finance.
func SeedIntegrationFlow() error {
	db := database.DB

	var exists int64
	if err := db.Model(&purchaseModels.PurchaseOrder{}).
		Where("code LIKE ?", "PO-INT-%").
		Count(&exists).Error; err != nil {
		return err
	}
	if exists > 0 {
		log.Println("Integration flow already seeded; ensuring finance artifacts...")
		if err := ensureIntegrationFinanceArtifacts(db); err != nil {
			return err
		}
		logIntegrationFlowReport(db)
		return nil
	}

	log.Println("Seeding integration flow (purchase → stock → sales → finance)...")

	return db.Transaction(func(tx *gorm.DB) error {
		// 1) Admin user
		var adminUser userModels.User
		if err := tx.Where("email = ?", "admin@example.com").First(&adminUser).Error; err != nil {
			if err := tx.First(&adminUser).Error; err != nil {
				return err
			}
		}
		adminID := adminUser.ID
		if adminID == "" {
			adminID = "00000000-0000-0000-0000-000000000000"
		}

		// 2) Pick a Sales Order with items (ties Sales module)
		var so salesModels.SalesOrder
		if err := tx.Preload("Items").
			Where("status IN ?", []salesModels.SalesOrderStatus{salesModels.SalesOrderStatusConfirmed, salesModels.SalesOrderStatusProcessing}).
			Order("created_at DESC").
			First(&so).Error; err != nil {
			// fallback: any sales order with items
			if err := tx.Preload("Items").Order("created_at DESC").First(&so).Error; err != nil {
				log.Println("Warning: No sales orders found; integration flow will be partial")
				return nil
			}
		}
		if len(so.Items) == 0 {
			log.Println("Warning: Sales order has no items; integration flow will be partial")
			return nil
		}
		soItem := so.Items[0]

		// 3) Product + Supplier + BU + Payment terms
		var product productModels.Product
		if err := tx.Where("id = ?", soItem.ProductID).First(&product).Error; err != nil {
			return err
		}

		var supplier supplierModels.Supplier
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&supplier).Error; err != nil {
			return err
		}

		var paymentTerms coreModels.PaymentTerms
		if so.PaymentTermsID != nil {
			_ = tx.Where("id = ?", *so.PaymentTermsID).First(&paymentTerms).Error
		}
		if paymentTerms.ID == "" {
			if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&paymentTerms).Error; err != nil {
				return err
			}
		}

		var businessUnit orgModels.BusinessUnit
		if so.BusinessUnitID != nil {
			_ = tx.Where("id = ?", *so.BusinessUnitID).First(&businessUnit).Error
		}
		if businessUnit.ID == "" {
			if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&businessUnit).Error; err != nil {
				return err
			}
		}

		var bankAccount coreModels.BankAccount
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&bankAccount).Error; err != nil {
			return err
		}

		var warehouse warehouseModels.Warehouse
		if err := tx.Where("is_active = ?", true).Order("created_at ASC").First(&warehouse).Error; err != nil {
			return err
		}

		now := time.Now()
		tag := now.Format("20060102")
		if forcedTag := strings.TrimSpace(os.Getenv("INTEGRATION_TAG")); forcedTag != "" {
			tag = forcedTag
		}

		// 4) Purchase Order linked to the Sales Order
		poCode := fmt.Sprintf("PO-INT-%s-001", tag)
		poQty := soItem.Quantity + 5
		poPrice := product.CostPrice
		if poPrice <= 0 {
			poPrice = 10000
		}
		poSubtotal := poQty * poPrice
		poTaxRate := 11.0
		poTaxAmount := poSubtotal * (poTaxRate / 100)
		poTotal := poSubtotal + poTaxAmount

		po := purchaseModels.PurchaseOrder{
			Code:             poCode,
			SupplierID:       stringPtr(supplier.ID),
			PaymentTermsID:   stringPtr(paymentTerms.ID),
			BusinessUnitID:   stringPtr(businessUnit.ID),
			CreatedBy:        adminID,
			SalesOrderID:     stringPtr(so.ID),
			OrderDate:        now.Format("2006-01-02"),
			Notes:            "Integration seed: PO linked to Sales Order",
			Status:           purchaseModels.PurchaseOrderStatusApproved,
			TaxRate:          poTaxRate,
			TaxAmount:        poTaxAmount,
			SubTotal:         poSubtotal,
			TotalAmount:      poTotal,
			Items: []purchaseModels.PurchaseOrderItem{
				{
					ProductID: product.ID,
					Quantity:  poQty,
					Price:     poPrice,
					Discount:  0,
					Subtotal:  poSubtotal,
					Notes:     stringPtr("Integration item"),
				},
			},
		}

		if err := tx.Create(&po).Error; err != nil {
			return err
		}

		// Fetch persisted PO items so we have stable IDs for GR/SI linking
		var poItems []purchaseModels.PurchaseOrderItem
		if err := tx.Where("purchase_order_id = ?", po.ID).Find(&poItems).Error; err != nil {
			return err
		}
		if len(poItems) == 0 {
			return fmt.Errorf("integration seed: purchase order has no items")
		}
		poItem := poItems[0]

		// 5) Goods Receipt for that PO
		receiptDate := now.Add(-48 * time.Hour)
		grCode := fmt.Sprintf("GR-INT-%s-001", tag)
		gr := purchaseModels.GoodsReceipt{
			Code:            grCode,
			PurchaseOrderID: po.ID,
			SupplierID:      supplier.ID,
			ReceiptDate:     &receiptDate,
			Notes:           stringPtr("Integration seed: GR for PO"),
			Status:          purchaseModels.GoodsReceiptStatusConfirmed,
			CreatedBy:       adminID,
			Items: []purchaseModels.GoodsReceiptItem{
				{
					PurchaseOrderItemID: poItem.ID,
					ProductID:           product.ID,
					QuantityReceived:    poQty,
					Notes:               stringPtr("Received in full"),
				},
			},
		}
		if err := tx.Create(&gr).Error; err != nil {
			return err
		}

		// 6) Inventory batch representing received goods (Stock module)
		batchNumber := fmt.Sprintf("INT-%s", grCode)
		batch := inventoryModels.InventoryBatch{
			ProductID:        product.ID,
			WarehouseID:      warehouse.ID,
			BatchNumber:      batchNumber,
			InitialQuantity:  poQty,
			CurrentQuantity:  poQty,
			ReservedQuantity: 0,
			CostPrice:        product.CostPrice,
			IsActive:         true,
		}
		if batch.CostPrice <= 0 {
			batch.CostPrice = poPrice
		}
		if err := tx.Create(&batch).Error; err != nil {
			return err
		}

		// 7) Delivery Order (links Sales → Stock) using the batch
		var do salesModels.DeliveryOrder
		doExists := tx.Preload("Items").
			Where("sales_order_id = ?", so.ID).
			Order("created_at DESC").
			First(&do).Error

		if doExists != nil {
			doCode := fmt.Sprintf("DO-INT-%s-001", tag)
			shippedAt := now.Add(-24 * time.Hour)
			do = salesModels.DeliveryOrder{
				Code:           doCode,
				DeliveryDate:   now.Add(-24 * time.Hour),
				SalesOrderID:   so.ID,
				WarehouseID:    stringPtr(warehouse.ID),
				TrackingNumber: fmt.Sprintf("TRK-INT-%s", tag),
				ReceiverName:   "Integration Receiver",
				ReceiverPhone:  "080000000000",
				DeliveryAddress: "Integration Address",
				Status:         salesModels.DeliveryOrderStatusShipped,
				Notes:          "Integration seed: DO linked to Sales Order and InventoryBatch",
				ShippedAt:      &shippedAt,
				Items: []salesModels.DeliveryOrderItem{
					{
						SalesOrderItemID:  stringPtr(soItem.ID),
						ProductID:         product.ID,
						InventoryBatchID:  stringPtr(batch.ID),
						Quantity:          soItem.Quantity,
						Price:             soItem.Price,
						Subtotal:          soItem.Price * soItem.Quantity,
						IsEquipment:       false,
						InstallationNotes: "",
					},
				},
			}
			if err := tx.Create(&do).Error; err != nil {
				return err
			}
		} else {
			// If it exists but has no warehouse, attach one (improves stock movement integrity)
			if do.WarehouseID == nil || *do.WarehouseID == "" {
				if err := tx.Model(&salesModels.DeliveryOrder{}).Where("id = ?", do.ID).Update("warehouse_id", warehouse.ID).Error; err != nil {
					return err
				}
			}
		}

		// 8) Supplier Invoice + Purchase Payment (Purchase → Finance-ish)
		siCode := fmt.Sprintf("SI-INT-%s-001", tag)
		invoiceNumber := fmt.Sprintf("SUP-INV-INT-%s", tag)
		invoiceDate := now.Add(-24 * time.Hour).Format("2006-01-02")
		dueDate := now.AddDate(0, 0, 30).Format("2006-01-02")

		si := purchaseModels.SupplierInvoice{
			Type:           purchaseModels.SupplierInvoiceTypeNormal,
			PurchaseOrderID: po.ID,
			SupplierID:     supplier.ID,
			PaymentTermsID: stringPtr(paymentTerms.ID),
			Code:           siCode,
			InvoiceNumber:  invoiceNumber,
			InvoiceDate:    invoiceDate,
			DueDate:        dueDate,
			TaxRate:        poTaxRate,
			TaxAmount:      poTaxAmount,
			SubTotal:       poSubtotal,
			Amount:         poTotal,
			Status:         purchaseModels.SupplierInvoiceStatusUnpaid,
			Notes:          stringPtr("Integration seed: Supplier Invoice from PO"),
			CreatedBy:      adminID,
			Items: []purchaseModels.SupplierInvoiceItem{
				{
					PurchaseOrderItemID: stringPtr(poItem.ID),
					ProductID:           product.ID,
					Quantity:            poQty,
					Price:               poPrice,
					Discount:            0,
					SubTotal:            poSubtotal,
				},
			},
		}
		if err := tx.Create(&si).Error; err != nil {
			return err
		}

		pp := purchaseModels.PurchasePayment{
			SupplierInvoiceID: si.ID,
			BankAccountID:     bankAccount.ID,
			PaymentDate:       now.Format("2006-01-02"),
			Amount:            si.Amount,
			Method:            purchaseModels.PurchasePaymentMethodBank,
			Status:            purchaseModels.PurchasePaymentStatusConfirmed,
			ReferenceNumber:   stringPtr(fmt.Sprintf("PAY-INT-%s", tag)),
			Notes:             stringPtr("Integration seed payment"),
			CreatedBy:         adminID,
		}
		if err := tx.Create(&pp).Error; err != nil {
			return err
		}

		// 9) Finance Journal Entries + Tax Invoice linking Sales/Purchase
		var assetCOA financeModels.ChartOfAccount
		_ = tx.Where("type = ? AND is_active = ?", financeModels.AccountTypeAsset, true).Order("created_at ASC").First(&assetCOA).Error
		var liabilityCOA financeModels.ChartOfAccount
		_ = tx.Where("type = ? AND is_active = ?", financeModels.AccountTypeLiability, true).Order("created_at ASC").First(&liabilityCOA).Error
		var revenueCOA financeModels.ChartOfAccount
		_ = tx.Where("type = ? AND is_active = ?", financeModels.AccountTypeRevenue, true).Order("created_at ASC").First(&revenueCOA).Error

		if assetCOA.ID != "" && liabilityCOA.ID != "" {
			refType := "SupplierInvoice"
			je := financeModels.JournalEntry{
				EntryDate:      now,
				Description:    "Integration seed: Supplier invoice journal",
				ReferenceType:  &refType,
				ReferenceID:    stringPtr(si.ID),
				Status:         financeModels.JournalStatusPosted,
				CreatedBy:      stringPtr(adminID),
				Lines: []financeModels.JournalLine{
					{ChartOfAccountID: assetCOA.ID, Debit: si.Amount, Credit: 0, Memo: "Integration debit"},
					{ChartOfAccountID: liabilityCOA.ID, Debit: 0, Credit: si.Amount, Memo: "Integration credit"},
				},
			}
			if err := tx.Create(&je).Error; err != nil {
				return err
			}
		}

		// Try to link to an existing customer invoice for the selected SO
		var ci salesModels.CustomerInvoice
		_ = tx.Where("sales_order_id = ?", so.ID).Order("created_at DESC").First(&ci).Error
		if ci.ID != "" && assetCOA.ID != "" && revenueCOA.ID != "" {
			refType := "CustomerInvoice"
			je := financeModels.JournalEntry{
				EntryDate:      now,
				Description:    "Integration seed: Customer invoice journal",
				ReferenceType:  &refType,
				ReferenceID:    stringPtr(ci.ID),
				Status:         financeModels.JournalStatusPosted,
				CreatedBy:      stringPtr(adminID),
				Lines: []financeModels.JournalLine{
					{ChartOfAccountID: assetCOA.ID, Debit: ci.Amount, Credit: 0, Memo: "Integration AR debit"},
					{ChartOfAccountID: revenueCOA.ID, Debit: 0, Credit: ci.Amount, Memo: "Integration revenue credit"},
				},
			}
			if err := tx.Create(&je).Error; err != nil {
				return err
			}
		}

		taxNumber := fmt.Sprintf("TI-INT-%s-001", tag)
		tax := financeModels.TaxInvoice{
			TaxInvoiceNumber: taxNumber,
			TaxInvoiceDate:   now,
			CustomerInvoiceID: func() *string {
				if ci.ID == "" {
					return nil
				}
				return stringPtr(ci.ID)
			}(),
			SupplierInvoiceID: stringPtr(si.ID),
			DPPAmount:         poSubtotal,
			VATAmount:         poTaxAmount,
			TotalAmount:       poTotal,
			Notes:             "Integration seed: linked tax invoice",
			CreatedBy:         stringPtr(adminID),
		}
		if err := tx.Create(&tax).Error; err != nil {
			return err
		}

		log.Println("Integration flow seeded successfully")
		logIntegrationFlowReport(tx)
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

	log.Println("Integration flow report:")
	log.Printf("- PO: %s (id=%s, sales_order_id=%s)", po.Code, po.ID, safePtr(po.SalesOrderID))
	if gr.ID != "" {
		log.Printf("- GR: %s (id=%s, purchase_order_id=%s)", gr.Code, gr.ID, gr.PurchaseOrderID)
	} else {
		log.Printf("- GR: (missing) for PO id=%s", po.ID)
	}
	if batch.ID != "" {
		log.Printf("- Batch: %s (id=%s, product_id=%s, warehouse_id=%s, qty=%v)", batch.BatchNumber, batch.ID, batch.ProductID, batch.WarehouseID, batch.CurrentQuantity)
	} else if gr.Code != "" {
		log.Printf("- Batch: (missing) expected INT-%s", gr.Code)
	} else {
		log.Printf("- Batch: (skipped) because GR missing")
	}
	if do.ID != "" {
		log.Printf("- DO: %s (id=%s, sales_order_id=%s, status=%s)", do.Code, do.ID, do.SalesOrderID, do.Status)
	} else {
		log.Printf("- DO: (missing) DO-INT-* and no fallback DO found")
	}
	if si.ID != "" {
		log.Printf("- SI: %s (id=%s, invoice_number=%s, amount=%v, status=%s)", si.Code, si.ID, si.InvoiceNumber, si.Amount, si.Status)
	} else {
		log.Printf("- SI: (missing) for PO id=%s", po.ID)
	}
	if payment.ID != "" {
		log.Printf("- PAY: %s (id=%s, amount=%v, status=%s)", safePtr(payment.ReferenceNumber), payment.ID, payment.Amount, payment.Status)
	} else {
		log.Printf("- PAY: (missing) for SI id=%s", si.ID)
	}
	if tax.ID != "" {
		log.Printf("- TI: %s (id=%s, total=%v)", tax.TaxInvoiceNumber, tax.ID, tax.TotalAmount)
	} else {
		log.Printf("- TI: (missing) for SI id=%s", si.ID)
	}
	if je.ID != "" {
		log.Printf("- JE: posted (id=%s, reference_id=%s)", je.ID, safePtr(je.ReferenceID))
	} else {
		log.Printf("- JE: (missing) for SI id=%s", si.ID)
	}
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
		var adminUser userModels.User
		if err := tx.Where("email = ?", "admin@example.com").First(&adminUser).Error; err != nil {
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
