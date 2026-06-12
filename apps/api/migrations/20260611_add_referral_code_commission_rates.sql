-- Add per-referral-code commission rates.
-- Defaults mirror current global commission config (30% close, 3% recurring).

ALTER TABLE sales_referral_codes
  ADD COLUMN IF NOT EXISTS close_commission_bps integer NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS recurring_commission_bps integer NOT NULL DEFAULT 300;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_referral_codes_close_commission_bps'
  ) THEN
    ALTER TABLE sales_referral_codes
      ADD CONSTRAINT chk_sales_referral_codes_close_commission_bps
      CHECK (close_commission_bps >= 0 AND close_commission_bps <= 10000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sales_referral_codes_recurring_commission_bps'
  ) THEN
    ALTER TABLE sales_referral_codes
      ADD CONSTRAINT chk_sales_referral_codes_recurring_commission_bps
      CHECK (recurring_commission_bps >= 0 AND recurring_commission_bps <= 10000);
  END IF;
END $$;
