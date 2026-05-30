export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export type SettlementType = 'driver' | 'partner'

export type SettlementStatus =
  | 'proposed'
  | 'driver_confirmed'
  | 'paid'
  | 'payment_received'
  | 'partner_confirmed'

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface Partner {
  id: string
  name: string
  address: string
  contact_name: string
  contact_phone: string
  is_active: boolean
  created_at: string
}

export interface QRCode {
  id: string
  partner_id: string
  slug: string
  label: string
  is_active: boolean
  created_at: string
}

export interface QRScan {
  id: string
  qr_code_id: string
  user_id: string | null
  telegram_user_id: string
  scanned_at: string
}

export interface User {
  id: string
  telegram_id: string
  first_name: string
  last_name: string | null
  phone: string | null
  default_address: string | null
  first_qr_source: string | null // FK → qr_codes.id
  created_at: string
}

export interface Category {
  id: string
  name: string
  image_url: string | null
  sort_order: number
  is_active: boolean
}

export interface Product {
  id: string
  category_id: string
  name: string
  description: string | null
  image_url: string | null
  brand: string | null
  subcategory: string | null
  size: string | null
  price_sell: number
  price_cost: number
  stock_qty: number
  low_stock_threshold: number
  barcode: string | null
  is_active: boolean
}

export interface ProductBatch {
  id: string
  product_id: string
  quantity_received: number
  quantity_remaining: number
  price_cost: number
  price_sell: number
  received_at: string
  supplier: string | null
  notes: string | null
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  qr_code_id: string
  driver_id: string | null
  status: OrderStatus
  delivery_address: string
  delivery_fee: number
  subtotal: number
  total: number
  notes: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  batch_id: string | null
  quantity: number
  unit_price_sell: number
  unit_price_cost: number
  line_total: number
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  changed_at: string
  changed_by: string
}

export interface Driver {
  id: string
  telegram_id: string
  first_name: string
  last_name: string | null
  is_owner: boolean
  is_active: boolean
  created_at: string
}

export interface Settlement {
  id: string
  type: SettlementType
  status: SettlementStatus
  driver_id: string | null
  period_start: string
  period_end: string
  total_cash: number
  payout_amount: number
  proposed_by: string
  proposed_at: string
  confirmed_at: string | null
  payment_confirmed_at: string | null
  notes: string | null
}

export interface SettlementOrder {
  settlement_id: string
  order_id: string
}

export interface Setting {
  key: string
  value: string
  updated_at: string
  updated_by: string
}

// ─── Database type map (for Supabase client) ─────────────────────────────────

// ─── Database type map (for Supabase client) ─────────────────────────────────
// Insert/Update use the Row type directly to avoid Supabase generic inference
// issues with Omit<>. Runtime validation happens at the API route level.

type TableDef<R> = {
  Row: R
  Insert: Partial<R>
  Update: Partial<R>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      partners:             TableDef<Partner>
      qr_codes:             TableDef<QRCode>
      qr_scans:             TableDef<QRScan>
      users:                TableDef<User>
      categories:           TableDef<Category>
      products:             TableDef<Product>
      product_batches:      TableDef<ProductBatch>
      orders:               TableDef<Order>
      order_items:          TableDef<OrderItem>
      order_status_history: TableDef<OrderStatusHistory>
      drivers:              TableDef<Driver>
      settlements:          TableDef<Settlement>
      settlement_orders:    TableDef<SettlementOrder>
      settings:             TableDef<Setting>
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>
    Functions: Record<string, never>
    Enums: {
      order_status: OrderStatus
      settlement_type: SettlementType
      settlement_status: SettlementStatus
    }
  }
}
