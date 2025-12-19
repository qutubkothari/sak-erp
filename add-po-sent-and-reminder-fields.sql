-- Adds timestamps needed for automatic tracking reminders

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_reminder_last_sent_at TIMESTAMPTZ;

-- Backfill for existing SENT POs so reminders can start
UPDATE purchase_orders
SET sent_at = COALESCE(sent_at, updated_at, created_at, NOW())
WHERE status <> 'DRAFT' AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_sent_at
  ON purchase_orders (sent_at)
  WHERE sent_at IS NOT NULL;
