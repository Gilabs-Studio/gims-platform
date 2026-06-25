# Xendit Env Setup and Subscription Configuration

Generated: 2026-06-24
Status: Active implementation guide

## Purpose

Dokumen ini menjelaskan cara mengisi env Xendit untuk GIMS dan menjawab pertanyaan operasional yang paling penting:

- key mana dipakai untuk apa,
- permission apa yang perlu diaktifkan di Xendit,
- webhook diarahkan ke endpoint mana,
- apakah subscription plan perlu dibuat manual di dashboard Xendit,
- dan kapan dashboard Subscriptions boleh dipakai.

## Active Environment Variables

```env
XENDIT_BILLING_RECURRING_SECRET_KEY=CHANGE_ME_MONEY_IN_RECURRING_KEY
XENDIT_BILLING_WEBHOOK_TOKEN=CHANGE_ME_BILLING_WEBHOOK_TOKEN
XENDIT_MERCHANT_SETTLEMENT_SECRET_KEY=CHANGE_ME_MONEY_OUT_SETTLEMENT_KEY
XENDIT_SETTLEMENT_WEBHOOK_TOKEN=CHANGE_ME_SETTLEMENT_WEBHOOK_TOKEN
```

## What Each Variable Is For

### `XENDIT_BILLING_RECURRING_SECRET_KEY`

Dipakai oleh aplikasi untuk:

- membuat Xendit Payment Session `SUBSCRIPTION`,
- membuat invoice/hosted checkout untuk pendaftaran tenant,
- menangani recurring renewal subscription tenant,
- fallback money-in untuk POS/self-order bila merchant tidak punya config Xendit sendiri.

Yang perlu diaktifkan pada API key ini:

- `Money-in products`: `Write`
- `Balance`: `Read`
- `Transaction`: `Read`

Yang sebaiknya tetap `None`:

- `Money-out products`
- `xenPlatform Transfers`
- semua permission payout/money-out lain

Tujuan desain ini: kalau key billing bocor, attacker tidak bisa mengirim uang keluar.

### `XENDIT_BILLING_WEBHOOK_TOKEN`

Dipakai untuk verifikasi inbound webhook billing dari Xendit.

Jika di dashboard Xendit kamu hanya melihat satu field lama bernama `Webhook verification token`,
maka gunakan nilai itu di env ini.

Implementasi saat ini memverifikasi header:

- `x-callback-token`

Endpoint aktif saat ini:

- `POST /api/v1/webhooks/xendit/invoice`

Di code sekarang, token ini dipakai oleh handler billing di:

- [xendit_handler.go](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/apps/api/internal/auth/presentation/handler/xendit_handler.go:50)

### `XENDIT_MERCHANT_SETTLEMENT_SECRET_KEY`

Disiapkan untuk fase settlement/payout merchant.

Tujuan nantinya:

- payout 100% ke merchant,
- transfer/disbursement dari balance platform ke rekening merchant,
- worker settlement terpisah dari request billing biasa.

Yang perlu diaktifkan nanti pada API key ini:

- `Money-out products`: `Write`
- `Balance`: `Read`
- `Transaction`: `Read`
- `Report`: `Read`

Hanya aktifkan `xenPlatform` permission kalau nanti benar-benar dipakai untuk onboarding sub-account atau transfer antar account.

### `XENDIT_SETTLEMENT_WEBHOOK_TOKEN`

Disiapkan untuk webhook payout/settlement.

Penting:

- env ini sudah tersedia di config,
- tetapi worker settlement dan endpoint webhook settlement belum diaktifkan di implementasi saat ini.

Jadi untuk sekarang:

- isi env ini boleh disiapkan,
- kalau dashboard kamu belum menampilkan token settlement terpisah, biarkan kosong dulu,
- tapi aplikasi belum memproses settlement webhook production.

## Current Recommendation for Xendit Key Permissions

### Billing / recurring key

Set:

- `Money-in products` = `Write`
- `Balance` = `Read`
- `Transaction` = `Read`

