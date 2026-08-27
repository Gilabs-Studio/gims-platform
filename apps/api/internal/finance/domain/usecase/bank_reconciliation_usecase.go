package usecase

import (
	"bufio"
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/ledongthuc/pdf"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"gorm.io/gorm"
)

var (
	ErrBankReconciliationNotFound = errors.New("bank reconciliation not found")
	ErrBankStatementLineNotFound  = errors.New("bank statement line not found")
)

type BankReconciliationUsecase interface {
	ImportStatement(ctx context.Context, req *dto.ImportBankStatementRequest, fileName string, fileBytes []byte) (*dto.BankReconciliationResponse, error)
	List(ctx context.Context, req *dto.ListBankReconciliationsRequest) ([]dto.BankReconciliationResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.BankReconciliationResponse, error)
	AutoMatch(ctx context.Context, id string) (*dto.AutoMatchBankReconciliationResponse, error)
	MatchLine(ctx context.Context, reconciliationID, lineID string, req *dto.MatchBankStatementLineRequest) (*dto.BankStatementLineResponse, error)
	ExcludeLine(ctx context.Context, reconciliationID, lineID string, req *dto.ExcludeBankStatementLineRequest) (*dto.BankStatementLineResponse, error)
	Confirm(ctx context.Context, id string) (*dto.BankReconciliationResponse, error)
	Lock(ctx context.Context, id string) (*dto.BankReconciliationResponse, error)
	GetFormData(ctx context.Context, companyID string) (*dto.BankReconciliationFormDataResponse, error)
}

type bankReconciliationUsecase struct {
	db   *gorm.DB
	repo repositories.BankReconciliationRepository
}

func NewBankReconciliationUsecase(db *gorm.DB, repo repositories.BankReconciliationRepository) BankReconciliationUsecase {
	return &bankReconciliationUsecase{db: db, repo: repo}
}

