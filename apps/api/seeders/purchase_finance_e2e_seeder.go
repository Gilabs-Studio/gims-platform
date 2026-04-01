package seeders

import (
	"context"
	"fmt"
	"log"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	financeRepositories "github.com/gilabs/gims/api/internal/finance/data/repositories"
	financeDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	financeMapper "github.com/gilabs/gims/api/internal/finance/domain/mapper"
	financeUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	orgModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedPurchaseFinanceE2E creates realistic end-to-end Purchase and Finance data
// spanning 2025 (historical) and 2026 (current year) with correct business flows:
//
//	PR → PO → GR → Supplier Invoice → Payment
//	     ↓        ↓           ↓            ↓
//	  Journal  Stock+Journal  AP Journal  Payment Journal
//
// Also seeds: Down Payments, Revenue journals, Expense journals,
// Equity transactions, and diverse statuses for dashboard variety.
func SeedPurchaseFinanceE2E() error {
	db := database.DB

	// Idempotency: skip if already seeded
	if isMinimalSeedMode() {
		var checkPO purchaseModels.PurchaseOrder
		if err := db.Where("code = ?", "PO-001").First(&checkPO).Error; err == nil {
			log.Println("Minimal Purchase-Finance data already seeded, skipping...")
			return nil
		}
		log.Println("Seeding minimal Purchase → Finance flow (PO → GR → SI → PAY)...")
		return db.Transaction(func(tx *gorm.DB) error {
			adminID := getAdminID(tx)

			var supplier supplierModels.Supplier
			if err := tx.Where("is_active = ?", true).First(&supplier).Error; err != nil {
				return err
			}

			var product productModels.Product
			if err := tx.Where("is_active = ?", true).First(&product).Error; err != nil {
				return err
			}

			var warehouse warehouseModels.Warehouse
			if err := tx.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
				return err
			}

			var bankAccount coreModels.BankAccount
			if err := tx.Where("is_active = ?", true).First(&bankAccount).Error; err != nil {
				return err
			}

			var pt coreModels.PaymentTerms
			if err := tx.Where("is_active = ?", true).First(&pt).Error; err != nil {
				return err
			}

			// COA mapping
			invCOA := getCOAID(tx, "11400")
			grirCOA := getCOAID(tx, "21100")
			apCOA := getCOAID(tx, "21000")
			vatCOA := getCOAID(tx, "11800")
			bankCOA := getCOAID(tx, "11100")

			now := time.Now()
			return seedMinimalPurchaseFlow(tx, purchaseFlowInput{
				year:        now.Year(),
				month:       int(now.Month()),
				tag:         "001",
				qty:         10,
				price:       50000,
				product:     product,
				supplier:    supplier,
				warehouse:   warehouse,
				bankAccount: bankAccount,
				pt:          pt,
				adminID:     adminID,
				invCOA:      invCOA,
				grirCOA:     grirCOA,
				apCOA:       apCOA,
				vatCOA:      vatCOA,
				bankCOA:     bankCOA,
			})
		})
	}

	// Full E2E data
	var checkPO purchaseModels.PurchaseOrder
	if err := db.Where("code = ?", "PO-E2E-2025-001").First(&checkPO).Error; err == nil {
		log.Println("E2E Purchase-Finance data already seeded, skipping...")
		return nil
	}

	log.Println("Seeding comprehensive Purchase → Finance E2E data (2025-2026)...")

	return db.Transaction(func(tx *gorm.DB) error {
		// ─────────────────── Dependencies ───────────────────

		adminID := getAdminID(tx)

		var suppliers []supplierModels.Supplier
		if err := tx.Where("is_active = ?", true).Limit(3).Find(&suppliers).Error; err != nil || len(suppliers) == 0 {
			log.Println("Warning: No suppliers found. Skipping E2E seeder.")
			return nil
		}

		var paymentTerms []coreModels.PaymentTerms
		if err := tx.Where("is_active = ?", true).Limit(2).Find(&paymentTerms).Error; err != nil || len(paymentTerms) == 0 {
			log.Println("Warning: No payment terms found. Skipping E2E seeder.")
			return nil
		}

		var businessUnits []orgModels.BusinessUnit
		if err := tx.Where("is_active = ?", true).Limit(2).Find(&businessUnits).Error; err != nil || len(businessUnits) == 0 {
			log.Println("Warning: No business units found. Skipping E2E seeder.")
			return nil
		}

		var products []productModels.Product
		if err := tx.Where("is_active = ?", true).Limit(8).Find(&products).Error; err != nil || len(products) == 0 {
			log.Println("Warning: No products found. Skipping E2E seeder.")
			return nil
		}

		var warehouse warehouseModels.Warehouse
		if err := tx.Where("is_active = ?", true).First(&warehouse).Error; err != nil {
			log.Println("Warning: No warehouses found. Skipping E2E seeder.")
			return nil
		}

		var bankAccount coreModels.BankAccount
		if err := tx.Where("is_active = ?", true).First(&bankAccount).Error; err != nil {
			log.Println("Warning: No bank accounts found. Skipping E2E seeder.")
			return nil
		}

		// ─────────────────── Ensure extra COA ───────────────────
		extraCOA := []financeModels.ChartOfAccount{
			{Code: "31000", Name: "Paid-in Capital", Type: financeModels.AccountTypeEquity, IsActive: true},
			{Code: "32000", Name: "Retained Earnings", Type: financeModels.AccountTypeEquity, IsActive: true},
			{Code: "4200", Name: "Service Revenue", Type: financeModels.AccountTypeRevenue, IsActive: true},
			{Code: "5100", Name: "Cost of Goods Sold", Type: financeModels.AccountTypeExpense, IsActive: true},
			{Code: "6300", Name: "Salary Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
			{Code: "6400", Name: "Rent Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
			{Code: "6500", Name: "Utility Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
			{Code: "6600", Name: "Marketing Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
			{Code: "11200", Name: "Bank BCA", Type: financeModels.AccountTypeCashBank, IsActive: true},
			{Code: "11300", Name: "Bank Mandiri", Type: financeModels.AccountTypeCashBank, IsActive: true},
		}
		for i := range extraCOA {
			tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				DoUpdates: clause.AssignmentColumns([]string{"type", "name", "is_active"}),
			}).Create(&extraCOA[i])
		}

		getCOA := func(code string) string {
			var c financeModels.ChartOfAccount
			if err := tx.Where("code = ?", code).First(&c).Error; err != nil {
				return ""
			}
			return c.ID
		}

		invCOA := getCOA("11400")  // Inventory
		grirCOA := getCOA("21100") // GR/IR Clearing
		apCOA := getCOA("21000")   // AP
		vatCOA := getCOA("11800")  // VAT Input
		cashCOA := getCOA("11100") // Cash
		salesCOA := getCOA("4100") // Sales Revenue
		serviceCOA := getCOA("4200")
		cogsCOA := getCOA("5100")
		salaryCOA := getCOA("6300")
		rentCOA := getCOA("6400")
		utilityCOA := getCOA("6500")
		marketingCOA := getCOA("6600")
		capitalCOA := getCOA("31000")
		retainedCOA := getCOA("32000")
		arCOA := getCOA("1100")
		bankBcaCOA := getCOA("11200")

		// Get bank's linked COA if available
		bankCOA := cashCOA
		if bankAccount.ChartOfAccountID != nil && *bankAccount.ChartOfAccountID != "" {
			bankCOA = *bankAccount.ChartOfAccountID
		}

		// ─────────────────── HISTORICAL DATA: 2025 (full year) ───────────────────

		type purchaseScenario struct {
			month    int
			tag      string
			qty      float64
			price    float64
			taxRate  float64
			status   string // "PAID", "PARTIAL", "UNPAID"
			payRatio float64
			prodIdx  int
			suppIdx  int
			withDP   bool
			dpAmount float64
		}

		scenarios2025 := []purchaseScenario{
			// 2025 — 3 historical records with diverse statuses
			{3, "001", 30, 45000, 11, "PAID", 1.0, 0, 0, true, 500000},
			{7, "002", 50, 62000, 11, "PAID", 1.0, 1, 1, false, 0},
			{11, "003", 40, 48000, 11, "PARTIAL", 0.6, 2, 2, false, 0},
		}

		for _, sc := range scenarios2025 {
			if err := seedPurchaseFlow(tx, purchaseFlowInput{
				year:        2025,
				month:       sc.month,
				tag:         sc.tag,
				qty:         sc.qty,
				price:       sc.price,
				taxRate:     sc.taxRate,
				payStatus:   sc.status,
				payRatio:    sc.payRatio,
				product:     products[sc.prodIdx%len(products)],
				supplier:    suppliers[sc.suppIdx%len(suppliers)],
				pt:          paymentTerms[0],
				bu:          businessUnits[0],
				warehouse:   warehouse,
				bankAccount: bankAccount,
				adminID:     adminID,
				withDP:      sc.withDP,
				dpAmount:    sc.dpAmount,
				invCOA:      invCOA,
				grirCOA:     grirCOA,
				apCOA:       apCOA,
				vatCOA:      vatCOA,
				bankCOA:     bankCOA,
			}); err != nil {
				return err
			}
		}

		// ─────────────────── CURRENT YEAR: 2026 ───────────────────

		scenarios2026 := []purchaseScenario{
			// 2026 — early-stage POs only (DRAFT/SUBMITTED); no GR/SI created
			{1, "001", 30, 58000, 11, "DRAFT", 0, 0, 0, false, 0},
			{2, "002", 20, 72000, 11, "SUBMITTED", 0, 1, 1, false, 0},
		}

		for _, sc := range scenarios2026 {
			if err := seedPurchaseFlow(tx, purchaseFlowInput{
				year:        2026,
				month:       sc.month,
				tag:         sc.tag,
				qty:         sc.qty,
				price:       sc.price,
				taxRate:     sc.taxRate,
				poStatus:    sc.status, // "DRAFT" or "SUBMITTED" — GR/SI skipped automatically
				payRatio:    sc.payRatio,
				product:     products[sc.prodIdx%len(products)],
				supplier:    suppliers[sc.suppIdx%len(suppliers)],
				pt:          paymentTerms[0],
				bu:          businessUnits[0],
				warehouse:   warehouse,
				bankAccount: bankAccount,
				adminID:     adminID,
				withDP:      sc.withDP,
				dpAmount:    sc.dpAmount,
				invCOA:      invCOA,
				grirCOA:     grirCOA,
				apCOA:       apCOA,
				vatCOA:      vatCOA,
				bankCOA:     bankCOA,
			}); err != nil {
				return err
			}
		}

		// ─────────────────── REVENUE JOURNALS (2025-2026) ───────────────────

		revenueEntries := []struct {
			date      time.Time
			desc      string
			debitCOA  string
			creditCOA string
			amount    float64
		}{
			// 2025 Revenue (monthly sales)
			{time.Date(2025, 1, 20, 0, 0, 0, 0, time.UTC), "January 2025 Sales Revenue", arCOA, salesCOA, 32500000},
			{time.Date(2025, 2, 18, 0, 0, 0, 0, time.UTC), "February 2025 Sales Revenue", arCOA, salesCOA, 41200000},
			{time.Date(2025, 3, 22, 0, 0, 0, 0, time.UTC), "March 2025 Sales Revenue", arCOA, salesCOA, 38700000},
			{time.Date(2025, 4, 19, 0, 0, 0, 0, time.UTC), "April 2025 Sales Revenue", arCOA, salesCOA, 45800000},
			{time.Date(2025, 5, 21, 0, 0, 0, 0, time.UTC), "May 2025 Sales + Service Revenue", arCOA, salesCOA, 52100000},
			{time.Date(2025, 6, 20, 0, 0, 0, 0, time.UTC), "June 2025 Sales Revenue", arCOA, salesCOA, 48900000},
			{time.Date(2025, 7, 22, 0, 0, 0, 0, time.UTC), "July 2025 Sales Revenue", arCOA, salesCOA, 55300000},
			{time.Date(2025, 8, 20, 0, 0, 0, 0, time.UTC), "August 2025 Sales Revenue", arCOA, salesCOA, 49800000},
			{time.Date(2025, 9, 19, 0, 0, 0, 0, time.UTC), "September 2025 Sales Revenue", arCOA, salesCOA, 58200000},
			{time.Date(2025, 10, 21, 0, 0, 0, 0, time.UTC), "October 2025 Sales Revenue", arCOA, salesCOA, 62400000},
			{time.Date(2025, 11, 20, 0, 0, 0, 0, time.UTC), "November 2025 Sales Revenue", arCOA, salesCOA, 57600000},
			{time.Date(2025, 12, 22, 0, 0, 0, 0, time.UTC), "December 2025 Sales Revenue", arCOA, salesCOA, 71800000},
			// 2026 Revenue
			{time.Date(2026, 1, 21, 0, 0, 0, 0, time.UTC), "January 2026 Sales Revenue", arCOA, salesCOA, 64500000},
			{time.Date(2026, 2, 19, 0, 0, 0, 0, time.UTC), "February 2026 Sales Revenue", arCOA, salesCOA, 58300000},
		}

		// Service revenue
		serviceEntries := []struct {
			date   time.Time
			desc   string
			amount float64
		}{
			{time.Date(2025, 3, 15, 0, 0, 0, 0, time.UTC), "Q1 2025 Service Revenue", 15000000},
			{time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC), "Q2 2025 Service Revenue", 18500000},
			{time.Date(2025, 9, 15, 0, 0, 0, 0, time.UTC), "Q3 2025 Service Revenue", 22000000},
			{time.Date(2025, 12, 15, 0, 0, 0, 0, time.UTC), "Q4 2025 Service Revenue", 25500000},
			{time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC), "Jan 2026 Service Revenue", 8500000},
		}

		for _, e := range revenueEntries {
			if e.debitCOA == "" || e.creditCOA == "" {
				continue
			}
			createJournal(tx, e.date, e.desc, nil, nil, adminID,
				[]journalLineInput{
					{e.debitCOA, e.amount, 0, "Revenue collection"},
					{e.creditCOA, 0, e.amount, "Sales revenue"},
				})
		}

		for _, e := range serviceEntries {
			if arCOA == "" || serviceCOA == "" {
				continue
			}
			createJournal(tx, e.date, e.desc, nil, nil, adminID,
				[]journalLineInput{
					{arCOA, e.amount, 0, "Service fee receivable"},
					{serviceCOA, 0, e.amount, "Service revenue"},
				})
		}

		// ─────────────────── EXPENSE JOURNALS (2025-2026) ───────────────────

		type monthlyExpense struct {
			date   time.Time
			desc   string
			coaID  string
			amount float64
		}

		var expenses []monthlyExpense

		// Monthly salary 2025 (Jan-Dec)
		for m := 1; m <= 12; m++ {
			expenses = append(expenses, monthlyExpense{
				date:   time.Date(2025, time.Month(m), 25, 0, 0, 0, 0, time.UTC),
				desc:   fmt.Sprintf("Salary Expense %s 2025", time.Month(m)),
				coaID:  salaryCOA,
				amount: 35000000,
			})
		}
		// Jan-Feb 2026 salary
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 1, 25, 0, 0, 0, 0, time.UTC), desc: "Salary Expense Jan 2026", coaID: salaryCOA, amount: 37000000,
		})
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 2, 25, 0, 0, 0, 0, time.UTC), desc: "Salary Expense Feb 2026", coaID: salaryCOA, amount: 37000000,
		})

		// Quarterly rent 2025
		for q := 0; q < 4; q++ {
			expenses = append(expenses, monthlyExpense{
				date:   time.Date(2025, time.Month(q*3+1), 5, 0, 0, 0, 0, time.UTC),
				desc:   fmt.Sprintf("Rent Expense Q%d 2025", q+1),
				coaID:  rentCOA,
				amount: 15000000,
			})
		}
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC), desc: "Rent Expense Q1 2026", coaID: rentCOA, amount: 16000000,
		})

		// Monthly utility 2025
		for m := 1; m <= 12; m++ {
			expenses = append(expenses, monthlyExpense{
				date:   time.Date(2025, time.Month(m), 10, 0, 0, 0, 0, time.UTC),
				desc:   fmt.Sprintf("Utility Expense %s 2025", time.Month(m)),
				coaID:  utilityCOA,
				amount: float64(2800000 + m*100000),
			})
		}
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC), desc: "Utility Expense Jan 2026", coaID: utilityCOA, amount: 4200000,
		})
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 2, 10, 0, 0, 0, 0, time.UTC), desc: "Utility Expense Feb 2026", coaID: utilityCOA, amount: 3900000,
		})

		// Marketing expenses (quarterly)
		for q := 0; q < 4; q++ {
			expenses = append(expenses, monthlyExpense{
				date:   time.Date(2025, time.Month(q*3+2), 15, 0, 0, 0, 0, time.UTC),
				desc:   fmt.Sprintf("Marketing Campaign Q%d 2025", q+1),
				coaID:  marketingCOA,
				amount: float64(8000000 + q*2000000),
			})
		}
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC), desc: "Marketing Campaign Q1 2026", coaID: marketingCOA, amount: 12000000,
		})

		// COGS (tied to sales)
		cogsMonths := []struct {
			m   int
			amt float64
		}{
			{1, 22000000}, {2, 28000000}, {3, 26000000}, {4, 31000000},
			{5, 35000000}, {6, 33000000}, {7, 37000000}, {8, 34000000},
			{9, 39000000}, {10, 42000000}, {11, 38000000}, {12, 48000000},
		}
		for _, c := range cogsMonths {
			expenses = append(expenses, monthlyExpense{
				date:   time.Date(2025, time.Month(c.m), 28, 0, 0, 0, 0, time.UTC),
				desc:   fmt.Sprintf("Cost of Goods Sold %s 2025", time.Month(c.m)),
				coaID:  cogsCOA,
				amount: c.amt,
			})
		}
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 1, 28, 0, 0, 0, 0, time.UTC), desc: "COGS Jan 2026", coaID: cogsCOA, amount: 43000000,
		})
		expenses = append(expenses, monthlyExpense{
			date: time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC), desc: "COGS Feb 2026", coaID: cogsCOA, amount: 39000000,
		})

		for _, e := range expenses {
			if e.coaID == "" || bankCOA == "" {
				continue
			}
			createJournal(tx, e.date, e.desc, nil, nil, adminID,
				[]journalLineInput{
					{e.coaID, e.amount, 0, e.desc},
					{bankCOA, 0, e.amount, "Cash/Bank outflow"},
				})
		}

		// ─────────────────── EQUITY JOURNALS ───────────────────
		if capitalCOA != "" && bankBcaCOA != "" {
			createJournal(tx, time.Date(2025, 1, 2, 0, 0, 0, 0, time.UTC),
				"Initial Capital Investment", nil, nil, adminID,
				[]journalLineInput{
					{bankBcaCOA, 500000000, 0, "Cash investment"},
					{capitalCOA, 0, 500000000, "Paid-in capital"},
				})
		}

		if retainedCOA != "" && bankBcaCOA != "" {
			createJournal(tx, time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC),
				"Year-end Retained Earnings 2025", nil, nil, adminID,
				[]journalLineInput{
					{bankBcaCOA, 50000000, 0, "Retained earnings allocation"},
					{retainedCOA, 0, 50000000, "Retained earnings"},
				})
		}

		// ─────────────────── CUSTOMER PAYMENT COLLECTIONS ───────────────────
		if arCOA != "" && bankCOA != "" {
			collections := []struct {
				date   time.Time
				desc   string
				amount float64
			}{
				{time.Date(2025, 2, 5, 0, 0, 0, 0, time.UTC), "Customer Payment Jan-25 batch", 30000000},
				{time.Date(2025, 4, 10, 0, 0, 0, 0, time.UTC), "Customer Payment Q1-25 clearance", 45000000},
				{time.Date(2025, 7, 8, 0, 0, 0, 0, time.UTC), "Customer Payment Q2-25 clearance", 52000000},
				{time.Date(2025, 10, 12, 0, 0, 0, 0, time.UTC), "Customer Payment Q3-25 clearance", 61000000},
				{time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC), "Customer Payment Q4-25 clearance", 68000000},
				{time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC), "Customer Payment Jan-26 batch", 55000000},
			}
			for _, c := range collections {
				createJournal(tx, c.date, c.desc, nil, nil, adminID,
					[]journalLineInput{
						{bankCOA, c.amount, 0, "Bank deposit"},
						{arCOA, 0, c.amount, "AR clearance"},
					})
			}
		}

		log.Println("E2E Purchase-Finance data seeded successfully (2025-2026)")
		return nil
	})
}

