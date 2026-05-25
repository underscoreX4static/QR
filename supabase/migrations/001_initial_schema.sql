-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
  'cancelled'
);

create type settlement_type as enum ('driver', 'partner');

create type settlement_status as enum (
  'proposed',
  'driver_confirmed',
  'paid',
  'payment_received',
  'partner_confirmed'
);

-- ─── partners ─────────────────────────────────────────────────────────────────
create table partners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text not null,
  contact_name text not null,
  contact_phone text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table partners enable row level security;

-- ─── qr_codes ─────────────────────────────────────────────────────────────────
create table qr_codes (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  slug       text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table qr_codes enable row level security;

-- ─── users ────────────────────────────────────────────────────────────────────
create table users (
  id               uuid primary key default gen_random_uuid(),
  telegram_id      text not null unique,
  first_name       text not null,
  last_name        text,
  phone            text,
  default_address  text,
  first_qr_source  uuid references qr_codes(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table users enable row level security;

-- ─── qr_scans ─────────────────────────────────────────────────────────────────
create table qr_scans (
  id               uuid primary key default gen_random_uuid(),
  qr_code_id       uuid not null references qr_codes(id) on delete cascade,
  user_id          uuid references users(id) on delete set null,
  telegram_user_id text not null,
  scanned_at       timestamptz not null default now()
);

alter table qr_scans enable row level security;

create index idx_qr_scans_qr_code_id on qr_scans(qr_code_id);

-- ─── categories ───────────────────────────────────────────────────────────────
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  image_url  text,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

alter table categories enable row level security;

-- ─── products ─────────────────────────────────────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  name        text not null,
  description text,
  image_url   text,
  is_active   boolean not null default true
);

alter table products enable row level security;

-- ─── variants ─────────────────────────────────────────────────────────────────
create table variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  size        text not null,
  price_sell  numeric(10,2) not null,
  price_cost  numeric(10,2) not null,
  stock_qty   integer not null default 0,
  is_active   boolean not null default true
);

alter table variants enable row level security;

-- ─── drivers ──────────────────────────────────────────────────────────────────
create table drivers (
  id          uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  first_name  text not null,
  last_name   text,
  is_owner    boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table drivers enable row level security;

-- ─── orders ───────────────────────────────────────────────────────────────────
create table orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete restrict,
  qr_code_id       uuid not null references qr_codes(id) on delete restrict,
  driver_id        uuid references drivers(id) on delete set null,
  status           order_status not null default 'pending',
  delivery_address text not null,
  delivery_fee     numeric(10,2) not null default 0,
  subtotal         numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  notes            text,
  scheduled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table orders enable row level security;

create index idx_orders_status    on orders(status);
create index idx_orders_user_id   on orders(user_id);
create index idx_orders_driver_id on orders(driver_id);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ─── order_items ──────────────────────────────────────────────────────────────
create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  variant_id       uuid not null references variants(id) on delete restrict,
  quantity         integer not null check (quantity > 0),
  unit_price_sell  numeric(10,2) not null,
  unit_price_cost  numeric(10,2) not null,
  line_total       numeric(10,2) not null
);

alter table order_items enable row level security;

-- ─── order_status_history ─────────────────────────────────────────────────────
create table order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  changed_at timestamptz not null default now(),
  changed_by text not null
);

alter table order_status_history enable row level security;

-- ─── settlements ──────────────────────────────────────────────────────────────
create table settlements (
  id                    uuid primary key default gen_random_uuid(),
  type                  settlement_type not null,
  status                settlement_status not null default 'proposed',
  driver_id             uuid references drivers(id) on delete set null,
  period_start          timestamptz not null,
  period_end            timestamptz not null,
  total_cash            numeric(10,2) not null default 0,
  payout_amount         numeric(10,2) not null default 0,
  proposed_by           text not null,
  proposed_at           timestamptz not null default now(),
  confirmed_at          timestamptz,
  payment_confirmed_at  timestamptz,
  notes                 text
);

alter table settlements enable row level security;

create index idx_settlements_driver_id on settlements(driver_id);
create index idx_settlements_status    on settlements(status);

-- ─── settlement_orders ────────────────────────────────────────────────────────
create table settlement_orders (
  settlement_id uuid not null references settlements(id) on delete cascade,
  order_id      uuid not null references orders(id) on delete cascade,
  primary key (settlement_id, order_id)
);

alter table settlement_orders enable row level security;

-- ─── settings ─────────────────────────────────────────────────────────────────
create table settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table settings enable row level security;