func (u *bankReconciliationUsecase) ImportStatement(ctx context.Context, req *dto.ImportBankStatementRequest, fileName string, fileBytes []byte) (*dto.BankReconciliationResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if len(fileBytes) == 0 {
		return nil, errors.New("file is required")
	}

	statementDate, err := parseDateRequired(req.StatementDate)
	if err != nil {
		return nil, err
	}
	if statementDate.After(apptime.Now()) {
		return nil, errors.New("statement date cannot be in the future")
	}

	var bankAccount coreModels.BankAccount
	if err := u.db.WithContext(ctx).First(&bankAccount, "id = ?", strings.TrimSpace(req.BankAccountID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("selected bank account was not found")
		}
		return nil, err
	}
	req.CompanyID = bankAccount.CompanyID

	parsedLines, err := parseBankStatementLines(req.FileFormat, fileBytes)
	if err != nil {
		return nil, err
	}

	bookBalance, err := u.computeBookBalance(ctx, bankAccount.ID)
	if err != nil {
		return nil, err
	}

	statementBalance := bookBalance
	if req.StatementBalance != nil {
		statementBalance = *req.StatementBalance
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	item := &financeModels.BankReconciliation{
		CompanyID:        strings.TrimSpace(req.CompanyID),
		BankAccountID:    strings.TrimSpace(req.BankAccountID),
		StatementDate:    statementDate,
		StatementBalance: statementBalance,
		BookBalance:      bookBalance,
		Difference:       statementBalance - bookBalance,
		FileFormat:       strings.ToLower(strings.TrimSpace(req.FileFormat)),
		FileName:         strings.TrimSpace(fileName),
		Status:           financeModels.BankReconciliationStatusInProgress,
		CreatedBy:        nil,
	}
	if actorID != "" {
		item.CreatedBy = &actorID
	}

	if err := u.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	lines := make([]financeModels.BankStatementLine, 0, len(parsedLines))
	for _, line := range parsedLines {
		lines = append(lines, financeModels.BankStatementLine{
			BankReconciliationID: item.ID,
			Date:                 line.Date,
			Reference:            line.Reference,
			Description:          line.Description,
			Amount:               line.Amount,
			Direction:            line.Direction,
			Status:               financeModels.BankStatementLineStatusUnmatched,
		})
	}
	if err := u.repo.CreateStatementLines(ctx, lines); err != nil {
		return nil, err
	}

	created, err := u.repo.FindByID(ctx, item.ID, true)
	if err != nil {
		return nil, err
	}

	return u.toBankReconciliationResponse(created), nil
}

func (u *bankReconciliationUsecase) List(ctx context.Context, req *dto.ListBankReconciliationsRequest) ([]dto.BankReconciliationResponse, int64, error) {
	if req == nil {
		req = &dto.ListBankReconciliationsRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	startDate, err := parseDateOptional(req.DateFrom)
	if err != nil {
		return nil, 0, err
	}
	endDate, err := parseEndDateOptional(req.DateTo)
	if err != nil {
		return nil, 0, err
	}

	items, total, err := u.repo.List(ctx, repositories.BankReconciliationListParams{
		CompanyID:     req.CompanyID,
		BankAccountID: req.BankAccountID,
		Status:        req.Status,
		StartDate:     startDate,
		EndDate:       endDate,
		SortBy:        req.SortBy,
		SortDir:       req.SortDir,
		Limit:         perPage,
		Offset:        (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	responses := make([]dto.BankReconciliationResponse, 0, len(items))
	for i := range items {
		responses = append(responses, *u.toBankReconciliationResponse(&items[i]))
	}

	return responses, total, nil
}

func (u *bankReconciliationUsecase) GetByID(ctx context.Context, id string) (*dto.BankReconciliationResponse, error) {
	item, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}

	return u.toBankReconciliationResponse(item), nil
}

func (u *bankReconciliationUsecase) AutoMatch(ctx context.Context, id string) (*dto.AutoMatchBankReconciliationResponse, error) {
	item, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.BankReconciliationStatusLocked {
		return nil, errors.New("reconciliation locked")
	}

	autoMatchedCount := 0
	manualMatchRequiredCount := 0
	unmatchedCount := 0

	for i := range item.Lines {
		ln := &item.Lines[i]
		if ln.Status == financeModels.BankStatementLineStatusExcluded || ln.Status == financeModels.BankStatementLineStatusManualMatched || ln.Status == financeModels.BankStatementLineStatusAutoMatched {
			continue
		}

		startDate := ln.Date.AddDate(0, 0, -3)
		endDate := ln.Date.AddDate(0, 0, 3)

		var candidates []financeModels.CashBankTransaction
		if err := u.db.WithContext(ctx).
			Where("bank_account_id = ?", item.BankAccountID).
			Where("status = ?", financeModels.CashBankTransactionStatusPosted).
			Where("amount = ?", ln.Amount).
			Where("date >= ? AND date <= ?", startDate, endDate).
			Find(&candidates).Error; err != nil {
			return nil, err
		}

		if len(candidates) == 1 {
			candidateID := candidates[0].ID
			ln.Status = financeModels.BankStatementLineStatusAutoMatched
			ln.MatchedWithTransactionID = &candidateID
			autoMatchedCount++
		} else if len(candidates) > 1 {
			ln.Status = financeModels.BankStatementLineStatusUnmatched
			ln.MatchedWithTransactionID = nil
			manualMatchRequiredCount++
		} else {
			ln.Status = financeModels.BankStatementLineStatusUnmatched
			ln.MatchedWithTransactionID = nil
			unmatchedCount++
		}

		if err := u.repo.UpdateStatementLine(ctx, ln); err != nil {
			return nil, err
		}
	}

	refreshed, err := u.repo.FindByID(ctx, item.ID, true)
	if err != nil {
		return nil, err
	}

	lineResponses := make([]dto.BankStatementLineResponse, 0, len(refreshed.Lines))
	for _, line := range refreshed.Lines {
		lineResponses = append(lineResponses, u.toBankStatementLineResponse(&line))
	}

	return &dto.AutoMatchBankReconciliationResponse{
		ReconciliationID:         refreshed.ID,
		Status:                   refreshed.Status,
		AutoMatchedCount:         autoMatchedCount,
		ManualMatchRequiredCount: manualMatchRequiredCount,
		UnmatchedCount:           unmatchedCount,
		BankStatementLines:       lineResponses,
	}, nil
}

func (u *bankReconciliationUsecase) MatchLine(ctx context.Context, reconciliationID, lineID string, req *dto.MatchBankStatementLineRequest) (*dto.BankStatementLineResponse, error) {
	item, err := u.repo.FindByID(ctx, reconciliationID, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.BankReconciliationStatusLocked {
		return nil, errors.New("reconciliation locked")
	}

	line, err := u.repo.FindStatementLineByID(ctx, reconciliationID, lineID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankStatementLineNotFound
		}
		return nil, err
	}

	if req != nil && req.CashBankTransactionID != nil && strings.TrimSpace(*req.CashBankTransactionID) != "" {
		var txItem financeModels.CashBankTransaction
		if err := u.db.WithContext(ctx).
			First(&txItem, "id = ? AND bank_account_id = ? AND status = ?", strings.TrimSpace(*req.CashBankTransactionID), item.BankAccountID, financeModels.CashBankTransactionStatusPosted).Error; err != nil {
			return nil, err
		}
		line.Status = financeModels.BankStatementLineStatusManualMatched
		line.MatchedWithTransactionID = &txItem.ID
		line.ExcludeReason = ""
	} else {
		line.Status = financeModels.BankStatementLineStatusUnmatched
		line.MatchedWithTransactionID = nil
	}

	if err := u.repo.UpdateStatementLine(ctx, line); err != nil {
		return nil, err
	}

	res := u.toBankStatementLineResponse(line)
	return &res, nil
}

func (u *bankReconciliationUsecase) ExcludeLine(ctx context.Context, reconciliationID, lineID string, req *dto.ExcludeBankStatementLineRequest) (*dto.BankStatementLineResponse, error) {
	item, err := u.repo.FindByID(ctx, reconciliationID, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.BankReconciliationStatusLocked {
		return nil, errors.New("reconciliation locked")
	}

	line, err := u.repo.FindStatementLineByID(ctx, reconciliationID, lineID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankStatementLineNotFound
		}
		return nil, err
	}

	line.Status = financeModels.BankStatementLineStatusExcluded
	line.MatchedWithTransactionID = nil
	if req != nil {
		line.ExcludeReason = strings.TrimSpace(req.Reason)
	}

	if err := u.repo.UpdateStatementLine(ctx, line); err != nil {
		return nil, err
	}

	res := u.toBankStatementLineResponse(line)
	return &res, nil
}

func (u *bankReconciliationUsecase) Confirm(ctx context.Context, id string) (*dto.BankReconciliationResponse, error) {
	item, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.BankReconciliationStatusLocked {
		return nil, errors.New("reconciliation locked")
	}

	for _, ln := range item.Lines {
		if ln.Status == financeModels.BankStatementLineStatusUnmatched {
			return nil, errors.New("unmatched lines exist")
		}
	}

	bookBalance, err := u.computeBookBalance(ctx, item.BankAccountID)
	if err != nil {
		return nil, err
	}
	item.BookBalance = bookBalance
	item.Difference = item.StatementBalance - item.BookBalance
	if item.Difference != 0 {
		return nil, errors.New("balance not equal")
	}

	now := apptime.Now()
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	item.Status = financeModels.BankReconciliationStatusReconciled
	item.ReconciledAt = &now
	if actorID != "" {
		item.ReconciledBy = &actorID
	}

	if err := u.repo.Update(ctx, item); err != nil {
		return nil, err
	}

	refreshed, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}

	return u.toBankReconciliationResponse(refreshed), nil
}

func (u *bankReconciliationUsecase) Lock(ctx context.Context, id string) (*dto.BankReconciliationResponse, error) {
	item, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrBankReconciliationNotFound
		}
		return nil, err
	}
	if item.Status != financeModels.BankReconciliationStatusReconciled {
		return nil, errors.New("reconciliation must be reconciled before lock")
	}

	now := apptime.Now()
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	item.Status = financeModels.BankReconciliationStatusLocked
	item.LockedAt = &now
	if actorID != "" {
		item.LockedBy = &actorID
	}

	if err := u.repo.Update(ctx, item); err != nil {
		return nil, err
	}

	refreshed, err := u.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}

	return u.toBankReconciliationResponse(refreshed), nil
}

