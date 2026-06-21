// ─── Status enums (must match Postgres ENUMs) ─────────────

export type OrderStatus = 'open' | 'awaiting_payment' | 'paid' | 'cancelled';

export type ItemStatus =
  | 'ordered'
  | 'on_process'
  | 'finished'
  | 'served'
  | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'ewallet'
  | 'bank_transfer'
  | 'qris';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ─── Database row types ───────────────────────────────────

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: string; // pg returns NUMERIC as string by default
  category: string | null;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RestaurantTable {
  id: number;
  table_number: string;
  capacity: number;
}

export interface Order {
  id: number;
  order_number: string;
  table_id: number | null;
  status: OrderStatus;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  created_at: Date;
  closed_at: Date | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  status: ItemStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemStatusHistory {
  id: number;
  order_item_id: number;
  from_status: ItemStatus | null;
  to_status: ItemStatus;
  changed_at: Date;
  notes: string | null;
}

export interface Payment {
  id: number;
  order_id: number;
  method: PaymentMethod;
  amount: string;
  status: PaymentStatus;
  reference_number: string | null;
  paid_at: Date | null;
  created_at: Date;
}

// ─── Composite / joined types ─────────────────────────────

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderItemWithOrder extends OrderItem {
  order_number: string;
}

export interface PaymentWithOrder extends Payment {
  order_number: string;
}

// ─── Input types for creating entities ────────────────────

export interface NewOrderItemInput {
  menuItemId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  tableId: number;
  items: NewOrderItemInput[];
  taxRate: number;
}

export interface CreatePaymentInput {
  orderId: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
}

// ─── Worker status ────────────────────────────────────────

export interface WorkerStatus {
  running: boolean;
  tickCount: number;
  lastRun: Date | null;
  lastError: string | null;
}
