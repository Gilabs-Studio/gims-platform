package seeders

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	financeRepositories "github.com/gilabs/gims/api/internal/finance/data/repositories"
	financeDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	financeMapper "github.com/gilabs/gims/api/internal/finance/domain/mapper"
	financeUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	// "gorm.io/gorm/clause"
)

// SeedSalesIntegrationFlow creates a coherent dataset that demonstrates cross-module
// relations SQ → SO → DO → INV → PAY → Finance.
func SeedSalesIntegrationFlow() error {
	db := database.DB

	// Guard: skip if already seeded
	var count int64
	// Cover both INT and MIN prefixes
	db.Model(&salesModels.SalesQuotation{}).Where("code LIKE ?", "SQ-%").Count(&count)
	if count > 0 {
		log.Println("Sales Integration Flow already seeded, skipping...")
		return nil
	}

	log.Println("Seeding sales integration flow (SQ → SO → DO → INV → PAY → Finance)...")

	return db.Transaction(func(tx *gorm.DB) error {
		// 1) Resolve common dependencies
		adminID := getAdminID(tx)

		// Minimal seed mode: just one fully traced sales flow
		if isMinimalSeedMode() {
			return seedSalesMinimalFlow(tx, adminID)
		}

		var customer customerModels.Customer
		if err := tx.Where("is_active = ?", true).First(&customer).Error; err != nil {
			log.Printf("Skipping sales_integration_flow_seeder.go due to missing dependency: %v", err)
			return nil
		}

		var pt coreModels.PaymentTerms
		if err := tx.Where("is_active = ?", true).First(&pt).Error; err != nil {
			log.Printf("Skipping sales_integration_flow_seeder.go due to missing dependency: %v", err)
			return nil
		}

		var bankAccount coreModels.BankAccount
		if err := tx.Where("is_active = ?", true).First(&bankAccount).Error; err != nil {
			log.Printf("Skipping sales_integration_flow_seeder.go due to missing dependency: %v", err)
			return nil
		}

		var warehouse warehouseModels.Warehouse
		if err := tx.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
			log.Printf("Skipping sales_integration_flow_seeder.go due to missing dependency: %v", err)
			return nil
		}

		var products []productModels.Product
		if err := tx.Where("is_active = ?", true).Limit(5).Find(&products).Error; err != nil || len(products) == 0 {
			return errors.New("no products found for sales integration flow")
		}

		// COAs
		cashCOA := getCOAID(tx, "1-1101")
		receivableCOA := getCOAID(tx, "1-1210")
		revenueCOA := getCOAID(tx, "4-1100")
		taxCOA := getCOAID(tx, "2-1210")
		dpAdvanceCOA := getCOAID(tx, "2-1400")

		now := time.Now()

		// Scenario Set 1: Full Flow with DP (Already Paid)
		if err := seedSalesFullFlowDP(tx, salesFlowInput{
			tag:           "001",
			customer:      customer,
			products:      products[:2],
			pt:            pt,
			bankAccount:   bankAccount,
			warehouse:     warehouse,
			adminID:       adminID,
			baseDate:      now.AddDate(0, 0, -10),
			taxRate:       11.0,
			cashCOA:       cashCOA,
			receivableCOA: receivableCOA,
			revenueCOA:    revenueCOA,
			taxCOA:        taxCOA,
			dpAdvanceCOA:  dpAdvanceCOA,
		}); err != nil {
			return err
		}

		// Scenario Set 2: Partial Delivery & Partial Payment
		if err := seedSalesPartialFlow(tx, salesFlowInput{
			tag:           "002",
			customer:      customer,
			products:      products[2:3],
			pt:            pt,
			bankAccount:   bankAccount,
			warehouse:     warehouse,
			adminID:       adminID,
			baseDate:      now.AddDate(0, 0, -5),
			taxRate:       11.0,
			cashCOA:       cashCOA,
			receivableCOA: receivableCOA,
			revenueCOA:    revenueCOA,
			taxCOA:        taxCOA,
			dpAdvanceCOA:  dpAdvanceCOA,
		}); err != nil {
			return err
		}

		log.Println("Sales integration flow seeded successfully")
		return nil
	})
}

