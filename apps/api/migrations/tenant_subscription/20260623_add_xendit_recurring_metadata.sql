-- Migration: 20260623_add_xendit_recurring_metadata.sql
-- Author: Codex
-- Purpose: Add nullable Xendit recurring/payment-session metadata for production-safe subscription billing rollout.
-- Rollback:
--   DROP INDEX IF EXISTS idx_tenant_subscriptions_recurring_reference_id;
--   DROP INDEX IF EXISTS idx_tenant_subscriptions_xendit_payment_session_id;
--   DROP INDEX IF EXISTS idx_tenant_subscriptions_xendit_recurring_plan_id;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS last_recurring_event_id;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS recurring_status;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS pending_renewal_amount_idr;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS renewal_amount_idr;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS recurring_reference_id;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS xendit_payment_token_id;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS xendit_payment_session_id;
--   ALTER TABLE tenant_subscriptions DROP COLUMN IF EXISTS xendit_recurring_plan_id;

ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS xendit_recurring_plan_id varchar(255),
  ADD COLUMN IF NOT EXISTS xendit_payment_session_id varchar(255),
  ADD COLUMN IF NOT EXISTS xendit_payment_token_id varchar(255),
  ADD COLUMN IF NOT EXISTS recurring_reference_id varchar(255),
  ADD COLUMN IF NOT EXISTS renewal_amount_idr bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_renewal_amount_idr bigint,
  ADD COLUMN IF NOT EXISTS recurring_status varchar(50),
  ADD COLUMN IF NOT EXISTS last_recurring_event_id varchar(255);

UPDATE tenant_subscriptions
SET renewal_amount_idr = amount_paid_idr
WHERE renewal_amount_idr = 0
  AND amount_paid_idr > 0;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_xendit_recurring_plan_id
  ON tenant_subscriptions (xendit_recurring_plan_id)
  WHERE xendit_recurring_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_xendit_payment_session_id
  ON tenant_subscriptions (xendit_payment_session_id)
  WHERE xendit_payment_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_recurring_reference_id
  ON tenant_subscriptions (recurring_reference_id)
  WHERE recurring_reference_id IS NOT NULL;
