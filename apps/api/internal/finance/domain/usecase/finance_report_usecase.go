package usecase

import (
	"context"
	"fmt"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/xuri/excelize/v2"
)

type FinanceReportUsecase interface {
	GetGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.GeneralLedgerResponse, error)
	GetBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.BalanceSheetResponse, error)
	GetProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.ProfitAndLossResponse, error)
	ExportGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error)
	ExportBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error)
	ExportProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error)
}

type financeReportUsecase struct {
	coaRepo    repositories.ChartOfAccountRepository
	reportRepo repositories.FinanceReportRepository
}

func NewFinanceReportUsecase(coaRepo repositories.ChartOfAccountRepository, reportRepo repositories.FinanceReportRepository) FinanceReportUsecase {
	return &financeReportUsecase{coaRepo: coaRepo, reportRepo: reportRepo}
}

func (uc *financeReportUsecase) GetGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.GeneralLedgerResponse, error) {
	balances, err := uc.reportRepo.GetAccountBalances(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	coaMap := make(map[string]financeModels.ChartOfAccount)
	for _, c := range allCoas {
		coaMap[c.ID] = c
	}

	accounts := make([]dto.GeneralLedgerAccount, 0, len(balances))
	for _, b := range balances {
		// Only include accounts with posted activity or non-zero opening balance.
		if b.OpeningBalance == 0 && b.DebitTotal == 0 && b.CreditTotal == 0 {
			continue
		}

		coa := coaMap[b.ChartOfAccountID]

		lines, err := uc.reportRepo.GetGLAccountTransactions(ctx, b.ChartOfAccountID, startDate, endDate, companyID)
		if err != nil {
			return nil, err
		}

		transactions := make([]dto.GLTransactionRow, 0, len(lines))
		runningBalance := b.OpeningBalance
		for _, l := range lines {
			change := 0.0
			switch coa.Type {
			case financeModels.AccountTypeAsset, financeModels.AccountTypeCashBank, financeModels.AccountTypeCurrentAsset, financeModels.AccountTypeFixedAsset,
				financeModels.AccountTypeExpense, financeModels.AccountTypeCOGS, financeModels.AccountTypeSalaryWages, financeModels.AccountTypeOperational:
				change = l.Debit - l.Credit
			default:
				change = l.Credit - l.Debit
			}
			runningBalance += change

			refCode := ""
			if l.JournalEntry != nil && l.JournalEntry.ReferenceType != nil && l.JournalEntry.ReferenceID != nil {
				refCode = *l.JournalEntry.ReferenceType + "/" + *l.JournalEntry.ReferenceID
			}

			entryDate := time.Time{}
			description := ""
			var refType *string
			var refID *string
			journalID := l.JournalEntryID
			if l.JournalEntry != nil {
				entryDate = l.JournalEntry.EntryDate
				description = l.JournalEntry.Description
				refType = l.JournalEntry.ReferenceType
				refID = l.JournalEntry.ReferenceID
			}

			transactions = append(transactions, dto.GLTransactionRow{
				ID:             l.ID,
				JournalID:      journalID,
				EntryDate:      entryDate,
				Description:    description,
				Memo:           l.Memo,
				ReferenceType:  refType,
				ReferenceID:    refID,
				ReferenceCode:  refCode,
				Debit:          l.Debit,
				Credit:         l.Credit,
				RunningBalance: runningBalance,
			})
		}

		accounts = append(accounts, dto.GeneralLedgerAccount{
			AccountID:      b.ChartOfAccountID,
			AccountCode:    coa.Code,
			AccountName:    coa.Name,
			AccountType:    string(coa.Type),
			OpeningBalance: b.OpeningBalance,
			TotalDebit:     b.DebitTotal,
			TotalCredit:    b.CreditTotal,
			ClosingBalance: b.ClosingBalance,
			Transactions:   transactions,
		})
	}

	return &dto.GeneralLedgerResponse{
		StartDate: startDate,
		EndDate:   endDate,
		Accounts:  accounts,
	}, nil
}

func (uc *financeReportUsecase) GetBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.BalanceSheetResponse, error) {
	// For Balance Sheet, we get changes from start to end date.
	// But usually users want to see balance as of end date.
	// By using startDate, we can see the movement (Opening vs Closing), but currently GetAccountBalances just returns Opening, Debit, Credit, Closing.
	// Since Balance Sheet is a snapshot, we will display closing balance as of endDate.
	// However, GetAccountBalances returns accurate ClosingBalance using startDate (the Opening is calculated prior to startDate).
	balances, err := uc.reportRepo.GetAccountBalances(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	coaMap := make(map[string]financeModels.ChartOfAccount)
	for _, c := range allCoas {
		coaMap[c.ID] = c
	}

	res := &dto.BalanceSheetResponse{
		StartDate: startDate,
		EndDate:   endDate,
	}

	for _, b := range balances {
		coa := coaMap[b.ChartOfAccountID]
		if b.ClosingBalance == 0 {
			continue
		}

		row := dto.ReportRow{
			Code:   coa.Code,
			Name:   coa.Name,
			Amount: b.ClosingBalance,
		}

		switch coa.Type {
		case financeModels.AccountTypeAsset, financeModels.AccountTypeCashBank, financeModels.AccountTypeCurrentAsset, financeModels.AccountTypeFixedAsset:
			res.Assets = append(res.Assets, row)
			res.AssetTotal += row.Amount
		case financeModels.AccountTypeLiability, financeModels.AccountTypeTradePayable:
			res.Liabilities = append(res.Liabilities, row)
			res.LiabilityTotal += row.Amount
		case financeModels.AccountTypeEquity:
			res.Equities = append(res.Equities, row)
			res.EquityTotal += row.Amount
		}
	}

	// Note: In real life, Profit/Loss from current year should be added to Equity.
	// But let's keep it simple as requested for now.
	res.LiabilityEquity = res.LiabilityTotal + res.EquityTotal

	return res, nil
}

func (uc *financeReportUsecase) GetProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID *string) (*dto.ProfitAndLossResponse, error) {
	balances, err := uc.reportRepo.GetAccountBalances(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	coaMap := make(map[string]financeModels.ChartOfAccount)
	for _, c := range allCoas {
		coaMap[c.ID] = c
	}

	res := &dto.ProfitAndLossResponse{
		StartDate: startDate,
		EndDate:   endDate,
	}

	for _, b := range balances {
		coa := coaMap[b.ChartOfAccountID]
		// For PL, we care about movement (Closing - Opening) or just Closing if we assumed Opening was 0 for Income Statement accounts.
		// Actually, GetAccountBalances returns ClosingBalance which is (Op + Change).
		// For Income accounts, we usually only care about the change in the period.

		movement := 0.0
		if coa.Type == financeModels.AccountTypeRevenue {
			movement = b.CreditTotal - b.DebitTotal
		} else if coa.Type == financeModels.AccountTypeExpense || coa.Type == financeModels.AccountTypeCOGS ||
			coa.Type == financeModels.AccountTypeSalaryWages || coa.Type == financeModels.AccountTypeOperational {
			movement = b.DebitTotal - b.CreditTotal
		} else {
			continue // skip BS accounts
		}

		if movement == 0 {
			continue
		}

		row := dto.ReportRow{
			Code:   coa.Code,
			Name:   coa.Name,
			Amount: movement,
		}

		if coa.Type == financeModels.AccountTypeRevenue {
			res.Revenues = append(res.Revenues, row)
			res.RevenueTotal += row.Amount
		} else {
			res.Expenses = append(res.Expenses, row)
			res.ExpenseTotal += row.Amount
		}
	}

	res.NetProfit = res.RevenueTotal - res.ExpenseTotal

	return res, nil
}

func (uc *financeReportUsecase) ExportGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error) {
	data, err := uc.GetGeneralLedger(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "General Ledger"
	f.SetSheetName("Sheet1", sheet)

	f.SetCellValue(sheet, "A1", "General Ledger")
	f.SetCellValue(sheet, "A2", "Period:")
	f.SetCellValue(sheet, "B2", startDate.Format("2006-01-02")+" - "+endDate.Format("2006-01-02"))

	rowNum := 4
	for _, acc := range data.Accounts {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowNum), "Account:")
		f.SetCellValue(sheet, fmt.Sprintf("B%d", rowNum), acc.AccountCode+" - "+acc.AccountName)
		rowNum++

		headers := []string{"Date", "Description", "Ref Type", "Ref ID", "Debit", "Credit", "Balance"}
		for i, h := range headers {
			col, _ := excelize.ColumnNumberToName(i + 1)
			f.SetCellValue(sheet, col+fmt.Sprintf("%d", rowNum), h)
		}
		rowNum++

		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Opening Balance")
		f.SetCellValue(sheet, "G"+fmt.Sprintf("%d", rowNum), acc.OpeningBalance)
		rowNum++

		for _, txn := range acc.Transactions {
			f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), txn.EntryDate.Format("2006-01-02"))
			f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), txn.Description)
			refType := ""
			if txn.ReferenceType != nil {
				refType = *txn.ReferenceType
			}
			f.SetCellValue(sheet, "C"+fmt.Sprintf("%d", rowNum), refType)
			refID := ""
			if txn.ReferenceID != nil {
				refID = *txn.ReferenceID
			}
			f.SetCellValue(sheet, "D"+fmt.Sprintf("%d", rowNum), refID)
			f.SetCellValue(sheet, "E"+fmt.Sprintf("%d", rowNum), txn.Debit)
			f.SetCellValue(sheet, "F"+fmt.Sprintf("%d", rowNum), txn.Credit)
			f.SetCellValue(sheet, "G"+fmt.Sprintf("%d", rowNum), txn.RunningBalance)
			rowNum++
		}
		rowNum++ // Space between accounts
	}

	buf, _ := f.WriteToBuffer()
	return buf.Bytes(), nil
}

