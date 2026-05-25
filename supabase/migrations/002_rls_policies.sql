-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies
--
-- Architecture: all data access goes through Next.js API routes using the
-- supabaseAdmin client (service_role key), which bypasses RLS entirely.
-- The anon key is used only for the Supabase JS client in lib/supabase.ts
-- and should never have direct table access.
--
-- Policy pattern: deny everything for anon/authenticated roles.
-- service_role always bypasses RLS — no policy needed for it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── partners ─────────────────────────────────────────────────────────────────
-- No public access — managed exclusively via admin API routes
create policy "no_access" on partners for all to anon, authenticated using (false);

-- ─── qr_codes ─────────────────────────────────────────────────────────────────
-- QR slugs are resolved server-side, not exposed directly to clients
create policy "no_access" on qr_codes for all to anon, authenticated using (false);

-- ─── users ────────────────────────────────────────────────────────────────────
-- User records are created/read via bot webhook only
create policy "no_access" on users for all to anon, authenticated using (false);

-- ─── qr_scans ─────────────────────────────────────────────────────────────────
create policy "no_access" on qr_scans for all to anon, authenticated using (false);

-- ─── categories ───────────────────────────────────────────────────────────────
create policy "no_access" on categories for all to anon, authenticated using (false);

-- ─── products ─────────────────────────────────────────────────────────────────
create policy "no_access" on products for all to anon, authenticated using (false);

-- ─── variants ─────────────────────────────────────────────────────────────────
create policy "no_access" on variants for all to anon, authenticated using (false);

-- ─── drivers ──────────────────────────────────────────────────────────────────
create policy "no_access" on drivers for all to anon, authenticated using (false);

-- ─── orders ───────────────────────────────────────────────────────────────────
create policy "no_access" on orders for all to anon, authenticated using (false);

-- ─── order_items ──────────────────────────────────────────────────────────────
create policy "no_access" on order_items for all to anon, authenticated using (false);

-- ─── order_status_history ─────────────────────────────────────────────────────
create policy "no_access" on order_status_history for all to anon, authenticated using (false);

-- ─── settlements ──────────────────────────────────────────────────────────────
create policy "no_access" on settlements for all to anon, authenticated using (false);

-- ─── settlement_orders ────────────────────────────────────────────────────────
create policy "no_access" on settlement_orders for all to anon, authenticated using (false);

-- ─── settings ─────────────────────────────────────────────────────────────────
create policy "no_access" on settings for all to anon, authenticated using (false);
