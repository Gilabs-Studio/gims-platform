package seeders

import (
	"context"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	financeRepos "github.com/gilabs/gims/api/internal/finance/data/repositories"
	financeMapper "github.com/gilabs/gims/api/internal/finance/domain/mapper"
	financeUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	inventoryRepos "github.com/gilabs/gims/api/internal/inventory/data/repositories"
	inventoryUsecase "github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	productRepos "github.com/gilabs/gims/api/internal/product/data/repositories"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	purchaseRepos "github.com/gilabs/gims/api/internal/purchase/data/repositories"
	purchaseUsecase "github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	salesUsecase "github.com/gilabs/gims/api/internal/sales/domain/usecase"
	stockOpnameModels "github.com/gilabs/gims/api/internal/stock_opname/data/models"
	stockOpnameRepos "github.com/gilabs/gims/api/internal/stock_opname/data/repositories"
	stockOpnameUsecase "github.com/gilabs/gims/api/internal/stock_opname/domain/usecase"
)

// SeedJournalReconciliation performs post-seed journal data reconciliation.
// It scans core sales/purchase transactions and ensures missing journal entries are created.
func SeedJournalReconciliation() error {
	db := database.DB
	log.Println("Reconciling journal entries after seeding...")

	// Instantiate core finance usecases
	coaRepo := financeRepos.NewChartOfAccountRepository(db)
	journalRepo := financeRepos.NewJournalEntryRepository(db)
	journalUC := financeUsecase.NewJournalEntryUsecase(db, coaRepo, journalRepo, financeMapper.NewJournalEntryMapper(financeMapper.NewChartOfAccountMapper()))
	coaUC := financeUsecase.NewChartOfAccountUsecase(db, coaRepo, financeMapper.NewChartOfAccountMapper())

	// Sales usecases
	invoiceRepo := salesRepos.NewCustomerInvoiceRepository(db)
	productRepo := productRepos.NewProductRepository(db)
	orderRepo := salesRepos.NewSalesOrderRepository(db)
	auditSvc := audit.NewAuditService(db)
	customerInvoiceUC := salesUsecase.NewCustomerInvoiceUsecase(db, invoiceRepo, productRepo, orderRepo, journalUC, coaUC, auditSvc)

	salesPaymentRepo := salesRepos.NewSalesPaymentRepository(db)

	salesPaymentUC := salesUsecase.NewSalesPaymentUsecase(db, salesPaymentRepo, auditSvc, journalUC, coaUC)

	// Purchase usecases
	siRepo := purchaseRepos.NewSupplierInvoiceRepository(db)
	poRepo := purchaseRepos.NewPurchaseOrderRepository(db)
	grRepo := purchaseRepos.NewGoodsReceiptRepository(db)
	purchaseInvoiceUC := purchaseUsecase.NewSupplierInvoiceUsecase(db, siRepo, poRepo, grRepo, auditSvc, journalUC, coaUC)
	purchasePaymentRepo := purchaseRepos.NewPurchasePaymentRepository(db)
	purchasePaymentUC := purchaseUsecase.NewPurchasePaymentUsecase(db, purchasePaymentRepo, siRepo, auditSvc, journalUC, coaUC)

	inventoryRepo := inventoryRepos.NewInventoryRepository(db)
	inventoryUC := inventoryUsecase.NewInventoryUsecase(inventoryRepo)
	stockOpnameRepo := stockOpnameRepos.NewStockOpnameRepository(db)
	stockOpnameUC := stockOpnameUsecase.NewStockOpnameUsecase(stockOpnameRepo, inventoryUC, journalUC, coaUC)

	ctx := context.Background()

	// Sync Customer invoices
	var invoices []salesModels.CustomerInvoice
	if err := db.Where("type = ?", salesModels.CustomerInvoiceTypeRegular).
		Where("status IN ?", []salesModels.CustomerInvoiceStatus{salesModels.CustomerInvoiceStatusUnpaid, salesModels.CustomerInvoiceStatusPartial, salesModels.CustomerInvoiceStatusPaid}).
		Find(&invoices).Error; err != nil {
		return err
	}
	for _, inv := range invoices {
		var count int64
		db.Model(&financeModels.JournalEntry{}).
			Where("reference_type = ? AND reference_id = ?", "SALES_INVOICE", inv.ID).
			Count(&count)
		if count > 0 {
			continue
		}
		if err := customerInvoiceUC.TriggerJournalForInvoice(ctx, &inv); err != nil {
			log.Printf("warning: failed to reconcile sales invoice journal (%s): %v", inv.ID, err)
		}
	}

	// Sync Sales payments
	var salesPayments []salesModels.SalesPayment
	if err := db.Where("status = ?", salesModels.SalesPaymentStatusConfirmed).Find(&salesPayments).Error; err != nil {
		return err
	}
	for _, pay := range salesPayments {
		var count int64
		db.Model(&financeModels.JournalEntry{}).
			Where("reference_type = ? AND reference_id = ?", "SALES_PAYMENT", pay.ID).
			Count(&count)
		if count > 0 {
			continue
		}
		if err := salesPaymentUC.TriggerJournalForPayment(ctx, &pay); err != nil {
			log.Printf("warning: failed to reconcile sales payment journal (%s): %v", pay.ID, err)
		}
	}

	// Sync Supplier invoices
	var supplierInvoices []purchaseModels.SupplierInvoice
	if err := db.Where("status IN ?", []purchaseModels.SupplierInvoiceStatus{purchaseModels.SupplierInvoiceStatusUnpaid, purchaseModels.SupplierInvoiceStatusPartial, purchaseModels.SupplierInvoiceStatusPaid}).
		Find(&supplierInvoices).Error; err != nil {
		return err
	}
	for _, si := range supplierInvoices {
		var count int64
		db.Model(&financeModels.JournalEntry{}).
			Where("reference_type = ? AND reference_id = ?", "SUPPLIER_INVOICE", si.ID).
			Count(&count)
		if count > 0 {
			continue
		}
		if err := purchaseInvoiceUC.TriggerJournalForSupplierInvoice(ctx, &si); err != nil {
			log.Printf("warning: failed to reconcile supplier invoice journal (%s): %v", si.ID, err)
		}
	}

	// Sync Purchase payments
	var purchasePayments []purchaseModels.PurchasePayment
	if err := db.Where("status = ?", purchaseModels.PurchasePaymentStatusConfirmed).Find(&purchasePayments).Error; err != nil {
		return err
	}
	for _, pp := range purchasePayments {
		var count int64
		db.Model(&financeModels.JournalEntry{}).
			Where("reference_type = ? AND reference_id = ?", "PURCHASE_PAYMENT", pp.ID).
			Count(&count)
		if count > 0 {
			continue
		}
		if err := purchasePaymentUC.TriggerJournalForPayment(ctx, &pp); err != nil {
			log.Printf("warning: failed to reconcile purchase payment journal (%s): %v", pp.ID, err)
		}
	}

	// Sync Stock Opname journals
	var stockOpnames []stockOpnameModels.StockOpname
	if err := db.Where("status = ?", stockOpnameModels.StockOpnameStatusPosted).Find(&stockOpnames).Error; err != nil {
		return err
	}
	for _, opname := range stockOpnames {
		var count int64
		db.Model(&financeModels.JournalEntry{}).
			Where("reference_type = ? AND reference_id = ?", "STOCK_OPNAME", opname.ID).
			Count(&count)
		if count > 0 {
			continue
		}
		if err := stockOpnameUC.TriggerJournalForStockOpname(ctx, &opname); err != nil {
			log.Printf("warning: failed to reconcile stock opname journal (%s): %v", opname.ID, err)
		}
	}

	log.Println("Journal reconciliation complete")
	return nil
}
