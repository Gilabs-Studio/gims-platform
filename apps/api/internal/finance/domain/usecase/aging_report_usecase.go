package usecase

import (
	"context"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type AgingReportUsecase interface {
	ARAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.ARAgingReportResponse, int64, error)
	APAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.APAgingReportResponse, int64, error)
	ARAgingFinance(ctx context.Context, query dto.AgingFinanceQuery) (*dto.ARAgingReportResponse, error)
	APAgingFinance(ctx context.Context, query dto.AgingFinanceQuery) (*dto.APAgingReportResponse, error)
}

type agingReportUsecase struct {
	repo repositories.AgingReportRepository
}

func NewAgingReportUsecase(repo repositories.AgingReportRepository) AgingReportUsecase {
	return &agingReportUsecase{repo: repo}
}

func daysPastDue(asOf time.Time, due time.Time) int {
	asOfDate := time.Date(asOf.Year(), asOf.Month(), asOf.Day(), 0, 0, 0, 0, time.UTC)
	dueDate := time.Date(due.Year(), due.Month(), due.Day(), 0, 0, 0, 0, time.UTC)
	d := int(asOfDate.Sub(dueDate).Hours() / 24)
	return d
}

func bucketize(amount float64, dpd int) dto.AgingBuckets {
	if amount <= 0 {
		return dto.AgingBuckets{}
	}
	if dpd <= 0 {
		return dto.AgingBuckets{Current: amount}
	}
	if dpd <= 30 {
		return dto.AgingBuckets{Days1To30: amount}
	}
	if dpd <= 60 {
		return dto.AgingBuckets{Days31To60: amount}
	}
	if dpd <= 90 {
		return dto.AgingBuckets{Days61To90: amount}
	}
	return dto.AgingBuckets{Over90: amount}
}

func addBuckets(a dto.AgingBuckets, b dto.AgingBuckets) dto.AgingBuckets {
	return dto.AgingBuckets{
		Current:    a.Current + b.Current,
		Days1To30:  a.Days1To30 + b.Days1To30,
		Days31To60: a.Days31To60 + b.Days31To60,
		Days61To90: a.Days61To90 + b.Days61To90,
		Over90:     a.Over90 + b.Over90,
	}
}

func bucketsOverdueTotal(b dto.AgingBuckets) float64 {
	return b.Days1To30 + b.Days31To60 + b.Days61To90 + b.Over90
}

type arGroupAccumulator struct {
	customerID       string
	customerName     string
	invoices         []dto.ARAgingInvoiceRow
	buckets          dto.AgingBuckets
	totalOutstanding float64
}

type apGroupAccumulator struct {
	supplierID       string
	supplierName     string
	invoices         []dto.APAgingInvoiceRow
	buckets          dto.AgingBuckets
	totalOutstanding float64
}