Set ke `None`:

- `Money-out products`
- `Report` bila belum diperlukan
- `xenPlatform Account`
- `xenPlatform Account Holder`
- `xenPlatform Split Payments`
- `xenPlatform Transfers`
- `xenShield`
- `Identity Proofing`

### Settlement key

Set:

- `Money-out products` = `Write`
- `Balance` = `Read`
- `Transaction` = `Read`
- `Report` = `Read`

Set ke `None` dulu:

- seluruh `Money-in products`

## Webhook Configuration

### Billing webhook

Set webhook di Xendit ke:

- `POST https://<your-domain>/api/v1/webhooks/xendit/invoice`

Token verification:

- samakan callback token di dashboard Xendit dengan `XENDIT_BILLING_WEBHOOK_TOKEN`
- jika dashboard hanya menampilkan satu `Webhook verification token`, itu yang dipakai di sini

Webhook yang relevan untuk alur recurring kita:

- `payment_session.completed`
- `payment_token.activation`
- `recurring_plan.activated`
- `recurring.cycle.succeeded`
- `payment.succeeded`
- `recurring.cycle.retrying`
- `recurring.cycle.failed`
- `payment.refunded`
- `payment.chargeback`

### POS / self-order payment webhook

Set webhook POS invoice di Xendit ke:

- `POST https://<your-domain>/api/v1/pos/payments/xendit/webhook`

Endpoint ini public untuk server-to-server callback Xendit, tetapi tetap diverifikasi dengan header `x-callback-token` yang nilainya sama dengan `XENDIT_BILLING_WEBHOOK_TOKEN`.

Ketika webhook Xendit mengonfirmasi invoice `PAID`, backend akan:

- update status payment POS menjadi `PAID`,
- finalize order POS,
- publish WebSocket event `pos.payment_confirmed`,
- update staff terminal/live-table tanpa polling fetch.

### Settlement webhook

Belum aktif di code saat ini.

Kalau nanti worker settlement dibuat, webhook settlement harus dipisah dari billing agar:

- token verifikasi berbeda,
- log dan retry policy berbeda,
- blast radius lebih kecil.

## Do We Need to Manually Create Subscription Plans in Xendit Dashboard?

Jawaban pendek:

- untuk flow GIMS saat ini: **tidak perlu**
- yang kita butuhkan: **cukup API key + webhook token**

Alasannya:

1. Harga subscription GIMS bersifat dinamis.
2. Nominal bisa berubah berdasarkan:
   - plan,
   - billing period,
   - jumlah seat,
   - upgrade/downgrade,
   - coupon/referral,
   - add-on.
3. Xendit dashboard form “Create Plan” lebih cocok untuk membuat plan per-customer / per-link secara manual.
4. GIMS sekarang membentuk subscription request via API saat user checkout, jadi input customer dan amount datang dari aplikasi, bukan diisi manual di dashboard.

## How the Dashboard Form Maps to Our App

Form dashboard Xendit seperti:

- `Reference ID`
- `Customer ID`
- `Plan description`
- `Currency`
- `Payment amount per cycle`
- `Do you want to charge your customer immediately?`

Dalam GIMS, field-field itu sudah dibentuk otomatis oleh backend dari input user:

- `Reference ID`
  - diisi otomatis dari token registrasi / recurring reference internal GIMS
- `Customer`
  - dibentuk otomatis dari nama dan email user yang daftar
- `Plan description`
  - dibentuk otomatis dari nama paket + billing period + seat count
- `Currency`
  - saat ini `IDR`
- `Payment amount per cycle`
  - dihitung otomatis dari pricing engine GIMS
- `Charge customer immediately`
  - saat ini direkomendasikan `Yes`

Artinya:

- yang diisi user adalah **langganan GIMS-nya**
- bukan “plan Xendit” secara manual

## Why We Skip Manual Dashboard Plan Creation

Kita skip manual dashboard plan creation karena:

