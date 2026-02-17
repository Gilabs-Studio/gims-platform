package usecase

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type AgingReportUsecase interface {
	ARAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.ARAgingReportResponse, int64, error)
	APAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.APAgingReportResponse, int64, error)
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

func (uc *agingReportUsecase) ARAging(ctx context.Context, asOf time.Time, search string, page, perPage int) (*dto.ARAgingReportResponse, int64, error) {
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
			Code:            r.Code,
			InvoiceNumber:   r.InvoiceNumber,
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
