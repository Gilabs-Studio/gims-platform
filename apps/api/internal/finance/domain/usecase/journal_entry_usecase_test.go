package usecase

import (
	"testing"

	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/stretchr/testify/require"
)

func TestValidateLines_ShouldRejectUnbalancedEntries(t *testing.T) {
	t.Parallel()

	_, _, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 100, Credit: 0},
		{ChartOfAccountID: "coa-2", Debit: 0, Credit: 90},
	})

	require.ErrorIs(t, err, ErrJournalUnbalanced)
}

func TestJournalReferenceTypesForDomain_ShouldMapKnownDomain(t *testing.T) {
	t.Parallel()

	domain := "purchase"
	types := journalReferenceTypesForDomain(&domain)

	require.Contains(t, types, "GOODS_RECEIPT")
	require.Contains(t, types, "SUPPLIER_INVOICE")
	require.Contains(t, types, "PURCHASE_PAYMENT")
}