// ─────────────────── Helpers ───────────────────

type purchaseFlowInput struct {
	year, month                             int
	tag                                     string
	qty, price                              float64
	taxRate                                 float64
	poStatus                                string // "DRAFT", "SUBMITTED", "APPROVED" — defaults to APPROVED if empty
	payStatus                               string // "PAID", "PARTIAL", "UNPAID"
	payRatio                                float64
	product                                 productModels.Product
	supplier                                supplierModels.Supplier
	pt                                      coreModels.PaymentTerms
	bu                                      orgModels.BusinessUnit
	warehouse                               warehouseModels.Warehouse
	bankAccount                             coreModels.BankAccount
	adminID                                 string
	withDP                                  bool
	dpAmount                                float64
	invCOA, grirCOA, apCOA, vatCOA, bankCOA string
}

func seedPurchaseFlow(tx *gorm.DB, in purchaseFlowInput) error {
	orderDate := time.Date(in.year, time.Month(in.month), 5, 0, 0, 0, 0, time.UTC)
	receiptDate := time.Date(in.year, time.Month(in.month), 12, 0, 0, 0, 0, time.UTC)
	invoiceDate := time.Date(in.year, time.Month(in.month), 15, 0, 0, 0, 0, time.UTC)
	payDate := time.Date(in.year, time.Month(in.month), 22, 0, 0, 0, 0, time.UTC)

	prefix := fmt.Sprintf("%d-%s", in.year, in.tag)
	subtotal := in.qty * in.price
	tax := subtotal * (in.taxRate / 100)
	total := subtotal + tax

	// 1. Purchase Order
	po := purchaseModels.PurchaseOrder{
		Code:                 fmt.Sprintf("PO-E2E-%s", prefix),
		SupplierID:           &in.supplier.ID,
		SupplierCodeSnapshot: in.supplier.Code,
		SupplierNameSnapshot: in.supplier.Name,
		PaymentTermsID:       nilIfEmpty(in.pt.ID),
		BusinessUnitID:       nilIfEmpty(in.bu.ID),
		CreatedBy:            in.adminID,
		OrderDate:            orderDate.Format("2006-01-02"),
		Status: func() purchaseModels.PurchaseOrderStatus {
			switch in.poStatus {
			case "DRAFT":
				return purchaseModels.PurchaseOrderStatusDraft
			case "SUBMITTED":
				return purchaseModels.PurchaseOrderStatusSubmitted
			default:
				return purchaseModels.PurchaseOrderStatusApproved
			}
		}(),
		TaxRate:     in.taxRate,
		TaxAmount:   tax,
		SubTotal:    subtotal,
		TotalAmount: total,
		Notes:       fmt.Sprintf("E2E PO for %s %d", time.Month(in.month), in.year),
		Items: []purchaseModels.PurchaseOrderItem{
			{
				ProductID: in.product.ID,
				Quantity:  in.qty,
				Price:     in.price,
				Subtotal:  subtotal,
			},
		},
	}
	if err := tx.Create(&po).Error; err != nil {
		return fmt.Errorf("create PO %s: %w", po.Code, err)
	}

	// Skip GR / SI / payment creation for early-stage POs (DRAFT or SUBMITTED).
	if in.poStatus == "DRAFT" || in.poStatus == "SUBMITTED" {
		return nil
	}

	// 2. Goods Receipt
	gr := purchaseModels.GoodsReceipt{
		Code:            fmt.Sprintf("GR-E2E-%s", prefix),
		PurchaseOrderID: po.ID,
		SupplierID:      in.supplier.ID,
		ReceiptDate:     &receiptDate,
		Status:          purchaseModels.GoodsReceiptStatusClosed, // CLOSED — required for SI creation
		CreatedBy:       in.adminID,
		ClosedAt:        &receiptDate,
		Items: []purchaseModels.GoodsReceiptItem{
			{
				PurchaseOrderItemID: po.Items[0].ID,
				ProductID:           in.product.ID,
				QuantityReceived:    in.qty,
			},
		},
	}
	if err := tx.Create(&gr).Error; err != nil {
		return fmt.Errorf("create GR %s: %w", gr.Code, err)
	}

	// 2a. Stock: Inventory batch + movement
	batch := inventoryModels.InventoryBatch{
		ProductID:       in.product.ID,
		WarehouseID:     in.warehouse.ID,
		BatchNumber:     fmt.Sprintf("BCH-E2E-%s", prefix),
		InitialQuantity: in.qty,
		CurrentQuantity: in.qty,
		CostPrice:       in.price,
		IsActive:        true,
	}
	tx.Create(&batch)

	move := inventoryModels.StockMovement{
		ProductID:   in.product.ID,
		WarehouseID: in.warehouse.ID,
		RefType:     "GoodsReceipt",
		RefID:       gr.ID,
		RefNumber:   gr.Code,
		QtyIn:       in.qty,
		Cost:        in.price,
		Date:        receiptDate,
		CreatedAt:   receiptDate,
	}
	tx.Create(&move)

	// 2b. Journal: Dr Inventory / Cr GR-IR
	if in.invCOA != "" && in.grirCOA != "" {
		createJournal(tx, receiptDate, fmt.Sprintf("GR Accrual %s", gr.Code),
			stringPtr("GOODS_RECEIPT"), stringPtr(gr.ID), in.adminID,
			[]journalLineInput{
				{in.invCOA, subtotal, 0, "Inventory stock in"},
				{in.grirCOA, 0, subtotal, "GR/IR clearing"},
			})
	} else {
		log.Printf("Warning: Failed to create GR Journal for %s due to missing COAs", gr.Code)
	}

	// 3. Supplier Invoice Down Payment (if applicable)
	var dpID *string
	var dpAmt float64
	if in.withDP && in.dpAmount > 0 {
		dp := purchaseModels.SupplierInvoice{
			Type:            purchaseModels.SupplierInvoiceTypeDownPayment,
			PurchaseOrderID: po.ID,
			SupplierID:      in.supplier.ID,
			PaymentTermsID:  &in.pt.ID,
			Code:            fmt.Sprintf("SIDP-E2E-%s", prefix),
			InvoiceNumber:   fmt.Sprintf("DP-INV-%s", prefix),
			InvoiceDate:     orderDate.AddDate(0, 0, 2).Format("2006-01-02"),
			DueDate:         orderDate.AddDate(0, 0, 7).Format("2006-01-02"),
			Amount:          in.dpAmount,
			SubTotal:        in.dpAmount,
			PaidAmount:      in.dpAmount,
			RemainingAmount: 0,
			Status:          purchaseModels.SupplierInvoiceStatusPaid,
			CreatedBy:       in.adminID,
		}
		now := time.Now()
		dp.PaymentAt = &now
		if err := tx.Create(&dp).Error; err != nil {
			log.Printf("Warning: Failed to create DP %s: %v", dp.Code, err)
		} else {
			dpID = &dp.ID
			dpAmt = dp.Amount

			// Create DP payment record
			dpRefNum := fmt.Sprintf("PAY-DP-E2E-%s", prefix)
			// Alternate DP payment status so the seeder shows both PENDING and CONFIRMED records.
			dpPayStatus := purchaseModels.PurchasePaymentStatusPending
			if len(prefix)%2 == 0 {
				dpPayStatus = purchaseModels.PurchasePaymentStatusConfirmed
			}
			dpPayment := purchaseModels.PurchasePayment{
				SupplierInvoiceID: dp.ID,
				BankAccountID:     in.bankAccount.ID,
				PaymentDate:       orderDate.AddDate(0, 0, 5).Format("2006-01-02"),
				Amount:            in.dpAmount,
				Method:            purchaseModels.PurchasePaymentMethodBank,
				Status:            dpPayStatus,
				ReferenceNumber:   &dpRefNum,
				CreatedBy:         in.adminID,
			}
			if err := tx.Create(&dpPayment).Error; err != nil {
				log.Printf("Warning: Failed to create DP payment: %v", err)
			}
		}
	}

	// 4. Supplier Invoice (Normal)
	// Calculate cash payment amount
	var cashPayAmount float64
	switch in.payStatus {
	case "PAID":
		cashPayAmount = total - dpAmt // Pay the remaining after DP
	case "PARTIAL":
		cashPayAmount = (total - dpAmt) * in.payRatio // Partial of remaining
	default:
		cashPayAmount = 0
	}

	totalSettled := dpAmt + cashPayAmount
	remainingAmount := total - totalSettled

	// Determine actual status based on total settled
	var siStatus purchaseModels.SupplierInvoiceStatus
	if remainingAmount <= 0.01 && total > 0 {
		siStatus = purchaseModels.SupplierInvoiceStatusPaid
	} else if totalSettled > 0 {
		siStatus = purchaseModels.SupplierInvoiceStatusPartial
	} else {
		siStatus = purchaseModels.SupplierInvoiceStatusUnpaid
	}

	si := purchaseModels.SupplierInvoice{
		Type:                 purchaseModels.SupplierInvoiceTypeNormal,
		PurchaseOrderID:      po.ID,
		GoodsReceiptID:       &gr.ID, // NEW: SI sourced from GR
		SupplierID:           in.supplier.ID,
		PaymentTermsID:       &in.pt.ID,
		Code:                 fmt.Sprintf("SI-E2E-%s", prefix),
		InvoiceNumber:        fmt.Sprintf("INV-E2E-%s", prefix),
		InvoiceDate:          invoiceDate.Format("2006-01-02"),
		DueDate:              invoiceDate.AddDate(0, 0, 30).Format("2006-01-02"),
		TaxRate:              in.taxRate,
		TaxAmount:            tax,
		SubTotal:             subtotal,
		Amount:               total,
		DownPaymentAmount:    dpAmt,
		PaidAmount:           cashPayAmount,
		RemainingAmount:      remainingAmount,
		DownPaymentInvoiceID: dpID,
		Status:               siStatus,
		CreatedBy:            in.adminID,
		Items: []purchaseModels.SupplierInvoiceItem{
			{
				PurchaseOrderItemID: &po.Items[0].ID,
				ProductID:           in.product.ID,
				Quantity:            in.qty,
				Price:               in.price,
				SubTotal:            subtotal,
			},
		},
	}

	if siStatus == purchaseModels.SupplierInvoiceStatusPaid {
		now := time.Now()
		si.PaymentAt = &now
	}

	if err := tx.Create(&si).Error; err != nil {
		return fmt.Errorf("create SI %s: %w", si.Code, err)
	}

	// 4a-pre. Update GR with ConvertedToSupplierInvoiceID link
	now := time.Now()
	if err := tx.Model(&purchaseModels.GoodsReceipt{}).Where("id = ?", gr.ID).Updates(map[string]interface{}{
		"converted_to_supplier_invoice_id": si.ID,
		"converted_at":                     now,
	}).Error; err != nil {
		log.Printf("Warning: Failed to update GR %s with SI link: %v", gr.Code, err)
	}

	// 4a. Journal: Dr GR/IR + Dr VAT / Cr AP
	if in.apCOA != "" && in.grirCOA != "" && in.vatCOA != "" {
		createJournal(tx, invoiceDate, fmt.Sprintf("AP Invoice %s", si.Code),
			stringPtr("SUPPLIER_INVOICE"), stringPtr(si.ID), in.adminID,
			[]journalLineInput{
				{in.grirCOA, subtotal, 0, "Clear GR/IR"},
				{in.vatCOA, tax, 0, "VAT Input"},
				{in.apCOA, 0, total, "Accounts Payable"},
			})
	} else {
		log.Printf("Warning: Failed to create AP Journal for %s due to missing COAs", si.Code)
	}

	// 5. Purchase Payment (if there is cash payment)
	if cashPayAmount > 0 {
		refNum := fmt.Sprintf("PAY-E2E-%s", prefix)
		// Alternate between PENDING and CONFIRMED for seeder diversity
		payStatus := purchaseModels.PurchasePaymentStatusConfirmed
		if len(prefix)%2 != 0 {
			payStatus = purchaseModels.PurchasePaymentStatusPending
		}
		pp := purchaseModels.PurchasePayment{
			SupplierInvoiceID: si.ID,
			BankAccountID:     in.bankAccount.ID,
			PaymentDate:       payDate.Format("2006-01-02"),
			Amount:            cashPayAmount,
			Method:            purchaseModels.PurchasePaymentMethodBank,
			Status:            payStatus,
			ReferenceNumber:   &refNum,
			CreatedBy:         in.adminID,
		}
		if err := tx.Create(&pp).Error; err != nil {
			return fmt.Errorf("create payment %s: %w", refNum, err)
		}

		// 5a. Journal: Dr AP / Cr Bank
		if in.apCOA != "" && in.bankCOA != "" {
			createJournal(tx, payDate, fmt.Sprintf("Payment %s", si.Code),
				stringPtr("PURCHASE_PAYMENT"), stringPtr(pp.ID), in.adminID,
				[]journalLineInput{
					{in.apCOA, cashPayAmount, 0, "Debit AP"},
					{in.bankCOA, 0, cashPayAmount, "Credit Cash/Bank"},
				})
		}
	}

	return nil
}

