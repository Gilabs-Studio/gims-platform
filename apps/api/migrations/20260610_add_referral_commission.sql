BEGIN;

ALTER TABLE sales_referral_accounts
    ADD COLUMN IF NOT EXISTS close_commission_bps integer,
    ADD COLUMN IF NOT EXISTS recurring_commission_bps integer;

CREATE TABLE IF NOT EXISTS referral_commission_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    default_close_commission_bps integer NOT NULL,
    default_recurring_commission_bps integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_referral_commission_configs_is_active ON referral_commission_configs(is_active);

CREATE TABLE IF NOT EXISTS referral_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_referral_account_id uuid NOT NULL,
    sales_referral_code_id uuid NOT NULL,
    sales_referral_conversion_id uuid,
    tenant_id uuid NOT NULL,
    subscription_id uuid,
    payment_transaction_id uuid NOT NULL,
    commission_type varchar(32) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'pending',
    source_net_amount_idr bigint NOT NULL DEFAULT 0,
    commission_bps integer NOT NULL,
    commission_amount_idr bigint NOT NULL DEFAULT 0,
    paid_adjustment_for_id uuid,
    earned_at timestamptz NOT NULL,
    approved_at timestamptz,
    approved_by uuid,
    voided_at timestamptz,
    voided_by uuid,
    void_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_commission_payment_type ON referral_commissions(payment_transaction_id, commission_type);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_account_status ON referral_commissions(sales_referral_account_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_tenant_id ON referral_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_payment_transaction_id ON referral_commissions(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_earned_at ON referral_commissions(earned_at);

CREATE TABLE IF NOT EXISTS referral_commission_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_referral_account_id uuid NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'paid',
    total_amount_idr bigint NOT NULL DEFAULT 0,
    paid_at timestamptz NOT NULL,
    payment_reference varchar(255),
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_referral_commission_payouts_account_id ON referral_commission_payouts(sales_referral_account_id);
CREATE INDEX IF NOT EXISTS idx_referral_commission_payouts_paid_at ON referral_commission_payouts(paid_at);

CREATE TABLE IF NOT EXISTS referral_commission_payout_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id uuid NOT NULL,
    referral_commission_id uuid NOT NULL UNIQUE,
    amount_idr bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_referral_commission_payout_items_payout_id ON referral_commission_payout_items(payout_id);

INSERT INTO referral_commission_configs (default_close_commission_bps, default_recurring_commission_bps, is_active)
SELECT 3000, 300, true
WHERE NOT EXISTS (SELECT 1 FROM referral_commission_configs WHERE is_active = true AND deleted_at IS NULL);

COMMIT;
