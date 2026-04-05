# POS Customer Loyalty and Feedback

> **Module:** POS -> Shared Modules -> Master Data -> Customer
> **Sprint:** Draft Planning
> **Version:** 0.1.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [What Needs to Change](#what-needs-to-change)
3. [Scope](#scope)
4. [Data Ownership and Integration](#data-ownership-and-integration)
5. [Business Rules](#business-rules)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [Technical Decisions](#technical-decisions)
9. [Notes and Open Questions](#notes-and-open-questions)

---

## Overview

POS does not own customer master data. It needs customer lookup in the order drawer, loyalty visibility for settled transactions, and outlet-scoped feedback capture through a public barcode or QR flow.

This document describes the POS-facing delta that should sit on top of the existing Customer module.

## What Needs to Change

- Add a POS-ready customer projection so cashier search stays fast in the order drawer.
- Expose loyalty balance, earn history, and redeem eligibility in a read-only summary.
- Keep customer CRUD, type management, and approval workflow inside the Customer module.
- Add outlet-scoped feedback metadata such as `outlet_id`, `table_id`, `invoice_id`, and `barcode_id`.
- Keep public feedback submission separate from internal CRM campaign logic.

## Scope

### In Scope

- Customer lookup for cashier and host workflows.
- Loyalty points summary and redeem preview.
- Public outlet feedback submission.
- Member versus guest identification in live operations.
- Optional customer selection during POS order creation.

### Out of Scope

- CRM campaign automation.
- Customer master approval redesign.
- Credit management or AR policy changes.
- Advanced segmentation and marketing orchestration.

## Data Ownership and Integration

| Domain | Ownership | Notes |
|---|---|---|
| Customer core | Master Data -> Customer | Source of truth for identity and customer relations. |
| Loyalty summary | Master Data -> Customer | Points and redemption data should remain master-driven. |
| Feedback submission | POS | Public flow uses outlet-scoped metadata and is linked back to customer master. |
| Order drawer customer lookup | POS | Uses a read-only projection so live operations stay fast. |

### Integration Boundary

- POS reads customer data from the existing Customer module and must not duplicate master records.
- Loyalty changes should happen after the transaction is settled, not during draft creation.
- Feedback records must be outlet-specific so franchise branches do not mix survey data.
- Guest orders must still work when no customer is selected.

## Business Rules

- Customer selection is optional for walk-in orders.
- Loyalty points should be granted only after the sale is committed.
- Loyalty redemption must respect outlet policy and any maximum redemption limit.
- Feedback must be tied to an outlet, and where relevant to a table or invoice.
- Public feedback barcodes must not be reusable across outlets.
- Customer master data must remain the canonical source of contact and identity data.

## API Reference

The Customer module already exposes the master data routes under `/customer`.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/customer/customers` | customer.read | List customers. |
| GET | `/customer/customers/form-data` | customer.read | Get customer form dropdown data. |
| GET | `/customer/customers/:id` | customer.read | Get customer detail. |
| POST | `/customer/customers` | customer.create | Create customer. |
| PUT | `/customer/customers/:id` | customer.update | Update customer. |
| DELETE | `/customer/customers/:id` | customer.delete | Delete customer. |
| GET | `/customer/customer-types` | customer.read | List customer types. |
| POST | `/pos/outlets/{outletId}/feedback/{barcodeId}` | public | Submit outlet feedback from a public barcode or QR page. |

## Frontend Components

| Component | Purpose |
|---|---|
| CustomerLookupDrawer | Lets cashier search and attach a customer to the order. |
| LoyaltyPointsChip | Shows current points and redeem eligibility. |
| MemberRedeemDialog | Confirms redemption before applying it to an order. |
| FeedbackBarcodePage | Public outlet feedback form opened from QR or barcode. |
| CustomerInsightCard | Summarizes customer state inside the POS shell. |

## Technical Decisions

- **Keep customer master separate from POS**: The customer module already owns identity, types, and approval, so POS should consume a projection rather than duplicating the model.
- **Post loyalty after settlement**: Points must reflect committed sales to avoid reward abuse and reconciliation drift.
- **Use a public feedback page for guests**: A public outlet-specific page is simpler than forcing feedback inside the cashier workflow.
- **Preserve guest-first checkout**: POS should still work when a customer is not known or not selected.

## Notes and Open Questions

- Should loyalty summary be cached per outlet for the cashier drawer?
- Should feedback submission support anonymous guest mode only, or allow customer binding when a member is recognized?
- Should redeem rules be configured per outlet or per franchise group?