func (u *bankReconciliationUsecase) GetFormData(ctx context.Context, companyID string) (*dto.BankReconciliationFormDataResponse, error) {
	var bankAccounts []coreModels.BankAccount
	q := u.db.WithContext(ctx).Where("is_active = true")
	if strings.TrimSpace(companyID) != "" {
		q = q.Where("company_id = ?", strings.TrimSpace(companyID))
	}
	if err := q.Order("code asc").Find(&bankAccounts).Error; err != nil {
		return nil, err
	}

	options := make([]dto.BankAccountReconciliationOption, 0, len(bankAccounts))
	for _, acc := range bankAccounts {
		var latest financeModels.BankReconciliation
		lastDate := (*string)(nil)
		err := u.db.WithContext(ctx).
			Where("bank_account_id = ?", acc.ID).
			Order("statement_date desc").
			Take(&latest).Error
		if err == nil {
			v := latest.StatementDate.Format("2006-01-02")
			lastDate = &v
		}

		options = append(options, dto.BankAccountReconciliationOption{
			ID:                     acc.ID,
			Code:                   acc.Code,
			Name:                   acc.Name,
			LastReconciliationDate: lastDate,
		})
	}

	return &dto.BankReconciliationFormDataResponse{
		BankAccounts: options,
		FileFormats: []dto.ValueLabelOption{
			{Value: "csv", Label: "CSV (Comma-Separated)"},
			{Value: "mt940", Label: "MT940 (SWIFT)"},
			{Value: "ofx", Label: "OFX (Open Financial Exchange)"},
			{Value: "pdf", Label: "PDF (Bank Statement)"},
		},
	}, nil
}

