package usecase

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseCSVStatement(t *testing.T) {
	csvData := []byte(`Date,Reference,Description,Debit,Credit
2024-10-01,HS-INV-20241001,Harrison Supplies Ltd,5125.30,0
2024-10-03,PS-DE-004563,Pro Services GmbH,0,3478.56
`)

	lines, err := parseCSVStatement(csvData)
	assert.NoError(t, err)
	assert.Len(t, lines, 2)
	assert.Equal(t, 5125.30, lines[0].Amount)
	assert.Equal(t, "debit", string(lines[0].Direction))
	assert.Equal(t, 3478.56, lines[1].Amount)
	assert.Equal(t, "credit", string(lines[1].Direction))
}

func TestParsePDFStatement(t *testing.T) {
	pdfData := []byte(`%PDF-1.4
1 0 obj
<< /Length 100 >>
stream
BT
(2024-10-01) Tj
(HS-INV-20241001) Tj
(Harrison Supplies Ltd) Tj
(5125.30) Tj
(Debit) Tj
ET
endstream
endobj
`)

	lines, err := parsePDFStatement(pdfData)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(lines), 1)
	assert.Equal(t, 5125.30, lines[0].Amount)
	assert.Equal(t, "debit", string(lines[0].Direction))
}

func TestTryParsePDFLine(t *testing.T) {
	lineStr := "2024-10-01 HS-INV-20241001 Harrison Supplies Ltd 5125.30 Debit"
	parsed, ok := tryParsePDFLine(lineStr)
	assert.True(t, ok)
	assert.Equal(t, 5125.30, parsed.Amount)
	assert.Equal(t, "HS-INV-20241001", parsed.Reference)
	assert.Equal(t, "debit", string(parsed.Direction))
}

func TestJeniusPDFStatement(t *testing.T) {
	pdfBytes, err := os.ReadFile("/home/kevin/Documents/GiLabs/Projects/GIMS by GILABS/Jenius_Main_History_27_AGT_2026.pdf")
	if err != nil {
		t.Skip("Jenius PDF file not found")
	}
	lines, err := parsePDFStatement(pdfBytes)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(lines), 8)
	assert.Equal(t, 674000.00, lines[1].Amount)
	assert.Equal(t, "credit", string(lines[1].Direction))
}