type salesFlowInput struct {
	tag                                                      string
	codePrefix                                               string
	customer                                                 customerModels.Customer
	products                                                 []productModels.Product
	pt                                                       coreModels.PaymentTerms
	bankAccount                                              coreModels.BankAccount
	warehouse                                                warehouseModels.Warehouse
	adminID                                                  string
	baseDate                                                 time.Time
	taxRate                                                  float64
	cashCOA, receivableCOA, revenueCOA, taxCOA, dpAdvanceCOA string
}

func (s *salesFlowInput) formatCode(entity, tag string) string {
	prefix := strings.TrimSpace(s.codePrefix)
	if prefix == "" {
		return fmt.Sprintf("%s-%s", entity, tag)
	}
	return fmt.Sprintf("%s-%s-%s", entity, prefix, tag)
}

func seedSalesFullFlowDP(tx *gorm.DB, in salesFlowInput) error {
	sqDate := in.baseDate
	soDate := sqDate.AddDate(0, 0, 1)
	dpDate := soDate
	doDate := soDate.AddDate(0, 0, 2)
	invDate := doDate
	payDate := invDate.AddDate(0, 0, 1)

	// 1. Sales Quotation
	sq := salesModels.SalesQuotation{
		ID:             uuid.New().String(),
		Code:           in.formatCode("SQ", in.tag),
		QuotationDate:  sqDate,
		CustomerID:     &in.customer.ID,
		CustomerName:   in.customer.Name,
		PaymentTermsID: &in.pt.ID,
		Status:         salesModels.SalesQuotationStatusConverted,
		TaxRate:        in.taxRate,
		CreatedBy:      &in.adminID,
	}
	subtotal := 0.0
	for _, p := range in.products {
		qty, price := 5.0, p.SellingPrice
		if price <= 0 {
			price = 100000.0
		}
		itemSub := qty * price
		subtotal += itemSub
		sq.Items = append(sq.Items, salesModels.SalesQuotationItem{
			ID: uuid.New().String(), ProductID: p.ID, Quantity: qty, Price: price, Subtotal: itemSub,
		})
	}
	sq.Subtotal = subtotal
	sq.TaxAmount = subtotal * (in.taxRate / 100)
	sq.TotalAmount = subtotal + sq.TaxAmount
	tx.Create(&sq)

	// 2. Sales Order
	so := salesModels.SalesOrder{
		ID:               uuid.New().String(),
		Code:             in.formatCode("SO", in.tag),
		OrderDate:        soDate,
		SalesQuotationID: &sq.ID,
		CustomerID:       &in.customer.ID,
		CustomerName:     in.customer.Name,
		PaymentTermsID:   &in.pt.ID,
		Status:           salesModels.SalesOrderStatusApproved,
		Subtotal:         sq.Subtotal,
		TaxRate:          sq.TaxRate,
		TaxAmount:        sq.TaxAmount,
		TotalAmount:      sq.TotalAmount,
		CreatedBy:        &in.adminID,
	}
	for _, item := range sq.Items {
		so.Items = append(so.Items, salesModels.SalesOrderItem{
			ID: uuid.New().String(), ProductID: item.ProductID, Quantity: item.Quantity, Price: item.Price, Subtotal: item.Subtotal,
			ProductCode: "PROD-SAMPLE", ProductName: "Sample Product",
		})
	}
	tx.Create(&so)
	tx.Model(&sq).Update("converted_to_sales_order_id", so.ID)

	// 3. DP Invoice & Payment
	dpAmount := math.Round(so.TotalAmount * 0.3)
	dpDueDate := dpDate.AddDate(0, 0, 30)
	dpInv := salesModels.CustomerInvoice{
		ID:           uuid.New().String(),
		Code:         in.formatCode("CIDP", in.tag),
		InvoiceDate:  dpDate,
		DueDate:      &dpDueDate,
		Type:         salesModels.CustomerInvoiceTypeDownPayment,
		SalesOrderID: &so.ID,
		Amount:       dpAmount,
		PaidAmount:   dpAmount,
		Status:       salesModels.CustomerInvoiceStatusPaid,
		CreatedBy:    &in.adminID,
	}
	tx.Create(&dpInv)

	dpPay := salesModels.SalesPayment{
		ID:                          uuid.New().String(),
		CustomerInvoiceID:           dpInv.ID,
		BankAccountID:               in.bankAccount.ID,
		PaymentDate:                 dpDate.Format("2006-01-02"),
		Amount:                      dpAmount,
		Method:                      salesModels.SalesPaymentMethodBank,
		Status:                      salesModels.SalesPaymentStatusConfirmed,
		CreatedBy:                   in.adminID,
		BankAccountNameSnapshot:     in.bankAccount.Name,
		BankAccountNumberSnapshot:   in.bankAccount.AccountNumber,
		BankAccountHolderSnapshot:   in.bankAccount.AccountHolder,
		BankAccountCurrencySnapshot: in.bankAccount.Currency,
	}
	tx.Create(&dpPay)

	// Journal for DP
	if in.cashCOA != "" && in.dpAdvanceCOA != "" {
		createJournalEntry(tx, dpDate, fmt.Sprintf("DP Payment - %s", so.Code), "SALES_PAYMENT", dpPay.ID, in.adminID, []journalLineInput{
			{in.cashCOA, dpAmount, 0, "Cash In"},
			{in.dpAdvanceCOA, 0, dpAmount, "Customer Deposit"},
		})
	} else {
		log.Printf("Warning: Failed to create DP Journal for %s due to missing COAs", so.Code)
	}

	// 4. Delivery Order (Fully delivered)
	do := salesModels.DeliveryOrder{
		ID:           uuid.New().String(),
		Code:         in.formatCode("DO", in.tag),
		SalesOrderID: so.ID,
		WarehouseID:  &in.warehouse.ID,
		DeliveryDate: doDate,
		Status:       salesModels.DeliveryOrderStatusDelivered,
		CreatedBy:    &in.adminID,
	}
	for _, item := range so.Items {
		do.Items = append(do.Items, salesModels.DeliveryOrderItem{
			ID: uuid.New().String(), ProductID: item.ProductID, SalesOrderItemID: &item.ID, Quantity: item.Quantity, Price: item.Price, Subtotal: item.Subtotal,
		})
		// Record stock movement (simplified)
		tx.Create(&inventoryModels.StockMovement{
			ProductID: item.ProductID, WarehouseID: in.warehouse.ID, RefType: "DeliveryOrder", RefID: do.ID, RefNumber: do.Code, QtyOut: item.Quantity, Date: doDate,
		})
	}
	tx.Create(&do)

	// 5. Regular Invoice (Net of DP)
	netAmount := so.TotalAmount - dpAmount
	regInv := salesModels.CustomerInvoice{
		ID:                   uuid.New().String(),
		Code:                 in.formatCode("INV", in.tag),
		InvoiceDate:          invDate,
		Type:                 salesModels.CustomerInvoiceTypeRegular,
		SalesOrderID:         &so.ID,
		DownPaymentInvoiceID: &dpInv.ID,
		DownPaymentAmount:    dpAmount,
		Subtotal:             so.Subtotal,
		TaxRate:              so.TaxRate,
		TaxAmount:            so.TaxAmount,
		Amount:               netAmount,
		RemainingAmount:      netAmount,
		Status:               salesModels.CustomerInvoiceStatusUnpaid,
		CreatedBy:            &in.adminID,
	}
	tx.Create(&regInv)

	// Journal for Invoice (Dr Receivable, Dr DP / Cr Sales, Cr Tax)
	if in.receivableCOA != "" && in.revenueCOA != "" {
		createJournalEntry(tx, invDate, fmt.Sprintf("Sales Invoice - %s", regInv.Code), "SALES_INVOICE", regInv.ID, in.adminID, []journalLineInput{
			{in.receivableCOA, netAmount, 0, "Account Receivable"},
			{in.dpAdvanceCOA, dpAmount, 0, "Deduct DP"},
			{in.revenueCOA, 0, so.Subtotal, "Sales Revenue"},
			{in.taxCOA, 0, so.TaxAmount, "VAT Output"},
		})
	} else {
		log.Printf("Warning: Failed to create SI Journal for %s due to missing COAs", regInv.Code)
	}

	// 6. Final Payment
	finalPay := salesModels.SalesPayment{
		ID:                          uuid.New().String(),
		CustomerInvoiceID:           regInv.ID,
		BankAccountID:               in.bankAccount.ID,
		PaymentDate:                 payDate.Format("2006-01-02"),
		Amount:                      netAmount,
		Method:                      salesModels.SalesPaymentMethodBank,
		Status:                      salesModels.SalesPaymentStatusConfirmed,
		CreatedBy:                   in.adminID,
		BankAccountNameSnapshot:     in.bankAccount.Name,
		BankAccountNumberSnapshot:   in.bankAccount.AccountNumber,
		BankAccountHolderSnapshot:   in.bankAccount.AccountHolder,
		BankAccountCurrencySnapshot: in.bankAccount.Currency,
	}
	tx.Create(&finalPay)
	tx.Model(&regInv).Updates(map[string]interface{}{"paid_amount": netAmount, "remaining_amount": 0, "status": salesModels.CustomerInvoiceStatusPaid, "payment_at": payDate})
	tx.Model(&so).Update("status", salesModels.SalesOrderStatusClosed)

	// Journal for Final Payment
	if in.cashCOA != "" && in.receivableCOA != "" {
		createJournalEntry(tx, payDate, fmt.Sprintf("Final Payment - %s", regInv.Code), "SALES_PAYMENT", finalPay.ID, in.adminID, []journalLineInput{
			{in.cashCOA, netAmount, 0, "Cash In"},
			{in.receivableCOA, 0, netAmount, "Clear Receivable"},
		})
	} else {
		log.Printf("Warning: Failed to create Final Payment Journal for %s due to missing COAs", regInv.Code)
	}

	return nil
}

