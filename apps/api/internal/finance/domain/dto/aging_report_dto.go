package dto

import "time"

type AgingBuckets struct {
	Current    float64 `json:"current"`
	Days1To30  float64 `json:"days_1_30"`
	Days31To60 float64 `json:"days_31_60"`
	Days61To90 float64 `json:"days_61_90"`
	Over90     float64 `json:"over_90"`
}

type ARAgingInvoiceRow struct {
	InvoiceID       string     `json:"invoice_id"`
	Code            string     `json:"code"`
	InvoiceNumber   *string    `json:"invoice_number"`
	InvoiceDate     time.Time  `json:"invoice_date"`
	DueDate         time.Time  `json:"due_date"`
	DaysPastDue     int        `json:"days_past_due"`
	Amount          float64    `json:"amount"`
	RemainingAmount float64    `json:"remaining_amount"`
	Buckets         AgingBuckets `json:"buckets"`
}

type APAgingInvoiceRow struct {
	InvoiceID       string     `json:"invoice_id"`
	Code            string     `json:"code"`
	InvoiceNumber   string     `json:"invoice_number"`
	InvoiceDate     time.Time  `json:"invoice_date"`
	DueDate         time.Time  `json:"due_date"`
	DaysPastDue     int        `json:"days_past_due"`
	SupplierID      string     `json:"supplier_id"`
	SupplierName    string     `json:"supplier_name"`
	Amount          float64    `json:"amount"`
	PaidAmount      float64    `json:"paid_amount"`
	RemainingAmount float64    `json:"remaining_amount"`
	Buckets         AgingBuckets `json:"buckets"`
}

type AgingTotals struct {
	Count     int         `json:"count"`
	Remaining float64     `json:"remaining"`
	Buckets   AgingBuckets `json:"buckets"`
}

type ARAgingReportResponse struct {
	AsOfDate time.Time            `json:"as_of_date"`
	Rows     []ARAgingInvoiceRow  `json:"rows"`
	Totals   AgingTotals          `json:"totals"`
}

type APAgingReportResponse struct {
	AsOfDate time.Time            `json:"as_of_date"`
	Rows     []APAgingInvoiceRow  `json:"rows"`
	Totals   AgingTotals          `json:"totals"`
}
