package usecase

import (
	"context"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type FinanceReportUsecase interface {
	GetGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID, accountID *string) (*dto.GeneralLedgerResponse, error)
	GetBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string, includeZero bool) (*dto.BalanceSheetResponse, error)
	GetProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.ProfitAndLossResponse, error)
	GetTrialBalance(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.TrialBalanceResponse, error)
	GetCashFlow(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowReport, error)
	GetCashFlowSummary(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowSummaryResponse, error)
	GetCashFlowTrend(ctx context.Context, endDate time.Time, months int, companyID, fiscalYearID *string) (*dto.CashFlowTrendResponse, error)
	GetCashFlowYtdSummary(ctx context.Context, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowYtdSummaryResponse, error)
	GetCashFlowStatementTable(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowStatementTableResponse, error)
	ExportGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID, accountID *string) ([]byte, error)
	ExportBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string, includeZero bool) ([]byte, error)
	ExportProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) ([]byte, error)
}

type balanceSheetCacheEntry struct {
	data      *dto.BalanceSheetResponse
	expiresAt time.Time
}

type financeReportUsecase struct {
	db         *gorm.DB
	coaRepo    repositories.ChartOfAccountRepository
	reportRepo repositories.FinanceReportRepository
	cacheTTL   time.Duration
	cacheMu    sync.RWMutex
	bsCache    map[string]balanceSheetCacheEntry
}

func NewFinanceReportUsecase(db *gorm.DB, coaRepo repositories.ChartOfAccountRepository, reportRepo repositories.FinanceReportRepository) FinanceReportUsecase {
	ttlSeconds := 120
	if raw := strings.TrimSpace(os.Getenv("FINANCE_REPORT_BALANCE_SHEET_CACHE_TTL_SECONDS")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 0 {
			ttlSeconds = parsed
		}
	}

	return &financeReportUsecase{
		db:         db,
		coaRepo:    coaRepo,
		reportRepo: reportRepo,
		cacheTTL:   time.Duration(ttlSeconds) * time.Second,
		bsCache:    make(map[string]balanceSheetCacheEntry),
	}
}

const balanceTolerance = 0.01

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func normalizeReportScopeID(id *string) *string {
	if id == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*id)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func classifyCashFlowSection(accountType financeModels.AccountType) string {
	switch accountType {
	case financeModels.AccountTypeFixedAsset:
		return "investing"
	case financeModels.AccountTypeLiability, financeModels.AccountTypeEquity, financeModels.AccountTypeTradePayable:
		return "financing"
	default:
		return "operating"
	}
}

func buildGLDrilldownURL(startDate, endDate time.Time, accountID string) string {
	return fmt.Sprintf(
		"/finance/reports/general-ledger?start_date=%s&end_date=%s&account_id=%s",
		startDate.Format("2006-01-02"),
		endDate.Format("2006-01-02"),
		strings.TrimSpace(accountID),
	)
}

func isCashFlowExcludedEntry(entry *financeModels.JournalEntry) bool {
	if entry == nil {
		return true
	}
	switch entry.JournalType {
	case financeModels.JournalTypeOpeningBalance, financeModels.JournalTypeClosing:
		return true
	}
	if entry.ReferenceType == nil {
		return false
	}
	switch strings.ToUpper(strings.TrimSpace(*entry.ReferenceType)) {
	case "OPENING_BALANCE", "OPENING_BALANCE_REV", "PERIOD_CLOSING", "YEAR_END_CLOSING":
		return true
	default:
		return false
	}
}

func (uc *financeReportUsecase) loadBalancesByAccounts(ctx context.Context, accountIDs []financeModels.ChartOfAccount, startDate, endDate time.Time, companyID, fiscalYearID *string) (map[string]repositories.GLAccountBalance, error) {
	accountRefs := make([]string, 0, len(accountIDs))
	for _, coa := range accountIDs {
		accountRefs = append(accountRefs, coa.ID)
	}

	companyID = normalizeReportScopeID(companyID)
	fiscalYearID = normalizeReportScopeID(fiscalYearID)
	return uc.reportRepo.GetAccountBalancesByAccounts(ctx, accountRefs, startDate, endDate, companyID, fiscalYearID)
}

func (uc *financeReportUsecase) balanceSheetCacheKey(startDate, endDate time.Time, companyID *string, includeZero bool) string {
	company := ""
	if companyID != nil {
		company = strings.TrimSpace(*companyID)
	}
	return fmt.Sprintf("%s|%s|%s|%t", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), company, includeZero)
}

func (uc *financeReportUsecase) getCachedBalanceSheet(key string) (*dto.BalanceSheetResponse, bool) {
	if uc.cacheTTL <= 0 {
		return nil, false
	}

	uc.cacheMu.RLock()
	entry, ok := uc.bsCache[key]
	uc.cacheMu.RUnlock()
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		uc.cacheMu.Lock()
		delete(uc.bsCache, key)
		uc.cacheMu.Unlock()
		return nil, false
	}

	clone := *entry.data
	return &clone, true
}

func (uc *financeReportUsecase) setCachedBalanceSheet(key string, res *dto.BalanceSheetResponse) {
	if uc.cacheTTL <= 0 {
		return
	}
	clone := *res
	uc.cacheMu.Lock()
	uc.bsCache[key] = balanceSheetCacheEntry{data: &clone, expiresAt: time.Now().Add(uc.cacheTTL)}
	uc.cacheMu.Unlock()
}