func seedSalesPartialFlow(tx *gorm.DB, in salesFlowInput) error {
	soDate := in.baseDate
	invDate := soDate.AddDate(0, 0, 1)
	payDate := invDate.AddDate(0, 0, 1)

	// Just SO -> INV (Partial) -> PAY
	so := salesModels.SalesOrder{
		ID:           uuid.New().String(),
		Code:         in.formatCode("SO", in.tag),
		OrderDate:    soDate,
		CustomerID:   &in.customer.ID,
		CustomerName: in.customer.Name,
		TotalAmount:  5000000.0,
		Status:       salesModels.SalesOrderStatusApproved,
		CreatedBy:    &in.adminID,
	}
	tx.Create(&so)

	inv := salesModels.CustomerInvoice{
		ID:              uuid.New().String(),
		Code:            in.formatCode("INV", in.tag),
		InvoiceDate:     invDate,
		Type:            salesModels.CustomerInvoiceTypeRegular,
		SalesOrderID:    &so.ID,
		Amount:          5000000.0,
		RemainingAmount: 5000000.0,
		Status:          salesModels.CustomerInvoiceStatusPartial,
		CreatedBy:       &in.adminID,
	}
	tx.Create(&inv)

	payAmount := 2000000.0
	pay := salesModels.SalesPayment{
		ID:                          uuid.New().String(),
		CustomerInvoiceID:           inv.ID,
		BankAccountID:               in.bankAccount.ID,
		PaymentDate:                 payDate.Format("2006-01-02"),
		Amount:                      payAmount,
		Method:                      salesModels.SalesPaymentMethodBank,
		Status:                      salesModels.SalesPaymentStatusConfirmed,
		CreatedBy:                   in.adminID,
		BankAccountNameSnapshot:     in.bankAccount.Name,
		BankAccountNumberSnapshot:   in.bankAccount.AccountNumber,
		BankAccountHolderSnapshot:   in.bankAccount.AccountHolder,
		BankAccountCurrencySnapshot: in.bankAccount.Currency,
	}
	tx.Create(&pay)
	tx.Model(&inv).Updates(map[string]interface{}{"paid_amount": payAmount, "remaining_amount": 3000000.0})

	if in.cashCOA != "" && in.receivableCOA != "" {
		createJournalEntry(tx, payDate, fmt.Sprintf("Partial Payment - %s", inv.Code), "SALES_PAYMENT", pay.ID, in.adminID, []journalLineInput{
			{in.cashCOA, payAmount, 0, "Partial Cash In"},
			{in.receivableCOA, 0, payAmount, "Partial AR Reduction"},
		})
	} else {
		log.Printf("Warning: Failed to create Partial Payment Journal for %s due to missing COAs", inv.Code)
	}

	return nil
}