func seedMinimalPurchaseFlow(tx *gorm.DB, in purchaseFlowInput) error {
	orderDate := time.Now().AddDate(0, 0, -10)
	receiptDate := orderDate.AddDate(0, 0, 5)
	invoiceDate := receiptDate.AddDate(0, 0, 3)
	payDate := invoiceDate.AddDate(0, 0, 5)

	prefix := in.tag

	// 1. Purchase Order
	po := purchaseModels.PurchaseOrder{
		Code:                 fmt.Sprintf("PO-%s", prefix),
		SupplierID:           nilIfEmpty(in.supplier.ID),
		SupplierCodeSnapshot: in.supplier.Code,
		SupplierNameSnapshot: in.supplier.Name,
		PaymentTermsID:       nilIfEmpty(in.pt.ID),
		BusinessUnitID:       nilIfEmpty(in.bu.ID),
		CreatedBy:            in.adminID,
		OrderDate:            orderDate.Format("2006-01-02"),
		Status:               purchaseModels.PurchaseOrderStatusApproved,
		TaxRate:              11.0,
		TaxAmount:            0,
		SubTotal:             in.qty * in.price,
		TotalAmount:          in.qty * in.price,
		Notes:                "Minimal purchase flow",
		Items: []purchaseModels.PurchaseOrderItem{{
			ProductID: in.product.ID,
			Quantity:  in.qty,
			Price:     in.price,
			Subtotal:  in.qty * in.price,
		}},
	}
	if err := tx.Create(&po).Error; err != nil {
		return fmt.Errorf("create PO %s: %w", po.Code, err)
	}

	// 2. Goods Receipt
	gr := purchaseModels.GoodsReceipt{
		Code:            fmt.Sprintf("GR-%s", prefix),
		PurchaseOrderID: po.ID,
		SupplierID:      in.supplier.ID,
		ReceiptDate:     &receiptDate,
		Status:          purchaseModels.GoodsReceiptStatusClosed,
		CreatedBy:       in.adminID,
		ClosedAt:        &receiptDate,
		Items: []purchaseModels.GoodsReceiptItem{{
			PurchaseOrderItemID: po.Items[0].ID,
			ProductID:           in.product.ID,
			QuantityReceived:    in.qty,
		}},
	}
	if err := tx.Create(&gr).Error; err != nil {
		return fmt.Errorf("create GR %s: %w", gr.Code, err)
	}

	// Stock movement (minimal)
	_ = tx.Create(&inventoryModels.StockMovement{
		ProductID:   in.product.ID,
		WarehouseID: in.warehouse.ID,
		RefType:     "GoodsReceipt",
		RefID:       gr.ID,
		RefNumber:   gr.Code,
		QtyIn:       in.qty,
		Cost:        in.price,
		Date:        receiptDate,
		CreatedAt:   receiptDate,
	})

	// 3. Supplier Invoice
	total := in.qty * in.price
	si := purchaseModels.SupplierInvoice{
		Type:            purchaseModels.SupplierInvoiceTypeNormal,
		PurchaseOrderID: po.ID,
		GoodsReceiptID:  &gr.ID,
		SupplierID:      in.supplier.ID,
		PaymentTermsID:  &in.pt.ID,
		Code:            fmt.Sprintf("SI-%s", prefix),
		InvoiceNumber:   fmt.Sprintf("INV-%s", prefix),
		InvoiceDate:     invoiceDate.Format("2006-01-02"),
		DueDate:         invoiceDate.AddDate(0, 0, 30).Format("2006-01-02"),
		TaxRate:         11.0,
		TaxAmount:       total * 0.11,
		SubTotal:        total,
		Amount:          total,
		PaidAmount:      total,
		RemainingAmount: 0,
		Status:          purchaseModels.SupplierInvoiceStatusPaid,
		CreatedBy:       in.adminID,
		Items: []purchaseModels.SupplierInvoiceItem{{
			PurchaseOrderItemID: &po.Items[0].ID,
			ProductID:           in.product.ID,
			Quantity:            in.qty,
			Price:               in.price,
			SubTotal:            total,
		}},
	}
	if err := tx.Create(&si).Error; err != nil {
		return fmt.Errorf("create SI %s: %w", si.Code, err)
	}

	// 4. Purchase Payment
	pp := purchaseModels.PurchasePayment{
		SupplierInvoiceID: si.ID,
		BankAccountID:     in.bankAccount.ID,
		PaymentDate:       payDate.Format("2006-01-02"),
		Amount:            total,
		Method:            purchaseModels.PurchasePaymentMethodBank,
		Status:            purchaseModels.PurchasePaymentStatusConfirmed,
		ReferenceNumber:   stringPtr(fmt.Sprintf("PAY-%s", prefix)),
		CreatedBy:         in.adminID,
	}
	if err := tx.Create(&pp).Error; err != nil {
		return fmt.Errorf("create payment %s: %w", *pp.ReferenceNumber, err)
	}

	// Journals
	if in.invCOA != "" && in.grirCOA != "" {
		createJournal(tx, receiptDate, fmt.Sprintf("GR Accrual %s", gr.Code), stringPtr("GOODS_RECEIPT"), stringPtr(gr.ID), in.adminID, []journalLineInput{
			{in.invCOA, total, 0, "Inventory"},
			{in.grirCOA, 0, total, "GR/IR"},
		})
	} else {
		log.Printf("Warning: Failed to create GR Journal for %s due to missing COAs", gr.Code)
	}
	if in.apCOA != "" && in.grirCOA != "" && in.vatCOA != "" {
		createJournal(tx, invoiceDate, fmt.Sprintf("AP Invoice %s", si.Code), stringPtr("SUPPLIER_INVOICE"), stringPtr(si.ID), in.adminID, []journalLineInput{
			{in.grirCOA, total, 0, "Clear GR/IR"},
			{in.vatCOA, total * 0.11, 0, "VAT Input"},
			{in.apCOA, 0, total + total*0.11, "Accounts Payable"},
		})
	} else {
		log.Printf("Warning: Failed to create AP Journal for %s due to missing COAs", si.Code)
	}
	if in.apCOA != "" && in.bankCOA != "" {
		refCode := ""
		if pp.ReferenceNumber != nil {
			refCode = *pp.ReferenceNumber
		}
		createJournal(tx, payDate, fmt.Sprintf("Payment %s", refCode), stringPtr("PURCHASE_PAYMENT"), stringPtr(pp.ID), in.adminID, []journalLineInput{
			{in.apCOA, total + total*0.11, 0, "Debit AP"},
			{in.bankCOA, 0, total + total*0.11, "Credit Bank"},
		})
	}

	return nil
}