func (uc *financeReportUsecase) ExportBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error) {
	data, err := uc.GetBalanceSheet(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Balance Sheet"
	f.SetSheetName("Sheet1", sheet)

	f.SetCellValue(sheet, "A1", "Balance Sheet")
	f.SetCellValue(sheet, "A2", "Period:")
	f.SetCellValue(sheet, "B2", startDate.Format("2006-01-02")+" to "+endDate.Format("2006-01-02"))

	rowNum := 4
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "ASSETS")
	rowNum++
	for _, a := range data.Assets {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), a.Code+" - "+a.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), a.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Assets")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.AssetTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "LIABILITIES")
	rowNum++
	for _, l := range data.Liabilities {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), l.Code+" - "+l.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), l.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Liabilities")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.LiabilityTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "EQUITIES")
	rowNum++
	for _, e := range data.Equities {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), e.Code+" - "+e.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), e.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Equities")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.EquityTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Liabilities & Equities")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.LiabilityEquity)

	buf, _ := f.WriteToBuffer()
	return buf.Bytes(), nil
}

func (uc *financeReportUsecase) ExportProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]byte, error) {
	data, err := uc.GetProfitAndLoss(ctx, startDate, endDate, companyID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Profit and Loss"
	f.SetSheetName("Sheet1", sheet)

	f.SetCellValue(sheet, "A1", "Profit and Loss")
	f.SetCellValue(sheet, "A2", "Period:")
	f.SetCellValue(sheet, "B2", startDate.Format("2006-01-02")+" - "+endDate.Format("2006-01-02"))

	rowNum := 4
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "REVENUES")
	rowNum++
	for _, r := range data.Revenues {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), r.Code+" - "+r.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), r.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Revenues")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.RevenueTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "EXPENSES")
	rowNum++
	for _, e := range data.Expenses {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), e.Code+" - "+e.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), e.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Expenses")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.ExpenseTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "NET PROFIT")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.NetProfit)

	buf, _ := f.WriteToBuffer()
	return buf.Bytes(), nil
}