func (u *bankReconciliationUsecase) computeBookBalance(ctx context.Context, bankAccountID string) (float64, error) {
	var bankAccount coreModels.BankAccount
	if err := u.db.WithContext(ctx).
		Select("chart_of_account_id").
		First(&bankAccount, "id = ?", bankAccountID).Error; err != nil {
		return 0, err
	}
	if bankAccount.ChartOfAccountID == nil || strings.TrimSpace(*bankAccount.ChartOfAccountID) == "" {
		return 0, nil
	}

	var balance struct {
		Balance float64
	}
	query := `
		SELECT COALESCE(
			SUM(COALESCE(jl.debit, 0)) - SUM(COALESCE(jl.credit, 0)),
			0
		) AS balance
		FROM journal_lines jl
		JOIN journal_entries je ON je.id = jl.journal_entry_id
		WHERE jl.chart_of_account_id = ?
		  AND je.status = 'posted'
		  AND je.deleted_at IS NULL
		  AND jl.deleted_at IS NULL
	`
	if err := u.db.WithContext(ctx).Raw(query, *bankAccount.ChartOfAccountID).Scan(&balance).Error; err != nil {
		return 0, err
	}
	return balance.Balance, nil
}

func (u *bankReconciliationUsecase) toBankReconciliationResponse(item *financeModels.BankReconciliation) *dto.BankReconciliationResponse {
	res := &dto.BankReconciliationResponse{
		ID:               item.ID,
		CompanyID:        item.CompanyID,
		BankAccountID:    item.BankAccountID,
		StatementDate:    item.StatementDate.Format("2006-01-02"),
		StatementBalance: item.StatementBalance,
		BookBalance:      item.BookBalance,
		Difference:       item.Difference,
		FileFormat:       item.FileFormat,
		FileName:         item.FileName,
		Status:           item.Status,
		ReconciledBy:     item.ReconciledBy,
		LockedBy:         item.LockedBy,
		CreatedAt:        item.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        item.UpdatedAt.Format(time.RFC3339),
	}
	if item.ReconciledAt != nil {
		v := item.ReconciledAt.Format(time.RFC3339)
		res.ReconciledAt = &v
	}
	if item.LockedAt != nil {
		v := item.LockedAt.Format(time.RFC3339)
		res.LockedAt = &v
	}
	if len(item.Lines) > 0 {
		res.Lines = make([]dto.BankStatementLineResponse, 0, len(item.Lines))
		for _, line := range item.Lines {
			res.Lines = append(res.Lines, u.toBankStatementLineResponse(&line))
		}
	}

	return res
}

