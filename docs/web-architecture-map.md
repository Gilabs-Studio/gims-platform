# GIMS Frontend (`apps/web`) Architecture & Feature Mapping

**Updated:** 2026-08-30
**Tech Stack:** Next.js 16 (Turbopack, App Router) + React 19 + Tailwind CSS v4 + TanStack Query v5 + next-intl

---

## 1. High-Level Directory Overview

```text
apps/web/
├── app/                                    # Next.js App Router (130+ routes)
│   ├── [locale]/                           # Localized Routes (next-intl)
│   │   ├── (dashboard)/                    # Main ERP Dashboard Views
│   │   ├── (landing)/                      # Public Marketing & Landing
│   │   ├── (public)/                       # Public-facing modules (e.g. POS Self-Order)
│   │   ├── (system-admin)/                 # System Admin Dashboard
│   │   ├── login/, register/, etc.         # Authentication Pages
│   │   ├── layout.tsx                      # Root Locale Layout
│   │   └── page.tsx                        # Root Entry Page
│   ├── api/                                # Internal API Routes (lucide-icons, image-search)
│   └── finance/                            # Compatibility / Legacy Redirect Handlers
│
├── src/
│   ├── components/                         # Global Reusable Design System
│   │   ├── ui/                             # Primitive Components (Radix + Tailwind)
│   │   ├── layouts/                        # App Shell, Sidebar, Header, Command Palette
│   │   ├── landing/                        # Landing page blocks
│   │   ├── motion/                         # Framer Motion transitions
│   │   ├── navigation/                     # Breadcrumb, Pagination
│   │   └── providers/                      # React Query, Theme, Toast, Auth
│   │
│   ├── features/                           # 25 Domain Slices (Feature-Based Architecture)
│   ├── lib/                                # Core Singletons, Axios Client, Configs
│   ├── i18n/                               # Localization Setup & Dictionary Aggregation
│   ├── hooks/                              # Cross-cutting Global React Hooks
│   ├── contexts/                           # Global UI Contexts
│   └── types/                              # Global TypeScript Definitions
```

---

## 2. Feature Slices Breakdown (25 Modules)

Setiap modul fitur mengikuti **Feature-Based Architecture** dengan aturan pemisahan logika bisnis (UI hanya di `components/`, query/mutasi/state di `hooks/`).

### A. Compound Features (Multi-Slice Domain)

| Feature Domain | Total Files | Sub-Modules / Slices |
| :--- | :---: | :--- |
| **`master-data`** | 317 | `currencies`, `customer`, `employee`, `geographic`, `leave-type`, `organization`, `outlet`, `payment-and-couriers`, `product`, `supplier`, `user-management`, `warehouse` |
| **`finance`** | 262 | `aging-reports`, `asset-categories`, `asset-locations`, `assets`, `bank-accounts`, `bank-reconciliation`, `bank-transfer`, `budget`, `cash-bank-transactions`, `closing`, `coa`, `fixed-assets`, `journals`, `non-trade-payables`, `payments`, `reports`, `settings`, `shared`, `tax-invoices` |
| **`crm`** | 183 | `activity`, `activity-type`, `area-mapping`, `contact`, `contact-role`, `deal`, `lead`, `lead-source`, `lead-status`, `pipeline-stage`, `sales-targets`, `schedule`, `task`, `visit-report` |
| **`hrd`** | 145 | `attendance-records`, `evaluation`, `holidays`, `leave-request`, `overtime`, `payroll`, `recruitment`, `salary-structures`, `work-schedules` |
| **`manufacturing`**| 122 | `csv-audit-trail`, `csv-validation`, `downtime`, `live-monitoring`, `machines`, `oee`, `quality-andon`, `work-orders` |
| **`purchase`** | 105 | `goods-receipt`, `orders`, `payable-recap`, `payments`, `requisitions`, `returns`, `supplier-invoice-down-payments`, `supplier-invoices` |
| **`sales`** | 99 | `customer-invoice-down-payments`, `delivery`, `invoice`, `order`, `payments`, `quotation`, `receivables-recap`, `returns` |
| **`reports`** | 87 | `customer-research`, `geo-performance`, `product-analysis`, `sales-overview`, `supplier-research` |
| **`pos`** | 65 | `fb`, `feedback`, `self-order`, `terminal`, `stores` |
| **`general`** | 49 | `dashboard` widgets & overview statistics |
| **`stock`** | 44 | `inventory`, `stock-ledger`, `stock-movement`, `stock-opname` |
| **`travel`** | 21 | `travel-planner`, `visit-planner` |

### B. Single-Slice Features

| Feature Domain | Total Files | Purpose & Capabilities |
| :--- | :---: | :--- |
| **`system-admin`** | 30 | Tenant management, system audit logs, feature flags, subscriptions |
| **`auth`** | 27 | Login, register, 2FA, session refresh, reset password |
| **`settings`** | 24 | User profile, company settings, system parameters |
| **`asset-borrowing`**| 17 | Loan requests, return approval, asset condition checks |
| **`loyalty`** | 17 | Customer loyalty points, reward vouchers, tier thresholds |
| **`ai-chat`** | 16 | AI assistant widget, session persistence, streaming UI bubble |
| **`room-booking`** | 15 | Meeting room schedule, visual room calendar, reservation form |
| **`it-support`** | 13 | IT ticket submission, hardware repair tracking |
| **`hr-support`** | 12 | HR queries, employee ticketing, grievance handling |
| **`notifications`** | 10 | Central notification store, popover dropdown, badge counters |
| **`command-palette`**| 7 | Global quick actions modal (Ctrl+K) |
| **`feedback`** | 3 | In-app customer & employee feedback |
| **`landing`** | 2 | Landing page translations and localized copy |

---

## 3. Developer Experience (DX) & Performance Optimizations

### 1. Persistent Disk Caching
* Script `pnpm dev` mempertahankan cache `.next` dan `.turbo` sehingga halaman yang sudah pernah dikompilasi akan me-load dalam **sub-detik (< 500ms)**.
* Untuk pembersihan cache manual, gunakan `pnpm dev:clean` atau `pnpm clean:cache`.

### 2. Node.js Memory Allocation
* Alokasi heap V8 diatur ke `--max-old-space-size=6144` (6GB) untuk mencegah *GC thrashing* dan *out-of-memory crash* saat mengompilasi rute besar.

### 3. SWC Module Optimization (`optimizePackageImports`)
Dikonfigurasi di `next.config.ts` untuk memecah barrel import menjadi file direct import:
* `lucide-react` (600+ pemakaian)
* `date-fns`, `date-fns-tz`
* `recharts`, `framer-motion`
* `@radix-ui/react-*` (15+ primitives)
* `@tanstack/react-query`, `@tanstack/react-virtual`
* `leaflet`, `react-leaflet`, `cmdk`, `sonner`, `@dnd-kit/*`

### 4. Dynamic Menu Icons (`src/lib/menu-icons.tsx`)
* Pemetaan 107 ikon `lucide-react` disimpan sebagai referensi komponen fungsi `LucideIcon`, bukan instansiasi JSX statis.
* Mendukung kustomisasi ukuran/warna via parameter `getMenuIcon(name, className)`.