type journalLineInput struct {
	coaID  string
	debit  float64
	credit float64
	memo   string
}

func createJournal(tx *gorm.DB, date time.Time, desc string, refType, refID *string, adminID string, lines []journalLineInput) {
	refTypeValue := ""
	if refType != nil {
		refTypeValue = *refType
	}
	refIDValue := ""
	if refID != nil {
		refIDValue = *refID
	}
	log.Printf("Triggering journal entry creation for %v (%v)", refTypeValue, refIDValue)

	coaRepo := financeRepositories.NewChartOfAccountRepository(tx)
	journalRepo := financeRepositories.NewJournalEntryRepository(tx)
	coaMapper := financeMapper.NewChartOfAccountMapper()
	journalMapper := financeMapper.NewJournalEntryMapper(coaMapper)
	auditSvc := audit.NewAuditService(tx)
	journalUC := financeUsecase.NewJournalEntryUsecase(tx, coaRepo, journalRepo, journalMapper, auditSvc)

	reqLines := make([]financeDto.JournalLineRequest, 0, len(lines))
	for _, l := range lines {
		if l.coaID == "" {
			log.Printf("ERROR: Skipped journal %v - missing COA %s", *refType, l.memo)
			return
		}
		if l.debit == 0 && l.credit == 0 {
			continue // skip zero lines
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
		ReferenceType:     refType,
		ReferenceID:       refID,
		Lines:             reqLines,
		IsSystemGenerated: true,
	}

	_, err := journalUC.PostOrUpdateJournal(txCtx, req)
	if err != nil {
		log.Printf("ERROR: Failed to create journal entry via usecase for %v (%v): %v", refTypeValue, refIDValue, err)
	} else {
		log.Printf("SUCCESS: Created journal entry via usecase for %v (%v)", refTypeValue, refIDValue)
	}
}