func (u *bankReconciliationUsecase) toBankStatementLineResponse(line *financeModels.BankStatementLine) dto.BankStatementLineResponse {
	return dto.BankStatementLineResponse{
		ID:                       line.ID,
		Date:                     line.Date.Format("2006-01-02"),
		Reference:                line.Reference,
		Description:              line.Description,
		Amount:                   line.Amount,
		Direction:                line.Direction,
		Status:                   line.Status,
		MatchedWithTransactionID: line.MatchedWithTransactionID,
		ExcludeReason:            line.ExcludeReason,
	}
}

type parsedStatementLine struct {
	Date        time.Time
	Reference   string
	Description string
	Amount      float64
	Direction   financeModels.BankStatementLineDirection
}

func parseBankStatementLines(fileFormat string, fileBytes []byte) ([]parsedStatementLine, error) {
	switch strings.ToLower(strings.TrimSpace(fileFormat)) {
	case "csv":
		return parseCSVStatement(fileBytes)
	case "mt940":
		return parseMT940Statement(fileBytes)
	case "ofx":
		return parseOFXStatement(fileBytes)
	case "pdf":
		return parsePDFStatement(fileBytes)
	default:
		return nil, errors.New("invalid file format")
	}
}

func parseCSVStatement(fileBytes []byte) ([]parsedStatementLine, error) {
	r := csv.NewReader(bytes.NewReader(fileBytes))
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}
	lines := make([]parsedStatementLine, 0)
	for idx, rec := range records {
		if len(rec) < 5 {
			continue
		}
		if idx == 0 && strings.Contains(strings.ToLower(rec[0]), "date") {
			continue
		}
		date, err := tryParseDate(strings.TrimSpace(rec[0]))
		if err != nil {
			continue
		}
		reference := strings.TrimSpace(rec[1])
		description := strings.TrimSpace(rec[2])
		debit, _ := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(rec[3]), ",", ""), 64)
		credit, _ := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(rec[4]), ",", ""), 64)

		amount := credit
		direction := financeModels.BankStatementLineDirectionCredit
		if debit > 0 {
			amount = debit
			direction = financeModels.BankStatementLineDirectionDebit
		}

		if amount <= 0 {
			continue
		}
		lines = append(lines, parsedStatementLine{Date: date, Reference: reference, Description: description, Amount: amount, Direction: direction})
	}

	if len(lines) == 0 {
		return nil, errors.New("parse error: no valid statement lines")
	}

	return lines, nil
}

func parseMT940Statement(fileBytes []byte) ([]parsedStatementLine, error) {
	scanner := bufio.NewScanner(bytes.NewReader(fileBytes))
	lines := make([]parsedStatementLine, 0)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, ":61:") {
			continue
		}
		payload := strings.TrimPrefix(line, ":61:")
		if len(payload) < 11 {
			continue
		}
		dateRaw := payload[:6]
		date, err := time.Parse("060102", dateRaw)
		if err != nil {
			continue
		}
		direction := financeModels.BankStatementLineDirectionCredit
		if strings.Contains(payload, "D") {
			direction = financeModels.BankStatementLineDirectionDebit
		}
		amount := extractFirstAmount(payload)
		if amount <= 0 {
			continue
		}
		lines = append(lines, parsedStatementLine{Date: date, Reference: "", Description: "MT940", Amount: amount, Direction: direction})
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if len(lines) == 0 {
		return nil, errors.New("parse error: no valid mt940 lines")
	}
	return lines, nil
}

