-- Drop persisted opening balance fields from chart_of_accounts.
-- Opening balances are now journal-driven (OPENING_BALANCE journal entries).
ALTER TABLE IF EXISTS chart_of_accounts
    DROP COLUMN IF EXISTS opening_balance,
    DROP COLUMN IF EXISTS opening_date;