- rawan mismatch harga antara dashboard dan pricing app,
- seat upgrade/downgrade akan cepat out of sync,
- coupon dan pricing promo tidak praktis jika plan statis,
- sulit diaudit kalau sebagian plan dibuat manual dan sebagian via API,
- dashboard subscriptions saat ini pada docs Xendit masih disebut tersedia untuk legacy subscription flow.

Jadi strategi yang direkomendasikan:

- **dashboard Xendit dipakai untuk aktivasi channel, melihat webhook/report, dan troubleshooting**
- **plan recurring dibuat otomatis oleh aplikasi via API**

## Immediate Charge: Yes or No?

Untuk GIMS saat ini, pilih:

- `Yes`

Alasan:

- tenant tidak langsung aktif hanya karena payment method berhasil di-link,
- tenant baru diprovision setelah initial recurring payment benar-benar sukses,
- ini paling aman untuk billing SaaS production.

Kalau `No`:

- user bisa link payment method,
- tetapi charge pertama menunggu siklus pertama,
- ini membuat onboarding SaaS lebih rumit karena akun belum tentu layak langsung diaktifkan.

## Practical Setup Steps

1. Buat API key billing recurring di Xendit dashboard.
2. Aktifkan permission:
   - `Money-in products` = `Write`
   - `Balance` = `Read`
   - `Transaction` = `Read`
3. Simpan ke:
   - `XENDIT_BILLING_RECURRING_SECRET_KEY`
4. Buat callback token webhook billing.
5. Simpan ke:
   - `XENDIT_BILLING_WEBHOOK_TOKEN`
   - jika dashboard hanya menampilkan satu `Webhook verification token`, copy nilai itu ke env ini
6. Set webhook URL:
   - `https://<your-domain>/api/v1/webhooks/xendit/invoice`
7. Aktifkan:
   - `XENDIT_RECURRING_SESSIONS_ENABLED=true`
8. Siapkan key settlement terpisah, tapi jangan dipakai di request billing biasa.
9. Simpan ke:
   - `XENDIT_MERCHANT_SETTLEMENT_SECRET_KEY`
10. `XENDIT_SETTLEMENT_WEBHOOK_TOKEN` belum wajib diisi sampai settlement webhook endpoint benar-benar diaktifkan.

## What Is Already Automated by GIMS

Sudah di-handle aplikasi:

- create payment session `SUBSCRIPTION`,
- redirect user ke hosted checkout Xendit,
- simpan recurring metadata,
- tunggu webhook paid/cycle success,
- provision tenant setelah initial payment berhasil,
- renewal recurring,
- seat upgrade/downgrade agar mengikuti renewal amount,
- platform-managed Xendit untuk POS/self-order.

Belum aktif:

- payout merchant otomatis,
- settlement webhook processing,
- mapping final `channel_code` payout merchant dari bank master GIMS.

## Recommended Operating Decision

Untuk production sekarang:

- isi 4 env Xendit di atas,
- jangan create subscription plan manual di dashboard untuk pricing GIMS normal,
- gunakan dashboard hanya untuk observability dan manual testing,
- biarkan aplikasi yang membentuk recurring subscription berdasarkan input user checkout.

## Related Files

- [xendit-recurring-and-settlement-prd.md](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/docs/features/billing/xendit-recurring-and-settlement-prd.md)
- [.env.example](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/apps/api/.env.example:91)
- [.env.production.example](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/apps/api/.env.production.example:151)
- [config.go](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/apps/api/internal/core/infrastructure/config/config.go:253)
- [xendit_handler.go](/home/kevin/Documents/GiLabs/Projects/GIMS%20by%20GILABS/apps/api/internal/auth/presentation/handler/xendit_handler.go:50)

## External References

- Xendit Create Session: https://docs.xendit.co/v1-api/apidocs/create-session
- Xendit Subscriptions Overview: https://docs.xendit.co/docs/subscriptions-overview
- Xendit How Subscriptions Work: https://docs.xendit.co/docs/how-subscriptions-work
- Xendit Payouts via API: https://docs.xendit.co/docs/payouts-via-api