func parseOFXStatement(fileBytes []byte) ([]parsedStatementLine, error) {
	body := string(fileBytes)
	chunks := strings.Split(body, "<STMTTRN>")
	if len(chunks) < 2 {
		return nil, errors.New("parse error: invalid ofx content")
	}
	lines := make([]parsedStatementLine, 0)
	for _, chunk := range chunks[1:] {
		dateStr := extractOFXTag(chunk, "DTPOSTED")
		amtStr := extractOFXTag(chunk, "TRNAMT")
		ref := extractOFXTag(chunk, "FITID")
		desc := extractOFXTag(chunk, "NAME")
		memo := extractOFXTag(chunk, "MEMO")
		if desc == "" {
			desc = memo
		}

		if len(dateStr) >= 8 {
			dateStr = dateStr[:8]
		}
		date, err := time.Parse("20060102", dateStr)
		if err != nil {
			continue
		}
		amount, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(amtStr), ",", ""), 64)
		if err != nil {
			continue
		}
		direction := financeModels.BankStatementLineDirectionCredit
		if amount < 0 {
			direction = financeModels.BankStatementLineDirectionDebit
			amount = -amount
		}
		if amount <= 0 {
			continue
		}

		lines = append(lines, parsedStatementLine{Date: date, Reference: ref, Description: desc, Amount: amount, Direction: direction})
	}

	if len(lines) == 0 {
		return nil, errors.New("parse error: no valid ofx lines")
	}
	return lines, nil
}

func extractOFXTag(input, tag string) string {
	start := strings.Index(strings.ToUpper(input), "<"+strings.ToUpper(tag)+">")
	if start < 0 {
		return ""
	}
	start = start + len(tag) + 2
	remain := input[start:]
	end := strings.Index(remain, "<")
	if end < 0 {
		return strings.TrimSpace(remain)
	}
	return strings.TrimSpace(remain[:end])
}

func extractFirstAmount(payload string) float64 {
	cleaned := strings.NewReplacer("N", " ", "D", " ", "C", " ", ",", ".").Replace(payload)
	parts := strings.Fields(cleaned)
	for _, p := range parts {
		if v, err := strconv.ParseFloat(p, 64); err == nil && v > 0 {
			return v
		}
	}
	return 0
}

var indoMonthMap = map[string]time.Month{
	"jan": time.January, "januari": time.January,
	"feb": time.February, "februari": time.February,
	"mar": time.March, "maret": time.March,
	"apr": time.April, "april": time.April,
	"mei": time.May,
	"jun": time.June, "juni": time.June,
	"jul": time.July, "juli": time.July,
	"agt": time.August, "agu": time.August, "agustus": time.August,
	"sep": time.September, "september": time.September,
	"okt": time.October, "oktober": time.October,
	"nov": time.November, "november": time.November,
	"des": time.December, "desember": time.December,
}

func tryParseDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, errors.New("empty date")
	}

	layouts := []string{"2006-01-02", "02-01-2006", "02/01/2006", "2006/01/02", "10/01/2024", "01/10/2024", "02 Jan 2006", "02-Jan-2006"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}

	cleanVal := strings.ReplaceAll(value, "-", " ")
	cleanVal = strings.ReplaceAll(cleanVal, "/", " ")
	parts := strings.Fields(cleanVal)
	if len(parts) >= 3 {
		day, errDay := strconv.Atoi(parts[0])
		mStr := strings.ToLower(parts[1])
		year, errYear := strconv.Atoi(parts[2])

		if errDay == nil && errYear == nil && day >= 1 && day <= 31 && year >= 2000 && year <= 2100 {
			if m, ok := indoMonthMap[mStr]; ok {
				return time.Date(year, m, day, 0, 0, 0, 0, time.UTC), nil
			}
		}
	}

	return time.Time{}, fmt.Errorf("invalid date: %s", value)
}