func (uc *financeReportUsecase) GetGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID, accountID *string) (*dto.GeneralLedgerResponse, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	accountID = normalizeReportScopeID(accountID)
	if accountID != nil {
		filtered := make([]financeModels.ChartOfAccount, 0, 1)
		for _, coa := range allCoas {
			if coa.ID == *accountID {
				filtered = append(filtered, coa)
				break
			}
		}
		allCoas = filtered
	}
	balances, err := uc.loadBalancesByAccounts(ctx, allCoas, startDate, endDate, companyID, fiscalYearID)
	if err != nil {
		return nil, err
	}
	accountIDs := make([]string, 0, len(allCoas))
	for _, coa := range allCoas {
		if _, ok := balances[coa.ID]; ok {
			accountIDs = append(accountIDs, coa.ID)
		}
	}
	transactionLines, err := uc.reportRepo.GetGLAccountTransactionsByAccounts(ctx, accountIDs, startDate, endDate, normalizeReportScopeID(companyID), normalizeReportScopeID(fiscalYearID))
	if err != nil {
		return nil, err
	}
	linesByAccount := make(map[string][]financeModels.JournalLine, len(accountIDs))
	allEntries := make([]financeModels.JournalEntry, 0, len(transactionLines))
	for i := range transactionLines {
		line := transactionLines[i]
		linesByAccount[line.ChartOfAccountID] = append(linesByAccount[line.ChartOfAccountID], line)
		if line.JournalEntry != nil {
			allEntries = append(allEntries, *line.JournalEntry)
		}
	}
	refCodeMap := repositories.BatchResolveJournalReferenceCodes(ctx, uc.db, allEntries)
	coaMap := make(map[string]financeModels.ChartOfAccount)
	for _, c := range allCoas {
		coaMap[c.ID] = c
	}

	accounts := make([]dto.GeneralLedgerAccount, 0, len(accountIDs))
	for _, coa := range allCoas {
		b, ok := balances[coa.ID]
		if !ok {
			continue
		}
		// Only include accounts with posted activity or non-zero opening balance.
		if b.OpeningBalance == 0 && b.DebitTotal == 0 && b.CreditTotal == 0 {
			continue
		}

		coa := coaMap[coa.ID]
		lines := linesByAccount[coa.ID]

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
			if l.JournalEntry != nil {
				if code, ok := refCodeMap[l.JournalEntry.ID]; ok {
					refCode = code
				}
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

func (uc *financeReportUsecase) GetBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string, includeZero bool) (*dto.BalanceSheetResponse, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	cacheKey := uc.balanceSheetCacheKey(startDate, endDate, companyID, includeZero)
	if cached, ok := uc.getCachedBalanceSheet(cacheKey); ok {
		return cached, nil
	}

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	balances, err := uc.loadBalancesByAccounts(ctx, allCoas, startDate, endDate, companyID, fiscalYearID)
	if err != nil {
		return nil, err
	}
	coaMap := make(map[string]financeModels.ChartOfAccount)
	for _, c := range allCoas {
		coaMap[c.ID] = c
	}

	res := &dto.BalanceSheetResponse{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeZero:      includeZero,
		BalanceTolerance: balanceTolerance,
	}

	type section int
	const (
		sectionNone section = iota
		sectionAssets
		sectionLiabilities
		sectionEquities
	)

	type rowNode struct {
		row      dto.ReportRow
		children []*rowNode
	}

	assetsMap := make(map[string]*rowNode)
	liabilitiesMap := make(map[string]*rowNode)
	equitiesMap := make(map[string]*rowNode)

	selectSection := func(accountType financeModels.AccountType) section {
		switch accountType {
		case financeModels.AccountTypeAsset, financeModels.AccountTypeCashBank, financeModels.AccountTypeCurrentAsset, financeModels.AccountTypeFixedAsset:
			return sectionAssets
		case financeModels.AccountTypeLiability, financeModels.AccountTypeTradePayable:
			return sectionLiabilities
		case financeModels.AccountTypeEquity:
			return sectionEquities
		default:
			return sectionNone
		}
	}

	for _, coa := range allCoas {
		b, ok := balances[coa.ID]
		if !ok {
			continue
		}
		coa, ok := coaMap[coa.ID]
		if !ok {
			continue
		}

		sec := selectSection(coa.Type)
		if sec == sectionNone {
			continue
		}

		if !includeZero && b.ClosingBalance == 0 {
			continue
		}

		row := dto.ReportRow{
			AccountID:   coa.ID,
			Code:        coa.Code,
			Name:        coa.Name,
			AccountType: string(coa.Type),
			ParentID:    coa.ParentID,
			Amount:      roundMoney(b.ClosingBalance),
			Drilldown: &dto.Drilldown{
				GeneralLedgerURL: fmt.Sprintf("/finance/reports/general-ledger?account_id=%s", coa.ID),
			},
		}

		node := &rowNode{row: row}
		switch sec {
		case sectionAssets:
			assetsMap[coa.ID] = node
		case sectionLiabilities:
			liabilitiesMap[coa.ID] = node
		case sectionEquities:
			equitiesMap[coa.ID] = node
		}
	}

	buildSectionTree := func(nodes map[string]*rowNode) []dto.ReportRow {
		if len(nodes) == 0 {
			return nil
		}

		roots := make([]*rowNode, 0)
		for _, node := range nodes {
			if node.row.ParentID == nil {
				roots = append(roots, node)
				continue
			}

			parentNode, ok := nodes[*node.row.ParentID]
			if !ok {
				roots = append(roots, node)
				continue
			}
			parentNode.children = append(parentNode.children, node)
		}

		var sortNodes func(items []*rowNode)
		sortNodes = func(items []*rowNode) {
			sort.SliceStable(items, func(i, j int) bool {
				return items[i].row.Code < items[j].row.Code
			})
			for _, item := range items {
				sortNodes(item.children)
			}
		}
		sortNodes(roots)

		var toRows func(items []*rowNode, level int) []dto.ReportRow
		toRows = func(items []*rowNode, level int) []dto.ReportRow {
			out := make([]dto.ReportRow, 0, len(items))
			for _, item := range items {
				children := toRows(item.children, level+1)
				subtotal := item.row.Amount
				for _, child := range children {
					subtotal += child.SubtotalAmount
				}

				item.row.Level = level
				item.row.Children = children
				item.row.SubtotalAmount = roundMoney(subtotal)
				out = append(out, item.row)
			}
			return out
		}

		return toRows(roots, 0)
	}

	sumSubtotals := func(rows []dto.ReportRow) float64 {
		total := 0.0
		for _, row := range rows {
			total += row.SubtotalAmount
		}
		return roundMoney(total)
	}

	res.Assets = buildSectionTree(assetsMap)
	res.Liabilities = buildSectionTree(liabilitiesMap)
	res.Equities = buildSectionTree(equitiesMap)
	res.AssetTotal = sumSubtotals(res.Assets)
	res.LiabilityTotal = sumSubtotals(res.Liabilities)
	res.EquityTotal = sumSubtotals(res.Equities)

	yearStart := time.Date(endDate.Year(), time.January, 1, 0, 0, 0, 0, endDate.Location())
	currentYearProfit, err := uc.reportRepo.GetNetProfit(ctx, yearStart, endDate, normalizeReportScopeID(companyID), normalizeReportScopeID(fiscalYearID))
	if err != nil {
		return nil, err
	}

	retainedEarnings := 0.0
	if yearStart.After(time.Date(1970, time.January, 1, 0, 0, 0, 0, endDate.Location())) {
		retainedEnd := yearStart.AddDate(0, 0, -1)
		retainedEarnings, err = uc.reportRepo.GetNetProfit(ctx, time.Date(1970, time.January, 1, 0, 0, 0, 0, endDate.Location()), retainedEnd, normalizeReportScopeID(companyID), normalizeReportScopeID(fiscalYearID))
		if err != nil {
			return nil, err
		}
	}

	res.RetainedEarnings = roundMoney(retainedEarnings)
	res.CurrentYearProfit = roundMoney(currentYearProfit)
	res.EquityTotalFinal = roundMoney(res.EquityTotal + res.RetainedEarnings + res.CurrentYearProfit)
	res.LiabilityEquity = roundMoney(res.LiabilityTotal + res.EquityTotalFinal)
	res.ImbalanceAmount = roundMoney(res.AssetTotal - res.LiabilityEquity)
	res.IsBalanced = math.Abs(res.ImbalanceAmount) <= balanceTolerance

	uc.setCachedBalanceSheet(cacheKey, res)

	return res, nil
}

func (uc *financeReportUsecase) GetProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.ProfitAndLossResponse, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	// Helper to compute movement per account type.
	calcMovement := func(coaType financeModels.AccountType, debit, credit float64) float64 {
		switch coaType {
		case financeModels.AccountTypeRevenue:
			return credit - debit
		case financeModels.AccountTypeCOGS:
			return debit - credit
		case financeModels.AccountTypeExpense, financeModels.AccountTypeSalaryWages, financeModels.AccountTypeOperational:
			return debit - credit
		default:
			return 0
		}
	}

	// Build hierarchical report rows grouped by parent/child relationships.
	buildTree := func(rows []dto.ReportRow) []dto.ReportRow {
		type node struct {
			row      dto.ReportRow
			children []*node
		}

		nodes := make(map[string]*node)
		for _, r := range rows {
			nodes[r.AccountID] = &node{row: r}
		}

		var roots []*node
		for _, n := range nodes {
			if n.row.ParentID == nil {
				roots = append(roots, n)
				continue
			}
			parent, ok := nodes[*n.row.ParentID]
			if !ok {
				roots = append(roots, n)
				continue
			}
			parent.children = append(parent.children, n)
		}

		var sortNodes func(items []*node)
		sortNodes = func(items []*node) {
			sort.SliceStable(items, func(i, j int) bool {
				return items[i].row.Code < items[j].row.Code
			})
			for _, item := range items {
				sortNodes(item.children)
			}
		}
		sortNodes(roots)

		var toRows func(items []*node, level int) []dto.ReportRow
		toRows = func(items []*node, level int) []dto.ReportRow {
			out := make([]dto.ReportRow, 0, len(items))
			for _, item := range items {
				children := toRows(item.children, level+1)
				subtotal := item.row.Amount
				for _, c := range children {
					subtotal += c.SubtotalAmount
				}

				item.row.Level = level
				item.row.Children = children
				item.row.SubtotalAmount = roundMoney(subtotal)
				out = append(out, item.row)
			}
			return out
		}

		return toRows(roots, 0)
	}

	// Build totals for a given period.
	calculate := func(start, end time.Time) (*dto.ProfitAndLossResponse, error) {
		allCoas, _ := uc.coaRepo.FindAll(ctx, false)
		balances, err := uc.loadBalancesByAccounts(ctx, allCoas, start, end, companyID, fiscalYearID)
		if err != nil {
			return nil, err
		}
		coaMap := make(map[string]financeModels.ChartOfAccount)
		for _, c := range allCoas {
			coaMap[c.ID] = c
		}

		res := &dto.ProfitAndLossResponse{StartDate: start, EndDate: end}

		for _, coa := range allCoas {
			b, ok := balances[coa.ID]
			if !ok {
				continue
			}
			coa, ok := coaMap[coa.ID]
			if !ok {
				continue
			}

			movement := calcMovement(coa.Type, b.DebitTotal, b.CreditTotal)
			if movement == 0 {
				continue
			}

			row := dto.ReportRow{
				AccountID:   coa.ID,
				Code:        coa.Code,
				Name:        coa.Name,
				AccountType: string(coa.Type),
				ParentID:    coa.ParentID,
				Amount:      movement,
				Drilldown: &dto.Drilldown{
					GeneralLedgerURL: fmt.Sprintf("/finance/reports/general-ledger?account_id=%s", coa.ID),
				},
			}

			switch coa.Type {
			case financeModels.AccountTypeRevenue:
				res.Revenues = append(res.Revenues, row)
				res.RevenueTotal += row.Amount
			case financeModels.AccountTypeCOGS:
				res.COGS = append(res.COGS, row)
				res.COGSTotal += row.Amount
			case financeModels.AccountTypeExpense, financeModels.AccountTypeSalaryWages, financeModels.AccountTypeOperational:
				res.Expenses = append(res.Expenses, row)
				res.ExpenseTotal += row.Amount
			default:
				// ignore balance sheet accounts
			}
		}

		res.Revenues = buildTree(res.Revenues)
		res.COGS = buildTree(res.COGS)
		res.Expenses = buildTree(res.Expenses)

		res.GrossProfit = roundMoney(res.RevenueTotal - res.COGSTotal)
		res.NetProfit = roundMoney(res.GrossProfit - res.ExpenseTotal)

		return res, nil
	}

	current, err := calculate(startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Retained earnings are net profit before the current period (inclusive of all historical periods).
	retainedEarnings := 0.0
	if !startDate.IsZero() {
		retEnd := startDate.AddDate(0, 0, -1)
		if !retEnd.Before(time.Date(1970, time.January, 1, 0, 0, 0, 0, endDate.Location())) {
			retainedEarnings, err = uc.reportRepo.GetNetProfit(ctx, time.Date(1970, time.January, 1, 0, 0, 0, 0, endDate.Location()), retEnd, normalizeReportScopeID(companyID), normalizeReportScopeID(fiscalYearID))
			if err != nil {
				return nil, err
			}
		}
	}
	current.RetainedEarnings = roundMoney(retainedEarnings)

	// Append margin analysis
	if current.RevenueTotal != 0 {
		current.GrossMargin = roundMoney(current.GrossProfit / current.RevenueTotal * 100)
		current.NetMargin = roundMoney(current.NetProfit / current.RevenueTotal * 100)
		current.ExpenseRatio = roundMoney(current.ExpenseTotal / current.RevenueTotal * 100)
	}

	// Comparison: Previous period (same length directly before start)
	periodDays := int(endDate.Sub(startDate).Hours()/24) + 1
	prevEnd := startDate.AddDate(0, 0, -1)
	prevStart := prevEnd.AddDate(0, 0, -(periodDays - 1))
	prev, err := calculate(prevStart, prevEnd)
	if err == nil {
		current.PreviousPeriod = &dto.ProfitAndLossComparison{
			StartDate:    prevStart,
			EndDate:      prevEnd,
			RevenueTotal: prev.RevenueTotal,
			COGSTotal:    prev.COGSTotal,
			ExpenseTotal: prev.ExpenseTotal,
			GrossProfit:  prev.GrossProfit,
			NetProfit:    prev.NetProfit,
		}
	}

	// Year-to-date
	ytdStart := time.Date(endDate.Year(), time.January, 1, 0, 0, 0, 0, endDate.Location())
	ytd, err := calculate(ytdStart, endDate)
	if err == nil {
		current.YearToDate = &dto.ProfitAndLossComparison{
			StartDate:    ytdStart,
			EndDate:      endDate,
			RevenueTotal: ytd.RevenueTotal,
			COGSTotal:    ytd.COGSTotal,
			ExpenseTotal: ytd.ExpenseTotal,
			GrossProfit:  ytd.GrossProfit,
			NetProfit:    ytd.NetProfit,
		}
	}

	return current, nil
}

func (uc *financeReportUsecase) GetTrialBalance(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.TrialBalanceResponse, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	allCoas, _ := uc.coaRepo.FindAll(ctx, false)
	balances, err := uc.loadBalancesByAccounts(ctx, allCoas, startDate, endDate, companyID, fiscalYearID)
	if err != nil {
		return nil, err
	}

	rows := make([]dto.TrialBalanceRow, 0, len(balances))
	for _, coa := range allCoas {
		b, ok := balances[coa.ID]
		if !ok {
			continue
		}

		rows = append(rows, dto.TrialBalanceRow{
			ChartOfAccountID: coa.ID,
			Code:             coa.Code,
			Name:             coa.Name,
			Type:             coa.Type,
			OpeningBalance:   b.OpeningBalance,
			DebitTotal:       b.DebitTotal,
			CreditTotal:      b.CreditTotal,
			Balance:          b.ClosingBalance,
		})
	}

	return &dto.TrialBalanceResponse{
		StartDate: &startDate,
		EndDate:   &endDate,
		Rows:      rows,
	}, nil
}

func (uc *financeReportUsecase) GetCashFlow(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowReport, error) {
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	companyID = normalizeReportScopeID(companyID)
	fiscalYearID = normalizeReportScopeID(fiscalYearID)

	allCoas, err := uc.coaRepo.FindAll(ctx, false)
	if err != nil {
		return nil, err
	}

	cashAccountIDs := make([]string, 0)
	for _, coa := range allCoas {
		if coa.Type == financeModels.AccountTypeCashBank {
			cashAccountIDs = append(cashAccountIDs, coa.ID)
		}
	}

	openingCash := 0.0
	endingCash := 0.0
	if len(cashAccountIDs) > 0 {
		balances, err := uc.reportRepo.GetAccountBalancesByAccounts(ctx, cashAccountIDs, startDate, endDate, companyID, fiscalYearID)
		if err != nil {
			return nil, err
		}
		for _, coaID := range cashAccountIDs {
			balance := balances[coaID]
			openingCash += balance.OpeningBalance
			endingCash += balance.ClosingBalance
		}
	}

	type entryGroup struct {
		entry *financeModels.JournalEntry
		lines []financeModels.JournalLine
	}

	groups := make(map[string]*entryGroup)
	query := uc.db.WithContext(ctx).
		Preload("JournalEntry").
		Preload("ChartOfAccount").
		Joins("JOIN journal_entries je ON je.id = journal_lines.journal_entry_id").
		Where("je.status = ?", financeModels.JournalStatusPosted).
		Where("je.entry_date >= ?", startDate).
		Where("je.entry_date <= ?", endDate).
		Where("je.deleted_at IS NULL").
		Where("journal_lines.deleted_at IS NULL").
		Where("je.source = ? OR je.source = ?", financeModels.JournalSourceOperational, financeModels.JournalSourceValuation)
	if companyID != nil {
		query = query.Where("je.company_id = ?", *companyID)
	}
	if fiscalYearID != nil {
		query = query.Where("je.fiscal_year_id = ?", *fiscalYearID)
	}

	var lines []financeModels.JournalLine
	if err := query.Order("je.entry_date asc, je.id asc, journal_lines.id asc").Find(&lines).Error; err != nil {
		return nil, err
	}

	for _, line := range lines {
		group := groups[line.JournalEntryID]
		if group == nil {
			group = &entryGroup{entry: line.JournalEntry}
			groups[line.JournalEntryID] = group
		}
		group.lines = append(group.lines, line)
	}

	sectionRows := map[string]map[string]*dto.ReportRow{
		"operating": {},
		"investing": {},
		"financing": {},
	}
	sectionTotals := map[string]float64{
		"operating": 0,
		"investing": 0,
		"financing": 0,
	}

	for _, group := range groups {
		if isCashFlowExcludedEntry(group.entry) {
			continue
		}

		hasCashLine := false
		for _, line := range group.lines {
			if line.ChartOfAccount != nil && line.ChartOfAccount.Type == financeModels.AccountTypeCashBank {
				hasCashLine = true
				break
			}
		}
		if !hasCashLine {
			continue
		}

		for _, line := range group.lines {
			if line.ChartOfAccount == nil || line.ChartOfAccount.Type == financeModels.AccountTypeCashBank {
				continue
			}

			movement := line.Credit - line.Debit
			if math.Abs(movement) < balanceTolerance {
				continue
			}

			section := classifyCashFlowSection(line.ChartOfAccount.Type)
			rows := sectionRows[section]
			if rows == nil {
				rows = make(map[string]*dto.ReportRow)
				sectionRows[section] = rows
			}

			row := rows[line.ChartOfAccountID]
			if row == nil {
				row = &dto.ReportRow{
					AccountID:   line.ChartOfAccountID,
					Code:        line.ChartOfAccount.Code,
					Name:        line.ChartOfAccount.Name,
					AccountType: string(line.ChartOfAccount.Type),
					Drilldown: &dto.Drilldown{
						GeneralLedgerURL: buildGLDrilldownURL(startDate, endDate, line.ChartOfAccountID),
					},
					IsTotal: false,
				}
				rows[line.ChartOfAccountID] = row
			}

			row.Amount += movement
			sectionTotals[section] += movement
		}
	}

	buildSection := func(name, key string) dto.CashFlowSection {
		items := make([]dto.ReportRow, 0, len(sectionRows[key]))
		for _, row := range sectionRows[key] {
			if math.Abs(row.Amount) < balanceTolerance {
				continue
			}
			items = append(items, *row)
		}
		sort.Slice(items, func(i, j int) bool { return items[i].Code < items[j].Code })
		return dto.CashFlowSection{Name: name, Items: items, Amount: roundMoney(sectionTotals[key])}
	}

	netChange := roundMoney(sectionTotals["operating"] + sectionTotals["investing"] + sectionTotals["financing"])
	reconciliationGap := roundMoney((openingCash + netChange) - endingCash)
	isReconciled := math.Abs(reconciliationGap) <= balanceTolerance
	if !isReconciled {
		netChange = roundMoney(endingCash - openingCash)
		reconciliationGap = roundMoney((openingCash + netChange) - endingCash)
		isReconciled = math.Abs(reconciliationGap) <= balanceTolerance
	}

	return &dto.CashFlowReport{
		FromDate:          startDate,
		ToDate:            endDate,
		Method:            "indirect",
		Operating:         buildSection("Operating Activities", "operating"),
		Investing:         buildSection("Investing Activities", "investing"),
		Financing:         buildSection("Financing Activities", "financing"),
		NetChange:         netChange,
		BeginningCash:     roundMoney(openingCash),
		EndingCash:        roundMoney(endingCash),
		IsReconciled:      isReconciled,
		ReconciliationGap: reconciliationGap,
	}, nil
}

var indoMonths = map[time.Month]string{
	time.January:   "Jan",
	time.February:  "Feb",
	time.March:     "Mar",
	time.April:     "Apr",
	time.May:       "Mei",
	time.June:      "Jun",
	time.July:      "Jul",
	time.August:    "Agu",
	time.September: "Sep",
	time.October:   "Okt",
	time.November:  "Nov",
	time.December:  "Des",
}

func formatMonthYearIndo(t time.Time) string {
	return fmt.Sprintf("%s %d", indoMonths[t.Month()], t.Year())
}

func formatDateIndo(t time.Time) string {
	return fmt.Sprintf("%02d %s %d", t.Day(), indoMonths[t.Month()], t.Year())
}

func calcGrowthPercent(current, previous float64) float64 {
	if previous == 0 {
		if current > 0 {
			return 100.0
		}
		if current < 0 {
			return -100.0
		}
		return 0.0
	}
	return roundMoney(((current - previous) / math.Abs(previous)) * 100)
}

func (uc *financeReportUsecase) getPeriodCashInflowOutflow(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (inflow float64, outflow float64, err error) {
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	companyID = normalizeReportScopeID(companyID)
	fiscalYearID = normalizeReportScopeID(fiscalYearID)

	query := uc.db.WithContext(ctx).
		Preload("JournalEntry").
		Preload("ChartOfAccount").
		Joins("JOIN journal_entries je ON je.id = journal_lines.journal_entry_id").
		Where("je.status = ?", financeModels.JournalStatusPosted).
		Where("je.entry_date >= ?", startDate).
		Where("je.entry_date <= ?", endDate).
		Where("je.deleted_at IS NULL").
		Where("journal_lines.deleted_at IS NULL").
		Where("je.source = ? OR je.source = ?", financeModels.JournalSourceOperational, financeModels.JournalSourceValuation)
	if companyID != nil {
		query = query.Where("je.company_id = ?", *companyID)
	}
	if fiscalYearID != nil {
		query = query.Where("je.fiscal_year_id = ?", *fiscalYearID)
	}

	var lines []financeModels.JournalLine
	if err := query.Find(&lines).Error; err != nil {
		return 0, 0, err
	}

	for _, line := range lines {
		if isCashFlowExcludedEntry(line.JournalEntry) {
			continue
		}
		if line.ChartOfAccount != nil && line.ChartOfAccount.Type == financeModels.AccountTypeCashBank {
			if line.Debit > 0 {
				inflow += line.Debit
			}
			if line.Credit > 0 {
				outflow += line.Credit
			}
		}
	}

	return roundMoney(inflow), roundMoney(outflow), nil
}

func (uc *financeReportUsecase) getEndingCashBalanceAsOf(ctx context.Context, asOfDate time.Time, companyID, fiscalYearID *string) (float64, error) {
	allCoas, err := uc.coaRepo.FindAll(ctx, false)
	if err != nil {
		return 0, err
	}
	cashAccountIDs := make([]string, 0)
	for _, coa := range allCoas {
		if coa.Type == financeModels.AccountTypeCashBank {
			cashAccountIDs = append(cashAccountIDs, coa.ID)
		}
	}
	if len(cashAccountIDs) == 0 {
		return 0, nil
	}

	startDate := time.Date(1970, 1, 1, 0, 0, 0, 0, asOfDate.Location())
	endDate := time.Date(asOfDate.Year(), asOfDate.Month(), asOfDate.Day(), 23, 59, 59, 999999999, asOfDate.Location())
	balances, err := uc.reportRepo.GetAccountBalancesByAccounts(ctx, cashAccountIDs, startDate, endDate, normalizeReportScopeID(companyID), normalizeReportScopeID(fiscalYearID))
	if err != nil {
		return 0, err
	}

	totalEnding := 0.0
	for _, id := range cashAccountIDs {
		totalEnding += balances[id].ClosingBalance
	}
	return roundMoney(totalEnding), nil
}

func (uc *financeReportUsecase) GetCashFlowSummary(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowSummaryResponse, error) {
	inflow0, outflow0, err := uc.getPeriodCashInflowOutflow(ctx, startDate, endDate, companyID, fiscalYearID)
	if err != nil {
		return nil, err
	}
	netCashFlow0 := roundMoney(inflow0 - outflow0)

	durationDays := int(endDate.Sub(startDate).Hours()/24) + 1
	if durationDays < 1 {
		durationDays = 30
	}
	prevEnd := startDate.AddDate(0, 0, -1)
	prevStart := prevEnd.AddDate(0, 0, -(durationDays - 1))

	inflow1, outflow1, err := uc.getPeriodCashInflowOutflow(ctx, prevStart, prevEnd, companyID, fiscalYearID)
	if err != nil {
		inflow1, outflow1 = 0, 0
	}
	netCashFlow1 := roundMoney(inflow1 - outflow1)

	endingCash, err := uc.getEndingCashBalanceAsOf(ctx, endDate, companyID, fiscalYearID)
	if err != nil {
		endingCash = 0
	}

	return &dto.CashFlowSummaryResponse{
		NetCashFlow:              netCashFlow0,
		NetCashFlowGrowthPercent: calcGrowthPercent(netCashFlow0, netCashFlow1),
		CashInflow:               inflow0,
		CashInflowGrowthPercent:  calcGrowthPercent(inflow0, inflow1),
		CashOutflow:              outflow0,
		CashOutflowGrowthPercent: calcGrowthPercent(outflow0, outflow1),
		EndingCashBalance:        endingCash,
		EndingCashBalanceDate:    formatDateIndo(endDate),
		PreviousPeriodName:       formatMonthYearIndo(prevEnd),
	}, nil
}

func (uc *financeReportUsecase) GetCashFlowTrend(ctx context.Context, endDate time.Time, months int, companyID, fiscalYearID *string) (*dto.CashFlowTrendResponse, error) {
	if months <= 0 {
		months = 6
	}

	points := make([]dto.CashFlowTrendPoint, 0, months)
	for i := months - 1; i >= 0; i-- {
		targetMonthDate := endDate.AddDate(0, -i, 0)
		startOfMonth := time.Date(targetMonthDate.Year(), targetMonthDate.Month(), 1, 0, 0, 0, 0, endDate.Location())
		endOfMonth := startOfMonth.AddDate(0, 1, -1)

		inflow, outflow, err := uc.getPeriodCashInflowOutflow(ctx, startOfMonth, endOfMonth, companyID, fiscalYearID)
		if err != nil {
			inflow, outflow = 0, 0
		}
		net := roundMoney(inflow - outflow)

		points = append(points, dto.CashFlowTrendPoint{
			Period:      startOfMonth.Format("2006-01"),
			Label:       formatMonthYearIndo(startOfMonth),
			CashInflow:  inflow,
			CashOutflow: outflow,
			NetCashFlow: net,
		})
	}

	return &dto.CashFlowTrendResponse{Months: points}, nil
}

func (uc *financeReportUsecase) GetCashFlowYtdSummary(ctx context.Context, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowYtdSummaryResponse, error) {
	ytdStart := time.Date(endDate.Year(), time.January, 1, 0, 0, 0, 0, endDate.Location())

	inflow, outflow, err := uc.getPeriodCashInflowOutflow(ctx, ytdStart, endDate, companyID, fiscalYearID)
	if err != nil {
		return nil, err
	}
	net := roundMoney(inflow - outflow)

	openingCash, err := uc.getEndingCashBalanceAsOf(ctx, ytdStart.AddDate(0, 0, -1), companyID, fiscalYearID)
	if err != nil {
		openingCash = 0
	}

	endingCash, err := uc.getEndingCashBalanceAsOf(ctx, endDate, companyID, fiscalYearID)
	if err != nil {
		endingCash = 0
	}

	return &dto.CashFlowYtdSummaryResponse{
		TotalCashInflow:    inflow,
		TotalCashOutflow:   outflow,
		NetCashFlow:        net,
		OpeningCashBalance: openingCash,
		OpeningCashDate:    formatDateIndo(ytdStart),
		EndingCashBalance:  endingCash,
		EndingCashDate:     formatDateIndo(endDate),
	}, nil
}

func (uc *financeReportUsecase) GetCashFlowStatementTable(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (*dto.CashFlowStatementTableResponse, error) {
	m0Start := startDate
	m0End := endDate

	m1End := m0Start.AddDate(0, 0, -1)
	m1Start := time.Date(m1End.Year(), m1End.Month(), 1, 0, 0, 0, 0, endDate.Location())

	m2End := m1Start.AddDate(0, 0, -1)
	m2Start := time.Date(m2End.Year(), m2End.Month(), 1, 0, 0, 0, 0, endDate.Location())

	ytdStart := time.Date(endDate.Year(), time.January, 1, 0, 0, 0, 0, endDate.Location())
	ytdEnd := endDate

	type rangePair struct {
		key      string
		start    time.Time
		end      time.Time
		label    string
		subLabel string
	}

	ranges := []rangePair{
		{
			key:      "m0",
			start:    m0Start,
			end:      m0End,
			label:    formatMonthYearIndo(m0End),
			subLabel: fmt.Sprintf("%s - %s", m0Start.Format("02 Jan"), m0End.Format("02 Jan")),
		},
		{
			key:      "m1",
			start:    m1Start,
			end:      m1End,
			label:    formatMonthYearIndo(m1End),
			subLabel: fmt.Sprintf("%s - %s", m1Start.Format("02 Jan"), m1End.Format("02 Jan")),
		},
		{
			key:      "m2",
			start:    m2Start,
			end:      m2End,
			label:    formatMonthYearIndo(m2End),
			subLabel: fmt.Sprintf("%s - %s", m2Start.Format("02 Jan"), m2End.Format("02 Jan")),
		},
		{
			key:      "ytd",
			start:    ytdStart,
			end:      ytdEnd,
			label:    fmt.Sprintf("YTD %d", ytdEnd.Year()),
			subLabel: fmt.Sprintf("%s - %s", ytdStart.Format("02 Jan"), ytdEnd.Format("02 Jan")),
		},
	}

	periodsMeta := make([]dto.PeriodMeta, 0, len(ranges))
	for _, r := range ranges {
		periodsMeta = append(periodsMeta, dto.PeriodMeta{
			Key:      r.key,
			Label:    r.label,
			SubLabel: r.subLabel,
		})
	}

	reports := make(map[string]*dto.CashFlowReport, len(ranges))
	for _, r := range ranges {
		rep, err := uc.GetCashFlow(ctx, r.start, r.end, companyID, fiscalYearID)
		if err != nil {
			rep = &dto.CashFlowReport{}
		}
		reports[r.key] = rep
	}

	buildMultiSection := func(name string, extractSection func(r *dto.CashFlowReport) dto.CashFlowSection) dto.MultiPeriodSection {
		rowsMap := make(map[string]*dto.MultiPeriodRow)
		totals := make(map[string]float64)

		for _, r := range ranges {
			sec := extractSection(reports[r.key])
			totals[r.key] = sec.Amount

			for _, item := range sec.Items {
				itemKey := item.Code
				row := rowsMap[itemKey]
				if row == nil {
					row = &dto.MultiPeriodRow{
						AccountID:   item.AccountID,
						Code:        item.Code,
						Name:        item.Name,
						AccountType: item.AccountType,
						Amounts:     make(map[string]float64),
						Drilldown:   item.Drilldown,
					}
					rowsMap[itemKey] = row
				}
				row.Amounts[r.key] = item.Amount
			}
		}

		itemsList := make([]dto.MultiPeriodRow, 0, len(rowsMap))
		for _, row := range rowsMap {
			for _, r := range ranges {
				if _, ok := row.Amounts[r.key]; !ok {
					row.Amounts[r.key] = 0
				}
			}
			itemsList = append(itemsList, *row)
		}
		sort.Slice(itemsList, func(i, j int) bool { return itemsList[i].Code < itemsList[j].Code })

		return dto.MultiPeriodSection{
			Name:   name,
			Items:  itemsList,
			Totals: totals,
		}
	}

	opSection := buildMultiSection("A. CASH FLOW FROM OPERATING ACTIVITIES", func(r *dto.CashFlowReport) dto.CashFlowSection { return r.Operating })
	invSection := buildMultiSection("B. CASH FLOW FROM INVESTING ACTIVITIES", func(r *dto.CashFlowReport) dto.CashFlowSection { return r.Investing })
	finSection := buildMultiSection("C. CASH FLOW FROM FINANCING ACTIVITIES", func(r *dto.CashFlowReport) dto.CashFlowSection { return r.Financing })

	netIncrease := make(map[string]float64)
	openingBalances := make(map[string]float64)
	endingBalances := make(map[string]float64)

	for _, r := range ranges {
		rep := reports[r.key]
		netIncrease[r.key] = rep.NetChange
		openingBalances[r.key] = rep.BeginningCash
		endingBalances[r.key] = rep.EndingCash
	}

	return &dto.CashFlowStatementTableResponse{
		Periods:            periodsMeta,
		Operating:          opSection,
		Investing:          invSection,
		Financing:          finSection,
		NetIncreaseCash:    netIncrease,
		OpeningCashBalance: openingBalances,
		EndingCashBalance:  endingBalances,
	}, nil
}

func (uc *financeReportUsecase) ExportGeneralLedger(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID, accountID *string) ([]byte, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	data, err := uc.GetGeneralLedger(ctx, startDate, endDate, companyID, fiscalYearID, accountID)
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

func (uc *financeReportUsecase) ExportBalanceSheet(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string, includeZero bool) ([]byte, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	data, err := uc.GetBalanceSheet(ctx, startDate, endDate, companyID, fiscalYearID, includeZero)
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

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Retained Earnings")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.RetainedEarnings)
	rowNum++
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Current Year Profit")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.CurrentYearProfit)
	rowNum++
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Equity (Final)")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.EquityTotalFinal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total Liabilities & Equities")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.LiabilityEquity)
	rowNum++
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Imbalance Amount")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.ImbalanceAmount)

	buf, _ := f.WriteToBuffer()
	return buf.Bytes(), nil
}

func (uc *financeReportUsecase) ExportProfitAndLoss(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) ([]byte, error) {
	// Normalize endDate to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())

	data, err := uc.GetProfitAndLoss(ctx, startDate, endDate, companyID, fiscalYearID)
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

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "COST OF GOODS SOLD (COGS)")
	rowNum++
	for _, c := range data.COGS {
		f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), c.Code+" - "+c.Name)
		f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), c.Amount)
		rowNum++
	}
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Total COGS")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.COGSTotal)
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "GROSS PROFIT")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.GrossProfit)
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
	rowNum += 2

	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Gross Margin (%)")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.GrossMargin)
	rowNum++
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Net Margin (%)")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.NetMargin)
	rowNum++
	f.SetCellValue(sheet, "A"+fmt.Sprintf("%d", rowNum), "Expense Ratio (%)")
	f.SetCellValue(sheet, "B"+fmt.Sprintf("%d", rowNum), data.ExpenseRatio)

	buf, _ := f.WriteToBuffer()
	return buf.Bytes(), nil
}
