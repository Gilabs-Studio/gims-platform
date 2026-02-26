package seeders

import (
	"context"
	"log"
	"math"
	"os"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	userModels "github.com/gilabs/gims/api/internal/user/data/models"
	"github.com/google/uuid"
)

// SeedSalesFinanceE2E seeds a complete end-to-end integration scenario
// covering all sales module menus and their integration with finance.
func SeedSalesFinanceE2E() error {
	db := database.DB

	// Guard: skip if already seeded
	var count int64
	db.Model(&salesModels.SalesQuotation{}).Where("code LIKE ?", "SQ-E2E-%").Count(&count)
	if count > 0 {
		log.Println("Sales-Finance E2E already seeded, skipping...")
		return nil
	}

	log.Println("═══════════════════════════════════════════════════════════")
	log.Println("  SEEDING: Sales → Finance End-to-End Integration")
	log.Println("═══════════════════════════════════════════════════════════")

	// ── Resolve dependencies ──────────────────────────────────────────

	// Admin user
	defaultEmail := os.Getenv("SEED_DEFAULT_EMAIL")
	if defaultEmail == "" {
		defaultEmail = "admin@example.com"
	}
	var admin userModels.User
	if err := db.Where("email = ?", defaultEmail).First(&admin).Error; err != nil {
		if err2 := db.First(&admin).Error; err2 != nil {
			log.Println("⚠️  No admin user found, skipping Sales-Finance E2E")
			return nil
		}
	}

	// Customer
	var customer customerModels.Customer
	if err := db.First(&customer).Error; err != nil {
		log.Println("⚠️  No customer found, skipping Sales-Finance E2E")
		return nil
	}

	// Products
	var products []productModels.Product
	if err := db.Where("is_approved = ?", true).Limit(5).Find(&products).Error; err != nil || len(products) < 2 {
		log.Println("⚠️  Not enough approved products, skipping Sales-Finance E2E")
		return nil
	}

	// Payment terms
	var pt coreModels.PaymentTerms
	if err := db.Where("is_active = ?", true).First(&pt).Error; err != nil {
		log.Println("⚠️  No payment terms found, skipping Sales-Finance E2E")
		return nil
	}

	// Bank account
	var bankAccount coreModels.BankAccount
	if err := db.Where("is_active = ?", true).First(&bankAccount).Error; err != nil {
		log.Println("⚠️  No active bank account found, skipping Sales-Finance E2E")
		return nil
	}

	// ── Setup Chart of Accounts (COA) ──────────────────────────────────
	log.Println("  Setting up COAs for Finance Integration...")

	ensureCOA := func(code, name, coaType string) financeModels.ChartOfAccount {
		var coa financeModels.ChartOfAccount
		if err := db.Where("code = ?", code).First(&coa).Error; err != nil {
			coa = financeModels.ChartOfAccount{
				ID:       uuid.New().String(),
				Code:     code,
				Name:     name,
				Type:     financeModels.AccountType(coaType),
				IsActive: true,
			}
			db.Create(&coa)
			log.Printf("    Created COA: [%s] %s", code, name)
		}
		return coa
	}

	cashCOA := ensureCOA("11100", "Cash on Hand", "ASSET")
	receivableCOA := ensureCOA("11300", "Trade Receivables", "ASSET")
	dpAdvanceCOA := ensureCOA("21200", "Sales Advances (DP)", "LIABILITY")
	revenueCOA := ensureCOA("4100", "Sales Revenue", "REVENUE")

	// ──────────────────────────────────────────────────────────────────
	// SCENARIO 1: Full flow with Down Payment (SQ → SO → DO → DP → INV → PAY → JE)
	// ──────────────────────────────────────────────────────────────────
	log.Println("── Scenario 1: Down Payment & Integration ──")

	invoiceRepo := repositories.NewCustomerInvoiceRepository(db)
	ctx := context.Background()
	now := time.Now()
	taxRate := 11.0

	// 1. Sales Quotation
	sqDate := now.AddDate(0, 0, -30)
	sq := salesModels.SalesQuotation{
		ID:             uuid.New().String(),
		Code:           "SQ-E2E-001",
		QuotationDate:  sqDate,
		CustomerID:     &customer.ID,
		CustomerName:   customer.Name,
		PaymentTermsID: &pt.ID,
		Status:         salesModels.SalesQuotationStatusConverted,
		TaxRate:        taxRate,
		CreatedBy:      &admin.ID,
	}

	sqSubtotal := 0.0
	for i, p := range products[:2] {
		qty, price := 10.0+float64(i*5), 150000.0+float64(i*50000)
		sub := qty * price
		sqSubtotal += sub
		sq.Items = append(sq.Items, salesModels.SalesQuotationItem{
			ID: uuid.New().String(), ProductID: p.ID, Quantity: qty, Price: price, Subtotal: sub,
		})
	}
	sq.Subtotal = sqSubtotal
	sq.TaxAmount = sqSubtotal * (taxRate / 100)
	sq.TotalAmount = sq.Subtotal + sq.TaxAmount

	if err := db.Create(&sq).Error; err != nil {
		return err
	}

	// 2. Sales Order
	soDate := sqDate.AddDate(0, 0, 3)
	so := salesModels.SalesOrder{
		ID:               uuid.New().String(),
		Code:             "SO-E2E-001",
		OrderDate:        soDate,
		SalesQuotationID: &sq.ID,
		CustomerID:       &customer.ID,
		CustomerName:     customer.Name,
		TotalAmount:      sq.TotalAmount,
		Subtotal:         sq.Subtotal,
		TaxAmount:        sq.TaxAmount,
		Status:           salesModels.SalesOrderStatusApproved,
		CreatedBy:        &admin.ID,
	}
	for _, item := range sq.Items {
		so.Items = append(so.Items, salesModels.SalesOrderItem{
			ID: uuid.New().String(), ProductID: item.ProductID, Quantity: item.Quantity, Price: item.Price, Subtotal: item.Subtotal,
		})
	}
	db.Create(&so)
	db.Model(&sq).Update("converted_to_sales_order_id", so.ID)

	// 3. DP Invoice (Paid)
	dpAmount := math.Round(so.TotalAmount * 0.3)
	dpCode, _ := invoiceRepo.GetNextInvoiceNumber(ctx, "CIDP")
	dpInv := salesModels.CustomerInvoice{
		ID:           uuid.New().String(),
		Code:         dpCode,
		InvoiceDate:  soDate.AddDate(0, 0, 1),
		Type:         salesModels.CustomerInvoiceTypeDownPayment,
		SalesOrderID: &so.ID,
		Amount:       dpAmount,
		PaidAmount:   dpAmount,
		Status:       salesModels.CustomerInvoiceStatusPaid,
	}
	db.Create(&dpInv)

	// 4. Sales Payment for DP (Confirmed → Triggers Finance)
	dpPay := salesModels.SalesPayment{
		ID:                uuid.New().String(),
		CustomerInvoiceID: dpInv.ID,
		BankAccountID:     bankAccount.ID,
		PaymentDate:       dpInv.InvoiceDate.Format("2006-01-02"),
		Amount:            dpAmount,
		Status:            salesModels.SalesPaymentStatusConfirmed,
	}
	db.Create(&dpPay)

	// Trigger Journal for DP
	jeDP := financeModels.JournalEntry{}
	jeDP.ID = uuid.New().String()
	jeDP.EntryDate = dpInv.InvoiceDate
	jeDP.Description = "DP Payment - " + so.Code
	jeDP.Status = financeModels.JournalStatus("posted")
	refType1 := "SALES_PAYMENT"
	jeDP.ReferenceType = &refType1
	refID1 := dpPay.ID
	jeDP.ReferenceID = &refID1

	line1 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: cashCOA.ID, Debit: dpAmount}
	line2 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: dpAdvanceCOA.ID, Credit: dpAmount}
	jeDP.Lines = []financeModels.JournalLine{line1, line2}
	db.Create(&jeDP)

	// 5. Regular Invoice (amount reduced by DP)
	invCode, _ := invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	regInv := salesModels.CustomerInvoice{
		ID:                   uuid.New().String(),
		Code:                 invCode,
		InvoiceDate:          soDate.AddDate(0, 0, 5),
		Type:                 salesModels.CustomerInvoiceTypeRegular,
		SalesOrderID:         &so.ID,
		DownPaymentInvoiceID: &dpInv.ID,
		DownPaymentAmount:    dpAmount,
		Subtotal:             so.Subtotal,
		TaxAmount:            so.TaxAmount,
		Amount:               so.TotalAmount - dpAmount,
		RemainingAmount:      so.TotalAmount - dpAmount,
		Status:               salesModels.CustomerInvoiceStatusUnpaid,
	}
	db.Create(&regInv)

	log.Printf("  ✅ S1 Success: SQ %s -> SO %s -> DP %s (Paid) -> INV %s (Reduced Amount)", sq.Code, so.Code, dpInv.Code, regInv.Code)

	// ──────────────────────────────────────────────────────────────────
	// SCENARIO 2: Partial Payment & Outstanding Receivable (SO → INV → PAY → Recap)
	// ──────────────────────────────────────────────────────────────────
	log.Println("── Scenario 2: Partial Payment & Receivables ──")

	so2 := salesModels.SalesOrder{
		ID: uuid.New().String(), Code: "SO-E2E-002", OrderDate: now.AddDate(0, 0, -15), CustomerID: &customer.ID, CustomerName: customer.Name, TotalAmount: 5000000.0, Status: salesModels.SalesOrderStatusApproved,
	}
	db.Create(&so2)

	invCode2, _ := invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	inv2 := salesModels.CustomerInvoice{
		ID: uuid.New().String(), Code: invCode2, InvoiceDate: so2.OrderDate.AddDate(0, 0, 2), Type: salesModels.CustomerInvoiceTypeRegular, SalesOrderID: &so2.ID,
		Amount: 5000000.0, PaidAmount: 2000000.0, RemainingAmount: 3000000.0, Status: salesModels.CustomerInvoiceStatusPartial,
	}
	db.Create(&inv2)

	pay2 := salesModels.SalesPayment{
		ID: uuid.New().String(), CustomerInvoiceID: inv2.ID, BankAccountID: bankAccount.ID, PaymentDate: inv2.InvoiceDate.Format("2006-01-02"), Amount: 2000000.0, Status: salesModels.SalesPaymentStatusConfirmed,
	}
	db.Create(&pay2)

	// Journal for Partial Payment
	je2 := financeModels.JournalEntry{}
	je2.ID = uuid.New().String()
	je2.EntryDate = inv2.InvoiceDate
	je2.Description = "Partial Payment - " + so2.Code
	je2.Status = financeModels.JournalStatus("posted")
	refType2 := "SALES_PAYMENT"
	je2.ReferenceType = &refType2
	refID2 := pay2.ID
	je2.ReferenceID = &refID2

	line2_1 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: cashCOA.ID, Debit: 2000000.0}
	line2_2 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: receivableCOA.ID, Credit: 2000000.0}
	je2.Lines = []financeModels.JournalLine{line2_1, line2_2}
	db.Create(&je2)

	log.Printf("  ✅ S2 Success: SO %s -> INV %s (Partial) -> Payment Confirmed. Outstanding: 3,000,000", so2.Code, inv2.Code)

	// ──────────────────────────────────────────────────────────────────
	// SCENARIO 3: Full Integration with Journal Revenue (SO → INV → PAY → SO Closed)
	// ──────────────────────────────────────────────────────────────────
	log.Println("── Scenario 3: Full Payment & SO Auto-Close ──")

	so3 := salesModels.SalesOrder{
		ID: uuid.New().String(), Code: "SO-E2E-003", OrderDate: now.AddDate(0, 0, -5), CustomerID: &customer.ID, CustomerName: customer.Name, TotalAmount: 1000000.0, Status: salesModels.SalesOrderStatusClosed,
	}
	db.Create(&so3)

	invCode3, _ := invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	inv3 := salesModels.CustomerInvoice{
		ID: uuid.New().String(), Code: invCode3, InvoiceDate: so3.OrderDate.AddDate(0, 0, 1), Type: salesModels.CustomerInvoiceTypeRegular, SalesOrderID: &so3.ID,
		Amount: 1000000.0, PaidAmount: 1000000.0, RemainingAmount: 0, Status: salesModels.CustomerInvoiceStatusPaid,
	}
	db.Create(&inv3)

	pay3 := salesModels.SalesPayment{
		ID: uuid.New().String(), CustomerInvoiceID: inv3.ID, BankAccountID: bankAccount.ID, PaymentDate: inv3.InvoiceDate.Format("2006-01-02"), Amount: 1000000.0, Status: salesModels.SalesPaymentStatusConfirmed,
	}
	db.Create(&pay3)

	// Journal for Full Payment
	je3 := financeModels.JournalEntry{}
	je3.ID = uuid.New().String()
	je3.EntryDate = inv3.InvoiceDate
	je3.Description = "Full Payment & Revenue - " + so3.Code
	je3.Status = financeModels.JournalStatus("posted")
	refType3 := "SALES_PAYMENT"
	je3.ReferenceType = &refType3
	refID3 := pay3.ID
	je3.ReferenceID = &refID3

	line3_1 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: cashCOA.ID, Debit: 1000000.0}
	line3_2 := financeModels.JournalLine{ID: uuid.New().String(), ChartOfAccountID: revenueCOA.ID, Credit: 1000000.0}
	je3.Lines = []financeModels.JournalLine{line3_1, line3_2}
	db.Create(&je3)

	log.Printf("  ✅ S3 Success: SO %s -> INV %s -> Paid -> SO Closed. Journal Posted to Revenue.", so3.Code, inv3.Code)

	log.Println("═══════════════════════════════════════════════════════════")
	log.Println("  SALES INTEGRATION COMPLETED SUCCESSFULLY")
	log.Println("═══════════════════════════════════════════════════════════")

	return nil
}
