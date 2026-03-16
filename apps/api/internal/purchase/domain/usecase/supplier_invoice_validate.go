package usecase

import (
"github.com/gilabs/gims/api/internal/purchase/data/models"
"github.com/gilabs/gims/api/internal/purchase/domain/dto"
"gorm.io/gorm"
)

func (uc *supplierInvoiceUsecase) validateSIQuantity(tx *gorm.DB, gr *models.GoodsReceipt, reqItems []dto.CreateSupplierInvoiceItemRequest, excludeSIId string) (map[string]string, error) {
receivedQtyByProduct := make(map[string]float64)
poItemIDByProduct := make(map[string]string)
for _, it := range gr.Items {
receivedQtyByProduct[it.ProductID] += it.QuantityReceived
poItemIDByProduct[it.ProductID] = it.PurchaseOrderItemID
}

reqQtyByProduct := make(map[string]float64)
for _, it := range reqItems {
reqQtyByProduct[it.ProductID] += it.Quantity
}

type qtySum struct {
ProductID string
Qty       float64
}
var invoicedSums []qtySum
query := tx.Table("supplier_invoice_items").
Select("supplier_invoice_items.product_id, SUM(supplier_invoice_items.quantity) as qty").
Joins("JOIN supplier_invoices ON supplier_invoices.id = supplier_invoice_items.supplier_invoice_id").
Where("supplier_invoices.goods_receipt_id = ? AND supplier_invoices.status NOT IN ?",
gr.ID, []string{
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

for pid, q := range reqQtyByProduct {
received := receivedQtyByProduct[pid]
invoiced := invoicedMap[pid]
if received <= 0 {
return nil, ErrSupplierInvoiceConflict
}
if q + invoiced > received+0.0001 {
return nil, ErrSupplierInvoiceConflict
}
}
return poItemIDByProduct, nil
}
