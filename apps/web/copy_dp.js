const fs = require('fs');
const path = require('path');

const srcFeature = 'e:\\projects\\gitlabs\\gims-platform\\apps\\web\\src\\features\\purchase\\supplier-invoice-down-payments';
const dstFeature = 'e:\\projects\\gitlabs\\gims-platform\\apps\\web\\src\\features\\sales\\customer-invoice-down-payments';

const srcPage = 'e:\\projects\\gitlabs\\gims-platform\\apps\\web\\app\\[locale]\\(dashboard)\\purchase\\supplier-invoice-down-payments';
const dstPage = 'e:\\projects\\gitlabs\\gims-platform\\apps\\web\\app\\[locale]\\(dashboard)\\sales\\customer-invoice-down-payments';

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file => {
            let newFile = file.replace(/supplier-invoice/g, 'customer-invoice').replace(/supplier/g, 'customer');
            copyRecursive(path.join(src, file), path.join(dest, newFile));
        });
    } else {
        let content = fs.readFileSync(src, 'utf8');
        content = content.replace(/supplier-invoice/g, 'customer-invoice');
        content = content.replace(/supplier_invoice/g, 'customer_invoice');
        content = content.replace(/supplierInvoice/g, 'customerInvoice');
        content = content.replace(/SupplierInvoice/g, 'CustomerInvoice');
        
        content = content.replace(/supplier/g, 'customer');
        content = content.replace(/Supplier/g, 'Customer');
        
        content = content.replace(/purchase-order/g, 'sales-order');
        content = content.replace(/purchase_order/g, 'sales_order');
        content = content.replace(/purchaseOrder/g, 'salesOrder');
        content = content.replace(/PurchaseOrder/g, 'SalesOrder');
        
        content = content.replace(/po-/g, 'so-');
        
        // Ensure purchase feature links to sales feature
        content = content.replace(/'@\/features\/purchase\//g, "'@/features/sales/");
        content = content.replace(/\/purchase\//g, "/sales/");
        
        // PO routes / purchase_order
        content = content.replace(/PURCHASE_ORDERS/g, 'SALES_ORDERS');
        
        content = content.replace(/PI-DP-/g, 'CI-DP-');

        fs.writeFileSync(dest, content, 'utf8');
    }
}

copyRecursive(srcFeature, dstFeature);
copyRecursive(srcPage, dstPage);
console.log('Copy complete!');
