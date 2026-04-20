-- =============================================================================
-- Migration: Enforce phone number format on crm_leads
-- Date:      20260420
-- Author:    GIMS Platform
-- Description:
--   1. Sanitize existing phone data — strip characters that don't belong in a
--      phone number so existing rows won't violate the new CHECK constraint.
--   2. Resize the phone column from varchar(30) to varchar(20).
--      (E.164 max is 15 digits; 20 chars is generous for +, -, spaces, parens.)
--   3. Add a CHECK constraint that enforces the phone number format going
--      forward: optional leading "+", then only digits, spaces, hyphens, and
--      parentheses.
-- =============================================================================

-- Step 1: Sanitize existing data
-- Remove any character that is NOT a digit, +, -, space, or parenthesis.
-- This prevents the upcoming CHECK constraint from rejecting pre-existing rows.
UPDATE crm_leads
SET phone = regexp_replace(phone, '[^0-9+\-\s()]', '', 'g')
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone ~ '[^0-9+\-\s()]';

-- Truncate any remaining values that still exceed 20 characters after cleanup
-- (extremely unlikely, but guards against edge cases).
UPDATE crm_leads
SET phone = left(phone, 20)
WHERE length(phone) > 20;

-- Step 2: Resize the column from varchar(30) → varchar(20)
-- PostgreSQL allows shrinking a varchar column in-place as long as all existing
-- values fit within the new limit (guaranteed by the truncation step above).
ALTER TABLE crm_leads
  ALTER COLUMN phone TYPE varchar(20);

-- Step 3: Add CHECK constraint for phone format
-- Allows:
--   • empty string  (phone is optional)
--   • an optional leading "+"
--   • digits (0-9), spaces, hyphens (-), and parentheses ( )
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_crm_leads_phone_format'
      AND conrelid = 'crm_leads'::regclass
  ) THEN
    ALTER TABLE crm_leads
      ADD CONSTRAINT chk_crm_leads_phone_format
      CHECK (phone = '' OR phone ~ '^\+?[0-9 \-\(\)]+$');
  END IF;
END $$;