func seedSalesMinimalFlow(tx *gorm.DB, adminID string) error {
	// Minimal sales flow: 1x SQ → 1x SO → 1x DO → 1x INV → 1x PAY
	// Uses deterministic codes for easy tracing.
	var customer customerModels.Customer
	if err := tx.Where("is_active = ?", true).First(&customer).Error; err != nil {
		return err
	}

	var pt coreModels.PaymentTerms
	if err := tx.Where("is_active = ?", true).First(&pt).Error; err != nil {
		return err
	}

	var bankAccount coreModels.BankAccount
	if err := tx.Where("is_active = ?", true).First(&bankAccount).Error; err != nil {
		return err
	}

	var warehouse warehouseModels.Warehouse
	if err := tx.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
		return err
	}

	var product productModels.Product
	if err := tx.Where("is_active = ?", true).First(&product).Error; err != nil {
		return err
	}

	cashCOA := getCOAID(tx, "1-1101")
	receivableCOA := getCOAID(tx, "1-1210")
	revenueCOA := getCOAID(tx, "4-1100")
	taxCOA := getCOAID(tx, "2-1210")
	dpAdvanceCOA := getCOAID(tx, "2-1400")

	now := time.Now()
	return seedSalesFullFlowDP(tx, salesFlowInput{
		tag:           "001",
		codePrefix:    "",
		customer:      customer,
		products:      []productModels.Product{product},
		pt:            pt,
		bankAccount:   bankAccount,
		warehouse:     warehouse,
		adminID:       adminID,
		baseDate:      now.AddDate(0, 0, -5),
		taxRate:       11.0,
		cashCOA:       cashCOA,
		receivableCOA: receivableCOA,
		revenueCOA:    revenueCOA,
		taxCOA:        taxCOA,
		dpAdvanceCOA:  dpAdvanceCOA,
	})
}

