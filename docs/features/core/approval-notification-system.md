# Approval Notification System

Sistem notifikasi approval global untuk seluruh modul ERP agar submit workflow otomatis mengirim notifikasi ke approver berbasis permission.

## Fitur Utama

- Single source of truth notifikasi di tabel `notifications`
- Resolver approver berbasis `permissions.code` (RBAC)
- Endpoint standar: list, unread count, mark as read
- Frontend reusable: badge, drawer, list item, redirect ke entity
- Polling unread count setiap 10 detik (low cost, tanpa WebSocket)

## Business Rules

- Notifikasi approval dibuat saat status entity berpindah ke `SUBMITTED`/pending approval.
- Penerima notifikasi adalah semua user aktif yang punya permission approval terkait.
- Actor submit tidak menerima notifikasi dirinya sendiri.
- Endpoint notifikasi hanya membaca/mengubah notifikasi milik user login.
- Pagination `per_page` maksimum 100.

## Keputusan Teknis

- Menggunakan polling untuk unread count agar biaya operasional rendah dan maintenance sederhana.
- Tidak memakai WebSocket karena use case approval cukup dengan near-real-time polling.
- Membuat helper reusable `CreateApprovalNotification(...)` agar tidak ada duplikasi logic di setiap modul.
- Notifikasi disimpan sebagai data historis (`is_read`, `read_at`) sehingga dapat diaudit.

## API Endpoints

| Method | Endpoint                             | Description                                                              |
| ------ | ------------------------------------ | ------------------------------------------------------------------------ |
| GET    | `/api/v1/notifications`              | List notifications dengan filter `type`, `entity`, `is_read`, pagination |
| GET    | `/api/v1/notifications/unread-count` | Ambil total notifikasi belum dibaca user login                           |
| POST   | `/api/v1/notifications/:id/read`     | Tandai satu notifikasi sebagai terbaca                                   |

## Permission Mapping (Approve)

| Permission Code                | Entity Type            |
| ------------------------------ | ---------------------- |
| `company.approve`              | `company`              |
| `sales_quotation.approve`      | `sales_quotation`      |
| `sales_order.approve`          | `sales_order`          |
| `delivery_order.approve`       | `delivery_order`       |
| `customer_invoice.approve`     | `customer_invoice`     |
| `customer_invoice_dp.approve`  | `customer_invoice_dp`  |
| `purchase_requisition.approve` | `purchase_requisition` |
| `purchase_order.approve`       | `purchase_order`       |
| `goods_receipt.approve`        | `goods_receipt`        |
| `supplier_invoice.approve`     | `supplier_invoice`     |
| `supplier_invoice_dp.approve`  | `supplier_invoice_dp`  |
| `stock_opname.approve`         | `stock_opname`         |
| `payment.approve`              | `payment`              |
| `non_trade_payable.approve`    | `non_trade_payable`    |
| `budget.approve`               | `budget`               |
| `financial_closing.approve`    | `financial_closing`    |
| `up_country_cost.approve`      | `up_country_cost`      |
| `salary.approve`               | `salary`               |
| `leave_request.approve`        | `leave_request`        |
| `recruitment.approve`          | `recruitment`          |
| `overtime.approve`             | `overtime`             |
| `crm_visit.approve`            | `crm_visit`            |

## Modul Submit yang Sudah Terintegrasi

- Company submit for approval
- Purchase Requisition submit
- Purchase Order submit
- Goods Receipt submit
- Supplier Invoice submit
- Non-Trade Payable submit
- Up Country Cost submit
- CRM Visit Report submit

## Manual Testing

1. Login sebagai requester, submit dokumen (contoh: purchase requisition).
2. Login sebagai approver yang punya permission `purchase_requisition.approve`.
3. Buka notifikasi pada bell icon.
4. Pastikan unread count bertambah dan item notifikasi tampil.
5. Klik item notifikasi, pastikan redirect ke halaman entity terkait dan status notifikasi jadi terbaca.
