-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: order-scoped chat messages
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'driver', 'owner')),
  sender_id   uuid,            -- users.id, drivers.id, or NULL for owner via Telegram
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  read_by_customer boolean NOT NULL DEFAULT false,
  read_by_pro      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_created
  ON order_messages (order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_order_messages_unread_customer
  ON order_messages (order_id) WHERE read_by_customer = false;

CREATE INDEX IF NOT EXISTS idx_order_messages_unread_pro
  ON order_messages (order_id) WHERE read_by_pro = false;
