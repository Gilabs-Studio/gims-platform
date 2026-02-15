package main

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/logger"
)

type backfillStep struct {
	name string
	sql  string
}

func main() {
	logger.Init()

	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	steps := []backfillStep{
		{
			name: "purchase_orders.supplier snapshots",
			sql: `
UPDATE purchase_orders po
SET supplier_code_snapshot = s.code,
    supplier_name_snapshot = s.name
FROM suppliers s
WHERE po.supplier_id = s.id
  AND (po.supplier_code_snapshot IS NULL OR btrim(po.supplier_code_snapshot) = ''
    OR po.supplier_name_snapshot IS NULL OR btrim(po.supplier_name_snapshot) = '');
`,
		},
		{
			name: "purchase_orders.payment_terms snapshot",
			sql: `
UPDATE purchase_orders po
SET payment_terms_name_snapshot = pt.name
FROM payment_terms pt
WHERE po.payment_terms_id = pt.id
  AND (po.payment_terms_name_snapshot IS NULL OR btrim(po.payment_terms_name_snapshot) = '');
`,
		},
		{
			name: "purchase_orders.business_unit snapshot",
			sql: `
UPDATE purchase_orders po
SET business_unit_name_snapshot = bu.name
FROM business_units bu
WHERE po.business_unit_id = bu.id
  AND (po.business_unit_name_snapshot IS NULL OR btrim(po.business_unit_name_snapshot) = '');
`,
		},
		{
			name: "purchase_order_items.product snapshots",
			sql: `
UPDATE purchase_order_items poi
SET product_code_snapshot = p.code,
    product_name_snapshot = p.name
FROM products p
WHERE poi.product_id = p.id
  AND (poi.product_code_snapshot IS NULL OR btrim(poi.product_code_snapshot) = ''
    OR poi.product_name_snapshot IS NULL OR btrim(poi.product_name_snapshot) = '');
`,
		},
		{
			name: "goods_receipts.supplier snapshots",
			sql: `
UPDATE goods_receipts gr
SET supplier_code_snapshot = s.code,
    supplier_name_snapshot = s.name
FROM suppliers s
WHERE gr.supplier_id = s.id
  AND (gr.supplier_code_snapshot IS NULL OR btrim(gr.supplier_code_snapshot) = ''
    OR gr.supplier_name_snapshot IS NULL OR btrim(gr.supplier_name_snapshot) = '');
`,
		},
		{
			name: "goods_receipt_items.product snapshots",
			sql: `
UPDATE goods_receipt_items gri
SET product_code_snapshot = p.code,
    product_name_snapshot = p.name
FROM products p
WHERE gri.product_id = p.id
  AND (gri.product_code_snapshot IS NULL OR btrim(gri.product_code_snapshot) = ''
    OR gri.product_name_snapshot IS NULL OR btrim(gri.product_name_snapshot) = '');
`,
		},
		{
			name: "supplier_invoices.supplier snapshots",
			sql: `
UPDATE supplier_invoices si
SET supplier_code_snapshot = s.code,
    supplier_name_snapshot = s.name
FROM suppliers s
WHERE si.supplier_id = s.id
  AND (si.supplier_code_snapshot IS NULL OR btrim(si.supplier_code_snapshot) = ''
    OR si.supplier_name_snapshot IS NULL OR btrim(si.supplier_name_snapshot) = '');
`,
		},
		{
			name: "supplier_invoices.payment_terms snapshot",
			sql: `
UPDATE supplier_invoices si
SET payment_terms_name_snapshot = pt.name
FROM payment_terms pt
WHERE si.payment_terms_id = pt.id
  AND (si.payment_terms_name_snapshot IS NULL OR btrim(si.payment_terms_name_snapshot) = '');
`,
		},
		{
			name: "supplier_invoice_items.product snapshots",
			sql: `
UPDATE supplier_invoice_items sii
SET product_code_snapshot = p.code,
    product_name_snapshot = p.name
FROM products p
WHERE sii.product_id = p.id
  AND (sii.product_code_snapshot IS NULL OR btrim(sii.product_code_snapshot) = ''
    OR sii.product_name_snapshot IS NULL OR btrim(sii.product_name_snapshot) = '');
`,
		},
		{
			name: "purchase_payments.bank_account snapshots",
			sql: `
UPDATE purchase_payments pp
SET bank_account_name_snapshot = ba.name,
    bank_account_number_snapshot = ba.account_number,
    bank_account_holder_snapshot = ba.account_holder,
    bank_account_currency_snapshot = ba.currency
FROM bank_accounts ba
WHERE pp.bank_account_id = ba.id
  AND (pp.bank_account_name_snapshot IS NULL OR btrim(pp.bank_account_name_snapshot) = ''
    OR pp.bank_account_number_snapshot IS NULL OR btrim(pp.bank_account_number_snapshot) = ''
    OR pp.bank_account_holder_snapshot IS NULL OR btrim(pp.bank_account_holder_snapshot) = ''
    OR pp.bank_account_currency_snapshot IS NULL OR btrim(pp.bank_account_currency_snapshot) = '');
`,
		},
		{
			name: "journal_lines.coa snapshots",
			sql: `
UPDATE journal_lines jl
SET chart_of_account_code_snapshot = coa.code,
    chart_of_account_name_snapshot = coa.name,
    chart_of_account_type_snapshot = coa.type
FROM chart_of_accounts coa
WHERE jl.chart_of_account_id = coa.id
  AND (jl.chart_of_account_code_snapshot IS NULL OR btrim(jl.chart_of_account_code_snapshot) = ''
    OR jl.chart_of_account_name_snapshot IS NULL OR btrim(jl.chart_of_account_name_snapshot) = ''
    OR jl.chart_of_account_type_snapshot IS NULL OR btrim(jl.chart_of_account_type_snapshot) = '');
`,
		},
	}

	for _, step := range steps {
		res := database.DB.Exec(step.sql)
		if res.Error != nil {
			log.Fatalf("Backfill failed (%s): %v", step.name, res.Error)
		}
		log.Printf("Backfill OK (%s): rows_affected=%d", step.name, res.RowsAffected)
	}

	log.Println("Backfill snapshots completed")
}
