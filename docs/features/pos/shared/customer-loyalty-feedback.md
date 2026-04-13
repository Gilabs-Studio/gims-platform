# Customer Loyalty and Feedback

> **Module:** POS -> Shared -> Customer Loyalty
> **Sprint:** Draft Planning
> **Version:** 0.2.0
> **Status:** Draft
> **Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Loyalty Program](#loyalty-program)
3. [Membership Tiers](#membership-tiers)
4. [Point Calculation](#point-calculation)
5. [Point Redemption](#point-redemption)
6. [Customer Feedback](#customer-feedback)
7. [POS Integration](#pos-integration)
8. [Data Model](#data-model)
9. [API Reference](#api-reference)
10. [Frontend Components](#frontend-components)
11. [Business Rules](#business-rules)
12. [Technical Decisions](#technical-decisions)
13. [Notes and Improvements](#notes-and-improvements)

---

## Overview

Customer Loyalty and Feedback provides membership-based loyalty rewards and post-transaction feedback for both POS modes (Goods and F&B). The system integrates into the Customer module and is consumed by POS at checkout.

### Key Principle

> Customer and loyalty data are **owned by the Customer module**. POS reads customer info and writes loyalty point transactions.

## Loyalty Program

### Program Structure

| Component | Description |
|---|---|
| Membership | Customer registers (optional) |
| Points | Earned per transaction based on spend |
| Tiers | Bronze, Silver, Gold, Platinum (configurable) |
| Redemption | Points redeemable for discounts |
| Expiry | Points expire after configurable period |

### Enrollment

- Customer provides name + phone number.
- System creates customer record in Customer module.
- Loyalty membership activated automatically.
- Starting tier: Bronze (default).

## Membership Tiers

| Tier | Minimum Points | Benefits |
|---|---|---|
| Bronze | 0 | Base point earning (1x) |
| Silver | 1,000 | 1.25x point multiplier |
| Gold | 5,000 | 1.5x multiplier + birthday bonus |
| Platinum | 20,000 | 2x multiplier + priority service |

### Tier Evaluation

- Evaluated monthly based on cumulative points earned (not balance).
- Tier upgrade: Immediate when threshold met.
- Tier downgrade: After 3 consecutive months below threshold.

## Point Calculation

### Earning Formula

```
base_points = FLOOR(transaction_total / point_rate)
  where point_rate = configurable (default: Rp 10,000 = 1 point)

tier_multiplier = tier.multiplier (1.0 / 1.25 / 1.5 / 2.0)

earned_points = FLOOR(base_points * tier_multiplier)
```

### Earning Rules

- Points earned only on completed (paid) transactions.
- Void/returned transactions reverse earned points.
- SERVICE items are included in total for point calculation.
- Minimum transaction amount for earning: configurable (default: Rp 10,000).
- Points are per-outlet (earned at any, redeemable at any).

## Point Redemption

### Redemption Options

| Option | Description |
|---|---|
| Discount | Convert points to discount on current transaction |
| Future credit | Store points for future use |

### Redemption Rate

```
discount = points_redeemed * redemption_rate
  where redemption_rate = configurable (default: 1 point = Rp 1,000)
```

### Redemption Rules

- Minimum redemption: configurable (default: 10 points).
- Maximum redemption per transaction: configurable (default: 50% of total).
- Cannot redeem more points than balance.
- Redemption deducted from oldest points first (FIFO).

## Customer Feedback

### Feedback Collection

- Triggered after payment completion.
- Optional: cashier asks or customer self-service.
- Rating: 1-5 stars.
- Optional comment text.

### Feedback Fields

| Field | Type | Description |
|---|---|---|
| transaction_id | UUID | Reference to sales transaction |
| customer_id | UUID (nullable) | Customer if identified |
| outlet_id | UUID | Outlet where transaction occurred |
| rating | int (1-5) | Star rating |
| comment | text | Optional feedback text |
| created_at | timestamptz | Timestamp |

### Feedback Aggregation

- Per outlet: Average rating, trend over time.
- Per product: Rating distribution (future).
- Dashboard widget for managers.

## POS Integration

### At Checkout

```
1. Cashier asks for membership (phone number lookup)
2. IF customer found:
   a. Display name, tier, point balance
   b. Ask if redeeming points
   c. IF yes: Apply point discount to total
3. Process payment (adjusted total)
4. Calculate earned points based on final paid amount
5. Credit points to customer account
6. Display earned points on receipt
```

### Without Membership

- Transaction proceeds normally.
- No points earned or redeemed.
- Cashier can offer enrollment at checkout.

## Data Model

### Customer Loyalty (owned by Customer module)

| Table | Purpose |
|---|---|
| `customers` | Customer master (name, phone, email, tier) |
| `customer_loyalty_points` | Point transaction ledger |
| `customer_loyalty_config` | Program configuration per outlet/company |

### Point Transaction Ledger

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| customer_id | UUID | Customer reference |
| outlet_id | UUID | Where transaction occurred |
| transaction_id | UUID (nullable) | Sales transaction reference |
| type | enum | EARN, REDEEM, EXPIRE, ADJUST |
| points | int | Amount (positive for earn, negative for redeem) |
| description | text | Human-readable description |
| expires_at | timestamptz | Point expiry date |
| created_at | timestamptz | Transaction time |

### Point Balance

```
balance = SUM(points) FROM customer_loyalty_points
  WHERE customer_id = X AND (expires_at IS NULL OR expires_at > NOW())
```

## API Reference

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/customer/customers/lookup?phone=X` | pos.order.read | Lookup customer by phone |
| GET | `/customer/customers/:id/loyalty` | pos.order.read | Get loyalty info (tier, balance) |
| POST | `/customer/customers/:id/loyalty/redeem` | pos.order.create | Redeem points |
| POST | `/customer/customers/:id/loyalty/earn` | system | Earn points (auto on payment) |
| POST | `/pos/orders/:id/feedback` | pos.order.read | Submit feedback |
| GET | `/pos/outlets/:id/feedback-summary` | pos.outlet.read | Feedback aggregation |

## Frontend Components

| Component | Purpose |
|---|---|
| CustomerLookup | Phone number input + search at checkout |
| LoyaltyCard | Display customer name, tier, balance |
| PointRedemption | Redeem points with amount selector |
| PointEarnedDisplay | Show earned points after payment |
| FeedbackDialog | Star rating + comment input |
| FeedbackSummaryWidget | Dashboard feedback aggregation |
| EnrollmentDialog | Quick customer enrollment form |

## Business Rules

- Phone number is unique identifier for customer lookup.
- Points calculated on final paid amount (after discounts, before tax).
- Void/return reverses earned points.
- Expired points cannot be redeemed.
- Tier evaluation runs monthly (batch job).
- Feedback is optional and anonymous if no customer identified.
- Customer enrollment requires minimum: name + phone.
- Points are company-wide (not outlet-specific).

## Technical Decisions

- **Point ledger (append-only)**: Full audit trail, easy to calculate balance and trace history.
- **Tier on customer record**: Cached for fast lookup. Updated by monthly batch job.
- **Phone-based lookup**: Most natural identifier in POS context. Avoids card printing.
- **Feedback on transaction**: Per-transaction granularity for actionable insights.
- **Points company-wide**: Encourages cross-outlet visits.

## Notes and Improvements

### Planned

- Birthday bonus point awards.
- Referral program (earn points for referring friends).
- Point-based rewards catalog (merchandise, vouchers).
- Automated tier notification (email/SMS on tier change).
- Customer analytics dashboard.
- Multi-channel feedback (QR code, WhatsApp).

### Known Limitations

- No card/barcode-based loyalty (phone only).
- No rewards catalog (discount only).
- No referral tracking.
- Tier evaluation is monthly batch, not real-time.