func parsePDFStatement(fileBytes []byte) ([]parsedStatementLine, error) {
	extractedText := extractPDFText(fileBytes)
	if strings.TrimSpace(extractedText) == "" {
		return nil, errors.New("parse error: unable to extract text from PDF statement")
	}

	lines := make([]parsedStatementLine, 0)
	rawLines := strings.Split(extractedText, "\n")
	for _, l := range rawLines {
		l = strings.TrimSpace(l)
		if l == "" {
			continue
		}
		parsed, ok := tryParsePDFLine(l)
		if ok {
			lines = append(lines, parsed)
		}
	}

	if len(lines) == 0 {
		tokens := strings.Fields(extractedText)
		type dateMatch struct {
			idx     int
			length  int
			dateVal time.Time
		}
		var matches []dateMatch

		for i := 0; i < len(tokens); i++ {
			var dateVal time.Time
			var dateLen = 0

			if i+2 < len(tokens) {
				candidate3 := tokens[i] + " " + tokens[i+1] + " " + tokens[i+2]
				if d, err := tryParseDate(candidate3); err == nil {
					dateVal = d
					dateLen = 3
				}
			}
			if dateLen == 0 {
				if d, err := tryParseDate(tokens[i]); err == nil {
					dateVal = d
					dateLen = 1
				}
			}

			if dateLen > 0 {
				matches = append(matches, dateMatch{idx: i, length: dateLen, dateVal: dateVal})
				i += dateLen - 1
			}
		}

		for mIdx, m := range matches {
			endIdx := len(tokens)
			if mIdx+1 < len(matches) {
				endIdx = matches[mIdx+1].idx
			}
			blockTokens := tokens[m.idx+m.length : endIdx]
			parsed, ok := tryParsePDFLineWithDate(m.dateVal, blockTokens)
			if ok {
				lines = append(lines, parsed)
			}
		}
	}

	if len(lines) == 0 {
		return nil, errors.New("parse error: no valid statement lines found in PDF")
	}

	return lines, nil
}

func extractPDFText(fileBytes []byte) string {
	r, err := pdf.NewReader(bytes.NewReader(fileBytes), int64(len(fileBytes)))
	if err == nil {
		var sb strings.Builder
		for pageIndex := 1; pageIndex <= r.NumPage(); pageIndex++ {
			p := r.Page(pageIndex)
			if p.V.IsNull() {
				continue
			}
			text, err := p.GetPlainText(nil)
			if err == nil && len(strings.TrimSpace(text)) > 0 {
				sb.WriteString(text)
				sb.WriteString("\n")
			}
		}
		extracted := sb.String()
		if len(strings.TrimSpace(extracted)) > 10 {
			return extracted
		}
	}

	var sb strings.Builder
	content := string(fileBytes)

	inParen := false
	escaped := false
	var token strings.Builder

	for i := 0; i < len(content); i++ {
		ch := content[i]
		if inParen {
			if escaped {
				token.WriteByte(ch)
				escaped = false
			} else if ch == '\\' {
				escaped = true
			} else if ch == ')' {
				inParen = false
				txt := token.String()
				if len(strings.TrimSpace(txt)) > 0 {
					sb.WriteString(txt)
					sb.WriteString(" ")
				}
				token.Reset()
			} else {
				token.WriteByte(ch)
			}
		} else {
			if ch == '(' {
				inParen = true
			} else if ch == '\n' || ch == '\r' {
				sb.WriteString(" ")
			}
		}
	}

	rawExtracted := sb.String()
	if len(strings.TrimSpace(rawExtracted)) < 10 {
		var fallbackSb strings.Builder
		for _, line := range strings.Split(content, "\n") {
			cleanLine := strings.Map(func(r rune) rune {
				if r >= 32 && r <= 126 {
					return r
				}
				return -1
			}, line)
			if len(cleanLine) > 5 {
				fallbackSb.WriteString(cleanLine)
				fallbackSb.WriteString("\n")
			}
		}
		return fallbackSb.String()
	}

	return rawExtracted
}

