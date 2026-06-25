-- Migration: 20260625_create_pos_settlement_payouts.sql
-- Author: Codex
-- Purpose: create tenant-scoped POS settlement payout ledger for Xendit money-out tracking.
-- Rollback: DROP TABLE IF EXISTS pos_settlement_payouts;

CREATE TABLE IF NOT EXISTS pos_settlement_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  reference_id varchar(255) NOT NULL UNIQUE,
  idempotency_key varchar(100) NOT NULL,
  xendit_payout_id varchar(100),
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  amount decimal(15,2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'IDR',
  channel_code varchar(50) NOT NULL,
  account_number_masked varchar(100) NOT NULL,
  account_holder_name varchar(100) NOT NULL,
  description varchar(100),
  failure_code varchar(100),
  failure_reason text,
  estimated_arrival_time timestamptz,
  requested_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_settlement_payouts_tenant_id
  ON pos_settlement_payouts (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_settlement_payouts_tenant_idempotency
  ON pos_settlement_payouts (tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_pos_settlement_payouts_status
  ON pos_settlement_payouts (status);

CREATE INDEX IF NOT EXISTS idx_pos_settlement_payouts_xendit_payout_id
  ON pos_settlement_payouts (xendit_payout_id)
  WHERE xendit_payout_id IS NOT NULL;
