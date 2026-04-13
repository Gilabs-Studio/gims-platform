package handler

import (
	_ "embed"
	"fmt"
	"html/template"
	"math"
	"net/http"
	"strings"
	"time"

	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	posModels "github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gin-gonic/gin"
)

// POSReceiptHandler renders an 80mm thermal-printer receipt as HTML.
type POSReceiptHandler struct {
	orderUC    usecase.POSOrderUsecase
	paymentRepo repositories.POSPaymentRepository
	configRepo  repositories.POSConfigRepository
	outletRepo  orgRepos.OutletRepository
}

// NewPOSReceiptHandler constructs the receipt handler.
func NewPOSReceiptHandler(
	orderUC usecase.POSOrderUsecase,
	paymentRepo repositories.POSPaymentRepository,
	configRepo repositories.POSConfigRepository,
	outletRepo orgRepos.OutletRepository,
) *POSReceiptHandler {
	return &POSReceiptHandler{
		orderUC:     orderUC,
		paymentRepo: paymentRepo,
		configRepo:  configRepo,
		outletRepo:  outletRepo,
	}
}

// ─── Template data ────────────────────────────────────────────────────────────

type receiptItemRow struct {
	Qty       string
	Name      string
	UnitPrice string
	Subtotal  string
}

type receiptTemplateData struct {
	OutletName    string
	OutletAddress string
	OutletPhone   string

	OrderNumber  string
	OrderDate    string
	OrderTime    string
	TableLabel   string
	CustomerName string

	Items []receiptItemRow

	Subtotal      string
	DiscountLine  string
	TaxLine       string
	ServiceLine   string
	Total         string

	PaymentMethod   string
	TenderAmount    string
	ChangeAmount    string
	ShowCashDetails bool

	Footer        string
	PrintReceiptAuto bool
}

// ─── HTML template ────────────────────────────────────────────────────────────

//go:embed templates/receipt.html
var receiptHTMLTemplate string

// ─── Handler ──────────────────────────────────────────────────────────────────

// GetReceipt renders a thermal-printer–optimised HTML receipt for the given order.
func (h *POSReceiptHandler) GetReceipt(c *gin.Context) {
	ctx := c.Request.Context()
	orderID := c.Param("id")

	// Load order.
	orderResp, err := h.orderUC.GetByID(ctx, orderID)
	if err != nil {
		if err == usecase.ErrPOSOrderNotFound {
			c.String(http.StatusNotFound, "Order not found")
			return
		}
		c.String(http.StatusInternalServerError, "Failed to load order")
		return
	}

	// Load the most-recent PAID payment (cash or card).
	payments, _ := h.paymentRepo.FindByOrderID(ctx, orderID)
	var payment *posModels.POSPayment
	for i := range payments {
		if payments[i].Status == posModels.POSPaymentStatusPaid {
			payment = &payments[i]
			break
		}
	}

	// Load outlet.
	outlet, _ := h.outletRepo.GetByID(ctx, orderResp.OutletID)

	// Load POS config (tax footer, currency).
	cfg, _ := h.configRepo.FindByOutletID(ctx, orderResp.OutletID)

	currency := "IDR"
	if cfg != nil && cfg.Currency != "" {
		currency = cfg.Currency
	}

	// ── Build template data ──────────────────────────────────────────────────

	loc := time.FixedZone("WIB", 7*3600)
	createdAt := orderResp.CreatedAt.In(loc)

	data := receiptTemplateData{
		OutletName:   "POS",
		OrderNumber:  orderResp.OrderNumber,
		OrderDate:    createdAt.Format("02/01/2006"),
		OrderTime:    createdAt.Format("15:04"),
	}

	if outlet != nil {
		data.OutletName = outlet.Name
		data.OutletAddress = strings.TrimSpace(outlet.Address)
		data.OutletPhone = strings.TrimSpace(outlet.Phone)
	}

	if orderResp.TableLabel != nil {
		data.TableLabel = *orderResp.TableLabel
	}
	if orderResp.CustomerName != nil {
		data.CustomerName = *orderResp.CustomerName
	}

	// Items.
	for _, item := range orderResp.Items {
		data.Items = append(data.Items, receiptItemRow{
			Qty:       formatQty(item.Quantity),
			Name:      item.ProductName,
			UnitPrice: formatCurrency(currency, item.UnitPrice),
			Subtotal:  formatCurrency(currency, item.Subtotal),
		})
	}

	// Totals.
	data.Subtotal = formatCurrency(currency, orderResp.Subtotal)
	if orderResp.DiscountAmount > 0 {
		data.DiscountLine = formatCurrency(currency, orderResp.DiscountAmount)
	}
	if orderResp.TaxAmount > 0 {
		data.TaxLine = formatCurrency(currency, orderResp.TaxAmount)
	}
	if orderResp.ServiceCharge > 0 {
		data.ServiceLine = formatCurrency(currency, orderResp.ServiceCharge)
	}
	data.Total = formatCurrency(currency, orderResp.TotalAmount)

	// Payment.
	if payment != nil {
		data.PaymentMethod = string(payment.Method)
		if payment.Method == posModels.POSPaymentMethodCash && payment.TenderAmount > 0 {
			data.ShowCashDetails = true
			data.TenderAmount = formatCurrency(currency, payment.TenderAmount)
			data.ChangeAmount = formatCurrency(currency, payment.ChangeAmount)
		}
	}

	// Footer / auto-print.
	if cfg != nil {
		if cfg.ReceiptFooter != nil && *cfg.ReceiptFooter != "" {
			data.Footer = *cfg.ReceiptFooter
		}
		data.PrintReceiptAuto = cfg.PrintReceiptAuto
	}

	// ── Render ───────────────────────────────────────────────────────────────

	tmpl, err := template.New("receipt").Parse(receiptHTMLTemplate)
	if err != nil {
		c.String(http.StatusInternalServerError, "Template error")
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-store")
	if err := tmpl.Execute(c.Writer, data); err != nil {
		// Write of the body already started; log silently.
		_ = err
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// formatCurrency formats a monetary value according to the given currency code.
// IDR uses Indonesian thousands separator (no decimal); others use 2 decimal places.
func formatCurrency(currency string, amount float64) string {
	if currency == "IDR" {
		rounded := math.Round(amount)
		return "Rp " + formatThousands(int64(rounded))
	}
	return fmt.Sprintf("%s %.2f", currency, amount)
}

// formatThousands adds a period (.) as the Indonesian thousands separator.
func formatThousands(n int64) string {
	s := fmt.Sprintf("%d", n)
	if n < 0 {
		s = s[1:]
	}
	var result []byte
	for i, ch := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(ch))
	}
	if n < 0 {
		return "-" + string(result)
	}
	return string(result)
}

// formatQty formats item quantity: integer-like values drop the decimal.
func formatQty(q float64) string {
	if q == math.Trunc(q) {
		return fmt.Sprintf("%.0f", q)
	}
	return fmt.Sprintf("%.2f", q)
}
