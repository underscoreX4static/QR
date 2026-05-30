-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: drop variants, simplify products, add batches (FIFO inventory)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Add new columns to products (size, prices, stock, threshold, barcode)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size                  text,
  ADD COLUMN IF NOT EXISTS price_sell            numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_cost            numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_qty             int           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold   int           NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS barcode               text;

-- 2) Update order_items: drop variant_id, add product_id + batch_id
ALTER TABLE order_items
  DROP COLUMN IF EXISTS variant_id,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id),
  ADD COLUMN IF NOT EXISTS batch_id   uuid;

-- 3) Drop variants table (all data already cleaned)
DROP TABLE IF EXISTS variants CASCADE;

-- 4) Create product_batches (FIFO inventory)
CREATE TABLE IF NOT EXISTS product_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_received   int  NOT NULL CHECK (quantity_received > 0),
  quantity_remaining  int  NOT NULL CHECK (quantity_remaining >= 0),
  price_cost          numeric(10,2) NOT NULL,
  price_sell          numeric(10,2) NOT NULL,
  received_at         timestamptz NOT NULL DEFAULT now(),
  supplier            text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 5) Add the FK from order_items.batch_id to product_batches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_batch_id_fkey'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES product_batches(id);
  END IF;
END$$;

-- 6) Index for fast FIFO consumption (oldest non-empty batch per product)
CREATE INDEX IF NOT EXISTS idx_batches_product_fifo
  ON product_batches (product_id, received_at)
  WHERE quantity_remaining > 0;

-- 7) Trigger: keep products.stock_qty = SUM(batches.quantity_remaining)
CREATE OR REPLACE FUNCTION recalc_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  pid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    pid := OLD.product_id;
  ELSE
    pid := NEW.product_id;
  END IF;

  UPDATE products
  SET stock_qty = COALESCE((
    SELECT SUM(quantity_remaining)::int
    FROM product_batches
    WHERE product_id = pid
  ), 0)
  WHERE id = pid;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_batches_recalc_stock ON product_batches;
CREATE TRIGGER trg_batches_recalc_stock
  AFTER INSERT OR UPDATE OR DELETE ON product_batches
  FOR EACH ROW
  EXECUTE FUNCTION recalc_product_stock();
