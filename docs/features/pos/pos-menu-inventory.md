# POS Menu Module Inventory

> **Module:** POS
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Purpose](#purpose)
2. [Menu-Based Module List](#menu-based-module-list)
3. [Changed Modules](#changed-modules)
4. [New Modules](#new-modules)
5. [Shared Dependency Modules](#shared-dependency-modules)
6. [Frontend Feature Folders](#frontend-feature-folders)
7. [Notes](#notes)

---

## Purpose

This inventory follows the menu structure the user sees in POS. It separates menu modules like Floor & Layout, Product, and Sales POS from shared dependencies like Stock and Customer.

## Menu-Based Module List

| Menu Group | Status | Doc / Folder | Notes |
|---|---|---|---|
| Layout Floor | Updated | [layout/floor-layout-designer.md](layout/floor-layout-designer.md) | Floor editor feature doc. |
| Layout Floor | Updated | [layout/floor-layout-designer-prd.md](layout/floor-layout-designer-prd.md) | Floor editor PRD. |
| Live Table Map | Updated | [pos-live-operations-prd.md](pos-live-operations-prd.md) | Live operations surface for F&B mode. |
| Reservation | Updated | [pos-live-operations-prd.md](pos-live-operations-prd.md) | Reservation list and waiting list live here. |
| Waiting List | Updated | [pos-live-operations-prd.md](pos-live-operations-prd.md) | Standalone waiting queue inside live operations. |
| Product | Updated | [product/product-fnb-prd.md](product/product-fnb-prd.md) | Goods + F&B product split and recipe overlay. |
| Sales POS | New | [sales/sales-pos-prd.md](sales/sales-pos-prd.md) | POS sales workspace for goods/distributor mode. |
| Overview | Updated | [pos-live-operations-prd.md](pos-live-operations-prd.md) | Shared POS entry page. |
| Customer Loyalty & Feedback | Updated | [shared/customer-loyalty-feedback.md](shared/customer-loyalty-feedback.md) | Shared customer lookup and feedback flow. |

## Changed Modules

- Floor & Layout Designer is now a dedicated layout menu module.
- Product is extended with goods and F&B product kinds, plus recipe detail.
- Inventory Stock stays owned by Stock, and recipe stock should appear as a filtered tab or view inside the existing inventory feature instead of a separate ingredient inventory menu.
- Live Table Map, Reservation, Waiting List, and Overview stay in the live operations bundle but keep their own menu responsibilities.
- Customer Loyalty & Feedback remain shared modules, and the POS docs now point to the existing dependencies explicitly.

## New Modules

- Sales POS is a new POS menu branch for goods/distributor workflows.
- The product recipe overlay is a new behavior inside the existing Product module, not a separate ingredient inventory menu.

## Shared Dependency Modules

| Dependency | Impact | Notes |
|---|---|---|
| Stock | Updated indirectly | Inventory stock deduction is driven by F&B product recipe detail; the existing inventory feature can expose a recipe-stock tab/filter for F&B ingredients. |
| Purchase | Updated indirectly | Recipe consumption can feed replenishment and supplier invoice flows. |
| Sales | Existing core | Billing and settlement still live in the Sales module boundary. |
| Reports | Existing core | Operational analytics stay in the reporting module. |

## Frontend Feature Folders

| Folder | Status | Notes |
|---|---|---|
| [apps/web/src/features/pos/fb/floor-layout](../../../../apps/web/src/features/pos/fb/floor-layout) | Existing | Floor layout feature folder already attached by the user. |
| `apps/web/src/features/pos/fb/live-table-map` | Planned / existing shell | Live table map workspace. |
| `apps/web/src/features/pos/fb/reservation` | Planned / existing shell | Reservation workspace. |
| `apps/web/src/features/pos/fb/waiting-list` | Planned / existing shell | Waiting list workspace. |
| `apps/web/src/features/pos/fb/product` | Planned | Product F&B projection and recipe overlay. |
| `apps/web/src/features/pos/goods/sales-pos` | Planned | Goods/distributor sales workspace. |

## Notes

- The old ingredient inventory split is removed. Recipe lives on Product, and stock-for-recipe is a filtered view inside the existing Inventory Stock feature.
- Company data is not documented here because the existing Company module already owns it.
- If you want, the next pass can rename the POS docs folders again so they mirror the same menu groups in frontend as well.