func (uc *agingReportUsecase) ARAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.ARAgingReportResponse, int64, error) {
	// Normalize asOf to end of day
	asOf = time.Date(asOf.Year(), asOf.Month(), asOf.Day(), 23, 59, 59, 999999999, asOf.Location())
	
	if uc.repo == nil {
		return nil, 0, errors.New("repository is not configured")
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	rows, total, err := uc.repo.ListARAging(ctx, repositories.AgingListParams{
		Search:   strings.TrimSpace(search),
		AsOfDate: asOf,
		Limit:    perPage,
		Offset:   (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	respRows := make([]dto.ARAgingInvoiceRow, 0, len(rows))
	totals := dto.AgingTotals{}
	for _, r := range rows {
		if r.RemainingAmount <= 0 || math.IsNaN(r.RemainingAmount) {
			continue
		}
		dpd := daysPastDue(asOf, r.DueDate)
		b := bucketize(r.RemainingAmount, dpd)
		respRows = append(respRows, dto.ARAgingInvoiceRow{
			InvoiceID:       r.InvoiceID,
			SourceType:      r.SourceType,
			Code:            r.Code,
			InvoiceNumber:   r.InvoiceNumber,
			CustomerID:      r.CustomerID,
			CustomerName:    r.CustomerName,
			InvoiceDate:     r.InvoiceDate,
			DueDate:         r.DueDate,
			DaysPastDue:     dpd,
			Amount:          r.Amount,
			RemainingAmount: r.RemainingAmount,
			Buckets:         b,
		})
		totals.Count++
		totals.Remaining += r.RemainingAmount
		totals.Buckets = addBuckets(totals.Buckets, b)
	}

	return &dto.ARAgingReportResponse{AsOfDate: asOf, Rows: respRows, Totals: totals}, total, nil
}

func (uc *agingReportUsecase) APAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.APAgingReportResponse, int64, error) {
	// Normalize asOf to end of day
	asOf = time.Date(asOf.Year(), asOf.Month(), asOf.Day(), 23, 59, 59, 999999999, asOf.Location())
	
	if uc.repo == nil {
		return nil, 0, errors.New("repository is not configured")
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	rows, total, err := uc.repo.ListAPAging(ctx, repositories.AgingListParams{
		Search:   strings.TrimSpace(search),
		AsOfDate: asOf,
		Limit:    perPage,
		Offset:   (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	respRows := make([]dto.APAgingInvoiceRow, 0, len(rows))
	totals := dto.AgingTotals{}
	for _, r := range rows {
		if r.RemainingAmount <= 0 || math.IsNaN(r.RemainingAmount) {
			continue
		}
		dpd := daysPastDue(asOf, r.DueDate)
		b := bucketize(r.RemainingAmount, dpd)
		respRows = append(respRows, dto.APAgingInvoiceRow{
			InvoiceID:       r.InvoiceID,
			SourceType:      r.SourceType,
			Code:            r.Code,
			InvoiceNumber:   r.InvoiceNumber,
			InvoiceDate:     r.InvoiceDate,
			DueDate:         r.DueDate,
			DaysPastDue:     dpd,
			SupplierID:      r.SupplierID,
			SupplierName:    r.SupplierName,
			Amount:          r.Amount,
			PaidAmount:      r.PaidAmount,
			RemainingAmount: r.RemainingAmount,
			Buckets:         b,
		})
		totals.Count++
		totals.Remaining += r.RemainingAmount
		totals.Buckets = addBuckets(totals.Buckets, b)
	}

	return &dto.APAgingReportResponse{AsOfDate: asOf, Rows: respRows, Totals: totals}, total, nil
}

func (uc *agingReportUsecase) ARAgingFinance(ctx context.Context, query dto.AgingFinanceQuery) (*dto.ARAgingReportResponse, error) {
	asOf := time.Date(query.AsOfDate.Year(), query.AsOfDate.Month(), query.AsOfDate.Day(), 23, 59, 59, 999999999, query.AsOfDate.Location())
	rows, err := uc.repo.ListARAgingFinance(ctx, repositories.AgingFinanceListParams{
		Search:    strings.TrimSpace(query.Search),
		AsOfDate:  asOf,
		PartnerID: strings.TrimSpace(query.PartnerID),
		MinAmount: query.MinAmount,
	})
	if err != nil {
		return nil, err
	}

	respRows := make([]dto.ARAgingInvoiceRow, 0, len(rows))
	totals := dto.AgingTotals{}
	summary := &dto.AgingSummary{}
	groups := make(map[string]*arGroupAccumulator)

	for _, r := range rows {
		if r.RemainingAmount <= 0 || math.IsNaN(r.RemainingAmount) {
			continue
		}
		dpd := daysPastDue(asOf, r.DueDate)
		if !query.IncludeCurrent && dpd <= 0 {
			continue
		}
		buckets := bucketize(r.RemainingAmount, dpd)
		sourceType := strings.TrimSpace(r.SourceType)
		if sourceType == "" {
			sourceType = "CUSTOMER_INVOICE"
		}

		row := dto.ARAgingInvoiceRow{
			InvoiceID:       r.InvoiceID,
			SourceType:      sourceType,
			Code:            r.Code,
			InvoiceNumber:   r.InvoiceNumber,
			CustomerID:      r.CustomerID,
			CustomerName:    r.CustomerName,
			InvoiceDate:     r.InvoiceDate,
			DueDate:         r.DueDate,
			DaysPastDue:     dpd,
			Amount:          r.Amount,
			RemainingAmount: r.RemainingAmount,
			Buckets:         buckets,
		}

		respRows = append(respRows, row)
		totals.Count++
		totals.Remaining += r.RemainingAmount
		totals.Buckets = addBuckets(totals.Buckets, buckets)

		groupKey := strings.TrimSpace(r.CustomerID)
		if groupKey == "" {
			groupKey = "__unknown__:" + strings.TrimSpace(r.CustomerName)
		}
		group := groups[groupKey]
		if group == nil {
			group = &arGroupAccumulator{
				customerID:   strings.TrimSpace(r.CustomerID),
				customerName: strings.TrimSpace(r.CustomerName),
			}
			if group.customerName == "" {
				group.customerName = "Customer"
			}
			groups[groupKey] = group
		}
		group.invoices = append(group.invoices, row)
		group.totalOutstanding += r.RemainingAmount
		group.buckets = addBuckets(group.buckets, buckets)
	}

	customers := make([]dto.ARAgingPartnerGroup, 0, len(groups))
	for _, group := range groups {
		customers = append(customers, dto.ARAgingPartnerGroup{
			CustomerID:       group.customerID,
			CustomerName:     group.customerName,
			InvoiceCount:     len(group.invoices),
			TotalOutstanding: group.totalOutstanding,
			Buckets:          group.buckets,
			Invoices:         group.invoices,
		})
	}
	sort.SliceStable(customers, func(i, j int) bool {
		if customers[i].TotalOutstanding == customers[j].TotalOutstanding {
			return customers[i].CustomerName < customers[j].CustomerName
		}
		return customers[i].TotalOutstanding > customers[j].TotalOutstanding
	})

	summary.InvoiceCount = totals.Count
	summary.PartnerCount = len(customers)
	summary.TotalOutstanding = totals.Remaining
	summary.Buckets = totals.Buckets
	summary.TotalCurrent = totals.Buckets.Current
	summary.TotalOverdue = bucketsOverdueTotal(totals.Buckets)

	return &dto.ARAgingReportResponse{
		AsOfDate:  asOf,
		Rows:      respRows,
		Totals:    totals,
		Summary:   summary,
		Customers: customers,
	}, nil
}

func (uc *agingReportUsecase) APAgingFinance(ctx context.Context, query dto.AgingFinanceQuery) (*dto.APAgingReportResponse, error) {
	asOf := time.Date(query.AsOfDate.Year(), query.AsOfDate.Month(), query.AsOfDate.Day(), 23, 59, 59, 999999999, query.AsOfDate.Location())
	rows, err := uc.repo.ListAPAgingFinance(ctx, repositories.AgingFinanceListParams{
		Search:    strings.TrimSpace(query.Search),
		AsOfDate:  asOf,
		PartnerID: strings.TrimSpace(query.PartnerID),
		MinAmount: query.MinAmount,
	})
	if err != nil {
		return nil, err
	}

	respRows := make([]dto.APAgingInvoiceRow, 0, len(rows))
	totals := dto.AgingTotals{}
	summary := &dto.AgingSummary{}
	groups := make(map[string]*apGroupAccumulator)

	for _, r := range rows {
		if r.RemainingAmount <= 0 || math.IsNaN(r.RemainingAmount) {
			continue
		}
		dpd := daysPastDue(asOf, r.DueDate)
		if !query.IncludeCurrent && dpd <= 0 {
			continue
		}
		buckets := bucketize(r.RemainingAmount, dpd)
		sourceType := strings.TrimSpace(r.SourceType)
		if sourceType == "" {
			sourceType = "SUPPLIER_INVOICE"
		}

		row := dto.APAgingInvoiceRow{
			InvoiceID:       r.InvoiceID,
			SourceType:      sourceType,
			Code:            r.Code,
			InvoiceNumber:   r.InvoiceNumber,
			InvoiceDate:     r.InvoiceDate,
			DueDate:         r.DueDate,
			DaysPastDue:     dpd,
			SupplierID:      r.SupplierID,
			SupplierName:    r.SupplierName,
			Amount:          r.Amount,
			PaidAmount:      r.PaidAmount,
			RemainingAmount: r.RemainingAmount,
			Buckets:         buckets,
		}

		respRows = append(respRows, row)
		totals.Count++
		totals.Remaining += r.RemainingAmount
		totals.Buckets = addBuckets(totals.Buckets, buckets)

		groupKey := strings.TrimSpace(r.SupplierID)
		if groupKey == "" {
			groupKey = "__unknown__:" + strings.TrimSpace(r.SupplierName)
		}
		group := groups[groupKey]
		if group == nil {
			group = &apGroupAccumulator{
				supplierID:   strings.TrimSpace(r.SupplierID),
				supplierName: strings.TrimSpace(r.SupplierName),
			}
			if group.supplierName == "" {
				group.supplierName = "Supplier"
			}
			groups[groupKey] = group
		}
		group.invoices = append(group.invoices, row)
		group.totalOutstanding += r.RemainingAmount
		group.buckets = addBuckets(group.buckets, buckets)
	}

	suppliers := make([]dto.APAgingPartnerGroup, 0, len(groups))
	for _, group := range groups {
		suppliers = append(suppliers, dto.APAgingPartnerGroup{
			SupplierID:       group.supplierID,
			SupplierName:     group.supplierName,
			InvoiceCount:     len(group.invoices),
			TotalOutstanding: group.totalOutstanding,
			Buckets:          group.buckets,
			Invoices:         group.invoices,
		})
	}
	sort.SliceStable(suppliers, func(i, j int) bool {
		if suppliers[i].TotalOutstanding == suppliers[j].TotalOutstanding {
			return suppliers[i].SupplierName < suppliers[j].SupplierName
		}
		return suppliers[i].TotalOutstanding > suppliers[j].TotalOutstanding
	})

	summary.InvoiceCount = totals.Count
	summary.PartnerCount = len(suppliers)
	summary.TotalOutstanding = totals.Remaining
	summary.Buckets = totals.Buckets
	summary.TotalCurrent = totals.Buckets.Current
	summary.TotalOverdue = bucketsOverdueTotal(totals.Buckets)

	return &dto.APAgingReportResponse{
		AsOfDate:   asOf,
		Rows:       respRows,
		Totals:     totals,
		Summary:    summary,
		Suppliers:  suppliers,
	}, nil
}
