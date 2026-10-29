-- Back up the database first. Run this only on an EXISTING database created from the prior starter.
ALTER TABLE public.venom_divisions ALTER COLUMN fee_cents DROP NOT NULL;
ALTER TABLE public.venom_divisions ALTER COLUMN fee_cents DROP DEFAULT;
ALTER TABLE public.venom_divisions ADD COLUMN IF NOT EXISTS pricing_announced_at timestamptz;
ALTER TABLE public.venom_reservations ADD COLUMN IF NOT EXISTS payment_window_started_at timestamptz;
ALTER TABLE public.venom_reservations ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.venom_reservations ALTER COLUMN expires_at DROP DEFAULT;
-- WARNING: reset existing test registrations only after verifying there are no real paid reservations.
-- Existing reservations retain their original deadlines until explicitly migrated; do NOT run this blindly on production data.
-- Replace the existing venom_reserve function with the version in schema.sql (the CREATE OR REPLACE FUNCTION section).
-- Install venom_announce_price function from schema.sql. Then add missing Big Man divisions with fee_cents NULL.
