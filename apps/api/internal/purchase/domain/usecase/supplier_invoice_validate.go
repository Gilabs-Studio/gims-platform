package usecase

import (
	"fmt"

	"github.com/gilabs/gims/api/internal/purchase/data/models"
"github.com/gilabs/gims/api/internal/purchase/domain/dto"
"gorm.io/gorm"
)

func (uc *supplierInvoiceUsecase) validateSIQuantity(tx *gorm.DB, gr *models.GoodsReceipt, reqItems []dto.CreateSupplierInvoiceItemRequest, excludeSIId string) (map[string]string, error) {
	// 1. Get total Qty Received for this ENTIRE PO (across all GRs)
	type qtySum struct {
		ProductID string
		Qty       float64
	}
	var receivedSums []qtySum
	if err := tx.Table("goods_receipt_items").
		Select("product_id, SUM(quantity_received) as qty").
		Joins("JOIN goods_receipts ON goods_receipts.id = goods_receipt_items.goods_receipt_id").
		Where("goods_receipts.purchase_order_id = ? AND goods_receipts.status IN ?", gr.PurchaseOrderID, []string{
			string(models.GoodsReceiptStatusApproved),
			string(models.GoodsReceiptStatusPartial),
			string(models.GoodsReceiptStatusClosed),
		}).
		Group("product_id").Scan(&receivedSums).Error; err != nil {
		return nil, err
	}
	receivedMap := make(map[string]float64)
	for _, r := range receivedSums {
		receivedMap[r.ProductID] = r.Qty
	}

	// 2. Get total Qty already Invoiced for this ENTIRE PO
	var invoicedSums []qtySum
	query := tx.Table("supplier_invoice_items").
		Select("supplier_invoice_items.product_id, SUM(supplier_invoice_items.quantity) as qty").
		Joins("JOIN supplier_invoices ON supplier_invoices.id = supplier_invoice_items.supplier_invoice_id").
		Where("supplier_invoices.purchase_order_id = ? AND supplier_invoices.status NOT IN ?",
			gr.PurchaseOrderID, []string{
				string(models.SupplierInvoiceStatusRejected),
				string(models.SupplierInvoiceStatusCancelled),
			}).
		Where("supplier_invoices.deleted_at IS NULL")

	if excludeSIId != "" {
		query = query.Where("supplier_invoices.id != ?", excludeSIId)
	}
	if err := query.Group("supplier_invoice_items.product_id").Scan(&invoicedSums).Error; err != nil {
		return nil, err
	}

	invoicedMap := make(map[string]float64)
	for _, s := range invoicedSums {
		invoicedMap[s.ProductID] = s.Qty
	}

	// 3. Map ProductID to PoItemID for the current SI creation
	poItemIDByProduct := make(map[string]string)
	for _, it := range gr.Items {
		poItemIDByProduct[it.ProductID] = it.PurchaseOrderItemID
	}

	// 4. Validate Total Invoiced (including this request) <= Total Received
	reqQtyByProduct := make(map[string]float64)
	for _, it := range reqItems {
		reqQtyByProduct[it.ProductID] += it.Quantity
	}

	for pid, q := range reqQtyByProduct {
		received := receivedMap[pid]
		invoiced := invoicedMap[pid]
		if q+invoiced > received+0.0001 {
			return nil, fmt.Errorf("item %s: total invoiced (%.2f) would exceed total received (%.2f)", pid, q+invoiced, received)
		}
	}

	return poItemIDByProduct, nil
}