func tryParsePDFLine(line string) (parsedStatementLine, bool) {
	parts := strings.Fields(line)
	if len(parts) < 3 {
		return parsedStatementLine{}, false
	}

	var date time.Time
	var dateIdx = -1
	for idx, p := range parts {
		if d, err := tryParseDate(p); err == nil {
			date = d
			dateIdx = idx
			break
		}
	}

	if dateIdx < 0 {
		return parsedStatementLine{}, false
	}

	return tryParsePDFLineWithDate(date, parts[dateIdx+1:])
}

func parseFlexibleAmount(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	if strings.HasPrefix(s, "$") || strings.HasPrefix(s, "Rp") {
		idxDigit := strings.IndexAny(s, "0123456789")
		if idxDigit >= 0 {
			s = s[idxDigit:]
		}
	}

	hasDot := strings.Contains(s, ".")
	hasComma := strings.Contains(s, ",")

	clean := s
	if hasDot && hasComma {
		lastDot := strings.LastIndex(s, ".")
		lastComma := strings.LastIndex(s, ",")
		if lastDot > lastComma {
			clean = strings.ReplaceAll(s, ",", "")
		} else {
			clean = strings.ReplaceAll(s, ".", "")
			clean = strings.ReplaceAll(clean, ",", ".")
		}
	} else if hasComma {
		clean = strings.ReplaceAll(s, ",", ".")
	} else if hasDot {
		dotIdx := strings.LastIndex(s, ".")
		digitsAfterDot := len(s) - dotIdx - 1
		if digitsAfterDot == 3 {
			clean = strings.ReplaceAll(s, ".", "")
		}
	}

	val, err := strconv.ParseFloat(clean, 64)
	if err == nil && val > 0 {
		return val, true
	}
	return 0, false
}

func tryParsePDFLineWithDate(dateVal time.Time, parts []string) (parsedStatementLine, bool) {
	if len(parts) == 0 {
		return parsedStatementLine{}, false
	}

	var amount float64
	var direction = financeModels.BankStatementLineDirectionDebit
	var ref = ""
	var descParts []string

	for idx := 0; idx < len(parts); idx++ {
		p := parts[idx]

		if p == "-" || p == "+" {
			if idx+1 < len(parts) {
				nextP := parts[idx+1]
				if val, ok := parseFlexibleAmount(nextP); ok {
					amount = val
					if p == "-" {
						direction = financeModels.BankStatementLineDirectionDebit
					} else {
						direction = financeModels.BankStatementLineDirectionCredit
					}
					idx++
					continue
				}
			}
		}

		if amount == 0 {
			if val, ok := parseFlexibleAmount(p); ok {
				amount = val
			}
		}

		upperP := strings.ToUpper(p)
		if upperP == "DEBIT" || upperP == "DB" || upperP == "OUT" || upperP == "PAYMENT" {
			direction = financeModels.BankStatementLineDirectionDebit
		} else if upperP == "CREDIT" || upperP == "CR" || upperP == "IN" || upperP == "DEPOSIT" {
			direction = financeModels.BankStatementLineDirectionCredit
		} else if strings.Contains(p, "@") || strings.Contains(p, "INV-") || strings.HasPrefix(p, "REF-") || strings.HasPrefix(p, "TXN-") || strings.HasPrefix(p, "HS-") || strings.HasPrefix(p, "PS-") || strings.HasPrefix(p, "TKP") {
			if ref == "" {
				ref = p
			} else {
				descParts = append(descParts, p)
			}
		} else {
			descParts = append(descParts, p)
		}
	}

	if amount <= 0 {
		return parsedStatementLine{}, false
	}

	desc := strings.Join(descParts, " ")
	if desc == "" {
		desc = "PDF Transaction"
	}

	return parsedStatementLine{
		Date:        dateVal,
		Reference:   ref,
		Description: desc,
		Amount:      amount,
		Direction:   direction,
	}, true
}