// Helpers
func getCOAID(tx *gorm.DB, code string) string {
	var c financeModels.ChartOfAccount
	tx.Where("code = ?", code).First(&c)
	return c.ID
}

func createJournalEntry(tx *gorm.DB, date time.Time, desc, refType, refID, adminID string, lines []journalLineInput) {
	log.Printf("Triggering journal entry creation for %s (%s)", refType, refID)

	coaRepo := financeRepositories.NewChartOfAccountRepository(tx)
	journalRepo := financeRepositories.NewJournalEntryRepository(tx)
	coaMapper := financeMapper.NewChartOfAccountMapper()
	journalMapper := financeMapper.NewJournalEntryMapper(coaMapper)
	auditSvc := audit.NewAuditService(tx)
	journalUC := financeUsecase.NewJournalEntryUsecase(tx, coaRepo, journalRepo, journalMapper, auditSvc)

	reqLines := make([]financeDto.JournalLineRequest, 0, len(lines))
	for _, l := range lines {
		if l.coaID == "" {
			log.Printf("ERROR: Skipped journal %s - missing COA %s", refType, l.memo)
			return
		}
		// Skip zero lines
		if l.debit == 0 && l.credit == 0 {
			continue
		}
		reqLines = append(reqLines, financeDto.JournalLineRequest{
			ChartOfAccountID: l.coaID,
			Debit:            l.debit,
			Credit:           l.credit,
			Memo:             l.memo,
		})
	}

	ctx := context.WithValue(context.Background(), "user_id", adminID)
	txCtx := database.WithTx(ctx, tx)

	req := &financeDto.CreateJournalEntryRequest{
		EntryDate:         date.Format("2006-01-02"),
		Description:       desc,
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		Lines:             reqLines,
		IsSystemGenerated: true,
	}

	_, err := journalUC.PostOrUpdateJournal(txCtx, req)
	if err != nil {
		log.Printf("ERROR: Failed to create journal entry via usecase for %s (%s): %v", refType, refID, err)
	} else {
		log.Printf("SUCCESS: Created journal entry via usecase for %s (%s)", refType, refID)
	}
}
